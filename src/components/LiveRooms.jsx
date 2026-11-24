import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Radio, DoorOpen, Loader2, Users, Lock, Plus, Bot } from 'lucide-react'
import { Card, SectionHead, Button, Pic, Badge, EmptyState, Skeleton, Modal } from './UI.jsx'
import { useRooms } from './GameCard.jsx'
import { GAME_ART } from './GameArt.jsx'
import { useSocket } from '../store.jsx'

export function LiveRooms({ compact = false, id = 'rooms', game = null }) {
  const rooms = useRooms()
  const navigate = useNavigate()
  const { socket } = useSocket()
  const [joining, setJoining] = useState(null)
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState(null)
  const [showJoin, setShowJoin] = useState(false)

  const joinRoom = (room) => {
    navigate(`/play/${room.game}?room=${room.code}${room.inGame ? '&spectate=rejected' : ''}`)
  }

  const joinByCode = async (e) => {
    e && e.preventDefault()
    setJoinError(null)
    const code = joinCode.trim().toUpperCase()
    if (code.length < 4) { setJoinError('Enter the 5-character room code.'); return }
    // check on home: just navigate; Play page validates & shows errors
    navigate(`/play/tictactoe?room=${code}&check=1`)
  }

  const visible = (compact ? rooms.slice(0, 4) : rooms).filter((r) => !r.isPrivate && (!game || r.game === game))

  return (
    <Card className="p-5" id={id}>
      <SectionHead
        icon={Radio}
        title="Live Rooms"
        sub="Real players, right now"
        action={<Button variant="ghost" size="sm" onClick={() => setShowJoin(true)}>Join by code</Button>}
      />

      {visible.length === 0 ? (
        <EmptyState
          emoji="🚪"
          title="No live rooms yet"
          body="Be the first host — pick a game and create a room, or face a smart bot instantly."
          action={(
            <div className="flex gap-2">
              <Button onClick={() => navigate('/play/tictactoe')}>
                <Plus size={15} /> Create room
              </Button>
              <Button variant="outline" onClick={() => navigate('/play/reversi?bot=1')}>
                <Bot size={15} /> Play vs bot
              </Button>
            </div>
          )}
        />
      ) : (
        <div className="space-y-2.5 max-md:space-y-2">
          {visible.map((room) => {
            const art = GAME_ART[room.game] || GAME_ART.more
            const full = room.playerCount >= room.maxPlayers
            return (
              <div key={room.code} className="group flex items-center gap-3.5 rounded-xl border border-line bg-white/[.02] p-3.5 transition hover:border-emerald-neon/30 hover:bg-emerald-neon/[.03] max-md:p-3">
                <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line-2 text-xl" style={{ background: 'linear-gradient(140deg, #0f1a15, #0a0f0d)' }}>
                  {art.emoji}
                  {room.inGame && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-emerald-neon animate-pulse-glow" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-bold">{room.name}</span>
                    {room.isPrivate && <Lock size={11} className="text-ink-faint" />}
                    {room.inGame && <Badge tone="emerald" className="!py-0">in play</Badge>}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-faint">
                    <span>{room.gameName}</span>
                    <span className="inline-flex items-center gap-1">
                      <Users size={10} />
                      {room.playerCount}/{room.maxPlayers}
                    </span>
                    <span className="font-mono tracking-wider text-ink-faint/80">#{room.code}</span>
                  </div>
                </div>
                <div className="flex -space-x-2 mr-1 hidden sm:flex">
                  {room.players.slice(0, 3).map((p) => <Pic key={p.id} user={p} size={26} className="ring-2 ring-panel" />)}
                </div>
                <Button
                  size="sm"
                  variant={full && !room.inGame ? 'outline' : 'primary'}
                  disabled={joining === room.code}
                  onClick={() => joinRoom(room)}
                >
                  {joining === room.code ? <Loader2 size={13} className="animate-spin" /> : room.inGame ? 'Watch' : 'Join'}
                </Button>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={showJoin} onClose={() => setShowJoin(false)} title="Join a Room">
        <form onSubmit={joinByCode} className="space-y-4">
          <p className="text-sm text-ink-dim">Got a 5-character room code from a friend? Drop it in.</p>
          <input
            autoFocus
            value={joinCode}
            onChange={(e) => { setJoinCode(e.target.value.toUpperCase().slice(0, 5)); setJoinError(null) }}
            placeholder="e.g. K8ADD"
            className="w-full rounded-xl border border-line bg-panel-2 px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] uppercase focus:border-emerald-neon/60"
            maxLength={5}
            aria-label="Room code"
          />
          {joinError && <p className="text-xs font-semibold text-red-300">{joinError}</p>}
          <Button type="submit" className="w-full"><DoorOpen size={16} /> Enter Room</Button>
        </form>
      </Modal>
    </Card>
  )
}
