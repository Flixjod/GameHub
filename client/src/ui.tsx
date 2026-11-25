import type { ReactNode } from "react";
import { api, type ApiResponse } from "./api";
import { connect4Art, rpsArt } from "./art";
import heroImg from "./assets/hero.webp";
import avatarImg from "./assets/avatar.webp";
import reversiImg from "./assets/game-reversi.webp";
import ludoImg from "./assets/game-ludo.webp";
import snakesImg from "./assets/game-snakes.webp";
import tttImg from "./assets/game-tictactoe.webp";

export { heroImg, avatarImg };

export type View =
  | "home" | "games" | "tournaments" | "leaderboard" | "friends" | "store" | "settings"
  | "play" | "waiting" | "rooms" | "history" | "profile";

export type Dashboard = ApiResponse<typeof api, "getDashboard">;
export type Player = Dashboard["friendsOnline"][number];
export type Room = Dashboard["rooms"][number];

export const GAME_META: Record<string, { name: string; tagline: string; description: string; category: string; players: string; img: string; accent: string }> = {
  reversi: { name: "Reversi", tagline: "Flip. Conquer. Win.", description: "Outflank your opponent's discs and flip the board to your color. Corner control wins games.", category: "Strategy", players: "2 Players", img: reversiImg, accent: "#2EE89A" },
  ludo: { name: "Ludo", tagline: "Roll. Move. Win.", description: "Race all four tokens around the board and home before your opponent. Captures send rivals back to base.", category: "Board", players: "2 Players", img: ludoImg, accent: "#F5C542" },
  snakes: { name: "Snake & Ladder", tagline: "Climb. Don't Fall.", description: "Roll the dice, climb ladders and dodge the snakes on the race to square 100.", category: "Casual", players: "2 Players", img: snakesImg, accent: "#22D3EE" },
  tictactoe: { name: "TicTacToe", tagline: "Think. Win.", description: "The classic three-in-a-row duel. Quick, sharp, and unforgiving of a single mistake.", category: "Strategy", players: "2 Players", img: tttImg, accent: "#F472B6" },
  connect4: { name: "Connect Four", tagline: "Drop. Align. Win.", description: "Line up four discs horizontally, vertically or diagonally before your rival does. Center control is everything.", category: "Strategy", players: "2 Players", img: connect4Art, accent: "#60A5FA" },
  rps: { name: "RPS Blitz", tagline: "Read. React. Win.", description: "Rock, Paper, Scissors, first to three points. Read your rival's pattern and counter it before they read yours.", category: "Casual", players: "1 v 1", img: rpsArt, accent: "#A3E635" },
};
export const GAME_IDS = Object.keys(GAME_META);

/* ---------- Icons (inline SVG, stroke style) ---------- */

