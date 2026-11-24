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
      '--rv-frame-border': 'rgba(16,229,138,.28)',
      '--rv-accent': '#10e58a',
      '--rv-accent-glow': 'rgba(16,229,138,.55)',
      '--rv-surface-alt': 'rgba(255,255,255,.012)',
      '--rv-marker-glow': 'rgba(16,229,138,.25)',
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
      '--rv-frame-border': 'rgba(148,163,184,.24)',
      '--rv-accent': '#94a3b8',
      '--rv-accent-glow': 'rgba(148,163,184,.4)',
      '--rv-surface-alt': 'rgba(255,255,255,.01)',
      '--rv-marker-glow': 'rgba(203,213,225,.2)',
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
      '--rv-frame-border': 'rgba(167,139,250,.3)',
      '--rv-accent': '#a78bfa',
      '--rv-accent-glow': 'rgba(167,139,250,.55)',
      '--rv-surface-alt': 'rgba(255,255,255,.012)',
      '--rv-marker-glow': 'rgba(167,139,250,.25)',
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
      '--rv-frame-border': 'rgba(255,244,214,.22)',
      '--rv-accent': '#e7e2d0',
      '--rv-accent-glow': 'rgba(231,226,208,.35)',
      '--rv-surface-alt': 'rgba(0,0,0,.07)',
      '--rv-marker-glow': 'rgba(255,255,255,.22)',
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
    <div className="mx-auto w-full max-w-[500px]" style={t.css} data-reversi-theme={t.id}>
      {/* Grandmaster tournament frame — metal rail, corner rivets, coordinate scales */}
      <div
        className="relative rounded-[22px] p-[14px] sm:p-[18px]"
        style={{
          background: 'var(--rv-frame)',
          border: '1.5px solid var(--rv-frame-border)',
          boxShadow: '0 32px 72px rgba(0,0,0,.94), 0 0 36px -8px var(--rv-accent-glow), inset 0 1.5px 2px rgba(255,255,255,.22), 0 0 0 1px rgba(0,0,0,.9)',
        }}
      >
        {['-top-1 -left-1', '-top-1 -right-1', '-bottom-1 -left-1', '-bottom-1 -right-1'].map((pos) => (
          <span key={pos} className={`absolute ${pos} h-2.5 w-2.5 rounded-full`} style={{
            background: 'radial-gradient(circle at 32% 30%, rgba(255,255,255,.5), rgba(0,0,0,.9) 70%)',
            boxShadow: '0 1px 2px rgba(0,0,0,.8), inset 0 0 2px rgba(255,255,255,.4)',
          }} />
        ))}
        <div className="grid" style={{ gridTemplateColumns: '16px 1fr', gridTemplateRows: '16px 1fr', gap: 4 }}>
          <div />
          <div className="grid items-center justify-items-center" style={{ gridTemplateColumns: 'repeat(8, 1fr)' }}>
            {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((l) => (
              <span key={l} className="text-[10px] font-bold tracking-[0.08em]" style={{ color: 'var(--rv-accent)', textShadow: '0 1px 2px rgba(0,0,0,.9)' }}>{l}</span>
            ))}
          </div>
          <div className="grid items-center justify-items-center" style={{ gridTemplateRows: 'repeat(8, 1fr)' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((l) => (
              <span key={l} className="text-[10px] font-bold tracking-[0.08em]" style={{ color: 'var(--rv-accent)', textShadow: '0 1px 2px rgba(0,0,0,.9)' }}>{l}</span>
            ))}
          </div>
          <div
            className="relative grid grid-cols-8 overflow-hidden rounded-[10px]"
            style={{
              background: 'var(--rv-line)',
              gap: 1,
              boxShadow: 'inset 0 5px 20px rgba(0,0,0,.88)',
              border: '1.5px solid var(--rv-accent)',
            }}
            role="grid"
            aria-label="Reversi board"
          >
            {state.board.map((v, i) => {
              const legalHere = legal[i]
              const isLast = lastMove === i
              const flipIdx = lastFlips ? lastFlips.indexOf(i) : -1
              const alt = (Math.floor(i / 8) + (i % 8)) % 2 === 1
              return (
                <button
                  key={i}
                  role="gridcell"
                  aria-label={`Square ${String.fromCharCode(97 + (i % 8))}${Math.floor(i / 8) + 1}${v ? (v === 1 ? ', dark disc' : ', light disc') : legalHere ? ', legal move' : ''}`}
                  disabled={!myTurn || !legalHere}
                  onClick={() => myTurn && legalHere && onMove?.({ i })}
                  className={`relative aspect-square touch-manipulation transition-all duration-150 outline-none ${legalHere && myTurn ? 'cursor-pointer' : ''}`}
                  style={{
                    background: alt
                      ? 'linear-gradient(145deg, rgba(255,255,255,.012), transparent), var(--rv-surface-alt)'
                      : 'radial-gradient(circle at 30% 25%, rgba(255,255,255,.035), transparent 70%), var(--rv-surface)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), inset 0 -1px 2px rgba(0,0,0,.55)',
                  }}
                >
                  {legalHere && myTurn && showHints && (
                    <span className="pointer-events-none absolute left-1/2 top-1/2 h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-200 hover:scale-125"
                      style={{
                        border: '2px solid var(--rv-marker)',
                        background: 'radial-gradient(circle, var(--rv-marker-glow), transparent 70%)',
                        opacity: 0.85,
                        boxShadow: 'var(--rv-marker-shadow)',
                        animation: 'pulse-glow 2.2s ease-in-out infinite',
                      }} />
                  )}
                  {legalHere && !myTurn && (
                    <span className="pointer-events-none absolute left-1/2 top-1/2 h-[16%] w-[16%] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: 'rgba(255,255,255,.14)' }} />
                  )}
                  {isLast && (
                    <span className="pointer-events-none absolute left-1/2 top-1/2 h-[7%] w-[7%] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{
                      background: 'var(--rv-accent)',
                      boxShadow: '0 0 10px var(--rv-marker)',
                      zIndex: 15,
                      animation: 'pop-in .3s ease',
                    }} />
                  )}
                  {v !== 0 && (
                    <span className="absolute inset-[9%]" style={{ perspective: 600 }}>
                      <span
                        className="rv-disc block h-full w-full"
                        style={{
                          transform: `rotateY(${v === 1 ? 0 : 180}deg)`,
                          transitionDelay: flipIdx >= 0 ? `${Math.min((flipIdx % 6) * 45, 180)}ms` : '0ms',
                          animation: isLast || flipIdx >= 0 ? 'disc-settle .45s ease' : undefined,
                        }}
                      >
                        <span className="rv-disc-face rv-disc-front" style={{ background: 'radial-gradient(circle at 30% 26%, var(--rv-dark1) 0%, var(--rv-dark2) 54%, rgba(0,0,0,.95) 100%)', border: '1px solid var(--rv-dark-border)', boxShadow: '0 6px 14px rgba(0,0,0,.88), inset 0 2px 5px rgba(255,255,255,.28)' }} />
                        <span className="rv-disc-face rv-disc-back" style={{ background: 'radial-gradient(circle at 30% 26%, var(--rv-light1) 0%, var(--rv-light2) 60%, rgba(0,0,0,.18) 100%), var(--rv-light2)', border: '1px solid var(--rv-light-border)', boxShadow: '0 6px 14px rgba(0,0,0,.75), inset 0 2px 4px rgba(255,255,255,.95)' }} />
                      </span>
                    </span>
                  )}
                </button>
              )
            })}
            {[18, 21, 42, 45].map((p) => (
              <span key={`hoshi-${p}`} className="pointer-events-none absolute z-[3] h-[6px] w-[6px] rounded-full" style={{
                left: `${(((p % 8) + 0.5) / 8) * 100}%`, top: `${((Math.floor(p / 8) + 0.5) / 8) * 100}%`,
                transform: 'translate(-50%, -50%)',
                background: 'var(--rv-accent)',
                opacity: 0.75,
              }} />
            ))}
          </div>
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
