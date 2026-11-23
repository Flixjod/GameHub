import { Router } from 'express'
import { db, ratingDelta, levelProgress } from '../db.js'
import { requireAuth } from '../lib/auth.js'
import { publicUser } from './auth.js'
import { GAME_LIST, GAMES } from '../lib/games.js'
import { publicRooms } from '../lib/roomregistry.js'
import { achievementsForUser, evaluateAchievements } from '../lib/achievements.js'
import { verifyToken } from '../lib/auth.js'
import { isOnline } from '../lib/presence.js'

export const dataRouter = Router()

// ---------- games library ----------
dataRouter.get('/games', (req, res) => {
  const rows = db.prepare(`SELECT game, COUNT(*) c FROM rooms WHERE NOT is_private GROUP BY game`).all()
  const openRooms = Object.fromEntries(rows.map((r) => [r.game, r.c]))
  const counts = db.prepare(`SELECT game, COUNT(*) c FROM matches WHERE started_at > datetime('now','-24 hours') GROUP BY game`).all()
  const recentMatches = Object.fromEntries(counts.map((r) => [r.game, r.c]))
  res.json({
    games: GAME_LIST.map((g) => ({ ...g, openRooms: openRooms[g.id] || 0, recentMatches: recentMatches[g.id] || 0 })),
  })
})

// ---------- rooms (live list from the runtime registry) ----------
dataRouter.get('/rooms', requireAuth, (req, res) => {
  res.json({ rooms: publicRooms() })
})

// ---------- users / profiles ----------
dataRouter.get('/users/search', requireAuth, (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase()
  if (q.length < 1) return res.json({ users: [] })
  const rows = db.prepare(`SELECT * FROM users WHERE username LIKE ? OR display_name LIKE ? LIMIT 12`).all(`%${q}%`, `%${q}%`)
  res.json({ users: rows.map((u) => ({ id: u.id, username: u.username, displayName: u.display_name, avatar: u.avatar, avatarColor: u.avatar_color, isVerified: !!u.is_verified, rating: u.rating, level: levelProgress(u.xp).level, online: isOnline(u.id) })) })
})

dataRouter.get('/users/:username', (req, res) => {
  const u = db.prepare(`SELECT * FROM users WHERE username = ?`).get(String(req.params.username).toLowerCase())
  if (!u) return res.status(404).json({ error: 'Player not found.' })
  res.json({ user: publicUser(u), online: isOnline(u.id) })
})

// optional auth (viewer may be logged out)
function softAuth(req, _res, next) {
  const header = req.headers.authorization || ''
  if (header.startsWith('Bearer ')) {
    const user = verifyToken(header.slice(7))
    if (user) req.user = user
  }
  next()
}

dataRouter.get('/matches/history', requireAuth, (req, res) => {
  const target = req.query.username ? db.prepare(`SELECT id FROM users WHERE username = ?`).get(String(req.query.username).toLowerCase()) : null
  const userId = target ? target.id : req.user.id
  const rows = db.prepare(`SELECT m.id, m.game, m.mode, m.ranked, m.started_at, m.ended_at, mr.result, mr.rating_delta, mr.xp_delta, u.username, u.display_name, u.avatar, u.avatar_color
    FROM match_results mr JOIN matches m ON m.id = mr.match_id JOIN users u ON u.id = mr.user_id
    WHERE mr.user_id = ? ORDER BY m.ended_at DESC LIMIT 30`).all(userId)
  res.json({ matches: rows })
})

dataRouter.get('/matches/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id)
  const m = db.prepare(`SELECT * FROM matches WHERE id = ?`).get(id)
  if (!m) return res.status(404).json({ error: 'Match not found.' })
  const mine = db.prepare(`SELECT 1 FROM match_results WHERE match_id = ? AND user_id = ?`).get(id, req.user.id)
  if (!mine) return res.status(403).json({ error: 'You can only review matches you played.' })
  const seats = db.prepare(`SELECT mr.result, mr.rating_delta, mr.rating_after, u.id, u.username, u.display_name, u.avatar, u.avatar_color
    FROM match_results mr JOIN users u ON u.id = mr.user_id WHERE mr.match_id = ? ORDER BY mr.id`).all(id)
  res.json({ match: { id: m.id, game: m.game, mode: m.mode, ranked: !!m.ranked, durationMs: m.duration_ms, endedReason: m.ended_reason }, moves: safeParse(m.moves), seats })
})

function safeParse(s) {
  try { return JSON.parse(s || '[]') } catch { return [] }
}

// ---------- activity (last 7 days, real matches) ----------
dataRouter.get('/activity', requireAuth, (req, res) => {
  const target = req.query.username ? db.prepare(`SELECT id FROM users WHERE username = ?`).get(String(req.query.username).toLowerCase()) : null
  const userId = target ? target.id : req.user.id
  const rows = db.prepare(`SELECT date(m.ended_at, 'localtime') d, COUNT(*) total,
      SUM(CASE WHEN mr.result = 'win' THEN 1 ELSE 0 END) wins
    FROM match_results mr JOIN matches m ON m.id = mr.match_id
    WHERE mr.user_id = ? AND m.ended_at > datetime('now','-7 days')
    GROUP BY d ORDER BY d`).all(userId)
  const days = []
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(Date.now() - i * 86400000)
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
    const row = rows.find((r) => r.d === key)
    days.push({ date: key, label: dt.toLocaleDateString('en', { weekday: 'short' }), games: row ? row.total : 0, wins: row ? row.wins || 0 : 0 })
  }
  res.json({ days })
})

