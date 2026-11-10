import 'dotenv/config'
import pg from 'pg'
import bcrypt from 'bcryptjs'

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'admin', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT NOT NULL, phone TEXT NOT NULL UNIQUE,
  email TEXT, address TEXT, notes TEXT, is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT DEFAULT '', unit TEXT NOT NULL DEFAULT 'kg',
  price NUMERIC(12,2) NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'active', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY, order_number TEXT NOT NULL UNIQUE, customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  fulfillment_type TEXT NOT NULL DEFAULT 'Pickup', notes TEXT, laundry_status TEXT NOT NULL DEFAULT 'Pending',
  payment_status TEXT NOT NULL DEFAULT 'Unpaid', subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  additional_charges NUMERIC(12,2) NOT NULL DEFAULT 0, discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0, order_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  service_id INTEGER REFERENCES services(id) ON DELETE SET NULL, service_name TEXT NOT NULL,
  quantity NUMERIC(12,3) NOT NULL, unit TEXT NOT NULL, unit_price NUMERIC(12,2) NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL, notes TEXT
);
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL, payment_method TEXT NOT NULL DEFAULT 'Cash', reference_number TEXT,
  payment_date TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY, title TEXT NOT NULL, message TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'Other Supplies',
  quantity NUMERIC(12,3) NOT NULL DEFAULT 0, unit TEXT NOT NULL DEFAULT 'pieces', minimum_stock NUMERIC(12,3) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS inventory_movements (
  id SERIAL PRIMARY KEY, inventory_id INTEGER NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  type TEXT NOT NULL, quantity NUMERIC(12,3) NOT NULL, reason TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id=1), business_name TEXT NOT NULL DEFAULT 'FreshSpin Laundry',
  business_address TEXT NOT NULL DEFAULT 'Poblacion 1, Victoria, Laguna, Philippines', contact_number TEXT NOT NULL DEFAULT '+63 917 890 1234',
  humidity_threshold NUMERIC(5,2) NOT NULL DEFAULT 70, drying_time_default INTEGER NOT NULL DEFAULT 60,
  system_status TEXT NOT NULL DEFAULT 'Online', terms_conditions TEXT NOT NULL DEFAULT '', privacy_policy TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS drying_stacks (
  id SERIAL PRIMARY KEY, name TEXT NOT NULL, location TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0,
  capacity INTEGER NOT NULL DEFAULT 50, notes TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS humidity_logs (
  id SERIAL PRIMARY KEY, humidity NUMERIC(5,2), temperature NUMERIC(5,2), status TEXT NOT NULL DEFAULT 'UNAVAILABLE',
  device_id TEXT NOT NULL DEFAULT 'FRESHSPIN-ESP32-01', location TEXT NOT NULL DEFAULT 'Drying Area #1 (Victoria, Laguna)',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_order_date_idx ON orders(order_date);
CREATE INDEX IF NOT EXISTS payments_order_id_idx ON payments(order_id);
`

try {
  await pool.query(schema)
  const email = process.env.SEED_ADMIN_EMAIL || (process.env.NODE_ENV === 'production' ? '' : 'admin@freshspin.local')
  const password = process.env.SEED_ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'FreshSpin123!')
  if (!email || !password) throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD before running in production.')
  const hash = await bcrypt.hash(password, 12)
  await pool.query(`INSERT INTO users(name,email,password_hash,role) VALUES('FreshSpin Admin',$1,$2,'admin') ON CONFLICT(email) DO NOTHING`, [email, hash])
  const serviceSeeds = [
    ['Wash, Dry & Fold', 'Complete wash, dry and fold service', 'kg', 55],
    ['Wash & Dry', 'Wash and dry service', 'kg', 45],
    ['Dry Only', 'Drying service', 'kg', 25],
    ['Comforter', 'Comforter cleaning', 'piece', 180],
    ['Blanket', 'Blanket cleaning', 'piece', 120],
  ]
  for (const row of serviceSeeds) await pool.query('INSERT INTO services(name,description,unit,price) VALUES($1,$2,$3,$4) ON CONFLICT(name) DO NOTHING', row)
  const inventorySeeds = [
    ['Laundry Detergent', 'Detergent', 25, 'liters', 5],
    ['Fabric Softener', 'Fabric Softener', 18, 'liters', 5],
    ['Laundry Bags', 'Plastic Bags', 100, 'pieces', 20],
  ]
  for (const row of inventorySeeds) await pool.query('INSERT INTO inventory(name,category,quantity,unit,minimum_stock) SELECT $1,$2,$3,$4,$5 WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE name=$1)', row)
  await pool.query("INSERT INTO settings(id) VALUES(1) ON CONFLICT(id) DO NOTHING")
  await pool.query("INSERT INTO drying_stacks(name,location,count,capacity,notes) SELECT 'Main Stack','Drying Area 1',0,50,'' WHERE NOT EXISTS (SELECT 1 FROM drying_stacks)")
  console.log(`Database ready. Seed admin: ${email} (password set by SEED_ADMIN_PASSWORD or development default).`)
} catch (error) {
  console.error('Database setup failed:', error.message)
  process.exitCode = 1
} finally {
  await pool.end()
}
