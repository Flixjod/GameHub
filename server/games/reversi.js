// Server-authoritative Reversi engine.
import { GAMES } from '../lib/games.js'

export const DIRS = [-11, -10, -9, -1, 1, 9, 10, 11] // 0-based flat offsets

export function createReversi(players) {
  const board = Array(64).fill(0)
  board[27] = 2; board[28] = 1; board[35] = 1; board[36] = 2
  return { board, turn: 0, players, lastMove: -1 }
}

export function flipsFor(board, pos, player) {
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

export function validMoves(state, playerIdx) {
  const out = []
  for (let i = 0; i < 64; i++) if (flipsFor(state.board, i, playerIdx + 1).length) out.push(i)
  return out
}

export function reversiScore(state, playerIdx) {
  let mine = 0
  for (const v of state.board) if (v === playerIdx + 1) mine++
  return mine
}

export function applyReversiMove(state, playerIdx, move) {
  const { i } = move
  if (!Number.isInteger(i) || i < 0 || i > 63) return { error: 'Invalid tile.' }
  if (playerIdx !== state.turn) return { error: 'Not your turn.' }
  const flips = flipsFor(state.board, i, playerIdx + 1)
  if (!flips.length) return { error: 'No flips from that square — pick a legal move.' }

  state.board[i] = playerIdx + 1
  for (const f of flips) state.board[f] = playerIdx + 1
  state.lastMove = i

  const opponentMoves = validMoves(state, 1 - playerIdx)
  if (opponentMoves.length) {
    state.turn = 1 - playerIdx
    return { ok: true, forcedSkip: false }
  }
  const myMoves = validMoves(state, playerIdx)
  if (myMoves.length) {
    return { ok: true, forcedSkip: true, skipped: 1 - playerIdx } // opponent passes
  }
  // end: compare discs
  const a = reversiScore(state, playerIdx)
  const b = reversiScore(state, 1 - playerIdx)
  return {
    finished: true,
    winnerIdx: a === b ? -1 : a > b ? playerIdx : 1 - playerIdx,
    draw: a === b,
    scores: { [playerIdx]: a, [1 - playerIdx]: b },
  }
}

export function applyReversiPass(state, playerIdx) {
  if (playerIdx !== state.turn) return { error: 'Not your turn.' }
  if (validMoves(state, playerIdx).length) return { error: 'You still have legal moves.' }
  state.turn = 1 - playerIdx
  return { ok: true, passed: true }
}

// ---------- Bot AI (greedy with positional weights + mobility fallback) ----------
const WEIGHTS = [
  120,-20, 20,  5,  5, 20,-20,120,
  -20,-40, -5, -5, -5, -5,-40,-20,
   20, -5, 15,  3,  3, 15, -5, 20,
    5, -5,  3,  3,  3,  3, -5,  5,
    5, -5,  3,  3,  3,  3, -5,  5,
   20, -5, 15,  3,  3, 15, -5, 20,
  -20,-40, -5, -5, -5, -5,-40,-20,
  120,-20, 20,  5,  5, 20,-20,120,
]

export function reversiBotMove(state, botIdx, difficulty = 'best') {
  const moves = validMoves(state, botIdx)
  if (!moves.length) return null
  if (difficulty === 'easy' && Math.random() < 0.55) return moves[Math.floor(Math.random() * moves.length)]
  if (difficulty === 'normal' && Math.random() < 0.3) return moves[Math.floor(Math.random() * moves.length)]
  let best = -Infinity
  let pick = moves[0]
  for (const m of moves) {
    const board = state.board.slice()
    board[m] = botIdx + 1
    for (const f of flipsFor(state.board, m, botIdx + 1)) board[f] = botIdx + 1
    // score = weighted discs + opponent mobility penalty
    let score = WEIGHTS[m2(m)] + 2 * moves.length
    let oppMobility = 0
    for (let i = 0; i < 64; i++) if (board[i] === 0 && flipsFor(board, i, (1 - botIdx) + 1).length) oppMobility++
    score -= 3 * oppMobility
    if (score > best) { best = score; pick = m }
  }
  return pick
}
function m2(m){return m}
