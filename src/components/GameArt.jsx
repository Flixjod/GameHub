import React from 'react'
import { Grid3x3, CircleDot, Dice5, Spline } from 'lucide-react'

export const GAME_ART = {
  reversi: { emoji: '⚫', icon: CircleDot, pattern: 'reversi' },
  ludo: { emoji: '🎲', icon: Dice5, pattern: 'ludo' },
  snakes: { emoji: '🐍', icon: Spline, pattern: 'snakes' },
  tictactoe: { emoji: '⭕', icon: Grid3x3, pattern: 'ttt' },
  more: { emoji: '🗂️', icon: null, pattern: 'more' },
}

export function GameArtTile({ game, className = '', big = false }) {
  const art = GAME_ART[game] || GAME_ART.more
  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${className}`}>
      <PatternArt kind={art.pattern} />
      {big && <span className="absolute text-[64px] drop-shadow-[0_10px_24px_rgba(0,0,0,.6)] animate-floaty">{art.emoji}</span>}
    </div>
  )
}

function PatternArt({ kind }) {
  if (kind === 'ttt') {
    return (
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full opacity-[.16]">
        <g stroke="currentColor" strokeWidth="3" fill="none">
          <path d="M40 12v96M80 12v96M12 40h96M12 80h96" />
        </g>
        <circle cx="26" cy="26" r="9" stroke="#22d3ee" strokeWidth="3" fill="none" />
        <path d="M92 88l16 16M108 88l-16 16" stroke="#10e58a" strokeWidth="3.4" strokeLinecap="round" />
      </svg>
    )
  }
  if (kind === 'reversi') {
    return (
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full opacity-[.14]">
        {[[0, 0], [30, 30], [60, 0], [0, 60], [60, 60], [30, 90], [90, 30], [90, 90]].map(([x, y], i) => (
          <circle key={i} cx={x + 15} cy={y + 15} r="12" fill={i % 2 ? '#0b1512' : '#0e2b1e'} stroke="#10e58a" strokeWidth="1.4" opacity={0.9} />
        ))}
      </svg>
    )
  }
  if (kind === 'ludo') {
    return (
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full opacity-[.15]">
        <rect x="30" y="30" width="60" height="60" rx="8" fill="none" stroke="#fb923c" strokeWidth="2.5" />
        <rect x="46" y="46" width="28" height="28" rx="6" fill="#fb923c" opacity=".3" />
        <rect x="30" y="0" width="18" height="30" rx="3" fill="#22c55e" opacity=".5" />
        <rect x="30" y="90" width="18" height="30" rx="3" fill="#ef4444" opacity=".45" />
        <rect x="90" y="30" width="30" height="18" rx="3" fill="#eab308" opacity=".45" />
        <rect x="0" y="30" width="30" height="18" rx="3" fill="#3b82f6" opacity=".45" />
        {[[38, 8], [82, 38], [56, 106]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="5" fill="#10e58a" opacity=".65" />
        ))}
      </svg>
    )
  }
  if (kind === 'snakes') {
    return (
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full opacity-[.16]">
        <path d="M10 100 L60 100 L60 70 L20 70 L20 40 L70 40 L70 10" stroke="#8b5cf6" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity=".7" />
        <path d="M80 14 C 104 30 74 48 98 62 C 112 72 96 92 102 106" stroke="#10e58a" strokeWidth="3.4" fill="none" strokeLinecap="round" opacity=".55" />
        <circle cx="20" cy="40" r="4" fill="#22d3ee" opacity=".8" />
        <circle cx="60" cy="100" r="4" fill="#fbbf24" opacity=".8" />
      </svg>
    )
  }
  // 'more' — abstract grid
  return (
    <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full opacity-[.13]">
      <rect x="14" y="14" width="40" height="40" rx="10" fill="none" stroke="#94a3b8" strokeWidth="2.5" />
      <rect x="66" y="14" width="40" height="40" rx="20" fill="none" stroke="#10e58a" strokeWidth="2.5" />
      <rect x="14" y="66" width="40" height="40" rx="20" fill="none" stroke="#22d3ee" strokeWidth="2.5" />
      <rect x="66" y="66" width="40" height="40" rx="10" fill="none" stroke="#8b5cf6" strokeWidth="2.5" />
    </svg>
  )
}
