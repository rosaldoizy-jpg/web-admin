import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { timingSafeEqual } from 'node:crypto'
import pg from 'pg'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const app = express()
const PORT = Number(process.env.PORT || process.env.API_PORT || 8000)
const SECRET = process.env.JWT_SECRET || 'local-development-secret-change-before-deploy'
const ok = (res, data, message) => res.json({ success: true, ...(message ? { message } : {}), data })
const fail = (res, status, message) => res.status(status).json({ success: false, message })
const money = (n) => Number(Number(n || 0).toFixed(2))
const tokenFor = (u) => jwt.sign({ id: u.id, role: u.role }, SECRET, { expiresIn: '12h' })

// Create the schema and seed a development admin/services on first startup.
try {
  const setup = fileURLToPath(new URL('./setup-db.js', import.meta.url))
  execFileSync(process.execPath, [setup], { stdio: 'inherit', env: process.env })
} catch (error) {
  console.error('Unable to prepare database. Check DATABASE_URL and PostgreSQL availability.')
  process.exit(1)
}

app.use(cors())
app.use(express.json({ limit: '1mb' }))
app.use((req, res, next) => {
  if (!req.path.startsWith('/api') || req.path === '/api/health' || req.path === '/api/login' || req.path === '/api/telemetry') return next()
  const value = req.headers.authorization || ''
  try {
    const claims = jwt.verify(value.replace(/^Bearer\s+/i, ''), SECRET)
    req.user = claims
    next()
  } catch {
    fail(res, 401, 'Unauthenticated')
  }
})

const customerFields = 'id, first_name, last_name, phone, email, address, notes, is_archived, created_at, updated_at'
async function getCustomer(id) {
  const { rows } = await pool.query(`SELECT ${customerFields} FROM customers WHERE id=$1`, [id])
  return rows[0]
}
async function getOrder(id) {
  const { rows } = await pool.query(`
    SELECT o.*, c.id AS c_id,c.first_name,c.last_name,c.phone,c.email,c.address,
      COALESCE((SELECT SUM(amount) FROM payments WHERE order_id=o.id),0) AS paid_amount
    FROM orders o LEFT JOIN customers c ON c.id=o.customer_id WHERE o.id=$1`, [id])
  if (!rows[0]) return null
  const r = rows[0]
  const [items, payments] = await Promise.all([
    pool.query('SELECT oi.*, s.id AS s_id,s.name AS s_name FROM order_items oi LEFT JOIN services s ON s.id=oi.service_id WHERE oi.order_id=$1 ORDER BY oi.id', [id]),
    pool.query('SELECT * FROM payments WHERE order_id=$1 ORDER BY payment_date DESC', [id]),
  ])
  const total = Number(r.total_amount), paid = Number(r.paid_amount)
  return {
    id:r.id, order_number:r.order_number, customer_id:r.customer_id,
    customer:r.c_id ? { id:r.c_id, first_name:r.first_name,last_name:r.last_name,phone:r.phone,email:r.email,address:r.address } : null,
    fulfillment_type:r.fulfillment_type, notes:r.notes, laundry_status:r.laundry_status,
    payment_status:r.payment_status, subtotal:Number(r.subtotal), additional_charges:Number(r.additional_charges),
    discount:Number(r.discount), total_amount:total, paid_amount:paid,
    remaining_balance:money(Math.max(total-paid,0)), order_date:r.order_date, created_at:r.created_at, updated_at:r.updated_at,
    order_items:items.rows.map(i=>({ id:i.id,order_id:i.order_id,service_id:i.service_id,quantity:Number(i.quantity),unit:i.unit,unit_price:Number(i.unit_price),subtotal:Number(i.subtotal),notes:i.notes,service:i.s_id?{id:i.s_id,name:i.s_name}: {name:i.service_name} })),
    payments:payments.rows.map(p=>({...p,amount:Number(p.amount),payment_reference:p.reference_number})),
  }
}
async function getOrders() {
  const { rows } = await pool.query('SELECT id FROM orders ORDER BY order_date DESC,id DESC')
  return Promise.all(rows.map(r=>getOrder(r.id)))
}
const stockStatus = (i) => Number(i.quantity) <= 0 ? 'OUT OF STOCK' : Number(i.quantity) <= Number(i.minimum_stock) ? 'LOW STOCK' : 'IN STOCK'

