import React from 'react'

// Ludo board geometry (15x15). Seats: 0 green(TL-left arm), 1 red(top-right arm),
// 2 yellow(right-bottom), 3 blue(bottom-left-ish) — classic track below.
const TRACK = [
  [6,1],[6,2],[6,3],[6,4],[6,5],
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
  [0,7],
  [0,8],[1,8],[2,8],[3,8],[4,8],[5,8],
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
  [7,14],
  [8,14],[8,13],[8,12],[8,11],[8,10],[8,9],
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
  [14,7],
  [14,6],[13,6],[12,6],[11,6],[10,6],[9,6],
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],
  [7,0],[6,0],
]
const HOME_COLS = [
  [[7,1],[7,2],[7,3],[7,4],[7,5]],
  [[1,7],[2,7],[3,7],[4,7],[5,7]],
  [[7,13],[7,12],[7,11],[7,10],[7,9]],
  [[13,7],[12,7],[11,7],[10,7],[9,7]],
]
const START_OFFSETS = [0, 13, 26, 39]
const PLAYER_COLORS = ['#10e58a', '#f43f5e', '#eab308', '#3b82f6']
const PLAYER_DARK = ['#073b26', '#4c0d1a', '#453203', '#0b2a56']
const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47])

export const SEAT_LABELS = ['Emerald', 'Rose', 'Amber', 'Azure']

function rc(seat, p) {
  if (p === -1) return null // yard
  if (p === 57) return null // center home
  if (p > 51) return HOME_COLS[seat % 4][p - 52]
  return TRACK[(START_OFFSETS[seat % 4] + p) % 52]
}

function yardSlot(seat, t) {
  const corners = [[0, 0], [0, 9], [9, 9], [9, 0]]
  const [r, c] = corners[seat % 4]
  const off = [[1.4, 1.4], [1.4, 3.1], [3.4, 1.4], [3.4, 3.1]][t]
  return [r + off[0], c + off[1]]
}

function centerSlot(seat) {
  const offs = [[-1.1, -1.1], [-1.1, 0.6], [0.6, 0.6], [0.6, -1.1]][seat % 4]
  return [7.5 + offs[0], 7.5 + offs[1]]
}

const pct = (v) => `${(v / 15) * 100}%`

