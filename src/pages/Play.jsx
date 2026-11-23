import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Loader2, DoorOpen, Bot, Zap, Users, LogOut, CheckCircle2, Trophy,
  Timer, Swords, RotateCcw, Gamepad2, ArrowLeft, Copy,
} from 'lucide-react'
import { useAuth, useSocket, useToast } from '../store.jsx'
import { Pic, Badge, Button, Card, VerifiedIcon, EmptyState, Modal } from '../components/UI.jsx'
import TicTacToeBoard from '../components/boards/TicTacToeBoard.jsx'
import ReversiBoard from '../components/boards/ReversiBoard.jsx'
import LudoBoard, { SEAT_LABELS } from '../components/boards/LudoBoard.jsx'
import SnakesBoard from '../components/boards/SnakesBoard.jsx'
import { GAME_ART } from '../components/GameArt.jsx'

const GAME_META = {
  tictactoe: { name: 'TicTacToe', tagline: 'Think. Win.' },
  reversi: { name: 'Reversi', tagline: 'Flip. Conquer. Win.' },
  ludo: { name: 'Ludo', tagline: 'Roll. Move. Win.' },
  snakes: { name: 'Snake & Ladder', tagline: 'Climb. Don’t Fall.' },
}

const SEAT_COLORS = [
  { name: 'Emerald', color: '#10e58a' },
  { name: 'Rose', color: '#f43f5e' },
  { name: 'Amber', color: '#eab308' },
  { name: 'Azure', color: '#3b82f6' },
]

const TURN_SECONDS = 45

