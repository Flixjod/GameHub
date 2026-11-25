import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import {
AchievementIcon, Avatar, GAME_IDS, GAME_META, Icon, ProgressBar, SectionTitle,
StatusDot, avatarImg, heroImg, type Player, type View,
} from "./ui";
import { PlayScreen } from "./Play";
import { WaitingRoom } from "./WaitingRoom";
import { actionFields } from "@hatch/space-sdk/fields" with { type: "macro" };
import type { Actions } from "../../server/src/actions";
import {
FriendsPage, GamesPage, HistoryPage, LeaderboardPage, ProfilePage, RoomCard,
RoomsPage, SettingsPage, StorePage, TournamentsPage,
} from "./pages";

const FIELDS = actionFields<typeof Actions>();

const NAV: Array<{ view: View; label: string; icon: (s?: number) => ReactNode }> = [
  { view: "home", label: "Home", icon: Icon.home },
  { view: "games", label: "Games", icon: Icon.gamepad },
  { view: "tournaments", label: "Tournaments", icon: Icon.trophy },
  { view: "leaderboard", label: "Leaderboard", icon: Icon.chart },
  { view: "friends", label: "Friends", icon: Icon.users },
  { view: "store", label: "Store", icon: Icon.shield },
  { view: "settings", label: "Settings", icon: Icon.gear },
];

const HERO_SLIDES = [
  { line1: "Play. Enjoy.", line2: "With Friends.", sub: "Discover amazing games, challenge players, and have endless fun!" },
  { line1: "Challenge. Compete.", line2: "Win Together.", sub: "Jump into live rooms, climb the leaderboard, and earn XP and coins in every match." },
  { line1: "Roll. Race.", line2: "Celebrate.", sub: "From Ludo races to Reversi duels — your next favorite game night starts here." },
];

