import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AVATAR_GRADIENTS } from '../lib/helpers.js'

// ---------- Avatar ----------
export function Pic({ user, size = 40, ring = false, className = '', online }) {
  const grad = AVATAR_GRADIENTS[(user?.avatarColor ?? 0) % AVATAR_GRADIENTS.length]
  const letter = (user?.displayName || user?.username || '?').slice(0, 1).toUpperCase()
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }} title={user?.displayName || user?.username}>
      <div
        className={`flex h-full w-full items-center justify-center rounded-full overflow-hidden select-none ${ring ? 'ring-2 ring-emerald-neon/60' : 'ring-1 ring-white/10'}`}
        style={{ background: grad, fontSize: size * 0.45, lineHeight: 1 }}
      >
        {user?.avatar ? <span>{user.avatar}</span> : <span className="font-bold text-white/90">{letter}</span>}
      </div>
      {online != null && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-abyss ${online ? 'bg-emerald-neon' : 'bg-ink-faint'}`}
          style={{ width: Math.max(9, size * 0.26), height: Math.max(9, size * 0.26) }}
        />
      )}
    </div>
  )
}

// ---------- Buttons ----------
const btnBase = 'relative inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 select-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[.97]'
const variants = {
  primary: `bg-emerald-neon text-[#04130b] hover:brightness-110 hover:shadow-[0_6px_28px_-6px_rgba(var(--accent-rgb),.65)] shadow-[0_4px_18px_-6px_rgba(var(--accent-rgb),.45)]`,
  ghost: 'text-ink-dim hover:text-ink hover:bg-white/5 border border-transparent',
  outline: 'border border-line-2 text-ink hover:border-emerald-neon/60 hover:text-ink hover:bg-emerald-neon/5',
  danger: 'bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25',
  gold: 'bg-gradient-to-r from-amber-400 to-amber-300 text-[#221500] hover:brightness-110',
}
const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-[15px]',
  icon: 'p-2.5',
}
export function Button({ variant = 'primary', size = 'md', className = '', as: As = 'button', ...props }) {
  return <As className={`${btnBase} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />
}

// ---------- Card ----------
export function Card({ className = '', children, ...rest }) {
  return (
    <div className={`panel ${className}`} {...rest}>
      {children}
    </div>
  )
}

// ---------- Progress ----------
export function Progress({ pct = 0, className = '', color, thin = false }) {
  return (
    <div className={`w-full rounded-full bg-white/[.07] ${thin ? 'h-1.5' : 'h-2.5'} ${className}`}>
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${Math.min(100, Math.max(2, pct))}%`, background: color || 'linear-gradient(90deg,var(--color-emerald-neon),var(--color-cyber-cyan))', boxShadow: '0 0 12px -2px rgba(var(--accent-rgb),.7)' }}
      />
    </div>
  )
}

// ---------- Badge ----------
export function Badge({ children, tone = 'emerald', className = '' }) {
  const tones = {
    emerald: 'bg-emerald-neon/10 text-emerald-soft border border-emerald-neon/25',
    cyan: 'bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/25',
    gold: 'bg-gold/10 text-gold border border-gold/25',
    royal: 'bg-royal/15 text-[#b79dfb] border border-royal/30',
    dim: 'bg-white/5 text-ink-faint border border-line-2',
    danger: 'bg-red-500/10 text-red-300 border border-red-500/25',
  }
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tones[tone]} ${className}`}>{children}</span>
}

// ---------- Modal ----------
export function Modal({ open, onClose, title, children, width = 480 }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div ref={ref} className="relative w-full panel animate-pop-in p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,.8)]" style={{ maxWidth: width }}>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-faint hover:bg-white/5 hover:text-ink transition cursor-pointer" aria-label="Close dialog">✕</button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

// ---------- Skeletons / empty states ----------
export function Skeleton({ className = '', h = 'h-4' }) {
  return <div className={`skeleton ${h} ${className}`} />
}

export function SkeletonCard({ lines = 3, className = '' }) {
  return (
    <Card className={`p-5 ${className}`}>
      <Skeleton h="h-5" className="w-1/3 mb-4" />
      {Array.from({ length: lines }).map((_, i) => <Skeleton key={i} className={`mb-2.5 w-${['4/5', '3/4', '2/3'][i % 3]}`} />)}
      <Skeleton h="h-8" className="w-full mt-3" />
    </Card>
  )
}

export function EmptyState({ emoji = '🕹️', title, body, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-2/70 bg-white/[.015] px-6 py-12 text-center">
      <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-neon/10 border border-emerald-neon/20 text-3xl animate-pulse-glow">{emoji}</div>
      <h4 className="font-bold text-ink">{title}</h4>
      {body && <p className="mt-1 max-w-sm text-sm text-ink-faint">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ---------- Section header ----------
export function SectionHead({ title, sub, action, icon: Icon }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-neon/10 border border-emerald-neon/20 text-emerald-soft">
            <Icon size={18} />
          </span>
        )}
        <div>
          <h3 className="font-bold text-[17px] leading-tight">{title}</h3>
          {sub && <p className="text-xs text-ink-faint mt-0.5">{sub}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

export function VerifiedIcon({ size = 14, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-label="Verified">
      <path d="M12 2l2.4 2.1 3.1-.5 1 3 2.8 1.4-1 3 1 3-2.8 1.4-1 3-3.1-.5L12 22l-2.4-2.1-3.1.5-1-3L2.7 16l1-3-1-3 2.8-1.4 1-3 3.1.5L12 2z" fill="#10e58a" opacity=".9" />
      <path d="M8.5 12.2l2.3 2.3 4.7-4.7" stroke="#04130b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
