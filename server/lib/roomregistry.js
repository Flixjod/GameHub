// Shared room registry — in-memory live rooms backed by SQLite rows for REST queries.
import { db } from '../db.js'
import { getGame } from './games.js'

export const rooms = new Map() // code -> room runtime

export const reconnectGrace = 45000

export function makeCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let code
  do { code = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('') } while (rooms.has(code))
  return code
}

export function roomSummary(room) {
  return {
    code: room.code,
    name: room.name,
    game: room.game,
    gameName: getGame(room.game)?.name || room.game,
    maxPlayers: room.maxPlayers,
    isPrivate: room.isPrivate,
    hostId: room.hostId,
    hasBot: room.botSeat != null,
    inGame: !!room.state,
    players: [...room.players.values()].map((p) => ({
      id: p.user.id, username: p.user.username, displayName: p.user.display_name,
      avatar: p.user.avatar, avatarColor: p.user.avatar_color, isVerified: !!p.user.is_verified,
      ready: !!p.ready, disconnected: !!p.disconnected, isBot: !!p.isBot,
    })),
    playerCount: room.players.size,
  }
}

export function publicRooms() {
  return [...rooms.values()].filter((r) => !r.isPrivate).map(roomSummary)
}

export function persistRoom(room) {
  const existing = db.prepare('SELECT id FROM rooms WHERE code = ?').get(room.code)
  if (existing) {
    db.prepare('UPDATE rooms SET name = ?, game = ?, max_players = ?, is_private = ?, has_bot = ? WHERE id = ?')
      .run(room.name, room.game, room.maxPlayers, room.isPrivate ? 1 : 0, room.botSeat != null ? 1 : 0, existing.id)
    db.prepare('DELETE FROM room_players WHERE room_id = ?').run(existing.id)
  } else {
    const r = db.prepare('INSERT INTO rooms (code, name, game, max_players, is_private, has_bot, created_by) VALUES (?,?,?,?,?,?,?)')
      .run(room.code, room.name, room.game, room.maxPlayers, room.isPrivate ? 1 : 0, room.botSeat != null ? 1 : 0, room.hostId)
    var roomId = r.lastInsertRowid
  }
  const id = roomId ?? existing.id
  for (const p of room.players.values()) {
    if (p.isBot) continue
    db.prepare('INSERT OR IGNORE INTO room_players (room_id, user_id, ready) VALUES (?,?,?)').run(id, p.user.id, p.ready ? 1 : 0)
  }
}

export function deleteRoomRow(code) {
  db.prepare('DELETE FROM rooms WHERE code = ?').run(code)
}

export function seatOf(room, userId) {
  if (!room.players.has(userId)) return null
  return [...room.players.keys()].indexOf(userId)
}
