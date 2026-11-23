// Server-side game engines. Every move is validated here; the client only
// renders state and submits intents. States are stored as JSON in matches.state.

export type GameId = "reversi" | "ludo" | "snakes" | "tictactoe";

export interface MoveResult {
  state: unknown;
  finished: boolean;
  result: "win" | "loss" | "draw" | null;
  message: string;
}

const rand = (n: number) => Math.floor(Math.random() * n);
const pick = <T,>(arr: T[]): T => arr[rand(arr.length)] as T;

/* ---------------- TicTacToe ---------------- */

export interface TttState {
  board: ("" | "X" | "O")[];
  turn: "X" | "O";
  winner: "" | "X" | "O" | "draw";
  lastMove: number;
}

export function tttInitial(): TttState {
  return { board: Array(9).fill(""), turn: "X", winner: "", lastMove: -1 };
}

const TTT_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function tttWinner(board: ("" | "X" | "O")[]): "" | "X" | "O" | "draw" {
  for (const [a, b, c] of TTT_LINES) {
    if (a === undefined || b === undefined || c === undefined) continue;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a] as "X" | "O";
  }
  return board.every((c) => c !== "") ? "draw" : "";
}

function tttAiMove(board: ("" | "X" | "O")[]): number {
  const empty = board.map((v, i) => (v === "" ? i : -1)).filter((i) => i >= 0);
  // Win if possible
  for (const i of empty) {
    const copy = [...board]; copy[i] = "O";
    if (tttWinner(copy) === "O") return i;
  }
  // Block player
  for (const i of empty) {
    const copy = [...board]; copy[i] = "X";
    if (tttWinner(copy) === "X") return i;
  }
  if (board[4] === "") return 4;
  const corners = [0, 2, 6, 8].filter((i) => board[i] === "");
  if (corners.length) return pick(corners);
  return pick(empty);
}

export function tttMove(state: TttState, index: number): MoveResult {
  if (state.winner) throw new Error("This match is already finished.");
  if (state.turn !== "X") throw new Error("It is not your turn.");
  if (!Number.isInteger(index) || index < 0 || index > 8) throw new Error("Invalid cell.");
  if (state.board[index] !== "") throw new Error("That cell is already taken.");
  const board = [...state.board];
  board[index] = "X";
  let winner = tttWinner(board);
  let lastMove = index;
  let message = "Your move.";
  if (!winner) {
    const ai = tttAiMove(board);
    board[ai] = "O";
    lastMove = ai;
    winner = tttWinner(board);
    message = winner ? "" : "Opponent played. Your turn.";
  }
  const next: TttState = { board, turn: "X", winner, lastMove };
  if (winner === "X") return { state: next, finished: true, result: "win", message: "You win! Three in a row." };
  if (winner === "O") return { state: next, finished: true, result: "loss", message: "Opponent wins this round." };
  if (winner === "draw") return { state: next, finished: true, result: "draw", message: "It's a draw." };
  return { state: next, finished: false, result: null, message };
}

/* ---------------- Reversi ---------------- */

export interface RevState {
  board: ("" | "B" | "W")[];
  turn: "B" | "W";
  winner: "" | "B" | "W" | "draw";
  lastMove: number;
  message: string;
}

export function revInitial(): RevState {
  const board: ("" | "B" | "W")[] = Array(64).fill("");
  board[27] = "W"; board[28] = "B"; board[35] = "B"; board[36] = "W";
  return { board, turn: "B", winner: "", lastMove: -1, message: "Your turn — you play Black." };
}

const DIRS = [-9, -8, -7, -1, 1, 7, 8, 9];

function revFlips(board: ("" | "B" | "W")[], idx: number, color: "B" | "W"): number[] {
  if (board[idx] !== "") return [];
  const opp = color === "B" ? "W" : "B";
  const flips: number[] = [];
  const r = Math.floor(idx / 8), c = idx % 8;
  for (const d of DIRS) {
    const dr = Math.floor(d / 8) - (d === -1 || d === 1 ? 0 : 0) ;
    void dr;
    const stepR = d === -9 || d === -8 || d === -7 ? -1 : d === 7 || d === 8 || d === 9 ? 1 : 0;
    const stepC = d === -9 || d === -1 || d === 7 ? -1 : d === -7 || d === 1 || d === 9 ? 1 : 0;
    const line: number[] = [];
    let nr = r + stepR, nc = c + stepC;
    while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr * 8 + nc] === opp) {
      line.push(nr * 8 + nc);
      nr += stepR; nc += stepC;
    }
    if (line.length && nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr * 8 + nc] === color) {
      flips.push(...line);
    }
  }
  return flips;
}

