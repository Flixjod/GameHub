import { Server } from 'socket.io'
import { db, levelProgress, notify } from './db.js'
import { verifyToken } from './lib/auth.js'
import { getGame, GAMES } from './lib/games.js'
import { evaluateAchievements } from './lib/achievements.js'
import { goOnline } from './lib/presence.js'
import { rooms, makeCode, roomSummary, publicRooms, persistRoom, deleteRoomRow, seatOf, reconnectGrace } from './lib/roomregistry.js'

export let io = null

const matchmaking = new Map() // game -> [{userId, socketId}]

const BOT_NAMES = { tictactoe: 'ByteBot', reversi: 'CornerBot', ludo: 'DiceBot', snakes: 'LadderBot' }
const BOT_RATING = { tictactoe: 1000, reversi: 1150, ludo: 1080, snakes: 920 }

export function broadcastRoomList() {
  if (io) io.emit('rooms:list', publicRooms())
}

function emitRoom(room, event, payload) {
  io.to(room.code).emit(event, payload)
}

export function emitToUser(userId, event, payload) {
  if (io) io.to(`user:${userId}`).emit(event, payload)
}

export function currentRoomOfUser(userId) {
  for (const room of rooms.values()) if (room.players.has(userId)) return room
  return null
}

function botUser(game) {
  return { id: -1, username: 'bot', display_name: BOT_NAMES[game], avatar: '🤖', avatar_color: 0, is_verified: 0, rating: BOT_RATING[game] }
}

function seatEntries(room) {
  return [...room.players.entries()]
}

function seatIndexByUser(room, userId) {
  return seatOf(room, userId)
}

// ---------------- match lifecycle ----------------
function seatPayload(room, seat) {
  const p = seat[1]
  const game = getGame(room.game)
  return {
    seat: null,
    id: p.isBot ? 'bot' : p.user.id,
    username: p.isBot ? BOT_NAMES[room.game] : p.user.username,
    displayName: p.isBot ? BOT_NAMES[room.game] : p.user.display_name,
    avatar: p.isBot ? '🤖' : p.user.avatar,
    avatarColor: p.user.avatar_color || 0,
    isVerified: p.isBot ? false : !!p.user.is_verified,
    rating: p.isBot ? game.ratingBot : p.user.rating,
    isBot: !!p.isBot,
  }
}

function seatsPayload(room) {
  return seatEntries(room).map(([key, p], idx) => ({ ...seatPayload(room, [key, p]), seat: idx }))
}

function startMatch(room) {
  const gameEngines = getRuntimeEngines(room.game)
  const seated = seatEntries(room)
  const state = gameEngines.create(seated.map(([key]) => key))
  const m = db.prepare(`INSERT INTO matches (game, mode, player_count) VALUES (?,?,?)`).run(room.game, room.botSeat != null ? 'bot' : 'online', seated.length)
  room.matchId = m.lastInsertRowid
  room.state = state
  for (const [, p] of room.players) p.ready = false
  emitRoom(room, 'game:started', { code: room.code, game: room.game, state, seats: seatsPayload(room), turnSeat: state.turn })
  scheduleBot(room)
  broadcastRoomList()
}

function getRuntimeEngines(game) {
  return engines[game]
}

function cleanState(room) {
  return room.state
}

