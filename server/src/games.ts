// Server-side game engines. Every move is validated here; the client only
// renders state and submits intents. States are stored as JSON in matches.state.

export type GameId = "reversi" | "ludo" | "snakes" | "tictactoe" | "connect4" | "rps";
export type Difficulty = "easy" | "normal" | "hard";

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
  difficulty: Difficulty;
}

export function tttInitial(difficulty: Difficulty): TttState {
  return { board: Array(9).fill(""), turn: "X", winner: "", lastMove: -1, difficulty };
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

function tttMinimax(board: ("" | "X" | "O")[], isAi: boolean, depth: number): number {
  const winner = tttWinner(board);
  if (winner === "O") return 10 - depth;
  if (winner === "X") return depth - 10;
  if (winner === "draw") return 0;
  const empty = board.map((v, i) => (v === "" ? i : -1)).filter((i) => i >= 0);
  let best = isAi ? -Infinity : Infinity;
  for (const i of empty) {
    const copy = [...board];
    copy[i] = isAi ? "O" : "X";
    const score = tttMinimax(copy, !isAi, depth + 1);
    best = isAi ? Math.max(best, score) : Math.min(best, score);
  }
  return best;
}

function tttBestMove(board: ("" | "X" | "O")[]): number {
  const empty = board.map((v, i) => (v === "" ? i : -1)).filter((i) => i >= 0);
  for (const i of empty) {
    const copy = [...board]; copy[i] = "O";
    if (tttWinner(copy) === "O") return i;
  }
  for (const i of empty) {
    const copy = [...board]; copy[i] = "X";
    if (tttWinner(copy) === "X") return i;
  }
  if (board[4] === "") return 4;
  const corners = [0, 2, 6, 8].filter((i) => board[i] === "");
  if (corners.length) return pick(corners);
  return pick(empty);
}

function tttAiMove(state: TttState): number {
  const { board, difficulty } = state;
  if (difficulty === "easy") {
    // Mostly random — plays well only a third of the time.
    if (Math.random() < 0.34) return tttBestMove(board);
    return pick(board.map((v, i) => (v === "" ? i : -1)).filter((i) => i >= 0));
  }
  if (difficulty === "normal") return tttBestMove(board);
  // hard: full minimax — unbeatable
  const empty = board.map((v, i) => (v === "" ? i : -1)).filter((i) => i >= 0);
  let best = empty[0] as number, bestScore = -Infinity;
  for (const i of empty) {
    const copy = [...board]; copy[i] = "O";
    const score = tttMinimax(copy, false, 1);
    if (score > bestScore) { bestScore = score; best = i; }
  }
  return best;
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
    const ai = tttAiMove({ ...state, board });
    board[ai] = "O";
    lastMove = ai;
    winner = tttWinner(board);
    message = winner ? "" : "Opponent played. Your turn.";
  }
  const next: TttState = { board, turn: "X", winner, lastMove, difficulty: state.difficulty };
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
  difficulty: Difficulty;
}

export function revInitial(difficulty: Difficulty): RevState {
  const board: ("" | "B" | "W")[] = Array(64).fill("");
  board[27] = "W"; board[28] = "B"; board[35] = "B"; board[36] = "W";
  return { board, turn: "B", winner: "", lastMove: -1, message: "Your turn — you play Black.", difficulty };
}

