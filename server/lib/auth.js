import jwt from 'jsonwebtoken'
import { db } from '../db.js'

const SECRET = process.env.JWT_SECRET || 'gamehub-dev-secret-change-me'

export function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: '30d' })
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Authentication required.' })
  try {
    const payload = jwt.verify(token, SECRET)
    const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(payload.id)
    if (!user) return res.status(401).json({ error: 'Account not found.' })
    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session.' })
  }
}

export function verifyToken(token) {
  try {
    const payload = jwt.verify(token, SECRET)
    return db.prepare(`SELECT * FROM users WHERE id = ?`).get(payload.id) || null
  } catch {
    return null
  }
}
