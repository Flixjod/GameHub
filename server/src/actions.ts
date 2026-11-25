import { defineAction, z, type ActionsModule, type Ctx } from "@hatch/space-sdk";
import { asc, desc, eq, sql } from "drizzle-orm";
import * as schema from "./schema";
import { applyMove, initialState, normalizeDifficulty, type GameId } from "./games";

/* ---------------- Catalog (platform content) ---------------- */

export const GAMES = [
  { id: "reversi", name: "Reversi", tagline: "Flip. Conquer. Win.", description: "Outflank your opponent's discs and flip the board to your color. Corner control wins games.", category: "Strategy", players: "2 Players", accent: "#2EE89A" },
  { id: "ludo", name: "Ludo", tagline: "Roll. Move. Win.", description: "Race all four tokens around the board and home before your opponent. Captures send rivals back to base.", category: "Board", players: "2 Players", accent: "#F5C542" },
  { id: "snakes", name: "Snake & Ladder", tagline: "Climb. Don't Fall.", description: "Roll the dice, climb ladders and dodge the snakes on the race to square 100.", category: "Casual", players: "2 Players", accent: "#22D3EE" },
  { id: "tictactoe", name: "TicTacToe", tagline: "Think. Win.", description: "The classic three-in-a-row duel. Quick, sharp, and unforgiving of a single mistake.", category: "Strategy", players: "2 Players", accent: "#F472B6" },
  { id: "connect4", name: "Connect Four", tagline: "Drop. Align. Win.", description: "Line up four discs horizontally, vertically or diagonally before your rival does. Center control is everything.", category: "Strategy", players: "2 Players", accent: "#60A5FA" },
  { id: "rps", name: "RPS Blitz", tagline: "Read. React. Win.", description: "Rock, Paper, Scissors, first to three points. Read your rival's pattern and counter it before they read yours.", category: "Casual", players: "1 v 1", accent: "#A3E635" },
] as const;

const GAME_ID_ENUM = ["reversi", "ludo", "snakes", "tictactoe", "connect4", "rps"] as const;
const DIFFICULTY_ENUM = ["easy", "normal", "hard"] as const;

const RIVALS: Array<[string, string, number, number, number, string]> = [
  // name, color, level, rating, wins, status
  ["ShadowFox", "#8B5CF6", 18, 2840, 132, "online"],
  ["NovaQueen", "#F472B6", 16, 2715, 121, "ingame"],
  ["BlazeRunner", "#F97316", 15, 2590, 110, "online"],
  ["PixelKnight", "#22D3EE", 14, 2430, 98, "online"],
  ["EchoStrike", "#2EE89A", 13, 2280, 87, "ingame"],
  ["VortexViper", "#A3E635", 11, 2050, 74, "offline"],
  ["LunaWolf", "#818CF8", 10, 1920, 66, "online"],
  ["IronTitan", "#94A3B8", 9, 1785, 58, "offline"],
  ["ZephyrAce", "#F5C542", 8, 1640, 49, "online"],
  ["CrimsonByte", "#EF4444", 7, 1510, 41, "ingame"],
  ["GhostRecon", "#E2E8F0", 6, 1380, 33, "offline"],
  ["TurboNinja", "#34D399", 5, 1245, 26, "online"],
];

const ACHIEVEMENTS = [
  { key: "first-win", title: "First Victory", description: "Win your first match.", target: 1, metric: "wins", icon: "flag" },
  { key: "sharp-mind", title: "Sharp Mind", description: "Win 10 matches.", target: 10, metric: "wins", icon: "zap" },
  { key: "game-champion", title: "Game Champion", description: "Win 50 matches.", target: 50, metric: "wins", icon: "trophy" },
  { key: "marathon", title: "Marathon Player", description: "Play 25 matches.", target: 25, metric: "games", icon: "gamepad" },
  { key: "reversi-master", title: "Reversi Master", description: "Win 5 Reversi matches.", target: 5, metric: "reversiWins", icon: "target" },
  { key: "ludo-legend", title: "Ludo Legend", description: "Win 5 Ludo matches.", target: 5, metric: "ludoWins", icon: "crown" },
  { key: "connect-king", title: "Connect King", description: "Win 3 Connect Four matches.", target: 3, metric: "connect4Wins", icon: "target" },
  { key: "mind-reader", title: "Mind Reader", description: "Win 3 RPS Blitz matches.", target: 3, metric: "rpsWins", icon: "zap" },
  { key: "social", title: "Social Player", description: "Add 3 friends.", target: 3, metric: "friends", icon: "users" },
  { key: "collector", title: "Collector", description: "Own 3 store items.", target: 3, metric: "owned", icon: "gem" },
] as const;

/* ---------------- Helpers ---------------- */

function makeDb(ctx: Ctx) {
  return ctx.db<typeof schema>();
}
type Db = ReturnType<typeof makeDb>;

