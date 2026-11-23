import React from 'react'
import { Dice } from './LudoBoard.jsx'

const LADDERS = { 4: 25, 13: 46, 33: 49, 42: 63, 50: 69, 62: 81, 74: 92 }
const SNAKES = { 27: 5, 40: 3, 43: 18, 54: 31, 66: 45, 76: 58, 89: 53, 99: 41 }

const PLAYER_COLORS = ['#10e58a', '#f43f5e', '#eab308', '#3b82f6']

// cell number n (1..100) -> grid [row, col] row 0 = top
function rc(n) {
  const row = Math.floor((n - 1) / 10)
  let col = (n - 1) % 10
  if (row % 2 === 1) col = 9 - col
  return [9 - row, col]
}

export default function SnakesBoard({ state, mySeat, playing, onRoll }) {
  const myTurn = playing && state.turn === mySeat
  const seatCount = state.tokens.length

  return (
    <div className="mx-auto w-full max-w-[460px]">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-line-2 bg-[#0a0d13] p-2 shadow-[inset_0_2px_24px_rgba(0,0,0,.6)]">
        <BoardGrid />
        {/* ladders & snakes curves */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {Object.entries(LADDERS).map(([from, to]) => {
            const [r1, c1] = rc(+from), [r2, c2] = rc(+to)
            const x1 = c1 * 10 + 5, y1 = r1 * 10 + 5, x2 = c2 * 10 + 5, y2 = r2 * 10 + 5
            return (
              <g key={`L${from}`}>
                <line x1={x1 - 1.6} y1={y1} x2={x2 - 1.6} y2={y2} stroke="#22d3ee" strokeWidth="0.9" opacity=".5" />
                <line x1={x1 + 1.6} y1={y1} x2={x2 + 1.6} y2={y2} stroke="#22d3ee" strokeWidth="0.9" opacity=".5" />
                {Array.from({ length: 4 }).map((_, i) => {
                  const t = (i + 1) / 5
                  return <line key={i} x1={x1 + (x2 - x1) * t - 1.6} y1={y1 + (y2 - y1) * t} x2={x1 + (x2 - x1) * t + 1.6} y2={y1 + (y2 - y1) * t} stroke="#22d3ee" strokeWidth="0.7" opacity=".45" />
                })}
              </g>
            )
          })}
          {Object.entries(SNAKES).map(([from, to]) => {
            const [r1, c1] = rc(+from), [r2, c2] = rc(+to)
            const x1 = c1 * 10 + 5, y1 = r1 * 10 + 5, x2 = c2 * 10 + 5, y2 = r2 * 10 + 5
            const mx = (x1 + x2) / 2 + (r1 % 2 ? 6 : -6), my = (y1 + y2) / 2
            return <path key={`S${from}`} d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`} stroke="#10e58a" strokeWidth="1.4" fill="none" opacity=".65" strokeLinecap="round" />
          })}
        </svg>

        {/* destination highlight */}
        {state.lastPath?.[0] != null && <CellMark n={state.lastPath[0]} color="#ffffff" alpha=".25" />}
        {state.lastPath?.[1] != null && <CellMark n={state.lastPath[1]} color={PLAYER_COLORS[state.turn]} alpha=".35" />}

        {/* tokens */}
        {state.tokens.map((p, s) => p > 0 && p <= 100 && (
          <TokenChip key={s} p={Math.min(p, 100)} s={s} show={p > 0 && s < seatCount} />
        ))}
      </div>

      <div className="mt-4 flex items-center justify-center gap-4">
        <Dice roll={state.lastRoll && state.lastPath?.length ? state.lastRoll : null} canRoll={myTurn} onRoll={onRoll} />
      </div>
    </div>
  )
}

function BoardGrid() {
  return (
    <div className="absolute inset-2 grid grid-cols-10 grid-rows-10 gap-[2px]">
      {Array.from({ length: 100 }).map((_, n0) => {
        const n = n0 + 1
        const [r, c] = rc(n)
        const shade = (r + c) % 2 === 0
        return (
          <div key={n} className="relative flex items-center justify-start rounded-[4px] border border-white/[.04]" style={{ gridRow: r + 1, gridColumn: c + 1, background: shade ? 'rgba(255,255,255,.028)' : 'rgba(139,92,246,.05)' }}>
            <span className="absolute left-0.5 top-0.5 text-[8px] font-bold text-white/25 sm:text-[9px]">{n}</span>
            {LADDERS[n] && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] opacity-45">🪜</span>}
            {SNAKES[n] && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] opacity-45">🐍</span>}
          </div>
        )
      })}
    </div>
  )
}

function CellMark({ n, color, alpha }) {
  const [r, c] = rc(n)
  return <span className="absolute z-[5] rounded-md transition-all duration-500" style={{ left: `${c * 10 + 1.2}%`, top: `${r * 10 + 1.2}%`, width: '7.6%', height: '7.6%', background: color + Math.round(alpha * 255).toString(16).padStart(2, '0'), boxShadow: `0 0 12px ${color}66` }} />
}

function TokenChip({ p, s, show }) {
  if (!show) return null
  const [r, c] = rc(p)
  const jitter = s * 0.9
  return (
    <span
      className="absolute z-10 rounded-full border-2 transition-all duration-500 ease-out"
      style={{
        left: `${c * 10 + 2.4 + jitter}%`, top: `${r * 10 + 2.4}%`,
        width: '7%', height: '7%',
        background: `radial-gradient(circle at 35% 30%, ${PLAYER_COLORS[s]}ee, #00000066)`,
        borderColor: PLAYER_COLORS[s],
        boxShadow: `0 0 10px ${PLAYER_COLORS[s]}88, 0 2px 4px rgba(0,0,0,.6)`,
      }}
    />
  )
}
