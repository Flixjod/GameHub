// Seeds the database only when empty, so restarts never wipe user data.
// (server/seed.js is a full reseed for development.)
import { db } from './db.js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dataDir = process.env.DATA_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data')
const firstRun = !fs.existsSync(path.join(dataDir, 'gamehub.db'))

const count = db.prepare('SELECT COUNT(*) AS n FROM users').get().n
if (count === 0) {
  await import('./seed.js')
} else if (firstRun) {
  console.log('Existing database mounted, skipping seed.')
}
