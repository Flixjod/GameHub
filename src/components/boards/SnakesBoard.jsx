import React from 'react'
import { Dice } from './LudoBoard.jsx'

const LADDERS = { 4: 25, 13: 46, 33: 49, 42: 63, 50: 69, 62: 81, 74: 92 }
const SNAKES = { 27: 5, 40: 3, 43: 18, 54: 31, 66: 45, 76: 58, 89: 53, 99: 41 }

const PLAYER_COLORS = ['#10e58a', '#f43f5e', '#eab308', '#3b82f6']
const PLAYER_DARK = ['#073b26', '#4c0d1a', '#453203', '#0b2a56']

// Unique board maps — different worlds, selectable in the lobby.
export const SNAKE_MAPS = {
  jungle: {
    id: 'jungle',
    name: 'Jungle Vines',
    desc: 'Deep-rainforest board with emerald serpents',
    css: {
      '--sn-frame': 'linear-gradient(140deg, #1a2b23 0%, #0c1611 55%, #060a08 100%)',
      '--sn-frame-edge': 'rgba(16, 229, 138, 0.35)',
      '--sn-board': 'radial-gradient(130% 130% at 30% 18%, #12371f 0%, #0c2a17 55%, #07170d 100%)',
      '--sn-cell-a': 'rgba(16, 229, 138, 0.10)',
      '--sn-cell-b': 'rgba(6, 20, 12, 0.55)',
      '--sn-cell-edge': 'rgba(16, 229, 138, 0.16)',
      '--sn-num': 'rgba(214, 245, 228, 0.6)',
      '--sn-ladder': '#22d3ee',
      '--sn-snake': '#38e07f',
      '--sn-snake-dark': '#0d5c33',
      '--sn-start': 'rgba(16, 229, 138, 0.3)',
      '--sn-end': 'rgba(234, 179, 8, 0.34)',
      '--sn-glow': '0 30px 70px -28px rgba(16,229,138,.55), inset 0 1px 1px rgba(255,255,255,.06)',
    },
  },
  temple: {
    id: 'temple',
    name: 'Sand Temple',
    desc: 'Sun-baked temple stone and golden asps',
    css: {
      '--sn-frame': 'linear-gradient(140deg, #7a6234 0%, #574322 55%, #33250f 100%)',
      '--sn-frame-edge': 'rgba(255, 226, 152, 0.34)',
      '--sn-board': 'linear-gradient(160deg, #d9c08b 0%, #c8ab74 55%, #b3945e 100%)',
      '--sn-cell-a': 'rgba(120, 92, 40, 0.16)',
      '--sn-cell-b': 'rgba(255, 244, 214, 0.34)',
      '--sn-cell-edge': 'rgba(112, 86, 36, 0.34)',
      '--sn-num': 'rgba(64, 46, 16, 0.7)',
      '--sn-ladder': '#8a5a14',
      '--sn-snake': '#a2680f',
      '--sn-snake-dark': '#5c3a06',
      '--sn-start': 'rgba(14, 124, 85, 0.34)',
      '--sn-end': 'rgba(140, 30, 24, 0.34)',
      '--sn-glow': '0 30px 70px -28px rgba(0,0,0,.9), inset 0 1.5px 2px rgba(255,236,200,.5)',
    },
  },
  frost: {
    id: 'frost',
    name: 'Frost Peaks',
    desc: 'Glacier shelf — ice slides, frozen ladders',
    css: {
      '--sn-frame': 'linear-gradient(140deg, #2a3f55 0%, #16283a 55%, #0b1622 100%)',
      '--sn-frame-edge': 'rgba(125, 211, 252, 0.34)',
      '--sn-board': 'radial-gradient(130% 130% at 30% 18%, #1c3450 0%, #142740 55%, #0c1a2c 100%)',
      '--sn-cell-a': 'rgba(148, 197, 255, 0.12)',
      '--sn-cell-b': 'rgba(6, 14, 26, 0.6)',
      '--sn-cell-edge': 'rgba(148, 197, 255, 0.18)',
      '--sn-num': 'rgba(219, 234, 254, 0.66)',
      '--sn-ladder': '#7dd3fc',
      '--sn-snake': '#38bdf8',
      '--sn-snake-dark': '#0c4a6e',
      '--sn-start': 'rgba(16, 229, 138, 0.34)',
      '--sn-end': 'rgba(234, 179, 8, 0.34)',
      '--sn-glow': '0 30px 70px -28px rgba(56,189,248,.5), inset 0 1px 1px rgba(255,255,255,.08)',
    },
  },
  neon: {
    id: 'neon',
    name: 'Neon Arcade',
    desc: 'Arcade grid with glowing data-serpents',
    css: {
      '--sn-frame': 'linear-gradient(140deg, #2b2145 0%, #171130 55%, #0a0716 100%)',
      '--sn-frame-edge': 'rgba(167, 139, 250, 0.4)',
      '--sn-board': 'radial-gradient(130% 130% at 30% 18%, #1c1338 0%, #130d2c 55%, #0a0720 100%)',
      '--sn-cell-a': 'rgba(167, 139, 250, 0.12)',
      '--sn-cell-b': 'rgba(4, 2, 14, 0.6)',
      '--sn-cell-edge': 'rgba(167, 139, 250, 0.2)',
      '--sn-num': 'rgba(233, 224, 255, 0.6)',
      '--sn-ladder': '#22d3ee',
      '--sn-snake': '#a78bfa',
      '--sn-snake-dark': '#4c1d95',
      '--sn-start': 'rgba(16, 229, 138, 0.34)',
      '--sn-end': 'rgba(244, 63, 94, 0.34)',
      '--sn-glow': '0 30px 70px -28px rgba(139,92,246,.55), inset 0 1px 1px rgba(255,255,255,.06)',
    },
  },
  ocean: {
    id: 'ocean',
    name: 'Sunken Reef',
    desc: 'Abyssal trench, bioluminescent eels, coral ladders',
    css: {
      '--sn-frame': 'linear-gradient(140deg, #0f2f42 0%, #082032 50%, #04121e 100%)',
      '--sn-frame-edge': 'rgba(103, 232, 249, 0.34)',
      '--sn-board': 'radial-gradient(130% 130% at 30% 18%, #0d3a52 0%, #073046 55%, #031522 100%)',
      '--sn-cell-a': 'rgba(103, 232, 249, 0.1)',
      '--sn-cell-b': 'rgba(3, 16, 26, 0.6)',
      '--sn-cell-edge': 'rgba(103, 232, 249, 0.16)',
      '--sn-num': 'rgba(207, 246, 255, 0.6)',
      '--sn-ladder': '#f4a98c',
      '--sn-snake': '#67e8f9',
      '--sn-snake-dark': '#0e5464',
      '--sn-start': 'rgba(16, 229, 138, 0.34)',
      '--sn-end': 'rgba(251, 191, 36, 0.34)',
      '--sn-glow': '0 30px 70px -28px rgba(34,211,238,.5), inset 0 1px 1px rgba(255,255,255,.06)',
    },
  },
  candy: {
    id: 'candy',
    name: 'Candy Carnival',
    desc: 'Pastel licorice snakes, frosting tiles, lollipop rails',
    css: {
      '--sn-frame': 'linear-gradient(140deg, #67306b 0%, #45214d 50%, #26102e 100%)',
      '--sn-frame-edge': 'rgba(251, 207, 232, 0.4)',
      '--sn-board': 'linear-gradient(160deg, #fdeef6 0%, #f7e2ee 55%, #ecd4e4 100%)',
      '--sn-cell-a': 'rgba(103, 48, 107, 0.14)',
      '--sn-cell-b': 'rgba(255, 255, 255, 0.5)',
      '--sn-cell-edge': 'rgba(103, 48, 107, 0.26)',
      '--sn-num': 'rgba(88, 34, 92, 0.66)',
      '--sn-ladder': '#e15a86',
      '--sn-snake': '#7c3aed',
      '--sn-snake-dark': '#4c1d95',
      '--sn-start': 'rgba(16, 185, 129, 0.4)',
      '--sn-end': 'rgba(234, 88, 12, 0.34)',
      '--sn-glow': '0 30px 70px -28px rgba(0,0,0,.85), inset 0 1.5px 2px rgba(255,236,246,.6)',
    },
  },
}

