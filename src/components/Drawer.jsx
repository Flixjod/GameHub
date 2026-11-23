import React, { useState, useEffect } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import {
  House, Gamepad2, Trophy, BarChart3, Users, ShoppingBag, Settings, Crown, LogOut, X,
} from 'lucide-react'
import { useAuth } from '../store.jsx'
import { Pic, Progress, VerifiedIcon } from './UI.jsx'
import { Logo } from './Sidebar.jsx'

const NAV = [
  { to: '/', label: 'Home', icon: House, end: true },
  { to: '/games', label: 'Games', icon: Gamepad2 },
  { to: '/tournaments', label: 'Tournaments', icon: Trophy },
  { to: '/leaderboard', label: 'Leaderboard', icon: BarChart3 },
  { to: '/friends', label: 'Friends', icon: Users, badge: 'req' },
  { to: '/store', label: 'Store', icon: ShoppingBag },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Drawer({ pendingRequests = 0 }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const toggle = () => setOpen((v) => !v)
    window.addEventListener('gh:toggle-drawer', toggle)
    return () => window.removeEventListener('gh:toggle-drawer', toggle)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => setOpen(false), [location.pathname])

  if (!open) return null

  const close = (fn) => () => { setOpen(false); fn?.() }

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[rise-in_.2s_ease]" onClick={() => setOpen(false)} />
      <aside className="absolute inset-y-0 left-0 flex w-[280px] flex-col border-r border-line bg-panel shadow-2xl" style={{ animation: 'slide-up .22s ease' }}>
        <div className="flex items-center justify-between pr-3">
          <Logo />
          <button
            className="rounded-lg p-2 text-ink-faint transition hover:bg-white/5 hover:text-ink cursor-pointer"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4 scrollbar-thin-dark">
          {NAV.map(({ to, label, icon: Icon, end, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium no-underline transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-emerald-neon/[.12] text-ink glow-ring'
                    : 'text-ink-dim hover:bg-white/[.04] hover:text-ink'}`
              }
            >
              <Icon size={18} className="text-emerald-soft transition" />
              <span className="flex-1">{label}</span>
              {badge === 'req' && pendingRequests > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-neon px-1 text-[10px] font-bold text-[#04130b]">{pendingRequests}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {user && !user.isPremium && (
          <button
            onClick={close(() => navigate('/store'))}
            className="mx-3 mb-3 block overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br from-[#2a1f05]/90 to-[#141003]/90 p-4 text-left transition hover:border-gold/50 cursor-pointer group"
          >
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-gold/15 text-gold">
              <Crown size={18} />
            </div>
            <h4 className="text-sm font-bold text-amber-100">Go Premium</h4>
            <p className="mt-1 text-[11px] leading-relaxed text-amber-100/60">2× XP, exclusive cosmetics and a golden profile glow.</p>
            <span className="mt-3 inline-flex items-center gap-1 rounded-lg bg-gold px-3 py-1.5 text-[11px] font-bold text-[#221500]">Upgrade</span>
          </button>
        )}

        {user && (
          <div className="border-t border-line p-3">
            <button
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/[.04] cursor-pointer"
              onClick={close(() => navigate(`/profile/${user.username}`))}
            >
              <Pic user={user} size={38} online />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1">
                  <span className="truncate text-[13px] font-bold">{user.displayName}</span>
                  {user.isVerified ? <VerifiedIcon size={13} /> : null}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-emerald-soft">Lv.{user.level}</span>
                  <Progress pct={user.levelProgress?.pct || 0} thin className="flex-1" />
                </span>
              </span>
            </button>
            <button
              onClick={close(() => logout())}
              className="mt-1 flex w-full items-center gap-3 rounded-xl px-2 py-2 text-[13px] font-medium text-ink-dim transition hover:bg-red-500/10 hover:text-red-300 cursor-pointer"
            >
              <LogOut size={15} /> Sign out
            </button>
          </div>
        )}
      </aside>
    </div>
  )
}