// ---------- leaderboard ----------
// period: all | daily | weekly | monthly | friends
dataRouter.get('/leaderboard', requireAuth, (req, res) => {
  const period = String(req.query.period || 'all')
  const since = periodSince(period)
  let base
  if (period === 'friends') {
    base = db.prepare(`SELECT u.* FROM users u WHERE u.id IN (SELECT b_id FROM friendships WHERE a_id = ? UNION SELECT a_id FROM friendships WHERE b_id = ? UNION SELECT ?)`)
      .all(req.user.id, req.user.id, req.user.id)
    if (base.length) return res.json({ players: decorate(base, 'rating') })
    base = [db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user.id)]
    return res.json({ players: decorate(base, 'rating'), empty: true })
  }
  if (since) {
    base = db.prepare(`SELECT u.*, SUM(CASE WHEN mr.result='win' THEN 1 ELSE 0 END) period_wins, COUNT(*) period_matches
      FROM users u JOIN match_results mr ON mr.user_id = u.id
      WHERE mr.created_at > datetime('now', ?) GROUP BY u.id HAVING period_matches > 0
      ORDER BY period_wins DESC, u.rating DESC LIMIT 50`).all(since)
    if (!base.length) base = []
    const all = db.prepare(`SELECT * FROM users ORDER BY rating DESC LIMIT 50`).all()
    return res.json({ players: decorate(base, 'rating'), fallback: decorate(all.slice(0, 20), 'rating'), period })
  }
  const rows = db.prepare(`SELECT * FROM users ORDER BY rating DESC LIMIT 50`).all()
  res.json({ players: decorate(rows, 'rating'), period })
})

function periodSince(period) {
  if (period === 'daily') return '-1 day'
  if (period === 'weekly') return '-7 days'
  if (period === 'monthly') return '-30 days'
  return null
}

function decorate(rows, sortKey) {
  const withPeriod = rows.some((r) => r.period_wins != null)
  const sorted = withPeriod ? rows : rows.slice().sort((a, b) => b.rating - a.rating)
  return sorted.map((u, i) => ({
    rank: i + 1,
    user: { id: u.id, username: u.username, displayName: u.display_name, avatar: u.avatar, avatarColor: u.avatar_color, isVerified: !!u.is_verified, isPremium: !!u.is_premium, rating: u.rating, wins: u.wins, losses: u.losses, level: levelProgress(u.xp).level, gamesPlayed: u.games_played },
    periodWins: u.period_wins ?? null,
    periodMatches: u.period_matches ?? null,
    online: isOnline(u.id),
  }))
}

// ---------- tournaments ----------
dataRouter.get('/tournaments', requireAuth, (req, res) => {
  const rows = db.prepare(`SELECT * FROM tournaments ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'upcoming' THEN 1 ELSE 2 END, starts_at`).all()
  const regs = db.prepare(`SELECT tr.*, u.username, u.display_name, u.avatar, u.avatar_color, u.is_verified, u.rating, u.id uid FROM tournament_registrations tr JOIN users u ON u.id = tr.user_id`).all()
  res.json({
    tournaments: rows.map((t) => {
      const mine = regs.filter((r) => r.tournament_id === t.id)
      return {
        ...t,
        startsAt: t.starts_at,
        registered: mine.length,
        joined: mine.some((r) => r.uid === req.user.id),
        standing: mine.find((r) => r.uid === req.user.id)?.rank ?? null,
        standings: mine.filter((r) => r.rank).sort((a, b) => a.rank - b.rank).map((r) => ({ username: r.username, displayName: r.display_name, avatar: r.avatar, avatarColor: r.avatar_color, rating: r.rating, rank: r.rank, verified: !!r.is_verified })),
        players: mine.map((r) => ({ username: r.username, displayName: r.display_name, avatar: r.avatar, avatarColor: r.avatar_color, rating: r.rating })),
      }
    }),
  })
})

dataRouter.post('/tournaments/:id/join', requireAuth, (req, res) => {
  const t = db.prepare(`SELECT * FROM tournaments WHERE id = ?`).get(Number(req.params.id))
  if (!t) return res.status(404).json({ error: 'Tournament not found.' })
  if (t.status === 'completed') return res.status(400).json({ error: 'This tournament has finished.' })
  const count = db.prepare(`SELECT COUNT(*) c FROM tournament_registrations WHERE tournament_id = ?`).get(t.id).c
  if (count >= t.max_players) return res.status(400).json({ error: 'Tournament is full.' })
  const exists = db.prepare(`SELECT 1 FROM tournament_registrations WHERE tournament_id = ? AND user_id = ?`).get(t.id, req.user.id)
  if (exists) return res.status(409).json({ error: 'You are already registered.' })
  db.prepare(`INSERT INTO tournament_registrations (tournament_id, user_id) VALUES (?,?)`).run(t.id, req.user.id)
  db.prepare(`UPDATE users SET tournaments_joined = tournaments_joined + 1 WHERE id = ?`).run(req.user.id)
  evaluateAchievements(req.user.id, {})
  res.json({ ok: true, registered: count + 1 })
})

