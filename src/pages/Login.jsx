import React, { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Gamepad2, TrendingUp, Trophy, Users } from 'lucide-react'
import { useAuth, useToast } from '../store.jsx'
import { Button } from '../components/UI.jsx'

export default function Login() {
  const { user, login, register } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const u = mode === 'login' ? await login(username, password) : await register(username, password, displayName || undefined)
      toast(`Welcome, ${u.displayName}! 🎮`, 'success')
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const quickDemo = async (who) => {
    setBusy(true)
    try {
      await login(who, 'password123')
      toast(`Signed in as ${who}`, 'success')
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-full lg:grid-cols-2">
      {/* left / brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-panel p-12 lg:flex">
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-emerald-neon/[.1] blur-[110px] animate-pulse-glow" />
        <div className="pointer-events-none absolute -bottom-40 left-40 h-96 w-96 rounded-full bg-cyber-cyan/[.06] blur-[120px]" />

        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-neon to-cyber-cyan text-[#04130b] shadow-[0_4px_24px_-4px_rgba(16,229,138,.7)]">
            <Gamepad2 size={24} strokeWidth={2.4} />
          </span>
          <span className="text-2xl font-extrabold tracking-tight">Game<span className="text-emerald-neon text-glow">Hub</span></span>
        </div>

        <div className="relative">
          <h2 className="text-[44px] font-extrabold leading-[1.08] tracking-tight max-w-md">
            Play. Enjoy.<br />With <span className="text-emerald-neon text-glow">Friends.</span>
          </h2>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink-dim">
            Four classic games, live rooms, ranked ladder, tournaments and achievements — usually all under one premium dark roof.
          </p>
          <div className="mt-10 grid max-w-md grid-cols-3 gap-3">
            {[
              { icon: Trophy, label: 'Tournaments', tone: 'text-gold' },
              { icon: TrendingUp, label: 'Ranked ladder', tone: 'text-emerald-soft' },
              { icon: Users, label: 'Live rooms', tone: 'text-cyber-cyan' },
            ].map(({ icon: Icon, label, tone }) => (
              <div key={label} className="rounded-xl border border-line bg-white/[.02] p-4 text-center">
                <Icon size={20} className={`mx-auto mb-2 ${tone}`} />
                <p className="text-[11px] font-semibold text-ink-dim">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-ink-faint">© GameHub · built for game night</p>
      </div>

      {/* right / form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-[420px] animate-rise-in">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-neon to-cyber-cyan text-[#04130b]">
              <Gamepad2 size={24} strokeWidth={2.4} />
            </span>
            <span className="text-2xl font-extrabold tracking-tight">Game<span className="text-emerald-neon">Hub</span></span>
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight">{mode === 'login' ? 'Welcome back' : 'Create your player'}</h1>
          <p className="mt-1.5 text-sm text-ink-dim">{mode === 'login' ? 'Sign in to continue your streak.' : 'Pick a handle — you\'ll be rolling in seconds.'}</p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            {mode === 'register' && (
              <Field label="Display name" value={displayName} onChange={setDisplayName} placeholder="NovaByte" />
            )}
            <Field label="Username" value={username} onChange={setUsername} placeholder="demo" required pattern="[a-zA-Z0-9_]+" />
            <Field label="Password" value={password} onChange={setPassword} placeholder="••••••••" type="password" required minLength={6} />

            {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs font-semibold text-red-300">{error}</p>}

            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? 'One sec…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-ink-faint">
            {mode === 'login' ? "New to GameHub? " : 'Already a member? '}
            <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null) }} className="font-semibold text-emerald-soft transition hover:text-emerald-neon cursor-pointer">
              {mode === 'login' ? 'Create an account' : 'Sign in instead'}
            </button>
          </p>

          <div className="mt-8 rounded-2xl border border-line bg-white/[.02] p-4">
            <p className="mb-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-ink-faint">Demo accounts · password123</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['demo', 'nova', 'blitz', 'aria', 'mira'].map((who) => (
                <button key={who} disabled={busy} onClick={() => quickDemo(who)}
                  className="rounded-lg border border-emerald-neon/25 bg-emerald-neon/[.06] px-3 py-1.5 text-xs font-bold text-emerald-soft transition hover:bg-emerald-neon/[.15] cursor-pointer disabled:opacity-50">
                  {who}
                </button>
              ))}
            </div>
            <p className="mt-2.5 text-center text-[10px] text-ink-faint">Tip: open two tabs with different users to see live multiplayer.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', ...rest }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-faint">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-line bg-panel px-4 py-3 text-sm text-ink placeholder:text-ink-faint transition focus:border-emerald-neon/50 focus:glow-ring"
        {...rest}
      />
    </label>
  )
}
