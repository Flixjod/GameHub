import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, '..', 'data')
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

export const db = new Database(path.join(dataDir, 'gamehub.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  avatar_color INTEGER DEFAULT 0,
  is_verified INTEGER DEFAULT 0,
  is_premium INTEGER DEFAULT 0,
  gems INTEGER DEFAULT 2500,
  xp INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  rating INTEGER DEFAULT 1000,
  streak INTEGER DEFAULT 0,
  ttt_wins INTEGER DEFAULT 0,
  reversi_wins INTEGER DEFAULT 0,
  ludo_wins INTEGER DEFAULT 0,
  snakes_wins INTEGER DEFAULT 0,
  tournaments_joined INTEGER DEFAULT 0,
  settings TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  last_seen TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS friendships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  a_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  b_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(a_id, b_id)
);
CREATE TABLE IF NOT EXISTS friend_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(from_id, to_id)
);
CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game TEXT NOT NULL,
  mode TEXT DEFAULT 'online',
  player_count INTEGER DEFAULT 2,
  started_at TEXT DEFAULT (datetime('now')),
  ended_at TEXT
);
CREATE TABLE IF NOT EXISTS match_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  result TEXT NOT NULL,
  rating_delta INTEGER DEFAULT 0,
  xp_delta INTEGER DEFAULT 0,
  rating_after INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS tournaments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  game TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'upcoming',
  max_players INTEGER DEFAULT 16,
  prize TEXT DEFAULT '',
  starts_at TEXT,
  seeds TEXT DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS tournament_registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rank INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(tournament_id, user_id)
);
CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  emoji TEXT DEFAULT '🏆',
  metric TEXT NOT NULL,
  threshold INTEGER NOT NULL,
  accent TEXT DEFAULT 'emerald'
);
CREATE TABLE IF NOT EXISTS user_achievements (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, achievement_id)
);
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  link TEXT DEFAULT '',
  read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS store_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  description TEXT DEFAULT '',
  price INTEGER NOT NULL,
  value TEXT DEFAULT '',
  accent TEXT DEFAULT 'emerald'
);
CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES store_items(id),
  price INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  game TEXT NOT NULL,
  max_players INTEGER DEFAULT 4,
  is_private INTEGER DEFAULT 0,
  has_bot INTEGER DEFAULT 0,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS room_players (
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ready INTEGER DEFAULT 0,
  joined_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (room_id, user_id)
);
`)

// ---------------- helpers ----------------
export function levelFromXp(xp) {
  return 1 + Math.floor(xp / 750)
}
export function xpForLevel(level) {
  return (level - 1) * 750
}
export function levelProgress(xp) {
  const inLevel = xp % 750
  return { level: levelFromXp(xp), current: inLevel, needed: 750, pct: Math.round((inLevel / 750) * 100) }
}

export function ratingDelta(mine, theirs, result) {
  const expected = 1 / (1 + 10 ** ((theirs - mine) / 400))
  const K = 24
  return Math.round(K * (result - expected))
}

export function notify(userId, type, title, body, link = '') {
  db.prepare(`INSERT INTO notifications (user_id, type, title, body, link) VALUES (?,?,?,?,?)`)
    .run(userId, type, title, body, link)
}
