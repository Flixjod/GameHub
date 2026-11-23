import * as reversi from '../../server/games/reversi.js'
import * as ttt from '../../server/games/tictactoe.js'
import * as ludo from '../../server/games/ludo.js'
import * as snakes from '../../server/games/snakes.js'

export const ENGINES = {
  reversi: {
    create: reversi.createReversi,
    apply: reversi.applyReversiMove,
    pass: reversi.applyReversiPass,
    bot: reversi.reversiBotMove,
    best: reversi.bestReversiMove,
    rank: reversi.rankReversiMoves,
    scoreOf: reversi.reversiScore,
    hasPass: true,
    hasBest: true,
  },
  tictactoe: {
    create: ttt.createTicTacToe,
    apply: ttt.applyTicTacToeMove,
    pass: null,
    bot: ttt.ticTacToeBotMove,
    best: null,
    rank: null,
    scoreOf: ttt.ticTacToeScore,
    hasPass: false,
    hasBest: false,
  },
  ludo: {
    create: ludo.createLudo,
    roll: ludo.applyLudoRoll,
    apply: ludo.applyLudoMove,
    pass: null,
    bot: ludo.ludoBotDecide,
    best: null,
    rank: null,
    scoreOf: ludo.ludoScore,
    hasPass: false,
    hasBest: false,
    ludo: true,
  },
  snakes: {
    create: snakes.createSnakes,
    roll: snakes.applySnakesMove,
    apply: null,
    pass: null,
    bot: () => ({ action: 'roll' }),
    best: null,
    rank: null,
    scoreOf: snakes.snakesScore,
    hasPass: false,
    hasBest: false,
    dice: true,
  },
}

// Rebuild a match from its recorded move history for replay review.
export function replayStates(gameId, moves, playerCount = 2) {
  const eng = ENGINES[gameId]
  if (!eng) return []
  let st = eng.create(Array.from({ length: playerCount }, (_, i) => `p${i}`))
  const states = [{ state: structuredClone(st), label: 'Start' }]
  for (const entry of moves || []) {
    if (entry.action === 'roll') {
      if (eng.ludo) eng.roll(st, entry.seat, entry.roll ?? null)
      else if (eng.dice) eng.roll(st, entry.seat, { roll: entry.roll })
      else eng.roll?.(st, entry.seat)
      states.push({ state: structuredClone(st), label: `Roll ${entry.roll ?? ''}` })
    } else if (entry.action === 'pass') {
      eng.pass?.(st, entry.seat)
      states.push({ state: structuredClone(st), label: 'Pass' })
    } else if (entry.action === 'move') {
      const res = eng.apply(st, entry.seat, entry.move)
      states.push({
        state: structuredClone(st),
        label: res.error ? 'Invalid' : gameId === 'reversi' ? `Move ${String.fromCharCode(97 + (entry.move?.i % 8))}${Math.floor((entry.move?.i ?? 0) / 8) + 1}`
          : gameId === 'tictactoe' ? `Cell ${entry.move?.i + 1}`
          : `Token ${entry.move?.token + 1}`,
        seat: entry.seat,
        finished: !!res.finished,
      })
    }
  }
  if (!states.at(-1)?.finished) states.at(-1).finished = true
  return states
}
