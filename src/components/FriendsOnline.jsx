import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, ChevronRight, Loader2 } from 'lucide-react'
import { Card, SectionHead, Button, Pic, Badge } from './UI.jsx'
import { api } from '../lib/api.js'
import { useSocket } from '../store.jsx'

export default function FriendsOnline() {
  const navigate = useNavigate()
  const { socket } = useSocket()
  const [data, setData] = useState(null)

  const load = () => api('/friends').then(setData).catch(() => {})
  useEffect(() => { load() }, [])
  useEffect(() => {
    if (!socket) return
    const h = () => load()
    socket.on('presence', h)
    socket.on('notify', h)
    return () => { socket.off('presence', h); socket.off('notify', h) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket])

  if (!data) {
    return (
      <Card className="p-5">
        <SectionHead icon={Users} title="Friends Online" sub="Live presence" />
        <div className="flex gap-2">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-11 w-11 rounded-full" />)}</div>
      </Card>
    )
  }

  const online = data.friends.filter((f) => f.online)
  const show = [...online, ...data.friends.filter((f) => !f.online)].slice(0, 8)
  const rest = data.friends.length - show.length

  return (
    <Card className="p-5">
      <SectionHead
        icon={Users}
        title="Friends Online"
        sub={`${online.length} of ${data.friends.length} online now`}
        action={<Button variant="ghost" size="sm" onClick={() => navigate('/friends')}>All Friends <ChevronRight size={14} /></Button>}
      />
      {data.friends.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-2/70 px-4 py-8 text-center">
          <p className="text-3xl mb-2">👥</p>
          <p className="text-sm font-semibold">No friends yet</p>
          <p className="mb-3 mt-1 text-xs text-ink-faint">Find players and add them from the Friends page.</p>
          <Button size="sm" onClick={() => navigate('/friends')}>Add friends</Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2.5">
            {show.map((f) => (
              <button
                key={f.id}
                onClick={() => navigate(`/profile/${f.username}`)}
                className="group flex items-center gap-2.5 rounded-xl border border-line bg-white/[.02] py-2 pl-2 pr-3.5 transition hover:border-emerald-neon/30 hover:bg-emerald-neon/[.04] cursor-pointer max-md:flex-1 max-md:justify-center max-md:px-2"
                title={`${f.displayName} — ${f.online ? 'online' : 'offline'}`}
              >
                <Pic user={f} size={32} online={f.online} />
                <div className="hidden text-left min-[420px]:block">
                  <p className="max-w-[86px] truncate text-xs font-bold leading-tight">{f.displayName}</p>
                  <p className={`text-[10px] font-medium ${f.online ? 'text-emerald-soft' : 'text-ink-faint'}`}>{f.online ? 'Online' : 'Offline'}</p>
                </div>
              </button>
            ))}
            {rest > 0 && (
              <button onClick={() => navigate('/friends')} className="flex h-11 w-11 items-center justify-center rounded-full border border-dashed border-line-2 text-xs font-bold text-ink-faint transition hover:text-emerald-soft hover:border-emerald-neon/40 cursor-pointer">
                +{rest}
              </button>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-xs text-ink-faint">
            <span>Invite a friend to a match from their profile</span>
            <Badge tone={online.length ? 'emerald' : 'dim'}>{online.length} live</Badge>
          </div>
        </>
      )}
    </Card>
  )
}
