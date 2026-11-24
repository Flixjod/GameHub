import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Users, ChevronRight, Bot, Clock } from 'lucide-react'
import { Card, Badge } from './UI.jsx'
import { api } from '../lib/api.js'
import { GAME_ART } from './GameArt.jsx'
import { useSocket } from '../store.jsx'

export function useRooms() {
  const [rooms, setRooms] = useState([])
  const { socket } = useSocket()
  useEffect(() => {
    api('/rooms').then((d) => setRooms(d.rooms)).catch(() => {})
    if (!socket) return
    const h = (list) => setRooms(list)
    socket.on('rooms:list', h)
    return () => socket.off('rooms:list', h)
  }, [socket])
  return rooms
}


export function GameCard({ game, more, onClick }) {
  const navigate = useNavigate()

  if (more) {
    return (
      <Card onClick={onClick || (() => navigate('/games'))} className="group relative flex cursor-pointer flex-col overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-neon/40">
        <div className="pointer-events-none absolute inset-0 opacity max-md:opacity-40">
          <MoreArt />
        </div>
        <div className="relative flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center">
          <span className="text-5xl transition-transform duration-300 group-hover:scale-110">🗂️</span>
          <h3 className="text-lg font-bold">More Games</h3>
          <p className="text-xs text-ink-faint">Explore the full library</p>
          <span className="inline-flex items-center gap-1 rounded-lg bg-white/5 border border-line-2 px-3 py-1.5 text-xs font-semibold text-ink-dim transition group-hover:border-emerald-neon/40 group-hover:text-emerald-neon">
            Browse All <ChevronRight size={13} />
          </span>
        </div>
      </Card>
    )
  }

  const art = GAME_ART[game?.id] || GAME_ART.more
  const Icon = art.icon

  return (
    <Card onClick={onClick || (() => navigate(`/play/${game.id}`))} className="group relative flex cursor-pointer flex-col overflow-hidden p-0 transition-all duration-300 hover:-translate-y-1.5 hover:border-emerald-neon/40 hover:shadow-[0_24px_56px_-20px_rgba(16,229,138,.38)]">
      <div className="relative h-[148px] overflow-hidden" style={{ background: game.gradient }}>
        <div className="absolute inset-0 text-emerald-neon"><Pattern kind={art.pattern} /></div>
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-white/[.09] blur-2xl transition-all duration-500 group-hover:bg-white/[.16]" />
        <span aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,.14) 48%, transparent 62%)', backgroundSize: '260% 100%', animation: 'shimmer 1.1s ease forwards' }} />
        <span className="absolute -bottom-1.5 right-3 text-[64px] opacity-95 drop-shadow-[0_10px_20px_rgba(0,0,0,.6)] transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6">{art.emoji}</span>
        {Icon && <Icon size={58} className="absolute -left-3 -top-3 text-white/[.14]" strokeWidth={1.2} />}
        <Badge tone="dim" className="absolute left-3 top-3 !bg-black/40 !border-white/10">{game.category}</Badge>
        {game.openRooms > 0 && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-neon/40 bg-black/50 px-2.5 py-1 text-[10px] font-bold text-emerald-soft">
            <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-emerald-neon" /> {game.openRooms} live
          </span>
        )}
        <div className="absolute bottom-2.5 left-3 flex items-center gap-2 text-[10px] font-semibold text-white/60">
          <span className="inline-flex items-center gap-1"><Clock size={10} /> {game.playTime}</span>
          {game.recentMatches > 0 && <span className="inline-flex items-center gap-1 text-emerald-soft"><span className="h-1.5 w-1.5 rounded-full bg-emerald-neon animate-pulse-glow" /> {game.recentMatches} in 24h</span>}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-[17px] font-bold tracking-tight">{game.name}</h3>
        <p className="mt-0.5 text-xs font-bold uppercase tracking-wider text-emerald-soft/90">{game.tagline}</p>
        <p className="mt-2 line-clamp-2 flex-1 text-xs leading-relaxed text-ink-faint">{game.description}</p>
        <div className="mt-3.5 flex items-center gap-2">
          <button
            onClick={() => navigate('/#rooms')}
            className="rounded-lg border border-line-2 px-3 py-2 text-xs font-semibold text-ink-dim transition hover:border-emerald-neon/40 hover:text-ink cursor-pointer inline-flex items-center justify-center gap-1.5"
          >
            <Users size={13} /> Rooms
          </button>
          <button
            onClick={onClick || (() => navigate(`/play/${game.id}`))}
            className="flex-1 rounded-lg bg-emerald-neon py-2.5 text-xs font-bold uppercase tracking-wide text-[#04130b] transition hover:brightness-110 active:scale-95 cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-[0_4px_16px_-4px_rgba(16,229,138,.5)]"
          >
            <Play size={13} fill="currentColor" /> Play now
          </button>
        </div>
      </div>
    </Card>
  )
}

