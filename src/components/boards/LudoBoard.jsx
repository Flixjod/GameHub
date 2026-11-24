import React from 'react'

// Ludo board geometry (15x15). Seats: 0 Emerald (TL), 1 Rose (TR), 2 Amber (BR), 3 Azure (BL).
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
const YARD_CORNER = [[0, 0], [0, 9], [9, 9], [9, 0]]

export const SEAT_LABELS = ['Emerald', 'Rose', 'Amber', 'Azure']

// Unique board maps — each is a full visual identity, selectable in the lobby.
export const LUDO_MAPS = {
  clubhouse: {
    id: 'clubhouse',
    name: 'Royal Clubhouse',
    desc: 'Walnut wood, cream track, tournament colors',
    css: {
      '--ld-frame': 'linear-gradient(140deg, #6b4a2a 0%, #4a3018 45%, #2c1c0c 100%)',
      '--ld-frame-edge': 'rgba(255, 214, 150, 0.28)',
      '--ld-board': 'linear-gradient(160deg, #efe4c8 0%, #e6d7b4 55%, #d9c69c 100%)',
      '--ld-cell': 'rgba(58, 40, 18, 0.12)',
      '--ld-cell-edge': 'rgba(58, 40, 18, 0.34)',
      '--ld-grid': 'rgba(72, 50, 22, 0.22)',
      '--ld-safe': '#0e7c55',
      '--ld-glow': '0 30px 70px -28px rgba(0,0,0,.9), inset 0 1.5px 2px rgba(255,236,200,.5)',
      '--ld-yard': 'rgba(120, 86, 40, 0.14)',
      '--ld-num': 'rgba(58,40,18,.55)',
    },
    center: ['#0e7c55', '#b3312f', '#c99a1e', '#1d4e9e'],
    seatTint: ['#0e7c55', '#b3312f', '#c99a1e', '#1d4e9e'],
    seatTintDark: ['#063c28', '#5c1715', '#6b4d0a', '#0c2b5e'],
  },
  neon: {
    id: 'neon',
    name: 'Neon Circuit',
    desc: 'Carbon black, glowing neon lanes',
    css: {
      '--ld-frame': 'linear-gradient(140deg, #23262b, #101216 55%, #07080a)',
      '--ld-frame-edge': 'rgba(16, 229, 138, 0.4)',
      '--ld-board': 'radial-gradient(130% 130% at 30% 18%, #10151a 0%, #0a0e12 55%, #05070a 100%)',
      '--ld-cell': 'rgba(255,255,255,.035)',
      '--ld-cell-edge': 'rgba(255,255,255,.12)',
      '--ld-grid': 'rgba(148,163,184,.14)',
      '--ld-safe': '#22d3ee',
      '--ld-glow': '0 30px 70px -28px rgba(16,229,138,.5), inset 0 1px 1px rgba(255,255,255,.08)',
      '--ld-yard': 'rgba(255,255,255,.02)',
      '--ld-num': 'rgba(255,255,255,.4)',
    },
    center: PLAYER_COLORS,
    seatTint: PLAYER_COLORS,
    seatTintDark: PLAYER_DARK,
  },
  ivory: {
    id: 'ivory',
    name: 'Ivory Parlor',
    desc: 'Bone board, brass rails, quiet luxury',
    css: {
      '--ld-frame': 'linear-gradient(140deg, #cdb98c 0%, #a98f57 45%, #6f5a2e 100%)',
      '--ld-frame-edge': 'rgba(255,244,214,.5)',
      '--ld-board': 'linear-gradient(165deg, #f7f1e3 0%, #efe6d0 60%, #e4d7bb 100%)',
      '--ld-cell': 'rgba(120, 96, 48, 0.1)',
      '--ld-cell-edge': 'rgba(120, 96, 48, 0.3)',
      '--ld-grid': 'rgba(120, 96, 48, 0.2)',
      '--ld-safe': '#7a5c14',
      '--ld-glow': '0 30px 70px -28px rgba(0,0,0,.85), inset 0 1.5px 2px rgba(255,250,230,.6)',
      '--ld-yard': 'rgba(150, 120, 60, 0.12)',
      '--ld-num': 'rgba(120,96,48,.6)',
    },
    center: ['#7a5c14', '#8a3a2c', '#9a7514', '#33537e'],
    seatTint: ['#0e7c55', '#b3312f', '#c99a1e', '#1d4e9e'],
    seatTintDark: ['#063c28', '#5c1715', '#6b4d0a', '#0c2b5e'],
  },
  midnight: {
    id: 'midnight',
    name: 'Emerald Atrium',
    desc: 'Deep GameHub felt with emerald lighting',
    css: {
      '--ld-frame': 'linear-gradient(140deg, #1a2b23, #0c1611 60%, #060a08)',
      '--ld-frame-edge': 'rgba(16, 229, 138, 0.35)',
      '--ld-board': 'radial-gradient(130% 130% at 30% 18%, #0f2e20 0%, #0a2016 55%, #06130d 100%)',
      '--ld-cell': 'rgba(255,255,255,.03)',
      '--ld-cell-edge': 'rgba(16,229,138,.25)',
      '--ld-grid': 'rgba(16,229,138,.14)',
      '--ld-safe': '#22d3ee',
      '--ld-glow': '0 30px 70px -28px rgba(16,229,138,.55), inset 0 1px 1px rgba(255,255,255,.06)',
      '--ld-yard': 'rgba(16,229,138,.04)',
      '--ld-num': 'rgba(255,255,255,.4)',
    },
    center: PLAYER_COLORS,
    seatTint: PLAYER_COLORS,
    seatTintDark: PLAYER_DARK,
  },
  dragonforge: {
    id: 'dragonforge',
    name: 'Dragon Forge',
    desc: 'Obsidian slab, molten gold veins, ember glow',
    css: {
      '--ld-frame': 'linear-gradient(140deg, #2b2118 0%, #17100a 50%, #0a0705 100%)',
      '--ld-frame-edge': 'rgba(251, 191, 36, 0.4)',
      '--ld-board': 'radial-gradient(130% 130% at 32% 20%, #1d1710 0%, #120d08 55%, #080604 100%)',
      '--ld-cell': 'rgba(251, 191, 36, 0.05)',
      '--ld-cell-edge': 'rgba(251, 191, 36, 0.22)',
      '--ld-grid': 'rgba(251, 191, 36, 0.14)',
      '--ld-safe': '#fb923c',
      '--ld-glow': '0 30px 70px -28px rgba(251,146,60,.5), inset 0 1px 1px rgba(255,214,150,.1)',
      '--ld-yard': 'rgba(251, 146, 60, 0.04)',
      '--ld-num': 'rgba(255,228,180,.42)',
    },
    center: ['#e11d48', '#fb923c', '#eab308', '#a78bfa'],
    seatTint: ['#e11d48', '#fb923c', '#eab308', '#a78bfa'],
    seatTintDark: ['#4c0d1a', '#5c2406', '#503a04', '#3b2a75'],
  },
  royalgarden: {
    id: 'royalgarden',
    name: 'Royal Garden',
    desc: 'Manor hedge maze, porcelain track, rose accents',
    css: {
      '--ld-frame': 'linear-gradient(140deg, #2e4a34 0%, #1c3322 50%, #0e1d13 100%)',
      '--ld-frame-edge': 'rgba(190, 242, 200, 0.34)',
      '--ld-board': 'linear-gradient(160deg, #f4efe0 0%, #ece5d0 55%, #ddd3ba 100%)',
      '--ld-cell': 'rgba(46, 74, 52, 0.12)',
      '--ld-cell-edge': 'rgba(46, 74, 52, 0.34)',
      '--ld-grid': 'rgba(46, 74, 52, 0.22)',
      '--ld-safe': '#b0486e',
      '--ld-glow': '0 30px 70px -28px rgba(0,0,0,.9), inset 0 1.5px 2px rgba(255,244,224,.55)',
      '--ld-yard': 'rgba(46, 74, 52, 0.1)',
      '--ld-num': 'rgba(46,74,52,.55)',
    },
    center: ['#e11d48', '#7c3aed', '#f59e0b', '#0ea5e9'],
    seatTint: ['#e11d48', '#7c3aed', '#f59e0b', '#0ea5e9'],
    seatTintDark: ['#5c1715', '#3b2a75', '#6b4d0a', '#0c2b5e'],
  },
}

