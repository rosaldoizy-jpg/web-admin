import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowRight, Heart, Loader2, Lock, Mail } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/client'
import LoginInput from './LoginInput'
import FreshSpinLogo, { FreshSpinWordmark } from './FreshSpinLogo'

const REMEMBER_KEY = 'admin_remember_email'

/** Right-side white login card: logo, form, remember/forgot, submit, footer. */
export default function LoginForm() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_KEY) || '')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(() => Boolean(localStorage.getItem(REMEMBER_KEY)))
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotHint, setShowForgotHint] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError('')
    const next = {}
    if (!email.trim()) next.email = 'Please enter your email address.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = 'Please enter a valid email address.'
    }
    if (!password) next.password = 'Please enter your password.'
    setFieldErrors(next)
    if (Object.keys(next).length > 0) return

    setSubmitting(true)
    try {
      const res = await api.post('/api/login', { email: email.trim(), password })
      const data = res.data?.data || res.data

      if (!data?.token || !data?.user) {
        setServerError('Invalid server response. Please try again.')
        return
      }
      if (data.user.role !== 'admin') {
        setServerError('You are not authorized to access the admin panel.')
        return
      }

      if (rememberMe) localStorage.setItem(REMEMBER_KEY, email.trim())
      else localStorage.removeItem(REMEMBER_KEY)

      login(data.user, data.token)
      navigate('/', { replace: true })
    } catch (err) {
      const status = err.response?.status
      if (status === 401) setServerError('Invalid email or password.')
      else {
        setServerError(
          err.response?.data?.message || 'Unable to connect to server. Check your connection and try again.',
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-[500px] rounded-[24px] border border-line bg-white p-8 shadow-pop sm:p-10">
      <p className="mb-6 text-right text-xs text-ink-secondary">
        Authorized personnel only
      </p>

      {/* Card logo */}
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="mb-3">
          <FreshSpinLogo size={56} />
        </span>
        <FreshSpinWordmark compact />
      </div>

      <h2 className="text-center text-2xl font-extrabold text-navy">Welcome Back, Admin!</h2>
      <p className="mb-6 mt-1 text-center text-sm text-ink-secondary">
        Log in to manage FreshSpin Laundry operations.
      </p>

      {serverError && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-danger/30 bg-danger-tint px-4 py-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <LoginInput
          id="admin-email"
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (serverError) setServerError('') }}
          placeholder="Enter your email address"
          icon={Mail}
          error={fieldErrors.email}
          disabled={submitting}
          autoComplete="email"
        />
        <LoginInput
          id="admin-password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => { setPassword(e.target.value); if (serverError) setServerError('') }}
          placeholder="Enter your password"
          icon={Lock}
          error={fieldErrors.password}
          disabled={submitting}
          autoComplete="current-password"
          showToggle
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword((v) => !v)}
        />

        <div className="flex items-center justify-between">
          <label htmlFor="remember-me" className="flex cursor-pointer items-center gap-2 text-sm text-navy">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={submitting}
              className="h-4 w-4 rounded accent-navy"
            />
            Remember me
          </label>
          <button
            type="button"
            onClick={() => setShowForgotHint((v) => !v)}
            className="text-sm font-semibold text-navy underline-offset-2 hover:underline"
          >
            Forgot password?
          </button>
        </div>
        {showForgotHint && (
          <p role="status" className="rounded-xl bg-brand-tint px-4 py-2.5 text-xs leading-relaxed text-navy">
            Password resets are handled by your system administrator. Please contact
            them to regain access to your admin account.
          </p>
        )}

        <button
          id="admin-login-btn"
          type="submit"
          disabled={submitting}
          className="flex h-[56px] w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 text-[15px] font-bold text-white shadow-card transition-all duration-150 hover:bg-navy-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Logging in…
            </>
          ) : (
            <>
              Log In
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-xs text-ink-secondary">
        Laundry made easy.
        <Heart className="h-3.5 w-3.5 fill-brand-light text-brand-light" />
      </p>
    </div>
  )
}