export default function LudoBoard({ state, mySeat, playing, onMove, onRoll }) {
  const seatCount = state.tokens.length
  const roll = state.roll
  const myTurn = playing && state.turn === mySeat

  const legal = React.useMemo(() => {
    if (!myTurn || roll == null) return new Set()
    const set = new Set()
    const toks = state.tokens[mySeat]
    for (let t = 0; t < 4; t++) {
      if (toks[t] === 57) continue
      if (toks[t] === -1) { if (roll === 6) set.add(t); continue }
      if (toks[t] + roll <= 57) set.add(t)
    }
    return set
  }, [myTurn, roll, state.tokens, mySeat])

  const occupied = React.useMemo(() => {
    // map seat->Set of ring squares for capture ring marks
    const map = {}
    state.tokens.forEach((toks, s) => toks.forEach((p) => {
      if (p >= 0 && p <= 51) {
        const sq = (START_OFFSETS[s % 4] + p) % 52
        ;(map[sq] ||= []).push(s)
      }
    }))
    return map
  }, [state.tokens])

  return (
    <div className="mx-auto w-full max-w-[440px]">
      <div className="relative aspect-square w-full rounded-2xl border border-line-2 bg-[#08110d] p-2 shadow-[inset_0_2px_24px_rgba(0,0,0,.6)] overflow-hidden">
        {/* yards */}
        {[[0, 0], [0, 9], [9, 9], [9, 0]].map(([r, c], s) => (
          <div
            key={s}
            className="absolute rounded-xl border"
            style={{
              left: pct(c + 0.15), top: pct(r + 0.15), width: pct(5.7), height: pct(5.7),
              background: s < seatCount ? `linear-gradient(140deg, ${PLAYER_COLORS[s]}22, ${PLAYER_DARK[s]}55)` : 'rgba(255,255,255,.02)',
              borderColor: s < seatCount ? PLAYER_COLORS[s] + '55' : '#1e332855',
              boxShadow: s < seatCount ? `0 0 24px -8px ${PLAYER_COLORS[s]}66` : 'none',
            }}
          >
            <div className="absolute inset-[14%] rounded-lg border border-dashed" style={{ borderColor: (s < seatCount ? PLAYER_COLORS[s] : '#1e3328') + '44' }} />
          </div>
        ))}

        {/* track cells */}
        {TRACK.map(([r, c], idx) => {
          const startSquares = START_OFFSETS.slice(0, seatCount)
          const isStart = startSquares.includes(idx) === false ? false : idx === START_OFFSETS[0] ? 0 : START_OFFSETS.indexOf(idx)
          const seatStart = START_OFFSETS.findIndex((off) => off === idx)
          const isSafe = SAFE.has(idx) && seatStart === -1
          const color = seatStart >= 0 ? PLAYER_COLORS[seatStart] : isSafe ? '#22d3ee' : null
          return (
            <div
              key={idx}
              className="absolute rounded-[3px] border"
              style={{
                left: pct(c + 0.18), top: pct(r + 0.18), width: pct(5.5), height: pct(5.5),
                background: color ? color + (seatStart >= 0 ? 'aa' : '1e') : 'rgba(255,255,255,.025)',
                borderColor: color ? color + '66' : 'rgba(255,255,255,.06)',
              }}
            >
              {isSafe && <span className="absolute inset-[30%] rounded-full border border-cyber-cyan/50" />}
              {occupied[idx] && <span className="absolute -top-0.5 -right-0.5 h-1 w-1 rounded-full bg-white/30" />}
            </div>
          )
        })}

        {/* home columns */}
        {HOME_COLS.slice(0, seatCount).map((col, s) => col.map(([r, c], i) => (
          <div
            key={`${s}-${i}`}
            className="absolute rounded-[3px] border"
            style={{
              left: pct(c + 0.18), top: pct(r + 0.18), width: pct(5.5), height: pct(5.5),
              background: PLAYER_COLORS[s] + '55', borderColor: PLAYER_COLORS[s] + '77',
            }}
          />
        )))}

        {/* center home */}
        <div className="absolute rounded-lg border border-gold/40" style={{ left: pct(6.15), top: pct(6.15), width: pct(2.7), height: pct(2.7), background: 'conic-gradient(from 45deg, #10e58a44, #f43f5e44, #eab30844, #3b82f644, #10e58a44)' }} />

        {/* tokens */}
        {state.tokens.map((toks, s) => toks.map((p, t) => {
          const pos = p === -1 ? yardSlot(s, t) : p === 57 ? centerSlot(s) : rc(s, p)
          if (!pos) return null
          const isMovable = legal.has(t) && state.turn === s
          return (
            <button
              key={`${s}-${t}`}
              aria-label={`${SEAT_LABELS[s]} token ${t + 1}`}
              onClick={() => isMovable && onMove({ token: t })}
              disabled={!isMovable}
              className={`absolute z-10 rounded-full border-2 transition-all duration-500 ease-out ${isMovable ? 'cursor-pointer hover:scale-110 z-20' : 'cursor-default'}`}
              style={{
                left: pct(pos[1] + 0.3), top: pct(pos[0] + 0.3), width: pct(5.3), height: pct(5.3),
                background: `radial-gradient(circle at 35% 30%, ${PLAYER_COLORS[s]}dd, ${PLAYER_DARK[s]})`,
                borderColor: isMovable ? '#fff' : PLAYER_COLORS[s] + 'cc',
                boxShadow: isMovable
                  ? `0 0 14px 2px ${PLAYER_COLORS[s]}aa, 0 3px 6px rgba(0,0,0,.5)`
                  : `0 2px 5px rgba(0,0,0,.55)`,
                animation: isMovable ? 'pulse-glow 1.4s ease-in-out infinite' : 'none',
              }}
            />
          )
        }))}
      </div>

      {/* dice */}
      <div className="mt-4 flex items-center justify-center gap-4">
        <Dice roll={roll} canRoll={myTurn && roll == null} onRoll={onRoll} />
      </div>
    </div>
  )
}

export function Dice({ roll, canRoll, onRoll, rolling }) {
  return (
    <button
      onClick={onRoll}
      disabled={!canRoll || rolling}
      className={`relative flex h-16 w-16 items-center justify-center rounded-2xl border transition cursor-pointer ${
        canRoll
          ? 'border-emerald-neon/60 bg-emerald-neon/10 hover:bg-emerald-neon/20 shadow-[0_0_24px_-6px_rgba(16,229,138,.7)] animate-pulse-glow scale-100 hover:scale-105'
          : 'border-line-2 bg-white/[.03]'}`}
      aria-label={roll ? `Dice shows ${roll}` : 'Roll dice'}
    >
      {rolling ? <span className="animate-dice text-2xl">🎲</span> : roll ? <Pips n={roll} /> : <span className="text-2xl opacity-60">🎲</span>}
    </button>
  )
}

function Pips({ n }) {
  const pos = {
    1: [[50, 50]],
    2: [[28, 28], [72, 72]],
    3: [[28, 28], [50, 50], [72, 72]],
    4: [[28, 28], [72, 28], [28, 72], [72, 72]],
    5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
    6: [[28, 25], [72, 25], [28, 50], [72, 50], [28, 75], [72, 75]],
  }[n] || []
  return (
    <span className="relative block h-9 w-9 animate-dice rounded-lg bg-[#f2f7f4] shadow-inner" key={n}>
      {pos.map(([x, y], i) => (
        <span key={i} className="absolute rounded-full bg-[#0a0f0d]" style={{ width: 5, height: 5, left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)' }} />
      ))}
    </span>
  )
}
