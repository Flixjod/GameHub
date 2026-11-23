import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Trophy, Swords, Star, CalendarDays, Flame, UserPlus, Check, ChevronRight } from 'lucide-react'
import { api } from '../lib/api.js'
import { Pic, Badge, Button, Card, VerifiedIcon, Progress, EmptyState } from '../components/UI.jsx'
import { Stat } from '../components/PlayerStatsCard.jsx'
import { PlayerStatsCard } from '../components/PlayerStatsCard.jsx'
import { useAuth, useToast, useSocket } from '../store.jsx'
import { timeAgo } from '../lib/helpers.js'
import { GAME_ART } from '../components/GameArt.jsx'
import MatchReview from '../components/game/MatchReview.jsx'

const GAME_NAMES = { tictactoe: 'TicTacToe', reversi: 'Reversi', ludo: 'Ludo', snakes: 'Snake & Ladder' }

export default function Profile() {
  const { username } = useParams()
  const { user: me } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const { socket } = useSocket()
  const [profile, setProfile] = useState(null)
  const [history, setHistory] = useState(null)
  const [error, setError] = useState(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    setProfile(null); setHistory(null); setError(null); setNotFound(false)
    api(`/users/${username}`).then((d) => setProfile({ ...d.user, online: d.online })).catch((e) => setNotFound(true))
    api(`/matches/history?username=${username}`).then((d) => setHistory(d.matches)).catch(() => setHistory([]))
  }, [username])

  const [self, setSelf] = useState(null)
  useEffect(() => {
    api('/friends').then((d) => setSelf({
      friends: d.friends.map((f) => f.username),
      sentIds: new Set(d.sent.map((s) => s.username)),
      requests: d.requests.map((r) => r.username),
    })).catch(() => setSelf({ friends: [], sentIds: new Set(), requests: [] }))
  }, [username])

  const isMe = me?.username === username

  if (notFound) {
    return <EmptyState emoji="🕵️" title="Player not found" body={`No player is registered as @${username}.`} action={<Button onClick={() => navigate('/friends')}>Search players</Button>} />
  }
  if (!profile) return <div className="skeleton h-64 rounded-2xl" />

  const winRate = profile.gamesPlayed ? Math.round((profile.wins / profile.gamesPlayed) * 100) : 0
  const relationship = !isMe && self ? (self.friends.includes(username) ? 'friend' : self.requests.includes(username) ? 'incoming' : self.sentIds.has(username) ? 'sent' : 'none') : null

  return (
    <div className="space-y-6">
      {/* header card */}
      <Card className="relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-neon/[.09] blur-3xl" />
        <div className="flex flex-wrap items-center gap-5">
          <Pic user={profile} size={80} ring={profile.isPremium} online={profile.online} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight">{profile.displayName}</h1>
              {profile.isVerified ? <VerifiedIcon size={18} /> : null}
              {profile.isPremium ? <span title="Premium member">👑</span> : null}
              <Badge tone={profile.online ? 'emerald' : 'dim'}>{profile.online ? '● Online' : 'Offline'}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-ink-faint">@{profile.username} · joined {timeAgo(profile.createdAt)}</p>
            {profile.bio && <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-dim">{profile.bio}</p>}
          </div>
          {!isMe && (
            <div className="flex gap-2">
              {relationship === 'friend' ? (
                <Badge tone="emerald"><Check size={12} /> Friends</Badge>
              ) : relationship === 'sent' ? (
                <Badge tone="dim">Request sent</Badge>
              ) : relationship === 'incoming' ? (
                <Button size="sm" onClick={() => navigate('/friends')}>Accept in Friends <ChevronRight size={14} /></Button>
              ) : (
                <Button size="sm" onClick={async () => {
                  try { const r = await api('/friends/requests', { method: 'POST', body: { username } }); toast(r.message || 'Request sent', 'success') }
                  catch (e) { toast(e.message, 'error') }
                }}><UserPlus size={14} /> Add friend</Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {isMe ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0 space-y-6">
            <RecentMatches history={history} canReview />
          </div>
          <div className="space-y-6">
            <PlayerStatsCard />
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0 space-y-6">
            <StatGrid profile={profile} winRate={winRate} />
            <RecentMatches history={history} canReview />
          </div>
          <div className="space-y-6">
            <StatHighlights profile={profile} />
          </div>
        </div>
      )}
    </div>
  )
}

function StatGrid({ profile, winRate }) {
  const perGame = [
    { name: 'TicTacToe', key: 'ttt_wins' },
    { name: 'Reversi', key: 'reversi_wins' },
    { name: 'Ludo', key: 'ludo_wins' },
    { name: 'Snake & Ladder', key: 'snakes_wins' },
  ]
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={Trophy} label="Total Wins" value={profile.wins} tone="emerald" />
        <Stat icon={Swords} label="Games Played" value={profile.gamesPlayed} tone="cyan" />
        <Stat icon={Star} label="Rating" value={profile.rating} tone="gold" />
        <Stat icon={Flame} label="Win Rate" value={`${winRate}%`} tone="royal" />
      </div>
      <Card className="p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-faint">Wins by game</p>
        <div className="space-y-3">
          {perGame.map(({ name, key }) => (
            <div key={key} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-xs font-semibold text-ink-dim">{name}</span>
              <Progress pct={Math.min(100, (profile[key] / Math.max(1, profile.wins)) * 100)} className="flex-1" />
              <span className="w-10 text-right text-xs font-bold">{profile[key]}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function StatHighlights({ profile }) {
  return (
    <Card className="p-5">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-faint">Career snapshot</p>
      <div className="space-y-3 text-sm">
        <Row label="Wins" value={profile.wins} />
        <Row label="Losses" value={profile.losses} />
        <Row label="Draws" value={profile.draws} />
        <Row label="Games played" value={profile.gamesPlayed} />
        <Row label="Friends" value={profile.friends} />
        <Row label="Tournaments joined" value={profile.tournamentsJoined} />
        <Row label="Current streak" value={`${profile.streak}🔥`} />
      </div>
    </Card>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-line/50 pb-2.5 last:border-0 last:pb-0">
      <span className="text-ink-faint">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  )
}

function RecentMatches({ history, canReview }) {
  const toast = useToast()
  const [review, setReview] = useState(null)
  const openReview = async (id, game, seats) => {
    try {
      const d = await api(`/matches/${id}`)
      setReview({ gameId: game || d.match.game, moves: d.moves || [], seats: d.seats })
    } catch (e) {
      toast(e.message === 'You can only review matches you played.' ? 'Replays are stored for your own matches.' : e.message, 'error')
    }
  }
  return (
    <Card className="p-5">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-faint">Recent matches</p>
      {!history ? <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>
      : history.length === 0 ? (
        <EmptyState emoji="🎯" title="No matches yet" body="Results will appear after the first game." />
      ) : (
        <div className="space-y-2">
          {history.map((m) => {
            const tone = m.result === 'win' ? 'emerald' : m.result === 'draw' ? 'cyan' : 'dim'
            const art = GAME_ART[m.game] || GAME_ART.more
            return (
              <div key={m.id} className="flex items-center gap-3 rounded-xl border border-line bg-white/[.02] px-3.5 py-2.5">
                <span className="text-lg">{art.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold">{GAME_NAMES[m.game] || m.game}</p>
                  <p className="text-[10px] text-ink-faint">
                    {timeAgo(m.ended_at || m.started_at)} · {m.mode === 'bot' ? 'vs bot' : 'online match'}
                    {m.ranked ? ' · ranked' : ' · casual'}
                  </p>
                </div>
                <span className={`text-[11px] font-semibold ${m.rating_delta >= 0 ? 'text-emerald-soft' : 'text-red-300'}`}>{m.rating_delta >= 0 ? '+' : ''}{m.rating_delta} elo</span>
                <Badge tone={tone} className="w-[52px] justify-center">{m.result === 'win' ? 'Win' : m.result === 'draw' ? 'Draw' : 'Loss'}</Badge>
                {canReview && (
                  <button onClick={() => openReview(m.id, m.game)}
                    className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-bold text-ink-faint transition hover:border-emerald-neon/40 hover:text-emerald-soft cursor-pointer"
                    title="Step through every move">
                    Replay
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
      {review && (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-[#050807]/97 p-4 md:p-8">
          <MatchReview
            gameId={review.gameId}
            moves={review.moves}
            seats={review.seats}
            theme={review.gameId === 'reversi' ? (localStorage.getItem('gh:board-theme-reversi') ? JSON.parse(localStorage.getItem('gh:board-theme-reversi')) : 'emerald') : 'emerald'}
            onClose={() => setReview(null)}
          />
        </div>
      )}
    </Card>
  )
}
