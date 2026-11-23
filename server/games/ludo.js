// Server-authoritative Ludo engine (classic 4-token, 52-square ring, home columns).
// Tokens are tracked by "steps advanced": -1 = yard, 0..51 = ring, 52..56 = home column, 57 = home.
export const START_OFFSETS = [0, 13, 26, 39]
export const SAFE_SQUARES = [0, 8, 13, 21, 26, 34, 39, 47]

export function createLudo(players) {
  return {
    tokens: players.map(() => [-1, -1, -1, -1]),
    turn: 0,
    players,
    roll: null,
    sixStreak: 0,
    lastCapture: null,
    needsReroll: false,
  }
}

export function ringSquare(seat, p) {
  return (START_OFFSETS[seat] + p) % 52
}

export function ludoFinished(state, playerIdx) {
  return state.tokens[playerIdx].every((t) => t === 57)
}

export function ludoScore(state, playerIdx) {
  return state.tokens[playerIdx].filter((t) => t === 57).length
}

export function ludoRanking(state) {
  return state.tokens
    .map((toks, i) => ({ playerIdx: i, home: toks.filter((t) => t === 57).length, progress: toks.reduce((a, t) => a + Math.max(t, 0), 0) }))
    .sort((a, b) => b.home - a.home || b.progress - a.progress)
}

export function legalLudoMoves(state, playerIdx, roll) {
  const toks = state.tokens[playerIdx]
  const moves = []
  for (let t = 0; t < 4; t++) {
    if (toks[t] === 57) continue
    if (toks[t] === -1) {
      if (roll === 6) moves.push({ token: t, from: -1, to: 0 })
    } else if (toks[t] + roll <= 57) {
      moves.push({ token: t, from: toks[t], to: toks[t] + roll })
    }
  }
  return moves
}

export function ludoLegalMovesForTurn(state, playerIdx) {
  if (state.roll == null) return []
  return legalLudoMoves(state, playerIdx, state.roll)
}

export function applyLudoRoll(state, playerIdx) {
  if (playerIdx !== state.turn) return { error: 'Not your turn.' }
  if (state.roll != null) return { error: 'Awaiting your token move.' }
  const roll = 1 + Math.floor(Math.random() * 6)
  state.roll = roll
  if (roll === 6) {
    state.sixStreak += 1
    if (state.sixStreak >= 3) {
      state.roll = null
      state.sixStreak = 0
      state.turn = (state.turn + 1) % state.players.length
      return { ok: true, roll, forfeited: true, message: 'Three sixes — turn forfeited.' }
    }
  }
  const moves = legalLudoMoves(state, playerIdx, roll)
  if (!moves.length) {
    const again = roll === 6
    state.roll = null
    if (!again) {
      state.sixStreak = 0
      state.turn = (state.turn + 1) % state.players.length
      return { ok: true, roll, blocked: true, message: 'No legal moves.' }
    }
    return { ok: true, roll, blocked: true, again: true, message: 'No legal moves — roll again.' }
  }
  return { ok: true, roll }
}

export function applyLudoMove(state, playerIdx, move) {
  const { token } = move
  if (playerIdx !== state.turn) return { error: 'Not your turn.' }
  if (state.roll == null) return { error: 'Roll first.' }
  if (!Number.isInteger(token) || token < 0 || token > 3) return { error: 'Invalid token.' }

  const roll = state.roll
  const moves = legalLudoMoves(state, playerIdx, roll)
  const chosen = moves.find((m) => m.token === token)
  if (!chosen) return { error: 'That token cannot move with this roll.' }

  const toks = state.tokens[playerIdx]
  const wasYard = toks[token] === -1
  toks[token] = chosen.to

  let captured = null
  if (chosen.to <= 51 && !wasYard) {
    const sq = ringSquare(playerIdx, chosen.to)
    if (!SAFE_SQUARES.includes(sq)) {
      for (let pi = 0; pi < state.tokens.length; pi++) {
        if (pi === playerIdx) continue
        let killed = false
        state.tokens[pi] = state.tokens[pi].map((tp) => {
          if (tp >= 0 && tp <= 51 && ringSquare(pi, tp) === sq) { killed = true; return -1 }
          return tp
        })
        if (killed) captured = captured === null ? [pi] : [...captured, pi]
      }
    }
  }
  state.lastCapture = captured

  const finished = ludoFinished(state, playerIdx)
  if (finished) {
    return { finished: true, winnerIdx: playerIdx, roll, captured, scores: { [playerIdx]: 4 } }
  }

  if (roll === 6) {
    state.roll = null
    return { ok: true, roll, captured, again: true }
  }
  state.roll = null
  state.sixStreak = 0
  state.turn = (state.turn + 1) % state.players.length
  return { ok: true, roll, captured }
}

// ---------- Bot heuristic ----------
export function ludoBotDecide(state, botIdx) {
  if (state.roll == null) return { action: 'roll' }
  const moves = legalLudoMoves(state, botIdx, state.roll)
  if (!moves.length) return { action: 'skip' }
  const toks = state.tokens[botIdx]
  let best = null
  let bestScore = -Infinity
  for (const m of moves) {
    let score = 0
    if (m.from === -1) score += 45
    const sq = m.to <= 51 ? ringSquare(botIdx, m.to) : -1
    if (m.to <= 51 && sq !== -1 && !SAFE_SQUARES.includes(sq)) {
      for (let pi = 0; pi < state.tokens.length; pi++) {
        if (pi === botIdx) continue
        if (state.tokens[pi].some((tp) => tp >= 0 && tp <= 51 && ringSquare(pi, tp) === sq)) score += 50
      }
    }
    if (m.to === 57) score += 40
    if (m.to > 51) score += 30
    if (m.to > 51 && m.to === toks[m.token] + state.roll && m.to <= 56) score += 5
    score += m.to * 0.3
    score += Math.random() * 3
    if (score > bestScore) { bestScore = score; best = m }
  }
  return { action: 'move', token: best.token }
}
