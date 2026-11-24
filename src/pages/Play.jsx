import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Loader2, DoorOpen, Bot, Zap, Users, LogOut, CheckCircle2,
  Timer, Swords, RotateCcw, Gamepad2, ArrowLeft, Copy, Globe2, WifiOff, Cpu,
  Eye, Undo2, ChevronDown, History, Sparkles, Shuffle, UserPlus, Link2,
} from 'lucide-react'
import { api } from '../lib/api.js'
import { useAuth, useSocket, useToast } from '../store.jsx'
import { Pic, Badge, Button, Card, VerifiedIcon, EmptyState, Modal, Skeleton } from '../components/UI.jsx'
import TicTacToeBoard from '../components/boards/TicTacToeBoard.jsx'
import ReversiBoard from '../components/boards/ReversiBoard.jsx'
import LudoBoard from '../components/boards/LudoBoard.jsx'
import SnakesBoard from '../components/boards/SnakesBoard.jsx'
import { GAME_ART } from '../components/GameArt.jsx'
import { useRooms } from '../components/GameCard.jsx'
import LocalMatch from '../components/game/LocalMatch.jsx'
import MatchReview from '../components/game/MatchReview.jsx'
import { usePref } from '../lib/prefs.js'

const GAME_META = {
  tictactoe: { name: 'TicTacToe', tagline: 'Think. Win.' },
  reversi: { name: 'Reversi', tagline: 'Flip. Conquer. Win.' },
  ludo: { name: 'Ludo', tagline: 'Roll. Move. Win.' },
  snakes: { name: 'Snake & Ladder', tagline: 'Climb. Don’t Fall.' },
}

const TABLE_NAMES = [
  'Emerald Table', 'Obsidian Lounge', 'Cyan Parlor', 'Golden Arcade',
  'Velvet Arena', 'Neon Salon', 'Royal Stage', 'Midnight Cube',
]
const randomTableName = () => TABLE_NAMES[Math.floor(Math.random() * TABLE_NAMES.length)]

const SEAT_COLORS = [
  { name: 'Emerald', color: '#10e58a' },
  { name: 'Rose', color: '#f43f5e' },
  { name: 'Amber', color: '#eab308' },
  { name: 'Azure', color: '#3b82f6' },
]

const TURN_SECONDS = 45
const AI_LEVELS = {
  easy: { label: 'Easy', bot: 'Casual AI' },
  normal: { label: 'Medium', bot: 'Strategist AI' },
  best: { label: 'Hard', bot: 'Master AI' },
}

