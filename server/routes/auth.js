import { Router } from 'express'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { db, levelProgress, notify } from '../db.js'
import { signToken, requireAuth } from '../lib/auth.js'
import { evaluateAchievements } from '../lib/achievements.js'

export const authRouter = Router()

const AVATAR_COLORS = 10
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
    email: u.email || '',
    emailVerified: !!u.email_verified,
    isGuest: !!u.is_guest,
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
  const { username, password, displayName, email } = req.body || {}
  if (!username || typeof username !== 'string' || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ error: 'Username must be 3–20 characters (letters, numbers, underscore).' })
  }
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' })
  if (email != null && email !== '' && !EMAIL_RE.test(String(email))) {
    return res.status(400).json({ error: 'That email address doesn’t look valid.' })
  }
  const existing = db.prepare(`SELECT id FROM users WHERE username = ?`).get(username.toLowerCase())
  if (existing) return res.status(409).json({ error: 'That username is already taken.' })
  if (email) {
    const usedEmail = db.prepare(`SELECT id FROM users WHERE email = ?`).get(String(email).toLowerCase())
    if (usedEmail) return res.status(409).json({ error: 'That email is already registered.' })
  }
  const hash = bcrypt.hashSync(password, 10)
  const r = db.prepare(`INSERT INTO users (username, password_hash, display_name, avatar_color, email, verification_token) VALUES (?,?,?,?,?,?)`)
    .run(username.toLowerCase(), hash, (displayName || username).slice(0, 24), Math.floor(Math.random() * AVATAR_COLORS),
      email ? String(email).toLowerCase() : '', email ? crypto.randomBytes(24).toString('hex') : null)
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
  const { displayName, bio, avatar, avatarColor, settings, email, username, currentPassword, password } = req.body || {}
  const u = req.user
  if (password != null) {
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' })
    if (!u.is_guest) {
      if (!currentPassword || !bcrypt.compareSync(currentPassword, u.password_hash)) {
        return res.status(403).json({ error: 'Current password is incorrect.' })
      }
    }
    db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(bcrypt.hashSync(password, 10), u.id)
    if (u.is_guest) db.prepare(`UPDATE users SET is_guest = 0 WHERE id = ?`).run(u.id)
  }
  if (username != null && u.is_guest) {
    const name = String(username).toLowerCase()
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) return res.status(400).json({ error: 'Username must be 3–20 characters (letters, numbers, underscore).' })
    if (db.prepare(`SELECT id FROM users WHERE username = ? AND id != ?`).get(name, u.id)) {
      return res.status(409).json({ error: 'That username is already taken.' })
    }
    db.prepare(`UPDATE users SET username = ? WHERE id = ?`).run(name, u.id)
  }
  if (email != null) {
    const mail = String(email).trim().toLowerCase()
    if (mail && !EMAIL_RE.test(mail)) return res.status(400).json({ error: 'That email address doesn’t look valid.' })
    if (mail && db.prepare(`SELECT id FROM users WHERE email = ? AND id != ?`).get(mail, u.id)) {
      return res.status(409).json({ error: 'That email is already registered.' })
    }
    db.prepare(`UPDATE users SET email = ?, email_verified = 0, verification_token = ? WHERE id = ?`)
      .run(mail, mail ? crypto.randomBytes(24).toString('hex') : null, u.id)
  }
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


// ---------------- guest accounts ----------------
authRouter.post('/guest', (req, res) => {
  const suffix = crypto.randomBytes(3).toString('hex')
  const r = db.prepare(`INSERT INTO users (username, password_hash, display_name, avatar_color, is_guest) VALUES (?,?,?,?,1)`)
    .run(`guest_${suffix}`, bcrypt.hashSync(crypto.randomBytes(24).toString('hex'), 10), 'Guest', Math.floor(Math.random() * AVATAR_COLORS))
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(r.lastInsertRowid)
  res.json({ token: signToken(user), user: publicUser(user) })
})

// ---------------- email verification ----------------
authRouter.post('/verify/resend', requireAuth, (req, res) => {
  const u = req.user
  if (u.email_verified) return res.status(400).json({ error: 'Email is already verified.' })
  if (!u.email) return res.status(400).json({ error: 'Add an email address in Settings first.' })
  const token = crypto.randomBytes(24).toString('hex')
  db.prepare(`UPDATE users SET verification_token = ? WHERE id = ?`).run(token, u.id)
  notify(u.id, 'verify', 'Verify your email', `Confirmation code: ${token.slice(0, 8)}… (full token returned by the app — no SMTP configured)`, '/settings')
  res.json({ ok: true, email: u.email, token })
})

authRouter.post('/verify', (req, res) => {
  const { token } = req.body || {}
  const u = token && db.prepare(`SELECT id FROM users WHERE verification_token = ?`).get(String(token))
  if (!u) return res.status(400).json({ error: 'This verification link is invalid or already used.' })
  db.prepare(`UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = ?`).run(u.id)
  res.json({ ok: true })
})

// ---------------- password reset ----------------
authRouter.post('/forgot', (req, res) => {
  const { username } = req.body || {}
  const u = username && db.prepare(`SELECT * FROM users WHERE username = ?`).get(String(username).toLowerCase())
  if (!u || u.is_guest) return res.json({ ok: true })
  const token = crypto.randomBytes(24).toString('hex')
  const expires = new Date(Date.now() + 15 * 60000).toISOString()
  db.prepare(`UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?`).run(token, expires, u.id)
  notify(u.id, 'security', 'Password reset requested', `Someone asked to reset your password. Code prefix: ${token.slice(0, 8)}…`, '/settings')
  res.json({ ok: true, resetToken: token, expiresInMinutes: 15 })
})

authRouter.post('/reset', (req, res) => {
  const { token, password } = req.body || {}
  if (!token) return res.status(400).json({ error: 'Reset token is required.' })
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' })
  const u = db.prepare(`SELECT * FROM users WHERE reset_token = ?`).get(String(token))
  if (!u || !u.reset_expires || new Date(u.reset_expires).getTime() < Date.now()) {
    return res.status(400).json({ error: 'This reset link is invalid or has expired.' })
  }
  const hash = bcrypt.hashSync(password, 10)
  db.prepare(`UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?`).run(hash, u.id)
  res.json({ ok: true })
})

// ---------------- account deletion ----------------
authRouter.delete('/me', requireAuth, (req, res) => {
  const u = req.user
  if (!u.is_guest) {
    const { password } = req.body || {}
    if (!password || !bcrypt.compareSync(password, u.password_hash)) {
      return res.status(403).json({ error: 'Confirm your password to delete this account.' })
    }
  }
  const uid = u.id
  db.prepare(`DELETE FROM friendships WHERE a_id = ? OR b_id = ?`).run(uid, uid)
  db.prepare(`DELETE FROM friend_requests WHERE from_id = ? OR to_id = ?`).run(uid, uid)
  db.prepare(`DELETE FROM purchases WHERE user_id = ?`).run(uid)
  db.prepare(`DELETE FROM notifications WHERE user_id = ?`).run(uid)
  db.prepare(`DELETE FROM tournament_registrations WHERE user_id = ?`).run(uid)
  db.prepare(`DELETE FROM match_results WHERE user_id = ?`).run(uid)
  db.prepare(`DELETE FROM users WHERE id = ?`).run(uid)
  res.json({ ok: true })
})
