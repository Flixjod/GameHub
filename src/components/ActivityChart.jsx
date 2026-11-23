import React, { useState, useEffect } from 'react'
import { Activity } from 'lucide-react'
import { Card, SectionHead, EmptyState, Skeleton } from './UI.jsx'
import { api } from '../lib/api.js'

export function ActivityChart() {
  const [days, setDays] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api('/activity').then((d) => setDays(d.days)).catch((e) => setError(e.message))
  }, [])

  return (
    <Card className="p-5">
      <SectionHead
        icon={Activity}
        title="Gaming Activity"
        sub="Last 7 days · real matches only"
      />
      {error && <EmptyState emoji="⚠️" title="Couldn't load activity" body={error} />}
      {!error && !days && (
        <div className="flex h-[150px] items-end gap-3 px-1">
          {Array.from({ length: 7 }).map((_, i) => <div key={i} className="skeleton flex-1 rounded-t-lg" style={{ height: `${30 + ((i * 37) % 70)}%` }} />)}
        </div>
      )}
      {days && days.every((d) => d.games === 0) && (
        <EmptyState
          emoji="📈"
          title="No matches in the last 7 days"
          body="Play a game — your daily activity and wins will chart here."
        />
      )}
      {days && !days.every((d) => d.games === 0) && (
        <>
          <div className="flex h-[150px] items-end gap-2.5 px-1" role="img" aria-label="Daily activity, last 7 days">
            {days.map((d, i) => {
              const max = Math.max(...days.map((x) => x.games), 1)
              const h = Math.round((d.games / max) * 100)
              return (
                <div key={d.date} className="group relative flex flex-1 flex-col items-center justify-end gap-1.5" style={{ height: '100%' }}>
                  <div className="pointer-events-none absolute -top-1 z-10 hidden whitespace-nowrap rounded-lg border border-line-2 bg-panel-2 px-2 py-1 text-[10px] font-semibold group-hover:block">
                    {d.games} games · {d.wins} wins
                  </div>
                  <div className="flex w-full max-w-[34px] flex-1 items-end">
                    <div
                      className="w-full rounded-t-lg transition-all duration-500 group-hover:brightness-125"
                      style={{
                        height: `${Math.max(h, d.games ? 8 : 3)}%`,
                        background: d.games
                          ? 'linear-gradient(180deg, var(--color-emerald-neon) 0%, rgba(16,229,138,.25) 100%)'
                          : 'rgba(255,255,255,.05)',
                        boxShadow: d.games ? '0 0 14px -4px rgba(16,229,138,.55)' : 'none',
                        animation: `bar-grow .6s cubic-bezier(.22,.8,.32,1) ${i * 0.05}s both`,
                        transformOrigin: 'bottom',
                      }}
                    />
                  </div>
                  <span className={`text-[10px] font-semibold ${d.games ? 'text-ink-dim' : 'text-ink-faint'}`}>{d.label}</span>
                </div>
              )
            })}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-xs text-ink-faint">
            <span>{days.reduce((a, d) => a + d.games, 0)} matches this week</span>
            <span className="text-emerald-soft font-semibold">{days.reduce((a, d) => a + d.wins, 0)} wins</span>
          </div>
        </>
      )}
    </Card>
  )
}