export function App() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("home");
  const [activeMatchId, setActiveMatchId] = useState<number | null>(null);
  const [activeQueue, setActiveQueue] = useState<{ queueId: number; gameId: string } | null>(null);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [searchFocus, setSearchFocus] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  const [invitePlayer, setInvitePlayer] = useState<Player | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dashboardQ = useQuery({ queryKey: ["dashboard"], queryFn: () => api.getDashboard({}) });
  const dash = dashboardQ.data;
  const settingsQ = useQuery({ queryKey: ["settings"], queryFn: () => api.getSettings({}) });

  // Apply saved accent color
  useEffect(() => {
    const accent = settingsQ.data?.settings.accent;
    if (!accent) return;
    const color = accent === "cyan" ? "#22D3EE" : accent === "purple" ? "#8B5CF6" : "#2EE89A";
    document.documentElement.style.setProperty("--accent", color);
  }, [settingsQ.data]);

  // Hero carousel auto-advance
  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % HERO_SLIDES.length), 7000);
    return () => clearInterval(t);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3600);
  };

  const searchQ = useQuery({
    queryKey: ["search", search.trim()],
    queryFn: () => api.searchAll({ query: search.trim() }),
    enabled: search.trim().length >= 2,
  });

  const notifQ = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.listNotifications({}),
    enabled: notifOpen,
  });
  const markRead = useMutation({
    mutationFn: async () => api.markNotificationsRead({}),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["dashboard"] }); void queryClient.invalidateQueries({ queryKey: ["notifications"] }); },
  });

  const startMatch = useMutation({
    mutationFn: async (args: { gameId: string; opponent?: string; difficulty?: "easy" | "normal" | "hard" }) =>
      api.startMatch({ gameId: args.gameId as "ludo", opponent: args.opponent, difficulty: args.difficulty }),
    onSuccess: (data) => { setActiveMatchId(data.matchId); setView("play"); },
    onError: (e) => showToast(e instanceof Error ? e.message : "Could not start the match."),
  });
  const joinQueue = useMutation({
    mutationFn: async (args: { gameId: string; difficulty: "easy" | "normal" | "hard" }) =>
      api.joinQueue({ gameId: args.gameId as "ludo", difficulty: args.difficulty }),
    onSuccess: (data, args) => { setActiveQueue({ queueId: data.queueId, gameId: args.gameId }); setView("waiting"); },
    onError: (e) => showToast(e instanceof Error ? e.message : "Could not join the waiting room."),
  });
  const joinRoom = useMutation({
    mutationFn: async (roomId: number) => api.joinRoom({ roomId }),
    onSuccess: (data) => { setActiveMatchId(data.matchId); setView("play"); showToast("Joined! Your match against the host has started."); },
    onError: (e) => showToast(e instanceof Error ? e.message : "Could not join the room."),
  });

  const go = (v: View) => {
    setView(v);
    setProfileOpen(false);
    setNotifOpen(false);
    window.scrollTo({ top: 0 });
  };

  const playGame = (gameId: string, opponent?: string, difficulty?: "easy" | "normal" | "hard") =>
    startMatch.mutate({ gameId, opponent, difficulty });
  const queueGame = (gameId: string, difficulty: "easy" | "normal" | "hard" = "normal") =>
    joinQueue.mutate({ gameId, difficulty });
  const currentSlide = HERO_SLIDES[slide] ?? HERO_SLIDES[0]!;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="flex">
        {/* ---------- Sidebar (desktop) ---------- */}
        <aside className="hidden lg:flex flex-col w-[228px] shrink-0 h-screen sticky top-0 pt-safe px-4 py-5" style={{ borderRight: "1px solid var(--border)", background: "linear-gradient(180deg,#071009,#050807)" }} aria-label="Main navigation">
          <div className="flex items-center gap-2.5 px-2 mb-7">
            <span className="text-[var(--accent)]" style={{ filter: "drop-shadow(0 0 8px rgba(46,232,154,0.6))" }}>{Icon.gamepad(30)}</span>
            <span className="font-display text-[22px] font-extrabold tracking-tight">Game<span className="text-[var(--accent)]">Hub</span></span>
          </div>
          <nav className="space-y-1.5">
            {NAV.map((item) => {
              const active = view === item.view || (item.view === "games" && view === "play");
              return (
                <button key={item.view} type="button" onClick={() => go(item.view)} aria-current={active ? "page" : undefined}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[15px] font-medium transition-all"
                  style={active
                    ? { background: "linear-gradient(90deg, rgba(46,232,154,0.22), rgba(46,232,154,0.06))", color: "var(--accent)", border: "1px solid var(--border-strong)", boxShadow: "0 0 18px rgba(46,232,154,0.15)" }
                    : { color: "var(--dim)", border: "1px solid transparent" }}>
                  {item.icon(21)} {item.label}
                </button>
              );
            })}
            <button type="button" onClick={() => go("rooms")} aria-current={view === "rooms" ? "page" : undefined}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[15px] font-medium transition-all"
              style={view === "rooms"
                ? { background: "linear-gradient(90deg, rgba(46,232,154,0.22), rgba(46,232,154,0.06))", color: "var(--accent)", border: "1px solid var(--border-strong)" }
                : { color: "var(--dim)", border: "1px solid transparent" }}>
              {Icon.users(21)} Live Rooms
              <span className="gh-live-dot ml-auto w-2 h-2 rounded-full bg-[var(--accent)]" />
            </button>
          </nav>

          <div className="gh-card p-4 mt-7 text-center" style={{ borderColor: "rgba(245,197,66,0.3)" }}>
            <span className="inline-block text-[var(--gold)]">{Icon.crown(26)}</span>
            <p className="font-display font-bold mt-1" style={{ color: "var(--gold)" }}>Go Premium</p>
            <p className="text-xs text-[var(--dim)] mt-1">Unlock more games, features & rewards!</p>
            {dash?.profile.premium ? (
              <p className="mt-3 text-sm font-bold text-[var(--gold)] inline-flex items-center gap-1.5">{Icon.check(15)} Premium Active</p>
            ) : (
              <button type="button" className="gh-btn-primary w-full py-2.5 mt-3 text-sm inline-flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg,#ffd968,#e8a812)", boxShadow: "0 6px 20px rgba(245,197,66,0.3)" }} onClick={() => go("store")}>
                Upgrade {Icon.arrow(15)}
              </button>
            )}
          </div>

          <button type="button" onClick={() => go("profile")} className="mt-auto flex items-center gap-3 p-3 rounded-2xl text-left w-full" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }} aria-label="Open your profile">
            <img src={avatarImg} alt="" className="w-11 h-11 rounded-full object-cover" />
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-1 font-semibold text-sm truncate">{dash?.profile.username ?? "ProGamer"} {Icon.verified(14)}</span>
              <span className="block text-xs text-[var(--dim)]">Level {dash?.profile.level ?? 1}</span>
              <span className="block mt-1.5"><ProgressBar value={dash?.profile.xpIntoLevel ?? 0} max={dash?.profile.xpSpan ?? 100} height={5} /></span>
            </span>
          </button>
        </aside>

        {/* ---------- Main column ---------- */}
        <div className="flex-1 min-w-0">
          {/* Top bar */}
          <header className="sticky top-0 z-40 pt-safe" style={{ background: "rgba(5,8,7,0.88)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3 px-4 sm:px-6 py-3 max-w-[1400px] mx-auto">
              <span className="lg:hidden flex items-center gap-2 shrink-0">
                <span className="text-[var(--accent)]">{Icon.gamepad(26)}</span>
                <span className="font-display font-extrabold text-lg">Game<span className="text-[var(--accent)]">Hub</span></span>
              </span>
              <div className="relative flex-1 max-w-xl">
                <label className="relative block">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--dim)]">{Icon.search(18)}</span>
                  <input {...FIELDS.searchAll.query} aria-label="Search games and players" className="gh-input w-full pl-11 pr-4 py-2.5 text-sm" placeholder="Search games, players…"
                    value={search} onChange={(e) => setSearch(e.target.value)} onFocus={() => setSearchFocus(true)} onBlur={() => setTimeout(() => setSearchFocus(false), 200)} />
                </label>
                {searchFocus && search.trim().length >= 2 && (
                  <div className="absolute left-0 right-0 top-full mt-2 gh-card p-2 z-50 max-h-[70vh] overflow-auto" role="listbox" aria-label="Search results">
                    {searchQ.isPending && <p className="px-3 py-2 text-sm text-[var(--dim)]">Searching…</p>}
                    {searchQ.isSuccess && !searchQ.data.games.length && !searchQ.data.players.length && !searchQ.data.tournaments.length && (
                      <p className="px-3 py-2 text-sm text-[var(--dim)]">No results for “{search.trim()}”.</p>
                    )}
                    {searchQ.data?.games.map((g) => (
                      <button key={g.id} type="button" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/5" onClick={() => { playGame(g.id); setSearch(""); }}>
                        <img src={GAME_META[g.id]?.img} alt="" className="w-9 h-9 rounded-lg object-cover" />
                        <span className="flex-1"><span className="block font-semibold text-sm">{g.name}</span><span className="block text-xs text-[var(--dim)]">{g.tagline}</span></span>
                        <span className="text-xs font-bold text-[var(--accent)]">PLAY</span>
                      </button>
                    ))}
                    {searchQ.data?.players.map((p) => (
                      <button key={p.id} type="button" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/5" onClick={() => { go("friends"); setSearch(""); }}>
                        <Avatar name={p.name} color={p.color} size={36} />
                        <span className="flex-1"><span className="block font-semibold text-sm">{p.name}</span><span className="block text-xs text-[var(--dim)]">Level {p.level} · Rating {p.rating.toLocaleString()}</span></span>
                        <StatusDot status={p.status} />
                      </button>
                    ))}
                    {searchQ.data?.tournaments.map((t) => (
                      <button key={t.id} type="button" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/5" onClick={() => { go("tournaments"); setSearch(""); }}>
                        <span className="text-[var(--gold)]">{Icon.trophy(20)}</span>
                        <span className="flex-1"><span className="block font-semibold text-sm">{t.name}</span><span className="block text-xs text-[var(--dim)] capitalize">{t.status} tournament</span></span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="ml-auto flex items-center gap-2.5 shrink-0">
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-full font-bold text-sm text-[var(--gold)]" style={{ background: "rgba(245,197,66,0.1)", border: "1px solid rgba(245,197,66,0.3)" }}>
                  {Icon.coins(16)} {(dash?.profile.coins ?? 0).toLocaleString()}
                </span>
                <span className="relative">
                  <button type="button" aria-label={`Notifications${dash?.unread ? `, ${dash.unread} unread` : ""}`} className="w-11 h-11 rounded-full flex items-center justify-center relative"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}
                    onClick={() => { setNotifOpen((v) => !v); setProfileOpen(false); }}>
                    {Icon.bell(20)}
                    {(dash?.unread ?? 0) > 0 && <span className="absolute top-2 right-2.5 w-2.5 h-2.5 rounded-full bg-[var(--accent)] gh-live-dot" />}
                  </button>
                  {notifOpen && (
                    <span className="absolute right-0 top-full mt-2 w-[320px] max-w-[86vw] gh-card p-2 z-50 block text-left">
                      <span className="flex items-center justify-between px-3 py-2">
                        <span className="font-display font-bold">Notifications</span>
                        {(dash?.unread ?? 0) > 0 && (
                          <button type="button" className="text-xs font-semibold text-[var(--accent)]" onClick={() => markRead.mutate()}>Mark all read</button>
                        )}
                      </span>
                      <span className="block max-h-[50vh] overflow-auto">
                        {notifQ.isPending && <span className="block px-3 py-2 text-sm text-[var(--dim)]">Loading…</span>}
                        {notifQ.data?.notifications.length === 0 && <span className="block px-3 py-2 text-sm text-[var(--dim)]">You're all caught up.</span>}
                        {notifQ.data?.notifications.map((n) => (
                          <span key={n.id} className="block px-3 py-2.5 rounded-xl" style={{ background: n.read ? undefined : "rgba(46,232,154,0.06)" }}>
                            <span className="block font-semibold text-sm">{n.title}</span>
                            <span className="block text-xs text-[var(--dim)] mt-0.5">{n.body}</span>
                            <span className="block text-[11px] text-[var(--dim)] mt-1">{new Date(n.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                          </span>
                        ))}
                      </span>
                    </span>
                  )}
                </span>
                <span className="relative">
                  <button type="button" aria-label="Open profile menu" aria-expanded={profileOpen} className="flex items-center gap-1.5" onClick={() => { setProfileOpen((v) => !v); setNotifOpen(false); }}>
                    <img src={avatarImg} alt="" className="w-11 h-11 rounded-full object-cover" style={{ border: "2px solid var(--border-strong)" }} />
                    <span className="text-[var(--dim)] hidden sm:block">{Icon.chevD(16)}</span>
                  </button>
                  {profileOpen && (
                    <span className="absolute right-0 top-full mt-2 w-52 gh-card p-2 z-50 block text-left">
                      <span className="block px-3 py-2">
                        <span className="flex items-center gap-1 font-semibold text-sm">{dash?.profile.username} {Icon.verified(14)}</span>
                        <span className="block text-xs text-[var(--dim)]">Level {dash?.profile.level} · {dash?.profile.xp} XP</span>
                      </span>
                      {([
                        ["Profile", () => go("profile")],
                        ["Match History", () => go("history")],
                        ["Store", () => go("store")],
                        ["Settings", () => go("settings")],
                      ] as Array<[string, () => void]>).map(([label, fn]) => (
                        <button key={label} type="button" className="w-full px-3 py-2.5 rounded-xl text-left text-sm hover:bg-white/5 block" onClick={fn}>{label}</button>
                      ))}
                    </span>
                  )}
                </span>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="px-4 sm:px-6 py-5 pb-24 lg:pb-10 max-w-[1400px] mx-auto w-full">
            {view === "play" && activeMatchId !== null ? (
              <PlayScreen matchId={activeMatchId} onExit={() => go("home")} onPlayAgain={(g) => playGame(g)} />
            ) : view === "waiting" && activeQueue ? (
              <WaitingRoom
                queueId={activeQueue.queueId}
                gameId={activeQueue.gameId}
                onMatched={(matchId) => { setActiveQueue(null); setActiveMatchId(matchId); setView("play"); showToast("Opponent found — match starting!"); }}
                onExit={() => { setActiveQueue(null); go("games"); }}
              />
            ) : view === "games" ? (
              <GamesPage onPlay={playGame} onQueue={queueGame} onJoinRoom={(id) => joinRoom.mutate(id)} />
            ) : view === "rooms" ? (
              <RoomsPage onJoinRoom={(id) => joinRoom.mutate(id)} onPlay={playGame} />
            ) : view === "tournaments" ? (
              <TournamentsPage onPlay={playGame} />
            ) : view === "leaderboard" ? (
              <LeaderboardPage />
            ) : view === "friends" ? (
              <FriendsPage onPlay={playGame} onInvite={(p) => setInvitePlayer(p)} />
            ) : view === "store" ? (
              <StorePage />
            ) : view === "settings" ? (
              <SettingsPage />
            ) : view === "history" ? (
              <HistoryPage onPlay={playGame} />
            ) : view === "profile" && dash ? (
              <ProfilePage dashboard={dash} go={(v) => go(v)} />
            ) : (
              <Dashboard
                dash={dash}
                loading={dashboardQ.isPending}
                slide={slide}
                currentSlide={currentSlide}
                onSlide={setSlide}
                go={go}
                onPlay={playGame}
                onJoinRoom={(id) => joinRoom.mutate(id)}
                resumeMatchId={dash?.activeMatchId ?? null}
                onResume={(id) => { setActiveMatchId(id); setView("play"); }}
              />
            )}
          </main>

          {/* Mobile bottom nav */}
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 pb-safe" style={{ background: "rgba(7,13,9,0.95)", backdropFilter: "blur(12px)", borderTop: "1px solid var(--border)" }} aria-label="Mobile navigation">
            <div className="grid grid-cols-5">
              {([
                ["home", "Home", Icon.home],
                ["games", "Games", Icon.gamepad],
                ["rooms", "Rooms", Icon.users],
                ["leaderboard", "Ranks", Icon.chart],
                ["friends", "Friends", Icon.users],
              ] as Array<[View, string, (s?: number) => ReactNode]>).map(([v, label, icon]) => {
                const active = view === v;
                return (
                  <button key={label} type="button" onClick={() => go(v)} aria-current={active ? "page" : undefined}
                    className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium"
                    style={{ color: active ? "var(--accent)" : "var(--dim)" }}>
                    {icon(22)} {label}
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      </div>

      {/* Invite modal */}
      {invitePlayer && (
        <InviteModal player={invitePlayer} onClose={() => setInvitePlayer(null)} onDone={(msg) => { setInvitePlayer(null); showToast(msg); }} />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 lg:bottom-8 z-[60] gh-card px-5 py-3.5 flex items-center gap-2.5 gh-pop max-w-[92vw]" role="status" style={{ borderColor: "var(--border-strong)" }}>
          <span className="text-[var(--accent)]">{Icon.check(18)}</span>
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}
    </div>
  );
}

function InviteModal({ player, onClose, onDone }: { player: Player; onClose: () => void; onDone: (msg: string) => void }) {
  const queryClient = useQueryClient();
  const roomsQ = useQuery({ queryKey: ["rooms"], queryFn: () => api.listRooms({}) });
  const [roomId, setRoomId] = useState<number | null>(null);
  const invite = useMutation({
    mutationFn: async () => {
      if (roomId === null) throw new Error("Choose a room first.");
      return api.inviteToRoom({ playerId: player.id, roomId });
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["notifications"] }); void queryClient.invalidateQueries({ queryKey: ["dashboard"] }); onDone(`Invitation sent to ${player.name}.`); },
    onError: (e) => onDone(e instanceof Error ? e.message : "Could not send the invitation."),
  });
  const joinedRooms = (roomsQ.data?.rooms ?? []).filter((r) => r.joined);
  const rooms = joinedRooms.length ? joinedRooms : (roomsQ.data?.rooms ?? []).slice(0, 4);
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.65)" }} role="dialog" aria-modal="true" aria-label={`Invite ${player.name} to a room`}>
      <div className="gh-card p-5 w-full max-w-md gh-pop">
        <div className="flex items-center gap-3 mb-4">
          <Avatar name={player.name} color={player.color} size={44} />
          <div className="flex-1">
            <h2 className="font-display font-bold">Invite {player.name}</h2>
            <p className="text-xs text-[var(--dim)]">Choose a room to invite them to.</p>
          </div>
          <button type="button" aria-label="Close invitation dialog" className="text-[var(--dim)] p-2" onClick={onClose}>{Icon.x(20)}</button>
        </div>
        <div className="space-y-2 max-h-64 overflow-auto">
          {rooms.map((r) => (
            <button key={r.id} type="button" aria-pressed={roomId === r.id} onClick={() => setRoomId(r.id)}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-left"
              style={{ border: `1px solid ${roomId === r.id ? "var(--accent)" : "var(--border)"}`, background: roomId === r.id ? "rgba(46,232,154,0.08)" : "rgba(255,255,255,0.02)" }}>
              <span className="flex-1">
                <span className="block font-semibold text-sm">{r.name}</span>
                <span className="block text-xs text-[var(--dim)]">{GAME_META[r.gameId]?.name} · {r.currentPlayers}/{r.maxPlayers} players</span>
              </span>
              {roomId === r.id && <span className="text-[var(--accent)]">{Icon.check(18)}</span>}
            </button>
          ))}
          {roomsQ.isSuccess && rooms.length === 0 && <p className="text-sm text-[var(--dim)]">No rooms available — create one from the Live Rooms page.</p>}
        </div>
        <div className="flex gap-3 mt-5">
          <button type="button" className="gh-btn-primary flex-1 py-2.5 text-sm" disabled={invite.isPending || roomId === null} onClick={() => invite.mutate()}>
            {invite.isPending ? "Sending…" : "Send Invitation"}
          </button>
          <button type="button" className="gh-btn-ghost px-5 py-2.5 text-sm" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Dashboard ---------------- */

function Dashboard({ dash, loading, slide, currentSlide, onSlide, go, onPlay, onJoinRoom, resumeMatchId, onResume }: {
  dash: import("./ui").Dashboard | undefined;
  loading: boolean;
  slide: number;
  currentSlide: { line1: string; line2: string; sub: string };
  onSlide: (i: number) => void;
  go: (v: View) => void;
  onPlay: (gameId: string, opponent?: string) => void;
  onJoinRoom: (id: number) => void;
  resumeMatchId: number | null;
  onResume: (id: number) => void;
}) {
  const activityMax = useMemo(() => Math.max(1, ...(dash?.activity.map((a) => a.games) ?? [1])), [dash]);
  const chartPoints = useMemo(() => {
    const acts = dash?.activity ?? [];
    if (!acts.length) return "";
    const w = 560, h = 120, pad = 12;
    return acts.map((a, i) => {
      const x = pad + (i * (w - pad * 2)) / Math.max(1, acts.length - 1);
      const y = h - pad - (a.games / activityMax) * (h - pad * 2);
      return `${x},${y}`;
    }).join(" ");
  }, [dash, activityMax]);
  const hasActivity = (dash?.activity ?? []).some((a) => a.games > 0);
  const featuredAchievement = dash?.achievements[0];

  if (loading || !dash) {
    return (
      <div className="gh-fadein" aria-label="Loading dashboard">
        <div className="gh-card h-64 animate-pulse" />
        <div className="grid gap-5 mt-5 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="gh-card h-48 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="gh-fadein">
      {resumeMatchId !== null && (
        <button type="button" onClick={() => onResume(resumeMatchId)} className="w-full gh-card p-4 mb-5 flex items-center gap-3 text-left" style={{ borderColor: "var(--gold)" }}>
          <span className="text-[var(--gold)]">{Icon.zap(22)}</span>
          <span className="flex-1">
            <span className="block font-display font-bold">Match in progress</span>
            <span className="block text-sm text-[var(--dim)]">You have an unfinished match — pick up right where you left off.</span>
          </span>
          <span className="gh-btn-primary px-5 py-2 text-sm">Resume</span>
        </button>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Hero */}
        <section className="gh-card overflow-hidden relative xl:col-span-2 min-h-[290px]" aria-label="Welcome banner">
          <div className="grid md:grid-cols-2 h-full">
            <div className="p-6 sm:p-8 flex flex-col justify-center relative z-10">
              <span className="inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full text-xs font-semibold" style={{ background: "rgba(46,232,154,0.1)", border: "1px solid var(--border)" }}>
                <span className="w-2 h-2 rounded-full bg-[var(--accent)] gh-live-dot" /> Welcome to GameHub 👋
              </span>
              <h1 className="font-display font-extrabold leading-[1.04] mt-4" style={{ fontSize: "clamp(34px, 4.2vw, 52px)" }}>
                {currentSlide.line1}<br />
                <span style={{ background: "linear-gradient(90deg,#3bf2ab,#22d3ee)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{currentSlide.line2}</span>
              </h1>
              <p className="text-[var(--dim)] mt-3 max-w-sm">{currentSlide.sub}</p>
              <div className="flex gap-3 mt-6 flex-wrap">
                <button type="button" className="gh-btn-primary px-6 py-3 text-sm inline-flex items-center gap-2" onClick={() => go("games")}>
                  Explore Games {Icon.arrow(16)}
                </button>
                <button type="button" className="gh-btn-ghost px-6 py-3 text-sm inline-flex items-center gap-2" onClick={() => go("rooms")}>
                  {Icon.users(16)} Join a Room
                </button>
              </div>
              <div className="flex gap-2 mt-7" role="tablist" aria-label="Hero slides">
                {HERO_SLIDES.map((s, i) => (
                  <button key={s.line1} type="button" role="tab" aria-selected={slide === i} aria-label={`Show slide ${i + 1}`} onClick={() => onSlide(i)}
                    className="rounded-full transition-all" style={{ width: slide === i ? 26 : 10, height: 8, minHeight: 8, padding: 0, background: slide === i ? "var(--accent)" : "rgba(255,255,255,0.2)" }} />
                ))}
              </div>
            </div>
            <div className="relative hidden md:block">
              <img src={heroImg} alt="Game controller surrounded by dice, chess and board game tiles" className="absolute inset-0 w-full h-full object-cover gh-float" style={{ animationDuration: "7s" }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, var(--surface) 0%, transparent 45%)" }} />
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="gh-card p-5" aria-label="Your stats">
          <SectionTitle icon={Icon.chart(20)} title="Your Stats" action={
            <button type="button" className="text-sm font-semibold text-[var(--accent)] inline-flex items-center gap-1" onClick={() => go("profile")}>View Details {Icon.arrow(14)}</button>
          } />
          <div className="flex items-center gap-4">
            <img src={avatarImg} alt={dash.profile.username} className="w-[74px] h-[74px] rounded-full object-cover" style={{ border: "2px solid var(--border-strong)" }} />
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-lg flex items-center gap-1.5 truncate">{dash.profile.username} {Icon.verified(17)}</p>
              <p className="text-sm text-[var(--dim)]">Level {dash.profile.level}</p>
              <div className="mt-2"><ProgressBar value={dash.profile.xpIntoLevel} max={dash.profile.xpSpan} /></div>
              <p className="text-xs text-[var(--dim)] mt-1.5 text-right">{dash.profile.xpIntoLevel} / {dash.profile.xpSpan} XP</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { icon: Icon.trophy(19), color: "var(--gold)", value: dash.stats.wins, label: "Wins" },
              { icon: Icon.gamepad(19), color: "#8B5CF6", value: dash.stats.games, label: "Games" },
              { icon: Icon.star(19), color: "var(--accent)", value: dash.profile.rating.toLocaleString(), label: "Rating" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl py-3.5 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                <span className="flex justify-center" style={{ color: s.color }}>{s.icon}</span>
                <p className="font-display font-extrabold text-[22px] mt-1 leading-none">{s.value}</p>
                <p className="text-[11px] text-[var(--dim)] mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-[var(--dim)] mt-4 flex items-center gap-1.5">{Icon.coins(14)} <b className="text-[var(--gold)]">{dash.profile.coins.toLocaleString()} coins</b> · Win matches to earn more, spend them in the Store.</p>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-3 mt-5">
        <div className="xl:col-span-2 space-y-5 min-w-0">
          {/* Popular games */}
          <section aria-label="Popular games">
            <SectionTitle icon={Icon.gamepad(20)} title="Popular Games" action={
              <button type="button" className="text-sm font-semibold text-[var(--accent)] inline-flex items-center gap-1" onClick={() => go("games")}>View All {Icon.arrow(14)}</button>
            } />
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              {GAME_IDS.map((id) => {
                const g = GAME_META[id];
                if (!g) return null;
                return (
                  <article key={id} className="gh-card gh-card-hover overflow-hidden flex flex-col">
                    <img src={g.img} alt={`${g.name} artwork`} className="w-full h-28 object-cover" />
                    <div className="p-3.5 flex flex-col flex-1">
                      <h3 className="font-display font-bold leading-tight">{g.name}</h3>
                      <p className="text-xs text-[var(--dim)] mt-0.5 flex-1">{g.tagline}</p>
                      <button type="button" className="gh-btn-ghost w-full py-2 mt-3 text-xs inline-flex items-center justify-center gap-1.5" onClick={() => onPlay(id)}>
                        Play Now {Icon.arrow(13)}
                      </button>
                    </div>
                  </article>
                );
              })}
              <button type="button" onClick={() => go("games")} className="gh-card gh-card-hover overflow-hidden flex flex-col text-left" aria-label="Explore more games">
                <span className="w-full h-28 flex items-center justify-center" style={{ background: "linear-gradient(150deg, rgba(139,92,246,0.35), rgba(139,92,246,0.08))" }}>
                  <span style={{ color: "#C4B5FD", filter: "drop-shadow(0 0 14px rgba(139,92,246,0.7))" }}>{Icon.gamepad(52)}</span>
                </span>
                <span className="p-3.5 flex flex-col flex-1 w-full">
                  <span className="font-display font-bold leading-tight">More Games</span>
                  <span className="text-xs text-[var(--dim)] mt-0.5 flex-1">And many more…</span>
                  <span className="gh-btn-ghost w-full py-2 mt-3 text-xs inline-flex items-center justify-center gap-1.5">Explore {Icon.arrow(13)}</span>
                </span>
              </button>
            </div>
          </section>

          <div className="grid gap-5 md:grid-cols-2">
            {/* Activity */}
            <section className="gh-card p-5" aria-label="Gaming activity">
              <SectionTitle icon={Icon.users(20)} title="Gaming Activity" action={<span className="text-xs text-[var(--dim)] px-2.5 py-1.5 rounded-full" style={{ border: "1px solid var(--border)" }}>Last 7 Days</span>} />
              {hasActivity ? (
                <>
                  <svg viewBox="0 0 560 120" className="w-full" role="img" aria-label={`Activity chart: ${dash.activity.map((a) => `${a.label} ${a.games} games`).join(", ")}`}>
                    <defs>
                      <linearGradient id="actFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2EE89A" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#2EE89A" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <polygon points={`12,108 ${chartPoints} 548,108`} fill="url(#actFill)" />
                    <polyline points={chartPoints} fill="none" stroke="#2EE89A" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 6px rgba(46,232,154,0.6))" }} />
                    {dash.activity.map((a, i) => {
                      const x = 12 + (i * (560 - 24)) / 6;
                      const y = 120 - 12 - (a.games / activityMax) * (120 - 24);
                      return <circle key={a.day} cx={x} cy={y} r="4" fill="#050807" stroke="#2EE89A" strokeWidth="2" />;
                    })}
                  </svg>
                  <div className="flex justify-between text-[11px] text-[var(--dim)] mt-1 px-0.5">
                    {dash.activity.map((a) => <span key={a.day}>{a.label}</span>)}
                  </div>
                  <p className="text-xs text-[var(--dim)] mt-3">{dash.activity.reduce((s, a) => s + a.games, 0)} games · {dash.activity.reduce((s, a) => s + a.wins, 0)} wins this week</p>
                </>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-sm text-[var(--dim)]">No matches in the last 7 days yet.<br />Play a game and your activity will chart here.</p>
                  <button type="button" className="gh-btn-primary px-5 py-2 mt-4 text-sm" onClick={() => onPlay("tictactoe")}>Play your first match</button>
                </div>
              )}
            </section>

            {/* Achievements */}
            <section className="gh-card p-5" aria-label="Achievements">
              <SectionTitle icon={Icon.star(20)} title="Achievements" action={
                <button type="button" className="text-sm font-semibold text-[var(--accent)] inline-flex items-center gap-1" onClick={() => go("profile")}>View All {Icon.arrow(14)}</button>
              } />
              {featuredAchievement ? (
                <div className="flex items-center gap-4">
                  <AchievementIcon icon={featuredAchievement.icon} size={64} />
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-lg leading-tight">{featuredAchievement.title}</p>
                    <p className="text-sm text-[var(--dim)]">{featuredAchievement.description}</p>
                    <div className="flex items-center gap-3 mt-2.5">
                      <span className="flex-1"><ProgressBar value={featuredAchievement.progress} max={featuredAchievement.target} color="#8B5CF6" /></span>
                      <span className="text-sm font-semibold text-[var(--dim)]">{featuredAchievement.progress} / {featuredAchievement.target}</span>
                    </div>
                    {featuredAchievement.unlocked && <p className="text-xs font-bold text-[var(--accent)] mt-2 inline-flex items-center gap-1">{Icon.check(13)} UNLOCKED</p>}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[var(--dim)]">Win matches to unlock achievements.</p>
              )}
              <div className="grid grid-cols-2 gap-2.5 mt-4">
                {dash.achievements.slice(1, 3).map((a) => (
                  <div key={a.key} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                    <p className="text-sm font-semibold truncate">{a.title}</p>
                    <p className="text-[11px] text-[var(--dim)]">{a.progress}/{a.target} · {a.unlocked ? "Unlocked" : "In progress"}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        <div className="space-y-5 min-w-0">
          {/* Live rooms */}
          <section className="gh-card p-5" aria-label="Live rooms">
            <SectionTitle icon={Icon.zap(20)} title="Live Rooms" action={
              <button type="button" className="text-sm font-semibold text-[var(--accent)] inline-flex items-center gap-1" onClick={() => go("rooms")}>View All {Icon.arrow(14)}</button>
            } />
            <div className="space-y-3">
              {dash.rooms.slice(0, 3).map((room) => (
                <RoomCard key={room.id} room={room} onJoin={onJoinRoom} />
              ))}
              {dash.rooms.length === 0 && <p className="text-sm text-[var(--dim)]">No live rooms right now — create one!</p>}
            </div>
            <p className="text-[11px] text-[var(--dim)] mt-3">Joining a room starts a match against its host. Seats are reserved the moment you join.</p>
          </section>

          {/* Friends online */}
          <section className="gh-card p-5" aria-label="Friends online">
            <SectionTitle icon={Icon.users(20)} title="Friends Online" action={
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold"><span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] gh-live-dot" /> {dash.friendsOnlineCount}</span>
            } />
            {dash.friendsOnline.length === 0 ? (
              <p className="text-sm text-[var(--dim)]">None of your friends are online right now.</p>
            ) : (
              <div className="flex items-center">
                {dash.friendsOnline.slice(0, 5).map((f, i) => (
                  <button key={f.id} type="button" onClick={() => go("friends")} aria-label={`${f.name}, ${f.status}`}
                    className="relative rounded-full transition-transform hover:scale-110" style={{ marginLeft: i === 0 ? 0 : -10, zIndex: 5 - i }} title={f.name}>
                    <Avatar name={f.name} color={f.color} size={48} />
                    <span className="absolute bottom-0 right-0"><StatusDot status={f.status} /></span>
                  </button>
                ))}
                {dash.friendsOnlineCount > 5 && (
                  <button type="button" onClick={() => go("friends")} aria-label={`View all ${dash.friendsOnlineCount} online friends`}
                    className="w-12 h-12 rounded-full font-bold text-sm flex items-center justify-center"
                    style={{ marginLeft: -10, background: "var(--surface-3)", border: "2px solid var(--border-strong)", color: "var(--accent)" }}>
                    +{dash.friendsOnlineCount - 5}
                  </button>
                )}
              </div>
            )}
            <p className="text-xs text-[var(--dim)] mt-3">{dash.friendsTotal} friends total · Tap an avatar to challenge or invite them.</p>
            <button type="button" className="gh-btn-ghost w-full py-2.5 mt-3 text-sm" onClick={() => go("friends")}>Open Friends</button>
          </section>

          {/* Premium upsell (mobile / tablet) */}
          {!dash.profile.premium && (
            <section className="gh-card p-5 text-center lg:hidden" aria-label="Go premium">
              <span className="inline-block text-[var(--gold)]">{Icon.crown(26)}</span>
              <p className="font-display font-bold mt-1" style={{ color: "var(--gold)" }}>Go Premium</p>
              <p className="text-xs text-[var(--dim)] mt-1">Unlock more games, features & rewards!</p>
              <button type="button" className="gh-btn-primary px-6 py-2.5 mt-3 text-sm" style={{ background: "linear-gradient(135deg,#ffd968,#e8a812)", boxShadow: "0 6px 20px rgba(245,197,66,0.3)" }} onClick={() => go("store")}>Upgrade</button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
