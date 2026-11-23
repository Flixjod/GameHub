import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Globe2, CalendarDays, CalendarRange, Users, TrendingUp } from 'lucide-react'
import { api } from '../lib/api.js'
import { Pic, Badge, Button, Card, EmptyState, SectionHead } from '../components/UI.jsx'
import { useAuth } from '../store.jsx'

const PERIODS = [
  { key: 'all', label: 'Global', icon: Globe2 },
  { key: 'weekly', label: 'Weekly', icon: CalendarDays },
  { key: 'monthly', label: 'Monthly', icon: CalendarRange },
  { key: 'friends', label: 'Friends', icon: Users },
]

export default function Leaderboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [period, setPeriod] = useState('all')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api(`/leaderboard?period=${period}`).then((d) => setData(d)).catch(() => setData({ players: [] })).finally(() => setLoading(false))
  }, [period])

  const players = data?.players || []
  const myRank = players.findIndex((p) => p.user.id === user?.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Leaderboard</h1>
        <p className="mt-1 text-sm text-ink-dim">Elo-driven rankings — updated instantly after every ranked match.</p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Leaderboard period">
        {PERIODS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            role="tab"
            aria-selected={period === key}
            onClick={() => setPeriod(key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition cursor-pointer ${
              period === key
                ? 'bg-emerald-neon text-[#04130b] shadow-[0_4px_16px_-4px_rgba(16,229,138,.55)]'
                : 'border border-line-2 text-ink-dim hover:text-ink hover:border-emerald-neon/40'}`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* my rank strip */}
      {myRank >= 0 && (
        <Card className="flex items-center gap-4 border-emerald-neon/30 p-4 glow-ring">
          <span className="text-xs font-black uppercase tracking-wider text-emerald-soft">You</span>
          <span className="text-lg font-black">#{myRank + 1}</span>
          <Pic user={user} size={36} />
          <span className="flex-1 truncate text-sm font-bold">{user.displayName}</span>
          <Badge tone="emerald">{user.rating} elo</Badge>
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        {!loading && players.length === 0 ? (
          <div className="p-6">
            <EmptyState
              emoji="🏁"
              title={period === 'friends' ? 'No ranked friends yet' : 'No ranked players in this window'}
              body={period === 'friends' ? 'Add friends to race them on the ladder.' : 'Results from the last period will appear here. Try the Global tab.'}
              action={<Button onClick={() => navigate('/friends')}>Find players</Button>}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-ink-faint">
                  <th className="px-5 py-3.5 font-bold">#</th>
                  <th className="px-2 py-3.5 font-bold">Player</th>
                  <th className="px-2 py-3.5 text-right font-bold">Rating</th>
                  <th className="px-2 py-3.5 text-right font-bold">Wins</th>
                  <th className="px-2 py-3.5 text-right font-bold">Played</th>
                  <th className="px-2 py-3.5 text-right font-bold">Level</th>
                </tr>
              </thead>
              <tbody>
                {loading && Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-line/50">
                    <td className="px-5 py-3.5"><div className="skeleton h-4 w-8" /></td>
                    <td className="px-2 py-3.5"><div className="skeleton h-9 w-44 rounded-lg" /></td>
                    <td className="px-2 py-3.5"><div className="skeleton ml-auto h-4 w-12" /></td>
                    <td className="px-2 py-3.5"><div className="skeleton ml-auto h-4 w-10" /></td>
                    <td className="px-2 py-3.5"><div className="skeleton ml-auto h-4 w-10" /></td>
                    <td className="px-2 py-3.5"><div className="skeleton ml-auto h-4 w-8" /></td>
                  </tr>
                ))}
                {!loading && players.map((p) => {
                  const isMe = p.user.id === user?.id
                  return (
                    <tr
                      key={p.user.username}
                      onClick={() => navigate(`/profile/${p.user.username}`)}
                      className={`cursor-pointer border-b border-line/50 transition hover:bg-emerald-neon/[.04] ${isMe ? 'bg-emerald-neon/[.06]' : ''}`}
                    >
                      <td className="px-5 py-3">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black ${
                          p.rank === 1 ? 'bg-gold/15 text-gold border border-gold/30' :
                          p.rank === 2 ? 'bg-white/10 text-ink-dim border border-white/15' :
                          p.rank === 3 ? 'bg-amber-700/25 text-amber-400 border border-amber-600/30' :
                          'text-ink-faint font-bold'}`}>{p.rank}</span>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2.5">
                          <Pic user={p.user} size={32} online={p.online} />
                          <div className="min-w-0">
                            <p className="flex items-center gap-1 truncate text-[13px] font-bold">
                              {p.user.displayName} {p.user.isVerified ? <span className="text-emerald-neon text-[11px]">✓</span> : null} {p.user.isPremium ? <span className="text-[10px]">👑</span> : null}
                            </p>
                            <p className="text-[10px] text-ink-faint">@{p.user.username}{p.online ? ' · online' : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-right font-bold text-emerald-soft">{p.user.rating}</td>
                      <td className="px-2 py-3 text-right font-semibold text-ink-dim">{p.periodWins ?? p.user.wins}</td>
                      <td className="px-2 py-3 text-right text-ink-faint">{p.periodMatches ?? p.user.gamesPlayed}</td>
                      <td className="px-2 py-3 text-right text-ink-faint">{p.user.level}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-center text-[11px] text-ink-faint">
        Elo starts at 1000. Weekly resets focus on activity — Global reflects career rating.<br/>
        Rating changes are validated server-side on every finished match.
      </p>
    </div>
  )
}
