// Server-authoritative Reversi engine. Also imported by the client for
// local pass-&-play, offline AI and replay review — keep it dependency-free.
// Board: flat array of 64; 0 = empty, 1 = seat 0 (dark), 2 = seat 1 (light).

export const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]

export const CORNERS = [0, 7, 56, 63]
const C_SQ = [1, 6, 8, 15, 48, 55, 57, 62]
const X_SQ = [9, 14, 49, 54]

export function createReversi(players) {
  const board = Array(64).fill(0)
  board[27] = 2; board[28] = 1; board[35] = 1; board[36] = 2
  return { board, turn: 0, players, lastMove: -1 }
}

export function flipsFor(board, pos, player) {
  if (pos < 0 || pos > 63 || board[pos] !== 0) return []
  const r = Math.floor(pos / 8), c = pos % 8
  const all = []
  for (const [dr, dc] of DIRS) {
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
    return { ok: true, forcedSkip: false, flips }
  }
  const myMoves = validMoves(state, playerIdx)
  if (myMoves.length) {
    return { ok: true, forcedSkip: true, skipped: 1 - playerIdx, flips } // opponent passes
  }
  const a = reversiScore(state, playerIdx)
  const b = reversiScore(state, 1 - playerIdx)
  return {
    finished: true,
    flips,
    winnerIdx: a === b ? -1 : a > b ? playerIdx : 1 - playerIdx,
    draw: a === b,
    scores: { [playerIdx]: a, [1 - playerIdx]: b },
  }
}

export function applyReversiPass(state, playerIdx) {
  if (playerIdx !== state.turn) return { error: 'Not your turn.' }
  if (validMoves(state, playerIdx).length) return { error: 'You still have legal moves.' }
  const opponent = 1 - playerIdx
  if (validMoves(state, opponent).length) {
    state.turn = opponent
    return { ok: true, passed: true }
  }
  const a = reversiScore(state, playerIdx)
  const b = reversiScore(state, opponent)
  return {
    finished: true,
    passed: true,
    winnerIdx: a === b ? -1 : a > b ? playerIdx : opponent,
    draw: a === b,
    scores: { [playerIdx]: a, [opponent]: b },
  }
}

// ---------------- evaluation ----------------
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


export function evaluateReversi(board, player) {
  const opp = 3 - player
  let positional = 0
  for (let i = 0; i < 64; i++) {
    if (board[i] === player) positional += WEIGHTS[i]
    else if (board[i] === opp) positional -= WEIGHTS[i]
  }
  let mobility = 0
  for (let i = 0; i < 64; i++) {
    if (board[i] !== 0) continue
    if (flipsFor(board, i, player).length) mobility += 9
    if (flipsFor(board, i, opp).length) mobility -= 9
  }
  let frontier = 0
  for (let i = 0; i < 64; i++) {
    if (board[i] !== 0) continue
    const r = Math.floor(i / 8), c = i % 8
    let touches = false
    for (const [dr, dc] of DIRS) {
      const rr = r + dr, cc = c + dc
      if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && board[rr * 8 + cc] !== 0) { touches = true; break }
    }
    if (!touches) continue
    if (flipsFor(board, i, player).length) frontier -= 4
    if (flipsFor(board, i, opp).length) frontier += 4
  }
  const discDiff = reversiScore({ board }, player - 1) - reversiScore({ board }, opp - 1)
  const empties = board.reduce((n, v) => n + (v === 0 ? 1 : 0), 0)
  return positional + mobility + frontier + Math.round(discDiff * (empties < 12 ? 12 : 1))
}

