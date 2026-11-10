import { useState, useEffect, useMemo } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation, NavLink, useSearchParams } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'
import {
  Waves, Droplets, CheckCircle2, Clock, AlertTriangle, Package, PhilippinePeso,
  Users, RefreshCw, Plus, Search, Filter, ChevronRight, ArrowUpRight, Activity, Calendar,
  CreditCard, Smartphone, CheckCircle, XCircle, Settings, Send, Flame, Sparkles, FileText,
  Printer, Trash2, Edit3, ShieldAlert, Cpu, MapPin, Eye, Boxes, BarChart3, Bell, UserCheck, Wifi, Truck,
  Sun, CloudSun, CloudFog, CloudRain, CloudLightning, Cloud, Thermometer, WifiOff
} from 'lucide-react'
import InventoryView from './components/InventoryView'
import AnalyticsView from './components/AnalyticsView'
import ReportsView from './components/ReportsView'
import StaffManagementView from './components/StaffManagementView'
import AlertsView from './components/AlertsView'
import SettingsView from './components/SettingsView'
import LoginPage from './components/LoginPage'
import AppLayout from './components/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import { Toast, ConfirmDialog } from './components/shared'
import { useAuth } from './context/AuthContext'
import api from './api/client'
import { formatCurrency } from './utils/currency'
import {
  LAUNDRY_STATUS_FLOW as ORDER_STATUS_STEPS,
  laundryStatusLabel,
  isTerminalLaundryStatus,
} from './utils/orderStatus'

// Reset the content scroller on every route change so each page starts at
// the top instead of inheriting the previous page's scroll position.
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.querySelector('main')?.scrollTo({ top: 0 })
  }, [pathname])
  return null
}

// ─── Payment method display helpers ───────────────────────────────────────────
const PAYMENT_METHODS = [
  { value: 'Cash', icon: PhilippinePeso, chip: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  { value: 'GCash', icon: Smartphone, chip: 'bg-brand-tintstrong text-navy border-brand-light' },
  { value: 'Maya', icon: Smartphone, chip: 'bg-teal-500/10 text-teal-400 border-teal-500/30' },
  { value: 'Other', icon: FileText, chip: 'bg-brand-tint text-ink-secondary border-line' },
]
const paymentMethodChip = (method) =>
  (PAYMENT_METHODS.find((m) => m.value === method) || PAYMENT_METHODS[PAYMENT_METHODS.length - 1]).chip

// ─── Not Found Page ───────────────────────────────────────────────────────────
function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
      <div className="text-8xl font-black text-line">404</div>
      <div>
        <h2 className="text-2xl font-bold text-navy mb-2">Page Not Found</h2>
        <p className="text-ink-secondary">The page you&apos;re looking for doesn&apos;t exist.</p>
      </div>
      <button
        onClick={() => navigate('/')}
        className="px-6 py-2.5 rounded-xl bg-navy hover:bg-navy-hover text-white font-bold text-sm transition"
      >
        Back to Dashboard
      </button>
    </div>
  )
}