function Pattern({ kind }) {
  if (kind === 'ttt') {
    return (
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full opacity-[.14]">
        <g stroke="currentColor" strokeWidth="3" fill="none"><path d="M40 12v96M80 12v96M12 40h96M12 80h96" /></g>
        <circle cx="26" cy="26" r="9" stroke="#22d3ee" strokeWidth="3" fill="none" />
        <path d="M92 88l16 16M108 88l-16 16" stroke="#10e58a" strokeWidth="3.4" strokeLinecap="round" />
      </svg>
    )
  }
  if (kind === 'reversi') {
    return (
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full opacity-[.14]">
        {[[0, 0], [30, 30], [60, 0], [0, 60], [60, 60], [30, 90], [90, 30], [90, 90]].map(([x, y], i) => (
          <circle key={i} cx={x + 15} cy={y + 15} r="12" fill={i % 2 ? '#0b1512' : '#0e2b1e'} stroke="#10e58a" strokeWidth="1.4" />
        ))}
      </svg>
    )
  }
  if (kind === 'ludo') {
    return (
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full opacity-[.14]">
        <rect x="30" y="30" width="60" height="60" rx="8" fill="none" stroke="#fb923c" strokeWidth="2.5" />
        <rect x="30" y="0" width="18" height="30" rx="3" fill="#22c55e" opacity=".5" />
        <rect x="30" y="90" width="18" height="30" rx="3" fill="#ef4444" opacity=".45" />
        <rect x="90" y="30" width="30" height="18" rx="3" fill="#eab308" opacity=".45" />
        <rect x="0" y="30" width="30" height="18" rx="3" fill="#3b82f6" opacity=".45" />
      </svg>
    )
  }
  if (kind === 'snakes') {
    return (
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full opacity-[.14]">
        <path d="M10 100 L60 100 L60 70 L20 70 L20 40 L70 40 L70 10" stroke="#8b5cf6" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M80 14 C 104 30 74 48 98 62 C 112 72 96 92 102 106" stroke="#10e58a" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      </svg>
    )
  }
  return null
}

function MoreArt() {
  return (
    <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full opacity-[.08]">
      <g stroke="#10e58a" strokeWidth="1.4" fill="none">
        {Array.from({ length: 6 }).map((_, i) => <circle key={i} cx="100" cy="100" r={20 + i * 16} />)}
      </g>
    </svg>
  )
}

export function ModeCard({ icon: Icon, title, bullets, tone, onClick, children }) {
  const tones = {
    emerald: 'border-emerald-neon/30 hover:border-emerald-neon/60 text-emerald-soft bg-emerald-neon/[.04]',
    cyan: 'border-cyber-cyan/30 hover:border-cyber-cyan/60 text-cyber-cyan bg-cyber-cyan/[.04]',
    royal: 'border-royal/40 hover:border-royal/70 text-[#b79dfb] bg-royal/[.06]',
    amber: 'border-gold/40 hover:border-gold/70 text-amber-200 bg-gold/[.05]',
    rose: 'border-red-500/35 hover:border-red-500/60 text-red-300 bg-red-500/[.04]',
  }
  return (
    <Card
      onClick={onClick}
      className={`group relative flex cursor-pointer flex-col gap-2.5 p-5 transition-all duration-200 hover:-translate-y-1 ${tones[tone]}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick?.()}
    >
      <span aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/[.04] blur-2xl transition-all duration-500 group-hover:bg-white/[.09]" />
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl border ${tones[tone]} shadow-md`}>
          <Icon size={20} />
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line-2 bg-white/[.04] text-ink-faint transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-ink">
          <ChevronRight size={15} />
        </span>
      </div>
      <h3 className="mt-0.5 text-[16px] font-bold text-ink">{title}</h3>
      <ul className="space-y-1 text-xs leading-relaxed text-ink-faint">
        {bullets.map((b) => <li key={b}>· {b}</li>)}
      </ul>
      {children}
    </Card>
  )
}

