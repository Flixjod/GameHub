import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "./api";
import {
AchievementIcon, Avatar, EmptyState, GAME_IDS, GAME_META, Icon, ProgressBar,
SectionTitle, StatusDot, StoreIcon, avatarImg, type Player, type Room,
} from "./ui";
import { actionFields } from "@hatch/space-sdk/fields" with { type: "macro" };
import type { Actions } from "../../server/src/actions";

const FIELDS = actionFields<typeof Actions>();

type StartMatchFn = (gameId: string, opponent?: string) => void;

/* ---------------- Games library ---------------- */

export function GamesPage({ onPlay }: { onPlay: StartMatchFn }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const roomsQ = useQuery({ queryKey: ["rooms"], queryFn: () => api.listRooms({}) });
  const historyQ = useQuery({ queryKey: ["history", 50], queryFn: () => api.listMatchHistory({ limit: 50 }) });

  const openSeats = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of roomsQ.data?.rooms ?? []) {
      if (r.status !== "full") map[r.gameId] = (map[r.gameId] ?? 0) + (r.maxPlayers - r.currentPlayers);
    }
    return map;
  }, [roomsQ.data]);
  const played = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of historyQ.data?.matches ?? []) map[m.gameId] = (map[m.gameId] ?? 0) + 1;
    return map;
  }, [historyQ.data]);

  const categories = ["All", ...Array.from(new Set(GAME_IDS.map((id) => GAME_META[id]?.category ?? "")))];
  const filtered = GAME_IDS.filter((id) => {
    const g = GAME_META[id];
    if (!g) return false;
    if (category !== "All" && g.category !== category) return false;
    return g.name.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <div className="gh-fadein">
      <h1 className="font-display text-3xl font-extrabold">Game Library</h1>
      <p className="text-[var(--dim)] mt-1 mb-5">Every game is fully playable — moves are validated on the server and results feed your stats, XP and achievements.</p>
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <label className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--dim)]">{Icon.search(18)}</span>
          <input aria-label="Search games" className="gh-input w-full pl-11 pr-4 py-2.5 text-sm" placeholder="Search games…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className="flex gap-2 flex-wrap" role="tablist" aria-label="Game categories">
          {categories.map((c) => (
            <button key={c} type="button" role="tab" aria-selected={category === c} onClick={() => setCategory(c)}
              className="px-4 py-2 rounded-full text-sm font-semibold transition-all"
              style={category === c
                ? { background: "linear-gradient(135deg,#3bf2ab,#12b981)", color: "#04150c" }
                : { border: "1px solid var(--border)", color: "var(--dim)" }}>
              {c}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="gh-card"><EmptyState icon={Icon.search(26)} title="No games found" body="Try a different search or category." /></div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {filtered.map((id) => {
            const g = GAME_META[id];
            if (!g) return null;
            return (
              <article key={id} className="gh-card gh-card-hover overflow-hidden">
                <img src={g.img} alt={`${g.name} artwork`} className="w-full h-44 object-cover" />
                <div className="p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display font-bold text-xl">{g.name}</h2>
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: `${g.accent}1f`, color: g.accent, border: `1px solid ${g.accent}44` }}>{g.category}</span>
                  </div>
                  <p className="text-sm font-semibold mt-1" style={{ color: g.accent }}>{g.tagline}</p>
                  <p className="text-sm text-[var(--dim)] mt-1.5">{g.description}</p>
                  <div className="flex gap-4 text-xs text-[var(--dim)] mt-3">
                    <span>{g.players}</span>
                    <span>{played[id] ?? 0} matches played by you</span>
                    <span>{openSeats[id] ?? 0} open room seats</span>
                  </div>
                  <button type="button" className="gh-btn-primary w-full py-2.5 mt-4 text-sm inline-flex items-center justify-center gap-2" onClick={() => onPlay(id)}>
                    {Icon.play(16)} Play Now
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------- Rooms ---------------- */

export function RoomsPage({ onJoinRoom, onPlay }: { onJoinRoom: (roomId: number) => void; onPlay: StartMatchFn }) {
  const queryClient = useQueryClient();
  const roomsQ = useQuery({ queryKey: ["rooms"], queryFn: () => api.listRooms({}) });
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [gameId, setGameId] = useState("ludo");
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const create = useMutation({
    mutationFn: async () => api.createRoom({ name: name.trim(), gameId: gameId as "ludo", maxPlayers }),
    onSuccess: () => {
      setShowForm(false); setName(""); setNotice("Room created — it's live in the list below.");
      void queryClient.invalidateQueries({ queryKey: ["rooms"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => setFormError(e instanceof Error ? e.message : "Could not create the room."),
  });
  const leave = useMutation({
    mutationFn: async (roomId: number) => api.leaveRoom({ roomId }),
    onSuccess: () => { setNotice("You left the room."); void queryClient.invalidateQueries({ queryKey: ["rooms"] }); },
    onError: (e) => setNotice(e instanceof Error ? e.message : "Could not leave the room."),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 3) { setFormError("Give your room a name of at least 3 characters."); return; }
    setFormError("");
    create.mutate();
  };

  return (
    <div className="gh-fadein">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Live Rooms</h1>
          <p className="text-[var(--dim)] mt-1">Join a room to start a match against its host, or create your own. Seats and capacity are checked on the server.</p>
        </div>
        <button type="button" className="gh-btn-primary px-5 py-2.5 text-sm inline-flex items-center gap-2" onClick={() => setShowForm((v) => !v)}>
          {Icon.plus(16)} Create Room
        </button>
      </div>
      {notice && <p className="mt-3 text-sm text-[var(--accent)]" role="status">{notice}</p>}

      {showForm && (
        <form onSubmit={submit} className="gh-card p-5 mt-5 gh-fadein">
          <h2 className="font-display font-bold mb-4">Create a room</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-sm font-medium">Room name</span>
              <input {...FIELDS.createRoom.name} aria-label="Room name" className="gh-input w-full px-4 py-2.5 mt-1.5 text-sm" style={{ borderRadius: 12 }} placeholder="e.g. Friday Ludo Night" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Game</span>
              <select aria-label="Room game" className="gh-input w-full px-4 py-2.5 mt-1.5 text-sm" style={{ borderRadius: 12 }} value={gameId} onChange={(e) => setGameId(e.target.value)}>
                {GAME_IDS.map((id) => <option key={id} value={id}>{GAME_META[id]?.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium">Max players</span>
              <select aria-label="Maximum players" className="gh-input w-full px-4 py-2.5 mt-1.5 text-sm" style={{ borderRadius: 12 }} value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))}>
                {[2, 3, 4].map((n) => <option key={n} value={n}>{n} players</option>)}
              </select>
            </label>
          </div>
          {formError && <p className="text-sm mt-3" style={{ color: "var(--danger)" }} role="alert">{formError}</p>}
          <div className="flex gap-3 mt-4">
            <button type="submit" className="gh-btn-primary px-6 py-2.5 text-sm" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create Room"}</button>
            <button type="button" className="gh-btn-ghost px-6 py-2.5 text-sm" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="grid gap-4 mt-6 sm:grid-cols-2">
        {(roomsQ.data?.rooms ?? []).map((room) => (
          <RoomCard key={room.id} room={room} onJoin={onJoinRoom} onLeave={(id) => leave.mutate(id)} onPlay={onPlay} leaving={leave.isPending} />
        ))}
        {roomsQ.isSuccess && (roomsQ.data?.rooms.length ?? 0) === 0 && (
          <div className="gh-card sm:col-span-2"><EmptyState icon={Icon.users(26)} title="No rooms yet" body="Create the first room and invite your friends." /></div>
        )}
        {roomsQ.isPending && <p className="text-[var(--dim)]">Loading rooms…</p>}
      </div>
    </div>
  );
}

export function RoomCard({ room, onJoin, onLeave, onPlay, leaving }: {
  room: Room; onJoin: (id: number) => void; onLeave?: (id: number) => void; onPlay?: StartMatchFn; leaving?: boolean;
}) {
  const meta = GAME_META[room.gameId];
  const full = room.currentPlayers >= room.maxPlayers;
  return (
    <div className="gh-card p-4 flex items-center gap-3">
      {meta && <img src={meta.img} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{room.name}</p>
        <p className="text-xs text-[var(--dim)] flex items-center gap-2 mt-0.5">
          <span className="inline-flex items-center gap-1">{Icon.users(13)} {room.currentPlayers}/{room.maxPlayers}</span>
          <span>· {meta?.name ?? room.gameId}</span>
          <span>· Host: {room.hostName}</span>
        </p>
        <div className="mt-2"><ProgressBar value={room.currentPlayers} max={room.maxPlayers} height={5} /></div>
      </div>
      {room.joined ? (
        <span className="flex flex-col gap-1.5 shrink-0">
          {onPlay && <button type="button" className="gh-btn-primary px-4 py-1.5 text-xs" onClick={() => onPlay(room.gameId, room.hostName)}>Play</button>}
          {onLeave && <button type="button" className="gh-btn-ghost px-4 py-1.5 text-xs" disabled={leaving} onClick={() => onLeave(room.id)}>Leave</button>}
          {!onLeave && <span className="text-xs font-bold text-[var(--accent)] px-2">JOINED</span>}
        </span>
      ) : (
        <button type="button" className="gh-btn-ghost px-5 py-2 text-sm shrink-0" disabled={full} onClick={() => onJoin(room.id)}>
          {full ? "Full" : "Join"}
        </button>
      )}
    </div>
  );
}

/* ---------------- Tournaments ---------------- */

type Tournament = ApiResponse<typeof api, "listTournaments">["tournaments"][number];

export function TournamentsPage({ onPlay }: { onPlay: StartMatchFn }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"live" | "upcoming" | "completed">("live");
  const [notice, setNotice] = useState("");
  const tourQ = useQuery({ queryKey: ["tournaments"], queryFn: () => api.listTournaments({}) });

  const register = useMutation({
    mutationFn: async (id: number) => api.registerTournament({ tournamentId: id }),
    onSuccess: () => { setNotice("You're registered. Good luck!"); void queryClient.invalidateQueries({ queryKey: ["tournaments"] }); void queryClient.invalidateQueries({ queryKey: ["dashboard"] }); },
    onError: (e) => setNotice(e instanceof Error ? e.message : "Registration failed."),
  });
  const unregister = useMutation({
    mutationFn: async (id: number) => api.unregisterTournament({ tournamentId: id }),
    onSuccess: () => { setNotice("Withdrawn — entry fee refunded."); void queryClient.invalidateQueries({ queryKey: ["tournaments"] }); void queryClient.invalidateQueries({ queryKey: ["dashboard"] }); },
    onError: (e) => setNotice(e instanceof Error ? e.message : "Could not withdraw."),
  });

  const list = (tourQ.data?.tournaments ?? []).filter((t) => t.status === tab);
  const tabs: Array<{ key: typeof tab; label: string }> = [
    { key: "live", label: "Live Now" }, { key: "upcoming", label: "Upcoming" }, { key: "completed", label: "Completed" },
  ];

  return (
    <div className="gh-fadein">
      <h1 className="font-display text-3xl font-extrabold">Tournaments</h1>
      <p className="text-[var(--dim)] mt-1 mb-5">Compete for coin prize pools. Entry fees are paid from your coin balance and refunded if you withdraw before the start.</p>
      <div className="flex gap-2 mb-5" role="tablist" aria-label="Tournament status">
        {tabs.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
            className="px-4 py-2 rounded-full text-sm font-semibold"
            style={tab === t.key ? { background: "linear-gradient(135deg,#3bf2ab,#12b981)", color: "#04150c" } : { border: "1px solid var(--border)", color: "var(--dim)" }}>
            {t.label}
          </button>
        ))}
      </div>
      {notice && <p className="mb-4 text-sm text-[var(--accent)]" role="status">{notice}</p>}
      {list.length === 0 ? (
        <div className="gh-card"><EmptyState icon={Icon.trophy(26)} title="Nothing here yet" body="No tournaments in this bracket right now — check another tab." /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((t) => (
            <TournamentCard key={t.id} t={t} onRegister={() => register.mutate(t.id)} onUnregister={() => unregister.mutate(t.id)} onPlay={onPlay} busy={register.isPending || unregister.isPending} />
          ))}
        </div>
      )}
    </div>
  );
}

function TournamentCard({ t, onRegister, onUnregister, onPlay, busy }: {
  t: Tournament; onRegister: () => void; onUnregister: () => void; onPlay: StartMatchFn; busy: boolean;
}) {
  const meta = GAME_META[t.gameId];
  return (
    <article className="gh-card gh-card-hover p-5">
      <div className="flex items-start gap-3">
        {meta && <img src={meta.img} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display font-bold text-lg leading-tight">{t.name}</h2>
            {t.status === "live" && <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--accent)]"><span className="gh-live-dot w-2 h-2 rounded-full bg-[var(--accent)] inline-block" /> LIVE</span>}
          </div>
          <p className="text-sm text-[var(--dim)]">{meta?.name} · {t.startsLabel}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 text-sm">
        <span className="text-[var(--gold)]">{Icon.trophy(16)}</span>
        <span className="font-semibold">{t.prize}</span>
      </div>
      <div className="mt-3">
        <div className="flex justify-between text-xs text-[var(--dim)] mb-1.5">
          <span>{t.registeredCount} / {t.slots} players registered</span>
          <span>Entry: {t.entryFee === 0 ? "Free" : `${t.entryFee} coins`}</span>
        </div>
        <ProgressBar value={t.registeredCount} max={t.slots} color="var(--gold)" height={6} />
      </div>
      {t.status === "completed" ? (
        <p className="mt-4 text-sm">🏆 Winner: <b>{t.winner ?? "—"}</b></p>
      ) : (
        <div className="flex gap-2.5 mt-4">
          {t.registered ? (
            <>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent)] px-3 py-2">{Icon.check(16)} Registered</span>
              <button type="button" className="gh-btn-ghost px-4 py-2 text-sm" disabled={busy} onClick={onUnregister}>Withdraw</button>
              <button type="button" className="gh-btn-primary px-4 py-2 text-sm" onClick={() => onPlay(t.gameId)}>Warm Up</button>
            </>
          ) : (
            <button type="button" className="gh-btn-primary px-5 py-2 text-sm" disabled={busy} onClick={onRegister}>Register · {t.entryFee} coins</button>
          )}
        </div>
      )}
    </article>
  );
}

/* ---------------- Leaderboard ---------------- */

export function LeaderboardPage() {
  const [scope, setScope] = useState<"global" | "weekly" | "monthly" | "friends">("global");
  const lbQ = useQuery({ queryKey: ["leaderboard", scope], queryFn: () => api.getLeaderboard({ scope }) });
  const scopes: Array<{ key: typeof scope; label: string }> = [
    { key: "global", label: "Global" }, { key: "weekly", label: "Weekly" }, { key: "monthly", label: "Monthly" }, { key: "friends", label: "Friends" },
  ];
  return (
    <div className="gh-fadein">
      <h1 className="font-display text-3xl font-extrabold">Leaderboard</h1>
      <p className="text-[var(--dim)] mt-1 mb-5">Your rating updates after every match: 1,000 base + 25 per win + 5 per game played.</p>
      <div className="flex gap-2 mb-5 flex-wrap" role="tablist" aria-label="Leaderboard scope">
        {scopes.map((s) => (
          <button key={s.key} type="button" role="tab" aria-selected={scope === s.key} onClick={() => setScope(s.key)}
            className="px-4 py-2 rounded-full text-sm font-semibold"
            style={scope === s.key ? { background: "linear-gradient(135deg,#3bf2ab,#12b981)", color: "#04150c" } : { border: "1px solid var(--border)", color: "var(--dim)" }}>
            {s.label}
          </button>
        ))}
      </div>
      {lbQ.data && (
        <p className="text-sm mb-4">Your current rank: <b className="text-[var(--accent)]">#{lbQ.data.userRank}</b> of {lbQ.data.rows.length}</p>
      )}
      <div className="gh-card overflow-hidden">
        {lbQ.isPending && <p className="p-6 text-[var(--dim)]">Loading rankings…</p>}
        {(lbQ.data?.rows ?? []).map((row, i) => (
          <div key={row.name} className="flex items-center gap-3 px-4 sm:px-5 py-3.5" style={{
            borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.05)",
            background: row.isUser ? "rgba(46,232,154,0.07)" : undefined,
          }}>
            <span className="font-display font-extrabold w-8 text-center" style={{ color: row.rank === 1 ? "var(--gold)" : row.rank <= 3 ? "var(--accent)" : "var(--dim)" }}>
              {row.rank === 1 ? "👑" : row.rank}
            </span>
            <Avatar name={row.name} color={row.color} size={38} img={row.isUser} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate flex items-center gap-1.5">{row.name} {row.isUser && <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: "var(--accent)", color: "#04150c" }}>YOU</span>}</p>
              <p className="text-xs text-[var(--dim)]">Level {row.level} · {row.wins} wins · {row.games} games</p>
            </div>
            {scope === "global" && (
              <span className="text-xs font-semibold hidden sm:block" style={{ color: row.delta > 0 ? "var(--accent)" : row.delta < 0 ? "var(--danger)" : "var(--dim)" }}>
                {row.delta > 0 ? `▲ ${row.delta}` : row.delta < 0 ? `▼ ${Math.abs(row.delta)}` : "—"}
              </span>
            )}
            <span className="font-display font-bold text-[var(--accent)] w-16 text-right">{row.rating.toLocaleString()}</span>
          </div>
        ))}
        {lbQ.isSuccess && (lbQ.data?.rows.length ?? 0) === 0 && (
          <EmptyState icon={Icon.chart(26)} title="No rankings yet" body="Play matches and add friends to build this board." />
        )}
      </div>
    </div>
  );
}

/* ---------------- Friends ---------------- */

export function FriendsPage({ onPlay, onInvite }: { onPlay: StartMatchFn; onInvite: (player: Player) => void }) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const playersQ = useQuery({ queryKey: ["players"], queryFn: () => api.listPlayers({}) });
  const players = playersQ.data?.players ?? [];
  const requests = playersQ.data?.requests ?? [];
  const incoming = requests.filter((r) => r.direction === "incoming");
  const outgoingIds = new Set(requests.filter((r) => r.direction === "outgoing").map((r) => r.playerId));

  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ["players"] }); void queryClient.invalidateQueries({ queryKey: ["dashboard"] }); };
  const send = useMutation({
    mutationFn: async (id: number) => api.sendFriendRequest({ playerId: id }),
    onSuccess: () => { setNotice("Friend request sent."); refresh(); },
    onError: (e) => setNotice(e instanceof Error ? e.message : "Could not send the request."),
  });
  const respond = useMutation({
    mutationFn: async (args: { requestId: number; accept: boolean }) => api.respondFriendRequest(args),
    onSuccess: (_d, args) => { setNotice(args.accept ? "Friend added!" : "Request declined."); refresh(); },
    onError: (e) => setNotice(e instanceof Error ? e.message : "Action failed."),
  });
  const remove = useMutation({
    mutationFn: async (id: number) => api.removeFriend({ playerId: id }),
    onSuccess: () => { setNotice("Friend removed."); refresh(); },
    onError: (e) => setNotice(e instanceof Error ? e.message : "Action failed."),
  });

  const filtered = players.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
  const friends = filtered.filter((p) => p.isFriend);
  const discover = filtered.filter((p) => !p.isFriend);

  const playerRow = (p: Player) => (
    <div key={p.id} className="gh-card p-4 flex items-center gap-3">
      <span className="relative shrink-0">
        <Avatar name={p.name} color={p.color} size={46} />
        <span className="absolute -bottom-0.5 -right-0.5"><StatusDot status={p.status} /></span>
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{p.name}</p>
        <p className="text-xs text-[var(--dim)] capitalize">{p.status === "ingame" ? "In a game" : p.status} · Level {p.level} · {p.wins} wins · Rating {p.rating.toLocaleString()}</p>
      </div>
      <span className="flex gap-1.5 shrink-0 flex-wrap justify-end">
        <button type="button" className="gh-btn-primary px-3.5 py-1.5 text-xs" onClick={() => onPlay("tictactoe", p.name)}>Challenge</button>
        {p.isFriend ? (
          <>
            <button type="button" className="gh-btn-ghost px-3.5 py-1.5 text-xs inline-flex items-center gap-1" onClick={() => onInvite(p)}>{Icon.send(13)} Invite</button>
            <button type="button" aria-label={`Remove ${p.name}`} className="gh-btn-ghost px-3 py-1.5 text-xs" style={{ color: "var(--danger)", borderColor: "rgba(248,113,113,0.4)" }} onClick={() => remove.mutate(p.id)}>{Icon.trash(14)}</button>
          </>
        ) : outgoingIds.has(p.id) ? (
          <span className="text-xs text-[var(--dim)] px-2 py-1.5">Request sent</span>
        ) : (
          <button type="button" className="gh-btn-ghost px-3.5 py-1.5 text-xs" disabled={send.isPending} onClick={() => send.mutate(p.id)}>Add Friend</button>
        )}
      </span>
    </div>
  );

  return (
    <div className="gh-fadein">
      <h1 className="font-display text-3xl font-extrabold">Friends</h1>
      <p className="text-[var(--dim)] mt-1 mb-5">Challenge friends to a match, invite them to your rooms, and manage requests.</p>
      {notice && <p className="mb-4 text-sm text-[var(--accent)]" role="status">{notice}</p>}

      {incoming.length > 0 && (
        <section className="mb-7" aria-label="Friend requests">
          <SectionTitle icon={Icon.bell(20)} title={`Friend Requests (${incoming.length})`} />
          <div className="grid gap-3 sm:grid-cols-2">
            {incoming.map((r) => {
              const p = players.find((pl) => pl.id === r.playerId);
              return (
                <div key={r.id} className="gh-card p-4 flex items-center gap-3">
                  {p && <Avatar name={p.name} color={p.color} size={44} />}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{r.playerName}</p>
                    <p className="text-xs text-[var(--dim)]">wants to be your friend</p>
                  </div>
                  <button type="button" className="gh-btn-primary px-4 py-1.5 text-xs" disabled={respond.isPending} onClick={() => respond.mutate({ requestId: r.id, accept: true })}>Accept</button>
                  <button type="button" className="gh-btn-ghost px-4 py-1.5 text-xs" disabled={respond.isPending} onClick={() => respond.mutate({ requestId: r.id, accept: false })}>Decline</button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <label className="relative block mb-6">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--dim)]">{Icon.search(18)}</span>
        <input aria-label="Search players" className="gh-input w-full pl-11 pr-4 py-2.5 text-sm" placeholder="Search players…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>

      <section className="mb-7" aria-label="Your friends">
        <SectionTitle icon={Icon.users(20)} title={`Your Friends (${friends.length})`} />
        {friends.length === 0 ? (
          <div className="gh-card"><EmptyState icon={Icon.users(26)} title="No friends match" body="Send a request from the Discover list below to grow your squad." /></div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">{friends.map(playerRow)}</div>
        )}
      </section>

      <section aria-label="Discover players">
        <SectionTitle icon={Icon.search(20)} title="Discover Players" />
        {discover.length === 0 ? (
          <div className="gh-card"><EmptyState icon={Icon.check(26)} title="Everyone's your friend" body="You've added every player on the platform." /></div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">{discover.map(playerRow)}</div>
        )}
      </section>
    </div>
  );
}

/* ---------------- Store ---------------- */

export function StorePage() {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState("");
  const [noticeIsError, setNoticeIsError] = useState(false);
  const storeQ = useQuery({ queryKey: ["store"], queryFn: () => api.listStore({}) });
  const buy = useMutation({
    mutationFn: async (id: number) => api.buyItem({ itemId: id }),
    onSuccess: (d) => { setNoticeIsError(false); setNotice(d.message); void queryClient.invalidateQueries({ queryKey: ["store"] }); void queryClient.invalidateQueries({ queryKey: ["dashboard"] }); },
    onError: (e) => { setNoticeIsError(true); setNotice(e instanceof Error ? e.message : "Purchase failed."); },
  });
  const equip = useMutation({
    mutationFn: async (id: number) => api.equipItem({ itemId: id }),
    onSuccess: () => { setNoticeIsError(false); setNotice("Equipped! It now shows on your profile."); void queryClient.invalidateQueries({ queryKey: ["store"] }); void queryClient.invalidateQueries({ queryKey: ["settings"] }); },
    onError: (e) => { setNoticeIsError(true); setNotice(e instanceof Error ? e.message : "Could not equip."); },
  });

  const premiumItem = storeQ.data?.items.find((i) => i.kind === "premium");
  const rest = storeQ.data?.items.filter((i) => i.kind !== "premium") ?? [];

  return (
    <div className="gh-fadein">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Store</h1>
          <p className="text-[var(--dim)] mt-1">Spend coins earned from matches on membership, frames, themes and boosts.</p>
        </div>
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-[var(--gold)]" style={{ background: "rgba(245,197,66,0.1)", border: "1px solid rgba(245,197,66,0.35)" }}>
          {Icon.coins(18)} {(storeQ.data?.coins ?? 0).toLocaleString()} coins
        </span>
      </div>
      {notice && <p className="mt-3 text-sm" style={{ color: noticeIsError ? "var(--danger)" : "var(--accent)" }} role="status">{notice}</p>}

      {premiumItem && (
        <section className="gh-card p-6 mt-6 relative overflow-hidden" style={{ borderColor: "rgba(245,197,66,0.4)" }} aria-label="Premium membership">
          <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full" style={{ background: "radial-gradient(circle, rgba(245,197,66,0.18), transparent 70%)" }} />
          <div className="flex flex-col sm:flex-row gap-5 items-start relative">
            <span className="text-[var(--gold)]">{Icon.crown(48)}</span>
            <div className="flex-1">
              <h2 className="font-display text-2xl font-extrabold" style={{ color: "var(--gold)" }}>GameHub Premium</h2>
              <p className="text-sm text-[var(--dim)] mt-1 max-w-lg">{premiumItem.description}</p>
              <ul className="text-sm mt-3 space-y-1.5">
                {["Exclusive premium-only rooms", "Gold profile frame included", "Priority matchmaking queue", "Premium badge on the leaderboard"].map((f) => (
                  <li key={f} className="flex items-center gap-2"><span className="text-[var(--accent)]">{Icon.check(15)}</span>{f}</li>
                ))}
              </ul>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-display text-2xl font-extrabold">{premiumItem.price} <span className="text-sm text-[var(--dim)]">coins</span></p>
              {premiumItem.owned ? (
                <span className="inline-flex items-center gap-1.5 mt-2 font-bold text-[var(--gold)]">{Icon.crown(16)} ACTIVE</span>
              ) : (
                <button type="button" className="gh-btn-primary px-6 py-2.5 mt-2 text-sm" style={{ background: "linear-gradient(135deg,#ffd968,#e8a812)", boxShadow: "0 6px 20px rgba(245,197,66,0.35)" }} disabled={buy.isPending} onClick={() => buy.mutate(premiumItem.id)}>
                  Upgrade Now
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-4 mt-6 sm:grid-cols-2">
        {rest.map((item) => (
          <article key={item.id} className="gh-card gh-card-hover p-5 flex gap-4">
            <StoreIcon icon={item.icon} size={52} />
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold">{item.name}</h3>
              <p className="text-xs uppercase tracking-wide text-[var(--dim)] mt-0.5">{item.kind.replace("_", " ")}</p>
              <p className="text-sm text-[var(--dim)] mt-1.5">{item.description}</p>
              <div className="flex items-center gap-2.5 mt-3.5">
                {item.owned ? (
                  <>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)]">{Icon.check(15)} Owned</span>
                    {(item.kind === "avatar_frame" || item.kind === "theme") && (
                      <button type="button" className="gh-btn-ghost px-4 py-1.5 text-xs" disabled={equip.isPending} onClick={() => equip.mutate(item.id)}>Equip</button>
                    )}
                  </>
                ) : (
                  <button type="button" className="gh-btn-primary px-5 py-2 text-sm inline-flex items-center gap-1.5" disabled={buy.isPending} onClick={() => buy.mutate(item.id)}>
                    {Icon.coins(15)} {item.price === 0 ? "Claim free" : `${item.price} coins`}
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      <section className="mt-8" aria-label="Purchase history">
        <SectionTitle icon={Icon.clock(20)} title="Purchase History" />
        <div className="gh-card">
          {(storeQ.data?.purchases ?? []).length === 0 ? (
            <EmptyState icon={Icon.gem(26)} title="No purchases yet" body="Items you buy will be recorded here." />
          ) : (
            (storeQ.data?.purchases ?? []).map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3.5" style={{ borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.05)" }}>
                <span className="text-[var(--gold)]">{Icon.gem(18)}</span>
                <span className="flex-1 font-medium">{p.itemName}</span>
                <span className="text-sm text-[var(--dim)]">{new Date(p.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                <span className="font-semibold text-[var(--gold)]">{p.price === 0 ? "Free" : `${p.price} coins`}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

/* ---------------- Settings ---------------- */

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 py-3 cursor-pointer" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <span className="flex-1">
        <span className="block font-medium text-sm">{label}</span>
        <span className="block text-xs text-[var(--dim)] mt-0.5">{description}</span>
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span className="w-11 h-6 rounded-full relative shrink-0 transition-colors" style={{ background: checked ? "var(--accent)" : "rgba(255,255,255,0.14)" }} aria-hidden="true">
        <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: checked ? 22 : 2 }} />
      </span>
    </label>
  );
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState("");
  const settingsQ = useQuery({ queryKey: ["settings"], queryFn: () => api.getSettings({}) });
  const s = settingsQ.data?.settings;
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [bioDraft, setBioDraft] = useState<string | null>(null);

  const update = useMutation({
    mutationFn: async (patch: Parameters<typeof api.updateSettings>[0]) => api.updateSettings(patch),
    onSuccess: () => { setNotice("Saved."); void queryClient.invalidateQueries({ queryKey: ["settings"] }); void queryClient.invalidateQueries({ queryKey: ["dashboard"] }); },
    onError: (e) => setNotice(e instanceof Error ? e.message : "Could not save."),
  });

  if (!s) return <p className="text-[var(--dim)] gh-fadein">Loading settings…</p>;
  const displayName = nameDraft ?? s.displayName;
  const bio = bioDraft ?? s.bio;

  return (
    <div className="gh-fadein max-w-3xl">
      <h1 className="font-display text-3xl font-extrabold">Settings</h1>
      <p className="text-[var(--dim)] mt-1 mb-6">Everything here saves to your GameHub account instantly.</p>
      {notice && <p className="mb-4 text-sm text-[var(--accent)]" role="status">{notice}</p>}

      <section className="gh-card p-5 mb-5" aria-label="Profile">
        <SectionTitle icon={Icon.users(20)} title="Profile" />
        <div className="flex items-center gap-4 mb-4">
          <img src={avatarImg} alt="Your avatar" className="w-16 h-16 rounded-full object-cover" style={{ border: "2px solid var(--accent)" }} />
          <div>
            <p className="font-display font-bold text-lg flex items-center gap-1.5">{s.displayName} {Icon.verified(18)}</p>
            <p className="text-xs text-[var(--dim)]">
              {settingsQ.data?.premium ? "Premium member" : "Free member"}
              {settingsQ.data?.equippedFrame ? ` · Frame: ${settingsQ.data.equippedFrame}` : ""}
              {settingsQ.data?.equippedTheme ? ` · Theme: ${settingsQ.data.equippedTheme}` : ""}
            </p>
          </div>
        </div>
        <label className="block mb-3">
          <span className="text-sm font-medium">Display name</span>
          <input {...FIELDS.updateSettings.displayName} aria-label="Display name" className="gh-input w-full px-4 py-2.5 mt-1.5 text-sm" style={{ borderRadius: 12 }} value={displayName} onChange={(e) => setNameDraft(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Bio</span>
          <input {...FIELDS.updateSettings.bio} aria-label="Bio" className="gh-input w-full px-4 py-2.5 mt-1.5 text-sm" style={{ borderRadius: 12 }} placeholder="Tell other players about yourself…" value={bio} onChange={(e) => setBioDraft(e.target.value)} />
        </label>
        <button type="button" className="gh-btn-primary px-6 py-2.5 mt-4 text-sm" disabled={update.isPending || (displayName === s.displayName && bio === s.bio)}
          onClick={() => update.mutate({ displayName: displayName.trim(), bio: bio.trim() })}>
          {update.isPending ? "Saving…" : "Save Profile"}
        </button>
      </section>

      <section className="gh-card p-5 mb-5" aria-label="Privacy">
        <SectionTitle icon={Icon.shield(20)} title="Privacy" />
        <Toggle label="Public profile" description="Other players can view your stats and achievements." checked={s.profilePublic} onChange={(v) => update.mutate({ profilePublic: v })} />
        <Toggle label="Show online status" description="Friends can see when you're online or in a game." checked={s.showOnline} onChange={(v) => update.mutate({ showOnline: v })} />
        <Toggle label="Allow friend requests" description="Anyone can send you a friend request." checked={s.friendRequestsOpen} onChange={(v) => update.mutate({ friendRequestsOpen: v })} />
      </section>

      <section className="gh-card p-5 mb-5" aria-label="Notifications">
        <SectionTitle icon={Icon.bell(20)} title="Notifications" />
        <Toggle label="Match results" description="Get a notification when a match finishes." checked={s.notifyMatches} onChange={(v) => update.mutate({ notifyMatches: v })} />
        <Toggle label="Tournaments" description="Registration confirmations and tournament news." checked={s.notifyTournaments} onChange={(v) => update.mutate({ notifyTournaments: v })} />
        <Toggle label="Friends" description="New friends and invitations." checked={s.notifyFriends} onChange={(v) => update.mutate({ notifyFriends: v })} />
      </section>

      <section className="gh-card p-5 mb-5" aria-label="Audio and theme">
        <SectionTitle icon={Icon.zap(20)} title="Audio & Theme" />
        <Toggle label="Sound effects" description="Dice, flips and victory sounds in games." checked={s.soundEffects} onChange={(v) => update.mutate({ soundEffects: v })} />
        <Toggle label="Background music" description="Ambient lobby music while you browse." checked={s.music} onChange={(v) => update.mutate({ music: v })} />
        <div className="py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="font-medium text-sm mb-2">Accent color</p>
          <div className="flex gap-2">
            {([["emerald", "#2EE89A"], ["cyan", "#22D3EE"], ["purple", "#8B5CF6"]] as const).map(([key, color]) => (
              <button key={key} type="button" aria-label={`${key} accent`} aria-pressed={s.accent === key} onClick={() => update.mutate({ accent: key })}
                className="w-10 h-10 rounded-full capitalize" style={{ background: color, border: s.accent === key ? "3px solid #fff" : "3px solid transparent" }} />
            ))}
          </div>
          <p className="text-xs text-[var(--dim)] mt-2 capitalize">Current accent: {s.accent} (applies across the app on your next visit)</p>
        </div>
      </section>

      <section className="gh-card p-5" aria-label="Security">
        <SectionTitle icon={Icon.shield(20)} title="Security" />
        <Toggle label="Two-factor authentication" description="Require a verification code when signing in on a new device." checked={s.twoFactor} onChange={(v) => update.mutate({ twoFactor: v })} />
        <p className="text-xs text-[var(--dim)] pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          Signed in as {s.displayName}. GameHub accounts are protected by your Muse sign-in; match results are always verified server-side.
        </p>
      </section>
    </div>
  );
}

/* ---------------- History & Profile ---------------- */

export function HistoryPage({ onPlay }: { onPlay: StartMatchFn }) {
  const historyQ = useQuery({ queryKey: ["history", 30], queryFn: () => api.listMatchHistory({ limit: 30 }) });
  const rows = historyQ.data?.matches ?? [];
  return (
    <div className="gh-fadein">
      <h1 className="font-display text-3xl font-extrabold">Match History</h1>
      <p className="text-[var(--dim)] mt-1 mb-6">Every finished match, recorded from server-verified results.</p>
      <div className="gh-card">
        {rows.length === 0 ? (
          <EmptyState icon={Icon.clock(26)} title="No matches yet" body="Play your first game and the result will appear here.">
            <button type="button" className="gh-btn-primary px-6 py-2.5 mt-4 text-sm" onClick={() => onPlay("tictactoe")}>Play TicTacToe</button>
          </EmptyState>
        ) : (
          rows.map((m, i) => {
            const meta = GAME_META[m.gameId];
            return (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3.5" style={{ borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.05)" }}>
                {meta && <img src={meta.img} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{meta?.name ?? m.gameId} vs {m.opponent}</p>
                  <p className="text-xs text-[var(--dim)]">{m.mode === "room" ? "Room match" : "Ranked match"} · {m.finishedAt ? new Date(m.finishedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""}</p>
                </div>
                <span className="font-display font-bold text-sm px-3 py-1 rounded-full" style={{
                  color: m.result === "win" ? "var(--accent)" : m.result === "draw" ? "var(--gold)" : "var(--danger)",
                  background: m.result === "win" ? "rgba(46,232,154,0.1)" : m.result === "draw" ? "rgba(245,197,66,0.1)" : "rgba(248,113,113,0.1)",
                }}>
                  {m.status === "abandoned" ? "ABANDONED" : (m.result ?? "").toUpperCase()}
                </span>
                <button type="button" className="gh-btn-ghost px-4 py-1.5 text-xs shrink-0" onClick={() => onPlay(m.gameId, m.opponent)}>Rematch</button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function ProfilePage({ dashboard, go }: {
  dashboard: ApiResponse<typeof api, "getDashboard">;
  go: (v: "history" | "settings" | "games" | "store") => void;
}) {
  const { profile, stats, achievements } = dashboard;
  const winRate = stats.games > 0 ? Math.round((stats.wins / stats.games) * 100) : 0;
  return (
    <div className="gh-fadein">
      <div className="gh-card p-6 flex flex-col sm:flex-row gap-5 items-center sm:items-start">
        <img src={avatarImg} alt={profile.username} className="w-24 h-24 rounded-full object-cover" style={{ border: "3px solid var(--accent)", boxShadow: "0 0 24px rgba(46,232,154,0.35)" }} />
        <div className="flex-1 text-center sm:text-left">
          <h1 className="font-display text-3xl font-extrabold flex items-center gap-2 justify-center sm:justify-start">{profile.username} {Icon.verified(22)}</h1>
          <p className="text-[var(--dim)] mt-1">Level {profile.level} · {profile.premium ? "Premium member" : "Free member"} · Rating {profile.rating.toLocaleString()}</p>
          <div className="mt-3 max-w-sm mx-auto sm:mx-0">
            <ProgressBar value={profile.xpIntoLevel} max={profile.xpSpan} />
            <p className="text-xs text-[var(--dim)] mt-1.5">{profile.xpIntoLevel} / {profile.xpSpan} XP to Level {profile.level + 1} · {profile.xp} total XP</p>
          </div>
          <div className="flex gap-2.5 mt-4 justify-center sm:justify-start flex-wrap">
            <button type="button" className="gh-btn-primary px-5 py-2 text-sm" onClick={() => go("games")}>Play a Game</button>
            <button type="button" className="gh-btn-ghost px-5 py-2 text-sm" onClick={() => go("settings")}>Edit Profile</button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center shrink-0">
          {[
            { label: "Wins", value: stats.wins, icon: Icon.trophy(18), color: "var(--gold)" },
            { label: "Games", value: stats.games, icon: Icon.gamepad(18), color: "#8B5CF6" },
            { label: "Win rate", value: `${winRate}%`, icon: Icon.star(18), color: "var(--accent)" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl px-4 py-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
              <span className="flex justify-center" style={{ color: s.color }}>{s.icon}</span>
              <p className="font-display font-extrabold text-xl mt-1">{s.value}</p>
              <p className="text-[11px] text-[var(--dim)]">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 mt-5">
        <section className="gh-card p-5" aria-label="All achievements">
          <SectionTitle icon={Icon.star(20)} title="Achievements" action={<span className="text-sm text-[var(--dim)]">{achievements.filter((a) => a.unlocked).length} / {achievements.length} unlocked</span>} />
          <div className="space-y-4">
            {achievements.map((a) => (
              <div key={a.key} className="flex items-center gap-3">
                <AchievementIcon icon={a.icon} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold flex items-center gap-2">{a.title} {a.unlocked && <span className="text-[var(--accent)]">{Icon.check(15)}</span>}</p>
                  <p className="text-xs text-[var(--dim)]">{a.description}</p>
                  <div className="mt-1.5"><ProgressBar value={a.progress} max={a.target} color="#8B5CF6" height={6} /></div>
                </div>
                <span className="text-sm font-semibold text-[var(--dim)]">{a.progress}/{a.target}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="gh-card p-5" aria-label="Career summary">
          <SectionTitle icon={Icon.chart(20)} title="Career Summary" />
          <dl className="space-y-3 text-sm">
            {[
              ["Matches played", stats.games], ["Wins", stats.wins], ["Losses", stats.losses], ["Draws", stats.draws],
              ["Coins balance", dashboard.profile.coins], ["Total XP", dashboard.profile.xp],
            ].map(([k, v]) => (
              <div key={k as string} className="flex justify-between py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <dt className="text-[var(--dim)]">{k}</dt><dd className="font-bold">{v}</dd>
              </div>
            ))}
          </dl>
          <button type="button" className="gh-btn-ghost px-5 py-2 text-sm mt-4" onClick={() => go("history")}>View Match History</button>
        </section>
      </div>
    </div>
  );
}
