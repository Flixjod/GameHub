import React, { useState, useEffect } from 'react'
import { Medal } from 'lucide-react'
import { api } from '../lib/api.js'
import { AchievementsGallery } from '../components/AchievementsCard.jsx'
import { Badge, Card, EmptyState } from '../components/UI.jsx'
import { useAuth } from '../store.jsx'

export default function Achievements() {
  const { user } = useAuth()
  const [achievements, setAchievements] = useState(null)

  useEffect(() => {
    api('/achievements').then((d) => setAchievements(d.achievements)).catch(() => setAchievements([]))
  }, [])

  const unlocked = achievements?.filter((a) => a.unlocked) || []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Achievements</h1>
          <p className="mt-1 text-sm text-ink-dim">Milestones earned from real matchd — no shortcuts.</p>
        </div>
        <Card className="flex items-center gap-2.5 px-4 py-2.5 border-gold/30">
          <Medal size={16} className="text-gold" />
          <span className="text-lg font-black text-gold">{unlocked.length}/{achievements?.length || 0}</span>
          <span className="text-[11px] text-ink-faint">unlocked</span>
        </Card>
      </div>

      {!achievements ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}</div>
      ) : achievements.length === 0 ? (
        <EmptyState emoji="🏆" title="No achievements configured" />
      ) : (
        <>
          <div className="flex flex-wrap gap-2 text-xs text-ink-faint">
            <Badge tone="emerald">{unlocked.filter((a) => a.accent === 'emerald').length} emerald</Badge>
            <Badge tone="gold">{unlocked.filter((a) => a.accent === 'gold').length} gold</Badge>
            <Badge tone="cyan">{unlocked.filter((a) => a.accent === 'cyan').length} cyan</Badge>
            <Badge tone="royal">{unlocked.filter((a) => a.accent === 'royal').length} royal</Badge>
          </div>
          <AchievementsGallery achievements={achievements} />
        </>
      )}
    </div>
  )
}
