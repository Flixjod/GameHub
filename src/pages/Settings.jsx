import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { UserRound, Lock, Bell, Volume2, Palette, ShieldCheck, Loader2, Eye, EyeOff, Palette as ThemeIcon, Crown, Gem, LogOut, Mail, MailCheck, Ghost, Trash2, KeyRound } from 'lucide-react'
import { api } from '../lib/api.js'
import { Pic, Badge, Button, Card, VerifiedIcon, Progress, Modal } from '../components/UI.jsx'
import { useAuth, useToast, useTheme } from '../store.jsx'
import { ACCENT_THEMES, AVATAR_GRADIENTS } from '../lib/helpers.js'

const TABS = [
  { key: 'profile', label: 'Profile', icon: UserRound },
  { key: 'appearance', label: 'Appearance', icon: Palette },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'audio', label: 'Audio', icon: Volume2 },
  { key: 'privacy', label: 'Privacy', icon: ShieldCheck },
  { key: 'account', label: 'Account & security', icon: Lock },
]

export default function Settings() {
  const { user, setUser, logout, refreshUser } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useQueryTab()

  if (!user) return null
  const s = user.settings || {}

  const saveSettings = async (patch, msg) => {
    setUser({ ...user, settings: { ...s, ...patch } })
    try {
      const res = await api('/auth/me', { method: 'PATCH', body: { settings: patch } })
      setUser({ ...user, ...res.user, settings: res.user.settings })
      if (msg) toast(msg, 'success')
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-ink-dim">Your account, look & feel, and preferences.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin-dark" role="tablist" aria-label="Settings sections">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition cursor-pointer ${
              tab === key ? 'bg-emerald-neon text-[#04130b] shadow-[0_4px_16px_-4px_rgba(16,229,138,.55)]' : 'border border-line-2 text-ink-dim hover:text-ink hover:border-emerald-neon/40'}`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {tab === 'profile' && <ProfileTab user={user} toast={toast} />}
      {tab === 'appearance' && <AppearanceTab user={user} s={s} save={saveSettings} toast={toast} />}
      {tab === 'account' && <AccountTab user={user} toast={toast} setUser={setUser} refreshUser={refreshUser} logout={logout} />}
      {tab !== 'profile' && tab !== 'appearance' && tab !== 'account' && <PrefsTab tab={tab} s={s} save={saveSettings} />}
      {tab !== 'account' && (
        <Card className="flex items-center gap-4 p-5">
          <Pic user={user} size={48} ring={user.isPremium} />
          <div className="flex-1">
            <p className="flex items-center gap-1.5 text-sm font-bold">{user.displayName} {user.isVerified ? <VerifiedIcon size={13} /> : null} {user.isPremium && <span title="Premium">👑</span>}</p>
            <p className="mb-1.5 mt-0.5 text-[11px] text-ink-faint">Level {user.level} · {user.gems?.toLocaleString()} gems · {user.rating} elo</p>
            <Progress pct={user.levelProgress?.pct || 0} thin className="max-w-[220px]" />
          </div>
          <Button variant="ghost" onClick={logout}><LogOut size={14} /> Sign out</Button>
        </Card>
      )}
    </div>
  )
}

function useQueryTab() {
  const [params] = useSearchParams()
  const initial = params.get('tab') || 'profile'
  return useState(initial)
}

function ProfileTab({ user, toast }) {
  // eslint-disable-next-line no-unused-vars
  const [displayName, setDisplayName] = useState(user.displayName)
  const [bio, setBio] = useState(user.bio || '')
  const [avatar, setAvatar] = useState(user.avatar || '')
  const [color, setColor] = useState(user.avatarColor || 0)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    try {
      const res = await api('/auth/me', { method: 'PATCH', body: { displayName, bio, avatar, avatarColor: Number(color) } })
      toast('Profile updated', 'success')
      window.dispatchEvent(new CustomEvent('gh:refresh-user', { detail: res.user }))
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const ownedAvatars = user.ownedAvatars || []
  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center gap-5">
        <Pic user={{ displayName, avatar, avatarColor: Number(color) }} size={72} ring={user.isPremium} />
        <div className="min-w-0 flex-1">
          <p className="mb-1 flex items-center gap-1.5 text-lg font-bold">{displayName || 'Unnamed'} {user.isVerified ? <VerifiedIcon size={15} /> : null}</p>
          <p className="text-xs text-ink-faint"> @{user.username} · how other players see you</p>
        </div>
      </div>

      <LabeledInput label="Display name" value={displayName} onChange={setDisplayName} max={24} />
      <label className="block">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-faint">Bio</span>
        <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 280))} rows={3}
          className="w-full rounded-xl border border-line bg-panel px-4 py-3 text-sm transition focus:border-emerald-neon/50" placeholder="Tell rivals who they're up against…" />
        <span className="mt-1 block text-right text-[10px] text-ink-faint">{bio.length}/280</span>
      </label>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-faint">Avatar</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setAvatar('')}
            className={`flex h-11 w-11 items-center justify-center rounded-xl border text-lg transition cursor-pointer ${avatar === '' ? 'border-emerald-neon glow-ring' : 'border-line-2 hover:border-line-2/60'}`}
            title="Initials (default)">Aa</button>
          {['🦊', '🐺', '👾', '🦁', '🚀', '🎮', ...(ownedAvatars || [])].filter((v, i, arr) => arr.indexOf(v) === i).map((emo) => {
            const locked = emo && emo.length > 2 && !'🦊🐺👾🦁🚀🎮'.includes(emo)
            return (
              <button
                key={emo}
                onClick={() => { if (!locked) setAvatar(emo); else toast('That avatar is a Store item — unlock it there!', 'info') }}
                className={`flex h-11 w-11 items-center justify-center rounded-xl border text-lg transition cursor-pointer ${avatar === emo ? 'border-emerald-neon glow-ring' : locked ? 'border-line opacity-30' : 'border-line-2 hover:border-emerald-neon/40'}`}
                title={locked ? 'Available in Store' : emo}
              >{emo}</button>
            )
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-faint">Avatar background</p>
        <div className="flex flex-wrap gap-2">
          {AVATAR_GRADIENTS.map((g, i) => (
            <button key={i} onClick={() => setColor(i)} aria-label={`Background style ${i + 1}`}
              className={`h-10 w-10 rounded-xl border-2 transition cursor-pointer ${Number(color) === i ? 'border-emerald-neon scale-110' : 'border-transparent hover:opacity-80'}`}
              style={{ background: g }} />
          ))}
        </div>
      </div>

      <Button size="lg" disabled={busy} onClick={save}>
        {busy ? <Loader2 size={15} className="animate-spin" /> : null} Save profile
      </Button>
    </Card>
  )
}

function AppearanceTab({ user, s, save, toast }) {
  const { accent, setAccent } = useTheme()
  return (
    <Card className="p-6 space-y-6">
      <div>
        <p className="mb-1 font-bold">Accent theme</p>
        <p className="mb-3 text-xs text-ink-faint">Tints buttons, glows and charts across GameHub.</p>
        <div className="flex flex-wrap gap-3">
          {Object.entries(ACCENT_THEMES).map(([hex, t]) => (
            <button
              key={hex}
              onClick={() => {
                const owned = user.ownedThemes?.includes(hex)
                if (!owned && hex !== '#10e58a') { toast(`Buy the ${t.name} theme in the Store to equip it.`, 'info'); return }
                setAccent(hex)
              }}
              className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 transition cursor-pointer ${accent === hex ? 'border-emerald-neon glow-ring' : 'border-line-2 hover:brightness-110'}`}
            >
              <span className="h-5 w-5 rounded-full" style={{ background: hex, boxShadow: `0 0 12px ${hex}88` }} />
              <span className="text-xs font-bold">{t.name}</span>
              {hex !== '#10e58a' && (user.ownedThemes?.includes(hex) ? <Badge tone="gold">Owned</Badge> : <Badge tone="dim">Store</Badge>)}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-line bg-white/[.02] p-4 text-xs leading-relaxed text-ink-faint">
        Dark theme keeps the neon readable during long sessions — a light theme is on the roadmap.
      </div>
    </Card>
  )
}


