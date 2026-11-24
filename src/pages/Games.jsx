import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ArrowLeft, Filter } from 'lucide-react'
import { api } from '../lib/api.js'
import { GameCard } from '../components/GameCard.jsx'
import { GameModeStage } from '../components/GamePreview.jsx'
import { LiveRooms } from '../components/LiveRooms.jsx'
import { Button } from '../components/UI.jsx'

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

  if (selected) {
    return (
      <div className="animate-fade-in space-y-4">
        <button
          onClick={() => setSelected(null)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line px-4 py-2 text-xs font-semibold text-ink-dim transition hover:border-emerald-neon/40 hover:text-ink"
        >
          <ArrowLeft size={14} /> Back to library
        </button>
        <GameModeStage gameId={selected.id} game={selected} onMode={(key) => navigate(`/play/${selected.id}?panel=${key}`)} />
        <LiveRooms game={selected.id} />
      </div>
    )
  }

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
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-56 rounded-2xl" />)}
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

      <section>
        <LiveRooms />
      </section>
    </div>
  )
}