dataRouter.delete('/tournaments/:id/join', requireAuth, (req, res) => {
  const r = db.prepare(`DELETE FROM tournament_registrations WHERE tournament_id = ? AND user_id = ?`).run(Number(req.params.id), req.user.id)
  if (!r.changes) return res.status(400).json({ error: 'You were not registered.' })
  db.prepare(`UPDATE users SET tournaments_joined = MAX(tournaments_joined - 1, 0) WHERE id = ?`).run(req.user.id)
  res.json({ ok: true })
})

// ---------- achievements ----------
dataRouter.get('/achievements', requireAuth, (req, res) => {
  res.json({ achievements: achievementsForUser(req.user.id) })
})

// ---------- store ----------
dataRouter.get('/store', requireAuth, (req, res) => {
  const items = db.prepare(`SELECT * FROM store_items ORDER BY kind, price`).all()
  const owned = db.prepare(`SELECT s.code FROM purchases p JOIN store_items s ON s.id = p.item_id WHERE p.user_id = ?`).all(req.user.id).map((r) => r.code)
  const history = db.prepare(`SELECT p.*, s.name, s.kind, s.value FROM purchases p JOIN store_items s ON s.id = p.item_id WHERE p.user_id = ? ORDER BY p.created_at DESC LIMIT 30`).all(req.user.id)
  res.json({ items, owned, history, gems: req.user.gems })
})

dataRouter.post('/store/checkout', requireAuth, (req, res) => {
  const { itemId } = req.body || {}
  const item = db.prepare(`SELECT * FROM store_items WHERE id = ?`).get(Number(itemId))
  if (!item) return res.status(404).json({ error: 'Item not found.' })
  const owned = db.prepare(`SELECT 1 FROM purchases WHERE user_id = ? AND item_id = ?`).get(req.user.id, item.id)
  if (owned) return res.status(409).json({ error: 'You already own this item.' })
  if (item.kind === 'membership' && req.user.is_premium) return res.status(409).json({ error: 'You are already a Premium member.' })
  if (req.user.gems < item.price) return res.status(400).json({ error: `Not enough gems — you need ${item.price - req.user.gems} more.` })

  db.prepare(`INSERT INTO purchases (user_id, item_id, price) VALUES (?,?,?)`).run(req.user.id, item.id, item.price)
  db.prepare(`UPDATE users SET gems = gems - ? WHERE id = ?`).run(item.price, req.user.id)
  if (item.kind === 'membership') db.prepare(`UPDATE users SET is_premium = 1 WHERE id = ?`).run(req.user.id)
  evaluateAchievements(req.user.id, {})
  const updated = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user.id)
  res.json({ ok: true, gems: updated.gems, ownedItem: item.code, user: publicUser(updated) })
})

dataRouter.post('/store/claim-crate', requireAuth, (req, res) => {
  const item = db.prepare(`SELECT * FROM store_items WHERE code = 'crate_classic'`).get()
  const purchase = db.prepare(`SELECT 1 FROM purchases WHERE user_id = ? AND item_id = ?`).get(req.user.id, item.id)
  if (!purchase) return res.status(400).json({ error: 'Buy a crate first.' })
  const opened = db.prepare(`SELECT 1 FROM purchases p JOIN store_items s ON s.id = p.item_id WHERE p.user_id = ? AND s.code = 'crate_opened'`).get(req.user.id)
  const crumbs = db.prepare(`DELETE FROM purchases WHERE id = (SELECT p.id FROM purchases p JOIN store_items s ON s.id=p.item_id WHERE p.user_id = ? AND s.code='crate_classic' ORDER BY p.created_at DESC LIMIT 1)`).run(req.user.id)
  db.prepare(`UPDATE users SET gems = gems + 150 WHERE id = ?`).run(req.user.id)
  const updated = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user.id)
  res.json({ ok: true, reward: '+150 gems from the Classic Loot Crate!', gems: updated.gems })
})

// ---------- notifications ----------
dataRouter.get('/notifications', requireAuth, (req, res) => {
  const rows = db.prepare(`SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 40`).all(req.user.id)
  res.json({ notifications: rows.map((n) => ({ ...n, read: !!n.read })) })
})

dataRouter.post('/notifications/read', requireAuth, (req, res) => {
  const { ids } = req.body || {}
  if (Array.isArray(ids) && ids.length) {
    const stmt = db.prepare(`UPDATE notifications SET read = 1 WHERE user_id = ? AND id = ?`)
    for (const id of ids) stmt.run(req.user.id, id)
  } else {
    db.prepare(`UPDATE notifications SET read = 1 WHERE user_id = ?`).run(req.user.id)
  }
  res.json({ ok: true })
})
