// Reusable shared UI components for FreshSpin Web Admin
import { Loader2 } from 'lucide-react'
import { laundryStatusLabel } from '../../utils/orderStatus'

// ─── Spinner ────────────────────────────────────────────────────────────────
export function Spinner({ className = 'w-5 h-5' }) {
  return <Loader2 className={`animate-spin text-navy ${className}`} />
}

// ─── StatCard ────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, icon: Icon, color = 'cyan', onClick }) {
  const colorMap = {
    cyan: { bg: 'bg-brand-tintstrong', border: 'border-brand-light', text: 'text-navy', glow: 'bg-brand-light/20' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', glow: 'bg-emerald-500/5' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', glow: 'bg-amber-500/5' },
    rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', glow: 'bg-rose-500/5' },
    violet: { bg: 'bg-brand-tintstrong', border: 'border-brand-light', text: 'text-navy', glow: 'bg-brand-light/20' },
  }
  const c = colorMap[color] || colorMap.cyan
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden p-5 rounded-2xl bg-white border border-line shadow-card hover:bg-brand-tint transition group ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">{label}</span>
        {Icon && (
          <div className={`p-3 rounded-2xl ${c.bg} ${c.text} border ${c.border} shadow-card`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
      <div className="mt-3 text-3xl font-black text-navy">{value}</div>
      {sub && <div className="mt-1 text-xs text-ink-secondary">{sub}</div>}
      <div className={`absolute top-0 right-0 w-24 h-24 ${c.glow} rounded-full blur-2xl group-hover:opacity-150 transition`} />
      <svg aria-hidden="true" viewBox="0 0 200 24" preserveAspectRatio="none" className="absolute bottom-0 left-0 h-5 w-full"><path d="M0,14 C40,4 80,22 120,12 C150,5 175,16 200,10 L200,24 L0,24 Z" fill="var(--blue-soft)" opacity="0.7" /></svg>
    </div>
  )
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────
const STATUS_BADGE_MAP = {
  // Order statuses
  Pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  Received: 'bg-brand-tint text-navy border-brand-light',
  Washing: 'bg-brand-tintstrong text-navy border-brand-light animate-pulse',
  Drying: 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse',
  Folding: 'bg-brand-tintstrong text-navy border-brand-light',
  'Ready for Pickup': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  'Out for Delivery': 'bg-brand-tintstrong text-navy border-brand-light animate-pulse',
  Completed: 'bg-green-500/10 text-green-400 border-green-500/30',
  Cancelled: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  Pending: 'bg-brand-tint text-navy border-line',
  // Payment statuses
  Paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  Partial: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  Unpaid: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  // Humidity
  NORMAL: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  WARNING: 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse',
}

export function StatusBadge({ status }) {
  const cls = STATUS_BADGE_MAP[status] || 'bg-brand-tint text-navy border-line'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full border ${cls}`}>
      {laundryStatusLabel(status)}
    </span>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-brand-tintstrong border border-brand-light flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-navy" />
        </div>
      )}
      <h3 className="text-base font-bold text-navy mb-1">{title}</h3>
      {message && <p className="text-sm text-ink-secondary max-w-xs">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ─── ConfirmDialog ────────────────────────────────────────────────────────────
export function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmLabel = 'Confirm', danger = false, busy = false, confirmDisabled = false }) {
  if (!open) return null
  const disabled = busy || confirmDisabled
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white border border-line rounded-[22px] p-6 shadow-pop">
        <h3 className="text-base font-bold text-navy mb-2">{title}</h3>
        <p className="text-sm text-ink-secondary mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-brand-tint hover:bg-brand-tintstrong text-navy transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={disabled}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition disabled:opacity-50 flex items-center gap-2 ${
              danger
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-navy hover:bg-navy-hover text-white'
            }`}
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {busy ? 'Preparing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/40 backdrop-blur-sm">
      <div className={`w-full ${maxWidth} bg-white border border-line rounded-[22px] shadow-pop flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between p-5 border-b border-line">
          <h3 className="text-base font-bold text-navy">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-brand-tint text-navy transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}

// ─── PageHeader ───────────────────────────────────────────────────────────────
export function PageHeader({ title, description, actions, breadcrumbs }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
      <div>
        {breadcrumbs && (
          <nav className="flex items-center gap-1.5 text-xs text-ink-secondary mb-1">
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-line">/</span>}
                <span className={i === breadcrumbs.length - 1 ? 'text-navy font-medium' : 'hover:text-navy cursor-pointer'}>
                  {b}
                </span>
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-[28px] font-black text-navy">{title}</h1>
        {description && <p className="text-xs text-ink-secondary mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────
export function Toast({ notification }) {
  if (!notification) return null
  const isError = notification.type === 'error'
  return (
    <div className={`fixed top-4 right-4 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-pop backdrop-blur-md border max-w-sm text-sm font-medium animate-in slide-in-from-top-2 ${
      isError
        ? 'bg-danger-bg text-danger border-danger'
        : 'bg-white text-navy border-line'
    }`}>
      {isError ? (
        <svg className="w-4 h-4 text-danger shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-navy shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
      {notification.message}
    </div>
  )
}
