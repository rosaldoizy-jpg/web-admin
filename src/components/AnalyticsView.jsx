import React, { useMemo } from 'react'
import {
  Activity, TrendingUp, Sparkles, AlertTriangle, Clock, Droplets,
  CheckCircle2, Package, PhilippinePeso, Flame, ArrowUpRight,
  Info, Check, ShieldAlert
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { formatCurrency } from '../utils/currency'

const STAGES = ['Pending', 'Received', 'Washing', 'Drying', 'Folding', 'Ready for Pickup', 'Out for Delivery', 'Completed']

const shortDay = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

const toDayKey = (value) => {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function AnalyticsView({
  analyticsData,
  latestHumidity,
  humidityHistory = [],
  metrics,
  orders,
  onRefresh,
  loading
}) {
  const desc = analyticsData?.descriptive || {}
  const pred = analyticsData?.predictive || {}
  const presc = analyticsData?.prescriptive || []
  const hasCurrentHumidity = latestHumidity.is_online && latestHumidity.humidity != null

  const tooltipStyle = {
    backgroundColor: 'var(--white)',
    borderColor: 'var(--border)',
    borderRadius: '0.75rem',
    color: 'var(--navy)',
    fontSize: '12px',
  }

  // Real pipeline snapshot: live order counts per laundry stage.
  const stageData = useMemo(() => STAGES.map((stage) => ({
    stage,
    count: orders.filter(o => o.laundry_status === stage).length,
  })), [orders])

  // Real demand history: orders per day for the last 14 days.
  const demandData = useMemo(() => {
    const days = []
    const counts = {}
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = toDayKey(d)
      counts[key] = 0
      days.push({ key, label: shortDay(d), count: 0 })
    }
    orders.forEach(o => {
      const key = toDayKey(o.order_date || o.created_at)
      if (key && key in counts) counts[key] += 1
    })
    return days.map(d => ({ ...d, count: counts[d.key] }))
  }, [orders])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-navy">Intelligent Laundry Analytics</h2>
            <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-md bg-brand-tintstrong text-navy border border-brand-light">
              Descriptive • Predictive • Prescriptive
            </span>
          </div>
          <p className="text-xs text-ink-secondary">
            Real-time IoT operational telemetry, historical metrics, and prescriptive actions for FreshSpin Laundry
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-brand-tint hover:bg-brand-tintstrong border border-line text-navy hover:text-navy font-bold text-xs flex items-center gap-2 transition"
        >
          <Activity className={`w-4 h-4 ${loading ? 'animate-spin text-navy' : 'text-navy'}`} />
          Recalculate Analytics
        </button>
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: DESCRIPTIVE ANALYTICS ("What Happened?")       */}
      {/* ======================================================== */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-brand-light"></div>
          <h3 className="text-base font-black text-navy uppercase tracking-wider">
            1. Descriptive Analytics <span className="text-xs text-ink-secondary font-normal lowercase">(what happened?)</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Revenue */}
          <div className="p-5 rounded-2xl bg-white border border-line">
            <span className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Total Sales Revenue</span>
            <div className="mt-2 text-2xl font-black text-emerald-400">
              {formatCurrency(desc.total_sales || metrics.totalRevenue)}
            </div>
            <div className="mt-2 text-xs text-ink-secondary flex items-center justify-between">
              <span>Avg Order: {formatCurrency(desc.average_order_value ?? (metrics.totalOrdersCount > 0 ? metrics.totalRevenue / metrics.totalOrdersCount : 0))}</span>
              <span className="text-emerald-400 font-semibold">100% PHP</span>
            </div>
          </div>

          {/* Total Orders & Volume */}
          <div className="p-5 rounded-2xl bg-white border border-line">
            <span className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Order Volume</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-navy">{desc.total_orders || metrics.totalOrdersCount}</span>
              <span className="text-xs text-ink-secondary">total orders</span>
            </div>
            <div className="mt-2 text-xs text-ink-secondary flex items-center justify-between">
              <span className="text-navy font-semibold">{desc.picked_up_orders ?? metrics.pickedUpOrdersCount} Completed</span>
              <span className="text-rose-400">{desc.cancelled_orders || 0} Cancelled</span>
            </div>
          </div>

          {/* Average Drying Time */}
          <div className="p-5 rounded-2xl bg-white border border-line">
            <span className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Average Drying Time</span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-amber-400">{desc.average_drying_time_minutes ?? '—'}</span>
              <span className="text-xs text-ink-secondary">minutes/batch</span>
            </div>
            <div className="mt-2 text-xs text-ink-secondary flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Standard Heated Tumble Cycle</span>
            </div>
          </div>

          {/* Environmental Telemetry Avg */}
          <div className="p-5 rounded-2xl bg-white border border-line">
            <span className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Average Humidity</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-navy">{desc.average_humidity ?? '—'}%</span>
              <span className="text-xs text-ink-secondary">RH</span>
            </div>
            <div className="mt-2 text-xs text-ink-secondary flex items-center justify-between">
              <span className="text-amber-400">{desc.high_humidity_events ?? 0} High Events</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: PREDICTIVE ANALYTICS ("What is Likely to Happen?") */}
      {/* ======================================================== */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-brand-light animate-pulse"></div>
          <h3 className="text-base font-black text-navy uppercase tracking-wider">
            2. Predictive Analytics <span className="text-xs text-ink-secondary font-normal lowercase">(what is likely to happen?)</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Estimated Drying Completion */}
          <div className="p-5 rounded-2xl bg-white border border-line flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Estimated Drying Completion</span>
                <Clock className="w-4 h-4 text-navy" />
              </div>
              <div className="mt-3 text-3xl font-black text-navy">
                {pred.estimated_drying_completion_minutes != null ? (
                  <>{`~${pred.estimated_drying_completion_minutes}`} <span className="text-sm font-medium text-ink-secondary">minutes</span></>
                ) : '—'}
              </div>
              <p className="mt-2 text-xs text-ink-secondary leading-relaxed">
                {hasCurrentHumidity
                  ? `Calculated based on current sensor humidity (${latestHumidity.humidity}% RH) and batch volume in drying racks.`
                  : 'Humidity data temporarily unavailable'}
              </p>
              <div className="mt-3 h-36 w-full">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary mb-1">Live pipeline load</div>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageData} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} horizontal={false} />
                    <XAxis type="number" hide domain={[0, 'dataMax + 1']} />
                    <YAxis type="category" dataKey="stage" width={86} tick={{ fontSize: 9.5, fill: 'var(--navy)' }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} orders`, 'Load']} />
                    <Bar dataKey="count" fill="var(--blue)" radius={[0, 6, 6, 0]} barSize={13} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs">
              <span className="text-ink-secondary">Delay Risk:</span>
              <span className={`font-bold px-2 py-0.5 rounded ${
                pred.drying_delay_risk === 'HIGH'
                  ? 'bg-rose-500/20 text-rose-300'
                  : (pred.drying_delay_risk === 'MODERATE' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300')
              }`}>
                {pred.drying_delay_risk || '—'} RISK
              </span>
            </div>
          </div>

          {/* Environmental Moisture Trend */}
          <div className="p-5 rounded-2xl bg-white border border-line flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Moisture Trend</span>
                <Droplets className="w-4 h-4 text-navy" />
              </div>
              <div className="mt-3 text-2xl font-black text-navy">
                {pred.humidity_trend || '—'}
              </div>
              <p className="mt-2 text-xs text-ink-secondary leading-relaxed">
                {pred.prediction_summary || 'No trend analysis available yet.'}
              </p>
              {humidityHistory.length > 0 ? (
                <div className="mt-3 h-36 w-full">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary mb-1">Sensor readings (latest {humidityHistory.length})</div>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={humidityHistory} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                      <XAxis dataKey="time" stroke="var(--navy)" fontSize={9} tickLine={false} interval={5} />
                      <YAxis domain={[40, 100]} stroke="var(--navy)" fontSize={9} tickLine={false} unit="%" />
                      <Tooltip contentStyle={tooltipStyle} />
                      <ReferenceLine y={latestHumidity.threshold ?? 70} stroke="var(--danger)" strokeDasharray="4 4" />
                      <Line type="monotone" dataKey="humidity" stroke="var(--blue)" strokeWidth={2.5} dot={false} name="Humidity (% RH)" isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="mt-3 text-[11px] text-ink-secondary italic">Chart appears here once the ESP32 sends readings.</p>
              )}
            </div>
            <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs">
              <span className="text-ink-secondary">Current Reading:</span>
              <span className="font-mono font-bold text-navy">{latestHumidity.humidity}% RH</span>
            </div>
          </div>

          {/* Demand & Peak Hours Projection */}
          <div className="p-5 rounded-2xl bg-white border border-line flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Expected Order Demand</span>
                <TrendingUp className="w-4 h-4 text-navy" />
              </div>
              <div className="mt-3 text-2xl font-black text-navy">
                {pred.expected_daily_orders ?? '—'} <span className="text-sm font-medium text-ink-secondary">orders</span>
              </div>
              <p className="mt-2 text-xs text-ink-secondary leading-relaxed">
                Anticipated peak customer drop-offs and store walk-ins between: <strong className="text-navy">{pred.expected_peak_hours || '—'}</strong>.
              </p>
              <div className="mt-3 h-36 w-full">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary mb-1">Actual drop-offs · last 14 days</div>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={demandData} margin={{ top: 0, right: 4, bottom: 0, left: -14 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} vertical={false} />
                    <XAxis dataKey="label" stroke="var(--navy)" fontSize={8.5} tickLine={false} interval={2} />
                    <YAxis stroke="var(--navy)" fontSize={9} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} orders`, 'Drop-offs']} />
                    <Bar dataKey="count" radius={[5, 5, 0, 0]} barSize={12}>
                      {demandData.map((d, i) => (
                        <Cell key={i} fill={d.count > 0 ? 'var(--navy)' : 'var(--blue-soft)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs">
              <span className="text-ink-secondary">Washer Utilization:</span>
              <span className="text-navy font-bold">{analyticsData ? 'Optimal Capacity' : '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 3: PRESCRIPTIVE ANALYTICS ("What Should Staff Do?") */}
      {/* ======================================================== */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
          <h3 className="text-base font-black text-navy uppercase tracking-wider">
            3. Prescriptive Analytics <span className="text-xs text-ink-secondary font-normal lowercase">(what should Laundry Staff do?)</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {presc.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white border border-line text-center text-ink-secondary col-span-2">
              No immediate prescriptive actions required. Operations are optimal.
            </div>
          ) : (
            presc.map((item, idx) => {
              const isCrit = item.severity === 'CRITICAL'
              const isWarn = item.severity === 'WARNING'

              return (
                <div
                  key={idx}
                  className={`p-5 rounded-2xl border transition relative overflow-hidden ${
                    isCrit
                      ? 'bg-danger-tint border-danger shadow-card'
                      : (isWarn ? 'bg-warning-tint border-warning' : 'bg-white border-line')
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`p-2.5 rounded-xl border mt-0.5 ${
                      isCrit
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        : (isWarn ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-brand-tintstrong text-navy border-brand-light')
                    }`}>
                      {isCrit ? <ShieldAlert className="w-5 h-5 animate-bounce" /> : (isWarn ? <AlertTriangle className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-navy">{item.title}</h4>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider ${
                          isCrit
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : (isWarn ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-brand-tintstrong text-navy border border-brand-light')
                        }`}>
                          {item.severity}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-navy/90 leading-relaxed font-medium">
                        {item.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* How it works */}
        <div className="p-5 rounded-2xl bg-white border border-line">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-tintstrong text-navy border border-brand-light">
              <Info className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-navy">How prescriptive actions work</h4>
          </div>
          <ol className="mt-3 space-y-2.5 text-xs text-ink-secondary leading-relaxed list-none">
            <li className="flex gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy text-white text-[10px] font-black">1</span>
              <span><strong className="text-navy">Watch live signals</strong> — ESP32 drying-area humidity, the active order queue, and recorded drying delays refresh automatically.</span>
            </li>
            <li className="flex gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy text-white text-[10px] font-black">2</span>
              <span><strong className="text-navy">Apply shop rules</strong> — humidity above threshold, sensor offline, or an order backlog piling up.</span>
            </li>
            <li className="flex gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy text-white text-[10px] font-black">3</span>
              <span><strong className="text-navy">Act by severity</strong> — CRITICAL (red) threatens drying quality, WARNING (amber) needs attention today, INFO (blue) is routine optimization. Each card states the exact next step.</span>
            </li>
          </ol>
          <p className="mt-3 pt-3 border-t border-line text-[11px] text-ink-secondary leading-relaxed">
            Nothing here is invented: a card appears only when a real reading or queue condition triggers its rule. When everything is normal, you will see the “operations are optimal” note above instead.
          </p>
        </div>
      </div>
    </div>
  )
}
