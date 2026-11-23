// Server-authoritative TicTacToe engine.
// State: { cells: (0|1|2)[9], turn: idx, players: [{id}], moves }

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
]

export function createTicTacToe(players) {
  return {
    cells: Array(9).fill(0),
    turn: 0,
    players,
    lastMove: -1,
  }
}

function findLine(cells) {
  for (const line of LINES) {
    const [a, b, c] = line
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) return line
  }
  return null
}

export function applyTicTacToeMove(state, playerIdx, move) {
  const { i } = move
  if (!Number.isInteger(i) || i < 0 || i > 8) return { error: 'Invalid cell.' }
  if (playerIdx !== state.turn) return { error: 'Not your turn.' }
  if (state.cells[i] !== 0) return { error: 'Cell already taken.' }

  state.cells[i] = playerIdx + 1
  state.lastMove = i

  const line = findLine(state.cells)
  if (line) {
    return { finished: true, winnerIdx: playerIdx, winningLine: line, scores: { [playerIdx]: 1 } }
  }
  if (state.cells.every((c) => c !== 0)) {
    return { finished: true, winnerIdx: -1, draw: true }
  }
  state.turn = 1 - state.turn
  return { ok: true }
}

export function ticTacToeScore(state, playerIdx) {
  const line = findLine(state.cells)
  if (!line) return state.cells.every((c) => c !== 0) ? 0.5 : 0
  return state.cells[line[0]] === playerIdx + 1 ? 1 : 0
}

// ---------- Bot AI (minimax, perfect play; slight Best randomness on easy) ----------
export function ticTacToeBotMove(state, botIdx, difficulty = 'best') {
  const cells = state.cells.slice()
  const opp = 1 - botIdx
  const empty = cells.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0)

  if (difficulty === 'easy') {
    if (Math.random() < 0.55) return empty[Math.floor(Math.random() * empty.length)]
  } else if (difficulty === 'normal' && Math.random() < 0.25) {
    return empty[Math.floor(Math.random() * empty.length)]
  }

  function minimax(board, turn, depth) {
    const line = findLine(board)
    if (line) return board[line[0]] === botIdx + 1 ? 10 - depth : depth - 10
    if (board.every((c) => c !== 0)) return 0
    const scores = []
    for (const i of board.map((v, idx) => (v === 0 ? idx : -1)).filter((i) => i >= 0)) {
      board[i] = turn + 1
      scores.push(minimax(board, 1 - turn, depth + 1))
      board[i] = 0
    }
    return turn === botIdx ? Math.max(...scores) : Math.min(...scores)
  }

  let best = -Infinity
  let picks = []
  for (const i of empty) {
    cells[i] = botIdx + 1
    const s = minimax(cells, opp, 1)
    cells[i] = 0
    if (s > best) { best = s; picks = [i] } else if (s === best) picks.push(i)
  }
  return picks.length ? picks[Math.floor(Math.random() * picks.length)] : empty[0]
}