async function ensureSeed(ctx: Ctx) {
  const db = ctx.db<typeof schema>();
  const prof = await db.select().from(schema.profile).limit(1);
  if (!prof.length) {
    await db.insert(schema.profile).values({ id: 1, username: "ProGamer", xp: 0, coins: 500, premium: 0, rating: 1000 });
    await db.insert(schema.settings).values({ id: 1, displayName: "ProGamer" });
    await db.insert(schema.notifications).values({
      title: "Welcome to GameHub",
      body: "Your arena is ready. Play a match, join a live room, or enter a tournament to start earning XP and coins.",
      kind: "system",
    });
  }
  const pls = await db.select({ id: schema.players.id }).from(schema.players).limit(1);
  if (!pls.length) {
    for (const [name, color, level, rating, wins, status] of RIVALS) {
      await db.insert(schema.players).values({
        name, color, level, rating, wins,
        games: wins + 40 + (rating % 37),
        initials: name.slice(0, 2).toUpperCase(),
        status: status as "online" | "ingame" | "offline",
        // Rivals are catalogue players only — friendship is earned exclusively
        // through the friend-request flow, never seeded.
        isFriend: 0,
      });
    }
    const all = await db.select().from(schema.players);
    const byName = (n: string) => all.find((p) => p.name === n);
    for (const n of ["BlazeRunner", "LunaWolf"]) {
      const p = byName(n);
      if (p) await db.insert(schema.friendRequests).values({ playerId: p.id, direction: "incoming", status: "pending" });
    }
    const roomsSeed: Array<[string, string, number, number, string]> = [
      ["Ludo Blast", "ludo", 3, 4, "NovaQueen"],
      ["Reversi Arena", "reversi", 1, 2, "ShadowFox"],
      ["TicTacToe Pro", "tictactoe", 1, 2, "PixelKnight"],
      ["Snakes Sprint", "snakes", 2, 4, "EchoStrike"],
      ["Ludo Legends Lounge", "ludo", 4, 4, "ZephyrAce"],
    ];
    for (const [name, gameId, cur, max, host] of roomsSeed) {
      await db.insert(schema.rooms).values({
        name, gameId, hostName: host, currentPlayers: cur, maxPlayers: max,
        status: cur >= max ? "full" : "open", seeded: 1,
      });
    }
    const tourSeed: Array<[string, string, "upcoming" | "live" | "completed", string, number, number, number, string, string | null]> = [
      ["Emerald Reversi Cup", "reversi", "live", "10,000 coins + Champion Frame", 100, 32, 24, "Live now — finals today", null],
      ["Ludo Grand Prix", "ludo", "upcoming", "5,000 coins + Ludo Legend badge", 50, 64, 41, "Starts Sat, Nov 28", null],
      ["TicTacToe Blitz", "tictactoe", "upcoming", "2,500 coins", 25, 16, 9, "Starts Sun, Nov 29", null],
      ["Snakes Royale", "snakes", "live", "3,000 coins + Dice Trail", 40, 32, 28, "Live now — semifinals", null],
      ["Autumn Strategy Open", "reversi", "completed", "7,500 coins", 75, 32, 32, "Ended Nov 15", "ShadowFox"],
      ["Weekend Ludo Clash", "ludo", "completed", "1,500 coins", 20, 16, 16, "Ended Nov 8", "NovaQueen"],
    ];
    for (const [name, gameId, status, prize, fee, slots, reg, starts, winner] of tourSeed) {
      await db.insert(schema.tournaments).values({
        name, gameId, status, prize, entryFee: fee, slots, registeredCount: reg, startsLabel: starts, winner,
      });
    }
    const storeSeed: Array<[string, typeof schema.storeItems.$inferInsert.kind, string, number, string]> = [
      ["GameHub Premium", "premium", "Unlock exclusive rooms, double XP weekends, a gold profile frame and priority matchmaking.", 999, "crown"],
      ["Emerald Champion Frame", "avatar_frame", "A glowing emerald frame for your avatar, earned by champions.", 350, "frame"],
      ["Royal Purple Frame", "avatar_frame", "A royal purple and gold avatar frame from the achievement vault.", 450, "frame"],
      ["Midnight Arena Theme", "theme", "A deep midnight arena theme with cyan energy accents.", 300, "palette"],
      ["Golden Dice Trail", "cosmetic", "Your dice leave a golden trail in Ludo and Snake & Ladder.", 200, "sparkles"],
      ["Victory Confetti Pack", "cosmetic", "Emerald confetti bursts on every win screen.", 150, "party"],
      ["XP Boost x2 (7 days)", "reward", "Double XP from every match for the next 7 days.", 250, "zap"],
      ["Coin Chest (1,000 coins)", "reward", "A chest of 1,000 GameHub coins, added instantly.", 0, "gem"],
    ];
    for (const [name, kind, description, price, icon] of storeSeed) {
      await db.insert(schema.storeItems).values({ name, kind, description, price, icon });
    }
  }
}

function levelFromXp(xp: number) {
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  const floorXp = (level - 1) * (level - 1) * 100;
  const nextXp = level * level * 100;
  return { level, floorXp, nextXp, intoLevel: xp - floorXp, span: nextXp - floorXp };
}

async function getProfileRow(db: Db) {
  const rows = await db.select().from(schema.profile).limit(1);
  const row = rows[0];
  if (!row) throw new Error("Profile not initialized yet — reload the app.");
  return row;
}

async function statsFor(db: Db) {
  const finished = await db
    .select()
    .from(schema.matches)
    .where(eq(schema.matches.status, "finished"));
  const wins = finished.filter((m) => m.result === "win").length;
  const losses = finished.filter((m) => m.result === "loss").length;
  const draws = finished.filter((m) => m.result === "draw").length;
  return { wins, losses, draws, games: finished.length, finished };
}

async function notify(db: Db, title: string, body: string, kind: string) {
  await db.insert(schema.notifications).values({ title, body, kind });
}

const playerShape = z.object({
  id: z.number(), name: z.string(), initials: z.string(), color: z.string(),
  level: z.number(), rating: z.number(), wins: z.number(), games: z.number(),
  status: z.string(), isFriend: z.boolean(),
});
const roomShape = z.object({
  id: z.number(), name: z.string(), gameId: z.string(), hostName: z.string(),
  currentPlayers: z.number(), maxPlayers: z.number(), status: z.string(), joined: z.boolean(),
});
const matchShape = z.object({
  id: z.number(), gameId: z.string(), opponent: z.string(), mode: z.string(),
  roomId: z.number().nullable(), state: z.string(), status: z.string(),
  result: z.string().nullable(), version: z.number(),
  createdAt: z.string(), finishedAt: z.string().nullable(),
});

function toMatch(m: typeof schema.matches.$inferSelect) {
  return {
    id: m.id, gameId: m.gameId, opponent: m.opponent, mode: m.mode,
    roomId: m.roomId ?? null, state: m.state, status: m.status,
    result: m.result ?? null, version: m.version,
    createdAt: m.createdAt.toISOString(),
    finishedAt: m.finishedAt ? m.finishedAt.toISOString() : null,
  };
}

/* ---------------- Actions ---------------- */

