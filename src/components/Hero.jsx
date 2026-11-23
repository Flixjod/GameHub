import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Compass, UsersRound, Wand2, ChevronRight, Gamepad2, Dices, Crown } from 'lucide-react'
import { Button, Badge } from './UI.jsx'

const SLIDES = [
  { badge: '✨ Welcome to GameHub', title: <>Play. Enjoy.<br />With <span className="text-emerald-neon text-glow">Friends.</span></>, body: 'Dive into classic board games reimagined — live rooms, smart bots, tournaments and rewards wait on the other side of the dice.' },
  { badge: '🏆 Season live', title: <>Climb the <span className="text-cyber-cyan text-glow">Leaderboard.</span></>, body: 'Every win moves you up the global ladder. Weekly resets keep the race fresh — claim your spot.' },
  { badge: '👑 Go Premium', title: <>Unlock <span className="text-gold text-glow">Golden</span> rewards.</>, body: 'Premium members earn double XP, exclusive avatars and the royal crown on every profile.' },
]

export function Hero() {
  const navigate = useNavigate()
  const [slide, setSlide] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 7000)
    return () => clearInterval(t)
  }, [])
  const s = SLIDES[slide]

  return (
    <section className="panel relative overflow-hidden">
      {/* ambient glows */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-neon/[.13] blur-[90px] animate-pulse-glow" />
      <div className="pointer-events-none absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-cyber-cyan/[.08] blur-[100px]" />

      <div className="relative grid gap-8 p-7 md:grid-cols-[1.25fr_1fr] md:p-10 lg:p-12">
        {/* left copy */}
        <div key={slide} className="flex flex-col justify-center animate-rise-in" style={{ minHeight: 260 }}>
          <span className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-neon/30 bg-emerald-neon/[.08] px-3.5 py-1.5 text-xs font-semibold text-emerald-soft">
            <Sparkles size={13} />
            {s.badge}
          </span>
          <h1 className="text-[38px] font-extrabold leading-[1.06] tracking-tight sm:text-5xl lg:text-[56px]">
            {s.title}
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink-dim">{s.body}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button size="lg" onClick={() => navigate('/games')} aria-label="Explore games">
              <Compass size={18} /> Explore Games
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate(`/?join=1#rooms`)} aria-label="Join a room">
              <UsersRound size={18} className="text-emerald-soft" /> Join a Room
            </Button>
          </div>
        </div>

        {/* right art */}
        <div className="relative hidden items-center justify-center md:flex" aria-hidden="true">
          <div className="absolute h-[240px] w-[240px] rounded-full border border-emerald-neon/20 bg-gradient-to-br from-emerald-neon/[.07] to-transparent" />
          <div className="absolute h-[340px] w-[340px] rounded-full border border-line-2/60" />

          <div className="absolute -top-1 left-8 flex h-14 w-14 items-center justify-center rounded-2xl glass text-emerald-soft shadow-xl animate-floaty" style={{ '--fr-rot': '-8deg', animationDelay: '.4s' }}>
            <Gamepad2 size={24} />
          </div>
          <div className="absolute bottom-6 right-6 flex h-16 w-16 items-center justify-center rounded-2xl glass text-cyber-cyan shadow-xl animate-floaty" style={{ '--fr-rot': '10deg', animationDelay: '1.4s' }}>
            <Dices size={28} />
          </div>
          <div className="absolute right-24 top-2 flex h-12 w-12 items-center justify-center rounded-2xl glass text-gold shadow-xl animate-floaty" style={{ '--fr-rot': '6deg', animationDelay: '2.2s' }}>
            <Crown size={22} />
          </div>
          <span className="absolute left-2 bottom-16 text-4xl animate-floaty drop-shadow-[0_12px_20px_rgba(0,0,0,.6)]" style={{ animationDelay: '.9s', '--fr-rot': '-14deg' }}>♟️</span>
          <span className="absolute left-24 -bottom-2 text-3xl animate-floaty drop-shadow-[0_12px_20px_rgba(0,0,0,.6)]" style={{ animationDelay: '1.8s', '--fr-rot': '12deg' }}>♟️</span>
          <span className="absolute right-2 top-24 text-3xl animate-floaty drop-shadow-[0_12px_20px_rgba(0,0,0,.6)]" style={{ animationDelay: '.2s', '--fr-rot': '18deg' }}>🎲</span>

          {/* glowing energy orb */}
          <div className="relative flex h-44 w-44 items-center justify-center">
            <div className="absolute inset-6 rounded-full bg-emerald-neon/20 blur-2xl animate-pulse-glow" />
            <Gamepad2 size={72} className="relative text-emerald-neon drop-shadow-[0_0_30px_rgba(16,229,138,.9)]" strokeWidth={1.4} />
          </div>
        </div>
      </div>

      {/* slide indicators */}
      <div className="absolute bottom-5 right-8 hidden items-center gap-2 md:flex" role="tablist" aria-label="Hero slides">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={slide === i}
            aria-label={`Slide ${i + 1}`}
            onClick={() => setSlide(i)}
            className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${slide === i ? 'w-7 bg-emerald-neon shadow-[0_0_10px_rgba(16,229,138,.8)]' : 'w-2 bg-line-2 hover:bg-emerald-neon/40'}`}
          />
        ))}
      </div>
    </section>
  )
}
