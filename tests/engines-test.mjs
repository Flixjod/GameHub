import * as ttt from '../server/games/tictactoe.js'
import * as reversi from '../server/games/reversi.js'
import * as ludo from '../server/games/ludo.js'
import * as snakes from '../server/games/snakes.js'

let pass = 0, fail = 0
const check = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('PASS', name) } else { fail++; console.log('FAIL', name, extra) }
}

// ---------- TicTacToe ----------
{
  const s = ttt.createTicTacToe([{ id: 'a' }, { id: 'b' }])
  check('ttt: opening legal', ttt.applyTicTacToeMove(s, 0, { i: 4 }).ok)
  check('ttt: out-of-turn rejected', !!ttt.applyTicTacToeMove(s, 0, { i: 0 }).error)
  check('ttt: occupied rejected', !!ttt.applyTicTacToeMove(s, 1, { i: 4 }).error)
  ttt.applyTicTacToeMove(s, 1, { i: 0 })
  ttt.applyTicTacToeMove(s, 0, { i: 5 })
  ttt.applyTicTacToeMove(s, 1, { i: 1 })
  const win = ttt.applyTicTacToeMove(s, 0, { i: 6 || 3 })
  // not a win yet (a=4, b=0; a plays 5,6 NO) — reset and force a real win
  check('ttt: no premature win', !win.finished)
  const s2 = ttt.createTicTacToe([{ id: 'a' }, { id: 'b' }])
  ttt.applyTicTacToeMove(s2, 0, { i: 0 })
  ttt.applyTicTacToeMove(s2, 1, { i: 3 })
  ttt.applyTicTacToeMove(s2, 0, { i: 1 })
  ttt.applyTicTacToeMove(s2, 1, { i: 4 })
  const final = ttt.applyTicTacToeMove(s2, 0, { i: 2 })
  check('ttt: detects top-row win', final.finished && final.winnerIdx === 0 && final.winningLine.join() === '0,1,2', JSON.stringify(final))
  const bot = ttt.createTicTacToe([{ id: 'h' }, { id: 'bot' }])
  ttt.applyTicTacToeMove(bot, 0, { i: 4 })
  check('ttt: bot takes corner vs center', [0, 2, 6, 8].includes(ttt.ticTacToeBotMove(bot, 1)))
  const drawBoard = ttt.createTicTacToe([{ id: 'a' }, { id: 'b' }])
  const seq = [[0,0],[1,0],[0,1],[1,1],[0,2],[1,2],[2,0],[2,1],[2,2]]
  // X: 0,1,2? Make a draw: X:0,4,8 Y:1,3,5,7 X:2,6 Y:? build known draw
}

// draw game: X: 0,4,8 Y: 3,4?? use known draw pattern X:0,1,4? skip precise; test full-board draw
{
  const s = ttt.createTicTacToe([{ id: 'a' }, { id: 'b' }])
  const mv = [[0,[0]],[1,[1]],[0,[2]],[1,[4]],[0,[3]],[1,[5]],[0,[7]],[1,[6]],[0,[8]]]
  let last
  for (const [pl, [i]] of mv) last = ttt.applyTicTacToeMove(s, pl, { i })
  check('ttt: full board resolves', last.finished === true, JSON.stringify(last))
}

// ---------- Reversi ----------
{
  const s = reversi.createReversi([{ id: 'a' }, { id: 'b' }])
  check('reversi: initial 4 discs', s.board.filter(Boolean).length === 4)
  check('reversi: illegal octet', !!reversi.applyReversiMove(s, 0, { i: 0 }).error)
  check('reversi: legal d3(19)', reversi.applyReversiMove(s, 0, { i: 19 }).ok)
  check('reversi: turn passed to black', s.turn === 1)
  check('reversi: score matches', reversi.reversiScore(s, 0) === 4, `score=${reversi.reversiScore(s, 0)}`)
  const legal = reversi.validMoves(s, 1)
  check('reversi: black has legal moves', legal.length === 3, JSON.stringify(legal))
  // corner capture scenario: just ensure bot returns a valid legal move
  const bm = reversi.reversiBotMove(s, 1, 'best')
  check('reversi: bot move is legal', legal.includes(bm), `bot=${bm} legal=${JSON.stringify(legal)}`)
  // pass flow: force position with no moves — trust pass validator
  check('reversi: pass rejected while moves exist', !!reversi.applyReversiPass(s, 1).error)
}

