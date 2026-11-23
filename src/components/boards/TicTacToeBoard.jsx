import React from 'react'

// Marks with soft glow. state.cells: 0 empty, 1 seat0(X), 2 seat1(O)
export default function TicTacToeBoard({ state, mySeat, playing, onMove, lastEvent }) {
  const myTurn = playing && state.turn === mySeat
  const marks = { 1: 'X', 2: 'O' }
  const line = lastEvent?._winningLine || null

  return (
    <div className="mx-auto w-full max-w-[380px]">
      <div
        className="grid grid-cols-3 gap-2.5 rounded-2xl border border-line-2/60 bg-gradient-to-br from-[#0b1712] to-[#080d0b] p-3 shadow-[inset_0_2px_20px_rgba(0,0,0,.5)]"
        role="grid" aria-label="TicTacToe board"
      >
        {state.cells.map((v, i) => (
          <button
            key={i}
            role="gridcell"
            aria-label={`Cell ${i + 1}${v ? `, ${marks[v]}` : ', empty'}`}
            onClick={() => myTurn && !v && onMove({ i })}
            disabled={!myTurn || !!v}
            className={`relative flex aspect-square items-center justify-center rounded-xl border transition-all duration-200 ${
              v
                ? 'border-line-2/60 bg-white/[.04]'
                : myTurn
                  ? 'border-line bg-white/[.015] hover:border-emerald-neon/50 hover:bg-emerald-neon/[.06] hover:scale-[1.03] cursor-pointer'
                  : 'border-line/60 bg-white/[.015]'}`}
          >
            {!v && myTurn && (
              <span className="absolute opacity-0 transition-opacity hover:opacity-30 text-3xl font-black text-emerald-soft">{marks[mySeat + 1]}</span>
            )}
            {v === 1 && (
              <svg viewBox="0 0 40 40" className={`h-3/5 w-3/5 ${line?.includes(i) ? 'drop-shadow-[0_0_10px_rgba(16,229,138,.9)]' : ''}`}>
                <path d="M8 8 L32 32 M32 8 L8 32" stroke="#10e58a" strokeWidth="5" strokeLinecap="round" className="animate-pop-in" style={{ transformOrigin: 'center' }} />
              </svg>
            )}
            {v === 2 && (
              <svg viewBox="0 0 40 40" className={`h-3/5 w-3/5 ${line?.includes(i) ? 'drop-shadow-[0_0_10px_rgba(34,211,238,.9)]' : ''}`}>
                <circle cx="20" cy="20" r="12" stroke="#22d3ee" strokeWidth="5" fill="none" strokeLinecap="round" className="animate-pop-in" style={{ transformOrigin: 'center' }} />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
