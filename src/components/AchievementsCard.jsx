import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Medal, ChevronRight } from 'lucide-react'
import { Card, SectionHead, Button, Progress, Badge, EmptyState, Skeleton } from './UI.jsx'
import { api } from '../lib/api.js'

const accentTone = { emerald: 'emerald', gold: 'gold', cyan: 'cyan', royal: 'royal' }

export function AchievementsGallery({ achievements }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {achievements.map((a) => (
        <AchievementCard key={a.code} a={a} />
      ))}
    </div>
  )
}

export function AchievementCard({ a }) {
  const tone = accentTone[a.accent] || 'emerald'
  const emojiBg = {
    emerald: 'bg-emerald-neon/10 border-emerald-neon/30',
    gold: 'bg-gold/10 border-gold/30',
    cyan: 'bg-cyber-cyan/10 border-cyber-cyan/30',
    royal: 'bg-royal/15 border-royal/30',
  }[tone]
  return (
    <Card className={`flex flex-col gap-3 p-4 transition hover:-translate-y-0.5 ${a.unlocked ? 'border-gold/25' : ''}`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-2xl ${emojiBg} ${a.unlocked ? 'animate-pulse-glow' : 'opacity-60'}`}>{a.emoji}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-[15px] font-bold">{a.title}</h4>
            {a.unlocked && <Badge tone="gold">Unlocked</Badge>}
          </div>
          <p className="mt-0.5 text-xs leading-snug text-ink-faint">{a.description}</p>
        </div>
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold">
          <span className={a.unlocked ? 'text-gold' : 'text-ink-dim'}>
            {Math.min(a.current, a.threshold)} / {a.threshold}
          </span>
          {!a.unlocked && <span className="text-ink-faint">{a.pct}%</span>}
        </div>
        <Progress pct={a.pct} color={a.unlocked ? 'linear-gradient(90deg,#fbbf24,#fcd34d)' : undefined} thin />
      </div>
    </Card>
  )
}

export function AchievementsCard() {
  const navigate = useNavigate()
  const [achievements, setAchievements] = useState(null)

  useEffect(() => {
    api('/achievements').then((d) => setAchievements(d.achievements)).catch(() => setAchievements([]))
  }, [])

  return (
    <Card className="p-5">
      <SectionHead
        icon={Medal}
        title="Achievements"
        sub="Earned through real progress"
        action={achievements ? (
          <Button variant="ghost" size="sm" onClick={() => navigate('/achievements')}>
            View All <ChevronRight size={14} />
          </Button>
        ) : null}
      />
      {!achievements && (
        <div className="space-y-3">{[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-line p-3.5">
            <Skeleton h="h-12 w-12" className="rounded-xl" />
            <div className="flex-1">
              <Skeleton h="h-3.5" className="w-1/2 mb-2" />
              <Skeleton h="h-2.5" className="w-2/3" />
            </div>
          </div>
        ))}</div>
      )}
      {achievements && achievements.length === 0 && (
        <EmptyState emoji="🏆" title="No achievements yet" body="Win matches and milestones will unlock here." />
      )}
      {achievements && achievements.length > 0 && (
        <div className="space-y-2.5">
          {achievements.filter((a) => a.unlocked || a.pct > 25).slice(0, 3).map((a) => (
            <AchievementRow key={a.code} a={a} />
          ))}
          {achievements.filter((a) => !(a.unlocked || a.pct > 25)).length > 0 && (
            <div className="pt-1">
              <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('/achievements')}>
                {achievements.filter((a) => a.unlocked).length}/{achievements.length} unlocked — see all
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

function AchievementRow({ a }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-white/[.02] p-3.5 transition hover:border-line-2">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl transition ${a.unlocked ? 'bg-gold/10 border border-gold/30 animate-pulse-glow' : 'bg-white/[.03] border border-line opacity-75'}`}>
        {a.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="truncate text-[13.5px] font-bold">{a.title}</h4>
          {a.unlocked ? <Badge tone="gold" className="!px-1.5 !text-[9px]">✓</Badge> : null}
        </div>
        <p className="mb-1.5 mt-0.5 truncate text-[11px] text-ink-faint">{a.description}</p>
        <div className="flex items-center gap-2">
          <Progress pct={a.pct} thin className="flex-1" color={a.unlocked ? 'linear-gradient(90deg,#fbbf24,#fcd34d)' : undefined} />
          <span className="text-[10px] font-semibold text-ink-faint">{Math.min(a.current, a.threshold)}/{a.threshold}</span>
        </div>
      </div>
    </div>
  )
}
