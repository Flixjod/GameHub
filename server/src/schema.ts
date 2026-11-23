import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const entries = sqliteTable("entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  text: text("text").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const profile = sqliteTable("profile", {
  id: integer("id").primaryKey(),
  username: text("username").notNull().default("ProGamer"),
  xp: integer("xp").notNull().default(0),
  coins: integer("coins").notNull().default(500),
  premium: integer("premium").notNull().default(0),
  rating: integer("rating").notNull().default(1000),
  equippedFrame: text("equipped_frame").notNull().default(""),
  equippedTheme: text("equipped_theme").notNull().default(""),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const players = sqliteTable("players", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  color: text("color").notNull(),
  level: integer("level").notNull().default(1),
  rating: integer("rating").notNull().default(1000),
  wins: integer("wins").notNull().default(0),
  games: integer("games").notNull().default(0),
  status: text("status", { enum: ["online", "ingame", "offline"] })
    .notNull()
    .default("offline"),
  isFriend: integer("is_friend").notNull().default(0),
  seeded: integer("seeded").notNull().default(1),
});

export const friendRequests = sqliteTable("friend_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  playerId: integer("player_id").notNull(),
  direction: text("direction", { enum: ["incoming", "outgoing"] }).notNull(),
  status: text("status", { enum: ["pending", "accepted", "rejected"] })
    .notNull()
    .default("pending"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const rooms = sqliteTable("rooms", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  gameId: text("game_id").notNull(),
  hostName: text("host_name").notNull().default("ProGamer"),
  currentPlayers: integer("current_players").notNull().default(1),
  maxPlayers: integer("max_players").notNull().default(2),
  status: text("status", { enum: ["open", "full", "playing"] })
    .notNull()
    .default("open"),
  joined: integer("joined").notNull().default(0),
  seeded: integer("seeded").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const matches = sqliteTable("matches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gameId: text("game_id").notNull(),
  opponent: text("opponent").notNull(),
  mode: text("mode", { enum: ["ai", "room"] }).notNull().default("ai"),
  roomId: integer("room_id"),
  state: text("state").notNull(),
  status: text("status", { enum: ["active", "finished", "abandoned"] })
    .notNull()
    .default("active"),
  result: text("result", { enum: ["win", "loss", "draw"] }),
  version: integer("version").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
});

export const tournaments = sqliteTable("tournaments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  gameId: text("game_id").notNull(),
  status: text("status", { enum: ["upcoming", "live", "completed"] }).notNull(),
  prize: text("prize").notNull(),
  entryFee: integer("entry_fee").notNull().default(0),
  slots: integer("slots").notNull().default(16),
  registeredCount: integer("registered_count").notNull().default(0),
  startsLabel: text("starts_label").notNull(),
  registered: integer("registered").notNull().default(0),
  winner: text("winner"),
  seeded: integer("seeded").notNull().default(1),
});

export const storeItems = sqliteTable("store_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  kind: text("kind", {
    enum: ["premium", "avatar_frame", "theme", "cosmetic", "reward"],
  }).notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  icon: text("icon").notNull(),
  owned: integer("owned").notNull().default(0),
  seeded: integer("seeded").notNull().default(1),
});

export const purchases = sqliteTable("purchases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id").notNull(),
  itemName: text("item_name").notNull(),
  price: integer("price").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  kind: text("kind").notNull().default("system"),
  read: integer("read").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  displayName: text("display_name").notNull().default("ProGamer"),
  bio: text("bio").notNull().default(""),
  profilePublic: integer("profile_public").notNull().default(1),
  showOnline: integer("show_online").notNull().default(1),
  friendRequestsOpen: integer("friend_requests_open").notNull().default(1),
  notifyMatches: integer("notify_matches").notNull().default(1),
  notifyTournaments: integer("notify_tournaments").notNull().default(1),
  notifyFriends: integer("notify_friends").notNull().default(1),
  soundEffects: integer("sound_effects").notNull().default(1),
  music: integer("music").notNull().default(0),
  accent: text("accent").notNull().default("emerald"),
  twoFactor: integer("two_factor").notNull().default(0),
});
