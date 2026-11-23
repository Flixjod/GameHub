import bcrypt from 'bcryptjs'
import { db } from './db.js'
import { seedAchievements } from './lib/achievements.js'

const PASSWORD = 'password123'

const USERS = [
  { username: 'nova',   display_name: 'NovaByte',  avatar: '🦊', color: 0, verified: 1, premium: 1, gems: 4800, xp: 5250, wins: 142, losses: 61, draws: 9,  rated: 1748, tw: { ttt: 22, reversi: 41, ludo: 55, snakes: 24 }, bio: 'Reversi corner-hunter. Ludo after midnight.' },
  { username: 'blitz',  display_name: 'Blitz',     avatar: '🐺', color: 1, verified: 1, premium: 0, gems: 2100, xp: 3400, wins: 98,  losses: 74, draws: 12, rated: 1612, tw: { ttt: 30, reversi: 18, ludo: 32, snakes: 18 }, bio: 'Fast rolls only.' },
  { username: 'aria',   display_name: 'AriaPlay',  avatar: '👾', color: 2, verified: 0, premium: 1, gems: 3900, xp: 4600, wins: 121, losses: 55, draws: 4,  rated: 1681, tw: { ttt: 40, reversi: 35, ludo: 26, snakes: 20 }, bio: 'TicTacToe strategist.' },
  { username: 'kofi',   display_name: 'Kofi_K',    avatar: '🦁', color: 3, verified: 0, premium: 0, gems: 1500, xp: 1800, wins: 64,  losses: 48, draws: 7,  rated: 1495, tw: { ttt: 10, reversi: 12, ludo: 29, snakes: 13 }, bio: 'Ludo champion hopeful.' },
  { username: 'rune',   display_name: 'Rune',      avatar: '🧙', color: 4, verified: 1, premium: 0, gems: 900,  xp: 900,  wins: 38,  losses: 52, draws: 10, rated: 1342, tw: { ttt: 6, reversi: 9,  ludo: 17, snakes: 6 },  bio: 'Learning the corners.' },
  { username: 'jax',    display_name: 'Jax',       avatar: '🚀', color: 5, verified: 0, premium: 0, gems: 700,  xp: 450,  wins: 22,  losses: 31, draws: 3,  rated: 1265, tw: { ttt: 5, reversi: 4,  ludo: 9,  snakes: 4 },  bio: '' },
  { username: 'mira',   display_name: 'Mira',      avatar: '🐉', color: 6, verified: 0, premium: 1, gems: 5200, xp: 6100, wins: 160, losses: 48, draws: 14, rated: 1793, tw: { ttt: 24, reversi: 52, ludo: 48, snakes: 36 }, bio: 'Queen of the squares.' },
  { username: 'todd',   display_name: 'Todd',      avatar: '',  color: 7, verified: 0, premium: 0, gems: 500,  xp: 200,  wins: 11,  losses: 18, draws: 2,  rated: 1188, tw: { ttt: 3, reversi: 2,  ludo: 4,  snakes: 2 },  bio: '' },
  { username: 'ivy',    display_name: 'Ivy',       avatar: '',  color: 8, verified: 0, premium: 0, gems: 600,  xp: 320,  wins: 14,  losses: 12, draws: 1,  rated: 1211, tw: { ttt: 2, reversi: 3,  ludo: 6,  snakes: 3 },  bio: '' },
  { username: 'demo',   display_name: 'DemoPlayer',avatar: '🎮', color: 9, verified: 1, premium: 0, gems: 5000, xp: 1200, wins: 31,  losses: 27, draws: 4,  rated: 1394, tw: { ttt: 8, reversi: 9,  ludo: 11, snakes: 3 }, bio: 'Demo account — explore everything.' },
]

