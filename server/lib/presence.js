// Live presence registry — real connections only (socket.io).
const online = new Map() // userId -> Set(socketId)

export function goOnline(userId, socketId) {
  if (!online.has(userId)) online.set(userId, new Set())
  online.get(userId).add(socketId)
  const first = online.get(userId).size === 1
  if (first) touchLastSeen(userId)
  return first
}

export function goOffline(userId, socketId) {
  const set = online.get(userId)
  if (!set) return false
  set.delete(socketId)
  if (!set.size) {
    online.delete(userId)
    touchLastSeen(userId)
    return true
  }
  return false
}

function touchLastSeen(userId) {
  import('./db.js').then(({ db }) => db.prepare(`UPDATE users SET last_seen = datetime('now') WHERE id = ?`).run(userId)).catch(() => {})
}

export function isOnline(userId) {
  return online.has(Number(userId))
}

export function onlineCount() {
  return online.size
}