function endMatch(room, { winnerSeat, resignSeat = null, reason = '' } = {}) {
  const state = room.state
  const seated = seatEntries(room)
  const enginesMap = engines[room.game]
  const scores = seated.map(([, p], idx) => (enginesMap.scoreOf ? enginesMap.scoreOf(state, idx) : 0))

  db.prepare(`UPDATE matches SET ended_at = datetime('now') WHERE id = ?`).run(room.matchId)
  const finishers = []
  seated.forEach(([key, p], idx) => {
    if (p.isBot) return
    let result = 'draw'
    if (winnerSeat === idx) result = 'win'
    else if (winnerSeat != null && winnerSeat >= 0) result = 'loss'
    const u = p.user || p.userRef
    let dRating = 0
    const xpDelta = result === 'win' ? 50 : result === 'draw' ? 25 : 10
    let ratingAfter = u.rating
    if (result !== 'draw') {
      const opp = seated[1 - idx === idx ? 0 : 1 - idx]
      const oppRating = opp && opp[1].isBot ? BOT_RATING[room.game] : opp && opp[1].user ? opp[1].user.rating : 1000
      const expected = 1 / (1 + 10 ** ((oppRating - u.rating) / 400))
      dRating = Math.round(24 * ((result === 'win' ? 1 : 0) - expected))
      ratingAfter = Math.max(100, u.rating + dRating)
    }
    db.prepare(`INSERT INTO match_results (match_id, user_id, result, rating_delta, xp_delta, rating_after) VALUES (?,?,?,?,?,?)`)
      .run(room.matchId, u.id, result, dRating, xpDelta, ratingAfter)
    const before = db.prepare('SELECT * FROM users WHERE id = ?').get(u.id)
    const newXp = before.xp + xpDelta
    const oldLevel = levelProgress(before.xp).level
    const newLevel = levelProgress(newXp).level
    db.prepare(`UPDATE users SET xp = ?, rating = ?, games_played = games_played + 1,
      wins = wins + ?, losses = losses + ?, draws = draws + ?, streak = CASE WHEN ? THEN streak + 1 ELSE 0 END,
      ttt_wins = ttt_wins + ?, reversi_wins = reversi_wins + ?, ludo_wins = ludo_wins + ?, snakes_wins = snakes_wins + ?
      WHERE id = ?`).run(
      newXp, ratingAfter,
      result === 'win' ? 1 : 0, result === 'loss' ? 1 : 0, result === 'draw' ? 1 : 0,
      result === 'win' ? 1 : 0,
      room.game === 'tictactoe' && result === 'win' ? 1 : 0,
      room.game === 'reversi' && result === 'win' ? 1 : 0,
      room.game === 'ludo' && result === 'win' ? 1 : 0,
      room.game === 'snakes' && result === 'win' ? 1 : 0,
      u.id,
    )
    if (newLevel > oldLevel) notify(u.id, 'level', `Level up! You reached level ${newLevel}`, 'Keep winning matches to climb faster.', '/')
    const fresh = db.prepare('SELECT * FROM users WHERE id = ?').get(u.id)
    const unlocked = evaluateAchievements(u.id, {})
    for (const a of unlocked) emitToUser(u.id, 'notify', { type: 'achievement', title: `Achievement unlocked — ${a.title} ${a.emoji}` })
    finishers.push({ id: u.id, result, ratingDelta: dRating, xpDelta, ratingAfter, level: newLevel, streak: fresh.streak })
  })

  const seatsOut = seatsPayload(room).map((s, idx) => ({
    ...s,
    result: winnerSeat == null ? 'draw' : winnerSeat === -1 || winnerSeat == null ? 'draw' : winnerSeat === idx ? 'win' : 'loss',
    score: scores[idx],
  }))
  emitRoom(room, 'game:over', { code: room.code, seats: seatsOut, finishers, reason })
  room.state = null
  room.matchId = null
  broadcastRoomList()
}

function scheduleBot(room) {
  const game = room.game
  if (room.botSeat == null || !room.state) return
  const keys = seatEntries(room).map(([k]) => k)
  const botKey = keys[room.botSeat]
  if (botKey === undefined) return
  if (room.state.turn !== room.botSeat) return
  const delay = 620
  setTimeout(() => {
    if (!room.state || room.state.turn !== room.botSeat) return
    const eng = engines[game]
    if (eng.ludo) {
      const decision = eng.bot(room.state, room.botSeat)
      if (decision.action === 'roll') doRoll(room, room.botSeat)
      else if (decision.action === 'move') doMove(room, room.botSeat, { token: decision.token })
    } else if (eng.dice) {
      doRoll(room, room.botSeat)
    } else {
      const mv = eng.bot(room.state, room.botSeat, 'best')
      if (mv == null) {
        if (eng.pass) doPass(room, room.botSeat)
      } else {
        doMove(room, room.botSeat, typeof mv === 'number' ? { i: mv } : mv)
      }
    }
  }, delay)
}

