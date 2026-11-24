import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, DoorOpen, Filter, X, Globe2, WifiOff, Cpu, Zap } from 'lucide-react'
import { api } from '../lib/api.js'
import { GameCard, ModeCard } from '../components/GameCard.jsx'
import { GAME_ART } from '../components/GameArt.jsx'
import { LiveRooms } from '../components/LiveRooms.jsx'
import { SectionHead, Button, Badge } from '../components/UI.jsx'

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
          <div className="rounded-3xl border border-emerald-neon/25 bg-gradient-to-b from-emerald-neon/[.05] to-transparent p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-3 border-b border-line pb-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line-2 text-2xl" style={{ background: 'linear-gradient(140deg, #0f1a15, #0a0f0d)' }}>{GAME_ART[selected.id]?.emoji || '\ud83c\udfae'}</span>
              <div className="min-w-0 flex-1">
                <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">{selected.name} {selected.openRooms > 0 && <Badge tone="emerald">{selected.openRooms} live rooms</Badge>}</h2>
                <p className="text-xs text-ink-faint">{selected.tagline} \u00b7 pick how you want to play</p>
              </div>
              <button onClick={() => setSelected(null)} className="ml-auto cursor-pointer rounded-lg border border-line p-2 text-ink-dim transition hover:text-ink" aria-label="Close launcher"><X size={15} /></button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <ModeCard
                icon={Globe2}
                title="Online"
                tone="emerald"
                bullets={['Ranked Match \u2014 Elo at stake', 'Casual Match \u2014 XP only', 'Rooms, codes & friend invites']}
                onClick={() => navigate(`/play/${selected.id}?join=1`)}
              >
                <div className="mt-3 flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/play/${selected.id}?quick=1`) }} className="flex-1 cursor-pointer rounded-lg border border-emerald-neon/40 bg-emerald-neon/10 px-3 py-1.5 text-[11px] font-bold text-emerald-soft transition hover:bg-emerald-neon/20"><Zap size={11} className="mr-1 inline" />Quick match</button>
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/play/${selected.id}?join=1`) }} className="flex-1 cursor-pointer rounded-lg border border-line px-3 py-1.5 text-[11px] font-bold text-ink-dim transition hover:border-emerald-neon/40 hover:text-ink">Rooms</button>
                </div>
              </ModeCard>
              <ModeCard
                icon={WifiOff}
                title="Offline"
                tone="cyan"
                bullets={['Pass & Play on one device', 'Custom names, undo & hints', 'No account or internet needed']}
                onClick={() => navigate(`/play/${selected.id}?mode=local`)}
              >
                <button onClick={(e) => { e.stopPropagation(); navigate(`/play/${selected.id}?mode=local`) }} className="mt-3 w-full cursor-pointer rounded-lg border border-cyber-cyan/40 bg-cyber-cyan/10 px-3 py-1.5 text-[11px] font-bold text-cyber-cyan transition hover:bg-cyber-cyan/20">Start pass & play</button>
              </ModeCard>
              <ModeCard
                icon={Cpu}
                title="vs AI"
                tone="royal"
                bullets={['Easy \u2014 Casual', 'Medium \u2014 Strategist', 'Hard \u2014 Master']}
                onClick={() => navigate(`/play/${selected.id}?bot=1`)}
              >
                <div className="mt-3 flex gap-2">
                  {['easy', 'normal', 'best'].map((d, i) => (
                    <button key={d} onClick={(e) => { e.stopPropagation(); navigate(`/play/${selected.id}?ai=${d}`) }} className="flex-1 cursor-pointer rounded-lg border px-2 py-1.5 text-[11px] font-bold transition hover:bg-white/[.06]" style={{ borderColor: ['rgba(16,229,138,.4)', 'rgba(34,211,238,.4)', 'rgba(167,139,250,.45)'][i], color: ['#10e58a', '#22d3ee', '#c4b5fd'][i] }}>{['Easy', 'Medium', 'Hard'][i]}</button>
                  ))}
                </div>
              </ModeCard>
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
