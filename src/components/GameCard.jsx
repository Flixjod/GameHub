import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Clock } from 'lucide-react'
import { Card } from './UI.jsx'
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
      <Card onClick={onClick || (() => navigate('/games'))} className="group relative flex cursor-pointer flex-col items-center justify-center gap-3 p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-emerald-neon/40">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line-2 text-2xl transition-transform duration-300 group-hover:scale-110" style={{ background: 'linear-gradient(140deg, #101b15, #0a0f0d)' }}>🗂️</span>
        <h3 className="text-lg font-bold">More Games</h3>
        <p className="text-xs text-ink-faint">Explore the full library</p>
        <span className="inline-flex items-center gap-1 rounded-lg border border-line-2 bg-white/[.05] px-3 py-1.5 text-xs font-semibold text-ink-dim transition group-hover:border-emerald-neon/40 group-hover:text-emerald-neon">
          Browse All <ArrowRight size={13} />
        </span>
      </Card>
    )
  }

  const art = GAME_ART[game?.id] || GAME_ART.more
  return (
    <Card
      onClick={onClick || (() => navigate(`/play/${game.id}`))}
      className="group relative flex cursor-pointer flex-col overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-neon/45 hover:shadow-[0_20px_50px_-24px_rgba(0,0,0,.95)]"
    >
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[3px] opacity-70 transition-opacity duration-300 group-hover:opacity-100" style={{ background: game.gradient }} />
      <div className="relative flex items-center justify-between gap-2">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line-2 text-[22px] shadow-md" style={{ background: game.gradient }}>{art.emoji}</span>
        {game.openRooms > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-neon/40 bg-black/50 px-2.5 py-1 text-[10px] font-bold text-emerald-soft">
            <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-emerald-neon" /> {game.openRooms} live
          </span>
        )}
      </div>
      <h3 className="relative mt-3.5 text-[17px] font-bold tracking-tight">{game.name}</h3>
      <p className="relative text-[11px] font-bold uppercase tracking-wider text-emerald-soft/90">{game.tagline}</p>
      <p className="relative mt-1.5 flex-1 text-xs leading-relaxed text-ink-faint line-clamp-2">{game.description}</p>
      <div className="relative mt-4 flex items-center justify-between border-t border-line pt-3">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-ink-faint"><Clock size={10} /> {game.playTime}</span>
        <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-xl border border-line-2 bg-white/[.05] text-ink-dim transition group-hover:translate-x-0.5 group-hover:border-emerald-neon/40 group-hover:text-white">
          <ArrowRight size={14} />
        </span>
      </div>
    </Card>
  )
}