app.get('/api/health', async (_req,res) => {
  try { await pool.query('SELECT 1'); res.json({status:'ok'}) }
  catch { fail(res,503,'Database unavailable') }
})
app.post('/api/login', async (req,res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return fail(res,422,'Email and password are required')
  const { rows } = await pool.query('SELECT id,name,email,password_hash,role FROM users WHERE lower(email)=lower($1)',[email])
  const u=rows[0]
  if (!u || !(await bcrypt.compare(password,u.password_hash))) return fail(res,401,'Invalid email or password')
  const user={id:u.id,name:u.name,email:u.email,role:u.role}
  res.json({success:true,data:{user,token:tokenFor(u)}})
})
app.post('/api/telemetry', async (req,res) => {
  const configuredKey = process.env.DEVICE_API_KEY || ''
  const suppliedKey = req.get('x-device-key') || ''
  const expected = Buffer.from(configuredKey)
  const received = Buffer.from(suppliedKey)
  if (!expected.length || expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return fail(res, 401, 'Invalid device key')
  }
  const humidity = Number(req.body?.humidity)
  const temperature = Number(req.body?.temperature)
  if (!Number.isFinite(humidity) || humidity < 0 || humidity > 100 || !Number.isFinite(temperature) || temperature < -40 || temperature > 85) {
    return fail(res, 422, 'Provide humidity (0–100% RH) and temperature (-40–85°C)')
  }
  const deviceId = String(req.body?.device_id || 'FRESHSPIN-ESP32-01').slice(0, 100)
  const location = String(req.body?.location || 'Drying Area #1 (Victoria, Laguna)').slice(0, 200)
  const { rows: settingRows } = await pool.query('SELECT humidity_threshold FROM settings WHERE id=1')
  const threshold = Number(settingRows[0]?.humidity_threshold || 70)
  const status = humidity >= threshold ? 'WARNING' : 'NORMAL'
  const { rows } = await pool.query(
    'INSERT INTO humidity_logs(humidity,temperature,status,device_id,location) VALUES($1,$2,$3,$4,$5) RETURNING *',
    [humidity,temperature,status,deviceId,location],
  )
  res.status(201)
  ok(res, rows[0], 'Telemetry received')
})
app.get('/api/me', async(req,res)=>{
  const {rows}=await pool.query('SELECT id,name,email,role FROM users WHERE id=$1',[req.user.id])
  if(!rows[0]) return fail(res,401,'User not found')
  ok(res,{user:rows[0]})
})
app.post('/api/logout',(_req,res)=>ok(res,{},'Logged out'))

app.get('/api/services',async(_req,res)=>{const {rows}=await pool.query('SELECT * FROM services ORDER BY id');ok(res,rows.map(s=>({...s,price:Number(s.price)})))})
app.put('/api/services/:id',async(req,res)=>{
  const {price,status}=req.body
  if(price===undefined&&status===undefined)return fail(res,422,'Price or status is required')
  if(status!==undefined&&!['active','inactive'].includes(status))return fail(res,422,'Invalid service status')
  const {rows}=await pool.query('UPDATE services SET price=COALESCE($1,price),status=COALESCE($2,status) WHERE id=$3 RETURNING *',[price===undefined?null:price,status||null,req.params.id])
  if(!rows[0])return fail(res,404,'Service not found')
  ok(res,{...rows[0],price:Number(rows[0].price)},'Service updated')
})

app.get('/api/customers',async(req,res)=>{
  const archived=req.query.status==='archived'
  const {rows}=await pool.query(`SELECT ${customerFields} FROM customers WHERE is_archived=$1 ORDER BY first_name,last_name`,[archived])
  ok(res,rows)
})
app.post('/api/customers',async(req,res)=>{
  const {first_name,last_name,phone,email=null,address=null,notes=null}=req.body||{}
  if(!first_name||!last_name||!phone)return fail(res,422,'First name, last name, and phone are required')
  try{const {rows}=await pool.query(`INSERT INTO customers(first_name,last_name,phone,email,address,notes) VALUES($1,$2,$3,$4,$5,$6) RETURNING ${customerFields}`,[first_name,last_name,phone,email,address,notes]);res.status(201);ok(res,rows[0],'Customer created')}
  catch(e){if(e.code==='23505')return fail(res,409,'A customer with this phone number already exists');throw e}
})
app.put('/api/customers/:id',async(req,res)=>{
  const {first_name,last_name,phone,email=null,address=null,notes=null}=req.body||{}
  if(!first_name||!last_name||!phone)return fail(res,422,'First name, last name, and phone are required')
  const {rows}=await pool.query(`UPDATE customers SET first_name=$1,last_name=$2,phone=$3,email=$4,address=$5,notes=$6,updated_at=now() WHERE id=$7 RETURNING ${customerFields}`,[first_name,last_name,phone,email,address,notes,req.params.id])
  if(!rows[0])return fail(res,404,'Customer not found');ok(res,rows[0])
})
app.post('/api/customers/:id/archive',async(req,res)=>{const r=await pool.query('UPDATE customers SET is_archived=true,updated_at=now() WHERE id=$1',[req.params.id]);if(!r.rowCount)return fail(res,404,'Customer not found');ok(res,{},'Customer archived')})
app.post('/api/customers/:id/restore',async(req,res)=>{const r=await pool.query('UPDATE customers SET is_archived=false,updated_at=now() WHERE id=$1',[req.params.id]);if(!r.rowCount)return fail(res,404,'Customer not found');ok(res,{},'Customer restored')})