export default function Play() {
  const { gameId } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const { socket, connected } = useSocket()
  const toast = useToast()

  const meta = GAME_META[gameId]
  const isReversi = gameId === 'reversi'
  const [phase, setPhase] = useState('lobby') // lobby | searching | found | waiting | playing | playing-local | over
  const [modePanel, setModePanel] = useState(null) // null | 'online' | 'local' | 'ai'
  const [onlineKind, setOnlineKind] = useState('ranked')
  const [searchSeconds, setSearchSeconds] = useState(0)
  const [found, setFound] = useState(null) // { code, ranked }
  const [room, setRoom] = useState(null)
  const [gameState, setGameState] = useState(null)
  const [seats, setSeats] = useState(null)
  const [turnSeat, setTurnSeat] = useState(null)
  const [lastEvent, setLastEvent] = useState(null)
  const [lastError, setLastError] = useState(null)
  const [result, setResult] = useState(null)
  const [notice, setNotice] = useState(null)
  const [chat, setChat] = useState([])
  const [turnClock, setTurnClock] = useState(TURN_SECONDS)
  const [spectator, setSpectator] = useState(false)
  const [review, setReview] = useState(null) // { moves, seats }
  const [localConfig, setLocalConfig] = useState(null)
  const [boardTheme, setBoardTheme] = usePref('gh:board-theme-reversi', 'emerald')
  const [recentLocal, setRecentLocal] = useState([])
  const [rulesOpen, setRulesOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const stateRef = useRef(null)
  stateRef.current = { room, gameState, turnSeat, phase, spectator }
  const autoFlowDone = useRef(false)

  const mySeat = seats ? seats.findIndex((s) => s.id === user?.id) : -1
  const myTurn = phase === 'playing' && gameState && !spectator && turnSeat === mySeat

  useEffect(() => {
    try {
      setRecentLocal(JSON.parse(localStorage.getItem('gh:local-matches') || '[]').filter((m) => m.gameId === gameId).slice(0, 4))
    } catch { setRecentLocal([]) }
  }, [gameId, phase])

  const reset = useCallback(() => {
    setRoom(null); setGameState(null); setSeats(null); setTurnSeat(null)
    setLastEvent(null); setResult(null); setNotice(null); setChat([])
    setLastError(null); setSpectator(false); setFound(null)
  }, [])

  // -------- socket events --------
  useEffect(() => {
    if (!socket) return
    const onRoomUpdate = (r) => {
      if (!stateRef.current.room || stateRef.current.room.code !== r.code) return
      setRoom(r)
    }
    const onGameStarted = (d) => {
      if (d.game !== gameId) return
      if (stateRef.current.room && stateRef.current.room.code !== d.code) return
      setPhase('playing')
      setFound(null)
      setGameState(d.state)
      setSeats(d.seats)
      setTurnSeat(d.turnSeat)
      setResult(null)
      setLastEvent(null)
      toast('Match started — good luck! ⚔️', 'success')
    }
    const onMatchFound = (d) => {
      if (d.game !== gameId) return
      setFound({ code: d.code, ranked: !!d.ranked })
      setPhase('found')
      setSearchSeconds(0)
    }
    const onGameState = (d) => {
      if (!stateRef.current.room || stateRef.current.room.code !== d.code) return
      setGameState(d.state)
      setTurnSeat(d.turnSeat)
      if (d.event) setLastEvent(d.event)
    }
    const onGameOver = (d) => {
      const cur = stateRef.current.room
      if (!cur || cur.code !== d.code) return
      setResult(d)
      setPhase('over')
      refreshUser()
    }
    const onGameError = (d) => {
      setLastError(d.error)
      toast(d.error, 'error')
      setTimeout(() => setLastError(null), 2600)
    }
    const onNotice = (d) => setNotice(d.message)
    const onChat = (m) => setChat((c) => [...c.slice(-40), m])
    const onmmStatus = (d) => {
      if (d.state === 'idle' && stateRef.current.phase === 'searching') {
        setPhase('lobby')
        setModePanel('online')
        toast('Matchmaking left', 'info')
      }
    }

    socket.on('room:update', onRoomUpdate)
    socket.on('matchmaking:found', onMatchFound)
    socket.on('matchmaking:status', onmmStatus)
    socket.on('game:started', onGameStarted)
    socket.on('game:state', onGameState)
    socket.on('game:over', onGameOver)
    socket.on('game:error', onGameError)
    socket.on('room:notice', onNotice)
    socket.on('room:chat', onChat)
    return () => {
      socket.off('room:update', onRoomUpdate)
      socket.off('matchmaking:found', onMatchFound)
      socket.off('matchmaking:status', onmmStatus)
      socket.off('game:started', onGameStarted)
      socket.off('game:state', onGameState)
      socket.off('game:over', onGameOver)
      socket.off('game:error', onGameError)
      socket.off('room:notice', onNotice)
      socket.off('room:chat', onChat)
    }
  }, [socket, gameId, refreshUser, toast])

  // matchmaking elapsed timer
  useEffect(() => {
    if (phase !== 'searching') return
    setSearchSeconds(0)
    const t = setInterval(() => setSearchSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [phase])

  // turn clock
  useEffect(() => {
    setTurnClock(TURN_SECONDS)
    if (phase !== 'playing') return
    const t = setInterval(() => setTurnClock((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [phase, turnSeat, gameState?.turn])

  // deep links: ?bot=1, ?room=CODE, ?ai=DIFFICULTY
  useEffect(() => {
    if (!socket || !user || autoFlowDone.current) return
    const roomCode = params.get('room')
    const aiLevel = params.get('ai')
    if (aiLevel && AI_LEVELS[aiLevel]) {
      autoFlowDone.current = true
      setLocalConfig({
        mode: 'ai', difficulty: aiLevel, humanSeat: 0, allowUndo: true, hints: true,
        names: ['You', AI_LEVELS[aiLevel].bot],
      })
      setPhase('playing-local')
    } else if (params.get('bot') === '1') {
      autoFlowDone.current = true
      setPhase('waiting')
      socket.emit('room:create', { game: gameId, name: `${user.displayName}’s Booth`, isPrivate: true }, (res) => {
        if (res?.error) { toast(res.error, 'error'); setPhase('lobby'); autoFlowDone.current = false; return }
        socket.emit('room:add-bot', { code: res.code })
        socket.emit('room:ready', { code: res.code, ready: true })
      })
    } else if (roomCode) {
      autoFlowDone.current = true
      setPhase('waiting')
      socket.emit('room:join', { code: roomCode }, (res) => {
        if (res?.error) {
          toast(res.error, 'error')
          setPhase('lobby')
          autoFlowDone.current = false
          return
        }
        setRoom(res.room)
        setSpectator(!!res.spectator)
        if (res.state) {
          setGameState(res.state)
          setSeats(res.seatsInGame)
          setTurnSeat(res.state.turn)
          setPhase('playing')
          if (res.spectator) toast('Match in progress — you are spectating.', 'info')
        } else {
          setPhase('waiting')
        }
      })
    }
  }, [socket, user, params, gameId, toast])

  const onRoll = useCallback(() => {
    socket?.emit('game:roll', { code: stateRef.current.room?.code })
  }, [socket])

  const onMove = useCallback((mv) => {
    socket?.emit('game:move', { code: stateRef.current.room?.code, move: mv })
  }, [socket])

  const onPass = useCallback(() => {
    socket?.emit('game:pass', { code: stateRef.current.room?.code })
  }, [socket])

  if (!meta) {
    return <EmptyState emoji="🕹️" title="Unknown game" body="That game doesn’t exist — pick one from the library." action={<Button onClick={() => navigate('/games')}>Back to games</Button>} />
  }

  const quickMatch = () => {
    setPhase('searching')
    socket.emit('matchmaking:join', { game: gameId, ranked: onlineKind === 'ranked' })
  }
  const cancelSearch = () => {
    socket.emit('matchmaking:cancel', { game: gameId })
    setPhase('lobby')
  }
  const startBotGame = (difficulty) => {
    setPhase('waiting')
    socket.emit('room:create', { game: gameId, name: `${user.displayName}’s Booth`, isPrivate: true }, (res) => {
      if (res?.error) { toast(res.error, 'error'); setPhase('lobby'); return }
      socket.emit('room:add-bot', { code: res.code, difficulty })
      socket.emit('room:ready', { code: res.code, ready: true })
    })
  }
  const createLobby = (opts = {}) => {
    socket.emit('room:create', {
      game: gameId,
      name: opts.name || randomTableName(),
      isPrivate: opts.isPrivate ?? false,
      ranked: opts.ranked ?? onlineKind === 'ranked',
      maxPlayers: opts.maxPlayers,
    }, (res) => {
      if (res?.error) return toast(res.error, 'error')
      setRoom(res.room)
      setPhase('waiting')
    })
  }
  const joinByCode = (code, cb) => {
    socket.emit('room:join', { code }, (res) => {
      if (res?.error) return cb?.(res.error)
      setRoom(res.room)
      setSpectator(!!res.spectator)
      if (res.state) {
        setGameState(res.state)
        setSeats(res.seatsInGame)
        setTurnSeat(res.state.turn)
        setPhase('playing')
      } else {
        setPhase('waiting')
      }
      cb?.(null)
    })
  }
  const leaveCurrentRoom = () => {
    if (stateRef.current.room) socket.emit('room:leave', { code: stateRef.current.room.code })
    reset()
    autoFlowDone.current = false
    setPhase('lobby')
  }
  const toggleReady = () => {
    const r = stateRef.current.room
    if (!r) return
    const me = r.players.find((p) => p.id === user?.id)
    socket.emit('room:ready', { code: r.code, ready: !me?.ready })
  }
  const isReady = () => room?.players.find((p) => p.id === user?.id)?.ready
  const isHost = room?.hostId === user?.id

  const art = GAME_ART[gameId] || GAME_ART.more
  const winRate = user && user.gamesPlayed ? Math.round((user.wins / user.gamesPlayed) * 100) : 0

  const backFromPanel = () => setModePanel(null)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => (phase === 'playing-local' ? undefined : navigate('/games'))} className="rounded-xl border border-line p-2.5 text-ink-dim transition hover:border-emerald-neon/40 hover:text-ink cursor-pointer" aria-label="Back to games" style={phase === 'playing-local' ? { display: 'none' } : undefined}>
          <ArrowLeft size={17} />
        </button>
        {phase !== 'playing-local' && (
          <>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl text-2xl border border-line-2" style={{ background: 'linear-gradient(140deg, #0f1a15, #0a0f0d)' }}>{art.emoji}</span>
            <div>
              <h1 className="text-xl font-extrabold leading-tight">{meta.name}</h1>
              <p className="text-xs text-ink-faint">{meta.tagline}</p>
            </div>
          </>
        )}
        {(phase === 'playing' || phase === 'waiting' || phase === 'searching' || phase === 'found') && (
          <span className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${connected ? 'border border-emerald-neon/30 text-emerald-soft' : 'border border-red-500/30 text-red-300 animate-pulse'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-neon' : 'bg-red-400'}`} />
            {connected ? 'Connected' : 'Reconnecting…'}
          </span>
        )}
      </div>

      {notice && phase !== 'over' && (
        <div className="rounded-xl border border-gold/30 bg-gold/[.06] px-4 py-3 text-sm font-semibold text-amber-200 animate-slide-up">{notice}</div>
      )}
      {lastError && phase !== 'over' && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-300 animate-slide-up">{lastError}</div>
      )}

      {phase === 'lobby' && !modePanel && (
        <div className="space-y-5 animate-fade-in">
          {isReversi && <ReversiHero user={user} winRate={winRate} onPlay={() => setModePanel('online')} />}
          {isReversi && <ReversiLobbyExtras rulesOpen={rulesOpen} setRulesOpen={setRulesOpen} recentLocal={recentLocal} />}
          <div className="stagger grid gap-4 md:grid-cols-3">
            <ModeCard icon={Globe2} title="Online" bullets={['Ranked Match', 'Casual Match', 'Find Opponent', 'Create / Join Room']} tone="emerald" onClick={() => setModePanel('online')} />
            <ModeCard icon={WifiOff} title="Offline" bullets={['Pass & Play', 'Local 2 Player', 'No account or internet']} tone="cyan" onClick={() => setModePanel('local')} />
            <ModeCard icon={Cpu} title="vs AI" bullets={['Easy — Casual', 'Medium — Strategist', 'Hard — Master']} tone="royal" onClick={() => setModePanel('ai')} />
          </div>
        </div>
      )}

      {phase === 'lobby' && modePanel === 'online' && (
        <OnlinePanel
          gameId={gameId}
          onlineKind={onlineKind}
          setOnlineKind={setOnlineKind}
          onBack={backFromPanel}
          onQuick={quickMatch}
          onCreate={createLobby}
          onJoin={joinByCode}
        />
      )}

      {phase === 'lobby' && modePanel === 'local' && (
        <LocalSetup gameId={gameId} onStart={(cfg) => { setLocalConfig(cfg); setPhase('playing-local') }} onBack={backFromPanel} />
      )}

      {phase === 'lobby' && modePanel === 'ai' && (
        <AiSetup gameId={gameId} onStart={(cfg) => { setLocalConfig(cfg); setPhase('playing-local') }} onBack={backFromPanel} />
      )}

      {phase === 'searching' && (
        <Card className="flex flex-col items-center gap-5 py-16 animate-fade-in">
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-emerald-neon/20 animate-ping-ring" />
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-neon/40 bg-emerald-neon/10">
              <Loader2 size={28} className="animate-spin text-emerald-neon" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">Scanning the arena for a worthy rival…</p>
            <p className="mt-1 text-sm text-ink-faint">
              <Badge tone={onlineKind === 'ranked' ? 'gold' : 'cyan'}>{onlineKind === 'ranked' ? 'Ranked' : 'Casual'}</Badge>{' '}
              · searching for {searchSeconds}s
            </p>
          </div>
          <Button variant="outline" onClick={cancelSearch}>Cancel search</Button>
        </Card>
      )}

      {phase === 'found' && found && (
        <Card className="flex flex-col items-center gap-5 py-14 animate-pop-in">
          <span className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-gold/50 bg-gold/10 text-4xl shadow-[0_0_45px_-8px_rgba(234,179,8,.55)]">🎯</span>
          <div className="text-center">
            <h2 className="text-2xl font-extrabold text-gold">Match found!</h2>
            <p className="mt-1 inline-flex items-center gap-2 text-sm text-ink-faint">
              {found.ranked ? <Badge tone="gold">Ranked</Badge> : <Badge tone="cyan">Casual</Badge>} · seating players
            </p>
          </div>
          <p className="inline-flex items-center gap-2 text-sm text-ink-faint"><Loader2 size={14} className="animate-spin text-emerald-neon" /> Seating players — starting now…</p>
        </Card>
      )}

      {phase === 'waiting' && room && (
        <div className="animate-fade-in" >
          <Card className="space-y-5 border-emerald-neon/25 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line pb-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-neon" />
                <span className="text-xs font-semibold text-ink-dim">Room</span>
                <button
                  onClick={() => { navigator.clipboard?.writeText(room.code); toast('Room code copied', 'success') }}
                  className="cursor-pointer rounded-lg border border-line-2 bg-white/[.05] px-2.5 py-0.5 font-mono text-base font-bold tracking-[0.2em] text-emerald-soft transition hover:border-emerald-neon/50"
                  title="Copy room code"
                >{room.code}</button>
                <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold ${
                  room.players.length >= Math.max(2, room.maxPlayers) && room.players.every((p) => p.ready || p.isBot)
                    ? 'border-emerald-neon/40 bg-emerald-neon/10 text-emerald-soft'
                    : 'border-gold/40 bg-gold/10 text-amber-200'}`}
                >
                  {room.players.length >= Math.max(2, room.maxPlayers) && room.players.every((p) => p.ready || p.isBot) ? 'ALL READY' : 'WAITING FOR PLAYERS'}
                </span>
                {room.ranked ? <Badge tone="gold">Ranked</Badge> : <Badge tone="cyan">Casual</Badge>}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard?.writeText(room.code); toast('Room code copied', 'success') }}><Copy size={13} /> Copy code</Button>
                <Button
                  variant="ghost" size="sm"
                  onClick={() => {
                    const link = `${window.location.origin}/play/${room.game}?room=${room.code}`
                    navigator.clipboard?.writeText(link)
                    toast('Invite link copied', 'success')
                  }}
                ><Link2 size={13} /> Copy link</Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: room.maxPlayers }).map((_, idx) => {
                const p = room.players[idx]
                if (!p) {
                  return (
                    <div key={`empty-${idx}`} className="flex min-h-[92px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line-2/70 text-ink-faint">
                      <Users size={18} className="animate-pulse-glow" />
                      <span className="text-[11px] font-semibold">Waiting for player…</span>
                      {isHost && (
                        <button
                          onClick={() => socket.emit('room:add-bot', { code: room.code })}
                          className="cursor-pointer rounded-lg border border-line-2 px-2.5 py-1 text-[10px] font-semibold text-ink-dim transition hover:border-emerald-neon/40 hover:text-ink"
                        >
                          <Bot size={11} className="mr-1 inline" /> Fill with AI
                        </button>
                      )}
                    </div>
                  )
                }
                return <SeatCard key={p.id} p={p} idx={idx} maxPlayers={room.maxPlayers} />
              })}
            </div>

            <p className="text-xs leading-relaxed text-ink-faint">
              {room.playerCount < 2
                ? 'Share the code or copy the invite link — friends get a one-tap invite below.'
                : room.hasBot
                  ? 'Arm up when ready — the match starts the moment every seat is armed.'
                  : 'Arm up — the match starts when every player is armed.'}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <Button variant="danger" onClick={leaveCurrentRoom}><LogOut size={15} /> Leave lobby</Button>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setInviteOpen(true)}><UserPlus size={15} /> Invite friends</Button>
                {isHost && room.hasBot && (
                  <Button variant="outline" onClick={() => socket.emit('room:kick-bot', { code: room.code })}><Gamepad2 size={15} /> Remove AI</Button>
                )}
                {!spectator && (
                  <Button onClick={toggleReady} className="min-w-[170px]">
                    <CheckCircle2 size={16} /> {isReady() ? 'Unready' : 'Ready up'}
                  </Button>
                )}
                {spectator && <Badge tone="cyan">Spectating — match in progress</Badge>}
              </div>
            </div>
          </Card>

          <InviteFriendsModal
            open={inviteOpen}
            room={room}
            onClose={() => setInviteOpen(false)}
          />
        </div>
      )}

      {phase === 'playing-local' && localConfig && (
        <LocalMatch
          gameId={gameId}
          mode={localConfig.mode}
          config={localConfig}
          onExit={() => { setLocalConfig(null); setPhase('lobby'); setModePanel(null) }}
        />
      )}

      {phase === 'playing' && gameState && seats && (
        <div className="grid gap-5 lg:grid-cols-[1fr_290px]">
          <div className="min-w-0">
            <div className="mb-4 flex items-center justify-between rounded-xl border border-line bg-white/[.02] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Pic user={seats[turnSeat]} size={34} />
                <div>
                  <p className="text-[13px] font-bold leading-tight">
                    {spectator ? <span className="text-cyber-cyan"><Eye size={13} className="mr-1 inline" /> Spectating live</span>
                      : myTurn ? <span className="text-emerald-neon text-glow">Your turn — {gameId === 'ludo' && gameState.roll == null ? 'roll the dice!' : 'make your move'}</span>
                      : <span>{seats[turnSeat]?.displayName}{seats[turnSeat]?.isBot ? ' (bot)' : ''} is deciding…</span>}
                  </p>
                  <p className="text-[10px] text-ink-faint">
                    {seats.map((s, i) => `${SEAT_COLORS[i % 4].name}: ${s.displayName}`).join(' · ')}
                  </p>
                </div>
              </div>
              {!spectator && (
                <div className={`flex items-center gap-1.5 font-mono text-sm font-bold ${turnClock <= 10 ? 'text-red-300 animate-pulse' : 'text-ink-dim'}`} title="Turn timer">
                  <Timer size={14} />
                  {String(Math.floor(turnClock / 60)).padStart(2, '0')}:{String(turnClock % 60).padStart(2, '0')}
                </div>
              )}
            </div>

            {gameId === 'tictactoe' && <TicTacToeBoard state={gameState} mySeat={mySeat} playing={myTurn} onMove={onMove} lastEvent={lastEvent} />}
            {gameId === 'reversi' && <ReversiBoard state={gameState} mySeat={spectator ? 0 : mySeat} playing={myTurn} onMove={onMove} onPass={onPass} theme={boardTheme} lastFlips={lastEvent?.flips || null} showHints />}
            {gameId === 'ludo' && <LudoBoard state={gameState} mySeat={mySeat} playing={myTurn} onMove={onMove} onRoll={onRoll} />}
            {gameId === 'snakes' && <SnakesBoard state={gameState} mySeat={mySeat} playing={myTurn} onRoll={onRoll} />}
          </div>

          <div className="space-y-4">
            <Card className="p-4">
              <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-faint"><Users size={13} /> Match players</h4>
              <div className="space-y-2.5">
                {seats.map((s) => (
                  <div key={s.seat} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 ${turnSeat === s.seat ? 'border-emerald-neon/50 bg-emerald-neon/[.06]' : 'border-line bg-white/[.02]'}`}>
                    <Pic user={s} size={30} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 truncate text-xs font-bold">{s.displayName} {s.isVerified ? <VerifiedIcon size={11} /> : null}</p>
                      <p className="text-[10px] text-ink-faint">{SEAT_COLORS[s.seat % 4].name} · {s.rating} elo</p>
                    </div>
                    {turnSeat === s.seat && <span className="h-2 w-2 rounded-full bg-emerald-neon animate-pulse-glow" />}
                  </div>
                ))}
              </div>
            </Card>
            {!spectator && (
              <Card className="flex max-h-[300px] flex-col p-4">
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-faint">Room chat</h4>
                <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin-dark pr-1">
                  {chat.length === 0 && <p className="py-4 text-center text-[11px] text-ink-faint">Say hi 👋 — messages go to everyone in the room.</p>}
                  {chat.map((c, i) => (
                    <p key={i} className="text-xs leading-snug">
                      <span className="font-bold text-emerald-soft">{c.from.displayName.split(' ')[0]}</span>{' '}
                      <span className="text-ink-dim">{c.text}</span>
                    </p>
                  ))}
                </div>
                <ChatInput onSend={(text) => socket.emit('room:chat', { code: room?.code, text })} />
              </Card>
            )}
            {!spectator && (
              <div className="flex justify-center">
                <Button variant="danger" size="sm" onClick={() => socket.emit('game:resign', { code: room?.code })}><Swords size={13} /> Resign match</Button>
              </div>
            )}
          </div>
        </div>
      )}

      {phase === 'over' && !result && (
        <EmptyState emoji="🏁" title="Match ended" body="Wrapping up…" action={<Button onClick={() => { leaveCurrentRoom(); setPhase('lobby') }}>Back to lobby</Button>} />
      )}

      <Modal open={phase === 'over' && !!result} onClose={() => {}} title="Match complete" width={520}>
        {result && (
          <div className="space-y-5">
            <div className="text-center">
              <p className="mb-2 text-6xl">{myOutcome(result, user) === 'win' ? '🏆' : myOutcome(result, user) === 'draw' ? '🤝' : '🎲'}</p>
              <h3 className={`text-2xl font-extrabold ${myOutcome(result, user) === 'win' ? 'text-gold' : myOutcome(result, user) === 'draw' ? 'text-cyber-cyan' : ''}`}>
                {myOutcome(result, user) === 'win' ? 'Victory!' : myOutcome(result, user) === 'draw' ? 'Dead heat!' : 'Defeat'}
              </h3>
              <p className="mt-1 flex flex-wrap items-center justify-center gap-2 text-sm text-ink-faint">
                {result.ranked ? <Badge tone="gold">Ranked</Badge> : <Badge tone="cyan">Casual</Badge>}
                {!!result.durationMs && <span>· {formatDuration(result.durationMs)}</span>}
                {result.reason === 'resign' && <span>· won by resignation</span>}
                {result.reason === 'leave' && <span>· opponent left</span>}
              </p>
            </div>
            <div className="space-y-2">
              {result.seats.map((s) => (
                <div key={s.seat} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${s.result === 'win' ? 'border-gold/40 bg-gold/[.06]' : s.result === 'draw' ? 'border-cyber-cyan/30 bg-cyber-cyan/[.05]' : 'border-line bg-white/[.02]'}`}>
                  <Pic user={s} size={34} />
                  <span className="flex-1 truncate text-sm font-bold">{s.displayName}</span>
                  {s.score != null && <span className="font-mono text-sm font-bold text-ink-dim">{s.score}</span>}
                  <Badge tone={s.result === 'win' ? 'gold' : s.result === 'draw' ? 'cyan' : 'dim'}>{s.result === 'win' ? 'Winner' : s.result === 'draw' ? 'Draw' : 'Loss'}</Badge>
                </div>
              ))}
            </div>
            {myFinisher(result, user) && (
              <div className="flex justify-center gap-5 text-sm font-bold">
                <span className="text-emerald-soft">+{myFinisher(result, user).xpDelta} XP</span>
                <span className={myFinisher(result, user).ratingDelta >= 0 ? 'text-emerald-soft' : 'text-red-300'}>
                  {myFinisher(result, user).ratingDelta >= 0 ? '+' : ''}{myFinisher(result, user).ratingDelta} elo
                </span>
                <span className="text-ink-faint">{myFinisher(result, user).ratingAfter} elo after</span>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              {!spectator && (
                <Button className="flex-1" onClick={() => { setPhase('waiting'); setResult(null); setNotice(null) }}><RotateCcw size={15} /> Rematch in room</Button>
              )}
              {result.history?.length > 0 && (
                <Button variant="outline" className="flex-1" onClick={() => setReview({ moves: result.history, seats: result.seats })}><Eye size={15} /> Review match</Button>
              )}
              <Button variant="ghost" onClick={() => { leaveCurrentRoom(); setPhase('lobby') }}><DoorOpen size={15} /> New match</Button>
            </div>
          </div>
        )}
      </Modal>

      {review && (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-[#050807]/97 p-4 md:p-8">
          <MatchReview
            gameId={gameId}
            moves={review.moves}
            seats={review.seats}
            theme={isReversi ? boardTheme : 'emerald'}
            onClose={() => setReview(null)}
          />
        </div>
      )}
    </div>
  )
}

function myOutcome(result, user) {
  const me = result.seats.find((s) => s.id === user?.id)
  return me ? me.result : 'draw'
}
function myFinisher(result, user) {
  return result.finishers?.find((f) => f.id === user?.id) || null
}
function formatDuration(ms) {
  const total = Math.round(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return m ? `${m}m ${s}s` : `${s}s`
}
function readLocalMatches(gameId) {
  try {
    return JSON.parse(localStorage.getItem('gh:local-matches') || '[]').filter((m) => m.gameId === gameId)
  } catch { return [] }
}

// ---------------- Reversi lobby hero ----------------
function ReversiHero({ user, winRate, onPlay }) {
  const rating = user?.rating ?? 1000
  const wins = user?.wins ?? 0
  return (
    <div className="relative overflow-hidden rounded-3xl border border-emerald-neon/20 p-6 md:p-9 animate-fade-in" style={{ background: 'radial-gradient(1100px 420px at -8% -20%, rgba(16,229,138,.13), transparent 55%), radial-gradient(900px 380px at 108% 120%, rgba(34,211,238,.08), transparent 55%), linear-gradient(150deg, #0a120e, #070b09)' }}>
      <div className="flex flex-col items-start gap-8 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <Badge tone="emerald">Reversi · GameHub flagship</Badge>
          <h2 className="mt-3 text-3xl font-black leading-tight md:text-4xl">Master the Board.</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-faint">
            Trap your rival’s discs and flip the whole row. Every corner is a fortress — claim the edges, guard the diagonals and turn the board yours.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-6 border-t border-line pt-4 text-sm">
            <div>
              <p className="font-mono text-xl font-black text-emerald-neon text-glow">{rating}</p>
              <p className="text-[11px] text-ink-faint">Rating</p>
            </div>
            <div>
              <p className="font-mono text-xl font-black">{winRate}%</p>
              <p className="text-[11px] text-ink-faint">Win rate</p>
            </div>
            <div>
              <p className="font-mono text-xl font-black">{wins}</p>
              <p className="text-[11px] text-ink-faint">Reversi wins</p>
            </div>
            <Button onClick={onPlay} size="lg" className="ml-auto"><Zap size={16} /> Play now</Button>
          </div>
        </div>
        <MiniBoard />
      </div>
    </div>
  )
}

function MiniBoard() {
  const cells = useMemo(() => {
    const board = new Array(64).fill(0)
    board[27] = 1; board[28] = 2; board[35] = 2; board[36] = 1
    const highlights = [19, 26, 37, 44]
    return { board, highlights }
  }, [])
  return (
    <div className="hidden shrink-0 rounded-2xl border border-emerald-neon/25 p-2.5 shadow-[0_0_60px_-18px_rgba(16,229,138,.5)] md:block" style={{ background: 'linear-gradient(140deg, #0d2c1d, #081510)' }} aria-hidden="true">
      <div className="grid grid-cols-8 gap-[3px]">
        {cells.board.map((v, i) => (
          <div key={i} className={`relative h-6 w-6 rounded-[5px] ${cells.highlights.includes(i) ? 'bg-emerald-neon/15 ring-1 ring-emerald-neon/40' : 'bg-white/[.03]'} ${i % 8 === 3 || i % 8 === 4 ? 'opacity-95' : ''}`}>
            {(v === 1 || v === 2) && (
              <span className={`disc-drop absolute inset-[2px] rounded-full ${v === 1 ? 'bg-gradient-to-br from-[#1c2b24] to-[#050807] ring-1 ring-black/60' : 'bg-gradient-to-br from-white to-[#9fb8ac]'} shadow-[0_3px_8px_-2px_rgba(0,0,0,.7)]`} />
            )}
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-soft/70">8×8 · dark moves first</p>
    </div>
  )
}

function ReversiLobbyExtras({ rulesOpen, setRulesOpen, recentLocal }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <button className="flex w-full items-center justify-between gap-3 text-left cursor-pointer" onClick={() => setRulesOpen(!rulesOpen)} aria-expanded={rulesOpen}>
          <span className="flex items-center gap-2 text-sm font-bold"><Sparkles size={15} className="text-emerald-neon" /> How to play Reversi</span>
          <ChevronDown size={16} className={`text-ink-faint transition-transform ${rulesOpen ? 'rotate-180' : ''}`} />
        </button>
        {rulesOpen && (
          <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-ink-faint animate-fade-in">
            <li>Reversi plays on an 8×8 board. Dark always moves first.</li>
            <li>Place a disc so it brackets enemy discs between itself and one of your own — in any direction.</li>
            <li>Every bracketed enemy disc flips to your color.</li>
            <li>No legal move? Your turn is passed automatically. If neither player can move, the game ends.</li>
            <li>Most discs when the board fills wins. Corners can never be flipped — fight for them.</li>
          </ul>
        )}
      </Card>
      <Card className="p-5">
        <h4 className="flex items-center gap-2 text-sm font-bold"><History size={15} className="text-cyber-cyan" /> Recent offline matches</h4>
        {recentLocal.length === 0 ? (
          <p className="py-3 text-[11px] text-ink-faint">No offline games on this device yet — try Pass &amp; Play, results save here automatically.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {recentLocal.map((m, i) => (
              <li key={i} className="flex items-center justify-between rounded-lg border border-line bg-white/[.02] px-3 py-2 text-xs">
                <span className="text-ink-dim">{m.names?.join(' vs ')}</span>
                <span className="font-bold text-emerald-soft">{m.scores ? `${m.scores[0]}–${m.scores[1]}` : ''}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

// ---------------- offline local setup ----------------
function LocalSetup({ gameId, onStart, onBack }) {
  const [p1, setP1] = useState('Player 1')
  const [p2, setP2] = useState('Player 2')
  const [allowUndo, setAllowUndo] = useState(true)
  const [hints, setHints] = useState(true)
  const start = () => onStart({ mode: 'local', names: [p1.trim() || 'Player 1', p2.trim() || 'Player 2'], allowUndo, hints })
  return (
    <Card className="animate-fade-in space-y-4 p-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="cursor-pointer rounded-lg border border-line p-2 text-ink-dim transition hover:text-ink" aria-label="Back"><ArrowLeft size={15} /></button>
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><WifiOff size={17} className="text-cyber-cyan" /> Offline · Pass & Play</h2>
          <p className="text-xs text-ink-faint">Two players share one device — turn-based, fully offline, no login required.</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-ink-faint">Player 1 — Dark discs</span>
          <input value={p1} onChange={(e) => setP1(e.target.value)} maxLength={16} className="w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm focus:border-emerald-neon/50" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-ink-faint">Player 2 — Light discs</span>
          <input value={p2} onChange={(e) => setP2(e.target.value)} maxLength={16} className="w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm focus:border-emerald-neon/50" />
        </label>
      </div>
      <ToggleRow allowUndo={allowUndo} setAllowUndo={setAllowUndo} hints={hints} setHints={setHints} />
      <p className="rounded-xl border border-line bg-white/[.02] p-3.5 text-[11.5px] leading-relaxed text-ink-faint">
        A shared-device match is pure pass-and-play — it never touches the network. True device-to-device LAN play would require WebRTC signaling (a server component), so GameHub implements LAN gaming through <strong className="text-ink-dim">online rooms</strong>: on the same network, open GameHub from the other device at this machine’s local address and join with the room code.
      </p>
      <Button size="lg" onClick={start}><Gamepad2 size={16} /> Start local match</Button>
    </Card>
  )
}

function AiSetup({ gameId, onStart, onBack }) {
  const [difficulty, setDifficulty] = useState('normal')
  const [humanSeat, setHumanSeat] = useState(0)
  const [allowUndo, setAllowUndo] = useState(true)
  const [hints, setHints] = useState(true)
  const seatChoices = [{ v: 0, d: 'Dark' }, { v: 1, d: 'Light' }]
  const start = () => onStart({ mode: 'ai', difficulty, humanSeat, allowUndo, hints, names: ['You', AI_LEVELS[difficulty].bot] })
  return (
    <Card className="animate-fade-in space-y-4 p-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="cursor-pointer rounded-lg border border-line p-2 text-ink-dim transition hover:text-ink" aria-label="Back"><ArrowLeft size={15} /></button>
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><Cpu size={17} className="text-[#b79dfb]" /> Play vs AI</h2>
          <p className="text-xs text-ink-faint">Three engines with genuinely different strength — pick your poison.</p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {Object.entries(AI_LEVELS).map(([key, lvl]) => (
          <button key={key} onClick={() => setDifficulty(key)}
            className={`cursor-pointer rounded-xl border p-4 text-left transition ${difficulty === key ? 'border-royal/60 bg-royal/[.08]' : 'border-line bg-white/[.02] hover:border-royal/30'}`}>
            <div className="flex items-center gap-2">
              <Bot size={15} className={difficulty === key ? 'text-[#b79dfb]' : 'text-ink-faint'} />
              <span className="text-sm font-bold">{lvl.label}</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
              {key === 'easy' ? 'Mostly random legal moves with occasional corner grabs — great for beginners.'
                : key === 'normal' ? 'Positional evaluation with limited-depth search; avoids X/C squares and fights mobility.'
                : 'Negamax + alpha-beta, move ordering, adaptive depth and an exact endgame solver.'}
            </p>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-faint">You play as</p>
          <div className="flex gap-2">
            {seatChoices.map((c) => (
              <button key={c.v} onClick={() => setHumanSeat(c.v)}
                className={`cursor-pointer rounded-lg border px-4 py-2 text-xs font-bold transition ${humanSeat === c.v ? 'border-emerald-neon/50 bg-emerald-neon/10 text-emerald-soft' : 'border-line text-ink-faint hover:text-ink'}`}>
                {c.d} {gameId === 'reversi' ? 'discs' : 'X/O'}
              </button>
            ))}
          </div>
        </div>
      </div>
      <ToggleRow allowUndo={allowUndo} setAllowUndo={setAllowUndo} hints={hints} setHints={setHints} />
      <p className="text-[11px] text-ink-faint">Runs entirely on your device — instant moves, offline-capable. Undo steps back your last turn (and the AI’s reply).</p>
      <Button size="lg" onClick={start}><Swords size={16} /> Challenge the AI</Button>
    </Card>
  )
}

function ToggleRow({ allowUndo, setAllowUndo, hints, setHints }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={() => setAllowUndo(!allowUndo)} className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition ${allowUndo ? 'border-emerald-neon/40 bg-emerald-neon/[.08] text-emerald-soft' : 'border-line text-ink-faint'}`}>
        <Undo2 size={13} /> Allow undo
      </button>
      <button onClick={() => setHints(!hints)} className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition ${hints ? 'border-emerald-neon/40 bg-emerald-neon/[.08] text-emerald-soft' : 'border-line text-ink-faint'}`}>
        <Sparkles size={13} /> Show hints
      </button>
    </div>
  )
}

// ---------------- shared bits ----------------
function SeatCard({ p, idx, maxPlayers = 2 }) {
  const seatLabel = maxPlayers > 2 ? `Seat ${idx + 1}` : idx === 0 ? 'Seat 1 · Host' : 'Seat 2'
  return (
    <div className="rounded-2xl border bg-black/40 p-4 transition" style={{ borderColor: p.ready ? SEAT_COLORS[idx % 4].color + '55' : 'var(--line)' }}>
      <div className="mb-2.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider">
        <span className="text-ink-faint">{seatLabel}</span>
        <span style={{ color: p.ready ? SEAT_COLORS[idx % 4].color : '#eab308' }}>
          {p.ready ? '● READY' : '○ WAITING'}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Pic user={p} size={42} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 truncate text-sm font-bold">{p.displayName} {p.isVerified ? <VerifiedIcon size={12} /> : null}</p>
          <p className="mt-0.5 font-mono text-[10px] text-ink-faint">
            {p.isBot ? `HOUSE AI · ${p.rating ?? 1000} elo` : `@${p.username} · ${p.rating ?? 1000} elo`}
            {!p.isBot && p.disconnected ? <span className="ml-1.5 font-semibold text-red-300">· reconnecting…</span> : null}
          </p>
        </div>
        <span className="rounded-lg px-2.5 py-1 text-[10px] font-bold" style={{ background: SEAT_COLORS[idx % 4].color + '1c', color: SEAT_COLORS[idx % 4].color, border: `1px solid ${SEAT_COLORS[idx % 4].color}44` }}>
          {SEAT_COLORS[idx % 4].name}
        </span>
      </div>
    </div>
  )
}

function OnlinePanel({ gameId, onlineKind, setOnlineKind, onBack, onQuick, onCreate, onJoin }) {
  const rooms = useRooms()
  const [name, setName] = useState(randomTableName)
  const [access, setAccess] = useState('open')
  const [seatCount, setSeatCount] = useState(2)
  const [code, setCode] = useState('')
  const [joinError, setJoinError] = useState(null)
  const navigate = useNavigate()
  const multiSeat = gameId === 'ludo' || gameId === 'snakes'
  const openTables = rooms.filter((r) => r.game === gameId && !r.inGame)

  const submitJoin = (e) => {
    e?.preventDefault()
    setJoinError(null)
    onJoin(code.trim().toUpperCase(), (err) => {
      if (err) setJoinError(err)
      else setCode('')
    })
  }

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="cursor-pointer rounded-lg border border-line p-2 text-ink-dim transition hover:text-ink" aria-label="Back"><ArrowLeft size={15} /></button>
        <div>
          <h2 className="text-lg font-bold">Online multiplayer</h2>
          <p className="text-xs text-ink-faint">Host a table, join a friend's lobby, or let matchmaking pair you.</p>
        </div>
        <div className="ml-auto inline-flex rounded-xl border border-line bg-black/60 p-1 gap-1">
          <button onClick={() => setOnlineKind('casual')} className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${onlineKind === 'casual' ? 'border border-cyber-cyan/40 bg-cyber-cyan/15 text-cyber-cyan' : 'text-ink-faint hover:text-ink'}`}>Casual</button>
          <button onClick={() => setOnlineKind('ranked')} className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${onlineKind === 'ranked' ? 'border border-gold/40 bg-gold/15 text-amber-200' : 'text-ink-faint hover:text-ink'}`}>Ranked</button>
        </div>
      </div>

      <div className="grid items-stretch gap-4 md:grid-cols-2">
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-soft">Create lobby</span>
            <span className="font-mono text-[10px] text-ink-faint">HOST TABLE</span>
          </div>
          <div>
            <label htmlFor="gh-table-name" className="mb-1.5 block text-[10px] uppercase tracking-wider text-ink-faint">Table name</label>
            <div className="flex gap-2">
              <input
                id="gh-table-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={32}
                className="min-w-0 flex-1 rounded-xl border border-line bg-black/60 px-3 py-2 text-xs focus:border-emerald-neon/50 focus:outline-none"
              />
              <button
                onClick={() => setName(randomTableName())}
                className="cursor-pointer rounded-xl border border-line px-2.5 py-2 text-xs text-ink-dim transition hover:border-emerald-neon/40 hover:text-ink"
                title="Shuffle table name"
              ><Shuffle size={13} /></button>
            </div>
          </div>
          {multiSeat && (
            <div>
              <label htmlFor="gh-table-seats" className="mb-1.5 block text-[10px] uppercase tracking-wider text-ink-faint">Seats</label>
              <select
                id="gh-table-seats"
                value={seatCount}
                onChange={(e) => setSeatCount(Number(e.target.value))}
                className="w-full rounded-xl border border-line bg-black/60 px-2.5 py-2 text-xs focus:border-emerald-neon/50 focus:outline-none"
              >
                <option value={2}>2 players · duel</option>
                <option value={3}>3 players · triple</option>
                <option value={4}>4 players · Ludo King style</option>
              </select>
            </div>
          )}
          <div>
            <label htmlFor="gh-table-access" className="mb-1.5 block text-[10px] uppercase tracking-wider text-ink-faint">Access</label>
            <select
              id="gh-table-access"
              value={access}
              onChange={(e) => setAccess(e.target.value)}
              className="w-full rounded-xl border border-line bg-black/60 px-2.5 py-2 text-xs focus:border-emerald-neon/50 focus:outline-none"
            >
              <option value="open">🌐 Open — listed for everyone</option>
              <option value="private">🔒 Private — invite or code only</option>
            </select>
          </div>
          {access === 'open' && onlineKind === 'ranked' && (
            <p className="rounded-lg border border-gold/25 bg-gold/[.05] px-3 py-2 text-[11px] text-amber-200/90">Open tables are visible in the directory below — anyone can hop in.</p>
          )}
          <Button className="w-full" size="lg" onClick={() => onCreate({ name: name.trim() || undefined, isPrivate: access === 'private', maxPlayers: multiSeat ? seatCount : undefined })}>
            <Users size={15} /> Create lobby
          </Button>
        </Card>

        <Card className="flex flex-col justify-between space-y-4 p-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-cyber-cyan">Join lobby</span>
              <span className="font-mono text-[10px] text-ink-faint">DIRECT CODE</span>
            </div>
            <div>
              <label htmlFor="gh-join-code" className="mb-1.5 block text-[10px] uppercase tracking-wider text-ink-faint">Room code</label>
              <form className="flex gap-2" onSubmit={submitJoin}>
                <input
                  id="gh-join-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  placeholder="AB12C"
                  className="min-w-0 flex-1 rounded-xl border border-line bg-black/60 px-3 py-2 font-mono text-xs uppercase tracking-[0.2em] focus:border-cyber-cyan/60 focus:outline-none"
                />
                <Button variant="outline" size="sm" type="submit" disabled={code.trim().length < 4}>Join →</Button>
              </form>
              {joinError && <p className="mt-2 text-[11px] font-semibold text-red-300">{joinError}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="lg" className="flex-1" onClick={onQuick}><Zap size={15} /> Find opponent</Button>
            </div>
            <p className="text-[11px] leading-relaxed text-ink-faint">
              Anyone can join an open table below — or enter a code shared with you. Inviting a friend is the fastest way in.
            </p>
          </div>
        </Card>
      </div>

      <Card className="space-y-3 p-5">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-soft">Open lobbies</span>
          <span className="font-mono text-[10px] text-ink-faint">LIVE · {openTables.length}</span>
        </div>
        {openTables.length === 0 ? (
          <EmptyState emoji="🪑" title="No open lobbies right now" body="Create one above and share the code — or start matchmaking." compact />
        ) : (
          <div className="space-y-2">
            {openTables.map((r) => (
              <div key={r.code} className="flex items-center gap-3 rounded-xl border border-line bg-black/40 px-3.5 py-2.5 transition hover:border-emerald-neon/40">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg text-lg" style={{ background: 'linear-gradient(140deg, #0f1a15, #0a0f0d)' }}>{GAME_ART[r.game]?.emoji || '🎮'}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold">{r.name} <span className="ml-1 font-mono text-[10px] font-semibold text-emerald-soft">{r.code}</span></p>
                  <p className="text-[10px] text-ink-faint">
                    {r.players[0]?.displayName || 'Host'} · {r.playerCount}/{r.maxPlayers} seated{r.hasBot ? ' · AI seat' : ''}
                  </p>
                </div>
                {r.ranked ? <Badge tone="gold">Ranked</Badge> : <Badge tone="cyan">Casual</Badge>}
                <Button size="sm" onClick={() => onJoin(r.code)} disabled={r.playerCount >= r.maxPlayers}>Join</Button>
              </div>
            ))}
          </div>
        )}
        {openTables.length === 0 && (
          <Button variant="ghost" size="sm" onClick={() => navigate(`/?rooms=1#rooms`)} className="w-full">Browse rooms on the dashboard →</Button>
        )}
      </Card>
    </div>
  )
}

function InviteFriendsModal({ open, room, onClose }) {
  const { socket } = useSocket()
  const toast = useToast()
  const [friends, setFriends] = useState(null)
  const [invited, setInvited] = useState([])
  useEffect(() => {
    if (!open) return
    setFriends(null)
    setInvited([])
    api('/friends').then((d) => setFriends(d.friends)).catch(() => setFriends([]))
  }, [open])
  if (!open) return null

  const invite = (f) => {
    socket.emit('room:invite', { code: room.code, friendId: f.id })
    setInvited((x) => [...x, f.id])
    toast(`Invite sent to ${f.displayName}`, 'success')
  }

  return (
    <Modal open={open} onClose={onClose} title={`Invite friends to ${room.code}`}>
      <div className="max-h-[380px] space-y-2 overflow-y-auto p-1">
        {friends === null && <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} h="h-12" />)}</div>}
        {friends?.length === 0 && (
          <EmptyState emoji="🫂" title="No friends yet" body="Add friends from the Friends page, then invite them to any table." compact />
        )}
        {friends?.map((f) => (
          <div key={f.id} className="flex items-center gap-3 rounded-xl border border-line bg-white/[.02] px-3.5 py-2.5">
            <Pic user={f} size={36} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 truncate text-xs font-bold">{f.displayName} {f.isVerified ? <VerifiedIcon size={11} /> : null}</p>
              <p className="text-[10px] text-ink-faint">{f.online ? '🟢 Online now' : 'Offline'} · {f.rating ?? 1000} elo</p>
            </div>
            <Button size="sm" variant={invited.includes(f.id) ? 'ghost' : 'outline'} disabled={invited.includes(f.id)} onClick={() => invite(f)}>
              {invited.includes(f.id) ? 'Sent ✓' : 'Invite'}
            </Button>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[11px] text-ink-faint">They'll get a live notification with a one-tap link into this lobby.</p>
    </Modal>
  )
}

function ModeCard({ icon: Icon, title, bullets, tone, onClick }) {
  const tones = {
    emerald: 'border-emerald-neon/30 hover:border-emerald-neon/60 text-emerald-soft bg-emerald-neon/[.04]',
    cyan: 'border-cyber-cyan/30 hover:border-cyber-cyan/60 text-cyber-cyan bg-cyber-cyan/[.04]',
    royal: 'border-royal/40 hover:border-royal/70 text-[#b79dfb] bg-royal/[.06]',
  }
  return (
    <Card onClick={onClick} className={`group flex cursor-pointer flex-col gap-2 p-5 transition-all duration-200 hover:-translate-y-1 ${tones[tone]}`} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onClick()}>
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl border ${tones[tone]}`}>
        <Icon size={20} />
      </span>
      <h3 className="mt-1 text-[16px] font-bold text-ink">{title}</h3>
      <ul className="space-y-1 text-xs leading-relaxed text-ink-faint">
        {bullets.map((b) => <li key={b}>· {b}</li>)}
      </ul>
    </Card>
  )
}

function ChatInput({ onSend }) {
  const [text, setText] = useState('')
  return (
    <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { onSend(text.trim()); setText('') } }}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message…"
        maxLength={200}
        aria-label="Chat message"
        className="min-w-0 flex-1 rounded-lg border border-line bg-panel-2 px-3 py-2 text-xs focus:border-emerald-neon/50"
      />
      <Button size="sm" type="submit" disabled={!text.trim()}>Send</Button>
    </form>
  )
}