function revFlips(board: ("" | "B" | "W")[], idx: number, color: "B" | "W"): number[] {
  if (board[idx] !== "") return [];
  const opp = color === "B" ? "W" : "B";
  const flips: number[] = [];
  const r = Math.floor(idx / 8), c = idx % 8;
  for (const d of [-9, -8, -7, -1, 1, 7, 8, 9]) {
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

const REV_WEIGHTS = [
  120, -20, 20, 5, 5, 20, -20, 120,
  -40, -60, -8, -5, -5, -8, -60, -40,
  20, -8, 15, 3, 3, 15, -8, 20,
  5, -5, 3, 3, 3, 3, -5, 5,
  5, -5, 3, 3, 3, 3, -5, 5,
  20, -8, 15, 3, 3, 15, -8, 20,
  -40, -60, -8, -5, -5, -8, -60, -40,
  120, -20, 20, 5, 5, 20, -20, 120,
];

const REV_RISKY = [0, 1, 6, 7, 8, 9, 14, 15, 48, 49, 54, 55, 56, 57, 62, 63];

function revAiPick(state: RevState): number {
  const board = state.board;
  const moves = revValidMoves(board, "W");
  if (state.difficulty === "easy") {
    const safe = moves.filter((m) => !REV_RISKY.includes(m));
    return pick(safe.length ? safe : moves);
  }
  const corners = moves.filter((m) => [0, 7, 56, 63].includes(m));
  if (corners.length) return pick(corners);
  if (state.difficulty === "normal") {
    let best = moves[0] as number, bestScore = -1;
    for (const m of moves) {
      const score = revFlips(board, m, "W").length + Math.random() * 0.5;
      if (score > bestScore) { bestScore = score; best = m; }
    }
    return best;
  }
  // hard: position-weighted, with a look-ahead that avoids handing over corners
  let best = moves[0] as number, bestScore = -Infinity;
  for (const m of moves) {
    const flips = revFlips(board, m, "W");
    const copy = [...board];
    copy[m] = "W";
    for (const f of flips) copy[f] = "W";
    let score = (REV_WEIGHTS[m] as number) + flips.length * 2;
    for (let i = 0; i < 64; i++) if (copy[i] === "W") score += (REV_WEIGHTS[i] as number) * 0.25;
    const replies = revValidMoves(copy, "B");
    if (replies.some((r2) => [0, 7, 56, 63].includes(r2))) score -= 400;
    score += Math.random() * 3;
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
      const ai = revAiPick(state);
      const aiFlips = revFlips(board, ai, "W");
      board[ai] = "W";
      for (const f of aiFlips) board[f] = "W";
      message += ` Opponent flipped ${aiFlips.length}.`;
      current = "B";
      continue;
    }
    break;
  }
  if (!winner && board.every((c) => c !== "")) {
    const { black, white } = revCounts(board);
    winner = black > white ? "B" : white > black ? "W" : "draw";
  }
  const next: RevState = { board, turn: "B", winner, lastMove: index, message, difficulty: state.difficulty };
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
  difficulty: Difficulty;
}

export function snakeInitial(difficulty: Difficulty): SnakeState {
  return { positions: [1, 1], turn: 0, dice: 0, winner: -1, log: ["Match started — you roll first."], difficulty };
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
  const next: SnakeState = { positions, turn: 0, dice: lastDice, winner, log: log.slice(0, 8), difficulty: state.difficulty };
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
  difficulty: Difficulty;
}

export function ludoInitial(difficulty: Difficulty): LudoState {
  return {
    tokens: { p: [-1, -1, -1, -1], o: [-1, -1, -1, -1] },
    turn: "p", dice: 0, phase: "roll", movable: [], winner: "", sixes: 0, difficulty,
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
  if (state.difficulty === "easy") return pick(movable);
  const tokens = state.tokens.o;
  // Prefer: finish a token, capture, leave base (hard only), then furthest token
  let best = movable[0] as number, bestScore = -Infinity;
  for (const i of movable) {
    const t = tokens[i] as number;
    let score = t + Math.random() * 2;
    if (t === -1) score = state.difficulty === "hard" ? 40 : 4;
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

/* ---------------- Connect Four ---------------- */

export const C4_ROWS = 6;
export const C4_COLS = 7;

export interface C4State {
  board: number[]; // row-major 42 cells: 0 empty, 1 player, 2 opponent
  turn: "p" | "o";
  winner: "" | "p" | "o" | "draw";
  lastMove: number; // cell index or -1
  difficulty: Difficulty;
}

export function c4Initial(difficulty: Difficulty): C4State {
  return { board: Array(C4_ROWS * C4_COLS).fill(0), turn: "p", winner: "", lastMove: -1, difficulty };
}

function c4DropRow(board: number[], col: number): number {
  for (let r = C4_ROWS - 1; r >= 0; r--) {
    if (board[r * C4_COLS + col] === 0) return r;
  }
  return -1;
}

const C4_DIRS: Array<[number, number]> = [[0, 1], [1, 0], [1, 1], [1, -1]];

function c4WinningLine(board: number[], player: number): number[] | null {
  for (const [dr, dc] of C4_DIRS) {
    for (let r = 0; r < C4_ROWS; r++) {
      for (let c = 0; c < C4_COLS; c++) {
        const line: number[] = [];
        let complete = true;
        for (let k = 0; k < 4; k++) {
          const rr = r + dr * k, cc = c + dc * k;
          if (rr < 0 || rr >= C4_ROWS || cc < 0 || cc >= C4_COLS || board[rr * C4_COLS + cc] !== player) {
            complete = false;
            break;
          }
          line.push(rr * C4_COLS + cc);
        }
        if (complete) return line;
      }
    }
  }
  return null;
}

function c4ValidCols(board: number[]): number[] {
  const out: number[] = [];
  for (let c = 0; c < C4_COLS; c++) if (board[c] === 0) out.push(c);
  return out;
}

function c4Heuristic(board: number[]): number {
  let score = 0;
  const lineOf = (r: number, c: number, dr: number, dc: number): number[] | null => {
    const w: number[] = [];
    for (let k = 0; k < 4; k++) {
      const rr = r + dr * k, cc = c + dc * k;
      if (rr < 0 || rr >= C4_ROWS || cc < 0 || cc >= C4_COLS) return null;
      w.push(board[rr * C4_COLS + cc]);
    }
    return w;
  };
  for (const [dr, dc] of C4_DIRS) {
    for (let r = 0; r < C4_ROWS; r++) {
      for (let c = 0; c < C4_COLS; c++) {
        const w = lineOf(r, c, dr, dc);
        if (!w) continue;
        const mine = w.filter((v) => v === 2).length;
        const theirs = w.filter((v) => v === 1).length;
        if (mine && theirs) continue;
        if (mine === 3) score += 50;
        else if (mine === 2) score += 8;
        else if (theirs === 3) score -= 60;
        else if (theirs === 2) score -= 9;
      }
    }
  }
  for (let r = 0; r < C4_ROWS; r++) {
    if (board[r * C4_COLS + 3] === 2) score += 6;
    if (board[r * C4_COLS + 3] === 1) score -= 6;
  }
  return score;
}

function c4Minimax(board: number[], depth: number, isAi: boolean, alpha: number, beta: number): number {
  if (c4WinningLine(board, 2)) return 10000 - (4 - depth);
  if (c4WinningLine(board, 1)) return -10000 + (4 - depth);
  const cols = c4ValidCols(board);
  if (!cols.length || depth === 0) return c4Heuristic(board);
  if (isAi) {
    let best = -Infinity;
    for (const col of cols) {
      const copy = [...board];
      copy[c4DropRow(copy, col) * C4_COLS + col] = 2;
      best = Math.max(best, c4Minimax(copy, depth - 1, false, alpha, beta));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }
  let best = Infinity;
  for (const col of cols) {
    const copy = [...board];
    copy[c4DropRow(copy, col) * C4_COLS + col] = 1;
    best = Math.min(best, c4Minimax(copy, depth - 1, true, alpha, beta));
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

function c4AiColumn(state: C4State): number {
  const board = state.board;
  const cols = c4ValidCols(board);
  if (!cols.length) throw new Error("The board is full.");
  if (state.difficulty === "easy") return pick(cols);
  // Immediately win if possible
  for (const col of cols) {
    const copy = [...board];
    copy[c4DropRow(copy, col) * C4_COLS + col] = 2;
    if (c4WinningLine(copy, 2)) return col;
  }
  // Block the player's winning move
  const blockable = cols.find((col) => {
    const copy = [...board];
    copy[c4DropRow(copy, col) * C4_COLS + col] = 1;
    return c4WinningLine(copy, 1);
  });
  if (blockable !== undefined) return blockable;
  // hard: shallow minimax; never open the cell directly above our reply for a player win
  if (state.difficulty === "hard") {
    let best = cols[0] as number, bestScore = -Infinity;
    for (const col of cols) {
      const copy = [...board];
      const row = c4DropRow(copy, col);
      copy[row * C4_COLS + col] = 2;
      let score = c4Minimax(copy, 3, false, -Infinity, Infinity);
      if (row > 0) {
        copy[(row - 1) * C4_COLS + col] = 1;
        if (c4WinningLine(copy, 1)) score -= 9000;
        copy[(row - 1) * C4_COLS + col] = 0;
      }
      score += Math.random() * 4;
      if (score > bestScore) { bestScore = score; best = col; }
    }
    return best;
  }
  // normal: weighted-random toward the center
  const weights = cols.map((c) => 4 - Math.abs(c - 3) + Math.random() * 2);
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < cols.length; i++) {
    roll -= weights[i] as number;
    if (roll <= 0) return cols[i] as number;
  }
  return cols[cols.length - 1] as number;
}

export function c4Move(state: C4State, col: number): MoveResult {
  if (state.winner) throw new Error("This match is already finished.");
  if (state.turn !== "p") throw new Error("It is not your turn.");
  if (!Number.isInteger(col) || col < 0 || col >= C4_COLS) throw new Error("Invalid column.");
  const row = c4DropRow(state.board, col);
  if (row === -1) throw new Error("That column is already full.");
  const board = [...state.board];
  board[row * C4_COLS + col] = 1;
  const lastMove = row * C4_COLS + col;
  let winner: C4State["winner"] = "";
  if (c4WinningLine(board, 1)) winner = "p";
  let message = "Disc dropped. Opponent is thinking…";
  if (!winner && c4ValidCols(board).length) {
    const aiCol = c4AiColumn(state);
    const aiRow = c4DropRow(board, aiCol);
    board[aiRow * C4_COLS + aiCol] = 2;
    if (c4WinningLine(board, 2)) winner = "o";
  }
  if (!winner && !c4ValidCols(board).length) winner = "draw";
  const next: C4State = { board, turn: "p", winner, lastMove, difficulty: state.difficulty };
  if (winner === "p") return { state: next, finished: true, result: "win", message: "Four in a row — you win!" };
  if (winner === "o") return { state: next, finished: true, result: "loss", message: "Opponent connected four. Nice try!" };
  if (winner === "draw") return { state: next, finished: true, result: "draw", message: "The board is full — it's a draw." };
  return { state: next, finished: false, result: null, message };
}

/* ---------------- RPS Blitz (best of 5) ---------------- */

export interface RpsState {
  pScore: number;
  oScore: number;
  round: number;
  history: Array<{ p: 0 | 1 | 2; o: 0 | 1 | 2 }>;
  lastP: number;
  lastO: number;
  lastOutcome: "" | "win" | "loss" | "draw";
  winner: "" | "p" | "o" | "draw";
  difficulty: Difficulty;
}

export const RPS_TARGET = 3; // first to 3 points wins, best of 5

export function rpsInitial(difficulty: Difficulty): RpsState {
  return { pScore: 0, oScore: 0, round: 1, history: [], lastP: -1, lastO: -1, lastOutcome: "", winner: "", difficulty };
}

const RPS_NAMES = ["Rock", "Paper", "Scissors"];
const RPS_BEATS = (a: number, b: number) => (a === b ? 0 : (a + 1) % 3 === b ? 1 : -1); // 1 = a wins

function rpsAiThrow(state: RpsState): number {
  if (state.difficulty === "easy") return rand(3);
  const freq = [0, 0, 0];
  for (const h of state.history) freq[h.p] += 1;
  const most = freq.indexOf(Math.max(...freq));
  if (state.difficulty === "hard" && state.history.length >= 3) {
    // Markov-style: what does the player follow their last throw with?
    const last = state.history[state.history.length - 1]?.p;
    const follow = [0, 0, 0];
    for (let i = 1; i < state.history.length; i++) {
      if (state.history[i - 1]?.p === last) follow[state.history[i]?.p ?? 0] += 1;
    }
    const followTotal = follow.reduce((a, b) => a + b, 0);
    if (followTotal >= 2) {
      const predicted = follow.indexOf(Math.max(...follow));
      return (predicted + 1) % 3; // counter the predicted throw
    }
  }
  const total = freq.reduce((a, b) => a + b, 0);
  if (total > 0 && Math.random() < (state.difficulty === "hard" ? 0.75 : 0.55)) return (most + 1) % 3;
  return rand(3);
}

export function rpsMove(state: RpsState, throwIndex: number): MoveResult {
  if (state.winner) throw new Error("This match is already finished.");
  if (!Number.isInteger(throwIndex) || throwIndex < 0 || throwIndex > 2) throw new Error("Choose Rock, Paper or Scissors.");
  const aiThrow = rpsAiThrow(state);
  const outcome = RPS_BEATS(throwIndex, aiThrow);
  const history = [...state.history, { p: throwIndex as 0 | 1 | 2, o: aiThrow as 0 | 1 | 2 }];
  let pScore = state.pScore;
  let oScore = state.oScore;
  let lastOutcome: RpsState["lastOutcome"] = "draw";
  let message = "Draw — go again.";
  if (outcome === 1) { pScore += 1; lastOutcome = "win"; message = `${RPS_NAMES[throwIndex]} beats ${RPS_NAMES[aiThrow]} — point to you!`; }
  if (outcome === -1) { oScore += 1; lastOutcome = "loss"; message = `${RPS_NAMES[aiThrow]} beats ${RPS_NAMES[throwIndex]} — point to the opponent.`; }
  const next: RpsState = {
    ...state, pScore, oScore, round: state.round + 1, history,
    lastP: throwIndex, lastO: aiThrow, lastOutcome, winner: "",
  };
  if (pScore >= RPS_TARGET) next.winner = "p";
  else if (oScore >= RPS_TARGET) next.winner = "o";
  if (next.winner === "p") return { state: next, finished: true, result: "win", message: `You take the blitz ${pScore}–${oScore}!` };
  if (next.winner === "o") return { state: next, finished: true, result: "loss", message: `Opponent takes the blitz ${oScore}–${pScore}.` };
  return { state: next, finished: false, result: null, message };
}

/* ---------------- Dispatch ---------------- */

export function initialState(gameId: GameId, difficulty: Difficulty = "normal"): unknown {
  switch (gameId) {
    case "tictactoe": return tttInitial(difficulty);
    case "reversi": return revInitial(difficulty);
    case "snakes": return snakeInitial(difficulty);
    case "ludo": return ludoInitial(difficulty);
    case "connect4": return c4Initial(difficulty);
    case "rps": return rpsInitial(difficulty);
  }
}

export function normalizeDifficulty(value: string | undefined): Difficulty {
  return value === "easy" || value === "hard" ? value : "normal";
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
    case "connect4":
      if (move.index === undefined) throw new Error("Choose a column.");
      return c4Move(state as C4State, move.index);
    case "rps":
      if (move.index === undefined) throw new Error("Choose Rock, Paper or Scissors.");
      return rpsMove(state as RpsState, move.index);
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