// Negamax with alpha-beta pruning and move ordering.
function negamax(board, player, depth, alpha, beta, passed) {
  const empties = board.reduce((n, v) => n + (v === 0 ? 1 : 0), 0)
  if (depth <= 0 || empties === 0) return evaluateReversi(board, player)
  const moves = validMoves({ board, turn: player - 1 }, player - 1)
  if (!moves.length) {
    if (passed) {
      const diff = reversiScore({ board }, player - 1) - reversiScore({ board }, 3 - player - 1)
      return diff > 0 ? 100000 + diff : diff < 0 ? -100000 + diff : 0
    }
    const next = board.slice()
    return -negamax(next, 3 - player, depth, -beta, -alpha, true)
  }
  moves.sort((a, b) =>
    (WEIGHTS[b] + flipsFor(board, b, player).length) - (WEIGHTS[a] + flipsFor(board, a, player).length))
  let best = -Infinity
  for (const m of moves) {
    const next = board.slice()
    next[m] = player
    for (const f of flipsFor(board, m, player)) next[f] = player
    const val = -negamax(next, 3 - player, depth - 1, -beta, -alpha, false)
    if (val > best) best = val
    if (best > alpha) alpha = best
    if (alpha >= beta) break
  }
  return best
}

function searchDepth(board) {
  const empties = board.reduce((n, v) => n + (v === 0 ? 1 : 0), 0)
  if (empties <= 10) return empties
  if (empties <= 16) return 6
  return 5
}

export function bestReversiMove(state, playerIdx) {
  const player = playerIdx + 1
  const moves = validMoves(state, playerIdx)
  if (!moves.length) return null
  let best = -Infinity
  let pick = moves[0]
  for (const m of moves) {
    const next = state.board.slice()
    next[m] = player
    for (const f of flipsFor(state.board, m, player)) next[f] = player
    const val = -negamax(next, 3 - player, searchDepth(state.board) - 1, -Infinity, Infinity, false)
    if (val > best) { best = val; pick = m }
  }
  return pick
}

// Ranked candidates for hints and replay move-quality analysis.
export function rankReversiMoves(state, playerIdx) {
  const player = playerIdx + 1
  const moves = validMoves(state, playerIdx)
  if (!moves.length) return []
  const depth = Math.min(searchDepth(state.board), 5)
  const scored = moves.map((m) => {
    const next = state.board.slice()
    next[m] = player
    for (const f of flipsFor(state.board, m, player)) next[f] = player
    return { move: m, value: -negamax(next, 3 - player, depth - 1, -Infinity, Infinity, false) }
  })
  scored.sort((a, b) => b.value - a.value)
  return scored
}

// ---------------- bots (three genuinely different tiers) ----------------
export function reversiBotMove(state, botIdx, difficulty = 'best') {
  const moves = validMoves(state, botIdx)
  if (!moves.length) return null
  if (difficulty === 'easy') return easyMove(state, botIdx, moves)
  if (difficulty === 'normal') return mediumMove(state, botIdx, moves)
  return bestReversiMove(state, botIdx)
}

function easyMove(state, botIdx, moves) {
  const corners = moves.filter((m) => CORNERS.includes(m))
  if (corners.length && Math.random() < 0.55) return corners[0]
  if (Math.random() < 0.6) return moves[Math.floor(Math.random() * moves.length)]
  let best = -Infinity
  let pick = moves[0]
  for (const m of moves) {
    const s = WEIGHTS[m] + flipsFor(state.board, m, botIdx + 1).length
    if (s > best) { best = s; pick = m }
  }
  return pick
}

function mediumMove(state, botIdx, moves) {
  if (Math.random() < 0.12) return moves[Math.floor(Math.random() * moves.length)]
  const player = botIdx + 1
  let best = -Infinity
  let pick = moves[0]
  for (const m of moves) {
    const next = state.board.slice()
    next[m] = player
    for (const f of flipsFor(state.board, m, player)) next[f] = player
    const val = -negamax(next, 3 - player, 1, -Infinity, Infinity, false)
      - (X_SQ.includes(m) ? 30 : 0) - (C_SQ.includes(m) ? 12 : 0)
    if (val > best) { best = val; pick = m }
  }
  return pick
}