// cell number n (1..100) -> grid [row, col]; row 0 = top
function rc(n) {
  const row = Math.floor((n - 1) / 10)
  let col = (n - 1) % 10
  if (row % 2 === 1) col = 9 - col
  return [9 - row, col]
}

const cellXY = (n) => {
  const [r, c] = rc(n)
  return [c * 10 + 5, r * 10 + 5]
}

export default function SnakesBoard({ state, mySeat, playing, onRoll, map = 'jungle' }) {
  const m = SNAKE_MAPS[map] || SNAKE_MAPS.jungle
  const myTurn = playing && state.turn === mySeat
  const seatCount = state.tokens.length

  // Detect a snake slide or ladder climb on the previous action and spotlight it briefly.
  const [ride, setRide] = React.useState(null) // { from, to, kind }
  React.useEffect(() => {
    const [from, to] = state.lastPath || []
    if (from != null && to != null && from !== to) {
      const kind = LADDERS[from] === to ? 'ladder' : SNAKES[from] === to ? 'snake' : null
      setRide(kind ? { from, to, kind } : null)
      if (kind) {
        const t = setTimeout(() => setRide(null), 1600)
        return () => clearTimeout(t)
      }
    }
  }, [state.lastPath?.[0], state.lastPath?.[1]])

  const stacks = React.useMemo(() => {
    const g = new Map()
    state.tokens.forEach((p, s) => {
      if (!(p > 0 && s < seatCount)) return
      const np = Math.min(p, 100)
      const key = `${rc(np)[0]},${rc(np)[1]}`
      if (!g.has(key)) g.set(key, [])
      g.get(key).push({ s, np })
    })
    return [...g.values()]
  }, [state.tokens, seatCount])

  return (
    <div className="mx-auto w-full max-w-[560px]" style={m.css} data-snake-map={m.id}>
      <div className="rounded-[26px] p-2.5 sm:p-4" style={{ background: 'var(--sn-frame)', boxShadow: 'var(--sn-glow)', border: '1px solid var(--sn-frame-edge)' }}>
        <div className="relative aspect-square w-full overflow-hidden rounded-[14px]" style={{ background: 'var(--sn-board)', boxShadow: 'inset 0 3px 18px rgba(0,0,0,.3)' }}>
          <BoardGrid m={m} />
          {/* vignette + grain */}
          <span aria-hidden className="pointer-events-none absolute inset-0" style={{
            background: 'radial-gradient(120% 120% at 50% 42%, transparent 55%, rgba(0,0,0,.34) 100%)',
          }} />
          <span aria-hidden className="pointer-events-none absolute inset-0" style={{
            background: 'repeating-linear-gradient(118deg, rgba(255,255,255,.05) 0 1px, transparent 1px 7px)',
            mixBlendMode: 'overlay',
          }} />
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {Object.entries(LADDERS).map(([from, to]) => {
              const [x1, y1] = cellXY(+from), [x2, y2] = cellXY(+to)
              return <Ladder key={`L${from}`} x1={x1} y1={y1} x2={x2} y2={y2} color="var(--sn-ladder)" active={ride?.kind === 'ladder' && ride.from === +from} />
            })}
            {Object.entries(SNAKES).map(([from, to]) => (
              <Snake key={`S${from}`} from={+from} to={+to} m={m} active={ride?.kind === 'snake' && ride.from === +from} />
            ))}
          </svg>

          {/* destination highlight */}
          {state.lastPath?.[0] != null && <CellMark n={state.lastPath[0]} color="#ffffff" alpha=".22" />}
          {state.lastPath?.[1] != null && <CellMark n={state.lastPath[1]} color={PLAYER_COLORS[state.turn]} alpha=".3" />}

          {/* tokens — stacked players fan out */}
          {stacks.map((group) => {
            const n = group.length
            const size = n === 1 ? 7 : n === 2 ? 5.2 : 4.6
            const dxs = n === 1 ? [[0, 0]]
              : n === 2 ? [[-1.5, 0], [1.5, 0]]
              : n === 3 ? [[-1.5, -1.1], [1.5, -1.1], [0, 1.4]]
              : [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]
            return group.map(({ s, np }, gi) => {
              const [r, c] = rc(np)
              const [dx, dy] = dxs[gi] || [0, 0]
              return (
                <span
                  key={`${s}-${gi}-${np}`}
                  className="absolute z-10 rounded-full border-2 animate-token-land"
                  style={{
                    left: `${c * 10 + 5 + dx - size / 2}%`, top: `${r * 10 + 5 + dy - size / 2}%`,
                    width: `${size}%`, height: `${size}%`,
                    background: `radial-gradient(circle at 34% 28%, #ffffffcc 0%, ${PLAYER_COLORS[s]} 26%, ${PLAYER_DARK[s]} 80%)`,
                    borderColor: PLAYER_COLORS[s] + 'dd',
                    boxShadow: `0 0 10px ${PLAYER_COLORS[s]}88, 0 3px 6px rgba(0,0,0,.6), inset 0 1.5px 2px rgba(255,255,255,.35)`,
                  }}
                />
              )
            })
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-4">
        <Dice roll={state.lastRoll && state.lastPath?.length ? state.lastRoll : null} canRoll={myTurn} onRoll={onRoll} />
      </div>
    </div>
  )
}

function BoardGrid({ m }) {
  return (
    <div className="absolute inset-2 grid grid-cols-10 grid-rows-10 gap-[2px]">
      {Array.from({ length: 100 }).map((_, n0) => {
        const n = n0 + 1
        const [r, c] = rc(n)
        const shade = (r + c) % 2 === 0
        return (
          <div key={n} className="relative flex items-center justify-start rounded-[5px]"
            style={{
              gridRow: r + 1, gridColumn: c + 1,
              background: shade ? 'var(--sn-cell-a)' : 'var(--sn-cell-b)',
              border: '1px solid var(--sn-cell-edge)',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,.05)',
            }}>
            <span className="absolute left-1 top-0.5 text-[8px] font-bold sm:text-[9px]" style={{ color: 'var(--sn-num)' }}>{n}</span>
            {n === 1 && <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px]">🏁</span>}
            {n === 100 && <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px]">🏆</span>}
          </div>
        )
      })}
    </div>
  )
}

function Ladder({ x1, y1, x2, y2, color, active }) {
  void color
  const len = Math.hypot(x2 - x1, y2 - y1)
  const rungs = Math.max(3, Math.round(len / 4.5))
  return (
    <g style={{ opacity: active ? 1 : 0.8, filter: active ? 'drop-shadow(0 0 3px #a7f3d0) drop-shadow(0 0 6px #34d399)' : 'none' }}>
      <line x1={x1 - 1.7} y1={y1} x2={x2 - 1.7} y2={y2} stroke={color} strokeWidth="0.9" opacity=".75" strokeLinecap="round" />
      <line x1={x1 + 1.7} y1={y1} x2={x2 + 1.7} y2={y2} stroke={color} strokeWidth="0.9" opacity=".75" strokeLinecap="round" />
      {Array.from({ length: rungs }).map((_, i) => {
        const t = (i + 1) / (rungs + 1)
        const rx1 = x1 + (x2 - x1) * t - 1.7, rx2 = x1 + (x2 - x1) * t + 1.7
        const ry = y1 + (y2 - y1) * t
        return <line key={i} x1={rx1} y1={ry} x2={rx2} y2={ry} stroke={color} strokeWidth="0.65" opacity=".5" strokeLinecap="round" />
      })}
    </g>
  )
}

function Snake({ from, to, m, active }) {
  void m
  const [x1, y1] = cellXY(from), [x2, y2] = cellXY(to)
  // sinuous body: 3 quadratic waves
  const segs = 24
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
  const nx = -(y2 - y1) / Math.max(Math.hypot(x2 - x1, y2 - y1), 0.01), ny = (x2 - x1) / Math.max(Math.hypot(x2 - x1, y2 - y1), 0.01)
  const amp = 4.2
  const pts = Array.from({ length: segs + 1 }, (_, i) => {
    const t = i / segs
    const w = Math.sin(t * Math.PI * 3) * amp * Math.sin(t * Math.PI)
    return [x1 + (x2 - x1) * t + nx * w, y1 + (y2 - y1) * t + ny * w]
  })
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ')
  const headDirX = pts[1][0] - pts[0][0], headDirY = pts[1][1] - pts[0][1]
  return (
    <g>
      <path d={d} stroke="var(--sn-snake-dark)" strokeWidth="2.3" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity=".9" />
      <path d={d} stroke="var(--sn-snake)" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {active && (
        <path d={d} stroke="#d9f99d" strokeWidth="1.1" fill="none" strokeLinecap="round" strokeDasharray="4 9"
          className="animate-dash-flow" style={{ filter: 'drop-shadow(0 0 3px rgba(217,249,157,.9))' }} />
      )}
      <circle cx={x1 + headDirX * 0.6} cy={y1 + headDirY * 0.6} r="2.1" fill="var(--sn-snake)" stroke="var(--sn-snake-dark)" strokeWidth="0.5" />
      <circle cx={x1 + headDirX * 0.25 + nx * 0.8} cy={y1 + headDirY * 0.25 + ny * 0.8} r="0.45" fill="#fff" />
      <circle cx={x1 + headDirX * 0.25 - nx * 0.8} cy={y1 + headDirY * 0.25 - ny * 0.8} r="0.45" fill="#fff" />
      <circle cx={x2} cy={y2} r="1.1" fill="var(--sn-snake)" opacity=".55" />
    </g>
  )
}

function CellMark({ n, color, alpha }) {
  const [r, c] = rc(n)
  return <span className="absolute z-[5] rounded-md transition-all duration-500" style={{ left: `${c * 10 + 1.2}%`, top: `${r * 10 + 1.2}%`, width: '7.6%', height: '7.6%', background: color + Math.round(alpha * 255).toString(16).padStart(2, '0'), boxShadow: `0 0 12px ${color}66` }} />
}
