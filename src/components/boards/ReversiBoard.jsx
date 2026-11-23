import React from 'react'

export const BOARD_THEMES = {
  emerald: {
    id: 'emerald',
    name: 'Emerald Arena',
    desc: 'Deep emerald felt, obsidian & pearl discs',
    css: {
      '--rv-frame': 'linear-gradient(145deg, #1a2b23, #0c1611 60%, #060a08)',
      '--rv-surface': 'radial-gradient(120% 120% at 30% 20%, #0f2e20 0%, #0a2016 55%, #06130d 100%)',
      '--rv-line': 'rgba(16, 229, 138, 0.16)',
      '--rv-star': 'rgba(16, 229, 138, 0.5)',
      '--rv-marker': 'rgba(16, 229, 138, 0.85)',
      '--rv-marker-shadow': '0 0 10px rgba(16,229,138,.55)',
      '--rv-dark1': '#132b1f', '--rv-dark2': '#050d08', '--rv-dark-border': 'rgba(16,229,138,.5)',
      '--rv-light1': '#f2fbf5', '--rv-light2': '#b6c8bf', '--rv-light-border': 'rgba(255,255,255,.55)',
      '--rv-frame-glow': '0 24px 60px -24px rgba(16,229,138,.45), inset 0 1px 0 rgba(255,255,255,.06)',
      '--rv-cell-hover': 'rgba(16,229,138,.14)',
      '--rv-last-ring': 'rgba(16,229,138,.75)',
    },
  },
  obsidian: {
    id: 'obsidian',
    name: 'Midnight Obsidian',
    desc: 'Near-black board, silver & graphite discs',
    css: {
      '--rv-frame': 'linear-gradient(145deg, #23262b, #101216 60%, #07080a)',
      '--rv-surface': 'radial-gradient(120% 120% at 30% 20%, #17191d 0%, #101215 55%, #08090b 100%)',
      '--rv-line': 'rgba(148, 163, 184, 0.14)',
      '--rv-star': 'rgba(148, 163, 184, 0.45)',
      '--rv-marker': 'rgba(203, 213, 225, 0.8)',
      '--rv-marker-shadow': '0 0 8px rgba(203,213,225,.4)',
      '--rv-dark1': '#262a31', '--rv-dark2': '#0a0c0f', '--rv-dark-border': 'rgba(148,163,184,.5)',
      '--rv-light1': '#e2e8f0', '--rv-light2': '#94a3b8', '--rv-light-border': 'rgba(255,255,255,.4)',
      '--rv-frame-glow': '0 24px 60px -26px rgba(148,163,184,.35), inset 0 1px 0 rgba(255,255,255,.05)',
      '--rv-cell-hover': 'rgba(203,213,225,.12)',
      '--rv-last-ring': 'rgba(203,213,225,.7)',
    },
  },
  royal: {
    id: 'royal',
    name: 'Royal Violet',
    desc: 'Deep violet board, amethyst & silver discs',
    css: {
      '--rv-frame': 'linear-gradient(145deg, #2b2145, #171130 60%, #0a0716)',
      '--rv-surface': 'radial-gradient(120% 120% at 30% 20%, #241b47 0%, #171130 55%, #0b0819 100%)',
      '--rv-line': 'rgba(167, 139, 250, 0.2)',
      '--rv-star': 'rgba(167, 139, 250, 0.55)',
      '--rv-marker': 'rgba(196, 181, 253, 0.9)',
      '--rv-marker-shadow': '0 0 10px rgba(167,139,250,.6)',
      '--rv-dark1': '#31265c', '--rv-dark2': '#0d0a20', '--rv-dark-border': 'rgba(167,139,250,.55)',
      '--rv-light1': '#f1eeff', '--rv-light2': '#b6a8e8', '--rv-light-border': 'rgba(255,255,255,.5)',
      '--rv-frame-glow': '0 24px 60px -24px rgba(139,92,246,.5), inset 0 1px 0 rgba(255,255,255,.06)',
      '--rv-cell-hover': 'rgba(167,139,250,.16)',
      '--rv-last-ring': 'rgba(196,181,253,.8)',
    },
  },
  classic: {
    id: 'classic',
    name: 'Classic Tournament',
    desc: 'Muted green felt, high-contrast discs',
    css: {
      '--rv-frame': 'linear-gradient(145deg, #3a3126, #221c14 60%, #171208)',
      '--rv-surface': 'radial-gradient(120% 120% at 30% 20%, #1d5c38 0%, #14482c 55%, #0c3020 100%)',
      '--rv-line': 'rgba(0, 0, 0, 0.34)',
      '--rv-star': 'rgba(0, 0, 0, 0.4)',
      '--rv-marker': 'rgba(255, 255, 255, 0.6)',
      '--rv-marker-shadow': '0 1px 4px rgba(0,0,0,.5)',
      '--rv-dark1': '#26262a', '--rv-dark2': '#0a0a0c', '--rv-dark-border': 'rgba(0,0,0,.6)',
      '--rv-light1': '#ffffff', '--rv-light2': '#d3d7d2', '--rv-light-border': 'rgba(0,0,0,.35)',
      '--rv-frame-glow': '0 18px 44px -20px rgba(0,0,0,.8), inset 0 1px 0 rgba(255,255,255,.08)',
      '--rv-cell-hover': 'rgba(255,255,255,.14)',
      '--rv-last-ring': 'rgba(255,255,255,.85)',
    },
  },
}

