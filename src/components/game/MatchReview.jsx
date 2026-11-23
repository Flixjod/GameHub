import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Play, Pause, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X, Gauge, Sparkles } from 'lucide-react'
import { ENGINES, replayStates } from '../../lib/engines.js'
import ReversiBoard from '../boards/ReversiBoard.jsx'
import TicTacToeBoard from '../boards/TicTacToeBoard.jsx'
import LudoBoard from '../boards/LudoBoard.jsx'
import SnakesBoard from '../boards/SnakesBoard.jsx'
import { Button } from '../UI.jsx'

const SPEEDS = [0.5, 1, 2, 4]

// Move quality derived from actual search analysis (reversi only).
function qualityLabel(diff, alternatives) {
  if (!alternatives) return { label: 'Forced', tone: 'dim' }
  if (diff <= 4) return { label: 'Best available', tone: 'emerald' }
  if (diff <= 30) return { label: 'Good', tone: 'cyan' }
  if (diff <= 90) return { label: 'Inaccuracy', tone: 'gold' }
  return { label: 'Mistake', tone: 'red' }
}

export default function MatchReview({ gameId, moves, seats = [], theme = 'emerald', onClose }) {
  const eng = ENGINES[gameId]
  const states = useMemo(() => replayStates(gameId, moves, seats.length || 2), [gameId, moves, seats])
  const [step, setStep] = useState(Math.max(0, states.length - 1))
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [quality, setQuality] = useState({})
  const qualityPending = useRef(false)

  useEffect(() => { setStep(Math.max(0, states.length - 1)) }, [states])

  useEffect(() => {
    if (!playing) return
    if (step >= states.length - 1) { setPlaying(false); return }
    const t = setTimeout(() => setStep((s) => Math.min(states.length - 1, s + 1)), 1500 / speed)
    return () => clearTimeout(t)
  }, [playing, step, speed, states.length])

  const analyze = (idx) => {
    if (quality[idx] || qualityPending.current || gameId !== 'reversi') return
    const entry = moves[idx]
    if (!entry || entry.action !== 'move') {
      setQuality((q) => ({ ...q, [idx]: { label: entry?.action === 'pass' ? 'Forced' : '—', tone: 'dim' } }))
      return
    }
    const before = states[idx]?.state
    if (!before) return
    qualityPending.current = true
    setTimeout(() => {
      try {
        const ranked = eng.rank(before, entry.seat)
        const chosen = ranked.find((r) => r.move === entry.move?.i)
        const best = ranked[0]
        if (chosen && best) {
          const diff = Math.max(0, best.value - chosen.value)
          setQuality((q) => ({ ...q, [idx]: qualityLabel(diff, ranked.length > 1) }))
        } else {
          setQuality((q) => ({ ...q, [idx]: { label: 'Forced', tone: 'dim' } }))
        }
      } catch { /* analysis unavailable */ }
      qualityPending.current = false
    }, 30)
  }

  useEffect(() => { if (step > 0) analyze(step - 1) }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  const cur = states[Math.min(step, states.length - 1)] || { state: null, label: '' }
  const boardState = cur.state
  const mover = step > 0 && moves[step - 1] ? seats[moves[step - 1].seat] || seats[0] : null
  const scores = boardState && eng?.scoreOf && gameId === 'reversi' ? [0, 1].map((i) => eng.scoreOf(boardState, i)) : null

  const renderBoard = () => {
    if (!boardState) return null
    if (gameId === 'reversi') return <ReversiBoard state={boardState} mySeat={boardState.turn} playing={false} theme={theme} showHints={false} />
    if (gameId === 'tictactoe') return <TicTacToeBoard state={boardState} mySeat={boardState.turn} playing={false} />
    if (gameId === 'ludo') return <LudoBoard state={boardState} mySeat={boardState.turn} playing={false} />
    return <SnakesBoard state={boardState} mySeat={boardState.turn} playing={false} />
  }

  return (
    <section className="animate-fade-in rounded-2xl border border-royal/30 bg-gradient-to-b from-royal/[.06] to-transparent p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-royal/40 bg-royal/15 text-[#c4b5fd]">
          <Sparkles size={18} />
        </span>
        <div>
          <h3 className="text-base font-extrabold">Match Review</h3>
          <p className="text-[11px] text-ink-faint">{moves.length} recorded {moves.length === 1 ? 'action' : 'actions'} · step through every move</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-auto cursor-pointer rounded-lg p-2 text-ink-faint transition hover:bg-white/5 hover:text-ink" aria-label="Close review">
            <X size={17} />
          </button>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-white/[.02] px-4 py-2.5">
            <div className="text-xs">
              <span className="font-bold text-ink">{step === 0 ? 'Initial board' : `Move ${step}`}</span>
              {mover && <span className="ml-2 text-ink-faint">by <span className="font-semibold text-emerald-soft">{mover.displayName}</span></span>}
              {step > 0 && <span className="ml-2 text-ink-faint">· {cur.label}</span>}
            </div>
            {scores && (
              <div className="flex items-center gap-2 text-xs font-bold tabular-nums">
                <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[#132b1f] ring-1 ring-emerald-neon/50" />{scores[0]}</span>
                <span className="text-ink-faint">vs</span>
                <span className="inline-flex items-center gap-1">{scores[1]}<span className="h-2.5 w-2.5 rounded-full bg-[#e9f6ef]" /></span>
              </div>
            )}
          </div>
          {renderBoard()}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-center gap-1.5 rounded-xl border border-line bg-white/[.02] p-2">
            <button className="cursor-pointer rounded-lg p-2 text-ink-dim transition hover:bg-white/5 hover:text-ink disabled:opacity-40" disabled={step === 0} onClick={() => { setPlaying(false); setStep(0) }} aria-label="Jump to start"><ChevronsLeft size={16} /></button>
            <button className="cursor-pointer rounded-lg p-2 text-ink-dim transition hover:bg-white/5 hover:text-ink disabled:opacity-40" disabled={step === 0} onClick={() => { setPlaying(false); setStep((s) => s - 1) }} aria-label="Previous move"><ChevronLeft size={17} /></button>
            <button
              className="cursor-pointer rounded-lg bg-emerald-neon/15 p-2.5 text-emerald-neon transition hover:bg-emerald-neon/25"
              onClick={() => { if (step >= states.length - 1) { setStep(0); setPlaying(true) } else setPlaying((p) => !p) }}
              aria-label={playing ? 'Pause replay' : 'Play replay'}
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button className="cursor-pointer rounded-lg p-2 text-ink-dim transition hover:bg-white/5 hover:text-ink disabled:opacity-40" disabled={step >= states.length - 1} onClick={() => { setPlaying(false); setStep((s) => s + 1) }} aria-label="Next move"><ChevronRight size={17} /></button>
            <button className="cursor-pointer rounded-lg p-2 text-ink-dim transition hover:bg-white/5 hover:text-ink disabled:opacity-40" disabled={step >= states.length - 1} onClick={() => { setPlaying(false); setStep(states.length - 1) }} aria-label="Jump to end"><ChevronsRight size={16} /></button>
          </div>

          <div className="flex items-center justify-center gap-1 rounded-xl border border-line bg-white/[.02] px-3 py-2">
            <Gauge size={13} className="text-ink-faint" />
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`cursor-pointer rounded-md px-2 py-0.5 text-[11px] font-bold transition ${speed === s ? 'bg-emerald-neon/15 text-emerald-soft' : 'text-ink-faint hover:text-ink'}`}
              >
                {s}×
              </button>
            ))}
          </div>

          <div className="max-h-[280px] flex-1 space-y-1 overflow-y-auto rounded-xl border border-line bg-white/[.02] p-2 scrollbar-thin-dark" aria-label="Move list">
            {states.length <= 1 && <p className="py-4 text-center text-[11px] text-ink-faint">No recorded moves — nothing to review yet.</p>}
            {states.length > 1 && states.slice(1).map((st, idx) => {
              const entry = moves[idx] || {}
              const q = quality[idx]
              const active = step === idx + 1
              return (
                <button
                  key={idx}
                  onClick={() => { setPlaying(false); setStep(idx + 1) }}
                  className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition ${active ? 'bg-emerald-neon/[.1] text-ink' : 'text-ink-dim hover:bg-white/[.04]'}`}
                >
                  <span className="w-6 shrink-0 font-mono text-[10px] text-ink-faint">{idx + 1}</span>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-semibold">{seats[entry.seat]?.displayName || `Seat ${entry.seat + 1}`}</span>
                    <span className="ml-1.5 text-ink-faint">
                      {entry.action === 'roll' ? `dice ${entry.roll ?? ''}` : entry.action === 'pass' ? 'passed' : st.label}
                    </span>
                  </span>
                  {q && (
                    <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                      q.tone === 'emerald' ? 'bg-emerald-neon/15 text-emerald-soft'
                        : q.tone === 'cyan' ? 'bg-cyber-cyan/15 text-cyber-cyan'
                        : q.tone === 'gold' ? 'bg-gold/15 text-gold'
                        : q.tone === 'red' ? 'bg-red-500/15 text-red-300'
                        : 'bg-white/[.06] text-ink-faint'}`}>
                      {q.label}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {gameId === 'reversi' && (
            <p className="px-1 text-[10px] leading-relaxed text-ink-faint">
              Move quality is measured with a real depth-limited search — how much the played move loses against the best available move in that position.
            </p>
          )}
          <Button variant="ghost" size="sm" onClick={() => { setStep(0); setPlaying(true) }}>Replay from start</Button>
        </div>
      </div>
    </section>
  )
}
