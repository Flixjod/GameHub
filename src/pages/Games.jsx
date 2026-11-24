import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, DoorOpen, Filter, X, Globe2, WifiOff, Cpu, Zap } from 'lucide-react'
import { api } from '../lib/api.js'
import { GameCard } from '../components/GameCard.jsx'
import { GAME_ART } from '../components/GameArt.jsx'
import { LiveRooms } from '../components/LiveRooms.jsx'
import { SectionHead, Button, Badge } from '../components/UI.jsx'
import { ENGINES } from '../lib/engines.js'
import TicTacToeBoard from '../components/boards/TicTacToeBoard.jsx'
import ReversiBoard from '../components/boards/ReversiBoard.jsx'
import LudoBoard from '../components/boards/LudoBoard.jsx'
import SnakesBoard from '../components/boards/SnakesBoard.jsx'

const SEAT_PREVIEW = { tictactoe: 2, reversi: 2, ludo: 4, snakes: 2 }

// Renders the true engine start position, read-only, as launcher artwork.
function GamePreview({ gameId }) {
  const state = React.useMemo(() => {
    try {
      const n = SEAT_PREVIEW[gameId] || 2
      return ENGINES[gameId]?.create(Array.from({ length: n }, () => ({})))
    } catch { return null }
  }, [gameId])
  if (!state) return <span className="text-3xl opacity-40">🎲</span>
  if (gameId === 'tictactoe') return <div className="w-full max-w-[210px]" style={{ pointerEvents: 'none' }}><TicTacToeBoard state={state} mySeat={-1} playing={false} onMove={() => {}} /></div>
  if (gameId === 'reversi') return <div className="w-full max-w-[260px]" style={{ pointerEvents: 'none' }}><ReversiBoard state={state} mySeat={0} playing={false} onMove={() => {}} theme="emerald" showHints={false} /></div>
  if (gameId === 'ludo') return <div className="w-full max-w-[260px]" style={{ pointerEvents: 'none' }}><LudoBoard state={state} mySeat={0} playing={false} onMove={() => {}} onRoll={() => {}} map="clubhouse" /></div>
  if (gameId === 'snakes') return <div className="w-full max-w-[260px]" style={{ pointerEvents: 'none' }}><SnakesBoard state={state} mySeat={0} playing={false} onRoll={() => {}} map="jungle" /></div>
  return null
}