export function flipsFor(board, pos, player) {
  if (pos < 0 || pos > 63 || board[pos] !== 0) return []
  const r = Math.floor(pos / 8), c = pos % 8
  const dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
  const all = []
  for (const [dr, dc] of dirs) {
    const line = []
    let rr = r + dr, cc = c + dc
    while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
      const p = rr * 8 + cc
      if (board[p] === 0) { line.length = 0; break }
      if (board[p] === player) break
      line.push(p)
      rr += dr; cc += dc
    }
    if (rr < 0 || rr >= 8 || cc < 0 || cc >= 8) continue
    const p = rr * 8 + cc
    if (board[p] === player && line.length) all.push(...line)
  }
  return all
}

const STAR_POINTS = [18, 21, 42, 45] // tournament-style intersection guides

export default function ReversiBoard({ state, mySeat = 0, playing = false, onMove, onPass, theme = 'emerald', lastFlips = null, showHints = true }) {
  const t = BOARD_THEMES[theme] || BOARD_THEMES.emerald
  const myTurn = playing && state.turn === mySeat
  const legal = React.useMemo(() => {
    const moves = {}
    for (let i = 0; i < 64; i++) {
      const f = flipsFor(state.board, i, mySeat + 1)
      if (f.length) moves[i] = f
    }
    return moves
  }, [state.board, mySeat])

  const lastMove = state.lastMove
  const hasMove = playing && Object.keys(legal).length > 0
  const score = (p) => state.board.filter((v) => v === p + 1).length

  return (
    <div className="mx-auto w-full max-w-[480px]" style={t.css} data-reversi-theme={t.id}>
      <div className="rounded-[18px] p-[10px] sm:p-[14px]" style={{ background: 'var(--rv-frame)', boxShadow: 'var(--rv-frame-glow)' }}>
        <div
          className="relative grid grid-cols-8 overflow-hidden rounded-[8px]"
          style={{ background: 'var(--rv-surface)' }}
          role="grid"
          aria-label="Reversi board"
        >
          {Array.from({ length: 7 }, (_, i) => (
            <div key={`h${i}`} className="pointer-events-none absolute" style={{ left: `${((i + 1) / 8) * 100}%`, top: 0, bottom: 0, width: 1, background: 'var(--rv-line)' }} />
          ))}
          {Array.from({ length: 7 }, (_, i) => (
            <div key={`v${i}`} className="pointer-events-none absolute" style={{ top: `${((i + 1) / 8) * 100}%`, left: 0, right: 0, height: 1, background: 'var(--rv-line)' }} />
          ))}
          {STAR_POINTS.map((i) => (
            <div key={`s${i}`} className="pointer-events-none absolute" style={{
              left: `${(((i % 8) + 0.5) / 8) * 100}%`, top: `${((Math.floor(i / 8) + 0.5) / 8) * 100}%`,
              width: 5, height: 5, marginLeft: -2.5, marginTop: -2.5, borderRadius: '50%', background: 'var(--rv-star)',
            }} />
          ))}
          {state.board.map((v, i) => {
            const legalHere = legal[i]
            const isLast = lastMove === i
            const flipIdx = lastFlips ? lastFlips.indexOf(i) : -1
            return (
              <button
                key={i}
                role="gridcell"
                aria-label={`Square ${String.fromCharCode(97 + (i % 8))}${Math.floor(i / 8) + 1}${v ? (v === 1 ? ', dark disc' : ', light disc') : legalHere ? ', legal move' : ''}`}
                disabled={!myTurn || !legalHere}
                onClick={() => myTurn && legalHere && onMove?.({ i })}
                className={`relative aspect-square touch-manipulation transition-colors duration-150 outline-none ${legalHere && myTurn ? 'cursor-pointer' : ''}`}
                style={{ background: legalHere && myTurn ? 'var(--rv-cell-hover)' : 'transparent' }}
              >
                {!v && legalHere && myTurn && showHints && (
                  <span className="absolute left-1/2 top-1/2 h-[26%] w-[26%] -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform hover:scale-125"
                    style={{ background: 'var(--rv-marker)', boxShadow: 'var(--rv-marker-shadow)', animation: 'pulse-glow 2.2s ease-in-out infinite' }} />
                )}
                {!v && legalHere && !myTurn && (
                  <span className="absolute left-1/2 top-1/2 h-[16%] w-[16%] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: 'rgba(255,255,255,.14)' }} />
                )}
                {isLast && (
                  <span className="pointer-events-none absolute inset-[14%] rounded-full" style={{ border: '2px solid var(--rv-last-ring)', animation: 'pop-in .3s ease' }} />
                )}
                {v !== 0 && (
                  <span
                    className="rv-disc absolute inset-[9%]"
                    style={{
                      transform: `rotateY(${v === 1 ? 0 : 180}deg)`,
                      transitionDelay: flipIdx >= 0 ? `${Math.min((flipIdx % 6) * 45, 180)}ms` : '0ms',
                      animation: isLast || flipIdx >= 0 ? 'disc-settle .45s ease' : undefined,
                    }}
                  >
                    <span className="rv-disc-face rv-disc-front" style={{ background: 'linear-gradient(145deg, var(--rv-dark1), var(--rv-dark2))', border: '1.5px solid var(--rv-dark-border)' }} />
                    <span className="rv-disc-face rv-disc-back" style={{ background: 'linear-gradient(145deg, var(--rv-light1), var(--rv-light2))', border: '1.5px solid var(--rv-light-border)' }} />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mx-auto mt-4 flex max-w-[480px] items-center justify-between rounded-xl border border-line bg-white/[.02] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-full" style={{ background: 'linear-gradient(145deg, var(--rv-dark1), var(--rv-dark2))', border: '1px solid var(--rv-dark-border)' }} />
          <span className="text-sm font-bold tabular-nums">{score(0)}</span>
        </div>
        {playing && !hasMove ? (
          <button onClick={onPass} className="cursor-pointer rounded-lg bg-cyber-cyan/15 px-4 py-1.5 text-xs font-bold text-cyber-cyan transition hover:bg-cyber-cyan/25 animate-pulse-glow">
            No moves — Pass turn
          </button>
        ) : (
          <span className={`text-xs font-semibold ${myTurn ? 'text-emerald-soft' : 'text-ink-faint'}`}>
            {myTurn ? 'Your move' : playing ? 'Opponent thinking…' : '—'}
          </span>
        )}
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold tabular-nums">{score(1)}</span>
          <span className="h-3.5 w-3.5 rounded-full" style={{ background: 'linear-gradient(145deg, var(--rv-light1), var(--rv-light2))', border: '1px solid var(--rv-light-border)' }} />
        </div>
      </div>
    </div>
  )
}
