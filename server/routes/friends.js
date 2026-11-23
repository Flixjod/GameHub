import { Router } from 'express'
import { db, notify, levelProgress } from '../db.js'
import { requireAuth } from '../lib/auth.js'
import { evaluateAchievements } from '../lib/achievements.js'
import { isOnline } from '../lib/presence.js'
import { io } from '../realtime.js'

export const friendsRouter = Router()

function friendCard(u, online) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.display_name,
    avatar: u.avatar,
    avatarColor: u.avatar_color,
    isVerified: !!u.is_verified,
    isPremium: !!u.is_premium,
    rating: u.rating,
    level: levelProgress(u.xp).level,
    lastSeen: u.last_seen,
    online,
  }
}

friendsRouter.get('/', requireAuth, (req, res) => {
  const friends = db.prepare(`SELECT u.* FROM friendships f
    JOIN users u ON u.id = (CASE WHEN f.a_id = ? THEN f.b_id ELSE f.a_id END)
    WHERE f.a_id = ? OR f.b_id = ?`).all(req.user.id, req.user.id, req.user.id)
  const requests = db.prepare(`SELECT fr.id AS request_id, fr.created_at AS requested_at, u.id AS uid, u.username, u.display_name, u.avatar, u.avatar_color, u.is_verified, u.rating FROM friend_requests fr JOIN users u ON u.id = fr.from_id WHERE fr.to_id = ?`).all(req.user.id)
  const sent = db.prepare(`SELECT fr.id, u.username FROM friend_requests fr JOIN users u ON u.id = fr.to_id WHERE fr.from_id = ?`).all(req.user.id)
  res.json({
    friends: friends.map((u) => friendCard(u, isOnline(u.id))).sort((a) => (a.online ? -1 : 1)),
    requests: requests.map((u) => ({ id: u.request_id, username: u.username, displayName: u.display_name, avatar: u.avatar, avatarColor: u.avatar_color, isVerified: !!u.is_verified, rating: u.rating, createdAt: u.requested_at })),
    sent: sent.map((s) => ({ id: s.id, username: s.username })),
  })
})

friendsRouter.post('/requests', requireAuth, (req, res) => {
  const { username } = req.body || {}
  const target = db.prepare(`SELECT * FROM users WHERE username = ?`).get(String(username || '').toLowerCase())
  if (!target) return res.status(404).json({ error: 'Player not found.' })
  if (target.id === req.user.id) return res.status(400).json({ error: "You can't add yourself." })
  const friend = db.prepare(`SELECT 1 FROM friendships WHERE (a_id = ? AND b_id = ?) OR (a_id = ? AND b_id = ?)`).get(req.user.id, target.id, target.id, req.user.id)
  if (friend) return res.status(409).json({ error: 'You are already friends.' })
  const existing = db.prepare(`SELECT * FROM friend_requests WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)`).get(req.user.id, target.id, target.id, req.user.id)
  if (existing) {
    if (existing.from_id === target.id) {
      acceptRequest(existing, req.user, target)
      return res.json({ ok: true, accepted: true, message: `You and ${target.display_name} are now friends!` })
    }
    return res.status(409).json({ error: 'Request already sent.' })
  }
  db.prepare(`INSERT INTO friend_requests (from_id, to_id) VALUES (?,?)`).run(req.user.id, target.id)
  notify(target.id, 'friend_request', `${req.user.display_name} sent you a friend request`, 'Open Friends to accept or decline.', '/friends')
  io.to(`user:${target.id}`).emit('notify', { type: 'friend_request', title: `${req.user.display_name} sent you a friend request` })
  res.json({ ok: true, message: `Request sent to ${target.display_name}.` })
})

function acceptRequest(fr, me, other) {
  db.prepare(`DELETE FROM friend_requests WHERE id = ? OR (from_id = ? AND to_id = ?)`).run(fr.id, other.id, me.id)
  db.prepare(`INSERT OR IGNORE INTO friendships (a_id, b_id) VALUES (?,?)`).run(Math.min(me.id, other.id), Math.max(me.id, other.id))
  notify(other.id, 'friend', `${me.display_name} accepted your friend request`, 'Your friend is now online-ready.', '/friends')
  io.to(`user:${other.id}`).emit('notify', { type: 'friend', title: `${me.display_name} accepted your friend request` })
  evaluateAchievements(me.id, {})
  evaluateAchievements(other.id, {})
}

friendsRouter.post('/requests/:id/accept', requireAuth, (req, res) => {
  const fr = db.prepare(`SELECT * FROM friend_requests WHERE id = ? AND to_id = ?`).get(Number(req.params.id), req.user.id)
  if (!fr) return res.status(404).json({ error: 'Request not found.' })
  const other = db.prepare(`SELECT * FROM users WHERE id = ?`).get(fr.from_id)
  acceptRequest(fr, req.user, other)
  res.json({ ok: true, message: `${other.display_name} added to your friends.` })
})

friendsRouter.post('/requests/:id/decline', requireAuth, (req, res) => {
  const fr = db.prepare(`DELETE FROM friend_requests WHERE id = ? AND to_id = ?`).run(Number(req.params.id), req.user.id)
  if (!fr.changes) return res.status(404).json({ error: 'Request not found.' })
  res.json({ ok: true })
})

friendsRouter.delete('/:username', requireAuth, (req, res) => {
  const other = db.prepare(`SELECT id FROM users WHERE username = ?`).get(String(req.params.username).toLowerCase())
  if (!other) return res.status(404).json({ error: 'Player not found.' })
  const r = db.prepare(`DELETE FROM friendships WHERE (a_id = ? AND b_id = ?) OR (a_id = ? AND b_id = ?)`).run(req.user.id, other.id, other.id, req.user.id)
  if (!r.changes) return res.status(400).json({ error: 'Not friends.' })
  res.json({ ok: true })
})
