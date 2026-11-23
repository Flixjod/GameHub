import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../lib/api.js'
import { Hero } from '../components/Hero.jsx'
import { PlayerStatsCard } from '../components/PlayerStatsCard.jsx'
import { GameCard, useRooms } from '../components/GameCard.jsx'
import { LiveRooms } from '../components/LiveRooms.jsx'
import { ActivityChart } from '../components/ActivityChart.jsx'
import { AchievementsCard } from '../components/AchievementsCard.jsx'
import FriendsOnline from '../components/FriendsOnline.jsx'
import { SkeletonCard, Skeleton, Badge } from '../components/UI.jsx'
import { Gamepad2, Ghost, MailCheck, Mail } from 'lucide-react'
import { useAuth } from '../store.jsx'

export default function Home() {
  const { user } = useAuth()
  const [games, setGames] = useState(null)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    api('/games').then((d) => setGames(d.games)).catch(() => setGames([]))
  }, [])

  // hero "Join a Room" scrolls to the rooms section
  useEffect(() => {
    if (location.hash === '#rooms' || location.search.includes('join=1')) {
      setTimeout(() => document.getElementById('rooms')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250)
    }
  }, [location])

  return (
    <div className="space-y-6">
      {user?.isGuest && (
        <button onClick={() => navigate('/settings?tab=account')} className="flex w-full flex-wrap items-center gap-3 rounded-xl border border-cyber-cyan/30 bg-cyber-cyan/[.06] px-4 py-3 text-left text-sm cursor-pointer transition hover:border-cyber-cyan/60">
          <Ghost size={16} className="text-cyber-cyan" />
          <span className="font-semibold text-ink-dim">You&rsquo;re playing as a guest</span>
          <span className="text-xs text-ink-faint">Stats and rating are saved, but pick a username in Settings &rarr; Account &amp; security to keep this player forever.</span>
          <Badge tone="cyan" className="ml-auto">Upgrade now</Badge>
        </button>
      )}
      {user && !user.isGuest && user.email && !user.emailVerified && (
        <button onClick={() => navigate('/settings?tab=account')} className="flex w-full flex-wrap items-center gap-3 rounded-xl border border-gold/30 bg-gold/[.06] px-4 py-3 text-left text-sm cursor-pointer transition hover:border-gold/60">
          <MailCheck size={16} className="text-gold" />
          <span className="font-semibold text-ink-dim">Verify your email</span>
          <span className="text-xs text-ink-faint">Confirm {user.email} in Settings to unlock password recovery if you ever get locked out.</span>
          <Badge tone="gold" className="ml-auto">Verify</Badge>
        </button>
      )}
      <Hero />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* main column */}
        <div className="space-y-6 min-w-0">
          <section>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h3 className="flex items-center gap-2.5 text-[19px] font-bold"><Gamepad2 size={19} className="text-emerald-neon" /> Popular Games</h3>
                <p className="mt-0.5 text-xs text-ink-faint">Jump into a match in seconds</p>
              </div>
            </div>
            {!games ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} lines={2} />)}
              </div>
            ) : (
              <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[...games.slice(0, 4)].map((g) => <GameCard key={g.id} game={g} onClick={() => navigate(`/play/${g.id}`)} />)}
                <GameCard more onClick={() => navigate('/games')} />
              </div>
            )}
          </section>

          <section>
            <div className="mb-4">
              <h3 className="text-[19px] font-bold">Live Rooms</h3>
              <p className="mt-0.5 text-xs text-ink-faint">Capacity-checked joining — hop in or start your own</p>
            </div>
            <LiveRooms />
          </section>
        </div>

        {/* right column */}
        <div className="space-y-6">
          <PlayerStatsCard />
          <AchievementsCard />
          <FriendsOnline />
        </div>
      </div>

      <ActivityChart />
    </div>
  )
}