export function revValidMoves(board: ("" | "B" | "W")[], color: "B" | "W"): number[] {
  const out: number[] = [];
  for (let i = 0; i < 64; i++) if (revFlips(board, i, color).length) out.push(i);
  return out;
}

function revAiPick(board: ("" | "B" | "W")[]): number {
  const moves = revValidMoves(board, "W");
  const corners = moves.filter((m) => [0, 7, 56, 63].includes(m));
  if (corners.length) return pick(corners);
  let best = moves[0] as number, bestScore = -1;
  for (const m of moves) {
    const score = revFlips(board, m, "W").length + Math.random() * 0.5;
    if (score > bestScore) { bestScore = score; best = m; }
  }
  return best;
}

function revCounts(board: ("" | "B" | "W")[]) {
  return {
    black: board.filter((c) => c === "B").length,
    white: board.filter((c) => c === "W").length,
  };
}

export function revMove(state: RevState, index: number): MoveResult {
  if (state.winner) throw new Error("This match is already finished.");
  if (state.turn !== "B") throw new Error("It is not your turn.");
  const flips = revFlips(state.board, index, "B");
  if (!flips.length) throw new Error("Invalid move — you must flip at least one disc.");
  const board = [...state.board];
  board[index] = "B";
  for (const f of flips) board[f] = "B";
  let message = `You flipped ${flips.length} disc${flips.length > 1 ? "s" : ""}.`;

  // Opponent turn (may chain if a side has no moves)
  let guard = 0;
  let current: "B" | "W" = "W";
  let winner: RevState["winner"] = "";
  while (guard++ < 4) {
    const moves = revValidMoves(board, current);
    if (!moves.length) {
      const other: "B" | "W" = current === "W" ? "B" : "W";
      if (!revValidMoves(board, other).length) {
        const { black, white } = revCounts(board);
        winner = black > white ? "B" : white > black ? "W" : "draw";
        break;
      }
      message += current === "W" ? " Opponent has no valid move — you play again." : " You have no valid move — opponent plays again.";
      current = other;
      continue;
    }
    if (current === "W") {
      const ai = revAiPick(board);
      const aiFlips = revFlips(board, ai, "W");
      board[ai] = "W";
      for (const f of aiFlips) board[f] = "W";
      message += ` Opponent flipped ${aiFlips.length}.`;
      current = "B";
      continue;
    }
    break; // back to player with a valid move
  }
  if (!winner && board.every((c) => c !== "")) {
    const { black, white } = revCounts(board);
    winner = black > white ? "B" : white > black ? "W" : "draw";
  }
  const next: RevState = { board, turn: "B", winner, lastMove: index, message };
  if (winner === "B") { const { black, white } = revCounts(board); return { state: next, finished: true, result: "win", message: `You win ${black}–${white}!` }; }
  if (winner === "W") { const { black, white } = revCounts(board); return { state: next, finished: true, result: "loss", message: `Opponent wins ${white}–${black}.` }; }
  if (winner === "draw") return { state: next, finished: true, result: "draw", message: "The match is a draw." };
  return { state: next, finished: false, result: null, message };
}

/* ---------------- Snakes & Ladders ---------------- */

export const SNAKES: Record<number, number> = {
  16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78,
};
export const LADDERS: Record<number, number> = {
  2: 38, 7: 14, 8: 31, 15: 34, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100,
};

export interface SnakeState {
  positions: [number, number]; // [player, opponent], 1..100 (0 = start square off-board counts as 1 base)
  turn: 0 | 1;
  dice: number;
  winner: -1 | 0 | 1;
  log: string[];
}

export function snakeInitial(): SnakeState {
  return { positions: [1, 1], turn: 0, dice: 0, winner: -1, log: ["Match started — you roll first."] };
}

function snakeAdvance(pos: number, roll: number): { pos: number; note: string } {
  let next = pos + roll;
  if (next > 100) next = pos; // must land exactly
  let note = "";
  if (LADDERS[next]) { note = ` Climbed a ladder to ${LADDERS[next]}!`; next = LADDERS[next] as number; }
  else if (SNAKES[next]) { note = ` Slid down a snake to ${SNAKES[next]}.`; next = SNAKES[next] as number; }
  return { pos: next, note };
}

