import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import api from '../api/client'
import {
  FileText, Printer, Download, RefreshCw, Eye, Calendar, X,
  Package, CheckCircle2, Clock, XCircle, PhilippinePeso, TrendingUp
} from 'lucide-react'
import { formatCurrency } from '../utils/currency'
import { laundryStatusLabel } from '../utils/orderStatus'
import { ConfirmDialog } from './shared'

const toLocalDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const PERIODS = [
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'custom', label: 'Custom Range' },
]

const prettyPeriod = (period) => ({
  today: 'Today',
  this_week: 'This Week',
  this_month: 'This Month',
  custom: 'Custom Date Range',
}[period] || period)

// Plain-ASCII peso formatting: jsPDF's built-in fonts have no ₱ glyph.
const php = (n) =>
  `PHP ${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Renders the live report data into a jsPDF document (A4, auto-paginated).
function renderReportPdf(doc, autoTable, { summary, daily, serviceSales, orderRows, serviceTotal, meta }) {
  const NAVY = [22, 78, 99]
  const INK = [60, 60, 60]
  const M = 14
  const PAGE_W = 210
  let y = 16

  doc.setTextColor(...NAVY)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.text('FreshSpin Laundry', M, y)
  doc.setFontSize(10)
  doc.setTextColor(110)
  doc.text('BUSINESS REPORT', M, y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...INK)
  const right = [
    `Report type: ${meta.period}`,
    `Coverage: ${meta.range}`,
    `Generated: ${meta.generatedAt}`,
    'Currency: PHP',
  ]
  right.forEach((line, i) => doc.text(line, PAGE_W - M, y + i * 4.5, { align: 'right' }))
  y += 18

  const baseTable = {
    margin: { left: M, right: M },
    styles: { font: 'helvetica', fontSize: 8.5, textColor: INK, cellPadding: 2 },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
    alternateRowStyles: { fillColor: [234, 248, 254] },
    didDrawPage: (d) => {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(140)
      doc.text('Prepared by FreshSpin Laundry Management System', M, 289)
      doc.text(`Page ${d.pageNumber}`, PAGE_W - M, 289, { align: 'right' })
    },
  }

  const section = (title, table) => {
    if (y > 258) {
      doc.addPage()
      y = 16
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...NAVY)
    doc.text(title.toUpperCase(), M, y)
    autoTable(doc, { ...baseTable, ...table, startY: y + 3 })
    y = doc.lastAutoTable.finalY + 10
  }

  const labelCells = {
    didParseCell: (d) => {
      if (d.section === 'body' && d.column.index % 2 === 0) {
        d.cell.styles.fontStyle = 'bold'
      }
    },
  }

  section('Summary', {
    ...labelCells,
    body: [
      ['Total Orders', summary?.total_orders ?? 0, 'Completed Orders', summary?.completed_orders ?? 0, 'Pending Orders', summary?.pending_orders ?? 0],
      ['Cancelled Orders', summary?.cancelled_orders ?? 0, 'Paid Orders', summary?.paid_orders ?? 0, 'Unpaid Orders', summary?.unpaid_orders ?? 0],
      ['Total Sales', php(summary?.total_sales), 'Total Revenue (Paid)', php(summary?.total_revenue), 'Outstanding', php(summary?.remaining_balance)],
      ['Avg. Order Value', php(summary?.average_order_value), `Service Sales (${serviceSales.length} services)`, php(serviceTotal), '', ''],
    ],
  })

  section('Daily Sales Log', {
    head: [['Date', 'Orders', 'Sales', 'Paid', 'Balance']],
    body: daily.length === 0
      ? [[{ content: 'No sales records for this period.', colSpan: 5, styles: { halign: 'center' } }]]
      : daily.map((row) => [
        row.date,
        row.number_of_orders,
        php(row.total_sales),
        php(row.amount_paid),
        php(row.remaining_balance),
      ]),
  })

  section('Service Sales', {
    head: [['Service', 'Quantity', 'Orders', 'Revenue', 'Share']],
    body: serviceSales.length === 0
      ? [[{ content: 'No service sales for this period.', colSpan: 5, styles: { halign: 'center' } }]]
      : serviceSales.map((srv) => [
        srv.name,
        `${Number(srv.total_quantity || 0).toLocaleString()} ${srv.unit || ''}`.trim(),
        srv.total_orders,
        php(srv.total_revenue),
        `${serviceTotal > 0 ? Math.round((Number(srv.total_revenue) / serviceTotal) * 100) : 0}%`,
      ]),
  })

  section('Orders & Customers', {
    styles: { ...baseTable.styles, fontSize: 8 },
    head: [['Order #', 'Customer', 'Services', 'Status', 'Payment', 'Total', 'Date']],
    body: orderRows.length === 0
      ? [[{ content: 'No orders for this period.', colSpan: 7, styles: { halign: 'center' } }]]
      : orderRows.map((o) => [
        o.order_number,
        o.customer,
        o.services,
        laundryStatusLabel(o.laundry_status),
        o.payment_status,
        php(o.total),
        o.date,
      ]),
  })
}

export default function ReportsView({ showToast }) {
  const today = toLocalDate()
  const [period, setPeriod] = useState('this_month')
  const [startDate, setStartDate] = useState(`${today.slice(0, 8)}01`)
  const [endDate, setEndDate] = useState(today)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [summary, setSummary] = useState(null)
  const [daily, setDaily] = useState([])
  const [serviceSales, setServiceSales] = useState([])
  const [orderRows, setOrderRows] = useState([])
  const [previewOpen, setPreviewOpen] = useState(false)
  const [pdfModalOpen, setPdfModalOpen] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  // Synchronous re-entry guard: React state updates async, so two clicks in
  // the same tick would both pass a state-only check and download twice.
  const pdfBusyRef = useRef(false)

  const rangeInvalid = period === 'custom' && startDate > endDate

  const query = period === 'custom'
    ? `period=custom&start_date=${startDate}&end_date=${endDate}`
    : `period=${period}`

  const fetchReports = async () => {
    if (rangeInvalid) {
      setLoadError('Start date must be on or before the end date.')
      return
    }
    setLoading(true)
    setLoadError(null)
    try {
      const [salesRes, ordersRes, servicesRes] = await Promise.all([
        api.get(`/api/reports/sales?${query}`),
        api.get(`/api/reports/orders?${query}`),
        api.get(`/api/reports/services?${query}`),
      ])
      if (salesRes?.data?.data) {
        setSummary(salesRes.data.data.summary || null)
        setDaily(salesRes.data.data.daily_records || [])
      }
      setOrderRows(Array.isArray(ordersRes?.data?.data) ? ordersRes.data.data : [])
      setServiceSales(Array.isArray(servicesRes?.data?.data) ? servicesRes.data.data : [])
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Unable to load reports. Check your connection and retry.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, startDate, endDate])

  const reportMeta = useMemo(() => ({
    range: summary?.start_date && summary?.end_date
      ? `${summary.start_date} to ${summary.end_date}`
      : `${startDate} to ${endDate}`,
    generatedAt: summary?.report_generated_at || new Date().toLocaleString(),
    period: prettyPeriod(period),
  }), [summary, period, startDate, endDate])

  const handlePrint = () => window.print()

  const openPdfConfirm = () => setPdfModalOpen(true)

  // Real file download (never window.print): builds the PDF from the live
  // report data and saves it. Guarded against double-clicks via a ref.
  const handleDownloadPdf = async () => {
    if (pdfBusyRef.current || !summary) return
    pdfBusyRef.current = true
    setPdfBusy(true)
    try {
      const jspdfMod = await import('jspdf')
      const JsPDF = jspdfMod.jsPDF || jspdfMod.default
      const atMod = await import('jspdf-autotable')
      const autoTable = atMod.default || atMod
      if (typeof JsPDF !== 'function' || typeof autoTable !== 'function') {
        throw new Error('PDF library failed to load.')
      }
      const doc = new JsPDF({ unit: 'mm', format: 'a4' })
      renderReportPdf(doc, autoTable, {
        summary,
        daily,
        serviceSales,
        orderRows,
        serviceTotal,
        meta: reportMeta,
      })
      const stamp = (summary?.end_date || endDate || today).slice(0, 10)
      doc.save(`FreshSpin_Report_${stamp}.pdf`)
      setPdfModalOpen(false)
      showToast('Report downloaded as PDF.')
    } catch (err) {
      showToast(err?.message || 'Unable to generate the PDF. Please try again.', 'error')
    } finally {
      pdfBusyRef.current = false
      setPdfBusy(false)
    }
  }

  const kpis = [
    { label: 'Total Orders', value: summary?.total_orders ?? 0, icon: Package, color: 'bg-brand-tintstrong text-navy' },
    { label: 'Completed', value: summary?.completed_orders ?? 0, icon: CheckCircle2, color: 'bg-emerald-500/10 text-emerald-400' },
    { label: 'Pending', value: summary?.pending_orders ?? 0, icon: Clock, color: 'bg-amber-500/10 text-amber-400' },
    { label: 'Cancelled', value: summary?.cancelled_orders ?? 0, icon: XCircle, color: 'bg-rose-500/10 text-rose-400' },
    { label: 'Paid Orders', value: summary?.paid_orders ?? 0, icon: CheckCircle2, color: 'bg-emerald-500/10 text-emerald-400' },
    { label: 'Unpaid Orders', value: summary?.unpaid_orders ?? 0, icon: XCircle, color: 'bg-rose-500/10 text-rose-400' },
    { label: 'Total Revenue', value: formatCurrency(summary?.total_revenue ?? 0), icon: PhilippinePeso, color: 'bg-emerald-500/10 text-emerald-400' },
    { label: 'Outstanding Balance', value: formatCurrency(summary?.remaining_balance ?? 0), icon: TrendingUp, color: 'bg-amber-500/10 text-amber-400' },
  ]

  const serviceTotal = serviceSales.reduce((sum, s) => sum + Number(s.total_revenue || 0), 0)

  const reportDocument = (
    <div className="print-doc bg-white text-navy">
      {/* Document header */}
      <div className="flex items-start justify-between gap-6 border-b-2 border-navy pb-4 mb-5">
        <div>
          <div className="text-2xl font-black tracking-tight text-navy">FreshSpin Laundry</div>
          <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-ink-secondary">Business Report</div>
        </div>
        <div className="text-right text-[11px] text-ink-secondary space-y-0.5">
          <div><strong className="text-navy">Report type:</strong> {reportMeta.period}</div>
          <div><strong className="text-navy">Coverage:</strong> {reportMeta.range}</div>
          <div><strong className="text-navy">Generated:</strong> {reportMeta.generatedAt}</div>
          <div><strong className="text-navy">Currency:</strong> PHP (₱)</div>
        </div>
      </div>

      {/* Summary */}
      <section className="mb-6">
        <h2 className="text-sm font-black uppercase tracking-wider text-navy mb-2">Summary</h2>
        <table className="w-full text-xs border border-line">
          <tbody>
            <tr className="bg-brand-tint">
              <td className="p-2 border border-line font-semibold">Total Orders</td>
              <td className="p-2 border border-line">{summary?.total_orders ?? 0}</td>
              <td className="p-2 border border-line font-semibold">Completed Orders</td>
              <td className="p-2 border border-line">{summary?.completed_orders ?? 0}</td>
              <td className="p-2 border border-line font-semibold">Pending Orders</td>
              <td className="p-2 border border-line">{summary?.pending_orders ?? 0}</td>
            </tr>
            <tr>
              <td className="p-2 border border-line font-semibold">Cancelled Orders</td>
              <td className="p-2 border border-line">{summary?.cancelled_orders ?? 0}</td>
              <td className="p-2 border border-line font-semibold">Paid Orders</td>
              <td className="p-2 border border-line">{summary?.paid_orders ?? 0}</td>
              <td className="p-2 border border-line font-semibold">Unpaid Orders</td>
              <td className="p-2 border border-line">{summary?.unpaid_orders ?? 0}</td>
            </tr>
            <tr className="bg-brand-tint">
              <td className="p-2 border border-line font-semibold">Total Sales</td>
              <td className="p-2 border border-line">{formatCurrency(summary?.total_sales ?? 0)}</td>
              <td className="p-2 border border-line font-semibold">Total Revenue (Paid)</td>
              <td className="p-2 border border-line">{formatCurrency(summary?.total_revenue ?? 0)}</td>
              <td className="p-2 border border-line font-semibold">Outstanding</td>
              <td className="p-2 border border-line">{formatCurrency(summary?.remaining_balance ?? 0)}</td>
            </tr>
            <tr>
              <td className="p-2 border border-line font-semibold">Avg. Order Value</td>
              <td className="p-2 border border-line">{formatCurrency(summary?.average_order_value ?? 0)}</td>
              <td className="p-2 border border-line font-semibold" colSpan={2}>Service Sales ({serviceSales.length} services)</td>
              <td className="p-2 border border-line" colSpan={2}>{formatCurrency(serviceTotal)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Daily sales */}
      <section className="mb-6">
        <h2 className="text-sm font-black uppercase tracking-wider text-navy mb-2">Daily Sales Log</h2>
        <table className="w-full text-xs border border-line">
          <thead>
            <tr className="bg-navy text-white text-[10px] uppercase">
              <th className="p-2 text-left border border-navy">Date</th>
              <th className="p-2 text-right border border-navy">Orders</th>
              <th className="p-2 text-right border border-navy">Sales</th>
              <th className="p-2 text-right border border-navy">Paid</th>
              <th className="p-2 text-right border border-navy">Balance</th>
            </tr>
          </thead>
          <tbody>
            {daily.map((row, i) => (
              <tr key={i} className={i % 2 ? 'bg-brand-tint/60' : ''}>
                <td className="p-2 border border-line">{row.date}</td>
                <td className="p-2 border border-line text-right">{row.number_of_orders}</td>
                <td className="p-2 border border-line text-right">{formatCurrency(row.total_sales)}</td>
                <td className="p-2 border border-line text-right">{formatCurrency(row.amount_paid)}</td>
                <td className="p-2 border border-line text-right">{formatCurrency(row.remaining_balance)}</td>
              </tr>
            ))}
            {daily.length === 0 && (
              <tr><td colSpan={5} className="p-3 border border-line text-center text-ink-secondary">No sales records for this period.</td></tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Service sales */}
      <section className="mb-6">
        <h2 className="text-sm font-black uppercase tracking-wider text-navy mb-2">Service Sales</h2>
        <table className="w-full text-xs border border-line">
          <thead>
            <tr className="bg-navy text-white text-[10px] uppercase">
              <th className="p-2 text-left border border-navy">Service</th>
              <th className="p-2 text-right border border-navy">Quantity</th>
              <th className="p-2 text-right border border-navy">Orders</th>
              <th className="p-2 text-right border border-navy">Revenue</th>
              <th className="p-2 text-right border border-navy">Share</th>
            </tr>
          </thead>
          <tbody>
            {serviceSales.map((srv, i) => (
              <tr key={i} className={i % 2 ? 'bg-brand-tint/60' : ''}>
                <td className="p-2 border border-line">{srv.name}</td>
                <td className="p-2 border border-line text-right">{Number(srv.total_quantity || 0).toLocaleString()} {srv.unit}</td>
                <td className="p-2 border border-line text-right">{srv.total_orders}</td>
                <td className="p-2 border border-line text-right">{formatCurrency(srv.total_revenue)}</td>
                <td className="p-2 border border-line text-right">{serviceTotal > 0 ? Math.round((Number(srv.total_revenue) / serviceTotal) * 100) : 0}%</td>
              </tr>
            ))}
            {serviceSales.length === 0 && (
              <tr><td colSpan={5} className="p-3 border border-line text-center text-ink-secondary">No service sales for this period.</td></tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Orders with customer information */}
      <section>
        <h2 className="text-sm font-black uppercase tracking-wider text-navy mb-2">Orders &amp; Customers</h2>
        <table className="w-full text-xs border border-line">
          <thead>
            <tr className="bg-navy text-white text-[10px] uppercase">
              <th className="p-2 text-left border border-navy">Order #</th>
              <th className="p-2 text-left border border-navy">Customer</th>
              <th className="p-2 text-left border border-navy">Services</th>
              <th className="p-2 text-left border border-navy">Status</th>
              <th className="p-2 text-left border border-navy">Payment</th>
              <th className="p-2 text-right border border-navy">Total</th>
              <th className="p-2 text-left border border-navy">Date</th>
            </tr>
          </thead>
          <tbody>
            {orderRows.map((o, i) => (
              <tr key={o.id ?? i} className={i % 2 ? 'bg-brand-tint/60' : ''}>
                <td className="p-2 border border-line font-mono">{o.order_number}</td>
                <td className="p-2 border border-line">{o.customer}</td>
                <td className="p-2 border border-line">{o.services}</td>
                <td className="p-2 border border-line">{laundryStatusLabel(o.laundry_status)}</td>
                <td className="p-2 border border-line">{o.payment_status}</td>
                <td className="p-2 border border-line text-right">{formatCurrency(o.total)}</td>
                <td className="p-2 border border-line">{o.date}</td>
              </tr>
            ))}
            {orderRows.length === 0 && (
              <tr><td colSpan={7} className="p-3 border border-line text-center text-ink-secondary">No orders for this period.</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <div className="mt-6 pt-3 border-t border-line flex items-center justify-between text-[10px] text-ink-secondary">
        <span>Prepared by FreshSpin Laundry Management System</span>
        <span>Page 1 of 1 • {reportMeta.generatedAt}</span>
      </div>
    </div>
  )

  if (loading && !summary && !loadError) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 rounded-2xl bg-white border border-line animate-pulse" />
        ))}
        <p className="text-center text-xs text-ink-secondary">Loading reports…</p>
      </div>
    )
  }

  if (loadError && !summary) {
    return (
      <div className="p-12 rounded-2xl bg-white border border-line text-center space-y-3">
        <p className="text-sm font-bold text-navy">Unable to load reports</p>
        <p className="text-xs text-ink-secondary">{loadError}</p>
        <button onClick={fetchReports} className="px-4 py-2 rounded-xl bg-navy hover:bg-navy-hover text-white text-xs font-bold transition">Retry</button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-line print-hide">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-navy" />
            <h2 className="text-xl font-bold text-navy">Business Intelligence &amp; Financial Reports</h2>
          </div>
          <p className="text-xs text-ink-secondary mt-1">
            Sales, order volume, service revenue, and customer detail for the selected date range (₱ PHP).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-line">
            {PERIODS.map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition ${period === p.id ? 'bg-navy text-white shadow-sm' : 'text-ink-secondary hover:text-navy'}`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button onClick={fetchReports} disabled={loading} className="p-2.5 rounded-xl bg-brand-tint hover:bg-brand-tintstrong border border-line text-navy transition" title="Refresh Data">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-navy' : ''}`} />
          </button>

          <button onClick={() => setPreviewOpen(true)} disabled={!summary} className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-brand-tint hover:bg-brand-tintstrong border border-line text-xs font-semibold text-navy transition disabled:opacity-50">
            <Eye className="w-4 h-4" /><span>Preview</span>
          </button>

          <button onClick={handlePrint} disabled={!summary} className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-brand-tint hover:bg-brand-tintstrong border border-line text-xs font-semibold text-navy transition disabled:opacity-50">
            <Printer className="w-4 h-4" /><span>Print</span>
          </button>

          <button onClick={openPdfConfirm} disabled={!summary} className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-navy hover:bg-navy-hover text-white text-xs font-bold transition shadow-card disabled:opacity-50">
            <Download className="w-4 h-4" /><span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Custom date range */}
      {period === 'custom' && (
        <div className="bg-white p-4 rounded-2xl border border-line flex flex-wrap items-end gap-3 print-hide">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-navy" />
            <label className="text-xs font-semibold text-navy">Date range</label>
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-secondary mb-1">Start</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-2 rounded-xl bg-brand-tint border border-line text-sm text-navy focus:outline-none focus:border-brand-light" />
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-secondary mb-1">End</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-3 py-2 rounded-xl bg-brand-tint border border-line text-sm text-navy focus:outline-none focus:border-brand-light" />
          </div>
          <button onClick={fetchReports} disabled={loading || rangeInvalid} className="px-4 py-2 rounded-xl bg-navy hover:bg-navy-hover text-white text-xs font-bold transition disabled:opacity-50">Generate Report</button>
          {rangeInvalid && <span className="text-xs font-semibold text-rose-400">Start date must be on or before end date.</span>}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 print-hide">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon
          return (
            <div key={i} className="bg-white p-4 rounded-2xl border border-line">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-secondary leading-tight">{kpi.label}</span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${kpi.color}`}><Icon className="w-3.5 h-3.5" /></div>
              </div>
              <div className="mt-2 text-lg font-extrabold text-navy truncate">{kpi.value}</div>
            </div>
          )
        })}
      </div>

      {/* Coverage line */}
      <div className="flex items-center justify-between text-[11px] text-ink-secondary print-hide">
        <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Coverage: <strong className="text-navy">{reportMeta.range}</strong></span>
        <span>Generated: <strong className="text-navy">{reportMeta.generatedAt}</strong></span>
      </div>

      {/* Grid: Daily breakdown & service distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print-hide">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-line overflow-hidden flex flex-col">
          <div className="p-4 border-b border-line flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-navy">Sales &amp; Orders Log</h3>
              <p className="text-xs text-ink-secondary">Historical performance by day in the selected period</p>
            </div>
            <span className="text-xs font-semibold text-navy uppercase tracking-wider">{reportMeta.period}</span>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs text-navy">
              <thead className="bg-brand-tint uppercase text-[11px] font-bold text-ink-secondary border-b border-line">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Orders</th>
                  <th className="py-3 px-4 text-right">Sales</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {daily.map((row, idx) => (
                  <tr key={idx} className="hover:bg-brand-tint transition">
                    <td className="py-3 px-4 font-semibold text-navy">{row.date}</td>
                    <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-full bg-brand-tint text-navy border border-line">{row.number_of_orders} orders</span></td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400">{formatCurrency(row.total_sales)}</td>
                    <td className="py-3 px-4 text-right font-medium text-navy">{formatCurrency(row.amount_paid)}</td>
                    <td className="py-3 px-4 text-right font-medium text-amber-400">{formatCurrency(row.remaining_balance)}</td>
                  </tr>
                ))}
                {daily.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-ink-secondary">No sales records found for this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-line p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-navy">Revenue by Service</h3>
            <p className="text-xs text-ink-secondary mb-4">Top contributors to overall laundry revenue</p>
            <div className="space-y-4">
              {serviceSales.map((srv, idx) => {
                const share = serviceTotal > 0 ? Math.round((Number(srv.total_revenue) / serviceTotal) * 100) : 0
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-navy">{srv.name}</span>
                      <span className="font-bold text-emerald-400">{formatCurrency(srv.total_revenue)}</span>
                    </div>
                    <div className="w-full bg-brand-tint rounded-full h-2 overflow-hidden flex">
                      <div className="bg-gradient-to-r from-brand-light to-navy h-2 rounded-full transition-all duration-500" style={{ width: `${share}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-ink-secondary">
                      <span>{srv.total_orders} orders • {Number(srv.total_quantity).toLocaleString()} {srv.unit}</span>
                      <span>{share}%</span>
                    </div>
                  </div>
                )
              })}
              {serviceSales.length === 0 && <p className="text-xs text-ink-secondary">No service sales for this period.</p>}
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-line text-[11px] text-ink-secondary flex items-center justify-between">
            <span>Currency Code: <strong>PHP (₱)</strong></span>
            <span className="text-navy">FreshSpin Analytics Engine</span>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm flex items-center justify-center p-4 print-hide">
          <div className="bg-white border border-line rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-line flex items-center justify-between gap-3 bg-brand-tint">
              <div>
                <h3 className="text-sm font-black text-navy flex items-center gap-2"><Eye className="w-4 h-4" />Report Preview</h3>
                <p className="text-[11px] text-ink-secondary">{reportMeta.period} • {reportMeta.range} • {reportMeta.generatedAt}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-line text-xs font-semibold text-navy hover:bg-brand-tint transition">
                  <Printer className="w-4 h-4" />Print
                </button>
                <button onClick={openPdfConfirm} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy hover:bg-navy-hover text-white text-xs font-bold transition">
                  <Download className="w-4 h-4" />Export PDF
                </button>
                <button onClick={() => setPreviewOpen(false)} className="p-1.5 rounded-xl text-ink-secondary hover:text-navy hover:bg-brand-tint transition"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="overflow-y-auto p-6 bg-brand-tint/50">
              <div className="bg-white p-6 rounded-xl border border-line shadow-card">{reportDocument}</div>
              <p className="mt-3 text-[11px] text-ink-secondary text-center">
                Use Print for paper copies, or Export PDF to download this report as a file.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Export PDF confirmation — real file download, never the print dialog */}
      <ConfirmDialog
        open={pdfModalOpen}
        title="Export PDF"
        message="Do you want to download this report as a PDF?"
        confirmLabel="Download PDF"
        busy={pdfBusy}
        onCancel={() => { if (!pdfBusy) setPdfModalOpen(false) }}
        onConfirm={handleDownloadPdf}
      />

      {/* Print/PDF document — hidden on screen, printed via @media print */}
      {createPortal(reportDocument, document.body)}
    </div>
  )
}
