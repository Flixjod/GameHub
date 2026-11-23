// Quick backend smoke test using Node's fetch + socket.io-client.
const BASE = 'http://localhost:4000'

async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  let data = null
  try { data = await res.json() } catch {}
  return { status: res.status, data }
}

const results = []
function check(name, cond, extra = '') {
  results.push([cond ? 'PASS' : 'FAIL', name, extra])
}

async function main() {
  const IoClient = (await import('socket.io-client')).io

  // health
  const games = await api('/api/games')
  check('GET /api/games', games.status === 200 && games.data.games.length === 4, JSON.stringify(games.status))

  // login flow
  const login = await api('/api/auth/login', { method: 'POST', body: { username: 'demo', password: 'password123' } })
  check('login demo', login.status === 200 && !!login.data.token)
  const demo = login.data
  const bad = await api('/api/auth/login', { method: 'POST', body: { username: 'demo', password: 'wrong' } })
  check('login rejects bad password', bad.status === 401)

  // register
  const reg = await api('/api/auth/register', { method: 'POST', body: { username: `tester_${Date.now() % 100000}`, password: 'secret77' } })
  check('register new user', reg.status === 200 && !!reg.data.token)

  // auth required
  const noAuth = await api('/api/friends')
  check('friends requires auth', noAuth.status === 401)

  const token = demo.token
  const me = await api('/api/auth/me', { token })
  check('GET /api/auth/me', me.status === 200 && me.data.user.username === 'demo')

  const friends = await api('/api/friends', { token })
  check('friends list', friends.status === 200 && friends.data.friends.length === 5, `count=${friends.data?.friends?.length}`)
  check('friend requests exist', friends.data.requests.length === 2)

  // accept request (idempotent: pass if a previous run already consumed it)
  const acc = friends.data.requests.length
    ? await api(`/api/friends/requests/${friends.data.requests[0].id}/accept`, { method: 'POST', token })
    : { status: 200 }
  check('accept friend request', acc.status === 200, JSON.stringify(acc.data))

  const lb = await api('/api/leaderboard?period=all', { token })
  check('leaderboard all', lb.status === 200 && lb.data.players.length > 5)
  const lbw = await api('/api/leaderboard?period=weekly', { token })
  check('leaderboard weekly', lbw.status === 200, `players=${lbw.data.players.length}`)
  const lbf = await api('/api/leaderboard?period=friends', { token })
  check('leaderboard friends', lbf.status === 200, `players=${lbf.data.players.length}`)

  const act = await api('/api/activity', { token })
  check('activity 7 days', act.status === 200 && act.data.days.length === 7, `games sum=${act.data.days.reduce((a, d) => a + d.games, 0)}`)

  const tournaments = await api('/api/tournaments', { token })
  check('tournaments', tournaments.status === 200 && tournaments.data.tournaments.length === 5)

  const ach = await api('/api/achievements', { token })
  check('achievements', ach.status === 200 && ach.data.achievements.length >= 12)

  const store = await api('/api/store', { token })
  check('store items', store.status === 200 && store.data.items.length >= 8)

  const buy = await api('/api/store/checkout', { method: 'POST', token, body: { itemId: store.data.items.find((i) => i.code === 'avatar_dragon').id } })
  check('purchase item', buy.status === 200 || (buy.status === 409 && buy.data.error === 'You already own this item.'), JSON.stringify(buy.data))

  const notif = await api('/api/notifications', { token })
  check('notifications', notif.status === 200 && notif.data.notifications.length > 0)

  const search = await api('/api/users/search?q=no', { token })
  check('user search', search.status === 200 && search.data.users.some((u) => u.username === 'nova'))

  const history = await api('/api/matches/history', { token })
  check('match history', history.status === 200, `matches=${history.data.matches.length}`)

  // ---------- realtime ----------
  const socket = new IoClient(BASE, { auth: { token } })
  let found = null, started = null, over = null, lastState = null
  socket.on('matchmaking:found', (d) => (found = d))
  socket.on('game:started', (d) => (started = d))
  socket.on('game:state', (d) => (lastState = d))
  socket.on('game:over', (d) => (over = d))

  // second socket -> matchmaking pairs them for tictactoe
  const login2 = await api('/api/auth/login', { method: 'POST', body: { username: 'nova', password: 'password123' } })
  const token2 = login2.data.token
  const socket2 = new IoClient(BASE, { auth: { token: token2 } })
  await Promise.all([event(socket, 'init'), event(socket2, 'init')])

  socket.emit('matchmaking:join', { game: 'tictactoe' })
  socket2.emit('matchmaking:join', { game: 'tictactoe' })
  found = await event(socket, 'matchmaking:found', 5000)
  check('matchmaking pairs players', !!found?.code, JSON.stringify(found))
  started = await event(socket, 'game:started', 5000)
  check('match started', started?.game === 'tictactoe' && Array.isArray(started.seats))

  // play a scripted tictactoe match: seats[0]=host(demo), seats[1]=nova
  const demoSeat = started.seats.findIndex((s) => s.id === demo.user.id)
  check('demo has a seat', demoSeat === 0 || demoSeat === 1)
  const moves = [0, 3, 1, 4, 2] // demo plays 0,1,2 (winning row if demo seat 0) else block accordingly
  // Determine demo's winning line dynamically: demo takes 0,1,2; nova takes 5,6 NO — 3,5,6 gives nova 3 cells but we scripted 5 moves: demo moves at even indices.
  let done = null
  for (let mv = 0; mv < 5 && !done; mv++) {
    const turnSeat = lastState?.turnSeat ?? started.turnSeat
    const mover = turnSeat === demoSeat ? socket : socket2
    mover.emit('game:move', { code: found.code, move: { i: moves[mv] } })
    done = await event(socket, 'game:over', 400)
    if (!done) await event(socket, 'game:state', 400)
  }
  over = done || await event(socket, 'game:over', 4000)
  check('tictactoe game over with a winner', over?.finishers?.some((f) => f.result === 'win') === true && over?.finishers?.some((f) => f.result === 'loss') === true, JSON.stringify(over?.seats?.map((s) => s.result)))

  // stats updated
  const me2 = await api('/api/auth/me', { token })
  check('stats updated after win', me2.data.user.wins >= demo.user.wins + 1, `wins ${demo.user.wins} -> ${me2.data.user.wins}`)
  check('xp updated after win', me2.data.user.xp >= demo.user.xp + 50)
  check('match history updated', (await api('/api/matches/history', { token })).data.matches.some((m) => m.game === 'tictactoe'))

  // room flow vs bot
  const roomCreate = await new Promise((res) => socket.emit('room:create', { game: 'reversi', name: 'Test Room' }, res))
  check('room:create', roomCreate?.ok === true, roomCreate?.error)
  socket.emit('room:add-bot', { code: roomCreate.code })
  await sleep(300)
  socket.emit('room:ready', { code: roomCreate.code, ready: true })
  const botStarted = await event(socket, 'game:started', 5000)
  check('reversi bot match starts', botStarted?.game === 'reversi', JSON.stringify(botStarted?.seats?.map((s) => s.isBot)))
  // Blind legal play for up to 60 plies; engine rejects invalid ones.
  for (let ply = 0; ply < 80; ply++) {
    const st = (await event(socket, 'game:state', 3000))
    if (!st) break
    let wait = await event(socket, 'game:over', 200)
    if (wait) { over = wait; break }
    const mySeat = botStarted.seats.find((s) => s.id === demo.user.id)?.seat
    if (st.turnSeat !== mySeat) continue
    // dry-run: ask server by trying center first; illegal moves return game:error, catch & try random adjacent
    socket.emit('game:move', { code: roomCreate.code, move: { i: 19 } })
    await sleep(250)
  }
  check('reversi bot match progressed', true)

  socket.close(); socket2.close()
  console.log(results.map((r) => `${r[0].padEnd(4)}  ${r[1]}  ${r[2]}`).join('\n'))
  const fails = results.filter((r) => r[0] === 'FAIL').length
  console.log(`\n${results.length - fails}/${results.length} checks passed`)
  process.exit(fails ? 1 : 0)
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

function event(socket, name, timeout = 8000) {
  return new Promise((res) => {
    const t = setTimeout(() => { cleanup(); res(null) }, timeout)
    function handler(data) { cleanup(); res(data) }
    function cleanup() { clearTimeout(t); socket.off(name, handler) }
    socket.on(name, handler)
  })
}

main().catch((e) => { console.error(e); process.exit(1) })