export function snakeMove(state: SnakeState): MoveResult {
  if (state.winner !== -1) throw new Error("This match is already finished.");
  if (state.turn !== 0) throw new Error("It is not your turn.");
  const log = [...state.log];
  const positions: [number, number] = [...state.positions];
  const myRoll = 1 + rand(6);
  const mine = snakeAdvance(positions[0], myRoll);
  positions[0] = mine.pos;
  log.unshift(`You rolled ${myRoll} → square ${mine.pos}.${mine.note}`);
  let winner: -1 | 0 | 1 = -1;
  let lastDice = myRoll;
  if (positions[0] === 100) {
    winner = 0;
  } else {
    const oppRoll = 1 + rand(6);
    const opp = snakeAdvance(positions[1], oppRoll);
    positions[1] = opp.pos;
    lastDice = oppRoll;
    log.unshift(`Opponent rolled ${oppRoll} → square ${opp.pos}.${opp.note}`);
    if (positions[1] === 100) winner = 1;
  }
  const next: SnakeState = { positions, turn: 0, dice: lastDice, winner, log: log.slice(0, 8) };
  if (winner === 0) return { state: next, finished: true, result: "win", message: "You reached square 100 — you win!" };
  if (winner === 1) return { state: next, finished: true, result: "loss", message: "Opponent reached square 100 first." };
  return { state: next, finished: false, result: null, message: `You rolled ${myRoll}.` };
}

/* ---------------- Ludo (2-player race, 4 tokens each) ---------------- */

// Token progress: -1 = in base, 0..50 = main track, 51..56 = home stretch, 57 = finished.
// Track cell for a player = (startOffset + progress) % 52 for progress 0..50.
export interface LudoState {
  tokens: { p: number[]; o: number[] };
  turn: "p" | "o";
  dice: number;
  phase: "roll" | "move";
  movable: number[];
  winner: "" | "p" | "o";
  log: string[];
  sixes: number;
}

export function ludoInitial(): LudoState {
  return {
    tokens: { p: [-1, -1, -1, -1], o: [-1, -1, -1, -1] },
    turn: "p", dice: 0, phase: "roll", movable: [], winner: "", sixes: 0,
    log: ["Match started — roll the dice."],
  };
}

const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

function ludoMovable(tokens: number[], dice: number): number[] {
  const out: number[] = [];
  tokens.forEach((t, i) => {
    if (t === 57) return;
    if (t === -1) { if (dice === 6) out.push(i); return; }
    if (t + dice <= 57) out.push(i);
  });
  return out;
}

function ludoApply(
  state: LudoState,
  who: "p" | "o",
  tokenIdx: number,
): { extra: boolean; note: string } {
  const dice = state.dice;
  const mine = who === "p" ? state.tokens.p : state.tokens.o;
  const theirs = who === "p" ? state.tokens.o : state.tokens.p;
  const startOffset = who === "p" ? 0 : 26;
  const theirOffset = who === "p" ? 26 : 0;
  let note = "";
  let extra = dice === 6;
  if (mine[tokenIdx] === -1) {
    mine[tokenIdx] = 0;
    note = "Token out of base.";
  } else {
    mine[tokenIdx] = (mine[tokenIdx] as number) + dice;
    if (mine[tokenIdx] === 57) { note = "Token home!"; extra = true; }
  }
  // Capture
  const prog = mine[tokenIdx] as number;
  if (prog >= 0 && prog <= 50) {
    const cell = (startOffset + prog) % 52;
    if (!SAFE.has(cell)) {
      theirs.forEach((t, i) => {
        if (t >= 0 && t <= 50 && (theirOffset + t) % 52 === cell) {
          theirs[i] = -1;
          note += " Captured an opponent token!";
          extra = true;
        }
      });
    }
  }
  return { extra, note };
}

function ludoCheckWin(tokens: number[]): boolean {
  return tokens.every((t) => t === 57);
}

function ludoAiChoose(state: LudoState): number {
  const movable = state.movable;
  const tokens = state.tokens.o;
  // Prefer: finish a token, capture, leave base, then furthest token
  let best = movable[0] as number, bestScore = -Infinity;
  for (const i of movable) {
    const t = tokens[i] as number;
    let score = t + Math.random() * 2;
    if (t === -1) score = 40;
    if (t + state.dice === 57) score = 100;
    // capture check
    if (t >= 0 && t + state.dice <= 50) {
      const cell = (26 + t + state.dice) % 52;
      if (!SAFE.has(cell)) {
        const hit = state.tokens.p.some(
          (pt) => pt >= 0 && pt <= 50 && pt % 52 === cell,
        );
        if (hit) score = 90;
      }
    }
    if (score > bestScore) { bestScore = score; best = i; }
  }
  return best;
}

