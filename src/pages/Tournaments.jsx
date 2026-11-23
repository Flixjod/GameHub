import React, { useState, useEffect } from 'react'
import { Trophy, CalendarDays, Loader2, CheckCircle2, Award, Ticket } from 'lucide-react'
import { api } from '../lib/api.js'
import { Pic, Badge, Button, Card, EmptyState, Modal, SectionHead } from '../components/UI.jsx'
import { GAME_ART } from '../components/GameArt.jsx'
import { useToast } from '../store.jsx'

const STATUS_TONE = { active: 'emerald', upcoming: 'cyan', completed: 'dim' }
const GAME_NAMES = { reversi: 'Reversi', ludo: 'Ludo', snakes: 'Snake & Ladder', tictactoe: 'TicTacToe' }

export default function Tournaments() {
  const [data, setData] = useState(null)
  const [detail, setDetail] = useState(null)
  const [busy, setBusy] = useState(null)
  const toast = useToast()

  const load = () => api('/tournaments').then(setData).catch(() => setData({ tournaments: [] }))
  useEffect(() => { load() }, [])

  const join = async (t) => {
    setBusy(t.id)
    try {
      await api(`/tournaments/${t.id}/join`, { method: 'POST' })
      toast(`Registered for ${t.name} 🎟️`, 'success')
      load()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(null)
    }
  }

  const leave = async (t) => {
    setBusy(t.id)
    try {
      await api(`/tournaments/${t.id}/join`, { method: 'DELETE' })
      toast(`Withdrew from ${t.name}`)
      load()
      if (detail?.id === t.id) setDetail(null)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(null)
    }
  }

  const fmtDate = (iso) => {
    if (!iso) return 'TBA'
    const d = new Date(iso)
    return d.toLocaleString('en', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (!data) {
    return <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}</div>
  }

  const groups = [
    { key: 'active', title: 'Live now', icon: Trophy },
    { key: 'upcoming', title: 'Upcoming', icon: CalendarDays },
    { key: 'completed', title: 'Completed', icon: Award },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Tournaments</h1>
        <p className="mt-1 text-sm text-ink-dim">Compete for gems, glory and season rankings.</p>
      </div>

      {groups.map(({ key, title, icon: Icon }) => {
        const list = data.tournaments.filter((t) => t.status === key)
        return (
          <section key={key}>
            <SectionHead icon={Icon} title={title} sub={`${list.length} tournament${list.length === 1 ? '' : 's'}`} />
            {list.length === 0 ? (
              <EmptyState emoji={key === 'active' ? '⏱️' : key === 'upcoming' ? '🗓️' : '📦'} title={key === 'active' ? 'No tournaments running' : key === 'upcoming' ? 'Nothing scheduled yet' : 'No history yet'} />
            ) : (
              <div className="stagger grid gap-4 md:grid-cols-2">
                {list.map((t) => {
                  const art = GAME_ART[t.game] || GAME_ART.more
                  return (
                    <Card key={t.id} className="flex flex-col overflow-hidden p-0 transition hover:-translate-y-0.5 hover:border-emerald-neon/30">
                      <div className="relative flex items-center gap-4 p-5" style={{ background: `linear-gradient(120deg, ${t.game === 'reversi' ? 'rgba(16,229,138,.07)' : t.game === 'ludo' ? 'rgba(251,146,60,.07)' : t.game === 'snakes' ? 'rgba(139,92,246,.08)' : 'rgba(34,211,238,.07)'}, transparent 65%)` }}>
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-line-2 text-3xl">{art.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-[16px] font-bold">{t.name}</h3>
                            <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs text-ink-faint">{t.description}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-line px-5 py-3 text-[11px] text-ink-faint">
                        <span className="inline-flex items-center gap-1.5"><Ticket size={12} /> {t.registered}/{t.max_players} seats</span>
                        <span className="inline-flex items-center gap-1.5"><CalendarDays size={12} /> {fmtDate(t.startsAt)}</span>
                        <span className="inline-flex items-center gap-1.5 text-gold"><Trophy size={12} /> {t.prize}</span>
                      </div>
                      <div className="flex gap-2 px-5 pb-4">
                        {t.status === 'completed' ? (
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => setDetail(t)}>Final standings</Button>
                        ) : t.joined ? (
                          <>
                            <Button variant="outline" size="sm" className="flex-1" disabled={busy === t.id} onClick={() => setDetail(t)}>
                              <CheckCircle2 size={14} className="text-emerald-neon" /> Registered
                            </Button>
                            {t.status === 'upcoming' && (
                              <Button variant="danger" size="sm" disabled={busy === t.id} onClick={() => leave(t)}>{busy === t.id ? <Loader2 size={13} className="animate-spin" /> : 'Withdraw'}</Button>
                            )}
                          </>
                        ) : (
                          <>
                            <Button size="sm" className="flex-1" disabled={busy === t.id} onClick={() => join(t)} aria-label={`Register for ${t.name}`}>
                              {busy === t.id ? <Loader2 size={14} className="animate-spin" /> : <><Ticket size={14} /> Register</>}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setDetail(t)}>Details</Button>
                          </>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name} width={560}>
        {detail && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge tone={STATUS_TONE[detail.status]}>{detail.status}</Badge>
              <Badge tone="dim">{GAME_NAMES[detail.game]}</Badge>
              <Badge tone="gold">{detail.prize}</Badge>
            </div>
            <p className="text-sm leading-relaxed text-ink-dim">{detail.description}</p>
            <div className="rounded-xl border border-line bg-white/[.02] p-4 text-sm">
              <p className="mb-1.5 font-bold">Match schedule</p>
              <p className="text-ink-faint">Starts {fmtDate(detail.startsAt)}. Pairings appear here once live, results feed straight into your ranking.</p>
            </div>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-faint">Player rankings ({detail.standings.length} placed)</p>
              {detail.standings.length === 0 ? (
                <p className="text-sm text-ink-faint">Standings appear after the tournament wraps up.</p>
              ) : (
                <div className="space-y-2">
                  {detail.standings.map((s) => (
                    <div key={s.username} className="flex items-center gap-3 rounded-xl border border-line bg-white/[.02] px-3.5 py-2.5">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black ${s.rank === 1 ? 'bg-gold/15 text-gold' : s.rank === 2 ? 'bg-white/10 text-ink-dim' : 'bg-amber-700/25 text-amber-400'}`}>{s.rank}</span>
                      <Pic user={s} size={28} />
                      <span className="flex-1 truncate text-sm font-semibold">{s.displayName}</span>
                      <span className="text-xs text-ink-faint">{s.rating} elo</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {detail.status !== 'completed' && (
              detail.joined ? (
                <Button variant="danger" className="w-full" disabled={busy === detail.id} onClick={() => leave(detail)}>Withdraw registration</Button>
              ) : (
                <Button className="w-full" disabled={busy === detail.id} onClick={() => join(detail)}>{busy === detail.id ? <Loader2 size={15} className="animate-spin" /> : <><Ticket size={15} /> Register for this tournament</>}</Button>
              )
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