const STORE = [
  { code: 'premium_month', name: 'Premium Membership', kind: 'membership', description: 'Exclusive crown, 2× XP on every win, ad-free experience and a golden glow on your profile.', price: 1500, value: 'premium', accent: 'gold' },
  { code: 'avatar_dragon', name: 'Dragon Avatar',     kind: 'avatar', description: 'Legendary dragon energy for your profile.', price: 900, value: '🐉', accent: 'emerald' },
  { code: 'avatar_wizard', name: 'Wizard Avatar',     kind: 'avatar', description: 'Mystical flair for strategy masters.', price: 700, value: '🧙', accent: 'royal' },
  { code: 'avatar_robot',  name: 'Robot Avatar',      kind: 'avatar', description: 'Beep boop. Cyber pawn energy.', price: 500, value: '🤖', accent: 'cyan' },
  { code: 'avatar_unicorn',name: 'Unicorn Avatar',    kind: 'avatar', description: 'Legendary sparkle.', price: 1200, value: '🦄', accent: 'gold' },
  { code: 'theme_cyan',    name: 'Cyber Cyan Theme',  kind: 'theme',  description: 'Swap the neon emerald for cyber cyan across the app.', price: 400, value: '#22d3ee', accent: 'cyan' },
  { code: 'theme_violet',  name: 'Royal Violet Theme',kind: 'theme',  description: 'A noble violet accent for scholars and competitors.', price: 400, value: '#8b5cf6', accent: 'royal' },
  { code: 'theme_amber',   name: 'Champion Amber',    kind: 'theme',  description: 'Golden amber glow inspired by the trophy vault.', price: 400, value: '#fbbf24', accent: 'gold' },
  { code: 'xp_boost',      name: 'XP Surge Badge',    kind: 'reward', description: 'Show a flashy Trainee badge profile for 7 days. (Cosmetic)', price: 300, value: '⚡', accent: 'gold' },
  { code: 'crate_classic', name: 'Classic Loot Crate',kind: 'reward', description: 'A mystery crate with 150 gems guaranteed.', price: 100, value: 'crate_classic', accent: 'emerald' },
]

const Tournaments = [
  { name: 'Emerald Reversi Open',      game: 'reversi', status: 'upcoming',  max_players: 16, prize: '2000 🟢 gems + Trophy', starts_at: '2025-08-02T18:00:00Z', description: 'Weekly knock-out bracket. Best strategy wins the crown.' },
  { name: 'Ludo Legends Cup',          game: 'ludo',    status: 'upcoming',  max_players: 32, prize: '3500 🟢 gems + Golden dice', starts_at: '2025-08-09T17:30:00Z', description: '32-seat dice racing championship with a grand final.' },
  { name: 'TicTacToe Blitz',           game: 'tictactoe', status: 'active',  max_players: 8,  prize: '800 🟢 gems', starts_at: '2025-07-28T19:00:00Z', description: 'Fast-paced logic knock-out, running live now.' },
  { name: 'Snake Sprint Rumble',       game: 'snakes',  status: 'completed', max_players: 16, prize: '1200 🟢 gems', starts_at: '2025-07-21T19:00:00Z', description: 'Ladders luck, snake bites and a champion crowned.' },
  { name: 'Reversi Masters League',    game: 'reversi', status: 'active',    max_players: 32, prize: '5000 🟢 gems', starts_at: '2025-07-25T20:00:00Z', description: 'Season league with standings over multiple rounds.' },
]

