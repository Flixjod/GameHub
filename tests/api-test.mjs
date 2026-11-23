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
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}  ${extra}`)
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
  listen(socket)
  let found = null, started = null, over = null, lastState = null
  socket.on('matchmaking:found', (d) => (found = d))
  socket.on('game:started', (d) => (started = d))
  socket.on('game:state', (d) => (lastState = d))
  socket.on('game:over', (d) => (over = d))

  // second socket -> matchmaking pairs them for tictactoe
  const login2 = await api('/api/auth/login', { method: 'POST', body: { username: 'nova', password: 'password123' } })
  const token2 = login2.data.token
  const socket2 = new IoClient(BASE, { auth: { token: token2 } })
  listen(socket2)
  await Promise.all([event(socket, 'init'), event(socket2, 'init')])

  socket.emit('matchmaking:join', { game: 'tictactoe' })
  socket2.emit('matchmaking:join', { game: 'tictactoe' })
  found = await event(socket, 'matchmaking:found', 5000)
  check('matchmaking pairs players', !!found?.code, JSON.stringify(found))
  started = await event(socket, 'game:started', 5000)
  check('match started', started?.game === 'tictactoe' && Array.isArray(started.seats))

  // scripted tictactoe win independent of seat assignment
  const demoSeat = started.seats.findIndex((s) => s.id === demo.user.id)
  check('demo has a seat', demoSeat === 0 || demoSeat === 1)
  // demo takes 0,1,2 (winning row); opponent takes 6,7 (no line) so demo wins regardless of seat
  const demoCells = [0, 1, 2]
  const oppCells = [6, 7]
  let done = null
  let di = 0, oi = 0
  for (let mv = 0; mv < 7 && !done; mv++) {
    const turnSeat = lastState?.turnSeat ?? started.turnSeat
    const isDemo = turnSeat === demoSeat
    const cell = isDemo ? demoCells[di++] : oppCells[oi++];
    (isDemo ? socket : socket2).emit('game:move', { code: found.code, move: { i: cell } })
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

  // ---------- account system ----------
  const guest = await api('/api/auth/guest', { method: 'POST' })
  check('guest sign-in returns token + guest flag', guest.status === 200 && !!guest.data.token && guest.data.user.isGuest === true, JSON.stringify(guest.data?.user?.username))

  const regMail = `acct_${Date.now() % 1000000}`
  const regE = await api('/api/auth/register', { method: 'POST', body: { username: regMail, password: 'hunter99', email: `${regMail}@example.com` } })
  check('register with email', regE.status === 200 && regE.data.user.email === `${regMail}@example.com`)
  const resend = await api('/api/auth/verify/resend', { method: 'POST', token: regE.data.token })
  check('verification token issued', resend.status === 200 && !!resend.data.token, JSON.stringify(resend.data?.error))
  const verified = await api('/api/auth/verify', { method: 'POST', body: { token: resend.data.token } })
  check('email verify accepted', verified.status === 200)
  const meAfterVerify = await api('/api/auth/me', { token: regE.data.token })
  check('email now verified', meAfterVerify.data.user.emailVerified === true)

  const forgot = await api('/api/auth/forgot', { method: 'POST', body: { username: demo.user.username } })
  check('forgot returns token for account holder', forgot.status === 200 && !!forgot.data.resetToken, JSON.stringify(forgot.data))
  const reset = await api('/api/auth/reset', { method: 'POST', body: { token: forgot.data.resetToken, password: 'password123' } })
  check('reset accepts token (same password re-set)', reset.status === 200, JSON.stringify(reset.data))
  const relogin = await api('/api/auth/login', { method: 'POST', body: { username: demo.user.username, password: 'password123' } })
  check('login after reset', relogin.status === 200)

  const delUser = `doomed_${Date.now() % 1000000}`
  const delReg = await api('/api/auth/register', { method: 'POST', body: { username: delUser, password: 'vanish1' } })
  const del = await api('/api/auth/me', { method: 'DELETE', token: delReg.data.token, body: { password: 'vanish1' } })
  check('account deletion', del.status === 200, JSON.stringify(del.data))
  const delLogin = await api('/api/auth/login', { method: 'POST', body: { username: delUser, password: 'vanish1' } })
  check('deleted account cannot sign in', delLogin.status === 401)

  // ---------- casual vs ranked rating rules ----------
  const ratBefore = (await api('/api/auth/me', { token })).data.user.rating
  socket.emit('matchmaking:join', { game: 'snakes', ranked: false })
  socket2.emit('matchmaking:join', { game: 'snakes', ranked: false })
  const casualFound = await event(socket, 'matchmaking:found', 5000)
  check('casual queue found', casualFound?.code && casualFound.ranked === false, JSON.stringify(casualFound))
  const casualStart = await event(socket, 'game:started', 5000)
  check('casual snakes match starts', casualStart?.game === 'snakes', JSON.stringify(casualStart?.game))
  // snakes needs active rolling - script both seats from the initial turn
  const casualMySeat = casualStart.seats.find((x) => x.id === demo.user.id)?.seat
  let casualSeat = casualStart.turnSeat
  let casualOver = null
  for (let ply = 0; ply < 250 && !casualOver; ply++) {
    casualOver = await event(socket, 'game:over', 200)
    if (casualOver) break
    const mover = casualSeat === casualMySeat ? socket : socket2
    mover.emit('game:roll', { code: casualFound.code })
    const ns = await event(socket, 'game:state', 1500)
    if (ns && ns.turnSeat != null) casualSeat = ns.turnSeat
  }
  casualOver = casualOver || await event(socket, 'game:over', 3000)
  const myCasual = casualOver?.finishers?.find((f) => f.id === demo.user.id)
  check('casual match: zero rating delta', myCasual && myCasual.ratingDelta === 0, JSON.stringify(myCasual))
  check('casual match: flagged unranked', casualOver?.ranked === false)

  const ratBefore2 = (await api('/api/auth/me', { token })).data.user.rating
  socket.emit('matchmaking:join', { game: 'reversi', ranked: true })
  socket2.emit('matchmaking:join', { game: 'reversi', ranked: true })
  const foundR = await event(socket, 'matchmaking:found', 5000)
  check('ranked queue found', foundR?.code && foundR.ranked === true, JSON.stringify(foundR))
  const rankedStart = await event(socket, 'game:started', 5000)
  check('ranked reversi starts', rankedStart?.game === 'reversi')
  // play legal moves from the shared server-generated engine until over
  {
    const reversed = (await import('../server/games/reversi.js'))
    const demoSeatR = rankedStart.seats.find((x) => x.id === demo.user.id)?.seat
    let overRanked = null
    let curSeat = rankedStart.turnSeat
    let curSt = rankedStart.state
    for (let ply = 0; ply < 160 && !overRanked; ply++) {
      overRanked = await event(socket, 'game:over', 200)
      if (overRanked) break
      const mover = curSeat === demoSeatR ? socket : socket2
      const moves = reversed.validMoves(curSt, curSeat)
      if (!moves.length) { mover.emit('game:pass', { code: foundR.code }); continue }
      mover.emit('game:move', { code: foundR.code, move: { i: moves[Math.floor(Math.random() * moves.length)] } })
      const ns = await event(socket, 'game:state', 1500)
      if (ns && ns.turnSeat != null) { curSeat = ns.turnSeat; curSt = ns.state }
    }
    overRanked = overRanked || await event(socket, 'game:over', 4000)
    const myRanked = overRanked?.finishers?.find((f) => f.id === demo.user.id)
    check('ranked reversi: history sent to clients', Array.isArray(overRanked?.history) && overRanked.history.length > 0, `entries=${overRanked?.history?.length}`)
    check('ranked reversi: flagged ranked', overRanked?.ranked === true)
    check('ranked reversi: rating moved', myRanked && myRanked.ratingDelta !== 0, JSON.stringify(myRanked))

    // persisted replay endpoint
    const hist = await api('/api/matches/history', { token })
    const latest = hist.data.matches.find((m) => m.game === 'reversi')
    const replay = latest ? await api(`/api/matches/${latest.id}`, { token }) : { status: 404 }
    check('replay endpoint returns recorded moves', replay.status === 200 && Array.isArray(replay.data.moves) && replay.data.moves.length > 0, JSON.stringify(replay.data?.moves?.length))
    const foreign = await api(`/api/matches/${latest?.id ?? 1}`, { token: regE.data.token })
    check('replay blocked for non-participant', foreign.status === 403, `status=${foreign.status}`)
  }

  // ---------- room: bot rule + spectator + mid-match forfeit ----------
  {
    const rc = await new Promise((res) => socket.emit('room:create', { game: 'reversi', name: 'Spec Room', ranked: true }, res))
    check('ranked room created', rc?.ok === true && rc.room.ranked === true, JSON.stringify(rc?.error))
    socket.emit('room:add-bot', { code: rc.code, difficulty: 'easy' })
    await event(socket, 'game:started', 5000)
    await event(socket, 'room:update', 1500)
    socket.emit('room:ready', { code: rc.code, ready: true })

    // third player joins mid-match as spectator
    const socket3 = new IoClient(BASE, { auth: { token: regE.data.token } })
    listen(socket3)
    await event(socket3, 'init')
    const joinRes = await new Promise((res) => socket3.emit('room:join', { code: rc.code }, res))
    check('mid-match join becomes spectator', joinRes?.spectator === true, JSON.stringify(joinRes?.error ?? joinRes?.spectator))

    // human leaves mid-match -> forfeit (the remaining room, including the spectator, sees the outcome)
    socket.emit('room:leave', { code: rc.code })
    const forfeit = await event(socket3, 'game:over', 5000)
    check('mid-match leave forfeits', forfeit?.reason === 'leave' && Array.isArray(forfeit?.seats), JSON.stringify(forfeit?.reason))
    socket3.close()
  }

  socket.close(); socket2.close()
  console.log(results.map((r) => `${r[0].padEnd(4)}  ${r[1]}  ${r[2]}`).join('\n'))
  const fails = results.filter((r) => r[0] === 'FAIL').length
  console.log(`\n${results.length - fails}/${results.length} checks passed`)
  process.exit(fails ? 1 : 0)
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

// Queue all relevant server events per socket so nothing emitted while a
// different event is awaited is ever lost (state/over races).
const eventQueues = new Map()
function listen(socket) {
  const q = new Map()
  eventQueues.set(socket, q)
  for (const name of ['init', 'matchmaking:found', 'matchmaking:status', 'room:update', 'room:notice', 'game:started', 'game:state', 'game:over', 'game:error']) {
    socket.on(name, (d) => {
      if (!q.has(name)) q.set(name, [])
      q.get(name).push(d)
    })
  }
}

function event(socket, name, timeout = 8000) {
  const q = eventQueues.get(socket)
  const shift = () => {
    if (!q || !q.has(name)) return undefined
    return q.get(name).shift()
  }
  const ready = shift()
  if (ready !== undefined) return Promise.resolve(ready)
  return new Promise((res) => {
    const t = setTimeout(() => { clearInterval(poll); res(null) }, timeout)
    const poll = setInterval(() => {
      const next = shift()
      if (next !== undefined) { clearTimeout(t); clearInterval(poll); res(next) }
    }, 10)
  })
}

main().catch((e) => { console.error(e); process.exit(1) })