/** Player rolls the dice. */
export function ludoRoll(state: LudoState): MoveResult {
  if (state.winner) throw new Error("This match is already finished.");
  if (state.turn !== "p" || state.phase !== "roll") throw new Error("You cannot roll right now.");
  const dice = 1 + rand(6);
  const sixes = dice === 6 ? state.sixes + 1 : 0;
  const log = [...state.log];
  if (sixes >= 3) {
    log.unshift("Three 6s in a row — turn forfeited.");
    const next: LudoState = { ...state, dice, sixes: 0, phase: "roll", turn: "o", movable: [], log: log.slice(0, 8) };
    return ludoOpponentTurn(next);
  }
  const movable = ludoMovable(state.tokens.p, dice);
  log.unshift(`You rolled ${dice}.`);
  if (!movable.length) {
    log.unshift("No token can move — turn passes.");
    const next: LudoState = { ...state, dice, sixes: 0, phase: "roll", turn: "o", movable: [], log: log.slice(0, 8) };
    return ludoOpponentTurn(next);
  }
  const next: LudoState = { ...state, dice, sixes, phase: "move", movable, log: log.slice(0, 8) };
  return { state: next, finished: false, result: null, message: `You rolled ${dice} — choose a token.` };
}

/** Player moves a token after rolling. */
export function ludoMoveToken(state: LudoState, tokenIdx: number): MoveResult {
  if (state.winner) throw new Error("This match is already finished.");
  if (state.turn !== "p" || state.phase !== "move") throw new Error("Roll the dice first.");
  if (!state.movable.includes(tokenIdx)) throw new Error("That token cannot move with this roll.");
  const working: LudoState = {
    ...state,
    tokens: { p: [...state.tokens.p], o: [...state.tokens.o] },
    log: [...state.log],
  };
  const { extra, note } = ludoApply(working, "p", tokenIdx);
  if (note) working.log.unshift(`You: ${note}`);
  if (ludoCheckWin(working.tokens.p)) {
    working.winner = "p";
    return { state: working, finished: true, result: "win", message: "All your tokens are home — you win!" };
  }
  if (extra) {
    working.phase = "roll"; working.movable = []; working.sixes = state.dice === 6 ? state.sixes : 0;
    return { state: working, finished: false, result: null, message: "Bonus roll — roll again!" };
  }
  working.turn = "o"; working.phase = "roll"; working.movable = []; working.sixes = 0;
  return ludoOpponentTurn(working);
}

/** Runs the opponent's full turn (roll + move, with bonus rolls) and returns control. */
function ludoOpponentTurn(state: LudoState): MoveResult {
  const working: LudoState = {
    ...state,
    tokens: { p: [...state.tokens.p], o: [...state.tokens.o] },
    log: [...state.log],
  };
  let guard = 0;
  while (working.turn === "o" && guard++ < 12) {
    const dice = 1 + rand(6);
    working.dice = dice;
    working.log.unshift(`Opponent rolled ${dice}.`);
    const movable = ludoMovable(working.tokens.o, dice);
    if (!movable.length) { working.turn = "p"; break; }
    working.movable = movable;
    const choice = ludoAiChoose(working);
    const { extra, note } = ludoApply(working, "o", choice);
    if (note) working.log.unshift(`Opponent: ${note}`);
    if (ludoCheckWin(working.tokens.o)) {
      working.winner = "o";
      working.turn = "p"; working.phase = "roll"; working.movable = [];
      working.log = working.log.slice(0, 8);
      return { state: working, finished: true, result: "loss", message: "Opponent got all tokens home first." };
    }
    if (!extra) working.turn = "p";
  }
  working.turn = "p"; working.phase = "roll"; working.movable = []; working.sixes = 0;
  working.log = working.log.slice(0, 8);
  return { state: working, finished: false, result: null, message: "Opponent played. Your roll." };
}

/* ---------------- Dispatch ---------------- */

export function initialState(gameId: GameId): unknown {
  switch (gameId) {
    case "tictactoe": return tttInitial();
    case "reversi": return revInitial();
    case "snakes": return snakeInitial();
    case "ludo": return ludoInitial();
  }
}

export interface MovePayload {
  index?: number;
  action?: string;
  token?: number;
}

export function applyMove(gameId: GameId, state: unknown, move: MovePayload): MoveResult {
  switch (gameId) {
    case "tictactoe":
      if (move.index === undefined) throw new Error("Choose a cell.");
      return tttMove(state as TttState, move.index);
    case "reversi":
      if (move.index === undefined) throw new Error("Choose a cell.");
      return revMove(state as RevState, move.index);
    case "snakes":
      return snakeMove(state as SnakeState);
    case "ludo": {
      const s = state as LudoState;
      if (move.action === "roll") return ludoRoll(s);
      if (move.action === "move") {
        if (move.token === undefined) throw new Error("Choose a token.");
        return ludoMoveToken(s, move.token);
      }
      throw new Error("Unknown Ludo action.");
    }
  }
}