export default function Play() {
  const { gameId } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const { socket, connected } = useSocket()
  const toast = useToast()

  const meta = GAME_META[gameId]
  const [phase, setPhase] = useState('lobby') // lobby | searching | waiting | playing | over
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
  const [diceRolling, setDiceRolling] = useState(false)
  const stateRef = useRef(null)
  stateRef.current = { room, gameState, turnSeat, phase }
  const autoFlowDone = useRef(false)

  const mySeat = seats ? seats.findIndex((s) => s.id === user?.id) : -1
  const myTurn = phase === 'playing' && gameState && turnSeat === mySeat

  const reset = useCallback(() => {
    setRoom(null); setGameState(null); setSeats(null); setTurnSeat(null)
    setLastEvent(null); setResult(null); setNotice(null); setChat([])
    setLastError(null)
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
      setGameState(d.state)
      setSeats(d.seats)
      setTurnSeat(d.turnSeat)
      setResult(null)
      setLastEvent(null)
      toast('Match started — good luck! ⚔️', 'success')
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

    socket.on('room:update', onRoomUpdate)
    socket.on('game:started', onGameStarted)
    socket.on('game:state', onGameState)
    socket.on('game:over', onGameOver)
    socket.on('game:error', onGameError)
    socket.on('room:notice', onNotice)
    socket.on('room:chat', onChat)
    return () => {
      socket.off('room:update', onRoomUpdate)
      socket.off('game:started', onGameStarted)
      socket.off('game:state', onGameState)
      socket.off('game:over', onGameOver)
      socket.off('game:error', onGameError)
      socket.off('room:notice', onNotice)
      socket.off('room:chat', onChat)
    }
  }, [socket, gameId, refreshUser, toast])

  // deep links: ?bot=1 or ?room=CODE
  useEffect(() => {
    if (!socket || !user || autoFlowDone.current) return
    const roomCode = params.get('room')
    if (params.get('bot') === '1') {
      autoFlowDone.current = true
      setPhase('waiting')
      socket.emit('room:create', { game: gameId, name: `${user.displayName}'s Booth`, isPrivate: true }, (res) => {
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
        } else {
          setRoom(res.room)
          if (res.state) {
            setGameState(res.state)
            setSeats(res.seatsInGame)
            setTurnSeat(res.state.turn)
            setPhase('playing')
          } else {
            setPhase('waiting')
          }
        }
      })
    }
  }, [socket, user, params, gameId, toast])

  // turn clock
  useEffect(() => {
    setTurnClock(TURN_SECONDS)
    if (phase !== 'playing') return
    const t = setInterval(() => setTurnClock((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [phase, turnSeat, gameState?.turn])

  useEffect(() => {
    if (lastEvent?.type === 'roll') {
      setDiceRolling(true)
      const t = setTimeout(() => setDiceRolling(false), 700)
      return () => clearTimeout(t)
    }
  }, [lastEvent?.type, lastEvent?.roll])

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
    return <EmptyState emoji="🕹️" title="Unknown game" body="That game doesn't exist — pick one from the library." action={<Button onClick={() => navigate('/games')}>Back to games</Button>} />
  }

  const quickMatch = () => {
    setPhase('searching')
    socket.emit('matchmaking:join', { game: gameId })
  }
  const cancelSearch = () => {
    socket.emit('matchmaking:cancel', { game: gameId })
    setPhase('lobby')
  }
  const startBotGame = () => {
    setPhase('waiting')
    socket.emit('room:create', { game: gameId, name: `${user.displayName}'s Booth`, isPrivate: true }, (res) => {
      if (res?.error) { toast(res.error, 'error'); setPhase('lobby'); return }
      socket.emit('room:add-bot', { code: res.code })
      socket.emit('room:ready', { code: res.code, ready: true })
    })
  }
  const createRoom = () => {
    socket.emit('room:create', { game: gameId, name: `${user.displayName}'s Room` }, (res) => {
      if (res?.error) return toast(res.error, 'error')
      setRoom(res.room)
      setPhase('waiting')
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => navigate('/games')} className="rounded-xl border border-line p-2.5 text-ink-dim transition hover:border-emerald-neon/40 hover:text-ink cursor-pointer" aria-label="Back to games">
          <ArrowLeft size={17} />
        </button>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl text-2xl border border-line-2" style={{ background: 'linear-gradient(140deg, #0f1a15, #0a0f0d)' }}>{art.emoji}</span>
        <div>
          <h1 className="text-xl font-extrabold leading-tight">{meta.name}</h1>
          <p className="text-xs text-ink-faint">{meta.tagline}</p>
        </div>
        <span className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${connected ? 'border border-emerald-neon/30 text-emerald-soft' : 'border border-red-500/30 text-red-300 animate-pulse'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-neon' : 'bg-red-400'}`} />
          {connected ? 'Connected' : 'Reconnecting…'}
        </span>
      </div>

      {notice && phase !== 'over' && (
        <div className="rounded-xl border border-gold/30 bg-gold/[.06] px-4 py-3 text-sm font-semibold text-amber-200 animate-slide-up">{notice}</div>
      )}
      {lastError && phase !== 'over' && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-300 animate-slide-up">{lastError}</div>
      )}

      {phase === 'lobby' && (
        <div className="stagger grid gap-4 md:grid-cols-3">
          <ModeCard icon={Zap} title="Quick Match" body="Get placed against a real waiting player in seconds." tone="emerald" onClick={quickMatch} />
          <ModeCard icon={Users} title="Create Room" body="Open a room, share the code and invite friends or bots." tone="cyan" onClick={createRoom} />
          <ModeCard icon={Bot} title="Play vs Bot" body="Warm up against the house bot — instant and private." tone="royal" onClick={startBotGame} />
        </div>
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
            <p className="text-lg font-bold">Finding a worthy opponent…</p>
            <p className="mt-1 text-sm text-ink-faint">You'll enter the match automatically when someone is found.</p>
          </div>
          <Button variant="outline" onClick={cancelSearch}>Cancel search</Button>
        </Card>
      )}

      {phase === 'waiting' && room && (
        <Card className="animate-fade-in p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">{room.name}</h2>
              <button onClick={() => { navigator.clipboard?.writeText(room.code); toast('Room code copied', 'success') }}
                className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-faint transition hover:text-emerald-soft cursor-pointer">
                Room <span className="font-mono tracking-[0.25em] text-emerald-soft">{room.code}</span> <Copy size={11} />
              </button>
            </div>
            <Badge tone="dim">{room.gameName} · {room.playerCount}/{room.maxPlayers}</Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {room.players.map((p, idx) => <SeatCard key={p.id} p={p} idx={idx} />)}
            {Array.from({ length: Math.max(0, room.maxPlayers - room.players.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="flex min-h-[86px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-2/70 text-ink-faint">
                <Users size={18} className="animate-pulse-glow" />
                <span className="text-[11px] font-semibold">Waiting for player…</span>
              </div>
            ))}
          </div>

          <p className="mt-4 text-sm text-ink-dim">
            {isHost ? 'Press Ready to arm the match — it starts when every player is armed. Or add a bot to fill the seat.'
              : room.hasBot ? 'Host may add a bot to fill empty seats. Arm up when ready.'
              : room.playerCount < 2 ? `Share room code ${room.code} with a friend — or add a bot if you're the host.`
              : 'Arm up — the match starts when everyone is ready.'}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={toggleReady} size="lg" className="min-w-[170px]">
              <CheckCircle2 size={16} /> {isReady() ? 'Ready ✓' : 'Ready up'}
            </Button>
            {isHost && !room.hasBot && room.playerCount < room.maxPlayers && (
              <Button variant="outline" size="lg" onClick={() => socket.emit('room:add-bot', { code: room.code })}><Bot size={16} /> Add bot to fill</Button>
            )}
            {isHost && room.hasBot && (
              <Button variant="outline" size="lg" onClick={() => socket.emit('room:kick-bot', { code: room.code })}><Gamepad2 size={16} /> Remove bot</Button>
            )}
            <Button variant="danger" size="lg" onClick={leaveCurrentRoom}><LogOut size={16} /> Leave room</Button>
          </div>
        </Card>
      )}

      {phase === 'playing' && gameState && seats && (
        <div className="grid gap-5 lg:grid-cols-[1fr_290px]">
          <div className="min-w-0">
            <div className="mb-4 flex items-center justify-between rounded-xl border border-line bg-white/[.02] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Pic user={seats[turnSeat]} size={34} />
                <div>
                  <p className="text-[13px] font-bold leading-tight">
                    {myTurn ? <span className="text-emerald-neon text-glow">Your turn — {gameId === 'ludo' && gameState.roll == null ? 'roll the dice!' : 'make your move'}</span>
                      : <span>{seats[turnSeat]?.displayName}{seats[turnSeat]?.isBot ? ' (bot)' : ''} is deciding…</span>}
                  </p>
                  <p className="text-[10px] text-ink-faint">
                    {seats.map((s, i) => `${SEAT_COLORS[i % 4].name}: ${s.displayName}`).join(' · ')}
                  </p>
                </div>
              </div>
              <div className={`flex items-center gap-1.5 font-mono text-sm font-bold ${turnClock <= 10 ? 'text-red-300 animate-pulse' : 'text-ink-dim'}`} title="Turn timer">
                <Timer size={14} />
                {String(Math.floor(turnClock / 60)).padStart(2, '0')}:{String(turnClock % 60).padStart(2, '0')}
              </div>
            </div>

            {gameId === 'tictactoe' && <TicTacToeBoard state={gameState} mySeat={mySeat} playing={myTurn} onMove={onMove} lastEvent={lastEvent} />}
            {gameId === 'reversi' && <ReversiBoard state={gameState} mySeat={mySeat} playing={myTurn} onMove={onMove} onPass={onPass} />}
            {gameId === 'ludo' && <LudoBoard state={gameState} mySeat={mySeat} playing={myTurn} onMove={onMove} onRoll={onRoll} />}
            {gameId === 'snakes' && <SnakesBoard state={gameState} mySeat={mySeat} playing={myTurn} onRoll={onRoll} />}
          </div>

          <div className="space-y-4">
            <Card className="p-4">
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-faint">Match players</h4>
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
            <div className="flex justify-center">
              <Button variant="danger" size="sm" onClick={() => socket.emit('game:resign', { code: room?.code })}><Swords size={13} /> Resign match</Button>
            </div>
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
              <p className="mt-1 text-sm text-ink-faint">
                {myOutcome(result, user) === 'win' ? 'Well played — the ladder will remember this.' : myOutcome(result, user) === 'draw' ? 'Nobody blinked. Share the glory.' : 'Every loss sharpens the next win.'}
              </p>
            </div>
            <div className="space-y-2">
              {result.seats.map((s) => (
                <div key={s.seat} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${s.result === 'win' ? 'border-gold/40 bg-gold/[.06]' : s.result === 'draw' ? 'border-cyber-cyan/30 bg-cyber-cyan/[.05]' : 'border-line bg-white/[.02]'}`}>
                  <Pic user={s} size={34} />
                  <span className="flex-1 truncate text-sm font-bold">{s.displayName}</span>
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
              <Button className="flex-1" onClick={() => { setPhase('waiting'); setResult(null); setNotice(null) }}><RotateCcw size={15} /> Rematch in room</Button>
              <Button variant="outline" className="flex-1" onClick={() => { socket.emit('room:leave', { code: room?.code }); reset(); setPhase('lobby') }}><DoorOpen size={15} /> New match</Button>
              <Button variant="ghost" onClick={() => { socket.emit('room:leave', { code: room?.code }); reset(); navigate('/') }}><ArrowLeft size={15} /> Dashboard</Button>
            </div>
          </div>
        )}
      </Modal>
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

function SeatCard({ p, idx }) {
  return (
    <div className="flex min-h-[86px] items-center gap-3 rounded-xl border border-line bg-white/[.02] p-3.5">
      <Pic user={p} size={42} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 truncate text-sm font-bold">{p.displayName} {p.isVerified ? <VerifiedIcon size={12} /> : null}</p>
        <p className="text-[10px] text-ink-faint">
          {p.isBot ? 'House bot' : `@${p.username}`}
          {!p.isBot && p.disconnected ? <span className="ml-1.5 font-semibold text-red-300">· reconnecting…</span> : null}
        </p>
      </div>
      <span className="rounded-lg px-2.5 py-1 text-[10px] font-bold" style={{ background: SEAT_COLORS[idx % 4].color + '1c', color: SEAT_COLORS[idx % 4].color, border: `1px solid ${SEAT_COLORS[idx % 4].color}44` }}>
        {SEAT_COLORS[idx % 4].name}
      </span>
      {p.ready ? <CheckCircle2 size={16} className="text-emerald-neon" /> : <span className="h-4 w-4 rounded-full border border-line-2" />}
    </div>
  )
}

function ModeCard({ icon: Icon, title, body, tone, onClick }) {
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
      <p className="text-xs leading-relaxed text-ink-faint">{body}</p>
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
