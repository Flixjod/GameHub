import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy, Swords, Star, ChevronRight, Flame } from 'lucide-react'
import { Card, Pic, Progress, VerifiedIcon, Badge } from './UI.jsx'
import { useAuth } from '../store.jsx'
import { api } from '../lib/api.js'

export function PlayerStatsCard() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  if (!user) return null
  const winRate = user.gamesPlayed ? Math.round((user.wins / user.gamesPlayed) * 100) : 0

  return (
    <Card className="relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-neon/[.08] blur-3xl" />
      <div className="flex items-center gap-4">
        <Pic user={user} size={56} ring={user.isPremium} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-[17px] font-bold">{user.displayName}</h3>
            {user.isVerified ? <VerifiedIcon size={15} /> : null}
            {user.isPremium ? <CrownMini /> : null}
          </div>
          <p className="text-xs text-ink-faint">@{user.username} · Level {user.level}</p>
          <div className="mt-2 flex items-center gap-2">
            <Progress pct={user.levelProgress?.pct || 0} className="max-w-[140px]" />
            <span className="text-[10px] font-semibold text-ink-faint whitespace-nowrap">{user.levelProgress?.current}/{user.levelProgress?.needed} XP</span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2.5">
        <Stat icon={Trophy} label="Total Wins" value={user.wins} tone="emerald" />
        <Stat icon={Swords} label="Games Played" value={user.gamesPlayed} tone="cyan" />
        <Stat icon={Star} label="Rating" value={user.rating} tone="gold" />
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl border border-line bg-white/[.02] px-4 py-2.5">
        <span className="text-xs text-ink-faint">Win rate</span>
        <span className="text-sm font-bold text-emerald-soft">{winRate}%</span>
        {user.streak > 0 && (
          <Badge tone="gold"><Flame size={11} /> {user.streak} win streak</Badge>
        )}
      </div>

      <button onClick={() => navigate(`/profile/${user.username}`)} className="mt-3 flex w-full items-center justify-between rounded-xl px-1 py-2 text-sm font-semibold text-emerald-soft transition hover:translate-x-0.5 cursor-pointer group" aria-label="View details">
        View Details
        <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
      </button>
    </Card>
  )
}

function CrownMini() {
  return <span title="Premium member" className="text-[11px] text-gold">👑</span>
}

export function Stat({ icon: Icon, label, value, tone = 'emerald' }) {
  const tones = {
    emerald: 'text-emerald-soft bg-emerald-neon/10 border-emerald-neon/20',
    cyan: 'text-cyber-cyan bg-cyber-cyan/10 border-cyber-cyan/20',
    gold: 'text-gold bg-gold/10 border-gold/20',
  }
  return (
    <div className="rounded-xl border border-line bg-white/[.02] p-3 text-center transition hover:border-line-2">
      <span className={`mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg border ${tones[tone]}`}>
        <Icon size={14} />
      </span>
      <p className="text-lg font-bold leading-none">{value?.toLocaleString?.() ?? value}</p>
      <p className="mt-1 text-[10px] font-medium text-ink-faint">{label}</p>
    </div>
  )
}