function sendState(room, event) {
  emitRoom(room, 'game:state', { code: room.code, state: room.state, turnSeat: room.state.turn, event })
}

function doRoll(room, seatIdx) {
  const eng = engines[room.game]
  const res = eng.roll(room.state, seatIdx)
  if (res.error) { emitRoom(room, 'game:error', { code: room.code, error: res.error, seat: seatIdx }); return }
  if (res.finished) return endMatch(room, { winnerSeat: seatIdx })
  sendState(room, { type: 'roll', roll: res.roll, again: !!res.again, blocked: !!res.blocked, forfeited: !!res.forfeited, message: res.message || null })
  scheduleBot(room)
}

function doMove(room, seatIdx, move) {
  const eng = engines[room.game]
  const res = eng.apply(room.state, seatIdx, move)
  if (res.error) { emitRoom(room, 'game:error', { code: room.code, error: res.error, seat: seatIdx }); return }
  if (res.finished) return endMatch(room, { winnerSeat: seatIdx })
  sendState(room, { type: 'move', move, captured: res.captured ?? null, forcedSkip: !!res.forcedSkip, passed: !!res.passed, again: !!res.again })
  scheduleBot(room)
}

function doPass(room, seatIdx) {
  const eng = engines[room.game]
  if (!eng.pass) return
  const res = eng.pass(room.state, seatIdx)
  if (res.error) { emitRoom(room, 'game:error', { code: room.code, error: res.error, seat: seatIdx }); return }
  sendState(room, { type: 'pass', seat: seatIdx })
  scheduleBot(room)
}

// ---------------- engine adapters ----------------
import * as ttt from './games/tictactoe.js'
import * as reversi from './games/reversi.js'
import * as ludo from './games/ludo.js'
import * as snakes from './games/snakes.js'

const engines = {
  tictactoe: {
    create: ttt.createTicTacToe,
    roll: null,
    apply: ttt.applyTicTacToeMove,
    bot: ttt.ticTacToeBotMove,
    pass: null,
    scoreOf: ttt.ticTacToeScore,
  },
  reversi: {
    create: reversi.createReversi,
    roll: null,
    apply: reversi.applyReversiMove,
    bot: reversi.reversiBotMove,
    pass: reversi.applyReversiPass,
    scoreOf: reversi.reversiScore,
  },
  ludo: {
    create: ludo.createLudo,
    roll: ludo.applyLudoRoll,
    apply: ludo.applyLudoMove,
    bot: ludo.ludoBotDecide,
    pass: null,
    scoreOf: ludo.ludoScore,
    ludo: true,
  },
  snakes: {
    create: snakes.createSnakes,
    roll: snakes.applySnakesMove,
    apply: null,
    bot: null,
    pass: null,
    scoreOf: snakes.snakesScore,
    dice: true,
  },
}

