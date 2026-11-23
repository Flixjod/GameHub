import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Search, Check, X, Trash2, MessageCircle, Swords, UserMinus, Inbox } from 'lucide-react'
import { api } from '../lib/api.js'
import { Pic, Badge, Button, Card, EmptyState, SectionHead, Modal } from '../components/UI.jsx'
import { useSocket, useAuth, useToast } from '../store.jsx'
import { timeAgo } from '../lib/helpers.js'

export default function Friends() {
  const { user } = useAuth()
  const { socket } = useSocket()
  const navigate = useNavigate()
  const toast = useToast()
  const [data, setData] = useState(null)
  const [q, setQ] = useState('')
  const [found, setFound] = useState([])
  const [removeTarget, setRemoveTarget] = useState(null)
  const [tab, setTab] = useState('friends')

  const load = () => api('/friends').then(setData).catch(() => setData({ friends: [], requests: [], sent: [] }))
  useEffect(() => { load() }, [])

  // re-render on presence changes
  useEffect(() => {
    if (!socket) return
    const h = () => load()
    socket.on('presence', h)
    socket.on('notify', h)
    return () => { socket.off('presence', h); socket.off('notify', h) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket])

  // user search
  const timer = useRef(null)
  useEffect(() => {
    clearTimeout(timer.current)
    if (q.trim().length < 1) { setFound([]); return }
    timer.current = setTimeout(() => {
      api(`/users/search?q=${encodeURIComponent(q.trim())}`)
        .then((d) => setFound(d.users.filter((u) => u.id !== user.id)))
        .catch(() => setFound([]))
    }, 250)
  }, [q, user.id])

  const friendUsernames = () => new Set([...(data?.friends || []).map((f) => f.username), user.username, ...(data?.sent || []).map((s) => s.username)])

  const openRoomsOf = () => [] // handled via LiveRooms component

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Friends</h1>
        <p className="mt-1 text-sm text-ink-dim">Your crew — presence is live, based on real connections.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-4">
          {/* tabs */}
          <div className="flex gap-2">
            <button onClick={() => setTab('friends')} className={`rounded-full px-4 py-1.5 text-xs font-bold transition cursor-pointer ${tab === 'friends' ? 'bg-emerald-neon text-[#04130b]' : 'border border-line-2 text-ink-dim hover:text-ink'}`}>
              Friends {data?.friends?.length ? `(${data.friends.length})` : ''}
            </button>
            <button onClick={() => setTab('requests')} className={`rounded-full px-4 py-1.5 text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5 ${tab === 'requests' ? 'bg-emerald-neon text-[#04130b]' : 'border border-line-2 text-ink-dim hover:text-ink'}`}>
              <Inbox size={12} /> Requests {data?.requests?.length ? `(${data.requests.length})` : ''}
            </button>
          </div>

          {tab === 'friends' && (
            !data ? <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
            : data.friends.length === 0 ? (
              <EmptyState emoji="👥" title="Friends list is empty" body="Search players on the right and send invites — once they accept, presence and invites go live." />
            ) : (
              <div className="stagger space-y-2.5">
                {data.friends.map((f) => (
                  <FriendRow key={f.id} f={f} navigate={navigate} toast={toast} onAskRemove={() => setRemoveTarget(f)} />
                ))}
              </div>
            )
          )}

          {tab === 'requests' && (
            !data ? <div className="skeleton h-32 rounded-2xl" />
            : data.requests.length === 0 ? (
              <EmptyState emoji="📭" title="No pending requests" body="Invitations you receive will land here." />
            ) : (
              <div className="stagger space-y-2.5">
                {data.requests.map((r) => (
                  <RequestRow key={r.id} request={r} toast={toast} reload={load} navigate={navigate} />
                ))}
              </div>
            )
          )}
        </div>

        {/* search panel */}
        <Card className="h-fit p-5">
          <SectionHead icon={Search} title="Find players" sub="Search by username or display name" />
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. nova"
              aria-label="Search players"
              className="w-full rounded-xl border border-line bg-panel py-2.5 pl-9 pr-3 text-sm transition focus:border-emerald-neon/50 focus:glow-ring"
            />
          </div>
          <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto scrollbar-thin-dark">
            {q && found.length === 0 && <p className="py-6 text-center text-xs text-ink-faint">No players found for “{q}”.</p>}
            {found.map((u) => (
              <PlayerSearchRow key={u.id} u={u} toast={toast} already={friendUsernames()} onOpenProfile={() => navigate(`/profile/${u.username}`)} />
            ))}
          </div>
        </Card>
      </div>

      <Modal open={!!removeTarget} onClose={() => setRemoveTarget(null)} title={`Remove ${removeTarget?.displayName}?`} width={420}>
        <p className="text-sm text-ink-dim">You'll disappear from each other's lists. Match history stays intact.</p>
        <div className="mt-5 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setRemoveTarget(null)}>Cancel</Button>
          <Button variant="danger" className="flex-1" onClick={async () => {
            try {
              await api(`/friends/${removeTarget.username}`, { method: 'DELETE' })
              toast(`${removeTarget.displayName} removed`)
              setRemoveTarget(null)
              load()
            } catch (e) { toast(e.message, 'error') }
          }}><UserMinus size={15} /> Remove</Button>
        </div>
      </Modal>
    </div>
  )
}

