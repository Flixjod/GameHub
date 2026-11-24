import React from 'react'

// Tournament-grade 3x3: etched metal frame, engraved cross/naught strokes,
// soft neon glow per side, winning-line sweep. state.cells: 0 empty, 1 seat0(X), 2 seat1(O)
export default function TicTacToeBoard({ state, mySeat, playing, onMove, lastEvent }) {
  const myTurn = playing && state.turn === mySeat
  const marks = { 1: 'X', 2: 'O' }
  const line = lastEvent?._winningLine || null

  return (
    <div className="mx-auto w-full max-w-[400px]">
      <div
        className="relative rounded-[22px] p-4"
        style={{
          background: 'linear-gradient(145deg, #1a2b23, #0c1611 60%, #060a08)',
          border: '1.5px solid rgba(16,229,138,.28)',
          boxShadow: '0 32px 72px rgba(0,0,0,.9), 0 0 36px -8px rgba(16,229,138,.5), inset 0 1.5px 2px rgba(255,255,255,.18), 0 0 0 1px rgba(0,0,0,.9)',
        }}
      >
        {['-top-1 -left-1', '-top-1 -right-1', '-bottom-1 -left-1', '-bottom-1 -right-1'].map((pos) => (
          <span key={pos} className={`absolute ${pos} h-2.5 w-2.5 rounded-full`} style={{
            background: 'radial-gradient(circle at 32% 30%, rgba(255,255,255,.5), rgba(0,0,0,.9) 70%)',
            boxShadow: '0 1px 2px rgba(0,0,0,.8), inset 0 0 2px rgba(255,255,255,.4)',
          }} />
        ))}
        <div
          className="relative grid grid-cols-3 gap-[3px] overflow-hidden rounded-[12px]"
          style={{ background: 'rgba(16,229,138,.16)', boxShadow: 'inset 0 5px 20px rgba(0,0,0,.8)', border: '1.5px solid rgba(16,229,138,.55)' }}
          role="grid" aria-label="TicTacToe board"
        >
          {state.cells.map((v, i) => {
            const alt = (Math.floor(i / 3) + (i % 3)) % 2 === 1
            return (
              <button
                key={i}
                role="gridcell"
                aria-label={`Cell ${i + 1}${v ? `, ${marks[v]}` : ', empty'}`}
                onClick={() => myTurn && !v && onMove({ i })}
                disabled={!myTurn || !!v}
                className={`relative flex aspect-square items-center justify-center transition-all duration-200 outline-none ${
                  v
                    ? ''
                    : myTurn
                      ? 'cursor-pointer hover:scale-[1.03]'
                      : ''}`}
                style={{
                  background: alt
                    ? 'linear-gradient(145deg, rgba(255,255,255,.01), transparent), #0d130e'
                    : 'radial-gradient(circle at 30% 25%, rgba(255,255,255,.035), transparent 70%), #101913',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.05), inset 0 -1px 2px rgba(0,0,0,.5)',
                }}
              >
                {!v && myTurn && (
                  <span className="pointer-events-none absolute text-4xl font-black opacity-0 transition-opacity hover:opacity-25" style={{ color: mySeat === 0 ? '#10e58a' : '#22d3ee' }}>{marks[mySeat + 1]}</span>
                )}
                {v === 1 && (
                  <svg viewBox="0 0 40 40" className={`h-3/5 w-3/5 ${line?.includes(i) ? 'drop-shadow-[0_0_12px_rgba(16,229,138,.95)]' : ''}`}>
                    <path d="M8 8 L32 32 M32 8 L8 32" stroke="url(#gh-x-grad)" strokeWidth="4.5" strokeLinecap="round" className="animate-pop-in" style={{ transformOrigin: 'center' }} />
                    <defs>
                      <linearGradient id="gh-x-grad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#5cffb8" />
                        <stop offset="100%" stopColor="#0a9c62" />
                      </linearGradient>
                    </defs>
                  </svg>
                )}
                {v === 2 && (
                  <svg viewBox="0 0 40 40" className={`h-3/5 w-3/5 ${line?.includes(i) ? 'drop-shadow-[0_0_12px_rgba(34,211,238,.95)]' : ''}`}>
                    <circle cx="20" cy="20" r="12" stroke="url(#gh-o-grad)" strokeWidth="4.5" fill="none" strokeLinecap="round" className="animate-pop-in" style={{ transformOrigin: 'center' }} />
                    <defs>
                      <linearGradient id="gh-o-grad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#7deffe" />
                        <stop offset="100%" stopColor="#0e7490" />
                      </linearGradient>
                    </defs>
                  </svg>
                )}
                {line?.includes(i) && (
                  <span className="pointer-events-none absolute inset-1 rounded-lg" style={{ border: '2px solid rgba(255,255,255,.35)', boxShadow: '0 0 16px rgba(255,255,255,.25)' }} />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
