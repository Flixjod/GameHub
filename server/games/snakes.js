// Server-authoritative Snakes & Ladders engine. Server rolls the dice.
const LADDERS = { 4: 25, 13: 46, 33: 49, 42: 63, 50: 69, 62: 81, 74: 92 }
const SNAKES = { 27: 5, 40: 3, 43: 18, 54: 31, 66: 45, 76: 58, 89: 53, 99: 41 }

export { LADDERS, SNAKES }

export function createSnakes(players) {
  return {
    tokens: players.map(() => 0),
    turn: 0,
    players,
    lastRoll: null,
    lastPath: null,
  }
}

export function snakesScore(state, playerIdx) {
  return state.tokens[playerIdx] >= 100 ? 1 : 0
}

export function applySnakesMove(state, playerIdx, move) {
  if (playerIdx !== state.turn) return { error: 'Not your turn.' }
  const roll = 1 + Math.floor(Math.random() * 6)
  state.lastRoll = roll

  let pos = state.tokens[playerIdx]
  let path = []
  if (pos + roll <= 100) {
    pos += roll
    path = [pos]
    if (LADDERS[pos]) { pos = LADDERS[pos]; path = [roll === 1 ? 0 : state.tokens[playerIdx] + roll, pos] }
    else if (SNAKES[pos]) { pos = SNAKES[pos]; path = [state.tokens[playerIdx] + roll, pos] }
  }
  state.tokens[playerIdx] = pos
  state.lastPath = path

  if (pos >= 100) {
    return { finished: true, winnerIdx: playerIdx, roll, scores: { [playerIdx]: 1 } }
  }
  if (roll !== 6) state.turn = (state.turn + 1) % state.players.length
  return { ok: true, roll, again: roll === 6 }
}

// ---------- Bot: just rolls (dice game, no skill) ----------
export function snakesBotMove() { return { action: 'roll' } }
