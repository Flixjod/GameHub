import React from 'react'

function flipsFor(board, pos, player) {
  if (board[pos] !== 0) return []
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

export default function ReversiBoard({ state, mySeat, playing, onMove, onPass }) {
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
    <div className="mx-auto w-full max-w-[460px]">
      <div
        className="grid grid-cols-8 gap-1 rounded-2xl border border-emerald-neon/15 bg-gradient-to-br from-[#0a1a12] to-[#071008] p-2 shadow-[inset_0_2px_24px_rgba(0,0,0,.6),0_0_40px_-18px_rgba(16,229,138,.4)]"
        role="grid" aria-label="Reversi board"
      >
        {state.board.map((v, i) => {
          const legalHere = legal[i]
          const isLast = lastMove === i
          return (
            <button
              key={i}
              role="gridcell"
              aria-label={`Square ${i}${v ? `, ${v === 1 ? 'seat A' : 'seat B'} disc` : legalHere ? ', legal move' : ''}`}
              disabled={!myTurn || !legalHere}
              onClick={() => myTurn && legalHere && onMove({ i })}
              className={`relative aspect-square rounded-[5px] bg-[#0d2117]/80 border border-emerald-neon/[.07] transition-all duration-150 ${
                legalHere && myTurn ? 'cursor-pointer hover:bg-emerald-neon/[.12]' : ''} ${isLast ? 'border-emerald-neon/60' : ''}`}
            >
              {!v && legalHere && myTurn && (
                <span className="absolute inset-[28%] rounded-full bg-emerald-neon/40 transition-transform hover:scale-110" />
              )}
              {!v && legalHere && !myTurn && (
                <span className="absolute inset-[36%] rounded-full bg-white/[.07]" />
              )}
              {v !== 0 && (
                <span
                  className={`absolute inset-[9%] rounded-full transition-all duration-300 ${
                    v === 1
                      ? 'bg-gradient-to-br from-[#123326] to-[#06120c] border border-emerald-neon/40 shadow-[0_0_10px_-2px_rgba(16,229,138,.55)]'
                      : 'bg-gradient-to-br from-[#e9f6ef] to-[#b9c9c0] border border-white/50 shadow-[0_4px_10px_-2px_rgba(0,0,0,.6)]'} ${isLast ? 'animate-pop-in scale-100' : ''}`}
                  style={isLast ? { animation: 'coin .5s ease' } : undefined}
                />
              )}
            </button>
          )
        })}
      </div>

      <div className="mx-auto mt-4 flex max-w-[460px] items-center justify-between rounded-xl border border-line bg-white/[.02] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-full bg-gradient-to-br from-[#123326] to-[#06120c] border border-emerald-neon/40" />
          <span className="text-sm font-bold">{score(0)}</span>
        </div>
        {playing && !hasMove ? (
          <button onClick={onPass} className="rounded-lg bg-cyber-cyan/15 px-4 py-1.5 text-xs font-bold text-cyber-cyan transition hover:bg-cyber-cyan/25 cursor-pointer animate-pulse-glow">
            No moves — Pass turn
          </button>
        ) : (
          <span className={`text-xs font-semibold ${myTurn ? 'text-emerald-soft' : 'text-ink-faint'}`}>{myTurn ? 'Your move' : 'Opponent thinking…'}</span>
        )}
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">{score(1)}</span>
          <span className="h-3.5 w-3.5 rounded-full bg-gradient-to-br from-[#e9f6ef] to-[#b9c9c0] border border-white/50" />
        </div>
      </div>
    </div>
  )
}
