import { db, notify } from '../db.js'

export const ACHIEVEMENT_DEFS = [
  { code: 'first_win', title: 'First Blood', description: 'Win your first match.', emoji: '🥇', metric: 'wins', threshold: 1, accent: 'emerald' },
  { code: 'rising_star', title: 'Rising Star', description: 'Win 10 matches.', emoji: '⭐', metric: 'wins', threshold: 10, accent: 'gold' },
  { code: 'game_champion', title: 'Game Champion', description: 'Win 50 matches.', emoji: '👑', metric: 'wins', threshold: 50, accent: 'gold' },
  { code: 'dedicated', title: 'Dedicated Player', description: 'Play 25 matches.', emoji: '🎯', metric: 'games_played', threshold: 25, accent: 'emerald' },
  { code: 'veteran', title: 'Board Veteran', description: 'Play 100 matches.', emoji: '🛡️', metric: 'games_played', threshold: 100, accent: 'cyan' },
  { code: 'triple_threat', title: 'Triple Threat', description: 'Win 10 TicTacToe matches.', emoji: '⚔️', metric: 'ttt_wins', threshold: 10, accent: 'cyan' },
  { code: 'color_flipper', title: 'Color Flipper', description: 'Win 10 Reversi matches.', emoji: '◐', metric: 'reversi_wins', threshold: 10, accent: 'emerald' },
  { code: 'ludo_royalty', title: 'Ludo Royalty', description: 'Win 10 Ludo matches.', emoji: '🎲', metric: 'ludo_wins', threshold: 10, accent: 'gold' },
  { code: 'snake_charmer', title: 'Snake Charmer', description: 'Win 10 Snake & Ladder matches.', emoji: '🐍', metric: 'snakes_wins', threshold: 10, accent: 'royal' },
  { code: 'social_butterfly', title: 'Social Butterfly', description: 'Add 10 friends.', emoji: '🤝', metric: 'friends', threshold: 10, accent: 'cyan' },
  { code: 'tourney_regular', title: 'Tourney Regular', description: 'Join 5 tournaments.', emoji: '🏟️', metric: 'tournaments_joined', threshold: 5, accent: 'royal' },
  { code: 'hot_streak', title: 'Hot Streak', description: 'Win 3 matches in a row.', emoji: '🔥', metric: 'streak', threshold: 3, accent: 'gold' },
  { code: 'supporter', title: 'Premium Supporter', description: 'Subscribe to Premium.', emoji: '💎', metric: 'premium', threshold: 1, accent: 'gold' },
]

export function seedAchievements() {
  const ins = db.prepare(`INSERT OR IGNORE INTO achievements (code, title, description, emoji, metric, threshold, accent) VALUES (?,?,?,?,?,?,?)`)
  for (const a of ACHIEVEMENT_DEFS) ins.run(a.code, a.title, a.description, a.emoji, a.metric, a.threshold, a.accent)
}

function metricValue(u, metric, extras) {
  if (extras && metric in extras) return extras[metric]
  if (metric === 'premium') return u.is_premium
  return u[metric] ?? 0
}

// Recompute achievements for a user; create notifications for newly unlocked ones.
export function evaluateAchievements(userId, extras = {}) {
  const defs = db.prepare(`SELECT * FROM achievements`).all()
  const u = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId)
  if (!u) return []
  const friends = db.prepare(`SELECT COUNT(*) c FROM friendships WHERE a_id = ? OR b_id = ?`).get(userId, userId).c
  const unlockedRows = db.prepare(`SELECT achievement_id FROM user_achievements WHERE user_id = ?`).all(userId)
  const unlocked = new Set(unlockedRows.map((r) => r.achievement_id))
  const newly = []
  for (const def of defs) {
    const value = metricValue(u, def.metric, { friends, metric: def.metric, ...extras })
    const existing = unlockedRows.find((r) => r.achievement_id === def.id)
    if (value >= def.threshold && !existing) {
      db.prepare(`INSERT OR IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?,?)`).run(userId, def.id)
      newly.push(def)
    }
  }
  for (const def of newly) {
    notify(userId, 'achievement', `Achievement unlocked — ${def.title} ${def.emoji}`, def.description, '/achievements')
  }
  return newly
}

// Progress payload for the achievements page/cards.
export function achievementsForUser(userId) {
  const defs = db.prepare(`SELECT * FROM achievements`).all()
  const u = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId)
  const unlockedRows = db.prepare(`SELECT achievement_id, unlocked_at FROM user_achievements WHERE user_id = ?`).all(userId)
  const unlockedMap = new Map(unlockedRows.map((r) => [r.achievement_id, r.unlocked_at]))
  const friends = db.prepare(`SELECT COUNT(*) c FROM friendships WHERE a_id = ? OR b_id = ?`).get(userId, userId).c
  return defs.map((def) => {
    const value = metricValue(u, def.metric, { friends })
    return {
      ...def,
      current: value,
      pct: Math.min(100, Math.round((value / def.threshold) * 100)),
      unlockedAt: unlockedMap.get(def.id) || null,
      unlocked: unlockedMap.has(def.id),
    }
  })
}