export default function Games() {
  const [games, setGames] = useState(null)
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('All')
  const [withLiveRooms, setWithLiveRooms] = useState(false)
  const [selected, setSelected] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    api('/games').then((d) => setGames(d.games)).catch(() => setGames([]))
  }, [])

  const categories = useMemo(() => ['All', ...new Set((games || []).map((g) => g.category))], [games])
  const filtered = useMemo(() => (games || []).filter((g) =>
    (category === 'All' || g.category === category) &&
    (!withLiveRooms || g.openRooms > 0) &&
    (!q.trim() || g.name.toLowerCase().includes(q.toLowerCase()) || g.tagline.toLowerCase().includes(q.toLowerCase()))
  ), [games, q, category, withLiveRooms])

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Game Library</h1>
          <p className="mt-1 text-sm text-ink-dim">Classic games, premium craft. Pick your battlefield.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search games…"
              className="w-full rounded-xl border border-line bg-panel py-2.5 pl-9 pr-3 text-sm transition focus:border-emerald-neon/50 focus:glow-ring"
              aria-label="Search games"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter games">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition cursor-pointer ${
              category === c
                ? 'bg-emerald-neon text-[#04130b] shadow-[0_4px_16px_-4px_rgba(16,229,138,.55)]'
                : 'border border-line-2 text-ink-dim hover:text-ink hover:border-emerald-neon/40'}`}
          >
            {c}
          </button>
        ))}
        <button
          onClick={() => setWithLiveRooms((v) => !v)}
          className={`ml-auto rounded-full px-4 py-1.5 text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5 ${
            withLiveRooms ? 'bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/40' : 'border border-line-2 text-ink-dim hover:text-ink'}`}
        >
          <Filter size={12} /> Live rooms only
        </button>
      </div>

      {!games ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-64 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-2/70 px-6 py-16 text-center">
          <span className="text-4xl mb-3">🔍</span>
          <p className="font-bold">No games match your filters</p>
          <p className="mt-1 text-sm text-ink-faint">Try clearing the search or switching category.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => { setQ(''); setCategory('All'); setWithLiveRooms(false) }}>Reset filters</Button>
        </div>
      ) : (
        <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((g) => <GameCard key={g.id} game={g} onClick={() => setSelected(g)} />)}
        </div>
      )}

      {selected && (
        <section className="animate-fade-in" key={selected.id}>
          <div className="overflow-hidden rounded-3xl border border-line shadow-[0_24px_60px_-28px_rgba(0,0,0,.9)]" style={{ background: 'linear-gradient(160deg, #0a120e, #070b09)' }}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line-2 text-2xl shadow-lg" style={{ background: 'linear-gradient(140deg, #0f1a15, #0a0f0d)' }}>{GAME_ART[selected.id]?.emoji || '\ud83c\udfae'}</span>
                <div>
                  <h2 className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight">
                    {selected.name}
                    <span className="rounded-full border border-emerald-neon/35 bg-emerald-neon/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-soft">{selected.category}</span>
                    {selected.openRooms > 0 && <Badge tone="emerald">{selected.openRooms} live</Badge>}
                  </h2>
                  <p className="mt-0.5 text-xs text-ink-faint">{selected.description}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="cursor-pointer rounded-lg border border-line p-2 text-ink-dim transition hover:border-red-500/40 hover:text-red-300" aria-label="Close launcher"><X size={15} /></button>
            </div>

            <div className="grid items-stretch gap-5 p-5 sm:p-6 lg:grid-cols-12">
              <div className="flex flex-col justify-between gap-5 lg:col-span-7">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-soft/80">How to play</div>
                  <h3 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">{selected.tagline}</h3>
                  <p className="mt-2 max-w-md text-xs leading-relaxed text-ink-faint sm:text-sm">{selected.description}</p>
                </div>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => navigate(`/play/${selected.id}?join=1`)}
                    className="group flex w-full items-center justify-between gap-3.5 rounded-2xl border border-emerald-neon/40 bg-black/50 p-4 text-left transition hover:border-emerald-neon/70 hover:bg-emerald-neon/[.06] cursor-pointer"
                  >
                    <span className="flex min-w-0 items-center gap-3.5">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-neon/40 bg-emerald-neon/12 text-emerald-soft shadow-md"><Globe2 size={19} /></span>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-white transition group-hover:text-emerald-200">Online multiplayer</span>
                        <span className="mt-0.5 block truncate text-xs text-ink-faint">Quick match, ranked ladders, rooms &amp; friend invites</span>
                      </span>
                    </span>
                    <span className="flex h-8 shrink-0 items-center gap-2">
                      <span onClick={(e) => { e.stopPropagation(); navigate(`/play/${selected.id}?quick=1`) }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); navigate(`/play/${selected.id}?quick=1`) } }} className="hidden cursor-pointer items-center gap-1 rounded-lg border border-emerald-neon/45 bg-emerald-neon/12 px-2.5 py-1.5 text-[10px] font-bold text-emerald-soft transition hover:bg-emerald-neon/25 sm:inline-flex"><Zap size={10} /> QUICK</span>
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-line-2 bg-white/[.05] text-ink-dim transition group-hover:translate-x-0.5 group-hover:text-white">→</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/play/${selected.id}?mode=local`)}
                    className="group flex w-full items-center justify-between gap-3.5 rounded-2xl border border-line bg-black/50 p-4 text-left transition hover:border-cyber-cyan/50 hover:bg-cyber-cyan/[.05] cursor-pointer"
                  >
                    <span className="flex min-w-0 items-center gap-3.5">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyber-cyan/35 bg-cyber-cyan/12 text-cyber-cyan shadow-md"><WifiOff size={19} /></span>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-white transition group-hover:text-cyan-200">Pass &amp; Play</span>
                        <span className="mt-0.5 block truncate text-xs text-ink-faint">Two or four players on one device · no account needed</span>
                      </span>
                    </span>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-line-2 bg-white/[.05] text-ink-dim transition group-hover:translate-x-0.5 group-hover:text-white">→</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/play/${selected.id}?bot=1`)}
                    className="group flex w-full items-center justify-between gap-3.5 rounded-2xl border border-line bg-black/50 p-4 text-left transition hover:border-royal/60 hover:bg-royal/[.07] cursor-pointer"
                  >
                    <span className="flex min-w-0 items-center gap-3.5">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-royal/45 bg-royal/12 text-[#b79dfb] shadow-md"><Cpu size={19} /></span>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-white transition group-hover:text-violet-200">vs AI</span>
                        <span className="mt-0.5 block truncate text-xs text-ink-faint">Challenge three genuinely different engines</span>
                      </span>
                    </span>
                    <span className="flex h-8 shrink-0 items-center gap-1.5">
                      {['easy', 'normal', 'best'].map((d, i) => (
                        <span
                          key={d}
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); navigate(`/play/${selected.id}?ai=${d}`) }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); navigate(`/play/${selected.id}?ai=${d}`) } }}
                          className="hidden cursor-pointer rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition hover:brightness-125 lg:inline-flex"
                          style={{ borderColor: ['rgba(16,229,138,.4)', 'rgba(34,211,238,.4)', 'rgba(167,139,250,.5)'][i], color: ['#10e58a', '#22d3ee', '#c4b5fd'][i], background: ['rgba(16,229,138,.07)', 'rgba(34,211,238,.07)', 'rgba(167,139,250,.09)'][i] }}
                        >{['EASY', 'MED', 'HARD'][i]}</span>
                      ))}
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-line-2 bg-white/[.05] text-ink-dim transition group-hover:translate-x-0.5 group-hover:text-white">→</span>
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col rounded-2xl border border-line bg-black/40 p-4 lg:col-span-5">
                <div className="mb-3 flex items-center justify-between gap-2 border-b border-line pb-2.5">
                  <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-soft/80">
                    <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-emerald-neon" /> Live preview
                  </span>
                  <span className="font-mono text-[10px] text-ink-faint">{selected.playTime} · {SEAT_PREVIEW[selected.id] || 2}P</span>
                </div>
                <div className="flex flex-1 items-center justify-center">
                  <GamePreview gameId={selected.id} />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <section>
        <SectionHead icon={DoorOpen} title="Open Rooms" sub="Every public room on the platform right now" />
        <LiveRooms />
      </section>
    </div>
  )
}
