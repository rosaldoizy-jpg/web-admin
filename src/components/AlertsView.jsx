import { useState, useEffect } from 'react'
import api from '../api/client'
import {
  Bell, AlertTriangle, ShieldAlert, Info, CheckCircle2, Clock, Droplets,
  WifiOff, RefreshCw, CheckCheck
} from 'lucide-react'

export default function AlertsView({ showToast }) {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [filterSeverity, setFilterSeverity] = useState('ALL')

  const fetchAlerts = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await api.get('/api/alerts')
      setAlerts(res.data?.data || [])
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Unable to load alerts. Check your connection and retry.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [])

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/api/alerts/${id}/read`)
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a))
      showToast('Alert marked as read')
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to mark alert as read', 'error')
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await api.post('/api/alerts/read-all')
      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })))
      showToast('All alerts marked as read')
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to mark alerts as read', 'error')
    }
  }

  const filteredAlerts = alerts.filter(a => {
    if (filterSeverity === 'ALL') return true
    return a.severity?.toUpperCase() === filterSeverity
  })

  const unreadCount = alerts.filter(a => !a.is_read).length

  const renderSeverityBadge = (severity) => {
    const s = severity?.toUpperCase()
    if (s === 'CRITICAL') {
      return (
        <span className="flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 animate-pulse">
          <ShieldAlert className="w-3 h-3" />
          CRITICAL
        </span>
      )
    }
    if (s === 'WARNING') {
      return (
        <span className="flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <AlertTriangle className="w-3 h-3" />
          WARNING
        </span>
      )
    }
    return (
      <span className="flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-brand-tintstrong text-navy border border-brand-light">
        <Info className="w-3 h-3" />
        INFO
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-line">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-6 h-6 text-navy" />
            <h2 className="text-xl font-bold text-navy">System Alerts & IoT Notifications</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs text-ink-secondary mt-1">
            Humidity threshold warnings, ESP32 telemetry disruptions, and low-inventory warnings.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Severity Filter */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-line">
            {['ALL', 'CRITICAL', 'WARNING', 'INFO'].map(sev => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  filterSeverity === sev
                    ? 'bg-navy text-white shadow-sm shadow-card'
                    : 'text-ink-secondary hover:text-navy'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          <button
            onClick={fetchAlerts}
            disabled={loading}
            className="p-2.5 rounded-xl bg-brand-tint hover:bg-brand-tintstrong border border-line text-navy transition"
            title="Refresh Alerts"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-navy' : ''}`} />
          </button>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-brand-tint hover:bg-brand-tintstrong border border-line text-xs font-semibold text-navy transition"
            >
              <CheckCheck className="w-4 h-4 text-navy" />
              <span>Mark All as Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {loading && alerts.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-2xl bg-white border border-line animate-pulse" />
            ))}
            <p className="text-center text-xs text-ink-secondary">Loading alerts…</p>
          </div>
        ) : loadError && alerts.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-line text-center space-y-3">
            <p className="text-sm font-bold text-navy">Unable to load alerts</p>
            <p className="text-xs text-ink-secondary">{loadError}</p>
            <button
              onClick={fetchAlerts}
              className="px-4 py-2 rounded-xl bg-navy hover:bg-navy-hover text-white text-xs font-bold transition"
            >
              Retry
            </button>
          </div>
        ) : (
        <>
        {filteredAlerts.map(alert => (
          <div
            key={alert.id}
            className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              !alert.is_read
                ? 'bg-white border-line shadow-card'
                : 'bg-brand-tint border-line opacity-80'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div className={`p-2.5 rounded-xl mt-0.5 ${
                alert.severity?.toUpperCase() === 'CRITICAL'
                  ? 'bg-rose-500/10 text-rose-400'
                  : alert.severity?.toUpperCase() === 'WARNING'
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'bg-brand-tintstrong text-navy'
              }`}>
                {alert.severity?.toUpperCase() === 'CRITICAL' ? (
                  <ShieldAlert className="w-5 h-5" />
                ) : alert.severity?.toUpperCase() === 'WARNING' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Info className="w-5 h-5" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h4 className={`text-sm font-bold ${!alert.is_read ? 'text-navy' : 'text-ink-secondary'}`}>
                    {alert.title}
                  </h4>
                  {renderSeverityBadge(alert.severity)}
                  {!alert.is_read && (
                    <span className="w-2 h-2 rounded-full bg-brand-light"></span>
                  )}
                </div>

                <p className="text-xs text-navy mt-1">
                  {alert.message}
                </p>

                <div className="flex items-center gap-4 text-[11px] text-ink-secondary mt-2 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {alert.created_at ? new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                  </span>
                  {alert.device_id && (
                    <span className="font-mono text-navy">
                      Sensor: {alert.device_id}
                    </span>
                  )}
                  {alert.order_id && (
                    <span className="text-amber-400">
                      Order: #{alert.order_id}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              {!alert.is_read && (
                <button
                  onClick={() => handleMarkAsRead(alert.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-tint hover:bg-brand-tintstrong text-navy hover:text-navy text-xs font-semibold border border-line transition"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-navy" />
                  <span>Mark Read</span>
                </button>
              )}
            </div>
          </div>
        ))}

        {filteredAlerts.length === 0 && !loading && !loadError && (
          <div className="bg-white p-12 rounded-2xl border border-line text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h4 className="text-base font-bold text-navy">No active alerts found</h4>
            <p className="text-xs text-ink-secondary">
              All humidity sensors, inventory thresholds, and operational stages are running normally.
            </p>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  )
}