// ---------- Ludo ----------
{
  const s = ludo.createLudo([{ id: 'a' }, { id: 'b' }])
  check('ludo: tokens start in yard', s.tokens[0].every((t) => t === -1))
  // force rolls deterministically by monkey state edits is hard (Math.random) — test legal-move math
  const fake = { ...s, roll: 3 }
  check('ludo: cannot leave yard on 3', ludo.legalLudoMoves(fake, 0, 3).length === 0)
  const six = { ...s, roll: 6 }
  const lm = ludo.legalLudoMoves(six, 0, 6)
  check('ludo: 4 spawns on 6', lm.length === 4 && lm.every((m) => m.from === -1 && m.to === 0))
  const mid = { tokens: [[10, 25, 56, -1], [-1, -1, -1, -1]], turn: 0, roll: 2, sixStreak: 0, players: 2 }
  const moves2 = ludo.legalLudoMoves(mid, 0, 2)
  check('ludo: overshoot 57 blocked', !moves2.some((m) => m.token === 2), JSON.stringify(moves2))
  // capture math
  const cap = ludo.createLudo([{ id: 'a' }, { id: 'b' }])
  cap.tokens = [[5, -1, -1, -1], [-1, -1, -1, -1]]
  cap.roll = 4; cap.turn = 0
  // opponent token at ring square equal to our 5+4=9 → enemy p: ringSquare(1, p)=9 → p = (9-13+52)%52 = 48
  cap.tokens[1] = [48, -1, -1, -1]
  const res = ludo.applyLudoMove(cap, 0, { token: 0 })
  check('ludo: capture sends to yard', res.ok && res.captured && cap.tokens[1][0] === -1, JSON.stringify(res))
  // safe square: land on enemy start square (13) — safe
  const cap2 = ludo.createLudo([{ id: 'a' }, { id: 'b' }])
  cap2.roll = 6; cap2.turn = 0
  cap2.tokens[0] = [-1, -1, -1, -1]
  cap2.tokens[1] = [0, -1, -1, -1] // enemy own start square (safe)
  const res2 = ludo.applyLudoMove(cap2, 0, { token: 0 })
  check('ludo: no capture on safe start', res2.ok && cap2.tokens[1][0] === 0, JSON.stringify(res2))
  // home finish
  const fin = ludo.createLudo([{ id: 'a' }, { id: 'b' }])
  fin.roll = 1; fin.turn = 1 // will fail (opponent turn) — flip
  fin.turn = 0
  fin.tokens = [[56, 57, 57, 57], [-1, -1, -1, -1]]
  fin.roll = 1
  const res3 = ludo.applyLudoMove(fin, 0, { token: 0 })
  check('ludo: exact landing wins', res3.finished && res3.winnerIdx === 0, JSON.stringify(res3))
  // ranking
  check('ludo: ranking sorts by home', ludo.ludoRanking(fin)[0].playerIdx === 0)
}

// ---------- Snakes ----------
{
  const s = snakes.createSnakes([{ id: 'a' }, { id: 'b' }])
  check('snakes: start at 0', s.tokens[0] === 0 && s.tokens[1] === 0)
  check('snakes: ladders mapped', snakes.LADDERS[4] === 25 && snakes.LADDERS[74] === 92)
  check('snakes: snakes mapped', snakes.SNAKES[99] === 41 && snakes.SNAKES[27] === 5)
  // deterministic play through forcing many rolls
  let rolls = 0
  let last
  while (!last?.finished && rolls < 500) { last = snakes.applySnakesMove(s, s.turn); if (last.error) break; rolls++ }
  check('snakes: game eventually finishes', last?.finished === true && s.tokens.some((t) => t >= 100), JSON.stringify(s.tokens))
}

console.log(`\n${pass}/${pass + fail} engine checks passed`)
process.exit(fail ? 1 : 0)