function rc(seat, p) {
  if (p === -1) return null
  if (p === 57) return null
  if (p > 51) return HOME_COLS[seat % 4][p - 52]
  return TRACK[(START_OFFSETS[seat % 4] + p) % 52]
}

function yardSlot(seat, t) {
  const [r, c] = YARD_CORNER[seat % 4]
  const off = [[1.35, 1.35], [1.35, 3.65], [3.65, 1.35], [3.65, 3.65]][t]
  return [r + off[0], c + off[1]]
}

function centerSlot(seat) {
  const offs = [[-1.15, -1.15], [-1.15, 0.7], [0.7, 0.7], [0.7, -1.15]][seat % 4]
  return [7.5 + offs[0], 7.5 + offs[1]]
}

const pct = (v) => `${(v / 15) * 100}%`

// Members of a seat's color family used for cells per map
function seatCellColor(map, seat) { return map.seatTint[seat % 4] }
function seatCellDark(map, seat) { return map.seatTintDark[seat % 4] }

export default function LudoBoard({ state, mySeat, playing, onMove, onRoll, map = 'clubhouse' }) {
  const m = LUDO_MAPS[map] || LUDO_MAPS.clubhouse
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
    const count = {}
    state.tokens.forEach((toks, s) => toks.forEach((p) => {
      if (p >= 0 && p <= 51) {
        const sq = (START_OFFSETS[s % 4] + p) % 52
        count[sq] = (count[sq] || 0) + 1
      }
    }))
    return count
  }, [state.tokens])

  const tokenGroups = React.useMemo(() => {
    const g = new Map()
    state.tokens.forEach((toks, s) => toks.forEach((p, t) => {
      const pos = p === -1 ? yardSlot(s, t) : p === 57 ? centerSlot(s) : rc(s, p)
      if (!pos) return
      const key = `${pos[0]},${pos[1]}`
      if (!g.has(key)) g.set(key, [])
      g.get(key).push({ s, t, pos })
    }))
    return [...g.values()]
  }, [state.tokens])

  const homeCount = (s) => state.tokens[s].filter((p) => p === 57).length

  return (
    <div className="mx-auto w-full max-w-[560px]" style={m.css} data-ludo-map={m.id}>
      <div className="rounded-[26px] p-2.5 sm:p-4" style={{ background: 'var(--ld-frame)', boxShadow: 'var(--ld-glow)', border: '1px solid var(--ld-frame-edge)' }}>
        <div className="relative aspect-square w-full overflow-hidden rounded-[14px]" style={{ background: 'var(--ld-board)', boxShadow: 'inset 0 3px 18px rgba(0,0,0,.35)' }}>

          {/* material grain overlay */}
          <span aria-hidden className="pointer-events-none absolute inset-0" style={{
            background: 'repeating-linear-gradient(112deg, rgba(255,255,255,.05) 0 1px, transparent 1px 6px), repeating-linear-gradient(18deg, rgba(0,0,0,.05) 0 1px, transparent 1px 9px)',
            mixBlendMode: 'overlay',
          }} />

          {/* yards */}
          {YARD_CORNER.map(([r, c], s) => {
            const active = s < seatCount
            const col = seatCellColor(m, s)
            const isTurnSeat = active && state.turn === s && roll == null
            return (
              <div key={`y${s}`} className={`absolute rounded-2xl ${isTurnSeat ? 'animate-yard-turn' : ''}`} style={{
                left: pct(c + 0.3), top: pct(r + 0.3), width: pct(5.4), height: pct(5.4),
                background: active
                  ? `linear-gradient(140deg, ${col}2e, ${m.seatTintDark[s]}66 85%)`
                  : 'var(--ld-yard)',
                border: `1.5px solid ${active ? col + (isTurnSeat ? 'aa' : '66') : 'rgba(128,128,128,.15)'}`,
                boxShadow: active ? `inset 0 0 26px -6px ${col}55, 0 2px 10px rgba(0,0,0,.18)` : 'none',
                color: active ? col : 'transparent',
              }}>
                <div className="absolute inset-[9%] rounded-xl" style={{ border: `1.5px dashed ${active ? col + '55' : 'rgba(128,128,128,.14)'}` }} />
                {active && <span className="absolute left-1/2 top-[6%] -translate-x-1/2 text-[9px] font-extrabold uppercase tracking-[0.18em]" style={{ color: col }}>{SEAT_LABELS[s]}</span>}
              </div>
            )
          })}

          {/* track cells */}
          {TRACK.map(([r, c], idx) => {
            const seatStart = START_OFFSETS.findIndex((off) => off === idx)
            const isSafe = SAFE.has(idx) && seatStart === -1
            const col = seatStart >= 0 ? seatCellColor(m, seatStart) : isSafe ? 'var(--ld-safe)' : null
            const dark = seatStart >= 0 ? seatCellDark(m, seatStart) : null
            return (
              <div key={idx} className="absolute rounded-[4px]" style={{
                left: pct(c + 0.08), top: pct(r + 0.08), width: pct(0.86), height: pct(0.86),
                background: col
                  ? `linear-gradient(145deg, ${col}bb, ${dark}dd)`
                  : 'linear-gradient(145deg, var(--ld-cell), rgba(0,0,0,.02))',
                border: `1px solid ${col ? col + '77' : 'var(--ld-grid)'}`,
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,.08), inset 0 -1px 2px rgba(0,0,0,.12)',
              }}>
                {seatStart >= 0 && (
                  <span className="absolute inset-[28%] rounded-full" style={{
                    background: 'rgba(255,255,255,.85)',
                    boxShadow: `0 0 6px ${col}`,
                  }} />
                )}
                {isSafe && (
                  <span className="absolute inset-[22%] flex items-center justify-center text-[7px]" style={{ color: 'var(--ld-safe)' }}>★</span>
                )}
                {occupied[idx] > 1 && !isSafe && (
                  <span className="absolute -right-0.5 -top-0.5 h-1 w-1 rounded-full bg-white/40" />
                )}
              </div>
            )
          })}

          {/* home columns with arrival markers */}
          {HOME_COLS.slice(0, seatCount).map((cells, s) => cells.map(([r, c], i) => {
            const col = seatCellColor(m, s)
            const dark = seatCellDark(m, s)
            return (
              <div key={`h${s}-${i}`} className="absolute rounded-[4px]" style={{
                left: pct(c + 0.08), top: pct(r + 0.08), width: pct(0.86), height: pct(0.86),
                background: `linear-gradient(145deg, ${col}77, ${dark}99)`,
                border: `1px solid ${col}88`,
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,.1)',
              }}>
                {i === 4 && <span className="absolute inset-[30%] rounded-full" style={{ background: col, boxShadow: `0 0 8px ${col}` }} />}
              </div>
            )
          }))}

          {/* entry arrows — directional chevrons on the cell after each start */}
          {START_OFFSETS.slice(0, seatCount).map((off, s) => {
            const [r, c] = TRACK[off]
            const rot = [0, 90, 180, 270][s]
            return (
              <span key={`a${s}`} className="absolute flex items-center justify-center text-[8px] font-black" style={{
                left: pct(c + 0.08), top: pct(r + 0.08), width: pct(0.86), height: pct(0.86),
                transform: `rotate(${rot}deg)`, color: seatCellColor(m, s), opacity: 0.75,
              }}>➤</span>
            )
          })}

          {/* center finish */}
          <div className="absolute" style={{
            left: pct(6.15), top: pct(6.15), width: pct(2.7), height: pct(2.7),
            background: `conic-gradient(from 45deg, ${m.center[0]}cc, ${m.center[1]}cc, ${m.center[2]}cc, ${m.center[3]}cc, ${m.center[0]}cc)`,
            clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
            borderRadius: '12%',
            filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.3))',
          }} />
          <div className="absolute flex items-center justify-center rounded-full" style={{
            left: pct(7.05), top: pct(7.05), width: pct(0.9), height: pct(0.9),
            background: 'rgba(255,255,255,.9)', boxShadow: '0 0 14px rgba(255,255,255,.5), 0 1px 3px rgba(0,0,0,.4)',
          }}>
            <span className="text-[7px]">🏆</span>
          </div>

          {/* tokens — Ludo-King style stack fanning */}
          {tokenGroups.map((group) => {
            const n = group.length
            const size = n === 1 ? 0.92 : n === 2 ? 0.62 : 0.54
            const dxs = n === 1 ? [[0, 0]]
              : n === 2 ? [[-0.26, 0], [0.26, 0]]
              : n === 3 ? [[-0.24, -0.2], [0.24, -0.2], [0, 0.24]]
              : [[-0.24, -0.24], [0.24, -0.24], [-0.24, 0.24], [0.24, 0.24]]
            return group.map(({ s, t, pos }, gi) => {
              const isMovable = legal.has(t) && state.turn === s
              const [dx, dy] = dxs[gi] || [0, 0]
              const col = m.seatTint[s]
              const dark = m.seatTintDark[s]
              return (
                <React.Fragment key={`${s}-${t}`}>
                  {isMovable && (
                    <span className="absolute rounded-full" style={{
                      left: pct(pos[1] + 0.5 + dx - (size + 0.42) / 2),
                      top: pct(pos[0] + 0.5 + dy - (size + 0.42) / 2),
                      width: pct(size + 0.42), height: pct(size + 0.42),
                      border: `2px solid ${col}`,
                      boxShadow: `0 0 12px ${col}88`,
                      animation: 'pulse-glow 1.4s ease-in-out infinite',
                      pointerEvents: 'none',
                    }} />
                  )}
                  <button
                    key={`${s}-${t}-${pos[0]}-${pos[1]}-${n}`}
                    aria-label={`${SEAT_LABELS[s]} pawn ${t + 1}${n > 1 ? ` (sharing square ${gi + 1} of ${n})` : ''}`}
                    onClick={() => isMovable && onMove({ token: t })}
                    disabled={!isMovable}
                    className={`absolute rounded-full animate-token-land ${isMovable ? 'z-30 cursor-pointer hover:scale-110' : 'z-20'}`}
                    style={{
                      left: pct(pos[1] + 0.5 + dx - size / 2),
                      top: pct(pos[0] + 0.5 + dy - size / 2),
                      width: pct(size), height: pct(size),
                      background: `radial-gradient(circle at 34% 28%, #ffffffcc 0%, ${col} 26%, ${dark} 78%)`,
                      border: `1.5px solid ${isMovable ? '#fff' : col + 'cc'}`,
                      boxShadow: isMovable
                        ? `0 0 14px 3px ${col}bb, 0 4px 8px rgba(0,0,0,.5)`
                        : `0 3px 7px rgba(0,0,0,.55), inset 0 1.5px 2px rgba(255,255,255,.35)`,
                      animation: isMovable ? 'pulse-glow 1.4s ease-in-out infinite' : 'none',
                    }}
                  />
                </React.Fragment>
              )
            })
          })}
        </div>
      </div>

      {/* seat tracker */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        {state.tokens.slice(0, seatCount).map((_, s) => {
          const isTurn = state.turn === s
          const isMe = s === mySeat
          const col = m.seatTint[s]
          return (
            <span key={s} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${isTurn ? 'scale-[1.04]' : 'opacity-70'}`}
              style={{
                borderColor: isTurn ? col : 'rgba(128,128,128,.3)',
                background: isTurn ? col + '1f' : 'rgba(128,128,128,.06)',
                color: isTurn ? col : 'inherit',
                boxShadow: isTurn ? `0 0 14px -2px ${col}88` : 'none',
              }}>
              <span className="h-2 w-2 rounded-full" style={{ background: col, boxShadow: `0 0 6px ${col}99` }} />
              {SEAT_LABELS[s]}{isMe ? ' (you)' : ''}
              <span className="font-mono text-[10px] opacity-75">{homeCount(s)}/4</span>
            </span>
          )
        })}
      </div>

      {/* dice */}
      <div className="mt-3 flex items-center justify-center gap-4">
        <Dice roll={roll} canRoll={myTurn && roll == null} onRoll={onRoll} />
      </div>
    </div>
  )
}

export function Dice({ roll, canRoll, onRoll, rolling }) {
  void rolling
  return (
    <button
      onClick={onRoll}
      disabled={!canRoll}
      className={`group relative flex h-16 w-16 items-center justify-center rounded-2xl border transition-all duration-200 cursor-pointer ${
        canRoll
          ? 'border-emerald-neon/60 bg-emerald-neon/10 hover:bg-emerald-neon/20 shadow-[0_0_24px_-6px_rgba(16,229,138,.7)] scale-100 hover:scale-105 active:scale-95'
          : 'border-line-2 bg-white/[.03]'}`}
      aria-label={roll ? `Dice shows ${roll}` : 'Roll dice'}
    >
      {roll
        ? <Pips key={roll} n={roll} tumble />
        : (
          <span className="relative block h-9 w-9 rounded-xl bg-gradient-to-br from-white/12 to-white/[.04] border border-white/15 shadow-inner">
            <Pips n={6} />
          </span>
        )}
      {canRoll && roll == null && (
        <span className="absolute -bottom-5 text-[9px] font-extrabold uppercase tracking-[0.22em] text-emerald-soft opacity-80">Roll</span>
      )}
    </button>
  )
}

function Pips({ n, tumble }) {
  const pos = {
    1: [[50, 50]],
    2: [[28, 28], [72, 72]],
    3: [[28, 28], [50, 50], [72, 72]],
    4: [[28, 28], [72, 28], [28, 72], [72, 72]],
    5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
    6: [[28, 25], [72, 25], [28, 50], [72, 50], [28, 75], [72, 75]],
  }[n] || []
  return (
    <span className={`relative block h-9 w-9 rounded-xl shadow-[0_4px_10px_-2px_rgba(0,0,0,.7),inset_0_1.5px_2px_rgba(255,255,255,.8),inset_0_-2px_4px_rgba(0,0,0,.18)] border border-black/10 ${tumble ? 'animate-dice-tumble' : ''}`}
      style={{ background: 'linear-gradient(150deg, #ffffff 0%, #eef2ee 60%, #d9e2da 100%)' }}>
      {pos.map(([x, y], i) => (
        <span key={i} className="absolute h-[6px] w-[6px] rounded-full" style={{
          left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)',
          background: 'radial-gradient(circle at 32% 28%, #333d38, #05070a 75%)',
          boxShadow: 'inset 0 1px 1px rgba(0,0,0,.9), 0 0.5px 1px rgba(255,255,255,.55)',
        }} />
      ))}
    </span>
  )
}