const P = ({ d, size = 20 }: { d: string | string[]; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {(Array.isArray(d) ? d : [d]).map((path, i) => <path key={i} d={path} />)}
  </svg>
);

export const Icon = {
  home: (s?: number) => <P size={s} d={["M3 10.5 12 3l9 7.5", "M5 9.5V21h14V9.5", "M9 21v-6h6v6"]} />,
  gamepad: (s?: number) => <P size={s} d={["M6 9h12a4 4 0 0 1 4 4.6c0 2-1.3 3.4-3 3.4-1 0-1.7-.5-2.3-1.2L15.5 14h-7l-1.2 1.8C6.7 16.5 6 17 5 17c-1.7 0-3-1.4-3-3.4A4 4 0 0 1 6 9Z", "M7.5 11v4", "M5.5 13h4", "M16.5 11.5h.01", "M18.5 14h.01"]} />,
  trophy: (s?: number) => <P size={s} d={["M8 21h8", "M12 17v4", "M7 4h10v5a5 5 0 0 1-10 0V4Z", "M7 6H4a2 2 0 0 0 0 4h3", "M17 6h3a2 2 0 0 1 0 4h-3"]} />,
  chart: (s?: number) => <P size={s} d={["M4 20V10", "M10 20V4", "M16 20v-7", "M22 20H2"]} />,
  users: (s?: number) => <P size={s} d={["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M22 21v-2a4 4 0 0 0-3-3.9", "M16 3.1a4 4 0 0 1 0 7.8"]} />,
  shield: (s?: number) => <P size={s} d={["M12 22s8-3.6 8-10V5l-8-3-8 3v7c0 6.4 8 10 8 10Z", "M12 8v4", "M12 16h.01"]} />,
  gear: (s?: number) => <P size={s} d={["M12.2 2h-.4a2 2 0 0 0-2 2v.2a7 7 0 0 0-1.9.8L6.4 3.6a2 2 0 0 0-2.8 0l-.3.3a2 2 0 0 0 0 2.8l1.4 1.5a7 7 0 0 0-.8 1.9H2a2 2 0 0 0-2 2v.4a2 2 0 0 0 2 2h.2a7 7 0 0 0 .8 1.9l-1.4 1.5a2 2 0 0 0 0 2.8l.3.3a2 2 0 0 0 2.8 0l1.5-1.4a7 7 0 0 0 1.9.8V22a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a7 7 0 0 0 1.9-.8l1.5 1.4a2 2 0 0 0 2.8 0l.3-.3a2 2 0 0 0 0-2.8l-1.4-1.5a7 7 0 0 0 .8-1.9h.2a2 2 0 0 0 2-2V12a2 2 0 0 0-2-2h-.2a7 7 0 0 0-.8-1.9l1.4-1.5a2 2 0 0 0 0-2.8l-.3-.3a2 2 0 0 0-2.8 0l-1.5 1.4a7 7 0 0 0-1.9-.8V4a2 2 0 0 0-2-2Z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"]} />,
  bell: (s?: number) => <P size={s} d={["M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9", "M10.3 21a1.9 1.9 0 0 0 3.4 0"]} />,
  search: (s?: number) => <P size={s} d={["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z", "m21 21-4.3-4.3"]} />,
  crown: (s?: number) => <P size={s} d={["m2 6 4 5 6-7 6 7 4-5-1.7 11.3a1 1 0 0 1-1 .7H4.7a1 1 0 0 1-1-.7L2 6Z", "M4 21h16"]} />,
  star: (s?: number) => <P size={s} d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21 7 14.2 2 9.3l6.9-1L12 2Z" />,
  arrow: (s?: number) => <P size={s} d={["M5 12h14", "m12 5 7 7-7 7"]} />,
  check: (s?: number) => <P size={s} d="M20 6 9 17l-5-5" />,
  x: (s?: number) => <P size={s} d={["M18 6 6 18", "m6 6 12 12"]} />,
  play: (s?: number) => <P size={s} d="m6 4 14 8-14 8V4Z" />,
  zap: (s?: number) => <P size={s} d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />,
  flag: (s?: number) => <P size={s} d={["M4 22V4c4-2 8 2 12 0v10c-4 2-8-2-12 0", "M4 22v-7"]} />,
  target: (s?: number) => <P size={s} d={["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z", "M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z", "M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"]} />,
  gem: (s?: number) => <P size={s} d={["M6 3h12l4 6-10 12L2 9l4-6Z", "M2 9h20", "m12 21-4-12 4-6 4 6-4 12"]} />,
  coins: (s?: number) => <P size={s} d={["M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z", "M12 7v10", "M15 9.5c-.6-1-1.7-1.5-3-1.5-1.7 0-3 .9-3 2.2 0 3 6 1.6 6 4.1 0 1.3-1.3 2.2-3 2.2-1.3 0-2.4-.5-3-1.5"]} />,
  clock: (s?: number) => <P size={s} d={["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M12 7v5l3 2"]} />,
  chevD: (s?: number) => <P size={s} d="m6 9 6 6 6-6" />,
  back: (s?: number) => <P size={s} d={["M19 12H5", "m12 19-7-7 7-7"]} />,
  plus: (s?: number) => <P size={s} d={["M12 5v14", "M5 12h14"]} />,
  send: (s?: number) => <P size={s} d={["m22 2-7 20-4-9-9-4 20-7Z", "M22 2 11 13"]} />,
  trash: (s?: number) => <P size={s} d={["M3 6h18", "M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2", "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"]} />,
  dice: (s?: number) => <P size={s} d={["M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z", "M8 8h.01", "M16 8h.01", "M12 12h.01", "M8 16h.01", "M16 16h.01"]} />,
  verified: (s?: number) => (
    <svg width={s ?? 16} height={s ?? 16} viewBox="0 0 24 24" fill="#2EE89A" aria-hidden="true">
      <path d="M12 1.8 14.5 4l3.3-.3 1 3.1 3 1.4-1.2 3.1 1.2 3.1-3 1.4-1 3.1-3.3-.3L12 22.2 9.5 20l-3.3.3-1-3.1-3-1.4L3.4 12 2.2 8.9l3-1.4 1-3.1 3.3.3L12 1.8Z" opacity=".9" />
      <path d="m9 12.2 2.1 2.1L15.4 10" stroke="#04150c" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

/* ---------- Small shared components ---------- */

export function Avatar({ name, color, size = 40, img }: { name: string; color?: string; size?: number; img?: boolean }) {
  if (img) {
    return <img src={avatarImg} alt={name} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  }
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <span
      className="rounded-full inline-flex items-center justify-center font-bold shrink-0"
      style={{
        width: size, height: size, fontSize: size * 0.36,
        background: `linear-gradient(135deg, ${color ?? "#2EE89A"}33, ${color ?? "#2EE89A"}14)`,
        color: color ?? "#2EE89A",
        border: `1.5px solid ${color ?? "#2EE89A"}66`,
      }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

export function StatusDot({ status, size = 10 }: { status: string; size?: number }) {
  const color = status === "online" ? "#2EE89A" : status === "ingame" ? "#F5C542" : "#5b6b61";
  return <span className="rounded-full inline-block shrink-0" style={{ width: size, height: size, background: color, border: "2px solid #0b1510" }} aria-label={status} />;
}

export function ProgressBar({ value, max, color = "var(--accent)", height = 8 }: { value: number; max: number; color?: string; height?: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height, background: "rgba(255,255,255,0.08)" }} role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div className="gh-progress rounded-full h-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}CC)`, boxShadow: `0 0 10px ${color}66` }} />
    </div>
  );
}

export function SectionTitle({ icon, title, action }: { icon: ReactNode; title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-display font-bold text-lg flex items-center gap-2">
        <span className="text-[var(--accent)]">{icon}</span> {title}
      </h2>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, body, children }: { icon: ReactNode; title: string; body: string; children?: ReactNode }) {
  return (
    <div className="text-center py-8 px-4">
      <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: "rgba(46,232,154,0.08)", color: "var(--accent)", border: "1px solid var(--border)" }}>
        {icon}
      </div>
      <p className="font-display font-semibold">{title}</p>
      <p className="text-sm text-[var(--dim)] mt-1 max-w-sm mx-auto">{body}</p>
      {children}
    </div>
  );
}

export function AchievementIcon({ icon, size = 44 }: { icon: string; size?: number }) {
  const map: Record<string, ReactNode> = {
    trophy: Icon.trophy(22), crown: Icon.crown(22), zap: Icon.zap(22), flag: Icon.flag(22),
    gamepad: Icon.gamepad(22), target: Icon.target(22), users: Icon.users(22), gem: Icon.gem(22),
  };
  return (
    <span className="rounded-2xl inline-flex items-center justify-center shrink-0" style={{
      width: size, height: size, color: "#C4B5FD",
      background: "linear-gradient(145deg, rgba(139,92,246,0.35), rgba(139,92,246,0.12))",
      border: "1px solid rgba(139,92,246,0.45)",
      boxShadow: "0 0 18px rgba(139,92,246,0.25)",
    }}>
      {map[icon] ?? Icon.trophy(22)}
    </span>
  );
}

export function StoreIcon({ icon, size = 44 }: { icon: string; size?: number }) {
  const map: Record<string, ReactNode> = {
    crown: Icon.crown(22), frame: Icon.target(22), palette: Icon.gem(22),
    sparkles: Icon.zap(22), party: Icon.star(22), zap: Icon.zap(22), gem: Icon.gem(22),
  };
  return (
    <span className="rounded-2xl inline-flex items-center justify-center shrink-0" style={{
      width: size, height: size, color: "var(--gold)",
      background: "linear-gradient(145deg, rgba(245,197,66,0.22), rgba(245,197,66,0.06))",
      border: "1px solid rgba(245,197,66,0.35)",
    }}>
      {map[icon] ?? Icon.gem(22)}
    </span>
  );
}
