import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { db, levelProgress } from '../db.js'
import { signToken, requireAuth } from '../lib/auth.js'
import { evaluateAchievements } from '../lib/achievements.js'

export const authRouter = Router()

const AVATAR_COLORS = 10

export function publicUser(u) {
  const lvl = levelProgress(u.xp)
  const friends = db.prepare(`SELECT COUNT(*) c FROM friendships WHERE a_id = ? OR b_id = ?`).get(u.id, u.id)
  const ownership = db.prepare(`SELECT s.value, s.kind FROM purchases p JOIN store_items s ON s.id = p.item_id WHERE p.user_id = ?`).all(u.id)
  return {
    id: u.id,
    username: u.username,
    displayName: u.display_name,
    bio: u.bio,
    avatar: u.avatar,
    avatarColor: u.avatar_color,
    isVerified: !!u.is_verified,
    isPremium: !!u.is_premium,
    gems: u.gems,
    xp: u.xp,
    level: lvl.level,
    levelProgress: lvl,
    wins: u.wins,
    losses: u.losses,
    draws: u.draws,
    gamesPlayed: u.games_played,
    rating: u.rating,
    streak: u.streak,
    friends: friends.c,
    tournamentsJoined: u.tournaments_joined,
    settings: safeJson(u.settings),
    ownedThemes: ownership.filter((o) => o.kind === 'theme').map((o) => o.value),
    ownedAvatars: ownership.filter((o) => o.kind === 'avatar').map((o) => o.value),
    createdAt: u.created_at,
    lastSeen: u.last_seen,
  }
}

function safeJson(s) {
  try { return JSON.parse(s || '{}') } catch { return {} }
}

authRouter.post('/register', (req, res) => {
  const { username, password, displayName } = req.body || {}
  if (!username || typeof username !== 'string' || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ error: 'Username must be 3–20 characters (letters, numbers, underscore).' })
  }
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' })
  const existing = db.prepare(`SELECT id FROM users WHERE username = ?`).get(username.toLowerCase())
  if (existing) return res.status(409).json({ error: 'That username is already taken.' })
  const hash = bcrypt.hashSync(password, 10)
  const r = db.prepare(`INSERT INTO users (username, password_hash, display_name, avatar_color) VALUES (?,?,?,?)`)
    .run(username.toLowerCase(), hash, (displayName || username).slice(0, 24), Math.floor(Math.random() * AVATAR_COLORS))
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(r.lastInsertRowid)
  evaluateAchievements(user.id, {})
  res.json({ token: signToken(user), user: publicUser(user) })
})

authRouter.post('/login', (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' })
  const user = db.prepare(`SELECT * FROM users WHERE username = ?`).get(String(username).toLowerCase())
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Incorrect username or password.' })
  }
  db.prepare(`UPDATE users SET last_seen = datetime('now') WHERE id = ?`).run(user.id)
  res.json({ token: signToken(user), user: publicUser(user) })
})

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) })
})

authRouter.patch('/me', requireAuth, (req, res) => {
  const { displayName, bio, avatar, avatarColor, settings } = req.body || {}
  const u = req.user
  if (displayName != null) {
    const name = String(displayName).trim()
    if (name.length < 2 || name.length > 24) return res.status(400).json({ error: 'Display name must be 2–24 characters.' })
    db.prepare(`UPDATE users SET display_name = ? WHERE id = ?`).run(name, u.id)
  }
  if (bio != null) db.prepare(`UPDATE users SET bio = ? WHERE id = ?`).run(String(bio).slice(0, 280), u.id)
  if (avatar != null) db.prepare(`UPDATE users SET avatar = ? WHERE id = ?`).run(String(avatar).slice(0, 8), u.id)
  if (avatarColor != null) db.prepare(`UPDATE users SET avatar_color = ? WHERE id = ?`).run(Math.max(0, Math.min(9, Number(avatarColor) | 0)), u.id)
  if (settings != null) {
    const clean = {}
    const cur = safeJson(u.settings)
    Object.assign(clean, cur, settings)
    db.prepare(`UPDATE users SET settings = ? WHERE id = ?`).run(JSON.stringify(clean), u.id)
  }
  const updated = db.prepare(`SELECT * FROM users WHERE id = ?`).get(u.id)
  res.json({ user: publicUser(updated) })
})
