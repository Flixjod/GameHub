import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "./api";
import { Avatar, GAME_META, Icon, ProgressBar } from "./ui";

type Match = ApiResponse<typeof api, "getMatch">["match"];

/* Local mirrors of the server state shapes (rendering only — server validates). */
interface TttState { board: string[]; winner: string }
interface RevState { board: string[]; winner: string; message: string }
interface SnakeState { positions: [number, number]; dice: number; winner: number; log: string[] }
interface LudoState {
  tokens: { p: number[]; o: number[] }; dice: number; phase: string;
  movable: number[]; winner: string; log: string[];
}

const SNAKES: Record<number, number> = { 16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78 };
const LADDERS: Record<number, number> = { 2: 38, 7: 14, 8: 31, 15: 34, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100 };

function revValidMoves(board: string[]): number[] {
  const dirs = [-9, -8, -7, -1, 1, 7, 8, 9];
  const out: number[] = [];
  for (let idx = 0; idx < 64; idx++) {
    if (board[idx] !== "") continue;
    const r = Math.floor(idx / 8), c = idx % 8;
    let ok = false;
    for (const d of dirs) {
      const sr = d === -9 || d === -8 || d === -7 ? -1 : d === 7 || d === 8 || d === 9 ? 1 : 0;
      const sc = d === -9 || d === -1 || d === 7 ? -1 : d === -7 || d === 1 || d === 9 ? 1 : 0;
      let nr = r + sr, nc = c + sc, seen = 0;
      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr * 8 + nc] === "W") { seen++; nr += sr; nc += sc; }
      if (seen && nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr * 8 + nc] === "B") { ok = true; break; }
    }
    if (ok) out.push(idx);
  }
  return out;
}

