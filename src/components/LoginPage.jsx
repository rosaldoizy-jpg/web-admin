import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoginBranding from './auth/LoginBranding'
import LoginForm from './auth/LoginForm'

/**
 * GET /login — split-screen admin login.
 * Left: branding panel (desktop only). Right: white login card.
 * Auth logic lives in LoginForm + AuthContext; route + guards unchanged.
 */
export default function LoginPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-tint">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-line border-t-navy" />
      </div>
    )
  }

  // If already authenticated, go straight to dashboard
  if (user) return <Navigate to="/" replace />

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[52fr_48fr]">
        <LoginBranding />

        <div className="relative flex items-center justify-center overflow-hidden bg-white px-4 py-10 sm:px-8">
          {/* Soft decorations behind the card */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <span className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-soft/60" />
            <span className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-brand-tint" />
          </div>
          <div className="relative z-10 flex w-full justify-center">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  )
}
