import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function FullScreenSpinner() {
  return (
    <div className="min-h-screen bg-brand-tint flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 rounded-full border-4 border-line border-t-navy animate-spin" />
      <p className="text-ink-secondary text-sm font-medium">Verifying session…</p>
    </div>
  )
}

function AccessDenied({ onLogout }) {
  return (
    <div className="min-h-screen bg-brand-tint flex flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
        <svg className="w-8 h-8 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </div>
      <div>
        <h2 className="text-xl font-bold text-navy mb-2">Access Denied</h2>
        <p className="text-ink-secondary text-sm max-w-sm">
          This portal is for Admin accounts only. Please use the <strong className="text-navy">Staff Mobile App</strong> to continue.
        </p>
      </div>
      <button
        onClick={onLogout}
        className="px-6 py-2.5 rounded-xl bg-white hover:bg-brand-tint text-navy text-sm font-semibold transition border border-brand-light"
      >
        Back to Login
      </button>
    </div>
  )
}

export default function ProtectedRoute() {
  const { user, loading, logout } = useAuth()

  if (loading) return <FullScreenSpinner />

  if (!user) return <Navigate to="/login" replace />

  if (user.role !== 'admin') {
    const handleLogout = async () => {
      await logout()
      window.location.replace('/login')
    }
    return <AccessDenied onLogout={handleLogout} />
  }

  return <Outlet />
}