/* Ludo board geometry: progress -> [row, col] on a 15x15 grid */
const TRACK: Array<[number, number]> = (() => {
  const cells: Array<[number, number]> = [];
  // Standard 52-cell Ludo track (row, col), starting at red start (6,1) going right along row 6
  const path: Array<[number, number]> = [
    [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
    [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
    [0, 7], [0, 8],
    [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
    [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
    [7, 14], [8, 14],
    [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
    [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
    [14, 7], [14, 6],
    [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
    [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
    [7, 0], [6, 0],
  ];
  path.forEach((p) => cells.push(p));
  return cells;
})();
const P_HOME: Array<[number, number]> = [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]];
const O_HOME: Array<[number, number]> = [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]];
const P_BASE: Array<[number, number]> = [[2, 2], [2, 3], [3, 2], [3, 3]];
const O_BASE: Array<[number, number]> = [[11, 11], [11, 12], [12, 11], [12, 12]];

function ludoCell(progress: number, who: "p" | "o", idx: number): [number, number] {
  if (progress === -1) return (who === "p" ? P_BASE : O_BASE)[idx] ?? [0, 0];
  if (progress === 57) return [7, 7];
  if (progress >= 51) return (who === "p" ? P_HOME : O_HOME)[progress - 51] ?? [7, 7];
  const offset = who === "p" ? 0 : 26;
  return TRACK[(offset + progress) % 52] ?? [0, 0];
}

const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

export function PlayScreen({ matchId, onExit, onPlayAgain }: {
  matchId: number;
  onExit: () => void;
  onPlayAgain: (gameId: string) => void;
}) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [reward, setReward] = useState<{ xp: number; coins: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const startRef = useRef(Date.now());

  const matchQ = useQuery({
    queryKey: ["match", matchId],
    queryFn: () => api.getMatch({ matchId }),
    refetchInterval: (q) => (q.state.data?.match.status === "active" ? 3000 : false),
  });
  const match = matchQ.data?.match;

  useEffect(() => {
    startRef.current = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [matchId]);

  const move = useMutation({
    mutationFn: async (payload: { index?: number; action?: string; token?: number }) => {
      if (!match) throw new Error("Match not loaded.");
      return api.makeMove({ matchId, version: match.version, ...payload });
    },
    onSuccess: (data) => {
      setMessage(data.message);
      if (data.reward) setReward(data.reward);
      queryClient.setQueryData(["match", matchId], { match: data.match });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => {
      setMessage(e instanceof Error ? e.message : "Move failed.");
      void queryClient.invalidateQueries({ queryKey: ["match", matchId] });
    },
  });

  const abandon = useMutation({
    mutationFn: async () => api.abandonMatch({ matchId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onExit();
    },
    onError: (e) => setMessage(e instanceof Error ? e.message : "Could not leave the match."),
  });

  const meta = useMemo(() => (match ? GAME_META[match.gameId] : undefined), [match]);
  const state = useMemo(() => {
    if (!match) return null;
    try { return JSON.parse(match.state) as Record<string, unknown>; } catch { return null; }
  }, [match]);

  if (matchQ.isPending || !match || !meta || !state) {
    return (
      <div className="gh-card p-8 text-center gh-fadein">
        <div className="gh-float inline-block text-[var(--accent)]">{Icon.gamepad(40)}</div>
        <p className="mt-3 text-[var(--dim)]">Loading your match…</p>
        <button type="button" className="gh-btn-ghost px-5 py-2 mt-4 text-sm" onClick={onExit}>Back to Home</button>
      </div>
    );
  }

  const finished = match.status === "finished";
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const busy = move.isPending;

  const resultBanner = finished ? (
    <div className="gh-card p-6 text-center gh-pop" style={{ borderColor: match.result === "win" ? "var(--accent)" : undefined }}>
      <div className="flex justify-center text-[var(--gold)]">{match.result === "win" ? Icon.trophy(44) : match.result === "draw" ? Icon.target(44) : Icon.shield(44)}</div>
      <h3 className="font-display text-2xl font-extrabold mt-2">
        {match.result === "win" ? "Victory!" : match.result === "draw" ? "It's a Draw" : "Defeat"}
      </h3>
      <p className="text-sm text-[var(--dim)] mt-1">{message || "Match complete."}</p>
      {reward && (
        <p className="mt-3 inline-flex gap-3 text-sm font-semibold">
          <span className="text-[var(--accent)]">+{reward.xp} XP</span>
          <span className="text-[var(--gold)]">+{reward.coins} coins</span>
        </p>
      )}
      <div className="flex gap-3 justify-center mt-5 flex-wrap">
        <button type="button" className="gh-btn-primary px-6 py-2.5 text-sm" onClick={() => onPlayAgain(match.gameId)}>Play Again</button>
        <button type="button" className="gh-btn-ghost px-6 py-2.5 text-sm" onClick={onExit}>Back to Home</button>
      </div>
    </div>
  ) : null;

  return (
    <div className="gh-fadein">
      <button type="button" onClick={() => (finished ? onExit() : setConfirmLeave(true))} className="inline-flex items-center gap-2 text-sm text-[var(--dim)] hover:text-[var(--accent)] mb-4 min-h-9">
        {Icon.back(18)} Leave match
      </button>

      {confirmLeave && !finished && (
        <div className="gh-card p-5 mb-4" role="alertdialog" aria-label="Leave match confirmation">
          <p className="font-semibold">Leave this match?</p>
          <p className="text-sm text-[var(--dim)] mt-1">Leaving counts as a loss and frees your room seat. Your progress in this match will be lost.</p>
          <div className="flex gap-3 mt-4">
            <button type="button" className="gh-btn-primary px-5 py-2 text-sm" style={{ background: "linear-gradient(135deg,#f87171,#dc2626)", color: "#fff", boxShadow: "none" }} disabled={abandon.isPending} onClick={() => abandon.mutate()}>
              {abandon.isPending ? "Leaving…" : "Yes, leave"}
            </button>
            <button type="button" className="gh-btn-ghost px-5 py-2 text-sm" onClick={() => setConfirmLeave(false)}>Keep playing</button>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="gh-card p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div className="flex items-center gap-3">
              <img src={meta.img} alt={meta.name} className="w-12 h-12 rounded-xl object-cover" />
              <div>
                <h2 className="font-display font-extrabold text-xl leading-tight">{meta.name}</h2>
                <p className="text-xs text-[var(--dim)]">{match.mode === "room" ? "Live room match" : "Ranked match"} · vs {match.opponent}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--dim)]">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)" }}>
                {Icon.clock(15)} {mm}:{ss}
              </span>
              {!finished && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[var(--accent)]" style={{ background: "rgba(46,232,154,0.08)", border: "1px solid var(--border)" }}><span className="gh-live-dot w-2 h-2 rounded-full bg-[var(--accent)] inline-block" /> Your turn</span>}
            </div>
          </div>

          {match.gameId === "tictactoe" && (
            <TttBoard state={state as unknown as TttState} disabled={busy || finished} onMove={(i) => move.mutate({ index: i })} />
          )}
          {match.gameId === "reversi" && (
            <RevBoard state={state as unknown as RevState} disabled={busy || finished} onMove={(i) => move.mutate({ index: i })} />
          )}
          {match.gameId === "snakes" && (
            <SnakeBoard state={state as unknown as SnakeState} disabled={busy || finished} onRoll={() => move.mutate({})} />
          )}
          {match.gameId === "ludo" && (
            <LudoBoard state={state as unknown as LudoState} disabled={busy || finished} onRoll={() => move.mutate({ action: "roll" })} onToken={(t) => move.mutate({ action: "move", token: t })} opponent={match.opponent} />
          )}

          {message && !finished && (
            <p className="mt-4 text-sm text-center text-[var(--dim)]" role="status">{busy ? "Opponent is thinking…" : message}</p>
          )}
          {busy && !message && <p className="mt-4 text-sm text-center text-[var(--dim)]">Opponent is thinking…</p>}
        </div>

        <div className="space-y-5">
          <div className="gh-card p-5">
            <h3 className="font-display font-bold mb-4">Players</h3>
            <div className="flex items-center gap-3">
              <Avatar name="You" img size={44} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">You</p>
                <p className="text-xs text-[var(--dim)]">{match.gameId === "reversi" ? "Black discs" : match.gameId === "tictactoe" ? "Playing X" : match.gameId === "ludo" ? "Red tokens" : "First to 100"}</p>
              </div>
              {!finished && <span className="text-xs font-bold text-[var(--accent)]">TURN</span>}
            </div>
            <div className="flex items-center gap-3 mt-4">
              <Avatar name={match.opponent} color="#8B5CF6" size={44} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{match.opponent}</p>
                <p className="text-xs text-[var(--dim)]">{match.mode === "room" ? "Room host" : "Platform rival"}</p>
              </div>
            </div>
            {match.gameId === "reversi" && <RevScore state={state as unknown as RevState} />}
            {match.gameId === "ludo" && <LudoScore state={state as unknown as LudoState} />}
            {match.gameId === "snakes" && <SnakeScore state={state as unknown as SnakeState} />}
          </div>

          {(match.gameId === "snakes" || match.gameId === "ludo") && (
            <div className="gh-card p-5">
              <h3 className="font-display font-bold mb-3">Match Feed</h3>
              <ul className="space-y-2 text-sm text-[var(--dim)]">
                {((state as unknown as SnakeState).log ?? []).map((line, i) => (
                  <li key={i} className={i === 0 ? "text-[var(--text)]" : ""}>{line}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="gh-card p-5">
            <h3 className="font-display font-bold mb-2">How scoring works</h3>
            <p className="text-sm text-[var(--dim)]">Win +100 XP · +60 coins<br />Draw +40 XP · +25 coins<br />Loss +15 XP · +10 coins<br />Every move is validated on the server, and the result is saved to your match history.</p>
          </div>
        </div>
      </div>

      {resultBanner && <div className="mt-5">{resultBanner}</div>}
    </div>
  );
}

/* ---------------- Boards ---------------- */

function TttBoard({ state, disabled, onMove }: { state: TttState; disabled: boolean; onMove: (i: number) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2.5 max-w-[340px] mx-auto" role="grid" aria-label="TicTacToe board">
      {state.board.map((cell, i) => (
        <button
          key={i} type="button" disabled={disabled || cell !== ""}
          aria-label={`Cell ${i + 1}${cell ? `, ${cell}` : ""}`}
          onClick={() => onMove(i)}
          className="aspect-square rounded-2xl font-display text-5xl font-extrabold flex items-center justify-center transition-all"
          style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)",
            color: cell === "X" ? "var(--cyan)" : "#F472B6",
            textShadow: cell ? `0 0 18px ${cell === "X" ? "rgba(34,211,238,0.6)" : "rgba(244,114,182,0.6)"}` : "none",
          }}
        >
          {cell && <span className="gh-pop">{cell}</span>}
        </button>
      ))}
    </div>
  );
}

function RevScore({ state }: { state: RevState }) {
  const black = state.board.filter((c) => c === "B").length;
  const white = state.board.filter((c) => c === "W").length;
  return (
    <div className="mt-4 space-y-2">
      <div className="flex justify-between text-sm"><span>You (Black)</span><b>{black}</b></div>
      <ProgressBar value={black} max={Math.max(1, black + white)} />
      <div className="flex justify-between text-sm text-[var(--dim)]"><span>Opponent (White)</span><b>{white}</b></div>
    </div>
  );
}

function RevBoard({ state, disabled, onMove }: { state: RevState; disabled: boolean; onMove: (i: number) => void }) {
  const valid = useMemo(() => (state.winner ? [] : revValidMoves(state.board)), [state]);
  return (
    <div className="max-w-[440px] mx-auto">
      <div className="grid grid-cols-8 gap-1 p-2 rounded-2xl" style={{ background: "linear-gradient(150deg,#0d3b26,#082418)", border: "1px solid var(--border-strong)" }} role="grid" aria-label="Reversi board">
        {state.board.map((cell, i) => {
          const isValid = valid.includes(i);
          return (
            <button
              key={i} type="button" disabled={disabled || !isValid}
              aria-label={`Cell ${i + 1}${cell === "B" ? ", black disc" : cell === "W" ? ", white disc" : isValid ? ", valid move" : ""}`}
              onClick={() => onMove(i)}
              className="aspect-square rounded-md flex items-center justify-center relative"
              style={{ background: "rgba(46,232,154,0.07)", border: "1px solid rgba(46,232,154,0.12)" }}
            >
              {cell && (
                <span className="gh-pop block w-[78%] h-[78%] rounded-full" style={{
                  background: cell === "B" ? "radial-gradient(circle at 32% 30%, #4b5563, #030504 65%)" : "radial-gradient(circle at 32% 30%, #ffffff, #b9c4bc 70%)",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.55)",
                }} />
              )}
              {!cell && isValid && <span className="block w-[26%] h-[26%] rounded-full" style={{ background: "rgba(46,232,154,0.45)" }} />}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-[var(--dim)] text-center mt-3">Glowing dots mark your valid moves. Flip the most discs to win.</p>
    </div>
  );
}

function SnakeScore({ state }: { state: SnakeState }) {
  return (
    <div className="mt-4 space-y-2 text-sm">
      <div className="flex justify-between"><span>You</span><b>Square {state.positions[0]}</b></div>
      <ProgressBar value={state.positions[0]} max={100} />
      <div className="flex justify-between text-[var(--dim)]"><span>Opponent</span><b>Square {state.positions[1]}</b></div>
      <ProgressBar value={state.positions[1]} max={100} color="#8B5CF6" />
    </div>
  );
}

function SnakeBoard({ state, disabled, onRoll }: { state: SnakeState; disabled: boolean; onRoll: () => void }) {
  // Build rows top (100..91) to bottom (1..10), boustrophedon
  const rows: number[][] = [];
  for (let r = 9; r >= 0; r--) {
    const base = r * 10;
    const row = Array.from({ length: 10 }, (_, c) => base + c + 1);
    if (r % 2 === 1) row.reverse();
    rows.push(row);
  }
  return (
    <div className="max-w-[460px] mx-auto">
      <div className="grid grid-cols-10 gap-[3px] p-2 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }} aria-label="Snake and Ladder board">
        {rows.flat().map((n) => {
          const isSnake = SNAKES[n] !== undefined;
          const isLadder = LADDERS[n] !== undefined;
          const hasP = state.positions[0] === n;
          const hasO = state.positions[1] === n;
          return (
            <div key={n} className="aspect-square rounded-[4px] relative flex items-center justify-center"
              style={{
                background: (Math.floor((n - 1) / 10) + (n - 1) % 10) % 2 === 0 ? "rgba(46,232,154,0.05)" : "rgba(255,255,255,0.025)",
                border: n === 100 ? "1px solid var(--gold)" : "1px solid rgba(255,255,255,0.04)",
              }}>
              <span className="absolute top-[1px] left-[3px] text-[8px] text-[var(--dim)]">{n}</span>
              {isSnake && <span className="text-[10px]" aria-label={`Snake head, slides to ${SNAKES[n]}`}>🐍</span>}
              {isLadder && <span className="text-[10px]" aria-label={`Ladder, climbs to ${LADDERS[n]}`}>🪜</span>}
              {hasP && <span className="gh-pop absolute bottom-[1px] left-[2px] w-3.5 h-3.5 rounded-full" style={{ background: "var(--accent)", border: "2px solid #04150c", boxShadow: "0 0 8px rgba(46,232,154,0.8)" }} aria-label="Your position" />}
              {hasO && <span className="gh-pop absolute bottom-[1px] right-[2px] w-3.5 h-3.5 rounded-full" style={{ background: "#8B5CF6", border: "2px solid #150826", boxShadow: "0 0 8px rgba(139,92,246,0.8)" }} aria-label="Opponent position" />}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-4 mt-4">
        <span className="text-4xl" aria-hidden="true">{state.dice ? DICE_FACES[state.dice - 1] : "🎲"}</span>
        <button type="button" className="gh-btn-primary px-7 py-2.5 text-sm inline-flex items-center gap-2" disabled={disabled} onClick={onRoll}>
          {Icon.dice(18)} Roll Dice
        </button>
      </div>
      <p className="text-xs text-[var(--dim)] text-center mt-2">You must land exactly on 100. 🐍 heads slide down, 🪜 feet climb up.</p>
    </div>
  );
}

function LudoScore({ state }: { state: LudoState }) {
  const done = (arr: number[]) => arr.filter((t) => t === 57).length;
  return (
    <div className="mt-4 space-y-2 text-sm">
      <div className="flex justify-between"><span>Your tokens home</span><b>{done(state.tokens.p)} / 4</b></div>
      <ProgressBar value={done(state.tokens.p)} max={4} color="#F87171" />
      <div className="flex justify-between text-[var(--dim)]"><span>Opponent tokens home</span><b>{done(state.tokens.o)} / 4</b></div>
      <ProgressBar value={done(state.tokens.o)} max={4} color="#60A5FA" />
    </div>
  );
}

function LudoBoard({ state, disabled, onRoll, onToken, opponent }: {
  state: LudoState; disabled: boolean;
  onRoll: () => void; onToken: (t: number) => void; opponent: string;
}) {
  const cells = new Map<string, ReactNode[]>();
  const push = (rc: [number, number], node: ReactNode, key: string) => {
    const k = `${rc[0]}-${rc[1]}`;
    const arr = cells.get(k) ?? [];
    arr.push(<span key={key}>{node}</span>);
    cells.set(k, arr);
  };
  state.tokens.p.forEach((prog, i) => {
    const movable = state.phase === "move" && state.movable.includes(i);
    push(ludoCell(prog, "p", i), (
      <button type="button" disabled={disabled || !movable} onClick={() => onToken(i)}
        aria-label={`Your token ${i + 1}${movable ? ", can move" : ""}`}
        className="gh-pop w-[74%] h-[74%] rounded-full block"
        style={{
          background: "radial-gradient(circle at 32% 30%, #fca5a5, #dc2626 70%)",
          border: "2px solid #450a0a",
          boxShadow: movable ? "0 0 0 2px var(--gold), 0 0 12px rgba(245,197,66,0.8)" : "0 1px 4px rgba(0,0,0,0.5)",
          cursor: movable ? "pointer" : "default",
        }} />
    ), `p${i}`);
  });
  state.tokens.o.forEach((prog, i) => {
    push(ludoCell(prog, "o", i), (
      <span className="gh-pop w-[74%] h-[74%] rounded-full block" aria-label={`${opponent} token ${i + 1}`}
        style={{ background: "radial-gradient(circle at 32% 30%, #93c5fd, #2563eb 70%)", border: "2px solid #172554", boxShadow: "0 1px 4px rgba(0,0,0,0.5)" }} />
    ), `o${i}`);
  });

  const zoneColor = (r: number, c: number): string => {
    if (r < 6 && c < 6) return "rgba(220,38,38,0.20)";
    if (r < 6 && c > 8) return "rgba(34,197,94,0.16)";
    if (r > 8 && c < 6) return "rgba(245,197,66,0.16)";
    if (r > 8 && c > 8) return "rgba(37,99,235,0.20)";
    if (r === 7 && c >= 1 && c <= 5) return "rgba(220,38,38,0.30)";
    if (c === 7 && r >= 1 && r <= 5) return "rgba(34,197,94,0.28)";
    if (r === 7 && c >= 9 && c <= 13) return "rgba(37,99,235,0.30)";
    if (c === 7 && r >= 9 && r <= 13) return "rgba(245,197,66,0.28)";
    if (r >= 6 && r <= 8 && c >= 6 && c <= 8) return "rgba(245,197,66,0.25)";
    return "rgba(255,255,255,0.03)";
  };

  return (
    <div className="max-w-[460px] mx-auto">
      <div className="grid gap-[2px] p-2 rounded-2xl" style={{ gridTemplateColumns: "repeat(15, 1fr)", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }} aria-label="Ludo board">
        {Array.from({ length: 15 }, (_, r) =>
          Array.from({ length: 15 }, (_, c) => {
            const content = cells.get(`${r}-${c}`);
            return (
              <div key={`${r}-${c}`} className="aspect-square rounded-[3px] flex items-center justify-center relative"
                style={{ background: zoneColor(r, c), border: "1px solid rgba(255,255,255,0.04)" }}>
                {content && (
                  <span className={`flex items-center justify-center ${content.length > 1 ? "w-full h-full scale-[0.62] gap-0 flex-wrap" : "w-full h-full"}`}>
                    {content}
                  </span>
                )}
              </div>
            );
          }),
        )}
      </div>
      <div className="flex items-center justify-center gap-4 mt-4">
        <span className="text-4xl" aria-hidden="true">{state.dice ? DICE_FACES[state.dice - 1] : "🎲"}</span>
        {state.phase === "roll" ? (
          <button type="button" className="gh-btn-primary px-7 py-2.5 text-sm inline-flex items-center gap-2" disabled={disabled} onClick={onRoll}>
            {Icon.dice(18)} Roll Dice
          </button>
        ) : (
          <p className="text-sm font-semibold text-[var(--gold)]">Tap a glowing token to move it {state.dice} steps</p>
        )}
      </div>
      <p className="text-xs text-[var(--dim)] text-center mt-2">Roll a 6 to leave base. Land on an opponent outside a safe star square to capture it. First to bring all 4 tokens home wins.</p>
    </div>
  );
}
