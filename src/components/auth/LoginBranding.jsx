import { ShieldCheck, Clock, Leaf } from 'lucide-react'
import FreshSpinLogo, { FreshSpinWordmark } from './FreshSpinLogo'

const BENEFITS = [
  { icon: ShieldCheck, title: 'Safe & Clean', text: 'Laundry Services' },
  { icon: Clock, title: 'Fast & On Time', text: 'Service' },
  { icon: Leaf, title: 'Fresh Scent', text: 'Every Time' },
]

/**
 * Left branding panel of the admin login (≈52–55% on desktop).
 *
 * Photo: public/images/freshspin-login-bg.jpg — "Folded Towels"
 * by HanSangYoon, CC BY-SA 4.0, via Wikimedia Commons. Local copy so the
 * page never depends on a remote host.
 */
export default function LoginBranding() {
  return (
    <div className="relative hidden overflow-hidden lg:flex lg:flex-col">
      {/* Realistic laundry photograph, lower + middle portion */}
      <img
        src="/images/freshspin-login-bg.jpg"
        alt="Folded fresh laundry towels"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Light-blue blend: readable text zone on top, photo richness below */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-brand-tint via-brand-tint/55 to-navy/25"
      />

      {/* Laundry bubbles */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <span className="absolute left-[10%] top-[30%] h-9 w-9 rounded-full border-2 border-white/70 bg-white/20" />
        <span className="absolute left-[42%] top-[22%] h-5 w-5 rounded-full border-2 border-white/60 bg-white/15" />
        <span className="absolute right-[12%] top-[38%] h-6 w-6 rounded-full border-2 border-white/60 bg-white/15" />
        <span className="absolute bottom-[24%] left-[6%] h-12 w-12 rounded-full border-2 border-white/50 bg-white/10" />
        <span className="absolute bottom-[34%] right-[8%] h-16 w-16 rounded-full bg-brand-light/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-1 flex-col justify-between p-12 xl:p-16">
        <div className="flex items-center gap-3">
          <FreshSpinLogo size={52} />
          <FreshSpinWordmark />
        </div>

        <div className="max-w-md">
          <h1 className="text-[40px] font-black leading-[1.05] tracking-tight xl:text-[52px]">
            <span className="block text-navy">Clean Clothes,</span>
            <span className="block text-brand-light">Happier Days</span>
          </h1>
          <p className="mt-4 text-[15px] font-medium leading-relaxed text-navy">
            We take care of your laundry,
            <br />
            so you can focus on what matters most.
          </p>

          <div className="mt-8 flex items-stretch">
            {BENEFITS.map((b, i) => (
              <div key={b.title} className="flex flex-1 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-card">
                  <b.icon className="h-5 w-5 text-navy" />
                </span>
                <span>
                  <span className="block text-[13px] font-bold text-navy">{b.title}</span>
                  <span className="block text-[11px] font-medium text-navy/80">{b.text}</span>
                </span>
                {i < BENEFITS.length - 1 && (
                  <span aria-hidden="true" className="mx-4 h-10 w-px bg-navy/25" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="h-6" />
      </div>

      {/* Bottom wave blending into the photograph */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className="pointer-events-none absolute bottom-0 left-0 z-10 h-24 w-full"
      >
        <path
          d="M0,70 C240,20 480,110 720,70 C960,30 1200,100 1440,60 L1440,120 L0,120 Z"
          fill="var(--blue)"
          opacity="0.45"
        />
        <path
          d="M0,90 C260,50 520,120 780,95 C1040,70 1240,115 1440,90 L1440,120 L0,120 Z"
          fill="var(--blue-soft)"
          opacity="0.85"
        />
      </svg>
    </div>
  )
}
