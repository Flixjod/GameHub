import express from 'express'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import { initRealtime } from './realtime.js'
import { authRouter } from './routes/auth.js'
import { dataRouter } from './routes/data.js'
import { friendsRouter } from './routes/friends.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const server = http.createServer(app)

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRouter)
app.use('/api/friends', friendsRouter)
app.use('/api', dataRouter)

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }))

// error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error.' })
})

// production: serve built frontend + SPA fallback
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '..', 'dist')
  app.use(express.static(dist))
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    res.sendFile(path.join(dist, 'index.html'))
  })
}

initRealtime(server)

const PORT = process.env.PORT || 4000
server.listen(PORT, () => {
  console.log(`GameHub server listening on http://localhost:${PORT}`)
})