app.get('/api/orders',async(_req,res)=>ok(res,await getOrders()))
app.post('/api/orders',async(req,res)=>{
  const {customer_id,fulfillment_type='Pickup',notes=null,additional_charges=0,discount=0,items=[]}=req.body||{}
  if(!customer_id||!Array.isArray(items)||items.length===0)return fail(res,422,'Customer and at least one order item are required')
  const cx=await pool.connect()
  try{
    await cx.query('BEGIN')
    const c=await cx.query('SELECT id FROM customers WHERE id=$1 AND is_archived=false',[customer_id]);if(!c.rowCount){await cx.query('ROLLBACK');return fail(res,422,'Customer not found or archived')}
    let subtotal=0;const lines=[]
    for(const item of items){
      const qty=Number(item.quantity);if(!Number.isFinite(qty)||qty<=0)throw Object.assign(new Error('Item quantity must be greater than zero'),{status:422})
      const sr=await cx.query("SELECT * FROM services WHERE id=$1 AND status='active'",[item.service_id]);if(!sr.rowCount)throw Object.assign(new Error('An order service is unavailable'),{status:422})
      const s=sr.rows[0], line=money(qty*Number(s.price));subtotal+=line;lines.push({s,qty,line,notes:item.notes||null})
    }
    subtotal=money(subtotal);const charges=money(additional_charges),disc=money(discount),total=money(Math.max(subtotal+charges-disc,0))
    const number=`FS-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${String(Date.now()).slice(-6)}`
    const o=await cx.query("INSERT INTO orders(order_number,customer_id,fulfillment_type,notes,subtotal,additional_charges,discount,total_amount) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id",[number,customer_id,fulfillment_type,notes,subtotal,charges,disc,total])
    for(const l of lines)await cx.query('INSERT INTO order_items(order_id,service_id,service_name,quantity,unit,unit_price,subtotal,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[o.rows[0].id,l.s.id,l.s.name,l.qty,l.s.unit,l.s.price,l.line,l.notes])
    await cx.query('COMMIT');res.status(201);ok(res,await getOrder(o.rows[0].id),'Order created')
  }catch(e){await cx.query('ROLLBACK');if(e.status)return fail(res,e.status,e.message);throw e}finally{cx.release()}
})
app.put('/api/orders/:id/status',async(req,res)=>{
  const stages=['Pending','Received','Washing','Drying','Folding','Ready for Pickup','Out for Delivery','Completed','Cancelled']
  if(!stages.includes(req.body?.status))return fail(res,422,'Invalid laundry status')
  const {rows}=await pool.query('UPDATE orders SET laundry_status=$1,updated_at=now() WHERE id=$2 RETURNING id',[req.body.status,req.params.id]);if(!rows[0])return fail(res,404,'Order not found');ok(res,await getOrder(rows[0].id),'Order status updated')
})
app.post('/api/orders/:id/mark-paid',async(req,res)=>{
  const order=await getOrder(req.params.id);if(!order)return fail(res,404,'Order not found')
  const balance=money(order.total_amount-order.paid_amount);if(balance>0)await pool.query("INSERT INTO payments(order_id,amount,payment_method,reference_number) VALUES($1,$2,'Cash',NULL)",[order.id,balance])
  await pool.query("UPDATE orders SET payment_status='Paid',updated_at=now() WHERE id=$1",[order.id]);ok(res,{},`${order.order_number} marked as paid`)
})
app.post('/api/payments',async(req,res)=>{
  const {order_id,amount,payment_method='Cash',reference_number=null}=req.body||{};const value=Number(amount)
  if(!order_id||!Number.isFinite(value)||value<=0)return fail(res,422,'Order and a positive payment amount are required')
  const cx=await pool.connect()
  try{
    await cx.query('BEGIN');const {rows}=await cx.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE',[order_id]);if(!rows[0]){await cx.query('ROLLBACK');return fail(res,404,'Order not found')}
    const paid=await cx.query('SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE order_id=$1',[order_id]);const balance=Number(rows[0].total_amount)-Number(paid.rows[0].total)
    if(value>balance+0.005){await cx.query('ROLLBACK');return fail(res,422,'Payment exceeds remaining balance')}
    const p=await cx.query('INSERT INTO payments(order_id,amount,payment_method,reference_number) VALUES($1,$2,$3,$4) RETURNING *',[order_id,value,payment_method,reference_number])
    const newPaid=Number(paid.rows[0].total)+value;await cx.query('UPDATE orders SET payment_status=$1,updated_at=now() WHERE id=$2',[newPaid>=Number(rows[0].total_amount)?'Paid':'Partial',order_id]);await cx.query('COMMIT')
    ok(res,{payment:{...p.rows[0],amount:Number(p.rows[0].amount),payment_reference:p.rows[0].reference_number}},'Payment recorded')
  }catch(e){await cx.query('ROLLBACK');throw e}finally{cx.release()}
})

app.get('/api/alerts',async(_req,res)=>{const {rows}=await pool.query('SELECT * FROM alerts ORDER BY created_at DESC LIMIT 100');ok(res,rows)})
app.put('/api/alerts/:id/read',async(req,res)=>{await pool.query('UPDATE alerts SET is_read=true WHERE id=$1',[req.params.id]);ok(res,{})})
app.post('/api/alerts/read-all',async(_req,res)=>{await pool.query('UPDATE alerts SET is_read=true');ok(res,{})})
app.get('/api/inventory',async(_req,res)=>{const {rows}=await pool.query('SELECT * FROM inventory ORDER BY name');ok(res,rows.map(i=>({...i,quantity:Number(i.quantity),minimum_stock:Number(i.minimum_stock),status:stockStatus(i)})))})
app.post('/api/inventory',async(req,res)=>{const {name,category,quantity,unit,minimum_stock}=req.body||{};if(!name)return fail(res,422,'Item name is required');const {rows}=await pool.query('INSERT INTO inventory(name,category,quantity,unit,minimum_stock) VALUES($1,$2,$3,$4,$5) RETURNING *',[name,category||'Other Supplies',quantity||0,unit||'pieces',minimum_stock||0]);res.status(201);ok(res,{...rows[0],quantity:Number(rows[0].quantity),minimum_stock:Number(rows[0].minimum_stock),status:stockStatus(rows[0])},'Inventory item created')})
app.post('/api/inventory/:id/stock',async(req,res)=>{const {type,quantity,reason}=req.body||{};const q=Number(quantity);if(!['stock_in','stock_out'].includes(type)||!q||q<=0)return fail(res,422,'Valid stock type and positive quantity are required');const cx=await pool.connect();try{await cx.query('BEGIN');const {rows}=await cx.query('SELECT * FROM inventory WHERE id=$1 FOR UPDATE',[req.params.id]);if(!rows[0]){await cx.query('ROLLBACK');return fail(res,404,'Inventory item not found')}const next=Number(rows[0].quantity)+(type==='stock_in'?q:-q);if(next<0){await cx.query('ROLLBACK');return fail(res,422,'Stock cannot be negative')}const item=(await cx.query('UPDATE inventory SET quantity=$1 WHERE id=$2 RETURNING *',[next,req.params.id])).rows[0];await cx.query('INSERT INTO inventory_movements(inventory_id,type,quantity,reason) VALUES($1,$2,$3,$4)',[req.params.id,type,q,reason||null]);await cx.query('COMMIT');ok(res,{...item,quantity:Number(item.quantity),minimum_stock:Number(item.minimum_stock),status:stockStatus(item)})}catch(e){await cx.query('ROLLBACK');throw e}finally{cx.release()}})
app.delete('/api/inventory/:id',async(req,res)=>{const r=await pool.query('DELETE FROM inventory WHERE id=$1',[req.params.id]);if(!r.rowCount)return fail(res,404,'Inventory item not found');ok(res,{})})

app.get('/api/staff',async(_req,res)=>{const {rows}=await pool.query("SELECT id,name,email,role,created_at FROM users WHERE role<>'admin' ORDER BY name");ok(res,rows)})
app.post('/api/staff',async(req,res)=>{const {name,email,password,role='staff'}=req.body||{};if(!name||!email||!password)return fail(res,422,'Name, email, and password are required');try{const hash=await bcrypt.hash(password,12);const {rows}=await pool.query('INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id,name,email,role,created_at',[name,email,hash,role]);res.status(201);ok(res,rows[0],'Staff member created')}catch(e){if(e.code==='23505')return fail(res,409,'Email is already in use');throw e}})
app.put('/api/staff/:id',async(req,res)=>{const {name,email,role}=req.body||{};const {rows}=await pool.query("UPDATE users SET name=COALESCE($1,name),email=COALESCE($2,email),role=COALESCE($3,role) WHERE id=$4 AND role<>'admin' RETURNING id,name,email,role,created_at",[name,email,role,req.params.id]);if(!rows[0])return fail(res,404,'Staff member not found');ok(res,rows[0])})
app.delete('/api/staff/:id',async(req,res)=>{const r=await pool.query("DELETE FROM users WHERE id=$1 AND role<>'admin'",[req.params.id]);if(!r.rowCount)return fail(res,404,'Staff member not found');ok(res,{})})

app.get('/api/settings',async(_req,res)=>{const {rows}=await pool.query('SELECT * FROM settings WHERE id=1');ok(res,rows[0]||{})})
app.put('/api/settings',async(req,res)=>{const fields=['business_name','business_address','contact_number','humidity_threshold','drying_time_default','system_status','terms_conditions','privacy_policy'];const vals=fields.map(k=>req.body[k]??null);const sets=fields.map((k,i)=>`${k}=COALESCE($${i+1},${k})`).join(',');const {rows}=await pool.query(`UPDATE settings SET ${sets} WHERE id=1 RETURNING *`,vals);ok(res,rows[0],'Settings saved')})
app.get('/api/drying-stacks',async(_req,res)=>{const {rows}=await pool.query('SELECT * FROM drying_stacks ORDER BY id');ok(res,rows)})
app.put('/api/drying-stacks/:id',async(req,res)=>{const {name,location,count,capacity,notes}=req.body||{};const {rows}=await pool.query('UPDATE drying_stacks SET name=COALESCE($1,name),location=COALESCE($2,location),count=COALESCE($3,count),capacity=COALESCE($4,capacity),notes=COALESCE($5,notes) WHERE id=$6 RETURNING *',[name,location,count,capacity,notes,req.params.id]);if(!rows[0])return fail(res,404,'Drying stack not found');ok(res,rows[0])})

app.get('/api/humidity/latest',async(_req,res)=>{const {rows}=await pool.query('SELECT * FROM humidity_logs ORDER BY recorded_at DESC LIMIT 1');const {rows:settings}=await pool.query('SELECT humidity_threshold FROM settings WHERE id=1');const log=rows[0];const online=Boolean(log&&Date.now()-new Date(log.recorded_at).getTime()<180000);ok(res,log?{...log,humidity:log.humidity===null?null:Number(log.humidity),temperature:log.temperature===null?null:Number(log.temperature),temperature_unit:'°C',threshold:Number(settings[0]?.humidity_threshold||70),device_status:online?'Telemetry available':'Telemetry timed out',is_online:online,last_updated:log.recorded_at}:{humidity:null,temperature:null,temperature_unit:'°C',status:'UNAVAILABLE',threshold:Number(settings[0]?.humidity_threshold||70),device_id:'FRESHSPIN-ESP32-01',location:'Drying Area #1 (Victoria, Laguna)',device_status:'Humidity data temporarily unavailable',is_online:false,last_updated:null})})
app.get('/api/humidity/history',async(req,res)=>{const limit=Math.min(Math.max(Number(req.query.limit)||30,1),500);const {rows}=await pool.query('SELECT * FROM humidity_logs ORDER BY recorded_at DESC LIMIT $1',[limit]);ok(res,{logs:rows.map(r=>({...r,humidity:r.humidity===null?null:Number(r.humidity),temperature:r.temperature===null?null:Number(r.temperature)}))})})

app.get('/api/dashboard',async(_req,res)=>{const orders=await getOrders();const total=orders.reduce((a,o)=>a+o.total_amount,0);const paid=orders.reduce((a,o)=>a+o.paid_amount,0);ok(res,{total_orders:orders.length,total_sales:money(total),total_revenue:money(paid),remaining_balance:money(total-paid),active_orders:orders.filter(o=>!['Completed','Cancelled'].includes(o.laundry_status)).length,completed_orders:orders.filter(o=>o.laundry_status==='Completed').length,orders_by_status:Object.fromEntries(['Pending','Received','Washing','Drying','Folding','Ready for Pickup','Out for Delivery','Completed','Cancelled'].map(s=>[s,orders.filter(o=>o.laundry_status===s).length]))})})

function range(req){const {period='this_month',start_date,end_date}=req.query;const now=new Date();let from,to=new Date(now);to.setHours(23,59,59,999);if(period==='custom'&&start_date&&end_date){from=new Date(`${start_date}T00:00:00`);to=new Date(`${end_date}T23:59:59.999`)}else if(period==='today'){from=new Date(now);from.setHours(0,0,0,0)}else if(period==='this_week'){from=new Date(now);from.setDate(now.getDate()-now.getDay());from.setHours(0,0,0,0)}else if(period==='last_month'){from=new Date(now.getFullYear(),now.getMonth()-1,1);to=new Date(now.getFullYear(),now.getMonth(),0,23,59,59,999)}else{from=new Date(now.getFullYear(),now.getMonth(),1)}return [from,to]}
app.get('/api/reports/sales',async(req,res)=>{const [from,to]=range(req);const orders=await pool.query('SELECT id,total_amount FROM orders WHERE order_date BETWEEN $1 AND $2',[from,to]);const ids=orders.rows.map(o=>o.id);const total=orders.rows.reduce((a,o)=>a+Number(o.total_amount),0);let paid=0;let daily=[];if(ids.length){const p=await pool.query('SELECT COALESCE(SUM(amount),0) amount FROM payments WHERE order_id=ANY($1::int[])',[ids]);paid=Number(p.rows[0].amount);const d=await pool.query(`SELECT DATE(o.order_date) date,COUNT(*)::int number_of_orders,SUM(o.total_amount) total_sales,COALESCE(SUM(p.paid),0) amount_paid FROM orders o LEFT JOIN (SELECT order_id,SUM(amount) paid FROM payments GROUP BY order_id) p ON p.order_id=o.id WHERE o.order_date BETWEEN $1 AND $2 GROUP BY DATE(o.order_date) ORDER BY DATE(o.order_date)`,[from,to]);daily=d.rows.map(r=>({date:r.date,number_of_orders:r.number_of_orders,total_sales:Number(r.total_sales),amount_paid:Number(r.amount_paid),remaining_balance:money(Number(r.total_sales)-Number(r.amount_paid))}))}ok(res,{summary:{total_orders:orders.rowCount,total_sales:money(total),total_revenue:money(paid),remaining_balance:money(total-paid),average_order_value:orders.rowCount?money(total/orders.rowCount):0},daily_records:daily})})
app.get('/api/reports/orders',async(req,res)=>{const [from,to]=range(req);const all=await getOrders();ok(res,all.filter(o=>new Date(o.order_date)>=from&&new Date(o.order_date)<=to).map(o=>({id:o.id,order_number:o.order_number,customer:o.customer?`${o.customer.first_name} ${o.customer.last_name}`:'Guest',services:o.order_items.map(i=>i.service?.name).join(', '),laundry_status:o.laundry_status,payment_status:o.payment_status,total:o.total_amount,date:o.order_date})))})
app.get('/api/reports/services',async(req,res)=>{const [from,to]=range(req);const {rows}=await pool.query(`SELECT oi.service_name name,oi.unit, SUM(oi.quantity) total_quantity,COUNT(DISTINCT oi.order_id)::int total_orders,SUM(oi.subtotal) total_revenue FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.order_date BETWEEN $1 AND $2 GROUP BY oi.service_name,oi.unit ORDER BY total_revenue DESC`,[from,to]);ok(res,rows.map(r=>({...r,total_quantity:Number(r.total_quantity),total_revenue:Number(r.total_revenue)})))})

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
app.use(express.static(path.join(projectRoot, 'dist')))
app.use((req,res,next)=>{
  if (req.method === 'GET' && !req.path.startsWith('/api')) return res.sendFile(path.join(projectRoot, 'dist', 'index.html'))
  next()
})
app.use((req,res)=>req.path.startsWith('/api')?fail(res,404,'API route not found'):res.sendStatus(404))
app.use((err,_req,res,_next)=>{console.error(err);if(res.headersSent)return;fail(res,500,'Internal server error')})
app.listen(PORT,'0.0.0.0',()=>console.log(`FreshSpin API listening on http://localhost:${PORT}`))
