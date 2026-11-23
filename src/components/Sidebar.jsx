import React, { useState, useEffect, useRef } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import {
  House, Gamepad2, Trophy, BarChart3, Users, ShoppingBag, Settings, Crown, Gem, LogOut,
} from 'lucide-react'
import { useAuth } from '../store.jsx'
import { Pic, Progress, VerifiedIcon } from './UI.jsx'

export const NAV = [
  { to: '/', label: 'Home', icon: House, end: true },
  { to: '/games', label: 'Games', icon: Gamepad2 },
  { to: '/tournaments', label: 'Tournaments', icon: Trophy },
  { to: '/leaderboard', label: 'Leaderboard', icon: BarChart3 },
  { to: '/friends', label: 'Friends', icon: Users, badge: 'req' },
  { to: '/store', label: 'Store', icon: ShoppingBag },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar({ pendingRequests = 0 }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-line bg-panel/80 backdrop-blur-xl max-lg:hidden">
      <Logo />

      <nav className="mt-2 flex-1 space-y-1 overflow-y-auto px-3 pb-4 scrollbar-thin-dark">
        {NAV.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-emerald-neon/[.12] text-ink glow-ring'
                  : 'text-ink-dim hover:bg-white/[.04] hover:text-ink'}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} className={isActive ? 'text-emerald-neon drop-shadow-[0_0_6px_rgba(16,229,138,.8)]' : 'text-ink-faint group-hover:text-emerald-soft transition'} />
                <span className="flex-1">{label}</span>
                {badge === 'req' && pendingRequests > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-neon px-1 text-[10px] font-bold text-[#04130b]">{pendingRequests}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {user && !user.isPremium && (
        <Link to="/store" className="mx-3 mb-3 block overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br from-[#2a1f05]/90 to-[#141003]/90 p-4 transition hover:border-gold/50 group">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-gold/15 text-gold transition group-hover:scale-110">
            <Crown size={18} />
          </div>
          <h4 className="text-sm font-bold text-amber-100">Go Premium</h4>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-100/60">2× XP, exclusive cosmetics and a golden profile glow.</p>
          <span className="mt-3 inline-flex items-center gap-1 rounded-lg bg-gold px-3 py-1.5 text-[11px] font-bold text-[#221500] transition group-hover:brightness-110">
            Upgrade
          </span>
        </Link>
      )}

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-white/[.04] cursor-pointer" onClick={() => navigate(`/profile/${user?.username}`)}>
          <Pic user={user} size={38} online />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="truncate text-[13px] font-bold">{user?.displayName}</span>
              {user?.isVerified ? <VerifiedIcon size={13} /> : null}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-emerald-soft">Lv.{user?.level}</span>
              <Progress pct={user?.levelProgress?.pct || 0} thin className="flex-1" />
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); logout() }}
            className="rounded-lg p-1.5 text-ink-faint transition hover:bg-red-500/10 hover:text-red-300 cursor-pointer"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}

export function Logo({ compact = false }) {
  return (
    <Link to="/" className="flex items-center gap-3 px-5 pt-5 pb-3 no-underline">
      <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-neon to-cyber-cyan text-[#04130b] shadow-[0_4px_20px_-4px_rgba(16,229,138,.7)]">
        <Gamepad2 size={22} strokeWidth={2.4} />
      </span>
      {!compact && (
        <span className="text-[19px] font-extrabold tracking-tight leading-none">
          Game<span className="text-emerald-neon text-glow">Hub</span>
        </span>
      )}
    </Link>
  )
}

// Mobile: top bar slot + bottom tab bar
export function MobileNav({ pendingRequests = 0 }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-panel/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] lg:hidden">
      {NAV.slice(0, 6).map(({ to, label, icon: Icon, end, badge }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition ${isActive ? 'text-emerald-neon' : 'text-ink-faint'}`
          }
        >
          <span className="relative">
            <Icon size={20} />
            {badge === 'req' && pendingRequests > 0 && (
              <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-neon px-1 text-[9px] font-bold text-[#04130b]">{pendingRequests}</span>
            )}
          </span>
          {label}
        </NavLink>
      ))}
      <NavLink to="/settings" className={({ isActive }) => `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition ${isActive ? 'text-emerald-neon' : 'text-ink-faint'}`}>
        <Settings size={20} />
        More
      </NavLink>
    </nav>
  )
}
