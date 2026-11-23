CREATE TABLE profile (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL DEFAULT 'ProGamer',
  xp INTEGER NOT NULL DEFAULT 0,
  coins INTEGER NOT NULL DEFAULT 500,
  premium INTEGER NOT NULL DEFAULT 0,
  rating REAL NOT NULL DEFAULT 4.8,
  equipped_frame TEXT NOT NULL DEFAULT '',
  equipped_theme TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  color TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  rating INTEGER NOT NULL DEFAULT 1000,
  wins INTEGER NOT NULL DEFAULT 0,
  games INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'offline',
  is_friend INTEGER NOT NULL DEFAULT 0,
  seeded INTEGER NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE friend_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL,
  direction TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  game_id TEXT NOT NULL,
  host_name TEXT NOT NULL DEFAULT 'ProGamer',
  current_players INTEGER NOT NULL DEFAULT 1,
  max_players INTEGER NOT NULL DEFAULT 2,
  status TEXT NOT NULL DEFAULT 'open',
  joined INTEGER NOT NULL DEFAULT 0,
  seeded INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id TEXT NOT NULL,
  opponent TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'ai',
  room_id INTEGER,
  state TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  result TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  finished_at INTEGER
);
--> statement-breakpoint
CREATE TABLE tournaments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  game_id TEXT NOT NULL,
  status TEXT NOT NULL,
  prize TEXT NOT NULL,
  entry_fee INTEGER NOT NULL DEFAULT 0,
  slots INTEGER NOT NULL DEFAULT 16,
  registered_count INTEGER NOT NULL DEFAULT 0,
  starts_label TEXT NOT NULL,
  registered INTEGER NOT NULL DEFAULT 0,
  winner TEXT,
  seeded INTEGER NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE store_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  description TEXT NOT NULL,
  price INTEGER NOT NULL,
  icon TEXT NOT NULL,
  owned INTEGER NOT NULL DEFAULT 0,
  seeded INTEGER NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  price INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'system',
  read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE settings (
  id INTEGER PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT 'ProGamer',
  bio TEXT NOT NULL DEFAULT '',
  profile_public INTEGER NOT NULL DEFAULT 1,
  show_online INTEGER NOT NULL DEFAULT 1,
  friend_requests_open INTEGER NOT NULL DEFAULT 1,
  notify_matches INTEGER NOT NULL DEFAULT 1,
  notify_tournaments INTEGER NOT NULL DEFAULT 1,
  notify_friends INTEGER NOT NULL DEFAULT 1,
  sound_effects INTEGER NOT NULL DEFAULT 1,
  music INTEGER NOT NULL DEFAULT 0,
  accent TEXT NOT NULL DEFAULT 'emerald',
  two_factor INTEGER NOT NULL DEFAULT 0
);