function AccountTab({ user, toast, setUser, refreshUser, logout }) {
  const navigate = useNavigate()
  const isGuest = !!user.isGuest
  const [newUsername, setNewUsername] = useState('')
  const [guestPass, setGuestPass] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [email, setEmail] = useState(user.email || '')
  const [verifyToken, setVerifyToken] = useState('')
  const [deletePass, setDeletePass] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  const run = async (fn, msg) => {
    setBusy(true)
    try {
      await fn()
      if (msg) toast(msg, 'success')
      await refreshUser()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const upgradeGuest = () => run(async () => {
    const res = await api('/auth/me', { method: 'PATCH', body: { username: newUsername.trim(), password: guestPass, displayName: newUsername.trim() } })
    setUser({ ...user, ...res.user })
  }, 'Account upgraded - you can now sign in from any device.')

  const changePassword = () => run(async () => {
    await api('/auth/me', { method: 'PATCH', body: { currentPassword, password: newPassword } })
    setCurrentPassword(''); setNewPassword('')
  }, 'Password changed.')

  const saveEmail = () => run(async () => {
    await api('/auth/me', { method: 'PATCH', body: { email: email.trim() } })
  }, email.trim() ? 'Email saved - verify it to unlock recovery.' : 'Email removed.')

  const sendVerification = () => run(async () => {
    const d = await api('/auth/verify/resend', { method: 'POST' })
    setVerifyToken(d.token)
  }, 'Token generated below - no email service is configured in this environment.')

  const confirmVerification = () => run(async () => {
    await api('/auth/verify', { method: 'POST', body: { token: verifyToken.trim() } })
    setVerifyToken('')
  }, 'Email verified!')

  const deleteAccount = () => run(async () => {
    await api('/auth/me', { method: 'DELETE', body: isGuest ? {} : { password: deletePass } })
    logout()
    navigate('/login')
  })

  return (
    <div className="space-y-4">
      {isGuest && (
        <Card className="p-6 space-y-4">
          <div>
            <p className="flex items-center gap-2 font-bold"><Ghost size={16} className="text-cyber-cyan" /> Upgrade guest account</p>
            <p className="mb-3 mt-1 text-xs text-ink-faint">You are playing as a guest. Pick a username and password to keep your stats, rating and gems forever.</p>
          </div>
          <LabeledInput label="Username" value={newUsername} onChange={setNewUsername} max={20} placeholder="nightowl" />
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-faint">New password</span>
            <input type="password" value={guestPass} onChange={(e) => setGuestPass(e.target.value)} minLength={6}
              className="w-full rounded-xl border border-line bg-panel px-4 py-3 text-sm transition focus:border-emerald-neon/50" placeholder={'•'.repeat(8)} />
          </label>
          <Button disabled={busy || newUsername.trim().length < 3 || guestPass.length < 6} onClick={upgradeGuest}><KeyRound size={15} /> Save my account</Button>
        </Card>
      )}

      <Card className="p-6 space-y-4">
        <div>
          <p className="flex items-center gap-2 font-bold"><Mail size={16} className="text-emerald-neon" /> Email</p>
          <p className="mb-3 mt-1 text-xs text-ink-faint">
            {user.emailVerified ? <span className="inline-flex items-center gap-1 text-emerald-soft"><MailCheck size={13} /> Verified</span>
              : user.email ? 'Unverified - add a real address, then confirm the token below to unlock password recovery.' : 'Not set - add one to enable email verification and password recovery.'}
          </p>
        </div>
        <LabeledInput label="Email address" value={email} onChange={setEmail} type="email" placeholder="you@example.com" />
        {!user.emailVerified && email.trim() && (
          verifyToken ? (
            <div className="rounded-xl border border-gold/30 bg-gold/[.06] p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-200">Verification token</p>
              <code className="mt-1.5 block truncate rounded-lg bg-black/40 px-2.5 py-1.5 font-mono text-[11px] text-amber-200">{verifyToken}</code>
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={() => confirmVerification()} disabled={busy}>I have the token - verify now</Button>
                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard?.writeText(verifyToken); toast('Token copied', 'success') }}>Copy</Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={sendVerification} disabled={busy || !user.email}>Send verification token</Button>
          )
        )}
        <Button variant="outline" disabled={busy} onClick={saveEmail}>{user.email ? 'Update email' : 'Save email'}</Button>
      </Card>

      {!isGuest && (
        <Card className="p-6 space-y-4">
          <div>
            <p className="flex items-center gap-2 font-bold"><KeyRound size={16} className="text-gold" /> Change password</p>
            <p className="mb-3 mt-1 text-xs text-ink-faint">Sessions on other devices keep working, but new sign-ins need the new password.</p>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-faint">Current password</span>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password"
              className="w-full rounded-xl border border-line bg-panel px-4 py-3 text-sm transition focus:border-emerald-neon/50" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-faint">New password</span>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} autoComplete="new-password"
              className="w-full rounded-xl border border-line bg-panel px-4 py-3 text-sm transition focus:border-emerald-neon/50" />
          </label>
          <Button disabled={busy || !currentPassword || newPassword.length < 6} onClick={changePassword}>Update password</Button>
        </Card>
      )}

      <Card className="border-red-500/25 p-6 space-y-3">
        <div>
          <p className="flex items-center gap-2 font-bold text-red-300"><Trash2 size={16} /> Delete account</p>
          <p className="mb-3 mt-1 text-xs text-ink-faint">Permanently removes your profile, stats, friends, purchases and match history. This cannot be undone.</p>
        </div>
        {!isGuest && (
          <label className="block max-w-xs">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-faint">Confirm with your password</span>
            <input type="password" value={deletePass} onChange={(e) => setDeletePass(e.target.value)} autoComplete="current-password"
              className="w-full rounded-xl border border-line bg-panel px-4 py-3 text-sm transition focus:border-red-500/50" />
          </label>
        )}
        <Button variant="danger" disabled={busy || (!isGuest && !deletePass)} onClick={() => setConfirmDelete(true)}>
          <Trash2 size={15} /> Delete my account
        </Button>
      </Card>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete account permanently?" width={420}>
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-ink-dim">
            Everything tied to your player - XP, level, rating, friends, store purchases and every match record - will be erased immediately. There is no undo.
          </p>
          <div className="flex gap-2">
            <Button variant="danger" className="flex-1" disabled={busy} onClick={() => { setConfirmDelete(false); deleteAccount() }}>
              <Trash2 size={15} /> Yes, delete forever
            </Button>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Keep my account</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function PrefsTab({ tab, s, save }) {
  if (tab === 'notifications') {
    return (
      <Card className="p-6 space-y-1">
        <p className="mb-3 font-bold">Notification preferences</p>
        <Toggle label="Friend requests" desc="Get a nudge when someone wants to connect." on={s.notifFriends !== false} onChange={(v) => save({ notifFriends: v })} />
        <Toggle label="Match invites" desc="Room invitations from friends." on={s.notifInvites !== false} onChange={(v) => save({ notifInvites: v })} />
        <Toggle label="Achievement unlocks" desc="Celebrate milestones as they happen." on={s.notifAchievements !== false} onChange={(v) => save({ notifAchievements: v })} />
        <Toggle label="Tournament reminders" desc="Never miss a registered tournament." on={s.notifTournaments !== false} onChange={(v) => save({ notifTournaments: v })} />
      </Card>
    )
  }
  if (tab === 'audio') {
    return (
      <Card className="p-6 space-y-1">
        <p className="mb-3 font-bold">Audio</p>
        <Toggle label="Game sounds" desc="Disc flips, dice rolls and captures." on={s.sfx !== false} onChange={(v) => save({ sfx: v })} />
        <Toggle label="Turn chime" desc="A soft alert when it becomes your turn." on={s.chime !== false} onChange={(v) => save({ chime: v })} />
        <Toggle label="Ambient music" desc="Lo-fi tournament lounge vibes." on={s.music === true} onChange={(v) => save({ music: v })} />
      </Card>
    )
  }
  if (tab === 'privacy') {
    return (
      <Card className="p-6 space-y-1">
        <p className="mb-3 font-bold">Privacy</p>
        <Toggle label="Show profile publicly" desc="Your stats can be searched by any player." on={s.publicProfile !== false} onChange={(v) => save({ publicProfile: v })} />
        <Toggle label="Show online status" desc="Friends can see the classic green dot." on={s.showPresence !== false} onChange={(v) => save({ showPresence: v })} />
        <Toggle label="Allow room invites" desc="Other players can invite you to live rooms." on={s.allowInvites !== false} onChange={(v) => save({ allowInvites: v })} />
      </Card>
    )
  }
  return null
}

function Toggle({ label, desc, on: initial, onChange }) {
  const [on, setOn] = useState(!!initial)
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line/60 py-3.5 last:border-0">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-[11px] text-ink-faint">{desc}</p>
      </div>
      <button
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => { setOn(!on); onChange(!on) }}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer ${on ? 'bg-emerald-neon' : 'bg-white/10'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  )
}

function LabeledInput({ label, value, onChange, max, ...rest }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-faint">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} maxLength={max}
        className="w-full rounded-xl border border-line bg-panel px-4 py-3 text-sm transition focus:border-emerald-neon/50" {...rest} />
    </label>
  )
}