// Ladder: 4->25, 13->46, 33->49, 42->63, 50->69, 62->81, 74->92 …
function main() {
  db.exec(`DELETE FROM purchases; DELETE FROM store_items; DELETE FROM notifications; DELETE FROM user_achievements; DELETE FROM achievements;
           DELETE FROM tournament_registrations; DELETE FROM tournaments; DELETE FROM match_results; DELETE FROM matches;
           DELETE FROM friend_requests; DELETE FROM friendships; DELETE FROM users;`)
  seedAchievements()

  const hash = bcrypt.hashSync(PASSWORD, 10)
  const insUser = db.prepare(`INSERT INTO users (username, password_hash, display_name, bio, avatar, avatar_color, is_verified, is_premium, gems, xp, wins, losses, draws, games_played, rating, streak, ttt_wins, reversi_wins, ludo_wins, snakes_wins, tournaments_joined) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
  const ids = {}
  let dayActivity = [] // per-user [date, gameCount]
  const today = new Date()

  for (const u of USERS) {
    const games = u.wins + u.losses + u.draws
    const r = insUser.run(u.username, hash, u.display_name, u.bio, u.avatar, u.color, u.verified, u.premium, u.gems, u.xp, u.wins, u.losses, u.draws, games, u.rated, 1, u.tw.ttt, u.tw.reversi, u.tw.ludo, u.tw.snakes, 2)
    ids[u.username] = r.lastInsertRowid
  }

  // Friend graph (real rows, presence stays live)
  const pairs = [
    ['demo', 'nova'], ['demo', 'blitz'], ['demo', 'aria'], ['demo', 'kofi'], ['demo', 'ivy'],
    ['nova', 'blitz'], ['nova', 'aria'], ['nova', 'mira'], ['blitz', 'kofi'], ['blitz', 'rune'],
    ['aria', 'mira'], ['aria', 'ivy'], ['kofi', 'rune'], ['mira', 'rune'], ['mira', 'todd'], ['jax', 'nova'],
  ]
  const insFriend = db.prepare(`INSERT OR IGNORE INTO friendships (a_id, b_id) VALUES (?,?)`)
  for (const [a, b] of pairs) insFriend.run(ids[a], ids[b])

  // Friend request waiting for demo
  db.prepare(`INSERT INTO friend_requests (from_id, to_id) VALUES (?,?)`).run(ids['jax'], ids['demo'])
  db.prepare(`INSERT INTO friend_requests (from_id, to_id) VALUES (?,?)`).run(ids['todd'], ids['demo'])

  // Store + a couple of historical purchases for demo
  const insItem = db.prepare(`INSERT INTO store_items (code, name, kind, description, price, value, accent) VALUES (?,?,?,?,?,?,?)`)
  const itemIds = {}
  for (const it of STORE) {
    const r = insItem.run(it.code, it.name, it.kind, it.description, it.price, it.value, it.accent)
    itemIds[it.code] = r.lastInsertRowid
  }
  const insPurch = db.prepare(`INSERT INTO purchases (user_id, item_id, price, created_at) VALUES (?,?,?,datetime('now','-3 days'))`)
  insPurch.run(ids['demo'], itemIds['theme_cyan'], 400)
  insPurch.run(ids['demo'], itemIds['avatar_robot'], 500)

  // Tournaments + some registrations
  const insT = db.prepare(`INSERT INTO tournaments (name, game, description, status, max_players, prize, starts_at) VALUES (?,?,?,?,?,?,?)`)
  const tIds = []
  for (const t of Tournaments) tIds.push(insT.run(t.name, t.game, t.description, t.status, t.max_players, t.prize, t.starts_at).lastInsertRowid)
  const insReg = db.prepare(`INSERT OR IGNORE INTO tournament_registrations (tournament_id, user_id, rank) VALUES (?,?,?)`)
  for (const un of ['nova', 'aria', 'blitz', 'kofi']) insReg.run(tIds[2], ids[un], null)
  for (const un of ['nova', 'mira', 'rune', 'jax', 'todd', 'ivy']) insReg.run(tIds[4], ids[un], null)
  insReg.run(tIds[3], ids['mira'], 1)
  insReg.run(tIds[3], ids['nova'], 2)
  insReg.run(tIds[3], ids['blitz'], 3)

  // Recent match history for leaderboards / activity — realistic-ish distribution
  const insMatch = db.prepare(`INSERT INTO matches (game, started_at, ended_at) VALUES (?,datetime(?, 'unixepoch'),datetime(?, 'unixepoch'))`)
  const insRes = db.prepare(`INSERT INTO match_results (match_id, user_id, result, rating_delta, xp_delta, rating_after, created_at) VALUES (?,?,?,?,?,?,datetime(?, 'unixepoch'))`)
  const usernames = Object.keys(ids)
  const GAMES = ['reversi', 'ludo', 'tictactoe', 'snakes']
  let ts = Math.floor(Date.now() / 1000) - 6 * 86400
  for (let day = 6; day >= 0; day--) {
    const matchesToday = 14 + Math.floor(Math.random() * 8)
    for (let m = 0; m < matchesToday; m++) {
      ts += 60 + Math.floor(Math.random() * 3600)
      const a = usernames[Math.floor(Math.random() * usernames.length)]
      let b = usernames[Math.floor(Math.random() * usernames.length)]
      if (a === b) b = 'demo' !== a ? 'demo' : 'nova'
      const game = GAMES[Math.floor(Math.random() * GAMES.length)]
      const mid = insMatch.run(game, ts - 300, ts).lastInsertRowid
      const roll = Math.random()
      const resA = roll < 0.55 ? ['win', 'loss'] : roll < 0.85 ? ['loss', 'win'] : ['draw', 'draw']
      insRes.run(mid, ids[a], resA[0], 12, 50, null, ts)
      insRes.run(mid, ids[b], resA[1], -12, 10, null, ts)
    }
  }

  const demoId = ids['demo']
  db.prepare(`INSERT INTO notifications (user_id, type, title, body, link) VALUES
    (?, 'friend_request', 'Jax sent you a friend request', 'Accept to start playing together.', '/friends'),
    (?, 'tournament', 'TicTacToe Blitz is live', 'Your registered tournament starts in a few minutes.', '/tournaments'),
    (?, 'achievement', 'Achievement unlocked — Rising Star ⭐', 'You won 10 matches.', '/home/achievements')`).run(demoId, demoId, demoId)

  console.log('Seeded GameHub database.')
  console.log('Users:', usernames.join(', '))
  console.log('Password for all demo accounts:', PASSWORD)
  main2()
}

function main2() {}

main()
