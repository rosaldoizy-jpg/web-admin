import { Eye, EyeOff } from 'lucide-react'

/**
 * Labeled admin-login input: white bg, light-blue border + focus,
 * navy icon, inline validation message.
 */
export default function LoginInput({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  icon: Icon,
  error,
  disabled,
  autoComplete,
  showToggle,
  showPassword,
  onTogglePassword,
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy"
      >
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
            <Icon className="h-4.5 w-4.5 text-navy" size={18} />
          </span>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="w-full rounded-xl border border-line bg-white py-3.5 pl-11 pr-11 text-sm text-navy placeholder:text-ink-secondary focus:border-brand-light focus:outline-none focus:ring-2 focus:ring-brand-light transition disabled:opacity-50"
        />
        {showToggle && (
          <button
            type="button"
            onClick={onTogglePassword}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-navy transition hover:bg-brand-tint"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