// ---------------- socket wiring ----------------
export function initRealtime(httpServer) {
  io = new Server(httpServer, { cors: { origin: '*' } })

  io.use((socket, next) => {
    const user = verifyToken(socket.handshake.auth?.token)
    if (!user) return next(new Error('unauthorized'))
    socket.data.user = user
    next()
  })

  io.on('connection', (socket) => {
    const user = socket.data.user
    const userId = user.id
    socket.join(`user:${userId}`)
    const first = goOnline(userId, socket.id)
    if (first) io.emit('presence', { userId, online: true })
    socket.emit('init', { userId })

    // ---- matchmaking ----
    socket.on('matchmaking:join', ({ game } = {}) => {
      if (!GAMES[game]) return socket.emit('error:msg', { error: 'Unknown game.' })
      if (currentRoomOfUser(userId)) {
        for (const r of [...rooms.values()]) if (r.players.has(userId)) leaveRoom(socket, r)
      }
      if (!matchmaking.has(game)) matchmaking.set(game, [])
      const q = matchmaking.get(game)
      if (q.some((e) => e.userId === userId)) return socket.emit('matchmaking:status', { game, state: 'queued' })
      q.push({ userId, socketId: socket.id })
      socket.emit('matchmaking:status', { game, state: 'queued' })
      if (q.length >= 2) {
        const a = q.shift()
        const b = q.shift()
        const room = createMatchRoom(game, a.userId, b.userId)
        const sa = io.sockets.sockets.get(a.socketId)
        if (sa) sa.join(room.code)
        socket.join(room.code)
        io.to(room.code).emit('matchmaking:found', { code: room.code, game })
        io.to(room.code).emit('room:update', roomSummary(room))
        broadcastRoomList()
        setTimeout(() => {
          const r = rooms.get(room.code)
          if (r && !r.state) startMatch(r)
        }, 1800)
      }
    })

    socket.on('matchmaking:cancel', ({ game } = {}) => {
      if (matchmaking.has(game)) {
        matchmaking.set(game, matchmaking.get(game).filter((e) => e.userId !== userId))
      }
      socket.emit('matchmaking:status', { game, state: 'idle' })
    })

    // ---- rooms ----
    socket.on('room:create', ({ game, name, isPrivate, maxPlayers } = {}, cb) => {
      if (!GAMES[game]) return cb?.({ error: 'Unknown game.' })
      leaveAllRooms(socket)
      const room = {
        code: makeCode(),
        game,
        name: (name || `${GAMES[game].name} Room`).slice(0, 32),
        maxPlayers: Math.max(GAMES[game].minPlayers, Math.min(GAMES[game].maxPlayers, Number(maxPlayers) || GAMES[game].maxPlayers)),
        isPrivate: !!isPrivate,
        hostId: userId,
        players: new Map(),
        state: null,
        matchId: null,
        botSeat: null,
        lastActivity: Date.now(),
      }
      room.players.set(userId, { user, ready: false, disconnected: false })
      rooms.set(room.code, room)
      persistRoom(room)
      socket.join(room.code)
      cb?.({ ok: true, code: room.code, room: roomSummary(room) })
      emitRoom(room, 'room:update', roomSummary(room))
      broadcastRoomList()
    })

    socket.on('room:join', ({ code } = {}, cb) => {
      const norm = String(code || '').toUpperCase().trim()
      const room = rooms.get(norm)
      if (!room) return cb?.({ error: 'Room not found — it may have closed.' })
      if (room.isPrivate && room.hostId !== userId) return cb?.({ error: 'This room is private.' })
      if (!room.players.has(userId) && room.players.size >= room.maxPlayers) {
        return cb?.({ error: `Room is full (${room.maxPlayers}/${room.maxPlayers} players).` })
      }
      leaveAllRooms(socket)
      if (!room.players.has(userId)) room.players.set(userId, { user, ready: false, disconnected: false })
      socket.join(room.code)
      persistRoom(room)
      cb?.({ ok: true, code: room.code, room: roomSummary(room), state: room.state, seatsInGame: room.state ? seatsPayload(room) : null })
      emitRoom(room, 'room:update', roomSummary(room))
      broadcastRoomList()
    })

    socket.on('room:leave', ({ code } = {}, cb) => {
      const room = code ? rooms.get(String(code).toUpperCase()) : currentRoomOfUser(userId)
      if (room) leaveRoom(socket, room)
      cb?.({ ok: true })
    })

    socket.on('room:ready', ({ code, ready } = {}) => {
      const room = rooms.get(String(code || '').toUpperCase())
      if (!room || !room.players.has(userId) || room.state) return
      room.players.get(userId).ready = !!ready
      room.lastActivity = Date.now()
      persistRoom(room)
      emitRoom(room, 'room:update', roomSummary(room))
      const seated = seatEntries(room)
      const allReady = seated.every(([k, p]) => p.isBot || p.ready)
      if (seated.length >= 2 && allReady) startMatch(room)
    })

    socket.on('room:add-bot', ({ code } = {}) => {
      const room = rooms.get(String(code || '').toUpperCase())
      if (!room || room.state) return
      if (room.hostId !== userId) return socket.emit('error:msg', { error: 'Only the host can add a bot.' })
      if (room.players.size >= room.maxPlayers) return socket.emit('error:msg', { error: 'Room is full.' })
      room.botSeat = room.players.size
      room.players.set('bot', { user: botUser(room.game), ready: true, isBot: true, disconnected: false })
      persistRoom(room)
      emitRoom(room, 'room:update', roomSummary(room))
      broadcastRoomList()
    })

    socket.on('room:kick-bot', ({ code } = {}) => {
      const room = rooms.get(String(code || '').toUpperCase())
      if (!room || room.state || room.hostId !== userId) return
      if (room.players.has('bot')) {
        room.players.delete('bot')
        room.botSeat = null
        persistRoom(room)
        emitRoom(room, 'room:update', roomSummary(room))
        broadcastRoomList()
      }
    })

    socket.on('room:chat', ({ code, text } = {}) => {
      const room = rooms.get(String(code || '').toUpperCase())
      if (!room || !room.players.has(userId)) return
      const clean = String(text || '').slice(0, 200).trim()
      if (!clean) return
      emitRoom(room, 'room:chat', { from: { username: user.username, displayName: user.display_name, avatar: user.avatar, avatarColor: user.avatar_color }, text: clean, ts: Date.now() })
    })

    socket.on('room:invite', ({ code, friendId } = {}) => {
      const room = rooms.get(String(code || '').toUpperCase())
      if (!room) return
      const f = db.prepare('SELECT id FROM users WHERE id = ?').get(Number(friendId))
      if (!f || f.id === userId) return
      if (!room.players.has(userId)) return
      notify(f.id, 'invite', `${user.display_name} invited you to ${room.name}`, `Room code: ${room.code}`, `/play/${room.game}?room=${room.code}`)
      emitToUser(f.id, 'notify', { type: 'invite', title: `${user.display_name} invited you to ${room.name}`, code: room.code })
    })

    // ---- game actions ----
    socket.on('game:move', ({ code, move } = {}) => {
      const room = rooms.get(String(code || '').toUpperCase())
      if (!room || !room.state) return
      const seatIdx = seatIndexByUser(room, userId)
      if (seatIdx == null) return
      if (engines[room.game].dice) {
        if (move?.action === 'roll') doRoll(room, seatIdx)
        else if (move?.action === 'skip') advanceNoRoll(room, seatIdx)
        return
      }
      doMove(room, seatIdx, move)
    })

    socket.on('game:roll', ({ code } = {}) => {
      const room = rooms.get(String(code || '').toUpperCase())
      if (!room || !room.state) return
      const seatIdx = seatIndexByUser(room, userId)
      if (seatIdx == null) return
      if (!engines[room.game].roll) return
      doRoll(room, seatIdx)
    })

    socket.on('game:pass', ({ code } = {}) => {
      const room = rooms.get(String(code || '').toUpperCase())
      if (!room || !room.state) return
      const seatIdx = seatIndexByUser(room, userId)
      if (seatIdx == null) return
      doPass(room, seatIdx)
    })

    socket.on('game:resign', ({ code } = {}) => {
      const room = rooms.get(String(code || '').toUpperCase())
      if (!room || !room.state) return
      const seatIdx = seatIndexByUser(room, userId)
      if (seatIdx == null) return
      const others = seatEntries(room).map(([k], idx) => idx).filter((idx) => idx !== seatIdx)
      endMatch(room, { winnerSeat: others.length ? others[0] : -1, resignSeat: seatIdx, reason: 'resign' })
    })

    // ---- disconnect / reconnection ----
    socket.on('disconnect', () => {
      const stillOnline = !!io.sockets.adapter.rooms.get(`user:${userId}`)?.size
      if (!stillOnline) io.emit('presence', { userId, online: false })
      for (const room of rooms.values()) {
        const p = room.players.get(userId)
        if (!p) continue
        p.disconnected = true
        emitRoom(room, 'room:update', roomSummary(room))
        if (!room.state) continue
        p.timer = setTimeout(() => {
          if (!room.state || !room.players.has(userId)) return
          const seatIdx = seatOf(room, userId)
          if (seatIdx == null) return
          room.players.delete(userId)
          persistRoom(room)
          if (room.players.size >= 2) {
            const remaining = seatEntries(room).map(([k], idx) => idx).filter((idx) => idx !== seatIdx)
            endMatch(room, { winnerSeat: remaining.length ? remaining[0] : -1, reason: 'disconnect' })
            emitRoom(room, 'room:notice', { message: `${p.user.display_name} disconnected and forfeited.` })
          } else {
            room.state = null
            room.matchId = null
            emitRoom(room, 'room:notice', { message: 'Match abandoned — player disconnected.' })
          }
          emitRoom(room, 'room:update', roomSummary(room))
          broadcastRoomList()
        }, reconnectGrace)
      }
    })
  })

  // idle room cleanup
  setInterval(() => {
    const now = Date.now()
    for (const [code, room] of rooms) {
      const humans = [...room.players.values()].filter((p) => !p.isBot)
      const allDisconnected = humans.length > 0 && humans.every((p) => p.disconnected)
      if (!humans.length || allDisconnected || (!room.state && now - room.lastActivity > 30 * 60000)) {
        rooms.delete(code)
        deleteRoomRow(code)
      }
    }
    broadcastRoomList()
  }, 120000)
}

