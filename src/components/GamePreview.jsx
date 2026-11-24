import React from 'react'
import { Globe2, WifiOff, Cpu } from 'lucide-react'
import { Badge } from './UI.jsx'
import { GAME_ART } from './GameArt.jsx'
import { ENGINES } from '../lib/engines.js'
import { GAME_META } from '../lib/gameMeta.js'
import TicTacToeBoard from './boards/TicTacToeBoard.jsx'
import ReversiBoard from './boards/ReversiBoard.jsx'
import LudoBoard from './boards/LudoBoard.jsx'
import SnakesBoard from './boards/SnakesBoard.jsx'

export const SEAT_PREVIEW = { tictactoe: 2, reversi: 2, ludo: 4, snakes: 2 }

export const GAME_MODES = [
  { key: 'online', label: 'Online multiplayer', sub: 'Rooms, quick matchmaking, ranked & friend invites', Icon: Globe2 },
  { key: 'local', label: 'Pass & Play', sub: 'Two\u2013four players on one device \u00b7 no account needed', Icon: WifiOff },
  { key: 'ai', label: 'vs AI', sub: 'Three genuinely different engines \u00b7 easy to master', Icon: Cpu },
]

const ACCENTS = {
  online: { icon: 'border-emerald-neon/40 bg-emerald-neon/12 text-emerald-soft', hover: 'hover:border-emerald-neon/70 hover:bg-emerald-neon/[.06]', text: 'group-hover:text-emerald-200' },
  local: { icon: 'border-cyber-cyan/35 bg-cyber-cyan/12 text-cyber-cyan', hover: 'hover:border-cyber-cyan/60 hover:bg-cyber-cyan/[.05]', text: 'group-hover:text-cyan-200' },
  ai: { icon: 'border-royal/45 bg-royal/12 text-[#b79dfb]', hover: 'hover:border-royal/70 hover:bg-royal/[.07]', text: 'group-hover:text-violet-200' },
}

export function GamePreview({ gameId }) {
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

export function GameModeRow({ modeKey, onMode }) {
  const row = GAME_MODES.find((m) => m.key === modeKey)
  const a = ACCENTS[modeKey]
  return (
    <button
      type="button"
      onClick={() => onMode(modeKey)}
      className={`group flex w-full cursor-pointer items-center justify-between gap-3.5 rounded-2xl border border-line bg-black/50 p-4 text-left transition ${a.hover}`}
    >
      <span className="flex min-w-0 items-center gap-3.5">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-md ${a.icon}`}><row.Icon size={19} /></span>
        <span className="min-w-0">
          <span className={`block text-sm font-bold text-white transition ${a.text}`}>{row.label}</span>
          <span className="mt-0.5 block truncate text-xs text-ink-faint">{row.sub}</span>
        </span>
      </span>
      <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-line-2 bg-white/[.05] text-ink-dim transition group-hover:translate-x-0.5 group-hover:text-white">→</span>
    </button>
  )
}

/**
 * Shared Reversi-style stage: header bar + how-to-play + three mode rows + live engine preview.
 * bare — omit the header bar (a page header already shows above).
 * noPreview — rows only (used when a hero already shows the board).
 */
export function GameModeStage({ gameId, game, onMode, bare = false, noPreview = false }) {
  const art = GAME_ART[gameId] || GAME_ART.more
  const meta = game || GAME_META[gameId] || null
  const seats = SEAT_PREVIEW[gameId] || 2
  return (
    <div className="overflow-hidden rounded-3xl border border-line shadow-[0_24px_60px_-28px_rgba(0,0,0,.9)]" style={{ background: 'linear-gradient(160deg, #0a120e, #070b09)' }}>
      {!bare && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line-2 text-2xl shadow-lg" style={{ background: 'linear-gradient(140deg, #0f1a15, #0a0f0d)' }}>{art.emoji}</span>
            <div>
              <h2 className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight">
                {meta?.name || gameId}
                <span className="rounded-full border border-emerald-neon/35 bg-emerald-neon/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-soft">{meta?.category || 'Classic'}</span>
                {meta?.openRooms > 0 && <Badge tone="emerald">{meta.openRooms} live</Badge>}
              </h2>
              {meta?.description && <p className="mt-0.5 max-w-lg text-xs text-ink-faint">{meta.description}</p>}
            </div>
          </div>
          <span className="font-mono text-[10px] text-ink-faint">{meta?.playTime || '3 min'} · {seats}P</span>
        </div>
      )}

      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-12">
        <div className={noPreview ? 'lg:col-span-12' : 'lg:col-span-7'}>
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-soft/80">How to play</div>
          {!bare && meta?.tagline && <h3 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">{meta.tagline}</h3>}
          {meta?.description && <p className="mt-2 max-w-md text-xs leading-relaxed text-ink-faint sm:text-sm">{meta.description}</p>}
          <div className={!bare && meta?.tagline ? 'mt-5 space-y-2.5' : 'mt-4 space-y-2.5'}>
            {GAME_MODES.map((m) => <GameModeRow key={m.key} modeKey={m.key} onMode={onMode} />)}
          </div>
        </div>

        {!noPreview && (
          <div className="flex flex-col rounded-2xl border border-line bg-black/40 p-4 lg:col-span-5">
            <div className="mb-3 flex items-center justify-between gap-2 border-b border-line pb-2.5">
              <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-soft/80">
                <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-emerald-neon" /> Live preview
              </span>
              <span className="font-mono text-[10px] text-ink-faint">{seats}P · real rules</span>
            </div>
            <div className="flex flex-1 items-center justify-center">
              <GamePreview gameId={gameId} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