function FriendRow({ f, navigate, toast, onAskRemove }) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-line bg-white/[.02] p-4 transition hover:border-emerald-neon/25">
      <button onClick={() => navigate(`/profile/${f.username}`)} className="cursor-pointer hover:opacity-90">
        <Pic user={f} size={44} online={f.online} />
      </button>
      <button onClick={() => navigate(`/profile/${f.username}`)} className="min-w-0 flex-1 text-left cursor-pointer">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[14px] font-bold">{f.displayName}</span>
          {f.isVerified ? <Badge tone="emerald" className="!px-1.5 !text-[9px]">✓</Badge> : null}
          {f.isPremium ? <span className="text-[10px]">👑</span> : null}
        </span>
        <span className="text-[11px] text-ink-faint">
          @{f.username} · Lv.{f.level} · {f.rating} elo · {f.online ? <span className="font-semibold text-emerald-soft">online</span> : `last seen ${timeAgo(f.lastSeen)}`}
        </span>
      </button>
      <Button
        size="sm"
        variant={f.online ? 'primary' : 'outline'}
        onClick={() => navigate(`/games`)}
        title={f.online ? 'Set up a match' : 'Friend is offline'}
      >
        <Swords size={13} /> Challenge
      </Button>
      <button onClick={onAskRemove} className="rounded-lg p-2 text-ink-faint transition hover:bg-red-500/10 hover:text-red-300 cursor-pointer" aria-label={`Remove ${f.displayName}`}><UserMinus size={15} /></button>
    </div>
  )
}

function RequestRow({ request, toast, reload, navigate }) {
  const [busy, setBusy] = useState(false)
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-emerald-neon/20 bg-emerald-neon/[.03] p-4">
      <button onClick={() => navigate(`/profile/${request.username}`)} className="cursor-pointer">
        <Pic user={request} size={44} />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold">{request.displayName}</p>
        <p className="text-[11px] text-ink-faint">@{request.username} · {request.rating} elo · {timeAgo(request.createdAt)}</p>
      </div>
      <Button size="sm" disabled={busy} onClick={async () => {
        setBusy(true)
        try {
          const res = await api(`/friends/requests/${request.id}/accept`, { method: 'POST' })
          toast(res.message || 'Friend added!', 'success')
          reload()
        } catch (e) { toast(e.message, 'error') } finally { setBusy(false) }
      }}><Check size={14} /> Accept</Button>
      <Button size="sm" variant="ghost" disabled={busy} onClick={async () => {
        setBusy(true)
        try { await api(`/friends/requests/${request.id}/decline`, { method: 'POST' }); toast('Request declined'); reload() }
        catch (e) { toast(e.message, 'error') } finally { setBusy(false) }
      }}><X size={15} /> Decline</Button>
    </div>
  )
}

function PlayerSearchRow({ u, toast, already, onOpenProfile }) {
  const [busy, setBusy] = useState(false)
  const isFriend = already && already.has(u.username)
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-white/[.02] p-3">
      <button onClick={onOpenProfile} className="cursor-pointer"><Pic user={u} size={34} online={u.online} /></button>
      <button onClick={onOpenProfile} className="min-w-0 flex-1 text-left cursor-pointer">
        <span className="block truncate text-[13px] font-bold">{u.displayName}</span>
        <span className="block text-[10px] text-ink-faint">@{u.username} · {u.rating} elo</span>
      </button>
      <Button size="sm" variant={isFriend ? 'ghost' : 'outline'} disabled={busy || isFriend} onClick={async () => {
        setBusy(true)
        try {
          const res = await api('/friends/requests', { method: 'POST', body: { username: u.username } })
          toast(res.message || 'Request sent', 'success')
        } catch (e) { toast(e.message, 'error') } finally { setBusy(false) }
      }}>
        <UserPlus size={13} /> {isFriend ? 'Friends' : 'Add'}
      </Button>
    </div>
  )
}