export const Actions = {
  getDashboard: defineAction({
    description: "Returns everything the GameHub home dashboard needs: profile, stats, activity, achievements, rooms, friends and notifications.",
    request: z.object({}),
    response: z.object({
      profile: z.object({
        username: z.string(), xp: z.number(), coins: z.number(), premium: z.boolean(),
        rating: z.number(), level: z.number(), xpIntoLevel: z.number(), xpSpan: z.number(), nextLevelXp: z.number(),
      }),
      stats: z.object({ wins: z.number(), losses: z.number(), draws: z.number(), games: z.number() }),
      activity: z.array(z.object({ day: z.string(), label: z.string(), games: z.number(), wins: z.number() })),
      achievements: z.array(z.object({ key: z.string(), title: z.string(), description: z.string(), icon: z.string(), progress: z.number(), target: z.number(), unlocked: z.boolean() })),
      rooms: z.array(roomShape),
      friendsOnline: z.array(playerShape),
      friendsOnlineCount: z.number(),
      friendsTotal: z.number(),
      unread: z.number(),
      activeMatchId: z.number().nullable(),
    }),
    async handler(ctx) {
      await ensureSeed(ctx);
      const db = ctx.db<typeof schema>();
      const prof = await getProfileRow(db);
      const lv = levelFromXp(prof.xp);
      const { wins, losses, draws, games, finished } = await statsFor(db);
      // Single source of truth for rating — identical to the leaderboard:
      // 1,000 base + 25 per win + 5 per game played. Never read the stored
      // column for display; heal it if a legacy value (e.g. 4.8) is still there.
      const userRating = 1000 + wins * 25 + games * 5;
      if (prof.rating !== userRating) {
        await db.update(schema.profile).set({ rating: userRating }).where(eq(schema.profile.id, prof.id));
      }

      // Last 7 local days activity from real match rows
      const activity: Array<{ day: string; label: string; games: number; wins: number }> = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
        const key = d.toDateString();
        const dayMatches = finished.filter((m) => m.finishedAt && m.finishedAt.toDateString() === key);
        activity.push({
          day: d.toISOString(),
          label: d.toLocaleDateString(undefined, { weekday: "short" }),
          games: dayMatches.length,
          wins: dayMatches.filter((m) => m.result === "win").length,
        });
      }

      const friends = await db.select().from(schema.players).where(eq(schema.players.isFriend, 1));
      const ownedCount = (await db.select().from(schema.storeItems).where(eq(schema.storeItems.owned, 1))).length;
      const metricVal = (metric: string) => {
        switch (metric) {
          case "wins": return wins;
          case "games": return games;
          case "friends": return friends.length;
          case "owned": return ownedCount;
          default:
            // Generic per-game win metric: "<gameId>Wins" (reversiWins, ludoWins, connect4Wins, …)
            if (metric.endsWith("Wins")) {
              const gameId = metric.slice(0, -4);
              return finished.filter((m) => m.gameId === gameId && m.result === "win").length;
            }
            return 0;
        }
      };
      const achievements = ACHIEVEMENTS.map((a) => {
        const progress = Math.min(metricVal(a.metric), a.target);
        return { key: a.key, title: a.title, description: a.description, icon: a.icon, progress, target: a.target, unlocked: progress >= a.target };
      }).sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || (b.progress / b.target) - (a.progress / a.target));

      const roomRows = await db.select().from(schema.rooms).orderBy(desc(schema.rooms.id)).limit(5);
      const onlineFriends = friends.filter((f) => f.status !== "offline");
      const notifs = await db.select().from(schema.notifications).where(eq(schema.notifications.read, 0));
      const active = await db.select().from(schema.matches).where(eq(schema.matches.status, "active")).orderBy(desc(schema.matches.id)).limit(1);

      return {
        profile: {
          username: prof.username, xp: prof.xp, coins: prof.coins, premium: prof.premium === 1,
          rating: userRating, level: lv.level, xpIntoLevel: lv.intoLevel, xpSpan: lv.span, nextLevelXp: lv.nextXp,
        },
        stats: { wins, losses, draws, games },
        activity,
        achievements,
        rooms: roomRows.map((r) => ({ id: r.id, name: r.name, gameId: r.gameId, hostName: r.hostName, currentPlayers: r.currentPlayers, maxPlayers: r.maxPlayers, status: r.status, joined: r.joined === 1 })),
        friendsOnline: onlineFriends.map((p) => ({ id: p.id, name: p.name, initials: p.initials, color: p.color, level: p.level, rating: p.rating, wins: p.wins, games: p.games, status: p.status, isFriend: true })),
        friendsOnlineCount: onlineFriends.length,
        friendsTotal: friends.length,
        unread: notifs.length,
        activeMatchId: active[0]?.id ?? null,
      };
    },
  }),

  searchAll: defineAction({
    description: "Searches games, players and tournaments by name.",
    request: z.object({ query: z.string().trim().max(60) }),
    response: z.object({
      games: z.array(z.object({ id: z.string(), name: z.string(), tagline: z.string() })),
      players: z.array(playerShape),
      tournaments: z.array(z.object({ id: z.number(), name: z.string(), status: z.string() })),
    }),
    async handler(ctx, args) {
      await ensureSeed(ctx);
      const db = ctx.db<typeof schema>();
      const q = args.query.toLowerCase();
      if (!q) return { games: [], players: [], tournaments: [] };
      const players = await db.select().from(schema.players);
      const tours = await db.select().from(schema.tournaments);
      return {
        games: GAMES.filter((g) => g.name.toLowerCase().includes(q)).map((g) => ({ id: g.id, name: g.name, tagline: g.tagline })),
        players: players.filter((p) => p.name.toLowerCase().includes(q)).map((p) => ({ id: p.id, name: p.name, initials: p.initials, color: p.color, level: p.level, rating: p.rating, wins: p.wins, games: p.games, status: p.status, isFriend: p.isFriend === 1 })),
        tournaments: tours.filter((t) => t.name.toLowerCase().includes(q)).map((t) => ({ id: t.id, name: t.name, status: t.status })),
      };
    },
  }),

  listNotifications: defineAction({
    description: "Lists notifications, newest first.",
    request: z.object({}),
    response: z.object({
      notifications: z.array(z.object({ id: z.number(), title: z.string(), body: z.string(), kind: z.string(), read: z.boolean(), createdAt: z.string() })),
    }),
    async handler(ctx) {
      await ensureSeed(ctx);
      const db = ctx.db<typeof schema>();
      const rows = await db.select().from(schema.notifications).orderBy(desc(schema.notifications.id)).limit(30);
      return { notifications: rows.map((n) => ({ id: n.id, title: n.title, body: n.body, kind: n.kind, read: n.read === 1, createdAt: n.createdAt.toISOString() })) };
    },
  }),

  markNotificationsRead: defineAction({
    description: "Marks all notifications as read.",
    request: z.object({}),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      await db.update(schema.notifications).set({ read: 1 }).where(eq(schema.notifications.read, 0));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  listRooms: defineAction({
    description: "Lists all multiplayer rooms.",
    request: z.object({}),
    response: z.object({ rooms: z.array(roomShape) }),
    async handler(ctx) {
      await ensureSeed(ctx);
      const db = ctx.db<typeof schema>();
      const rows = await db.select().from(schema.rooms).orderBy(desc(schema.rooms.id));
      return { rooms: rows.map((r) => ({ id: r.id, name: r.name, gameId: r.gameId, hostName: r.hostName, currentPlayers: r.currentPlayers, maxPlayers: r.maxPlayers, status: r.status, joined: r.joined === 1 })) };
    },
  }),

  createRoom: defineAction({
    description: "Creates a new multiplayer room hosted by the user.",
    request: z.object({
      name: z.string().trim().min(3).max(40),
      gameId: z.enum(GAME_ID_ENUM),
      maxPlayers: z.number().int().min(2).max(4),
    }),
    response: z.object({ room: roomShape }),
    async handler(ctx, args) {
      await ensureSeed(ctx);
      const db = ctx.db<typeof schema>();
      const inserted = await db.insert(schema.rooms).values({
        name: args.name, gameId: args.gameId, hostName: "ProGamer",
        currentPlayers: 1, maxPlayers: args.maxPlayers, status: "open", joined: 1, seeded: 0,
      }).returning();
      const r = inserted[0];
      if (!r) throw new Error("Could not create the room.");
      await notify(db, "Room created", `Your room “${args.name}” is live. Share it with friends or start a match from the room.`, "room");
      ctx.invalidateQueries();
      return { room: { id: r.id, name: r.name, gameId: r.gameId, hostName: r.hostName, currentPlayers: r.currentPlayers, maxPlayers: r.maxPlayers, status: r.status, joined: true } };
    },
  }),

  joinRoom: defineAction({
    description: "Joins a room after validating capacity, then starts a match against the room host.",
    request: z.object({ roomId: z.number().int().positive() }),
    response: z.object({ matchId: z.number() }),
    async handler(ctx, args) {
      await ensureSeed(ctx);
      const db = ctx.db<typeof schema>();
      const rows = await db.select().from(schema.rooms).where(eq(schema.rooms.id, args.roomId));
      const room = rows[0];
      if (!room) throw new Error("That room no longer exists.");
      if (room.joined === 1) throw new Error("You are already in this room.");
      if (room.currentPlayers >= room.maxPlayers) throw new Error("This room is full. Try another room or create your own.");
      const newCount = room.currentPlayers + 1;
      await db.update(schema.rooms).set({
        currentPlayers: newCount, joined: 1,
        status: newCount >= room.maxPlayers ? "full" : "open",
      }).where(eq(schema.rooms.id, room.id));
      const gameId = room.gameId as GameId;
      const inserted = await db.insert(schema.matches).values({
        gameId, opponent: room.hostName, mode: "room", roomId: room.id,
        state: JSON.stringify(initialState(gameId)), status: "active",
      }).returning({ id: schema.matches.id });
      const m = inserted[0];
      if (!m) throw new Error("Could not start the match.");
      ctx.invalidateQueries();
      return { matchId: m.id };
    },
  }),

  leaveRoom: defineAction({
    description: "Leaves a room the user previously joined, freeing the seat.",
    request: z.object({ roomId: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      const rows = await db.select().from(schema.rooms).where(eq(schema.rooms.id, args.roomId));
      const room = rows[0];
      if (!room) throw new Error("That room no longer exists.");
      if (room.joined !== 1) throw new Error("You are not in this room.");
      await db.update(schema.rooms).set({
        currentPlayers: Math.max(0, room.currentPlayers - 1), joined: 0, status: "open",
      }).where(eq(schema.rooms.id, room.id));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  startMatch: defineAction({
    description: "Starts a new match of the chosen game against a platform rival, at the chosen AI difficulty.",
    request: z.object({
      gameId: z.enum(GAME_ID_ENUM),
      opponent: z.string().trim().max(40).optional(),
      difficulty: z.enum(DIFFICULTY_ENUM).optional(),
    }),
    response: z.object({ matchId: z.number() }),
    async handler(ctx, args) {
      await ensureSeed(ctx);
      const db = ctx.db<typeof schema>();
      const rivals = await db.select().from(schema.players);
      const chosen = args.opponent
        ? rivals.find((r) => r.name === args.opponent)
        : rivals[Math.floor(Math.random() * rivals.length)];
      const opponent = chosen?.name ?? "NovaQueen";
      const gameId = args.gameId as GameId;
      const difficulty = normalizeDifficulty(args.difficulty);
      const inserted = await db.insert(schema.matches).values({
        gameId, opponent, mode: "ai",
        state: JSON.stringify(initialState(gameId, difficulty)), status: "active",
      }).returning({ id: schema.matches.id });
      const m = inserted[0];
      if (!m) throw new Error("Could not start the match.");
      ctx.invalidateQueries();
      return { matchId: m.id };
    },
  }),

  joinQueue: defineAction({
    description: "Enters the waiting room for a game. Queued humans are paired; otherwise an online rival joins after a short wait.",
    request: z.object({
      gameId: z.enum(GAME_ID_ENUM),
      difficulty: z.enum(DIFFICULTY_ENUM).optional(),
    }),
    response: z.object({ queueId: z.number() }),
    async handler(ctx, args) {
      await ensureSeed(ctx);
      const db = ctx.db<typeof schema>();
      const prof = await getProfileRow(db);
      // Only one live waiting entry per player and game.
      const prior = await db.select().from(schema.lobby)
        .where(sql`${schema.lobby.playerName} = ${prof.username} AND ${schema.lobby.gameId} = ${args.gameId} AND ${schema.lobby.status} = 'waiting'`);
      for (const row of prior) {
        await db.update(schema.lobby).set({ status: "cancelled" }).where(eq(schema.lobby.id, row.id));
      }
      const inserted = await db.insert(schema.lobby).values({
        gameId: args.gameId,
        playerName: prof.username,
        difficulty: normalizeDifficulty(args.difficulty),
        status: "waiting",
      }).returning({ id: schema.lobby.id });
      const q = inserted[0];
      if (!q) throw new Error("Could not join the waiting room.");
      ctx.invalidateQueries();
      return { queueId: q.id };
    },
  }),

  pollQueue: defineAction({
    description: "Polls a waiting-room entry. Pairs a second queued human when present, otherwise an online rival after a short randomized wait.",
    request: z.object({ queueId: z.number().int().positive() }),
    response: z.object({
      status: z.enum(["waiting", "matched", "cancelled"]),
      waitedMs: z.number(),
      playersInLine: z.number(),
      matchId: z.number().nullable(),
      opponent: z.string().nullable(),
      gameId: z.string(),
    }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const rows = await db.select().from(schema.lobby).where(eq(schema.lobby.id, args.queueId));
      const entry = rows[0];
      if (!entry) throw new Error("Waiting-room entry not found.");
      if (entry.status === "cancelled") {
        return { status: "cancelled", waitedMs: 0, playersInLine: 0, matchId: null, opponent: null, gameId: entry.gameId };
      }
      if (entry.status === "matched") {
        return { status: "matched", waitedMs: entry.matchedAt ? entry.matchedAt.getTime() - entry.createdAt.getTime() : 0, playersInLine: 0, matchId: entry.matchId ?? null, opponent: entry.opponent ?? null, gameId: entry.gameId };
      }
      const now = Date.now();
      const waited = now - entry.createdAt.getTime();
      // 1) A real queued human for the same game — pair immediately.
      const others = await db.select().from(schema.lobby)
        .where(sql`${schema.lobby.gameId} = ${entry.gameId} AND ${schema.lobby.status} = 'waiting' AND ${schema.lobby.id} != ${entry.id}`);
      const human = others.find((o) => o.playerName !== entry.playerName);
      if (human) {
        const difficulty = normalizeDifficulty(human.difficulty ?? entry.difficulty);
        const inserted = await db.insert(schema.matches).values({
          gameId: entry.gameId as GameId, opponent: human.playerName, mode: "online",
          state: JSON.stringify(initialState(entry.gameId as GameId, difficulty)), status: "active",
        }).returning({ id: schema.matches.id });
        const m = inserted[0];
        if (!m) throw new Error("Could not start the match.");
        await db.update(schema.lobby).set({ status: "matched", opponent: human.playerName, matchId: m.id, matchedAt: new Date() }).where(eq(schema.lobby.id, entry.id));
        await db.update(schema.lobby).set({ status: "matched", opponent: entry.playerName, matchId: m.id, matchedAt: new Date() }).where(eq(schema.lobby.id, human.id));
        await notify(db, "Opponent found!", `You’ve been matched with ${human.playerName} — the ${entry.gameId} match is ready.`, "match");
        ctx.invalidateQueries();
        return { status: "matched", waitedMs: waited, playersInLine: 0, matchId: m.id, opponent: human.playerName, gameId: entry.gameId };
      }
      // 2) Randomized pair delay (2.5–5.5 s per entry), then an online rival steps in.
      const pairAfterMs = 2500 + (entry.id * 977) % 3000;
      if (waited >= pairAfterMs) {
        const rivals = await db.select().from(schema.players);
        const online = rivals.filter((p) => p.status === "online");
        const pool = online.length ? online : rivals.filter((p) => p.status === "ingame");
        const chosen = (pool.length ? pool : rivals)[Math.floor(Math.random() * (pool.length ? pool.length : rivals.length))];
        const opponent = chosen?.name ?? "NovaQueen";
        const difficulty = normalizeDifficulty(entry.difficulty);
        const inserted = await db.insert(schema.matches).values({
          gameId: entry.gameId as GameId, opponent, mode: "online",
          state: JSON.stringify(initialState(entry.gameId as GameId, difficulty)), status: "active",
        }).returning({ id: schema.matches.id });
        const m = inserted[0];
        if (!m) throw new Error("Could not start the match.");
        await db.update(schema.lobby).set({ status: "matched", opponent, matchId: m.id, matchedAt: new Date() }).where(eq(schema.lobby.id, entry.id));
        await notify(db, "Opponent found!", `${opponent} joined your ${entry.gameId} waiting room — the match is ready.`, "match");
        ctx.invalidateQueries();
        return { status: "matched", waitedMs: waited, playersInLine: 0, matchId: m.id, opponent, gameId: entry.gameId };
      }
      return { status: "waiting", waitedMs: waited, playersInLine: 1, matchId: null, opponent: null, gameId: entry.gameId };
    },
  }),

  leaveQueue: defineAction({
    description: "Cancels a waiting-room entry.",
    request: z.object({ queueId: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      await db.update(schema.lobby).set({ status: "cancelled" }).where(eq(schema.lobby.id, args.queueId));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  getMatch: defineAction({
    description: "Returns one match with its current server-side game state.",
    request: z.object({ matchId: z.number().int().positive() }),
    response: z.object({ match: matchShape }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const rows = await db.select().from(schema.matches).where(eq(schema.matches.id, args.matchId));
      const m = rows[0];
      if (!m) throw new Error("Match not found.");
      return { match: toMatch(m) };
    },
  }),

  makeMove: defineAction({
    description: "Validates and applies a move on the server, runs the opponent response, and settles XP/coins when the match ends.",
    request: z.object({
      matchId: z.number().int().positive(),
      version: z.number().int().min(0),
      index: z.number().int().min(0).max(63).optional(),
      action: z.string().max(10).optional(),
      token: z.number().int().min(0).max(3).optional(),
    }),
    response: z.object({
      match: matchShape,
      message: z.string(),
      reward: z.object({ xp: z.number(), coins: z.number() }).nullable(),
    }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const rows = await db.select().from(schema.matches).where(eq(schema.matches.id, args.matchId));
      const m = rows[0];
      if (!m) throw new Error("Match not found.");
      if (m.status !== "active") throw new Error("This match is already over. Start a new one.");
      if (m.version !== args.version) throw new Error("The game state changed — refresh and try again.");
      const state = JSON.parse(m.state) as unknown;
      const outcome = applyMove(m.gameId as GameId, state, { index: args.index, action: args.action, token: args.token });
      const newVersion = m.version + 1;
      let reward: { xp: number; coins: number } | null = null;
      if (outcome.finished && outcome.result) {
        // Difficulty-scaled rewards: the baseline (normal) is unchanged.
        const mult = (state as { difficulty?: string }).difficulty === "hard" ? 1.3 : (state as { difficulty?: string }).difficulty === "easy" ? 0.8 : 1;
        const base = outcome.result === "win" ? { xp: 100, coins: 60 } : outcome.result === "draw" ? { xp: 40, coins: 25 } : { xp: 15, coins: 10 };
        reward = { xp: Math.round(base.xp * mult), coins: Math.round(base.coins * mult) };
        const prof = await getProfileRow(db);
        const newXp = prof.xp + reward.xp;
        const before = levelFromXp(prof.xp).level;
        const after = levelFromXp(newXp).level;
        // Keep the stored rating in sync with the computed formula
        // (this match is not yet marked finished, so add it in).
        const preStats = await statsFor(db);
        const newRating = 1000 + (preStats.wins + (outcome.result === "win" ? 1 : 0)) * 25 + (preStats.games + 1) * 5;
        await db.update(schema.profile).set({ xp: newXp, coins: prof.coins + reward.coins, rating: newRating }).where(eq(schema.profile.id, 1));
        await db.update(schema.matches).set({
          state: JSON.stringify(outcome.state), status: "finished", result: outcome.result,
          version: newVersion, finishedAt: new Date(),
        }).where(eq(schema.matches.id, m.id));
        const gameName = GAMES.find((g) => g.id === m.gameId)?.name ?? m.gameId;
        await notify(db,
          outcome.result === "win" ? "Victory!" : outcome.result === "draw" ? "Match drawn" : "Match finished",
          `${gameName} vs ${m.opponent}: ${outcome.message} You earned ${reward.xp} XP and ${reward.coins} coins.`,
          "match");
        if (after > before) {
          await notify(db, "Level up!", `You reached Level ${after}. Keep the streak going.`, "achievement");
        }
      } else {
        await db.update(schema.matches).set({
          state: JSON.stringify(outcome.state), version: newVersion,
        }).where(eq(schema.matches.id, m.id));
      }
      const updated = (await db.select().from(schema.matches).where(eq(schema.matches.id, m.id)))[0];
      if (!updated) throw new Error("Match update failed.");
      ctx.invalidateQueries();
      return { match: toMatch(updated), message: outcome.message, reward };
    },
  }),

  abandonMatch: defineAction({
    description: "Abandons an active match; it is recorded as a loss and any joined room seat is freed.",
    request: z.object({ matchId: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      const rows = await db.select().from(schema.matches).where(eq(schema.matches.id, args.matchId));
      const m = rows[0];
      if (!m) throw new Error("Match not found.");
      if (m.status !== "active") throw new Error("This match is already over.");
      await db.update(schema.matches).set({ status: "abandoned", result: "loss", finishedAt: new Date() }).where(eq(schema.matches.id, m.id));
      if (m.roomId) {
        const roomRows = await db.select().from(schema.rooms).where(eq(schema.rooms.id, m.roomId));
        const room = roomRows[0];
        if (room && room.joined === 1) {
          await db.update(schema.rooms).set({ currentPlayers: Math.max(0, room.currentPlayers - 1), joined: 0, status: "open" }).where(eq(schema.rooms.id, room.id));
        }
      }
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  listMatchHistory: defineAction({
    description: "Lists finished and abandoned matches, newest first.",
    request: z.object({ limit: z.number().int().positive().max(50).default(20) }),
    response: z.object({
      matches: z.array(z.object({
        id: z.number(), gameId: z.string(), opponent: z.string(), mode: z.string(),
        result: z.string().nullable(), status: z.string(), finishedAt: z.string().nullable(),
      })),
    }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const rows = await db.select().from(schema.matches)
        .where(sql`${schema.matches.status} != 'active'`)
        .orderBy(desc(schema.matches.id)).limit(args.limit);
      return {
        matches: rows.map((m) => ({
          id: m.id, gameId: m.gameId, opponent: m.opponent, mode: m.mode,
          result: m.result ?? null, status: m.status,
          finishedAt: m.finishedAt ? m.finishedAt.toISOString() : null,
        })),
      };
    },
  }),

  listPlayers: defineAction({
    description: "Lists platform players with friendship and presence state.",
    request: z.object({}),
    response: z.object({
      players: z.array(playerShape),
      requests: z.array(z.object({ id: z.number(), playerId: z.number(), direction: z.string(), playerName: z.string() })),
    }),
    async handler(ctx) {
      await ensureSeed(ctx);
      const db = ctx.db<typeof schema>();
      const players = await db.select().from(schema.players).orderBy(desc(schema.players.rating));
      const reqs = await db.select().from(schema.friendRequests).where(eq(schema.friendRequests.status, "pending"));
      return {
        players: players.map((p) => ({ id: p.id, name: p.name, initials: p.initials, color: p.color, level: p.level, rating: p.rating, wins: p.wins, games: p.games, status: p.status, isFriend: p.isFriend === 1 })),
        requests: reqs.map((r) => ({ id: r.id, playerId: r.playerId, direction: r.direction, playerName: players.find((p) => p.id === r.playerId)?.name ?? "Player" })),
      };
    },
  }),

  sendFriendRequest: defineAction({
    description: "Sends a friend request to a player.",
    request: z.object({ playerId: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      await ensureSeed(ctx);
      const db = ctx.db<typeof schema>();
      const rows = await db.select().from(schema.players).where(eq(schema.players.id, args.playerId));
      const p = rows[0];
      if (!p) throw new Error("Player not found.");
      if (p.isFriend === 1) throw new Error("You are already friends.");
      const existing = await db.select().from(schema.friendRequests)
        .where(sql`${schema.friendRequests.playerId} = ${args.playerId} AND ${schema.friendRequests.status} = 'pending'`);
      if (existing.length) throw new Error("A request is already pending with this player.");
      await db.insert(schema.friendRequests).values({ playerId: args.playerId, direction: "outgoing", status: "pending" });
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  respondFriendRequest: defineAction({
    description: "Accepts or rejects an incoming friend request.",
    request: z.object({ requestId: z.number().int().positive(), accept: z.boolean() }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      const rows = await db.select().from(schema.friendRequests).where(eq(schema.friendRequests.id, args.requestId));
      const r = rows[0];
      if (!r || r.status !== "pending") throw new Error("That request is no longer pending.");
      await db.update(schema.friendRequests).set({ status: args.accept ? "accepted" : "rejected" }).where(eq(schema.friendRequests.id, r.id));
      if (args.accept) {
        await db.update(schema.players).set({ isFriend: 1 }).where(eq(schema.players.id, r.playerId));
        const p = (await db.select().from(schema.players).where(eq(schema.players.id, r.playerId)))[0];
        await notify(db, "New friend", `${p?.name ?? "A player"} is now on your friends list.`, "friend");
      }
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  removeFriend: defineAction({
    description: "Removes a player from the friends list.",
    request: z.object({ playerId: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      await db.update(schema.players).set({ isFriend: 0 }).where(eq(schema.players.id, args.playerId));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  inviteToRoom: defineAction({
    description: "Sends a room invitation notification to a friend.",
    request: z.object({ playerId: z.number().int().positive(), roomId: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      const p = (await db.select().from(schema.players).where(eq(schema.players.id, args.playerId)))[0];
      const room = (await db.select().from(schema.rooms).where(eq(schema.rooms.id, args.roomId)))[0];
      if (!p || !room) throw new Error("Player or room not found.");
      await notify(db, "Invitation sent", `You invited ${p.name} to “${room.name}”. They'll see it in their inbox.`, "room");
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  listTournaments: defineAction({
    description: "Lists tournaments by status plus the user's registrations.",
    request: z.object({}),
    response: z.object({
      tournaments: z.array(z.object({
        id: z.number(), name: z.string(), gameId: z.string(), status: z.string(), prize: z.string(),
        entryFee: z.number(), slots: z.number(), registeredCount: z.number(), startsLabel: z.string(),
        registered: z.boolean(), winner: z.string().nullable(),
      })),
    }),
    async handler(ctx) {
      await ensureSeed(ctx);
      const db = ctx.db<typeof schema>();
      const rows = await db.select().from(schema.tournaments).orderBy(asc(schema.tournaments.id));
      return {
        tournaments: rows.map((t) => ({
          id: t.id, name: t.name, gameId: t.gameId, status: t.status, prize: t.prize,
          entryFee: t.entryFee, slots: t.slots, registeredCount: t.registeredCount,
          startsLabel: t.startsLabel, registered: t.registered === 1, winner: t.winner ?? null,
        })),
      };
    },
  }),

  registerTournament: defineAction({
    description: "Registers the user for a tournament, charging the entry fee in coins.",
    request: z.object({ tournamentId: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true), coins: z.number() }),
    async handler(ctx, args): Promise<{ ok: true; coins: number }> {
      await ensureSeed(ctx);
      const db = ctx.db<typeof schema>();
      const t = (await db.select().from(schema.tournaments).where(eq(schema.tournaments.id, args.tournamentId)))[0];
      if (!t) throw new Error("Tournament not found.");
      if (t.status === "completed") throw new Error("This tournament has already finished.");
      if (t.registered === 1) throw new Error("You are already registered.");
      if (t.registeredCount >= t.slots) throw new Error("This tournament is full.");
      const prof = await getProfileRow(db);
      if (prof.coins < t.entryFee) throw new Error(`You need ${t.entryFee} coins to enter — you have ${prof.coins}. Win matches to earn more.`);
      await db.update(schema.profile).set({ coins: prof.coins - t.entryFee }).where(eq(schema.profile.id, 1));
      await db.update(schema.tournaments).set({ registered: 1, registeredCount: t.registeredCount + 1 }).where(eq(schema.tournaments.id, t.id));
      await notify(db, "Tournament entry confirmed", `You're in: ${t.name}. Prize pool: ${t.prize}. ${t.startsLabel}.`, "tournament");
      ctx.invalidateQueries();
      return { ok: true, coins: prof.coins - t.entryFee };
    },
  }),

  unregisterTournament: defineAction({
    description: "Withdraws the user from a tournament and refunds the entry fee.",
    request: z.object({ tournamentId: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      const t = (await db.select().from(schema.tournaments).where(eq(schema.tournaments.id, args.tournamentId)))[0];
      if (!t) throw new Error("Tournament not found.");
      if (t.registered !== 1) throw new Error("You are not registered for this tournament.");
      const prof = await getProfileRow(db);
      await db.update(schema.profile).set({ coins: prof.coins + t.entryFee }).where(eq(schema.profile.id, 1));
      await db.update(schema.tournaments).set({ registered: 0, registeredCount: Math.max(0, t.registeredCount - 1) }).where(eq(schema.tournaments.id, t.id));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  getLeaderboard: defineAction({
    description: "Returns global, weekly-style, monthly-style or friends leaderboard including the user's live standing.",
    request: z.object({ scope: z.enum(["global", "weekly", "monthly", "friends"]) }),
    response: z.object({
      rows: z.array(z.object({
        rank: z.number(), name: z.string(), initials: z.string(), color: z.string(),
        level: z.number(), rating: z.number(), wins: z.number(), games: z.number(),
        delta: z.number(), isUser: z.boolean(),
      })),
      userRank: z.number(),
    }),
    async handler(ctx, args) {
      await ensureSeed(ctx);
      const db = ctx.db<typeof schema>();
      const prof = await getProfileRow(db);
      const { wins, games } = await statsFor(db);
      const lv = levelFromXp(prof.xp);
      const userRating = 1000 + wins * 25 + games * 5;
      const players = await db.select().from(schema.players);
      const factor = args.scope === "weekly" ? 0.06 : args.scope === "monthly" ? 0.22 : 1;
      const entries = players
        .filter((p) => args.scope !== "friends" || p.isFriend === 1)
        .map((p) => ({
          name: p.name, initials: p.initials, color: p.color, level: p.level,
          rating: args.scope === "global" ? p.rating : 1000 + Math.round((p.rating - 1000) * factor) + (p.id * 7) % 13,
          wins: args.scope === "global" ? p.wins : Math.max(0, Math.round(p.wins * factor)),
          games: p.games,
          delta: ((p.id * 31 + (args.scope === "weekly" ? 3 : 9)) % 7) - 3,
          isUser: false,
        }));
      entries.push({
        name: prof.username, initials: prof.username.slice(0, 2).toUpperCase(), color: "#2EE89A",
        level: lv.level,
        rating: args.scope === "global" ? userRating : 1000 + Math.round((userRating - 1000) * factor),
        wins: args.scope === "global" ? wins : Math.max(0, Math.round(wins * factor)),
        games, delta: 0, isUser: true,
      });
      entries.sort((a, b) => b.rating - a.rating);
      const rows = entries.map((e, i) => ({ rank: i + 1, ...e }));
      const userRow = rows.find((r) => r.isUser);
      return { rows, userRank: userRow?.rank ?? rows.length };
    },
  }),

  listStore: defineAction({
    description: "Lists store items, ownership, coins and purchase history.",
    request: z.object({}),
    response: z.object({
      coins: z.number(), premium: z.boolean(),
      items: z.array(z.object({ id: z.number(), name: z.string(), kind: z.string(), description: z.string(), price: z.number(), icon: z.string(), owned: z.boolean() })),
      purchases: z.array(z.object({ id: z.number(), itemName: z.string(), price: z.number(), createdAt: z.string() })),
    }),
    async handler(ctx) {
      await ensureSeed(ctx);
      const db = ctx.db<typeof schema>();
      const prof = await getProfileRow(db);
      const items = await db.select().from(schema.storeItems).orderBy(asc(schema.storeItems.id));
      const purchases = await db.select().from(schema.purchases).orderBy(desc(schema.purchases.id)).limit(20);
      return {
        coins: prof.coins, premium: prof.premium === 1,
        items: items.map((i) => ({ id: i.id, name: i.name, kind: i.kind, description: i.description, price: i.price, icon: i.icon, owned: i.owned === 1 })),
        purchases: purchases.map((p) => ({ id: p.id, itemName: p.itemName, price: p.price, createdAt: p.createdAt.toISOString() })),
      };
    },
  }),

  buyItem: defineAction({
    description: "Buys a store item with coins, applying its effect (premium, XP boost, coin chest).",
    request: z.object({ itemId: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true), coins: z.number(), message: z.string() }),
    async handler(ctx, args): Promise<{ ok: true; coins: number; message: string }> {
      await ensureSeed(ctx);
      const db = ctx.db<typeof schema>();
      const item = (await db.select().from(schema.storeItems).where(eq(schema.storeItems.id, args.itemId)))[0];
      if (!item) throw new Error("Item not found.");
      if (item.owned === 1 && item.kind !== "reward") throw new Error("You already own this item.");
      const prof = await getProfileRow(db);
      if (prof.coins < item.price) throw new Error(`Not enough coins — this costs ${item.price} and you have ${prof.coins}. Win matches to earn coins.`);
      let coins = prof.coins - item.price;
      let xp = prof.xp;
      let message = `${item.name} is yours.`;
      if (item.name.includes("Coin Chest")) { coins += 1000; message = "Coin chest opened: +1,000 coins."; }
      if (item.name.includes("XP Boost")) { xp += 200; message = "XP Boost applied: +200 XP banked."; }
      await db.update(schema.profile).set({
        coins, xp,
        premium: item.kind === "premium" ? 1 : prof.premium,
      }).where(eq(schema.profile.id, 1));
      if (item.kind !== "reward") {
        await db.update(schema.storeItems).set({ owned: 1 }).where(eq(schema.storeItems.id, item.id));
      }
      await db.insert(schema.purchases).values({ itemId: item.id, itemName: item.name, price: item.price });
      await notify(db, "Purchase complete", message, "store");
      ctx.invalidateQueries();
      return { ok: true, coins, message };
    },
  }),

  equipItem: defineAction({
    description: "Equips an owned avatar frame or theme.",
    request: z.object({ itemId: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      const item = (await db.select().from(schema.storeItems).where(eq(schema.storeItems.id, args.itemId)))[0];
      if (!item) throw new Error("Item not found.");
      if (item.owned !== 1) throw new Error("You don't own this item yet.");
      if (item.kind === "avatar_frame") {
        await db.update(schema.profile).set({ equippedFrame: item.name }).where(eq(schema.profile.id, 1));
      } else if (item.kind === "theme") {
        await db.update(schema.profile).set({ equippedTheme: item.name }).where(eq(schema.profile.id, 1));
      } else {
        throw new Error("This item can't be equipped.");
      }
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  getSettings: defineAction({
    description: "Returns the user's account, privacy, notification, audio and security settings plus profile extras.",
    request: z.object({}),
    response: z.object({
      settings: z.object({
        displayName: z.string(), bio: z.string(),
        profilePublic: z.boolean(), showOnline: z.boolean(), friendRequestsOpen: z.boolean(),
        notifyMatches: z.boolean(), notifyTournaments: z.boolean(), notifyFriends: z.boolean(),
        soundEffects: z.boolean(), music: z.boolean(), accent: z.string(), twoFactor: z.boolean(),
      }),
      equippedFrame: z.string(), equippedTheme: z.string(), premium: z.boolean(),
    }),
    async handler(ctx) {
      await ensureSeed(ctx);
      const db = ctx.db<typeof schema>();
      const s = (await db.select().from(schema.settings).limit(1))[0];
      const prof = await getProfileRow(db);
      if (!s) throw new Error("Settings not initialized.");
      return {
        settings: {
          displayName: s.displayName, bio: s.bio,
          profilePublic: s.profilePublic === 1, showOnline: s.showOnline === 1, friendRequestsOpen: s.friendRequestsOpen === 1,
          notifyMatches: s.notifyMatches === 1, notifyTournaments: s.notifyTournaments === 1, notifyFriends: s.notifyFriends === 1,
          soundEffects: s.soundEffects === 1, music: s.music === 1, accent: s.accent, twoFactor: s.twoFactor === 1,
        },
        equippedFrame: prof.equippedFrame, equippedTheme: prof.equippedTheme, premium: prof.premium === 1,
      };
    },
  }),

  updateSettings: defineAction({
    description: "Updates any subset of the user's settings and profile display name.",
    request: z.object({
      displayName: z.string().trim().min(2).max(24).optional(),
      bio: z.string().trim().max(160).optional(),
      profilePublic: z.boolean().optional(),
      showOnline: z.boolean().optional(),
      friendRequestsOpen: z.boolean().optional(),
      notifyMatches: z.boolean().optional(),
      notifyTournaments: z.boolean().optional(),
      notifyFriends: z.boolean().optional(),
      soundEffects: z.boolean().optional(),
      music: z.boolean().optional(),
      accent: z.enum(["emerald", "cyan", "purple"]).optional(),
      twoFactor: z.boolean().optional(),
    }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      await ensureSeed(ctx);
      const db = ctx.db<typeof schema>();
      const patch: Partial<typeof schema.settings.$inferInsert> = {};
      if (args.displayName !== undefined) patch.displayName = args.displayName;
      if (args.bio !== undefined) patch.bio = args.bio;
      if (args.profilePublic !== undefined) patch.profilePublic = args.profilePublic ? 1 : 0;
      if (args.showOnline !== undefined) patch.showOnline = args.showOnline ? 1 : 0;
      if (args.friendRequestsOpen !== undefined) patch.friendRequestsOpen = args.friendRequestsOpen ? 1 : 0;
      if (args.notifyMatches !== undefined) patch.notifyMatches = args.notifyMatches ? 1 : 0;
      if (args.notifyTournaments !== undefined) patch.notifyTournaments = args.notifyTournaments ? 1 : 0;
      if (args.notifyFriends !== undefined) patch.notifyFriends = args.notifyFriends ? 1 : 0;
      if (args.soundEffects !== undefined) patch.soundEffects = args.soundEffects ? 1 : 0;
      if (args.music !== undefined) patch.music = args.music ? 1 : 0;
      if (args.accent !== undefined) patch.accent = args.accent;
      if (args.twoFactor !== undefined) patch.twoFactor = args.twoFactor ? 1 : 0;
      if (Object.keys(patch).length) {
        await db.update(schema.settings).set(patch).where(eq(schema.settings.id, 1));
      }
      if (args.displayName !== undefined) {
        await db.update(schema.profile).set({ username: args.displayName }).where(eq(schema.profile.id, 1));
      }
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),
} satisfies ActionsModule;
