import { useState } from 'react'

/**
 * FreshSpin circular brand mark.
 * Renders the official logo file (/public/images/logo.png.png) and falls back
 * to the inline SVG below if the file is ever missing or renamed.
 */
export default function FreshSpinLogo({ size = 48 }) {
  const [imageFailed, setImageFailed] = useState(false)

  if (imageFailed) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        role="img"
        aria-label="FreshSpin logo"
        className="shrink-0"
      >
        <circle cx="32" cy="32" r="30" fill="var(--navy)" />
        <circle cx="32" cy="32" r="30" fill="none" stroke="var(--blue)" strokeWidth="2" opacity="0.6" />
        <circle cx="32" cy="32" r="22" fill="var(--blue-soft)" />
        <path
          d="M12 34c5-4 10-4 15 0s10 4 15 0 8-3 10-1v8c-2 2-6 3-10 1s-10-4-15 0-10 4-15 0v-8z"
          fill="var(--blue)"
        />
        <path
          d="M14 42c4-3 8-3 12 0s8 3 12 0 6-2 8-1v4c-2 3-6 4-10 2s-8-3-12 0-6 2-8 1l-2-2v-4z"
          fill="var(--navy)"
          opacity="0.85"
        />
        <circle cx="44" cy="18" r="3" fill="var(--white)" opacity="0.9" />
        <circle cx="49" cy="24" r="2" fill="var(--white)" opacity="0.7" />
      </svg>
    )
  }

  return (
    <img
      src="/images/logo.png.png"
      alt="FreshSpin logo"
      onError={() => setImageFailed(true)}
      style={{ width: `${size}px`, height: `${size}px` }}
      className="shrink-0 rounded-full object-contain ring-1 ring-white/40"
    />
  )
}

export function FreshSpinWordmark({ compact = false }) {
  return (
    <span className="leading-tight">
      <span
        className={`block font-extrabold tracking-tight text-navy ${compact ? 'text-xl' : 'text-[22px]'}`}
      >
        FreshSpin
      </span>
      <span className="block text-[10px] font-semibold tracking-[0.22em] text-ink-secondary">
        LAUNDRY SERVICE
      </span>
    </span>
  )
}