function advanceNoRoll(room, seatIdx) {
  const state = room.state
  state.roll = null
  state.turn = (state.turn + 1) % room.players.size
  sendState(room, { type: 'skip', seat: seatIdx })
  scheduleBot(room)
}

function createMatchRoom(game, hostUserId, guestUserId) {
  const host = db.prepare('SELECT * FROM users WHERE id = ?').get(hostUserId)
  const guest = db.prepare('SELECT * FROM users WHERE id = ?').get(guestUserId)
  const room = {
    code: makeCode(),
    game,
    name: `${GAMES[game].name} Match`,
    maxPlayers: GAMES[game].maxPlayers,
    isPrivate: false,
    hostId: hostUserId,
    players: new Map(),
    state: null,
    matchId: null,
    botSeat: null,
    lastActivity: Date.now(),
  }
  room.players.set(hostUserId, { user: host, ready: true, disconnected: false })
  room.players.set(guestUserId, { user: guest, ready: true, disconnected: false })
  rooms.set(room.code, room)
  persistRoom(room)
  return room
}

export function leaveRoom(socket, room) {
  const user = socket.data.user
  if (!room.players.has(user.id)) return
  const wasPlaying = !!room.state
  room.players.delete(user.id)
  socket.leave(room.code)
  room.lastActivity = Date.now()
  persistRoom(room)
  emitRoom(room, 'room:update', roomSummary(room))
  socket.emit('room:left', { code: room.code })
  if (!room.players.size) {
    rooms.delete(room.code)
    deleteRoomRow(room.code)
  } else if (wasPlaying) {
    const humans = [...room.players.values()].filter((p) => !p.isBot)
    if (!humans.length) { room.state = null; room.matchId = null }
  }
  broadcastRoomList()
  if (room.state && room.botSeat === room.state.turn) scheduleBot(room)
}

function leaveAllRooms(socket) {
  const user = socket.data.user
  for (const room of [...rooms.values()]) {
    if (room.players.has(user.id)) leaveRoom(socket, room)
  }
}

