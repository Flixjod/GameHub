import React, { useState, useEffect } from 'react'
import { Gem, Crown, Palette, UserRound, Gift, Loader2, CheckCircle2, History, Sparkles } from 'lucide-react'
import { api } from '../lib/api.js'
import { Pic, Badge, Button, Card, EmptyState, SectionHead, Modal } from '../components/UI.jsx'
import { useAuth, useToast } from '../store.jsx'

const KIND_TABS = [
  { key: 'membership', label: 'Premium', icon: Crown },
  { key: 'avatar', label: 'Avatars', icon: UserRound },
  { key: 'theme', label: 'Themes', icon: Palette },
  { key: 'reward', label: 'Rewards', icon: Gift },
]

const ACCENT_STYLE = {
  emerald: 'border-emerald-neon/40 text-emerald-soft',
  gold: 'border-gold/40 text-gold',
  cyan: 'border-cyber-cyan/40 text-cyber-cyan',
  royal: 'border-royal/40 text-[#b79dfb]',
}

export default function Store() {
  const { user, refreshUser } = useAuth()
  const toast = useToast()
  const [data, setData] = useState(null)
  const [tab, setTab] = useState('membership')
  const [busy, setBusy] = useState(null)
  const [confirmItem, setConfirmItem] = useState(null)

  const load = () => api('/store').then(setData).catch(() => setData({ items: [], owned: [], history: [] }))
  useEffect(() => { load() }, [])

  const buy = async (item) => {
    setBusy(item.id)
    try {
      const res = await api('/store/checkout', { method: 'POST', body: { itemId: item.id } })
      if (item.kind === 'theme') toast('Theme purchased — equip it in Settings → Appearance', 'success')
      else if (item.kind === 'avatar') toast('Avatar unlocked — equip it in Settings → Profile', 'success')
      else if (item.kind === 'membership') toast('Welcome to Premium 👑 Enjoy the crown!', 'success')
      else toast(item.code === 'crate_classic' ? 'Crate secured — open it below!' : 'Purchased!', 'success')
      await Promise.all([load(), refreshUser()])
      setConfirmItem(null)
      if (item.code === 'crate_classic') {
        try {
          const open = await api('/store/claim-crate', { method: 'POST' })
          toast(open.reward, 'success')
          refreshUser()
          load()
        } catch (e) { toast(e.message, 'error') }
      }
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(null)
    }
  }

  if (!data) {
    return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-56 rounded-2xl" />)}</div>
  }

  const items = data.items.filter((i) => i.kind === tab)
  const isPremium = user.isPremium

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Store</h1>
          <p className="mt-1 text-sm text-ink-dim">Cosmetics, themes and Premium — earned gems go a long way.</p>
        </div>
        <Card className="flex items-center gap-2.5 px-4 py-2.5 border-gold/30">
          <Gem size={16} className="text-gold" />
          <span className="text-lg font-black text-gold">{user.gems?.toLocaleString()}</span>
          <span className="text-[11px] text-ink-faint">gems</span>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Store categories">
        {KIND_TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition cursor-pointer ${
              tab === key ? 'bg-emerald-neon text-[#04130b] shadow-[0_4px_16px_-4px_rgba(16,229,138,.55)]' : 'border border-line-2 text-ink-dim hover:text-ink hover:border-emerald-neon/40'}`}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState emoji="🎁" title="Nothing here yet" body="Rewards restock after special events." />
      ) : (
        <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const owned = data.owned.includes(item.code) || (item.kind === 'membership' && isPremium)
            return (
              <Card key={item.id} className={`relative flex flex-col p-5 transition hover:-translate-y-0.5 ${item.kind === 'membership' ? 'border-gold/40 bg-gradient-to-br from-[#2a1f05]/60 to-[#100c02]/70' : ''}`}>
                <div className="mb-3 flex items-center justify-between">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-xl border ${ACCENT_STYLE[item.accent] || ACCENT_STYLE.emerald} text-2xl`}>
                    {item.kind === 'avatar' ? item.value : item.kind === 'theme' ? <Palette size={20} /> : <Crown size={22} />}
                  </span>
                  {owned && <Badge tone="gold"><CheckCircle2 size={11} /> Owned</Badge>}
                </div>
                <h3 className="text-[15px] font-bold">{item.name}</h3>
                <p className="mt-1 flex-1 text-xs leading-relaxed text-ink-faint">{item.description}</p>
                {item.kind === 'theme' && (
                  <div className="mt-3 flex gap-1.5">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span key={i} className="h-4 flex-1 rounded-full" style={{ background: item.value, opacity: 1 - i * 0.18 }} />
                    ))}
                  </div>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-sm font-black text-gold"><Gem size={14} /> {item.price.toLocaleString()}</span>
                  <Button size="sm" variant={owned ? 'ghost' : 'primary'} disabled={owned || busy === item.id} onClick={() => setConfirmItem(item)}>
                    {busy === item.id ? <Loader2 size={13} className="animate-spin" /> : owned ? 'Owned' : 'Purchase'}
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <section>
        <SectionHead icon={History} title="Purchase history" sub="Everything you've unlocked" />
        {data.history.length === 0 ? (
          <EmptyState emoji="🧾" title="No purchases yet" body="Your acquired cosmetics and memberships appear here." />
        ) : (
          <Card className="divide-y divide-line/60 p-2">
            {data.history.map((h) => (
              <div key={h.id} className="flex items-center gap-3 px-3 py-3">
                <span className="text-lg">{h.kind === 'avatar' ? h.value : h.kind === 'theme' ? '🎨' : h.kind === 'membership' ? '👑' : '🎁'}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold">{h.name}</p>
                  <p className="text-[10px] text-ink-faint">{new Date(h.created_at?.replace(' ', 'T') + 'Z').toLocaleString()}</p>
                </div>
                <span className="text-xs font-bold text-gold"><Gem size={11} className="mb-0.5 inline" /> {h.price}</span>
              </div>
            ))}
          </Card>
        )}
      </section>

      <Modal open={!!confirmItem} onClose={() => setConfirmItem(null)} title="Confirm purchase" width={420}>
        {confirmItem && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-line bg-white/[.02] p-4">
              <span className="text-3xl">{confirmItem.kind === 'avatar' ? confirmItem.value : '👑'}</span>
              <div>
                <p className="text-sm font-bold">{confirmItem.name}</p>
                <p className="inline-flex items-center gap-1 text-xs text-gold"><Gem size={11} /> {confirmItem.price.toLocaleString()}</p>
              </div>
            </div>
            {user.gems < confirmItem.price ? (
              <p className="text-sm font-semibold text-red-300">Not enough gems — you need {(confirmItem.price - user.gems).toLocaleString()} more. Win matches to earn!</p>
            ) : (
              <p className="text-sm text-ink-dim">Balance after purchase: <span className="font-bold text-gold">{(user.gems - confirmItem.price).toLocaleString()} gems</span>.</p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmItem(null)}>Cancel</Button>
              <Button className="flex-1" disabled={busy === confirmItem.id || user.gems < confirmItem.price} onClick={() => buy(confirmItem)}>
                {busy === confirmItem.id ? <Loader2 size={15} className="animate-spin" /> : <><Gem size={14} /> Confirm</>}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
