import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Search, Bell, LogOut, User, Gem, ChevronDown, Wifi, WifiOff, Menu, X } from 'lucide-react'
import { useAuth, useSocket } from '../store.jsx'
import { api } from '../lib/api.js'
import { Pic, VerifiedIcon, Badge } from './UI.jsx'
import { Logo, MobileNav } from './Sidebar.jsx'
import { timeAgo } from '../lib/helpers.js'

export function TopBar({ onMenu }) {
  const { user } = useAuth()
  const { socket, connected } = useSocket()
  const navigate = useNavigate()
  const location = useLocation()
  const [q, setQ] = useState('')
  const [results, setResults] = useState(null)
  const [openMenu, setOpenMenu] = useState(null) // 'profile' | 'notif'
  const [notifs, setNotifs] = useState([])
  const boxRef = useRef(null)
  const searchTimer = useRef(null)

  // unread count + live updates
  const [notifsMeta, setNotifsMeta] = useState({ unread: 0 })
  const loadNotifs = async () => {
    try {
      const d = await api('/notifications')
      setNotifs(d.notifications)
      setNotifsMeta({ unread: d.notifications.filter((n) => !n.read).length })
    } catch { /* ignore */ }
  }
  useEffect(() => { loadNotifs() }, [location.pathname])
  useEffect(() => {
    if (!socket) return
    const h = () => setTimeout(loadNotifs, 400)
    socket.on('notify', h)
    return () => socket.off('notify', h)
  }, [socket])

  // global shortcuts: focus search / escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        boxRef.current?.focus()
      }
      if (e.key === 'Escape') setOpenMenu(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // click-outside to close menus
  useEffect(() => {
    const onClick = (e) => {
      if (!e.target.closest('[data-menu-root]')) setOpenMenu(null)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => { setResults(null); setQ('') }, [location.pathname])

  const doSearch = (value) => {
    setQ(value)
    clearTimeout(searchTimer.current)
    if (!value.trim()) { setResults(null); return }
    searchTimer.current = setTimeout(async () => {
      try {
        const [u, g] = await Promise.all([
          api(`/users/search?q=${encodeURIComponent(value)}`),
          api('/games'),
        ])
        setResults({
          users: u.users.filter((x) => x.username !== user?.username),
          games: g.games.filter((x) => x.name.toLowerCase().includes(value.toLowerCase())),
        })
      } catch { setResults(null) }
    }, 250)
  }

  const markAllRead = async () => {
    setNotifsMeta({ unread: 0 })
    setNotifs((ns) => ns.map((n) => ({ ...n, read: true })))
    try { await api('/notifications/read', { method: 'POST', body: {} }) } catch { /* ignore */ }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-abyss/85 backdrop-blur-xl">
      <div className="flex h-[64px] items-center gap-3 px-4 sm:px-6">
        <button className="lg:hidden mr-1 rounded-lg p-2 text-ink-dim hover:bg-white/5 cursor-pointer" onClick={onMenu} aria-label="Menu">
          <Menu size={20} />
        </button>

        {/* search */}
        <div className="relative max-w-md flex-1" data-menu-root>
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            ref={boxRef}
            type="search"
            value={q}
            onChange={(e) => doSearch(e.target.value)}
            placeholder="Search games and players…"
            className="w-full rounded-xl border border-line bg-panel py-2.5 pl-10 pr-14 text-sm text-ink placeholder:text-ink-faint transition focus:border-emerald-neon/50 focus:glow-ring"
            aria-label="Search games and players"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-line-2 bg-white/[.04] px-1.5 py-0.5 text-[10px] text-ink-faint sm:block">/</kbd>
          {results && q.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-[calc(100%+8px)] panel overflow-hidden p-2 animate-slide-up shadow-2xl max-h-[70vh] overflow-y-auto scrollbar-thin-dark">
              {results.games.length === 0 && results.users.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-ink-faint">No matches for “{q}”</div>
              )}
              {results.games.length > 0 && (
                <>
                  <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-faint">Games</p>
                  {results.games.map((g) => (
                    <button key={g.id} onClick={() => { navigate(`/play/${g.id}`); setQ('') }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-emerald-neon/[.08] cursor-pointer">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line-2 text-sm" style={{ background: g.gradient }}>{g.emoji || '🎮'}</span>
                      <span className="text-sm font-medium">{g.name}</span>
                      <span className="ml-auto text-[11px] text-ink-faint">{g.category}</span>
                    </button>
                  ))}
                </>
              )}
              {results.users.length > 0 && (
                <>
                  <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-faint">Players</p>
                  {results.users.map((u) => (
                    <button key={u.id} onClick={() => { navigate(`/profile/${u.username}`); setQ('') }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-emerald-neon/[.08] cursor-pointer">
                      <Pic user={u} size={30} online={u.online} />
                      <span className="text-sm font-medium">{u.displayName} <span className="text-ink-faint">@{u.username}</span></span>
                      <span className="ml-auto text-[11px] text-ink-faint">{u.rating} elo</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2" data-menu-root>
          {/* connection state */}
          <span className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold sm:flex ${connected ? 'text-emerald-soft' : 'text-red-300'}`}>
            {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {connected ? 'Live' : 'Offline'}
          </span>

          {/* gems */}
          <button onClick={() => navigate('/store')} className="hidden items-center gap-1.5 rounded-full border border-gold/25 bg-gold/[.07] px-3 py-1.5 text-xs font-bold text-gold transition hover:bg-gold/[.15] cursor-pointer sm:flex" title="Your gems">
            <Gem size={13} />
            {user?.gems?.toLocaleString()}
          </button>

          {/* notifications */}
          <div className="relative">
            <button
              onClick={() => { setOpenMenu(openMenu === 'notif' ? null : 'notif'); if (notifsMeta.unread) markAllRead() }}
              className="relative rounded-xl p-2.5 text-ink-dim transition hover:bg-white/5 hover:text-ink cursor-pointer"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {notifsMeta.unread > 0 && (
                <>
                  <span className="absolute right-2 top-2 flex h-2 w-2 rounded-full bg-emerald-neon" />
                  <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-emerald-neon animate-ping-ring" />
                </>
              )}
            </button>
            {openMenu === 'notif' && (
              <div className="absolute right-0 top-[calc(100%+8px)] w-[340px] panel overflow-hidden animate-slide-up shadow-2xl max-md:w-[calc(100vw-32px)] max-md:fixed max-md:right-4 max-md:top-[60px]">
                <div className="flex items-center justify-between border-b border-line px-4 py-3">
                  <span className="text-sm font-bold">Notifications</span>
                  <Badge tone="dim">{notifs.length}</Badge>
                </div>
                <div className="max-h-[320px] overflow-y-auto scrollbar-thin-dark">
                  {notifs.length === 0 && <p className="px-4 py-8 text-center text-sm text-ink-faint">You're all caught up ✨</p>}
                  {notifs.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => { if (n.link) navigate(n.link); setOpenMenu(null) }}
                      className={`flex w-full gap-3 border-b border-line/60 px-4 py-3 text-left transition hover:bg-white/[.04] cursor-pointer ${!n.read ? 'bg-emerald-neon/[.05]' : ''}`}
                    >
                      <span className="mt-0.5 text-base">{n.type === 'friend_request' ? '🤝' : n.type === 'achievement' ? '🏆' : n.type === 'invite' ? '📩' : n.type === 'level' ? '⚡' : '🔔'}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-ink">{n.title}</span>
                        {n.body && <span className="mt-0.5 block text-[11px] leading-snug text-ink-faint">{n.body}</span>}
                        <span className="mt-1 block text-[10px] text-ink-faint">{timeAgo(n.created_at)}</span>
                      </span>
                      {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-neon mt-1.5" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* profile */}
          <div className="relative">
            <button onClick={() => setOpenMenu(openMenu === 'profile' ? null : 'profile')} className="flex items-center gap-2 rounded-xl p-1 pr-2 transition hover:bg-white/5 cursor-pointer" aria-label="Profile menu">
              <Pic user={user} size={34} ring={user?.isPremium} />
              <ChevronDown size={14} className={`text-ink-faint transition-transform ${openMenu === 'profile' ? 'rotate-180' : ''}`} />
            </button>
            {openMenu === 'profile' && user && (
              <div className="absolute right-0 top-[calc(100%+8px)] w-60 panel overflow-hidden animate-slide-up shadow-2xl">
                <div className="border-b border-line p-4">
                  <div className="flex items-center gap-3">
                    <Pic user={user} size={42} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 truncate text-sm font-bold">{user.displayName} {user.isVerified ? <VerifiedIcon size={13} /> : null}</p>
                      <p className="text-[11px] text-ink-faint">Level {user.level} · {user.rating} elo</p>
                    </div>
                  </div>
                </div>
                <button onClick={() => { setOpenMenu(null); navigate(`/profile/${user.username}`) }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-ink-dim transition hover:bg-white/5 hover:text-ink cursor-pointer">
                  <User size={15} /> View profile
                </button>
                <button onClick={() => { setOpenMenu(null); navigate('/store') }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-ink-dim transition hover:bg-white/5 hover:text-ink cursor-pointer">
                  <Gem size={15} /> Store — {user.gems?.toLocaleString()} gems
                </button>
                <button onClick={() => { setOpenMenu(null); navigate('/settings') }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-ink-dim transition hover:bg-white/5 hover:text-ink cursor-pointer">
                  <Settings size={15} /> Settings
                </button>
                <button onClick={() => { setOpenMenu(null); navigate('/settings?tab=account') }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-ink-dim transition hover:bg-white/5 hover:text-ink cursor-pointer">
                  <LogOut size={15} /> Account & security
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export { MobileNav as _MobileNav }