// ─── Main App with all shared state ──────────────────────────────────────────
function MainApp() {
  const navigate = useNavigate()

  // --- Data State ---
  const [apiOnline, setApiOnline] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [dashboardData, setDashboardData] = useState(null)
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [services, setServices] = useState([])
  const [unreadAlerts, setUnreadAlerts] = useState(0)
  const [latestHumidity, setLatestHumidity] = useState({
    humidity: null,
    temperature: null,
    temperature_unit: '°C',
    status: 'UNAVAILABLE',
    threshold: 70.0,
    device_id: 'FRESHSPIN-ESP32-01',
    location: 'Drying Area #1 (Victoria, Laguna)',
    device_status: 'Humidity data temporarily unavailable',
    is_online: false,
    last_updated: null
  })
  const [humidityHistory, setHumidityHistory] = useState([])

  // --- UI State ---
  const [orderSearch, setOrderSearch] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState('All')
  const [orderPaymentFilter, setOrderPaymentFilter] = useState('All')
  const [paymentSearch, setPaymentSearch] = useState('')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('All')
  const [customerSearch, setCustomerSearch] = useState('')
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false)
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false)
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false)
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null)
  const [orderForPayment, setOrderForPayment] = useState(null)
  const [notification, setNotification] = useState(null)

  // --- Form State ---
  const [newOrderCustomer, setNewOrderCustomer] = useState('')
  const [newOrderFulfillment, setNewOrderFulfillment] = useState('Pickup')
  const [newOrderNotes, setNewOrderNotes] = useState('')
  const [newOrderItems, setNewOrderItems] = useState([{ service_id: 1, quantity: 5, notes: '' }])
  const [paymentOrderId, setPaymentOrderId] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [paymentReference, setPaymentReference] = useState('')
  const [newCustFirstName, setNewCustFirstName] = useState('')
  const [newCustLastName, setNewCustLastName] = useState('')
  const [newCustPhone, setNewCustPhone] = useState('')
  const [newCustEmail, setNewCustEmail] = useState('')
  const [newCustAddress, setNewCustAddress] = useState('')
  const [orderServiceFilter, setOrderServiceFilter] = useState('All')
  const [customerStatusFilter, setCustomerStatusFilter] = useState('active')
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [editCustForm, setEditCustForm] = useState({ first_name: '', last_name: '', phone: '', email: '', address: '', notes: '' })
  const [archivingCustomer, setArchivingCustomer] = useState(null)
  const [newOrderCharges, setNewOrderCharges] = useState('')
  const [newOrderDiscount, setNewOrderDiscount] = useState('')

  const showToast = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }

  // --- API Fetch ---
  const fetchAllData = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const healthRes = await api.get('/api/health').catch(() => null)
      if (healthRes?.data?.status === 'ok') {
        setApiOnline(true)

        const dashRes = await api.get('/api/dashboard').catch(() => null)
        if (dashRes?.data?.data) setDashboardData(dashRes.data.data)

        const humRes = await api.get('/api/humidity/latest').catch(() => null)
        if (humRes?.data?.data) setLatestHumidity(humRes.data.data)

        const histRes = await api.get('/api/humidity/history?limit=30').catch(() => null)
        if (histRes?.data?.data?.logs) {
          const formatted = histRes.data.data.logs.map(log => ({
            id: log.id,
            time: new Date(log.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            recorded_at: log.recorded_at,
            humidity: log.humidity !== null && !isNaN(log.humidity) ? parseFloat(log.humidity) : null,
            temperature: log.temperature !== null && !isNaN(log.temperature) ? parseFloat(log.temperature) : null,
            status: log.status
          })).reverse()
          setHumidityHistory(formatted)
        }

        const ordersRes = await api.get('/api/orders').catch(() => null)
        if (ordersRes?.data?.data) setOrders(ordersRes.data.data)

        const custRes = await api.get('/api/customers').catch(() => null)
        if (custRes?.data?.data) setCustomers(custRes.data.data)

        const servRes = await api.get('/api/services').catch(() => null)
        if (servRes?.data?.data) setServices(servRes.data.data)

        const alertsRes = await api.get('/api/alerts').catch(() => null)
        if (alertsRes?.data?.data) {
          setUnreadAlerts(alertsRes.data.data.filter(a => !a.is_read).length)
        }
      } else {
        setApiOnline(false)
        setLoadError('Unable to connect to the FreshSpin server. Check your connection and retry.')
      }
    } catch {
      setApiOnline(false)
      setLoadError('Unable to connect to the FreshSpin server. Check your connection and retry.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()
    const interval = setInterval(fetchAllData, 30000)
    return () => clearInterval(interval)
  }, [])

  // Notification badge polling every 15s
  useEffect(() => {
    if (!apiOnline) return
    const poll = setInterval(async () => {
      try {
        const res = await api.get('/api/alerts')
        if (res?.data?.data) {
          setUnreadAlerts(res.data.data.filter(a => !a.is_read).length)
        }
      } catch {
        /* keep old count */
      }
    }, 15000)
    return () => clearInterval(poll)
  }, [apiOnline])

  // Telemetry polling every 10s (actual database readings)
  useEffect(() => {
    const poll = setInterval(async () => {
      const res = await api.get('/api/humidity/latest').catch(() => null)
      if (res?.data?.data) setLatestHumidity(res.data.data)

      const histRes = await api.get('/api/humidity/history?limit=30').catch(() => null)
      if (histRes?.data?.data?.logs) {
        const formatted = histRes.data.data.logs.map(log => ({
          id: log.id,
          time: new Date(log.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          recorded_at: log.recorded_at,
          humidity: log.humidity !== null && !isNaN(log.humidity) ? parseFloat(log.humidity) : null,
          temperature: log.temperature !== null && !isNaN(log.temperature) ? parseFloat(log.temperature) : null,
          status: log.status
        })).reverse()
        setHumidityHistory(formatted)
      }
    }, 10000)
    return () => clearInterval(poll)
  }, [])

  // --- Computed Metrics ---
  const metrics = useMemo(() => {
    const totalOrdersCount = orders.length
    const activeOrders = orders.filter(o => !isTerminalLaundryStatus(o.laundry_status))
    const pickedUpOrders = orders.filter(o => o.laundry_status === 'Completed')
    const totalRevenue = orders.reduce((sum, o) => {
      const paid = o.paid_amount || (o.payment_status === 'Paid' ? o.total_amount : 0)
      return sum + Number(paid || 0)
    }, 0)
    const pendingPaymentsCount = orders.filter(o => o.payment_status === 'Unpaid' || o.payment_status === 'Partial').length
    const unpaidAmount = orders.reduce((sum, o) => sum + Number(o.remaining_balance || (o.payment_status === 'Unpaid' ? o.total_amount : 0)), 0)
    return { totalOrdersCount, activeOrdersCount: activeOrders.length, pickedUpOrdersCount: pickedUpOrders.length, totalRevenue, pendingPaymentsCount, unpaidAmount }
  }, [orders])

  const pipelineCounts = useMemo(() => {
    const counts = Object.fromEntries(ORDER_STATUS_STEPS.map(s => [s, 0]))
    counts.Cancelled = 0
    if (orders?.length > 0) {
      [...ORDER_STATUS_STEPS, 'Cancelled'].forEach(s => { counts[s] = orders.filter(o => o.laundry_status === s).length })
    }
    return counts
  }, [orders])

  const navigateToOrdersWithStatus = (stage) => {
    setOrderStatusFilter(stage)
    setOrderSearch('')
    navigate('/orders')
  }

  const PIPELINE_STAGES = useMemo(() => [
    { id: 'Pending', label: 'Pending', step: '01', icon: Clock, count: pipelineCounts.Pending, color: 'amber', borderColor: 'border-amber-500/40 hover:border-amber-400', bgColor: 'bg-white hover:bg-brand-tint', textColor: 'text-amber-400', badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30', progressColor: 'bg-amber-400', glowColor: 'hover:shadow-amber-500/10', description: 'Booked, awaiting drop-off at the shop', activeText: 'Awaiting Intake' },
    { id: 'Received', label: 'Received', step: '02', icon: Package, count: pipelineCounts.Received, color: 'blue', borderColor: 'border-brand-light hover:border-navy', bgColor: 'bg-white hover:bg-brand-tint', textColor: 'text-navy', badgeBg: 'bg-brand-tint text-navy border-brand-light', progressColor: 'bg-brand-light', glowColor: 'hover:shadow-card', description: 'Logged & queued for processing', activeText: 'Awaiting Wash Cycle' },
    { id: 'Washing', label: 'Washing', step: '03', icon: Waves, count: pipelineCounts.Washing, color: 'cyan', borderColor: 'border-brand-light hover:border-navy', bgColor: 'bg-white hover:bg-brand-tint', textColor: 'text-navy', badgeBg: 'bg-brand-tintstrong text-navy border-brand-light', progressColor: 'bg-brand-light', glowColor: 'hover:shadow-card', description: 'Active drum agitation & cycles', activeText: 'In Drum Processing' },
    { id: 'Drying', label: 'Drying', step: '04', icon: Flame, count: pipelineCounts.Drying, color: 'amber', borderColor: 'border-amber-500/40 hover:border-amber-400', bgColor: 'bg-white hover:bg-brand-tint', textColor: 'text-amber-400', badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30', progressColor: 'bg-amber-400', glowColor: 'hover:shadow-amber-500/10', description: 'ESP32 sensor-monitored drying', activeText: 'Moisture Tracking' },
    { id: 'Folding', label: 'Folding / Ironing', step: '05', icon: Boxes, count: pipelineCounts.Folding, color: 'violet', borderColor: 'border-brand-light hover:border-navy', bgColor: 'bg-white hover:bg-brand-tint', textColor: 'text-navy', badgeBg: 'bg-brand-tintstrong text-navy border-brand-light', progressColor: 'bg-brand-light', glowColor: 'hover:shadow-card', description: 'Laundry being folded, ironed and packed', activeText: 'Folding & Ironing' },
    { id: 'Ready for Pickup', label: 'Ready for Pickup', step: '06', icon: CheckCircle2, count: pipelineCounts['Ready for Pickup'], color: 'emerald', borderColor: 'border-emerald-500/40 hover:border-emerald-400', bgColor: 'bg-white hover:bg-brand-tint', textColor: 'text-emerald-400', badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', progressColor: 'bg-emerald-400', glowColor: 'hover:shadow-emerald-500/10', description: 'Ready for customer pickup', activeText: 'Awaiting Pickup' },
    { id: 'Out for Delivery', label: 'Out for Delivery', step: '07', icon: Truck, count: pipelineCounts['Out for Delivery'], color: 'cyan', borderColor: 'border-brand-light hover:border-navy', bgColor: 'bg-white hover:bg-brand-tint', textColor: 'text-navy', badgeBg: 'bg-brand-tintstrong text-navy border-brand-light', progressColor: 'bg-brand-light', glowColor: 'hover:shadow-card', description: 'Order out for delivery', activeText: 'On the Way' },
    { id: 'Completed', label: 'Completed / Delivered', step: '08', icon: CheckCircle2, count: pipelineCounts.Completed, color: 'green', borderColor: 'border-green-500/40 hover:border-green-400', bgColor: 'bg-white hover:bg-brand-tint', textColor: 'text-green-400', badgeBg: 'bg-green-500/20 text-green-300 border-green-500/30', progressColor: 'bg-green-400', glowColor: 'hover:shadow-green-500/10', description: 'Order completed / delivered', activeText: 'Completed' }
  ], [pipelineCounts])

  const allPayments = useMemo(() => {
    let pList = []
    orders.forEach(o => {
      if (o.payments?.length > 0) {
        o.payments.forEach(p => pList.push({ ...p, order_number: o.order_number, customer_name: o.customer ? `${o.customer.first_name} ${o.customer.last_name}` : 'Guest' }))
      }
    })
    return pList.sort((a, b) => new Date(b.payment_date || b.created_at) - new Date(a.payment_date || a.created_at))
  }, [orders])

  // Active services are the only ones selectable when creating a new order.
  const activeServices = useMemo(() => services.filter(s => s.status === 'active'), [services])

  // Standard kilogram rate: the canonical full-service package when active,
  // otherwise the first active per-kilogram service. Drives the simplified
  // order form and is badged on the Pricing page.
  const standardKgService = useMemo(() => {
    const kg = activeServices.filter(s => s.unit === 'kg')
    return kg.find(s => String(s.name).toLowerCase() === 'wash, dry & fold') || kg[0] || null
  }, [activeServices])

  // Per-piece extras (e.g. Comforter) offered as optional add-ons in the order form.
  const specialServices = useMemo(
    () => activeServices.filter(s => s.unit !== 'kg'),
    [activeServices]
  )

  // Laravel serialises relations snake_cased (order_items) - accept both shapes.
  const orderItemsOf = (order) => order?.order_items || order?.orderItems || []
  const orderServiceNames = (order) => orderItemsOf(order).map(i => i?.service?.name).filter(Boolean)

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchSearch =
        order.order_number.toLowerCase().includes(orderSearch.toLowerCase()) ||
        (order.customer && `${order.customer.first_name} ${order.customer.last_name}`.toLowerCase().includes(orderSearch.toLowerCase())) ||
        (order.customer?.phone && order.customer.phone.includes(orderSearch))
      const matchStatus = orderStatusFilter === 'All' || order.laundry_status === orderStatusFilter
      const matchPayment = orderPaymentFilter === 'All' || order.payment_status === orderPaymentFilter
      const matchService = orderServiceFilter === 'All' || orderServiceNames(order).includes(orderServiceFilter)
      return matchSearch && matchStatus && matchPayment && matchService
    })
  }, [orders, orderSearch, orderStatusFilter, orderPaymentFilter, orderServiceFilter])

  // Live order total preview: items + additional charges - discount.
  const newOrderTotals = useMemo(() => {
    const lines = newOrderItems.map(item => {
      const srv = services.find(s => s.id === Number(item.service_id))
      const qty = Number(item.quantity) || 0
      const price = srv ? Number(srv.price) : 0
      return { service: srv, qty, price, subtotal: Math.round(qty * price * 100) / 100 }
    })
    const subtotal = Math.round(lines.reduce((sum, l) => sum + l.subtotal, 0) * 100) / 100
    const charges = Number(newOrderCharges) || 0
    const discount = Number(newOrderDiscount) || 0
    const total = Math.max(0, Math.round((subtotal + charges - discount) * 100) / 100)
    return { lines, subtotal, charges, discount, total }
  }, [newOrderItems, newOrderCharges, newOrderDiscount, services])

  const filteredPayments = useMemo(() => {
    return allPayments.filter(p => {
      const matchSearch =
        (p.payment_reference && p.payment_reference.toLowerCase().includes(paymentSearch.toLowerCase())) ||
        (p.order_number && p.order_number.toLowerCase().includes(paymentSearch.toLowerCase())) ||
        (p.customer_name && p.customer_name.toLowerCase().includes(paymentSearch.toLowerCase()))
      const matchMethod = paymentMethodFilter === 'All' || p.payment_method === paymentMethodFilter
      return matchSearch && matchMethod
    })
  }, [allPayments, paymentSearch, paymentMethodFilter])

  // --- Actions ---
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await api.put(`/api/orders/${orderId}/status`, { status: newStatus })
      if (res?.data?.data) {
        const updated = res.data.data
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updated } : o))
      } else {
        await fetchAllData()
      }
      showToast(`Order status updated to "${newStatus}"!`)
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update status on server.', 'error')
    }
  }

  const handleCreateOrder = async (e) => {
    e.preventDefault()
    if (!newOrderCustomer) { showToast('Please select a customer', 'error'); return }
    if (activeServices.length === 0) { showToast('No active services available. Check Pricing.', 'error'); return }
    if (!standardKgService) { showToast('The standard per-kilogram service is inactive. Activate it in Pricing.', 'error'); return }
    const items = []
    const [kgLine, ...extras] = newOrderItems
    const weight = Number(kgLine?.quantity) || 0
    for (const item of extras) {
      const srv = activeServices.find(s => s.id === Number(item.service_id))
      if (!srv) { showToast('Please choose an active service for every special item', 'error'); return }
      if (srv.unit === 'kg') { showToast('Special items must be per-piece services — the laundry weight covers per-kilogram services', 'error'); return }
      const qty = Number(item.quantity) || 0
      if (qty <= 0) { showToast('Special-item quantity must be greater than zero', 'error'); return }
      items.push({ service_id: srv.id, quantity: qty, notes: item.notes || null })
    }
    if (weight > 0) {
      items.unshift({ service_id: standardKgService.id, quantity: weight, notes: kgLine?.notes || null })
    }
    if (items.length === 0) { showToast('Enter the laundry weight in kilograms or add a special item', 'error'); return }
    try {
      const res = await api.post('/api/orders', {
        customer_id: Number(newOrderCustomer),
        fulfillment_type: 'Pickup',
        notes: newOrderNotes || null,
        additional_charges: Number(newOrderCharges) || 0,
        discount: Number(newOrderDiscount) || 0,
        items,
      })
      const created = res.data?.data
      showToast(`Order ${created?.order_number || ''} created successfully! (${formatCurrency(Number(created?.total_amount) || 0)})`.trim())
      setIsNewOrderModalOpen(false)
      resetNewOrderForm()
      await fetchAllData()
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create order on server.', 'error')
    }
  }

  // The standard kilogram service starts every new order.
  const defaultServiceId = () => standardKgService?.id || ''

  const resetNewOrderForm = () => {
    setNewOrderCustomer('')
    setNewOrderNotes('')
    setNewOrderCharges('')
    setNewOrderDiscount('')
    setNewOrderItems([{ service_id: defaultServiceId(), quantity: 5, notes: '' }])
  }

  // Always start a new order from an active per-kilogram service.
  const handleOpenNewOrder = () => {
    setNewOrderItems([{ service_id: defaultServiceId(), quantity: 5, notes: '' }])
    setNewOrderCharges('')
    setNewOrderDiscount('')
    setIsNewOrderModalOpen(true)
  }

  // One-click payment: settles the full remaining balance of an order.
  const handleMarkAsPaid = async (order) => {
    try {
      const res = await api.post(`/api/orders/${order.id}/mark-paid`)
      showToast(res.data?.message || `${order.order_number} marked as paid!`)
      await fetchAllData()
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to mark order as paid.', 'error')
    }
  }

  const handleUpdateCustomer = async (e) => {
    e.preventDefault()
    if (!editingCustomer) return
    if (!editCustForm.first_name || !editCustForm.last_name || !editCustForm.phone) {
      showToast('Please fill in required customer fields', 'error')
      return
    }
    try {
      const res = await api.put(`/api/customers/${editingCustomer.id}`, {
        first_name: editCustForm.first_name,
        last_name: editCustForm.last_name,
        phone: editCustForm.phone,
        email: editCustForm.email || null,
        address: editCustForm.address || null,
        notes: editCustForm.notes || null,
      })
      const updated = res.data?.data
      showToast(`${updated?.first_name || ''} ${updated?.last_name || ''} profile updated.`.trim())
      setEditingCustomer(null)
      await fetchAllData()
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save customer changes.', 'error')
    }
  }

  const handleArchiveCustomer = async () => {
    if (!archivingCustomer) return
    try {
      const res = await api.post(`/api/customers/${archivingCustomer.id}/archive`)
      showToast(res.data?.message || 'Customer archived.')
      setArchivingCustomer(null)
      await fetchAllData()
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to archive customer.', 'error')
    }
  }

  const handleRestoreCustomer = async (customer) => {
    try {
      const res = await api.post(`/api/customers/${customer.id}/restore`)
      showToast(res.data?.message || 'Customer restored.')
      await fetchAllData()
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to restore customer.', 'error')
    }
  }

  // Pricing: active services are selectable for new orders.
  const handleToggleService = async (service) => {
    const nextStatus = service.status === 'active' ? 'inactive' : 'active'
    try {
      const res = await api.put(`/api/services/${service.id}`, { status: nextStatus })
      setServices(prev => prev.map(s => (s.id === service.id ? { ...s, status: nextStatus } : s)))
      showToast(
        res.data?.message || `${service.name} is now ${nextStatus === 'active' ? 'Active — available for new orders' : 'Inactive — hidden from new orders'}.`
      )
      await fetchAllData()
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update service status.', 'error')
    }
  }

  // Pricing: update a service's price. Applies to new orders immediately;
  // existing orders keep the unit prices recorded on them.
  const handleUpdateServicePrice = async (service, price) => {
    const value = Number(price)
    if (!Number.isFinite(value) || value < 0) { showToast('Enter a valid price of ₱0 or more', 'error'); return false }
    try {
      const res = await api.put(`/api/services/${service.id}`, { price: value })
      const updated = res.data?.data
      if (updated) setServices(prev => prev.map(s => (s.id === service.id ? { ...s, ...updated } : s)))
      else await fetchAllData()
      showToast(`${service.name} price updated to ${formatCurrency(value)}`)
      return true
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update price on server.', 'error')
      return false
    }
  }

  const handleRecordPayment = async (e) => {
    e.preventDefault()
    if (!paymentOrderId) { showToast('Please select an order', 'error'); return }
    const amt = Number(paymentAmount)
    if (!amt || amt <= 0) { showToast('Enter a valid payment amount', 'error'); return }
    try {
      const res = await api.post('/api/payments', {
        order_id: Number(paymentOrderId),
        amount: amt,
        payment_method: paymentMethod,
        reference_number: paymentReference || null,
      })
      const ref = res.data?.data?.payment?.payment_reference || res.data?.data?.payment?.reference_number
      showToast(`Payment of ₱${amt.toFixed(2)} recorded${ref ? ` (${ref})` : ''}`)
      setIsRecordPaymentModalOpen(false)
      setPaymentOrderId('')
      setPaymentAmount('')
      setPaymentReference('')
      await fetchAllData()
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to record payment on server.', 'error')
    }
  }

  const handleAddCustomer = async (e) => {
    e.preventDefault()
    if (!newCustFirstName || !newCustLastName || !newCustPhone) { showToast('Please fill in required customer fields', 'error'); return }
    try {
      const res = await api.post('/api/customers', {
        first_name: newCustFirstName,
        last_name: newCustLastName,
        phone: newCustPhone,
        email: newCustEmail || null,
        address: newCustAddress || null,
      })
      const created = res.data?.data
      showToast(`Customer ${created?.first_name || newCustFirstName} ${created?.last_name || newCustLastName} added!`.trim())
      setIsAddCustomerModalOpen(false)
      setNewCustFirstName(''); setNewCustLastName(''); setNewCustPhone(''); setNewCustEmail(''); setNewCustAddress('')
      await fetchAllData()
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add customer on server.', 'error')
    }
  }

  const handleRefreshTelemetry = async () => {
    try {
      const humRes = await api.get('/api/humidity/latest').catch(() => null)
      if (humRes?.data?.data) setLatestHumidity(humRes.data.data)
      const histRes = await api.get('/api/humidity/history?limit=30').catch(() => null)
      if (histRes?.data?.data?.logs) {
        const formatted = histRes.data.data.logs.map(log => ({
          id: log.id,
          time: new Date(log.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          recorded_at: log.recorded_at,
          humidity: log.humidity !== null && !isNaN(log.humidity) ? parseFloat(log.humidity) : null,
          temperature: log.temperature !== null && !isNaN(log.temperature) ? parseFloat(log.temperature) : null,
          status: log.status
        })).reverse()
        setHumidityHistory(formatted)
      }
      showToast('Live telemetry refreshed from database.')
    } catch {
      showToast('Failed to refresh telemetry from server.', 'error')
    }
  }
  const handleSimulateESP32Payload = handleRefreshTelemetry

  // --- Badge Helpers ---
  const renderStatusBadge = (status) => {
    const config = {
      Pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      Received: 'bg-brand-tint text-navy border-brand-light',
      Washing: 'bg-brand-tintstrong text-navy border-brand-light animate-pulse',
      Drying: 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse',
      Folding: 'bg-brand-tintstrong text-navy border-brand-light',
      'Ready for Pickup': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      'Out for Delivery': 'bg-brand-tintstrong text-navy border-brand-light animate-pulse',
      Completed: 'bg-green-500/10 text-green-400 border-green-500/30',
      Cancelled: 'bg-rose-500/10 text-rose-400 border-rose-500/30'
    }
    return <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${config[status] || 'bg-brand-tint text-navy border-line'}`}>{laundryStatusLabel(status)}</span>
  }

  const renderPaymentBadge = (status) => {
    const config = { Paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', Partial: 'bg-amber-500/10 text-amber-400 border-amber-500/30', Unpaid: 'bg-rose-500/10 text-rose-400 border-rose-500/30' }
    return <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${config[status] || 'bg-brand-tint text-navy border-line'}`}>{status}</span>
  }

  // Shared props for sub-pages
  const sharedProps = { orders, customers, services, activeServices, standardKgService, specialServices, allPayments, filteredOrders, filteredPayments, metrics, pipelineCounts, latestHumidity, humidityHistory, loading, apiOnline, dashboardData, PIPELINE_STAGES, ORDER_STATUS_STEPS, orderSearch, setOrderSearch, orderStatusFilter, setOrderStatusFilter, orderPaymentFilter, setOrderPaymentFilter, orderServiceFilter, setOrderServiceFilter, paymentSearch, setPaymentSearch, paymentMethodFilter, setPaymentMethodFilter, customerSearch, setCustomerSearch, customerStatusFilter, setCustomerStatusFilter, editingCustomer, setEditingCustomer, editCustForm, setEditCustForm, archivingCustomer, setArchivingCustomer, isNewOrderModalOpen, setIsNewOrderModalOpen, isRecordPaymentModalOpen, setIsRecordPaymentModalOpen, isAddCustomerModalOpen, setIsAddCustomerModalOpen, selectedOrderDetails, setSelectedOrderDetails, newOrderCustomer, setNewOrderCustomer, newOrderFulfillment, setNewOrderFulfillment, newOrderNotes, setNewOrderNotes, newOrderItems, setNewOrderItems, newOrderCharges, setNewOrderCharges, newOrderDiscount, setNewOrderDiscount, newOrderTotals, paymentOrderId, setPaymentOrderId, paymentAmount, setPaymentAmount, paymentMethod, setPaymentMethod, paymentReference, setPaymentReference, newCustFirstName, setNewCustFirstName, newCustLastName, setNewCustLastName, newCustPhone, setNewCustPhone, newCustEmail, setNewCustEmail, newCustAddress, setNewCustAddress, handleUpdateOrderStatus, handleCreateOrder, handleRecordPayment, handleAddCustomer, handleRefreshTelemetry, handleSimulateESP32Payload, handleMarkAsPaid, handleUpdateCustomer, handleArchiveCustomer, handleRestoreCustomer, handleToggleService, handleUpdateServicePrice, resetNewOrderForm, handleOpenNewOrder, fetchAllData, navigateToOrdersWithStatus, showToast, renderStatusBadge, renderPaymentBadge, orderItemsOf, orderServiceNames, formatCurrency }

  return (
    <>
      <ScrollToTop />
      <Toast notification={notification} />
      {!loading && !apiOnline && (
        <div className="fixed inset-x-0 top-0 z-[60] bg-danger-tint border-b border-danger px-4 py-2.5 flex flex-col sm:flex-row items-center justify-center gap-2 text-center">
          <p className="text-xs font-bold text-danger">
            {loadError || 'Unable to connect to the FreshSpin server.'} Data shown may be outdated.
          </p>
          <button
            onClick={fetchAllData}
            className="px-3 py-1 rounded-lg bg-danger text-white text-xs font-bold transition"
          >
            Retry
          </button>
        </div>
      )}
      <AppLayout unreadCount={unreadAlerts} humidityWarning={latestHumidity.status === 'WARNING'}>
        <Routes>
          <Route path="/" element={<DashboardPage {...sharedProps} />} />
          <Route path="/orders" element={<OrdersPage {...sharedProps} />} />
          <Route path="/payments" element={<PaymentsPage {...sharedProps} />} />
          <Route path="/customers" element={<CustomersPage {...sharedProps} />} />
          <Route path="/services" element={<ServicesPage {...sharedProps} />} />
          <Route path="/humidity" element={<HumidityPage {...sharedProps} />} />
          <Route path="/inventory" element={<InventoryView showToast={showToast} />} />
          <Route path="/analytics" element={<AnalyticsView analyticsData={dashboardData?.analytics} latestHumidity={latestHumidity} humidityHistory={humidityHistory} metrics={metrics} orders={orders} onRefresh={fetchAllData} loading={loading} />} />
          <Route path="/reports" element={<ReportsView showToast={showToast} />} />
          <Route path="/notifications" element={<AlertsView showToast={showToast} />} />
          <Route path="/users" element={<StaffManagementView showToast={showToast} />} />
          <Route path="/settings" element={<SettingsView showToast={showToast} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>

        {/* Modals (global, available from any page) */}
        <OrderModals {...sharedProps} />
      </AppLayout>
    </>
  )
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────
function DashboardPage(p) {
  const { user } = useAuth()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening'
  const displayName = user?.name === 'Owner Admin' ? 'Owner Admin' : (user?.name?.split(' ')[0] || 'Admin')
  const todayShort = new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
  const weekday = new Date().toLocaleDateString('en-PH', { weekday: 'long' })
  const [weather, setWeather] = useState(null)
  useEffect(() => {
    // Real live weather (keyless Open-Meteo API). Hidden if unreachable — never faked.
    fetch('https://api.open-meteo.com/v1/forecast?latitude=14.13&longitude=121.33&current=temperature_2m,weather_code&timezone=Asia%2FManila')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const c = j?.current
        if (c && typeof c.temperature_2m === 'number') {
          setWeather({ temp: Math.round(c.temperature_2m), code: c.weather_code })
        }
      })
      .catch(() => {})
  }, [])
  const weatherMeta = (() => {
    if (!weather) return null
    const code = weather.code
    if (code === 0) return { label: 'Clear Sky', Icon: Sun }
    if (code <= 3) return { label: 'Partly Cloudy', Icon: CloudSun }
    if (code <= 48) return { label: 'Foggy', Icon: CloudFog }
    if (code <= 67 || (code >= 80 && code <= 82)) return { label: 'Rainy', Icon: CloudRain }
    if (code >= 95) return { label: 'Thunderstorm', Icon: CloudLightning }
    return { label: 'Cloudy', Icon: Cloud }
  })()
  return (
    <div className="space-y-2.5">
      {/* Greeting + date/weather + mini humidity summary */}
      <div className="relative">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <span className="absolute right-[30%] top-2 h-8 w-8 rounded-full border-2 border-brand-light/60 bg-white/50" />
          <span className="absolute right-[24%] top-10 h-5 w-5 rounded-full border border-brand-light/60 bg-white/40" />
          <span className="absolute right-[36%] top-14 h-3.5 w-3.5 rounded-full bg-brand-light/50" />
        </div>
        <div className="relative flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="shrink-0">
            <p className="text-[13px] font-medium text-navy">{greeting},</p>
            <h1 className="text-[20px] font-black text-navy">
              {displayName} <span aria-hidden="true">👋</span>
            </h1>
            <p className="mt-0.5 text-[12px] text-ink-secondary">Here&apos;s what&apos;s happening with your laundry business today.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex items-center gap-2.5 rounded-2xl bg-white border border-line shadow-card px-3.5 py-1.5 shrink-0">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-tintstrong text-navy">
                <Calendar className="w-4.5 h-4.5" />
              </span>
              <span className="leading-tight">
                <span className="block text-[13px] font-bold text-navy">{todayShort}</span>
                <span className="block text-[11px] text-ink-secondary">{weekday}</span>
              </span>
              {weatherMeta && (
                <>
                  <span aria-hidden="true" className="h-8 w-px bg-line" />
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-warning-bg text-warning">
                    <weatherMeta.Icon className="w-4.5 h-4.5" />
                  </span>
                  <span className="leading-tight">
                    <span className="block text-[13px] font-bold text-navy">{weather.temp}°C</span>
                    <span className="block text-[11px] text-ink-secondary">{weatherMeta.label}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Humidity Warning Banner */}
      {p.latestHumidity.status === 'WARNING' && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/80 via-rose-900/40 to-rose-950/60 border border-rose-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <AlertTriangle className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <h3 className="text-base font-bold text-rose-200">High Humidity Warning in Drying Area!</h3>
              <p className="text-xs text-rose-300/80 mt-0.5">
                Humidity is <strong className="text-white">{p.latestHumidity.humidity}%</strong> (Threshold: {p.latestHumidity.threshold}%). Check ventilation and dehumidifiers.
              </p>
            </div>
          </div>
          <NavLink to="/humidity" className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold whitespace-nowrap transition shadow-md">
            View Humidity Monitor
          </NavLink>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-[18px] bg-navy border border-white/10 shadow-card hover:shadow-pop transition relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-white/10 text-brand-light shadow-card"><Package className="w-5 h-5" /></div>
              <span className="text-[11px] font-bold text-white uppercase tracking-wider leading-tight">Active<br />Orders</span>
            </div>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white"><ArrowUpRight className="w-3.5 h-3.5" /></span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-[24px] leading-none font-black text-white">{p.metrics.activeOrdersCount}</span>
            <span className="text-xs text-white/60">of {p.metrics.totalOrdersCount} total</span>
          </div>
          <div className="mt-2.5 text-xs text-white/80 flex items-center gap-1.5 font-medium"><Clock className="w-3.5 h-3.5" /><span>In process right now</span></div>
          <svg aria-hidden="true" viewBox="0 0 200 24" preserveAspectRatio="none" className="absolute bottom-0 left-0 h-6 w-full"><path d="M0,14 C40,4 80,22 120,12 C150,5 175,16 200,10 L200,24 L0,24 Z" fill="var(--blue)" opacity="0.25" /></svg>
        </div>
        <div className="p-4 rounded-[18px] bg-navy border border-white/10 shadow-card hover:shadow-pop transition relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-emerald-500/20 text-emerald-400 shadow-card"><PhilippinePeso className="w-5 h-5" /></div>
              <span className="text-[11px] font-bold text-white uppercase tracking-wider leading-tight">Revenue<br />Collected</span>
            </div>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white"><ArrowUpRight className="w-3.5 h-3.5" /></span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-[24px] leading-none font-black text-emerald-400">₱{p.metrics.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="mt-2.5 text-xs text-emerald-400 flex items-center gap-1.5 font-semibold"><span aria-hidden="true">↑</span><span>{p.orders.filter(o => o.payment_status === 'Paid').length} Fully Paid Orders</span></div>
          <svg aria-hidden="true" viewBox="0 0 200 24" preserveAspectRatio="none" className="absolute bottom-0 left-0 h-6 w-full"><path d="M0,14 C40,4 80,22 120,12 C150,5 175,16 200,10 L200,24 L0,24 Z" fill="var(--success)" opacity="0.25" /></svg>
        </div>
        <div className="p-4 rounded-[18px] bg-navy border border-white/10 shadow-card hover:shadow-pop transition relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-amber-500/20 text-amber-400 shadow-card"><CreditCard className="w-5 h-5" /></div>
              <span className="text-[11px] font-bold text-white uppercase tracking-wider leading-tight">Unpaid<br />Receivables</span>
            </div>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white"><ArrowUpRight className="w-3.5 h-3.5" /></span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-[24px] leading-none font-black text-amber-400">₱{p.metrics.unpaidAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="mt-2.5 text-xs text-amber-400 flex items-center gap-1.5 font-semibold"><AlertTriangle className="w-3.5 h-3.5" /><span>{p.metrics.pendingPaymentsCount} Orders pending payment</span></div>
          <svg aria-hidden="true" viewBox="0 0 200 24" preserveAspectRatio="none" className="absolute bottom-0 left-0 h-6 w-full"><path d="M0,14 C40,4 80,22 120,12 C150,5 175,16 200,10 L200,24 L0,24 Z" fill="var(--warning)" opacity="0.25" /></svg>
        </div>
        <div className={`p-4 rounded-[18px] border shadow-card transition relative overflow-hidden group ${p.latestHumidity.status === 'WARNING' ? 'border-rose-500/60 bg-navy' : 'bg-navy border-white/10'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-full shadow-card ${p.latestHumidity.status === 'WARNING' ? 'bg-rose-500/20 text-rose-400' : 'bg-white/10 text-brand-light'}`}><Droplets className="w-5 h-5" /></div>
              <span className="text-[11px] font-bold text-white uppercase tracking-wider leading-tight">Drying Area<br />Telemetry</span>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${p.latestHumidity.is_online ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${p.latestHumidity.is_online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              {p.latestHumidity.is_online ? 'ESP32 Online' : 'Offline'}
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <div>
              <span className={`text-[22px] leading-none font-black ${p.latestHumidity.status === 'WARNING' ? 'text-rose-400' : 'text-white'}`}>
                {p.latestHumidity.is_online && p.latestHumidity.humidity !== null ? `${p.latestHumidity.humidity}%` : '—'}
              </span>
              <span className="block text-[10px] text-white/60 font-semibold mt-1">Humidity</span>
            </div>
            <div className="text-right">
              <span className="text-[20px] leading-none font-black text-amber-300">
                {p.latestHumidity.is_online && p.latestHumidity.temperature !== null ? `${p.latestHumidity.temperature}°C` : '—'}
              </span>
              <span className="block text-[10px] text-white/60 font-semibold mt-1">Temperature</span>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-white/60">
            <span>RH Threshold: {p.latestHumidity.threshold ?? 70}%</span>
            <span>{p.latestHumidity.last_updated ? new Date(p.latestHumidity.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-all ${p.latestHumidity.status === 'WARNING' ? 'bg-rose-400' : 'bg-brand-light'}`}
              style={{ width: `${p.latestHumidity.is_online ? Math.min(100, Math.max(4, (p.latestHumidity.humidity / Math.max(1, p.latestHumidity.threshold ?? 70)) * 100)) : 0}%` }}
            />
          </div>
          <div className="mt-2 text-[11px] font-medium text-white/60 flex items-center justify-between">
            <span>{p.latestHumidity.is_online ? `Sensor: ${p.latestHumidity.status}` : 'Sensor temporarily unavailable'}</span>
            <span className="text-[10px] text-white/40">{p.latestHumidity.device_id}</span>
          </div>
          <svg aria-hidden="true" viewBox="0 0 200 24" preserveAspectRatio="none" className="absolute bottom-0 left-0 h-6 w-full"><path d="M0,14 C40,4 80,22 120,12 C150,5 175,16 200,10 L200,24 L0,24 Z" fill="var(--blue)" opacity="0.25" /></svg>
        </div>
      </div>

      {/* Chart + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 p-4 rounded-2xl bg-white border border-line space-y-3 flex flex-col">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-tintstrong text-navy border border-brand-light shadow-card shrink-0">
                <Activity className="w-4.5 h-4.5" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-navy">Drying Area Telemetry Trend</h2>
                <p className="text-[11px] text-ink-secondary">Live ESP32 Temperature & Humidity readings at Drying Area #1</p>
              </div>
            </div>
            <button onClick={p.handleRefreshTelemetry} className="px-3 py-1.5 rounded-full bg-white hover:bg-brand-tint text-navy border-[1.5px] border-brand-light text-[11px] font-bold flex items-center gap-1.5 transition shadow-card">
              <RefreshCw className="w-3.5 h-3.5" />Refresh Live Data
            </button>
          </div>
          <div className="flex-1 min-h-[150px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={p.humidityHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                <XAxis dataKey="time" stroke="var(--navy)" fontSize={11} tickLine={false} />
                <YAxis domain={['auto', 'auto']} stroke="var(--navy)" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--white)', borderColor: 'var(--border)', borderRadius: '0.75rem', color: 'var(--navy)' }} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <ReferenceLine y={p.latestHumidity.threshold ?? 70} stroke="var(--danger)" strokeDasharray="4 4" label={{ value: `WARNING (${p.latestHumidity.threshold ?? 70}%)`, fill: 'var(--danger)', fontSize: 10, position: 'top' }} />
                <Line type="monotone" dataKey="humidity" stroke="var(--blue)" strokeWidth={2.5} dot={{ fill: 'var(--blue)', r: 3 }} activeDot={{ r: 6, fill: 'var(--navy)' }} name="Humidity (% RH)" isAnimationActive={false} />
                <Line type="monotone" dataKey="temperature" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 3 }} activeDot={{ r: 6, fill: '#b45309' }} name="Temperature (°C)" isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-line flex flex-col justify-between space-y-3">
          <div>
            <h2 className="text-sm font-bold text-navy flex items-center gap-2 mb-2"><span className="text-amber-400">⚡</span>Quick Actions</h2>
            <div className="space-y-1.5">
              <button onClick={p.handleOpenNewOrder} className="w-full py-1.5 px-3 rounded-xl bg-navy hover:bg-navy-hover text-white font-bold text-[13px] shadow-card flex items-center justify-between transition group">
                <span className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-light text-navy"><Plus className="w-3.5 h-3.5" /></span>Create New Order</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </button>
              <button onClick={() => p.setIsRecordPaymentModalOpen(true)} className="w-full py-1.5 px-3 rounded-xl bg-brand-tintstrong hover:brightness-105 border border-brand-light text-navy font-bold text-[13px] flex items-center justify-between transition group">
                <span className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-navy shadow-card"><PhilippinePeso className="w-3.5 h-3.5" /></span>Record Payment</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </button>
              <button onClick={() => p.setIsAddCustomerModalOpen(true)} className="w-full py-1.5 px-3 rounded-xl bg-brand-tintstrong hover:brightness-105 border border-brand-light text-navy font-bold text-[13px] flex items-center justify-between transition group">
                <span className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-navy shadow-card"><Users className="w-3.5 h-3.5" /></span>Add New Customer</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </button>
            </div>
          </div>

          {/* Live Pipeline mini */}
          <div className="pt-2 border-t border-line space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-navy uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-light animate-pulse" />Live Pipeline
              </div>
              <span className="text-[11px] text-ink-secondary font-medium">Click to filter</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {p.PIPELINE_STAGES.map((stage) => {
                const Icon = stage.icon
                return (
                  <button key={stage.id} onClick={() => p.navigateToOrdersWithStatus(stage.id)} className={`p-1.5 rounded-xl border ${stage.borderColor} ${stage.bgColor} text-left transition-all hover:scale-[1.02] hover:shadow-lg ${stage.glowColor} group flex items-center gap-2`}>
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white border ${stage.borderColor}`}>
                      <Icon className={`w-3.5 h-3.5 ${stage.textColor}`} />
                    </span>
                    <span className="flex-1 min-w-0 leading-tight">
                      <span className="block truncate text-[11px] font-bold text-navy">{stage.label}</span>
                      <span className="block text-[9px] text-ink-secondary">Step {stage.step}</span>
                    </span>
                    <span className="shrink-0 text-right leading-tight">
                      <span className={`block text-[13px] font-black ${stage.textColor}`}>{stage.count}</span>
                      <span className="flex items-center justify-end gap-0.5 text-[10px] text-ink-secondary group-hover:text-navy">View <ArrowUpRight className="w-2.5 h-2.5" /></span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Humidity Summary */}
      <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-r from-brand-tint via-white to-white border border-line shadow-card p-4">
        <span aria-hidden="true" className="absolute left-[38%] top-3 h-8 w-8 rounded-full border-2 border-brand-light/50 bg-white/40 animate-float-slow" />
        <span aria-hidden="true" className="absolute left-[46%] top-8 h-5 w-5 rounded-full border border-brand-light/60 bg-white/30 animate-float-slow" />
        <div className="relative flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex-1">
            <h2 className="flex items-center gap-2 text-sm font-bold text-navy">
              <Droplets className="w-4.5 h-4.5" />Humidity Summary
            </h2>
            <p className="text-[11px] text-ink-secondary">Current status for all drying areas</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
              <span className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success-bg text-success transition-transform duration-200 hover:scale-110">
                  <CheckCircle2 className="w-4.5 h-4.5" />
                </span>
                <span className="leading-tight">
                  <span className="block text-[12px] font-bold text-navy">Normal Range</span>
                  <span className="block text-[10px] text-ink-secondary">Below {p.latestHumidity.threshold ?? 70}%</span>
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-navy transition-transform duration-200 hover:scale-110">
                  <Waves className="w-4.5 h-4.5" />
                </span>
                <span className="leading-tight">
                  <span className="block text-[12px] font-bold text-navy">
                    {p.latestHumidity.status === 'WARNING' ? 'Elevated' : 'Stable'}
                  </span>
                  <span className="block text-[10px] text-ink-secondary">
                    {p.latestHumidity.status === 'WARNING' ? 'Check ventilation' : 'No alert'}
                  </span>
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full transition-transform duration-200 hover:scale-110 ${p.latestHumidity.is_online ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-500'}`}>
                  {p.latestHumidity.is_online ? <Wifi className="w-4.5 h-4.5" /> : <WifiOff className="w-4.5 h-4.5" />}
                </span>
                <span className="leading-tight">
                  <span className="block text-[12px] font-bold text-navy">
                    {p.latestHumidity.is_online ? 'ESP32 Connected' : 'ESP32 Offline'}
                  </span>
                  <span className="block text-[10px] text-ink-secondary">
                    {p.latestHumidity.is_online ? 'Online' : 'Offline'}
                  </span>
                </span>
              </span>
            </div>
          </div>
          <img
            src="/images/freshspin-login-bg.jpg"
            alt="Folded fresh laundry"
            className="h-20 w-full rounded-2xl object-cover md:h-24 md:w-52 shrink-0 shadow-card"
          />
        </div>
      </div>

      {/* Pipeline Cards */}
      <div className="p-4 rounded-2xl bg-white border border-line space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-brand-light animate-pulse" />
            <h2 className="text-sm font-black text-navy">Live Laundry Pipeline</h2>
            <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-brand-tintstrong text-navy border border-brand-light">Real-Time</span>
          </div>
          <button onClick={p.fetchAllData} disabled={p.loading} className="p-2 rounded-xl bg-white hover:bg-brand-tintstrong border border-line text-navy hover:text-navy transition">
            <RefreshCw className={`w-3.5 h-3.5 ${p.loading ? 'animate-spin text-navy' : ''}`} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
          {p.PIPELINE_STAGES.map((stage) => {
            const Icon = stage.icon
            const percentage = Math.round((stage.count / Math.max(1, p.orders.length)) * 100)
            return (
              <div key={stage.id} onClick={() => p.navigateToOrdersWithStatus(stage.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && p.navigateToOrdersWithStatus(stage.id)}
                className={`p-3 rounded-2xl border ${stage.borderColor} ${stage.bgColor} cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl ${stage.glowColor} group flex flex-col justify-between relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-28 h-28 bg-white/5 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition duration-500" />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-brand-tint/90 text-navy border border-line">STEP {stage.step}</span>
                    <div className={`p-1.5 rounded-xl bg-white border ${stage.borderColor} ${stage.textColor}`}><Icon className="w-4 h-4" /></div>
                  </div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-navy group-hover:text-navy transition mb-1.5">{stage.label}</div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-xl font-black tracking-tight ${stage.textColor}`}>{stage.count}</span>
                    <span className="text-[11px] text-ink-secondary">{stage.count === 1 ? 'order' : 'orders'}</span>
                  </div>
                  <p className="text-[11px] text-ink-secondary mt-1.5 leading-snug">{stage.description}</p>
                  <div className="mt-2.5 w-full bg-white h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full ${stage.progressColor} transition-all duration-700 rounded-full`} style={{ width: `${Math.min(100, Math.max(stage.count > 0 ? 12 : 0, percentage))}%` }} />
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-line flex items-center justify-between text-[11px]">
                  <span className={`font-semibold ${stage.textColor}`}>{stage.count > 0 ? stage.activeText : 'Queue clear'}</span>
                  <span className="text-ink-secondary group-hover:text-navy flex items-center gap-1 transition">View <ChevronRight className="w-3.5 h-3.5" /></span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="p-4 rounded-2xl bg-white border border-line space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-navy">Recent Orders</h2>
          <NavLink to="/orders" className="text-xs font-semibold text-navy hover:text-navy flex items-center gap-1">
            View All ({p.orders.length}) <ArrowUpRight className="w-3.5 h-3.5" />
          </NavLink>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-brand-tint text-ink-secondary text-[11px] uppercase font-semibold">
              <tr>
                <th className="p-2.5 rounded-l-xl">Order #</th>
                <th className="p-2.5">Customer</th>
                <th className="p-2.5">Amount</th>
                <th className="p-2.5">Payment</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5 rounded-r-xl text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {p.loading ? (
                <tr><td colSpan="6" className="p-6 text-center text-ink-secondary text-xs">Loading recent orders…</td></tr>
              ) : p.orders.length === 0 ? (
                <tr><td colSpan="6" className="p-6 text-center text-ink-secondary">No orders yet. Create the first order to get started.</td></tr>
              ) : (
              p.orders.slice(0, 5).map(order => (
                <tr key={order.id} className="hover:bg-brand-tint transition">
                  <td className="p-2.5 font-mono font-bold text-navy">{order.order_number}</td>
                  <td className="p-2.5">
                    <div className="font-medium text-navy">{order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : 'Guest'}</div>
                    <div className="text-[11px] text-ink-secondary">{order.customer?.phone}</div>
                  </td>
                  <td className="p-2.5 font-bold text-navy">₱{Number(order.total_amount).toFixed(2)}</td>
                  <td className="p-2.5">{p.renderPaymentBadge(order.payment_status)}</td>
                  <td className="p-2.5">{p.renderStatusBadge(order.laundry_status)}</td>
                  <td className="p-2.5 text-right">
                    <button onClick={() => p.setSelectedOrderDetails(order)} className="p-1.5 rounded-lg bg-brand-tint hover:bg-brand-tintstrong text-navy hover:text-navy transition"><Eye className="w-4 h-4" /></button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Orders Page ──────────────────────────────────────────────────────────────
function OrdersPage(p) {
  const [searchParams] = useSearchParams()
  useEffect(() => {
    const q = searchParams.get('q')
    if (q !== null && q !== p.orderSearch) p.setOrderSearch(q)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])
  // Kilograms per order for the Weight column (per-piece extras listed below).
  const orderWeightOf = (order) => {
    const items = p.orderItemsOf(order)
    const kg = items
      .filter(i => (i?.service?.unit || 'kg') === 'kg')
      .reduce((sum, i) => sum + Number(i.quantity || 0), 0)
    const extras = items.filter(i => (i?.service?.unit || 'kg') !== 'kg')
    return { kg, extras }
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy">Orders Management</h1>
        </div>
        <button onClick={p.handleOpenNewOrder} className="px-4 py-2.5 rounded-xl bg-navy hover:bg-navy-hover text-white font-bold text-sm shadow-lg flex items-center gap-2 transition">
          <Plus className="w-4 h-4" />Create New Order
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="p-3.5 rounded-2xl bg-white border border-line flex flex-wrap items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-navy shrink-0" />
        {[
          { id: 'All', label: 'All', count: p.orders.length },
          { id: 'Pending', label: 'Pending', count: p.pipelineCounts.Pending },
          { id: 'Received', label: 'Received', count: p.pipelineCounts.Received },
          { id: 'Washing', label: 'Washing', count: p.pipelineCounts.Washing },
          { id: 'Drying', label: 'Drying', count: p.pipelineCounts.Drying },
          { id: 'Folding', label: 'Folding / Ironing', count: p.pipelineCounts.Folding },
          { id: 'Ready for Pickup', label: 'Ready', count: p.pipelineCounts['Ready for Pickup'] },
          { id: 'Out for Delivery', label: 'Out for Delivery', count: p.pipelineCounts['Out for Delivery'] },
          { id: 'Completed', label: 'Completed', count: p.pipelineCounts.Completed },
          { id: 'Cancelled', label: 'Cancelled', count: p.orders.filter(o => o.laundry_status === 'Cancelled').length }
        ].map(st => (
          <button key={st.id} onClick={() => p.setOrderStatusFilter(st.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${p.orderStatusFilter === st.id ? 'bg-navy text-white shadow-card ring-2 ring-brand-light' : 'bg-white text-navy hover:bg-brand-tint border border-line'}`}>
            {st.label} <span className={`px-1.5 rounded-full text-[10px] font-black ${p.orderStatusFilter === st.id ? 'bg-white/20 text-white' : 'bg-brand-tintstrong text-navy'}`}>{st.count}</span>
          </button>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="p-4 rounded-2xl bg-white border border-line grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-ink-secondary" />
          <input type="text" placeholder="Order #, Customer, Phone..." value={p.orderSearch} onChange={e => p.setOrderSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-line text-sm text-navy placeholder-ink-secondary focus:outline-none focus:border-brand-light" />
        </div>
        <select value={p.orderStatusFilter} onChange={e => p.setOrderStatusFilter(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white border border-line text-sm text-navy focus:outline-none focus:border-brand-light">
          <option value="All">All Statuses</option>
          {p.ORDER_STATUS_STEPS.map(s => <option key={s} value={s}>{s}</option>)}
          <option value="Cancelled">Cancelled</option>
        </select>
        <select value={p.orderPaymentFilter} onChange={e => p.setOrderPaymentFilter(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white border border-line text-sm text-navy focus:outline-none focus:border-brand-light">
          <option value="All">All Payment Statuses</option>
          <option value="Paid">Fully Paid</option>
          <option value="Partial">Partial</option>
          <option value="Unpaid">Unpaid</option>
        </select>
        <select value={p.orderServiceFilter} onChange={e => p.setOrderServiceFilter(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white border border-line text-sm text-navy focus:outline-none focus:border-brand-light">
          <option value="All">All Services</option>
          {p.services.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
      </div>

      {/* Orders Table */}
      <div className="p-6 rounded-2xl bg-white border border-line overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-tint text-ink-secondary text-xs uppercase font-semibold">
              <tr>
                <th className="p-3.5 rounded-l-xl">Order Ref</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Weight</th>
                <th className="p-3.5">Total</th>
                <th className="p-3.5">Payment</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 rounded-r-xl text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {p.filteredOrders.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-ink-secondary">No orders found matching the selected filters.</td></tr>
              ) : p.filteredOrders.map(order => (
                <tr key={order.id} className="hover:bg-brand-tint transition">
                  <td className="p-3.5">
                    <span className="font-mono font-bold text-navy block">{order.order_number}</span>
                    <span className="text-[11px] text-ink-secondary">{new Date(order.order_date).toLocaleDateString()}</span>
                  </td>
                  <td className="p-3.5">
                    <div className="font-medium text-navy">{order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : 'Guest'}</div>
                    <div className="text-xs text-ink-secondary">{order.customer?.phone || 'No phone'}</div>
                  </td>
                  <td className="p-3.5 text-xs">
                    {(() => {
                      const { kg, extras } = orderWeightOf(order)
                      if (kg <= 0 && extras.length === 0) return <span className="text-ink-secondary">—</span>
                      return (
                        <>
                          {kg > 0 && <div className="font-bold text-navy text-sm">{kg.toFixed(2)} kg</div>}
                          {extras.map((it, idx) => <div key={idx} className="text-ink-secondary mt-0.5">{it.quantity} {it.service?.unit} {it.service?.name}</div>)}
                        </>
                      )
                    })()}
                  </td>
                  <td className="p-3.5">
                    <div className="font-bold text-navy">₱{Number(order.total_amount).toFixed(2)}</div>
                    {Number(order.remaining_balance) > 0 && <div className="text-[11px] text-amber-400">Bal: ₱{Number(order.remaining_balance).toFixed(2)}</div>}
                  </td>
                  <td className="p-3.5">{p.renderPaymentBadge(order.payment_status)}</td>
                  <td className="p-3.5">
                    <select value={order.laundry_status} onChange={e => p.handleUpdateOrderStatus(order.id, e.target.value)} className="px-2.5 py-1.5 rounded-lg bg-brand-tint border border-line text-xs font-semibold text-navy focus:outline-none focus:border-brand-light">
                      {p.ORDER_STATUS_STEPS.map((status, index) => {
                        const cur = p.ORDER_STATUS_STEPS.indexOf(order.laundry_status)
                        return (cur >= 0 && (status === order.laundry_status || index === cur + 1)) && (
                          <option key={status} value={status}>{index + 1}. {laundryStatusLabel(status)}</option>
                        )
                      })}
                      {order.laundry_status === 'Cancelled' && <option value="Cancelled">Cancelled</option>}
                      {!['Completed', 'Cancelled'].includes(order.laundry_status) && <option value="Cancelled">Cancel Order</option>}
                    </select>
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => p.setSelectedOrderDetails(order)} className="p-1.5 rounded-lg bg-brand-tint hover:bg-brand-tintstrong text-navy hover:text-navy transition" title="View Details"><Eye className="w-4 h-4" /></button>
                      {order.payment_status !== 'Paid' ? (
                        <>
                          <button onClick={() => p.handleMarkAsPaid(order)} className="px-2 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1 transition shadow-card" title="Mark as Paid in one click">
                            <CheckCircle2 className="w-3.5 h-3.5" />Mark as Paid
                          </button>
                          <button onClick={() => { p.setPaymentOrderId(String(order.id)); p.setPaymentAmount(String(order.remaining_balance || order.total_amount)); p.setIsRecordPaymentModalOpen(true) }} className="p-1.5 rounded-lg bg-brand-tint hover:bg-brand-tintstrong text-navy hover:text-navy transition" title="Record partial payment"><PhilippinePeso className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <span className="px-2 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold flex items-center gap-1" title="Fully paid"><CheckCircle2 className="w-3.5 h-3.5" />Paid</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Payments Page ────────────────────────────────────────────────────────────
function PaymentsPage(p) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy">Payments & Cashier</h1>
          <p className="text-xs text-ink-secondary">Record cash, GCash, or Maya payments — manage receivables</p>
        </div>
        <button onClick={() => p.setIsRecordPaymentModalOpen(true)} className="px-4 py-2.5 rounded-xl bg-navy hover:bg-navy-hover text-white font-bold text-sm shadow-lg flex items-center gap-2 transition">
          <PhilippinePeso className="w-4 h-4" />Record Payment
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-line"><span className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Total Collected</span><div className="text-3xl font-black text-emerald-400 mt-2">₱{p.metrics.totalRevenue.toFixed(2)}</div><div className="text-xs text-ink-secondary mt-1">{p.allPayments.length} Recorded transactions</div></div>
        <div className="p-5 rounded-2xl bg-white border border-line"><span className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Outstanding Unpaid</span><div className="text-3xl font-black text-amber-400 mt-2">₱{p.metrics.unpaidAmount.toFixed(2)}</div><div className="text-xs text-ink-secondary mt-1">{p.metrics.pendingPaymentsCount} Orders pending payment</div></div>
        <div className="p-5 rounded-2xl bg-white border border-line"><span className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Payment Methods</span><div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">{PAYMENT_METHODS.map(m => { const Icon = m.icon; const count = p.allPayments.filter(pp => pp.payment_method === m.value).length; return <span key={m.value} className="flex items-center gap-1.5 text-xs text-navy"><Icon className="w-4 h-4 text-ink-secondary" />{m.value} ({count})</span> })}</div></div>
      </div>
      <div className="p-4 rounded-2xl bg-white border border-line grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative"><Search className="w-4 h-4 absolute left-3 top-3 text-ink-secondary" /><input type="text" placeholder="Search Payment Ref, Order, Customer..." value={p.paymentSearch} onChange={e => p.setPaymentSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-line text-sm text-navy placeholder-ink-secondary focus:outline-none focus:border-brand-light" /></div>
        <select value={p.paymentMethodFilter} onChange={e => p.setPaymentMethodFilter(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white border border-line text-sm text-navy focus:outline-none focus:border-brand-light"><option value="All">All Methods</option>{PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.value}</option>)}</select>
      </div>
      <div className="p-6 rounded-2xl bg-white border border-line">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-tint text-ink-secondary text-xs uppercase font-semibold"><tr><th className="p-3.5 rounded-l-xl">Payment Ref</th><th className="p-3.5">Order #</th><th className="p-3.5">Customer</th><th className="p-3.5">Amount</th><th className="p-3.5">Method</th><th className="p-3.5 rounded-r-xl">Date</th></tr></thead>
            <tbody className="divide-y divide-line">
              {p.filteredPayments.length === 0 ? <tr><td colSpan="6" className="p-8 text-center text-ink-secondary">No payment transactions recorded yet.</td></tr> : p.filteredPayments.map(pay => (
                <tr key={pay.id} className="hover:bg-brand-tint transition">
                  <td className="p-3.5 font-mono font-bold text-emerald-400">{pay.payment_reference}</td>
                  <td className="p-3.5 font-mono text-navy">{pay.order_number}</td>
                  <td className="p-3.5 font-medium text-navy">{pay.customer_name}</td>
                  <td className="p-3.5 font-bold text-navy">₱{Number(pay.amount).toFixed(2)}</td>
                  <td className="p-3.5"><span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${paymentMethodChip(pay.payment_method)}`}>{pay.payment_method}</span></td>
                  <td className="p-3.5 text-xs text-ink-secondary">{new Date(pay.payment_date || pay.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Customers Page ───────────────────────────────────────────────────────────
function CustomersPage(p) {
  const filtered = p.customers.filter(c => {
    const s = p.customerSearch.toLowerCase().trim()
    const matchesSearch = !s || `${c.first_name} ${c.last_name}`.toLowerCase().includes(s) || c.phone?.includes(s) || c.email?.toLowerCase().includes(s) || c.customer_code?.toLowerCase().includes(s)
    const matchesStatus = p.customerStatusFilter === 'All'
      || (p.customerStatusFilter === 'active' && c.status !== 'inactive')
      || (p.customerStatusFilter === 'inactive' && c.status === 'inactive')
    return matchesSearch && matchesStatus
  })
  const activeCount = p.customers.filter(c => c.status !== 'inactive').length
  const archivedCount = p.customers.filter(c => c.status === 'inactive').length

  const openEdit = (c) => {
    p.setEditingCustomer(c)
    p.setEditCustForm({
      first_name: c.first_name || '',
      last_name: c.last_name || '',
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      notes: c.notes || '',
    })
  }

  const orderStats = {}
  p.orders.forEach(o => {
    const s = orderStats[o.customer_id] || { n: 0, t: 0 }
    s.n += 1
    s.t += Number(o.total_amount) || 0
    orderStats[o.customer_id] = s
  })

  const tabs = [
    { id: 'active', label: 'Active', count: activeCount },
    { id: 'inactive', label: 'Archived', count: archivedCount },
    { id: 'All', label: 'All', count: p.customers.length },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-black text-navy">Customer Profiles</h1><p className="text-xs text-ink-secondary">Manage customer records, contact numbers, and laundry history</p></div>
        <button onClick={() => p.setIsAddCustomerModalOpen(true)} className="px-4 py-2.5 rounded-xl bg-navy hover:bg-navy-hover text-white font-bold text-sm shadow-lg flex items-center gap-2 transition"><Users className="w-4 h-4" />Add New Customer</button>
      </div>

      <div className="p-3.5 rounded-2xl bg-white border border-line flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-ink-secondary" />
          <input type="text" placeholder="Search customer name, phone, email, or code..." value={p.customerSearch} onChange={e => p.setCustomerSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-line text-sm text-navy placeholder-ink-secondary focus:outline-none focus:border-brand-light" />
        </div>
        <div className="flex items-center gap-2">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => p.setCustomerStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${p.customerStatusFilter === tab.id ? 'bg-navy text-white shadow-card ring-2 ring-brand-light' : 'bg-white text-navy hover:bg-brand-tint border border-line'}`}>
              {tab.label}
              <span className={`px-1.5 rounded-full text-[10px] font-black ${p.customerStatusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-brand-tintstrong text-navy'}`}>{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(c => {
          const archived = c.status === 'inactive'
          return (
            <div key={c.id} className={`p-5 rounded-2xl bg-white border transition space-y-3 ${archived ? 'border-line opacity-75 grayscale-[0.35] hover:opacity-100 hover:grayscale-0' : 'border-line hover:border-brand-light hover:shadow-card'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold shrink-0 ${archived ? 'bg-brand-tint text-ink-secondary border-line' : 'bg-brand-light border-brand-light text-navy'}`}>{c.first_name?.[0]}{c.last_name?.[0]}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-navy truncate">{c.first_name} {c.last_name}</h3>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border shrink-0 ${archived ? 'bg-brand-tint text-ink-secondary border-line' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>{archived ? 'Archived' : 'Active'}</span>
                  </div>
                  <p className="text-xs text-ink-secondary">{c.phone}</p>
                  <p className="text-[10px] text-ink-secondary font-mono">{c.customer_code}</p>
                </div>
              </div>
              <div className="text-xs text-ink-secondary space-y-1">
                <p className="truncate">📍 {c.address || 'No address on file'}</p>
                <p className="truncate">✉️ {c.email || 'No email on file'}</p>
              </div>
              <div className="pt-3 border-t border-line flex justify-between text-xs font-semibold">
                <span className="text-ink-secondary">Orders: <strong className="text-navy">{orderStats[c.id]?.n ?? c.orders_count ?? 0}</strong></span>
                <span className="text-emerald-400">₱{(orderStats[c.id]?.t || 0).toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(c)} className="flex-1 py-1.5 rounded-xl bg-brand-tint hover:bg-brand-tintstrong text-navy text-xs font-bold flex items-center justify-center gap-1.5 transition">
                  <Edit3 className="w-3.5 h-3.5" />View / Edit
                </button>
                {archived ? (
                  <button onClick={() => p.handleRestoreCustomer(c)} className="flex-1 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition">
                    <RefreshCw className="w-3.5 h-3.5" />Restore
                  </button>
                ) : (
                  <button onClick={() => p.setArchivingCustomer(c)} className="flex-1 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition">
                    <Trash2 className="w-3.5 h-3.5" />Archive
                  </button>
                )}
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center space-y-2">
            <p className="text-sm font-bold text-navy">No customers found</p>
            <p className="text-xs text-ink-secondary">{p.customerSearch ? 'Try a different search term.' : 'Add your first customer profile to get started.'}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Services Page ────────────────────────────────────────────────────────────
function ServicesPage(p) {
  const [filter, setFilter] = useState('All')
  const [editingId, setEditingId] = useState(null)
  const [priceDraft, setPriceDraft] = useState('')
  const [savingPrice, setSavingPrice] = useState(false)

  const startPriceEdit = (s) => {
    setEditingId(s.id)
    setPriceDraft(String(Number(s.price).toFixed(2)))
  }
  const savePriceEdit = async (s) => {
    setSavingPrice(true)
    const ok = await p.handleUpdateServicePrice(s, priceDraft)
    setSavingPrice(false)
    if (ok) setEditingId(null)
  }
  const visible = p.services.filter(s => filter === 'All' || s.status === (filter === 'Active' ? 'active' : 'inactive'))
  const activeCount = p.services.filter(s => s.status === 'active').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy">Pricing</h1>
          <p className="text-xs text-ink-secondary">Standard laundry rate and per-piece extras — price changes apply to new orders immediately; existing orders keep their recorded prices</p>
        </div>
        <div className="flex items-center gap-2">
          {['All', 'Active', 'Inactive'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${filter === f ? 'bg-navy text-white shadow-card ring-2 ring-brand-light' : 'bg-white text-navy hover:bg-brand-tint border border-line'}`}>
              {f}
              <span className={`ml-1.5 px-1.5 rounded-full text-[10px] font-black ${filter === f ? 'bg-white/20 text-white' : 'bg-brand-tintstrong text-navy'}`}>
                {f === 'All' ? p.services.length : f === 'Active' ? activeCount : p.services.length - activeCount}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visible.map(s => {
          const active = s.status === 'active'
          const isStandard = p.standardKgService?.id === s.id
          return (
            <div key={s.id} className={`p-6 rounded-2xl border transition flex flex-col justify-between space-y-4 ${active ? 'bg-white border-line hover:border-brand-light hover:shadow-card' : 'bg-brand-tint/60 border-dashed border-line opacity-80'}`}>
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h3 className={`text-lg font-bold ${active ? 'text-navy' : 'text-ink-secondary line-through decoration-rose-400/60'}`}>{s.name}</h3>
                  {editingId === s.id ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-bold text-navy">₱</span>
                      <input
                        type="number" min="0" step="0.01" value={priceDraft}
                        onChange={e => setPriceDraft(e.target.value)}
                        disabled={savingPrice} aria-label={`New price for ${s.name}`}
                        className="w-20 px-2 py-1.5 rounded-lg bg-brand-tint border border-line text-sm font-bold text-navy focus:outline-none focus:border-brand-light"
                      />
                      <span className="text-[11px] text-ink-secondary shrink-0">/ {s.unit}</span>
                      <button type="button" onClick={() => savePriceEdit(s)} disabled={savingPrice} className="px-2.5 py-1.5 rounded-lg bg-navy hover:bg-navy-hover text-white text-[11px] font-bold transition disabled:opacity-50">Save</button>
                      <button type="button" onClick={() => setEditingId(null)} disabled={savingPrice} className="px-2 rounded-lg text-ink-secondary hover:text-navy text-[11px] font-bold transition disabled:opacity-50">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${active ? 'bg-brand-tintstrong text-navy border-brand-light' : 'bg-white text-ink-secondary border-line'}`}>₱{Number(s.price).toFixed(2)} / {s.unit}</span>
                      <button type="button" onClick={() => startPriceEdit(s)} title={`Edit price of ${s.name}`} aria-label={`Edit price of ${s.name}`} className="p-1.5 rounded-lg text-ink-secondary hover:text-navy hover:bg-brand-tint transition">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                {isStandard && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-navy text-white text-[10px] font-bold uppercase tracking-wider">
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand-light" />
                    Standard rate — used for new kilogram orders
                  </div>
                )}
                <p className="text-xs text-ink-secondary mt-2">{s.description}</p>
              </div>

              <div className="pt-4 border-t border-line space-y-3">
                <div className="flex items-center justify-between text-xs text-ink-secondary">
                  <span>Est. Turnaround: <strong className="text-navy">{s.estimated_days} day{s.estimated_days !== 1 ? 's' : ''}</strong></span>
                  <span className={`px-2 py-0.5 rounded font-bold border ${active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
                    {active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-ink-secondary leading-tight">
                    {active ? 'Available when creating a new order' : 'Hidden from new orders — existing orders unaffected'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={active}
                    aria-label={`${active ? 'Deactivate' : 'Activate'} ${s.name}`}
                    onClick={() => p.handleToggleService(s)}
                    className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-light focus:ring-offset-2 ${active ? 'bg-emerald-500' : 'bg-ink-secondary/40'}`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-card transition-transform duration-200 ${active ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
        {visible.length === 0 && <div className="col-span-full py-16 text-center text-ink-secondary">No services match this filter.</div>}
      </div>
    </div>
  )
}

// ─── Humidity Page ────────────────────────────────────────────────────────────
function HumidityPage(p) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy flex items-center gap-2">
            <Droplets className="w-6 h-6 text-navy" />Drying Area Telemetry Hub
          </h1>
          <p className="text-xs text-ink-secondary">Real-time ESP32 temperature & humidity monitoring for the drying area in Victoria, Laguna</p>
        </div>
        <button onClick={p.handleRefreshTelemetry} className="px-4 py-2.5 rounded-xl bg-navy hover:bg-navy-hover text-white font-bold text-sm shadow-lg flex items-center gap-2 transition">
          <RefreshCw className="w-4 h-4" />Refresh Live Telemetry
        </button>
      </div>

      <div className="p-6 rounded-2xl bg-white border border-line grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <span className="text-xs text-ink-secondary uppercase font-semibold">Device ID</span>
          <div className="text-lg font-mono font-bold text-navy mt-1">{p.latestHumidity.device_id || 'FRESHSPIN-ESP32-01'}</div>
          <span className="text-[10px] text-ink-secondary">{p.latestHumidity.location || 'Drying Area #1'}</span>
        </div>
        <div>
          <span className="text-xs text-ink-secondary uppercase font-semibold flex items-center gap-1">
            <Thermometer className="w-3.5 h-3.5 text-amber-500" />Current Temperature
          </span>
          <div className="text-2xl font-black text-navy mt-1">
            {p.latestHumidity.is_online && p.latestHumidity.temperature !== null ? `${p.latestHumidity.temperature} °C` : '—'}
          </div>
          <span className="text-[10px] text-ink-secondary">DHT11 GPIO 4</span>
        </div>
        <div>
          <span className="text-xs text-ink-secondary uppercase font-semibold flex items-center gap-1">
            <Droplets className="w-3.5 h-3.5 text-blue-500" />Current Humidity
          </span>
          <div className={`text-2xl font-black mt-1 ${p.latestHumidity.status === 'WARNING' ? 'text-rose-500' : 'text-navy'}`}>
            {p.latestHumidity.is_online && p.latestHumidity.humidity !== null ? `${p.latestHumidity.humidity} %` : '—'}
          </div>
          <span className="text-[10px] text-ink-secondary">Warning at ≥ {p.latestHumidity.threshold ?? 70}%</span>
        </div>
        <div>
          <span className="text-xs text-ink-secondary uppercase font-semibold">Hardware Status</span>
          <div className="mt-1.5 flex items-center gap-2">
            <span className={`px-2.5 py-1 text-xs font-bold rounded-full border inline-flex items-center gap-1.5 ${p.latestHumidity.is_online ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/40' : 'bg-rose-500/10 text-rose-600 border-rose-500/30'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${p.latestHumidity.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              {p.latestHumidity.is_online ? 'ESP32 Connected' : 'Offline'}
            </span>
          </div>
          <span className="text-[10px] text-ink-secondary block mt-1">{p.latestHumidity.is_online ? `Reading: ${p.latestHumidity.status}` : 'Offline (timeout > 180s)'}</span>
        </div>
        <div>
          <span className="text-xs text-ink-secondary uppercase font-semibold">Last Sensor Update</span>
          <div className="text-sm font-semibold text-navy mt-1.5">
            {p.latestHumidity.last_updated ? new Date(p.latestHumidity.last_updated).toLocaleTimeString() : '—'}
          </div>
          <span className="text-[10px] text-ink-secondary">
            {p.latestHumidity.last_updated ? new Date(p.latestHumidity.last_updated).toLocaleDateString() : 'No readings yet'}
          </span>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-white border border-line space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-navy">Live Telemetry Stream (Temperature & Relative Humidity)</h3>
          <span className="text-xs text-ink-secondary font-medium">Actual readings from MySQL database</span>
        </div>
        {p.humidityHistory.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-ink-secondary">
            No sensor data in database yet. Connect ESP32 to Android hotspot to begin streaming live telemetry.
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={p.humidityHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                <XAxis dataKey="time" stroke="var(--navy)" fontSize={11} />
                <YAxis domain={['auto', 'auto']} stroke="var(--navy)" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--white)', borderColor: 'var(--border)', borderRadius: '0.75rem', color: 'var(--navy)' }} />
                <Legend />
                <ReferenceLine y={p.latestHumidity.threshold ?? 70} stroke="var(--danger)" strokeDasharray="4 4" label={{ value: `HUMIDITY WARNING (${p.latestHumidity.threshold ?? 70}%)`, fill: 'var(--danger)', fontSize: 10 }} />
                <Line type="monotone" dataKey="humidity" stroke="var(--blue)" strokeWidth={3} dot={{ fill: 'var(--blue)', r: 3 }} name="Humidity (% RH)" isAnimationActive={false} />
                <Line type="monotone" dataKey="temperature" stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#f59e0b', r: 3 }} name="Temperature (°C)" isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {p.humidityHistory.length > 0 && (
        <div className="p-6 rounded-2xl bg-white border border-line">
          <h3 className="text-base font-bold text-navy mb-3">Recent Sensor Readings Log</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-brand-tint border-b border-line text-navy uppercase font-semibold">
                <tr>
                  <th className="px-3 py-2">Timestamp</th>
                  <th className="px-3 py-2">Temperature</th>
                  <th className="px-3 py-2">Humidity</th>
                  <th className="px-3 py-2">Threshold Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/40">
                {p.humidityHistory.slice(-10).reverse().map((reading, idx) => (
                  <tr key={idx} className="hover:bg-brand-tint/30 transition">
                    <td className="px-3 py-2 font-mono text-ink-secondary">{reading.time}</td>
                    <td className="px-3 py-2 font-bold text-amber-600">{reading.temperature !== null ? `${reading.temperature} °C` : '—'}</td>
                    <td className="px-3 py-2 font-bold text-navy">{reading.humidity !== null ? `${reading.humidity} %` : '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${reading.status === 'WARNING' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {reading.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Modals (global, rendered at root level) ──────────────────────────────────
function OrderModals(p) {
  const kgQty = Number(p.newOrderItems[0]?.quantity) || 0
  const kgLine = p.newOrderTotals.lines[0]
  const kgPrice = p.standardKgService ? Number(p.standardKgService.price) : 0
  return (
    <>
      {/* Create Order Modal */}
      {p.isNewOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-line rounded-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="text-lg font-bold text-navy">Create New Laundry Order</h3>
              <button onClick={() => p.setIsNewOrderModalOpen(false)} className="text-ink-secondary hover:text-navy text-xl">✕</button>
            </div>
            <form onSubmit={p.handleCreateOrder} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-navy mb-1">Select Customer</label>
                <select value={p.newOrderCustomer} onChange={e => p.setNewOrderCustomer(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-brand-tint border border-line text-navy focus:outline-none focus:border-brand-light" required>
                  <option value="">-- Choose Customer --</option>
                  {p.customers.filter(c => c.status !== 'inactive').map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.phone})</option>)}
                </select>
              </div>

              <div className="space-y-3">
                {/* Standard kilogram load */}
                <div className="p-3 rounded-xl bg-brand-tint border border-brand-light space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-xs font-semibold text-navy">Weight (kg)</label>
                    {p.standardKgService && (
                      <span className="px-2 py-0.5 rounded-lg bg-white border border-brand-light text-[10px] font-bold text-navy">{p.standardKgService.name} — ₱{Number(p.standardKgService.price).toFixed(2)}/kg</span>
                    )}
                  </div>
                  {!p.standardKgService ? (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400">
                      No active laundry rate. Activate the standard service in <strong>Pricing</strong> first.
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2 items-center">
                        <input type="number" min="0" step="0.5" value={p.newOrderItems[0]?.quantity ?? ''} onChange={e => { const u = [...p.newOrderItems]; u[0] = { ...(u[0] || { service_id: p.standardKgService.id, notes: '' }), quantity: e.target.value }; p.setNewOrderItems(u) }} className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white border border-line text-navy focus:outline-none focus:border-brand-light" placeholder="e.g. 5" />
                        <span className="text-[11px] font-semibold text-ink-secondary shrink-0">kg</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-ink-secondary">
                        <span>{kgQty} kg × ₱{kgPrice.toFixed(2)} per kilogram</span>
                        <span className="font-bold text-navy">₱{(kgLine?.subtotal || 0).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Per-piece special items */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-navy">Special Items <span className="font-normal text-ink-secondary">(optional, per piece)</span></label>
                    {p.specialServices.length > 0 && (
                      <button type="button" onClick={() => p.setNewOrderItems([...p.newOrderItems, { service_id: p.specialServices[0]?.id || '', quantity: 1, notes: '' }])} className="text-[11px] font-bold text-navy hover:text-navy-hover flex items-center gap-1">
                        <Plus className="w-3 h-3" />Add Special Item
                      </button>
                    )}
                  </div>
                  {p.specialServices.length === 0 ? (
                    <p className="text-[11px] text-ink-secondary">No per-piece extras available — manage them in Pricing.</p>
                  ) : (
                    p.newOrderItems.slice(1).map((item, sIdx) => {
                      const idx = sIdx + 1
                      const line = p.newOrderTotals.lines[idx]
                      return (
                        <div key={idx} className="p-2.5 rounded-xl bg-brand-tint border border-line space-y-2">
                          <div className="flex gap-2 items-center">
                            <select value={item.service_id} onChange={e => { const u = [...p.newOrderItems]; u[idx].service_id = e.target.value; p.setNewOrderItems(u) }} className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white border border-line text-navy focus:outline-none focus:border-brand-light">
                              {p.specialServices.map(s => <option key={s.id} value={s.id}>{s.name} — ₱{Number(s.price).toFixed(2)}/{s.unit}</option>)}
                            </select>
                            <div className="flex items-center gap-1 shrink-0">
                              <input type="number" min="1" step="1" value={item.quantity} onChange={e => { const u = [...p.newOrderItems]; u[idx].quantity = e.target.value; p.setNewOrderItems(u) }} className="w-20 px-3 py-2 rounded-xl bg-white border border-line text-navy focus:outline-none focus:border-brand-light" placeholder="Qty" />
                              <span className="text-[11px] font-semibold text-ink-secondary w-6">{line?.service?.unit || 'pcs'}</span>
                            </div>
                            <button type="button" onClick={() => p.setNewOrderItems(p.newOrderItems.filter((_, i) => i !== idx))} className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition shrink-0" title="Remove special item">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-ink-secondary">
                            <span>{line?.service ? `${line.qty} ${line.service.unit} × ₱${Number(line.price).toFixed(2)}` : 'Select a special item'}</span>
                            <span className="font-bold text-navy">₱{(line?.subtotal || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">Additional Charges (₱)</label>
                  <input type="number" min="0" step="0.01" value={p.newOrderCharges} onChange={e => p.setNewOrderCharges(e.target.value)} placeholder="0.00" className="w-full px-3 py-2 rounded-xl bg-brand-tint border border-line text-navy focus:outline-none focus:border-brand-light" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">Discount (₱)</label>
                  <input type="number" min="0" step="0.01" value={p.newOrderDiscount} onChange={e => p.setNewOrderDiscount(e.target.value)} placeholder="0.00" className="w-full px-3 py-2 rounded-xl bg-brand-tint border border-line text-navy focus:outline-none focus:border-brand-light" />
                </div>
              </div>

              {/* Live total */}
              <div className="p-3 rounded-xl bg-white border border-line space-y-1.5 text-xs">
                <div className="flex justify-between text-ink-secondary"><span>Laundry subtotal</span><span className="font-semibold text-navy">₱{p.newOrderTotals.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-ink-secondary"><span>Additional charges</span><span className="font-semibold text-navy">₱{p.newOrderTotals.charges.toFixed(2)}</span></div>
                <div className="flex justify-between text-ink-secondary"><span>Discount</span><span className="font-semibold text-navy">-₱{p.newOrderTotals.discount.toFixed(2)}</span></div>
                <div className="flex justify-between items-center pt-1.5 border-t border-line">
                  <span className="text-xs font-black text-navy uppercase tracking-wider">Order Total</span>
                  <span className="text-lg font-black text-navy">{formatCurrency(p.newOrderTotals.total)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy mb-1">Care Instructions</label>
                <textarea rows="2" value={p.newOrderNotes} onChange={e => p.setNewOrderNotes(e.target.value)} placeholder="e.g. Separate white clothes, extra fabric conditioner..." className="w-full px-3 py-2 rounded-xl bg-brand-tint border border-line text-navy focus:outline-none focus:border-brand-light" />
              </div>
              <div className="pt-3 flex justify-end gap-3 border-t border-line">
                <button type="button" onClick={() => p.setIsNewOrderModalOpen(false)} className="px-4 py-2 rounded-xl bg-brand-tint hover:bg-brand-tintstrong text-navy font-semibold">Cancel</button>
                <button type="submit" disabled={!p.standardKgService} className="px-4 py-2 rounded-xl bg-navy hover:bg-navy-hover text-white font-bold shadow-card disabled:opacity-50">Submit Order • {formatCurrency(p.newOrderTotals.total)}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {p.isRecordPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-line rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="text-lg font-bold text-navy">Record Payment</h3>
              <button onClick={() => p.setIsRecordPaymentModalOpen(false)} className="text-ink-secondary hover:text-navy text-xl">✕</button>
            </div>
            <form onSubmit={p.handleRecordPayment} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-navy mb-1">Select Order</label>
                <select value={p.paymentOrderId} onChange={e => { const id = e.target.value; p.setPaymentOrderId(id); const o = p.orders.find(ord => ord.id === Number(id)); if (o) p.setPaymentAmount(String(o.remaining_balance || o.total_amount)) }} className="w-full px-3 py-2 rounded-xl bg-brand-tint border border-line text-navy focus:outline-none focus:border-brand-light" required>
                  <option value="">-- Choose Order --</option>
                  {p.orders.map(o => <option key={o.id} value={o.id}>{o.order_number} - {o.customer ? `${o.customer.first_name} ${o.customer.last_name}` : 'Guest'} (Bal: ₱{Number(o.remaining_balance || o.total_amount).toFixed(2)})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-navy mb-1">Payment Amount (₱)</label>
                <input type="number" step="0.01" value={p.paymentAmount} onChange={e => p.setPaymentAmount(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-brand-tint border border-line text-navy focus:outline-none focus:border-brand-light" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-navy mb-1">Payment Method</label>
                <select value={p.paymentMethod} onChange={e => p.setPaymentMethod(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-brand-tint border border-line text-navy focus:outline-none focus:border-brand-light">{PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.value}</option>)}</select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-navy mb-1">Reference / Notes</label>
                <input type="text" value={p.paymentNotes} onChange={e => p.setPaymentNotes(e.target.value)} placeholder="e.g. Maya / GCash Ref # 100293847" className="w-full px-3 py-2 rounded-xl bg-brand-tint border border-line text-navy focus:outline-none focus:border-brand-light" />
              </div>
              <div className="pt-3 flex justify-end gap-3 border-t border-line">
                <button type="button" onClick={() => p.setIsRecordPaymentModalOpen(false)} className="px-4 py-2 rounded-xl bg-brand-tint text-navy font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-navy hover:bg-navy-hover text-white font-bold shadow-card">Save Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {p.isAddCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-line rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="text-lg font-bold text-navy">Add New Customer</h3>
              <button onClick={() => p.setIsAddCustomerModalOpen(false)} className="text-ink-secondary hover:text-navy text-xl">✕</button>
            </div>
            <form onSubmit={p.handleAddCustomer} className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-xs font-semibold text-navy mb-1">First Name *</label><input type="text" value={p.newCustFirstName} onChange={e => p.setNewCustFirstName(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-brand-tint border border-line text-navy focus:outline-none focus:border-brand-light" required /></div>
                <div><label className="block text-xs font-semibold text-navy mb-1">Last Name *</label><input type="text" value={p.newCustLastName} onChange={e => p.setNewCustLastName(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-brand-tint border border-line text-navy focus:outline-none focus:border-brand-light" required /></div>
              </div>
              <div><label className="block text-xs font-semibold text-navy mb-1">Mobile Phone * (09XX-XXX-XXXX)</label><input type="text" value={p.newCustPhone} onChange={e => p.setNewCustPhone(e.target.value)} placeholder="0917-000-0000" className="w-full px-3 py-2 rounded-xl bg-brand-tint border border-line text-navy focus:outline-none focus:border-brand-light" required /></div>
              <div><label className="block text-xs font-semibold text-navy mb-1">Address</label><input type="text" value={p.newCustAddress} onChange={e => p.setNewCustAddress(e.target.value)} placeholder="Barangay, House No., Victoria, Laguna" className="w-full px-3 py-2 rounded-xl bg-brand-tint border border-line text-navy focus:outline-none focus:border-brand-light" /></div>
              <div className="pt-3 flex justify-end gap-3 border-t border-line">
                <button type="button" onClick={() => p.setIsAddCustomerModalOpen(false)} className="px-4 py-2 rounded-xl bg-brand-tint text-navy font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-navy hover:bg-navy-hover text-white font-bold">Save Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit / View Customer Modal */}
      {p.editingCustomer && (
        <div className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-line rounded-2xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h3 className="text-lg font-bold text-navy">Edit Customer</h3>
                <p className="text-xs text-ink-secondary">{p.editingCustomer.customer_code} • {p.editingCustomer.status === 'inactive' ? 'Archived' : 'Active'}</p>
              </div>
              <button onClick={() => p.setEditingCustomer(null)} className="text-ink-secondary hover:text-navy text-xl">✕</button>
            </div>
            <form onSubmit={p.handleUpdateCustomer} className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-xs font-semibold text-navy mb-1">First Name *</label><input type="text" value={p.editCustForm.first_name} onChange={e => p.setEditCustForm({ ...p.editCustForm, first_name: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-brand-tint border border-line text-navy focus:outline-none focus:border-brand-light" required /></div>
                <div><label className="block text-xs font-semibold text-navy mb-1">Last Name *</label><input type="text" value={p.editCustForm.last_name} onChange={e => p.setEditCustForm({ ...p.editCustForm, last_name: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-brand-tint border border-line text-navy focus:outline-none focus:border-brand-light" required /></div>
              </div>
              <div><label className="block text-xs font-semibold text-navy mb-1">Mobile Phone * (09XX-XXX-XXXX)</label><input type="text" value={p.editCustForm.phone} onChange={e => p.setEditCustForm({ ...p.editCustForm, phone: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-brand-tint border border-line text-navy focus:outline-none focus:border-brand-light" required /></div>
              <div><label className="block text-xs font-semibold text-navy mb-1">Email</label><input type="email" value={p.editCustForm.email} onChange={e => p.setEditCustForm({ ...p.editCustForm, email: e.target.value })} placeholder="customer@example.com" className="w-full px-3 py-2 rounded-xl bg-brand-tint border border-line text-navy focus:outline-none focus:border-brand-light" /></div>
              <div><label className="block text-xs font-semibold text-navy mb-1">Address</label><input type="text" value={p.editCustForm.address} onChange={e => p.setEditCustForm({ ...p.editCustForm, address: e.target.value })} placeholder="Barangay, House No., Victoria, Laguna" className="w-full px-3 py-2 rounded-xl bg-brand-tint border border-line text-navy focus:outline-none focus:border-brand-light" /></div>
              <div><label className="block text-xs font-semibold text-navy mb-1">Notes</label><textarea rows="2" value={p.editCustForm.notes} onChange={e => p.setEditCustForm({ ...p.editCustForm, notes: e.target.value })} placeholder="Preferences, special instructions..." className="w-full px-3 py-2 rounded-xl bg-brand-tint border border-line text-navy focus:outline-none focus:border-brand-light" /></div>
              <div className="pt-3 flex justify-end gap-3 border-t border-line">
                <button type="button" onClick={() => p.setEditingCustomer(null)} className="px-4 py-2 rounded-xl bg-brand-tint text-navy font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-navy hover:bg-navy-hover text-white font-bold">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Customer Confirmation */}
      <ConfirmDialog
        open={!!p.archivingCustomer}
        title="Archive customer profile"
        message={p.archivingCustomer ? `${p.archivingCustomer.first_name} ${p.archivingCustomer.last_name} will be moved to Archived. Their orders and history stay in the system, and you can restore them anytime.` : ''}
        confirmLabel="Archive Customer"
        danger
        onConfirm={p.handleArchiveCustomer}
        onCancel={() => p.setArchivingCustomer(null)}
      />

      {/* Order Details Modal */}
      {p.selectedOrderDetails && (
        <div className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-line rounded-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h3 className="text-lg font-bold text-navy flex items-center gap-2">
                  Order {p.selectedOrderDetails.order_number}
                  {p.renderStatusBadge(p.selectedOrderDetails.laundry_status)}
                </h3>
                <p className="text-xs text-ink-secondary">Placed on {new Date(p.selectedOrderDetails.order_date).toLocaleString()}</p>
              </div>
              <button onClick={() => p.setSelectedOrderDetails(null)} className="text-ink-secondary hover:text-navy text-xl">✕</button>
            </div>
            <div className="p-4 rounded-xl bg-brand-tint border border-line/50 space-y-1 text-xs">
              <span className="font-bold text-navy uppercase tracking-wider block mb-1">Customer Details</span>
              <p className="text-sm font-bold text-navy">{p.selectedOrderDetails.customer ? `${p.selectedOrderDetails.customer.first_name} ${p.selectedOrderDetails.customer.last_name}` : 'Guest'}</p>
              <p className="text-ink-secondary">📞 {p.selectedOrderDetails.customer?.phone}</p>
              <p className="text-ink-secondary">📍 {p.selectedOrderDetails.customer?.address || 'Victoria, Laguna'}</p>
              <p className="text-ink-secondary">Fulfillment: <strong className="text-navy">{p.selectedOrderDetails.fulfillment_type}</strong></p>
            </div>
            <div className="space-y-2">
              <span className="text-xs font-bold text-navy uppercase tracking-wider block">Services Breakdown</span>
              {p.orderItemsOf(p.selectedOrderDetails).map((it, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-brand-tint border border-line/40 flex justify-between items-center text-xs">
                  <div><div className="font-bold text-navy">{it.service?.name}</div><div className="text-ink-secondary">{it.quantity} {it.service?.unit} @ ₱{Number(it.unit_price).toFixed(2)}/{it.service?.unit}</div></div>
                  <div className="font-bold text-navy">₱{Number(it.subtotal).toFixed(2)}</div>
                </div>
              ))}
            </div>
            {p.selectedOrderDetails.notes && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300"><strong>Care Instructions:</strong> {p.selectedOrderDetails.notes}</div>
            )}
            <div className="pt-3 border-t border-line space-y-2 text-sm">
              {Number(p.selectedOrderDetails.additional_charges) > 0 && (
                <div className="flex justify-between text-xs text-ink-secondary"><span>Additional charges</span><span>₱{Number(p.selectedOrderDetails.additional_charges).toFixed(2)}</span></div>
              )}
              {Number(p.selectedOrderDetails.discount) > 0 && (
                <div className="flex justify-between text-xs text-ink-secondary"><span>Discount</span><span>-₱{Number(p.selectedOrderDetails.discount).toFixed(2)}</span></div>
              )}
              <div className="flex justify-between font-bold text-navy"><span>Total:</span><span>₱{Number(p.selectedOrderDetails.total_amount).toFixed(2)}</span></div>
              <div className="flex justify-between text-xs text-emerald-400 font-semibold"><span>Paid:</span><span>₱{Number(p.selectedOrderDetails.paid_amount || 0).toFixed(2)}</span></div>
              <div className="flex justify-between text-xs text-amber-400 font-semibold"><span>Balance:</span><span>₱{Number(p.selectedOrderDetails.remaining_balance || 0).toFixed(2)}</span></div>
            </div>
            <div className="pt-3 flex justify-end gap-3 border-t border-line">
              {p.selectedOrderDetails.payment_status !== 'Paid' && (
                <button onClick={() => { p.handleMarkAsPaid(p.selectedOrderDetails); p.setSelectedOrderDetails(null) }} className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-card">
                  <CheckCircle2 className="w-4 h-4" />Mark as Paid
                </button>
              )}
              <button onClick={() => p.setSelectedOrderDetails(null)} className="px-4 py-2 rounded-xl bg-brand-tint text-navy font-semibold text-xs">Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Root App Component (Router) ──────────────────────────────────────────────
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/*" element={<MainApp />} />
      </Route>
    </Routes>
  )
}
