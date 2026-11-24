export const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#0ea56f,#052e21)',
  'linear-gradient(135deg,#0e7490,#062a33)',
  'linear-gradient(135deg,#7c3aed,#2a1157)',
  'linear-gradient(135deg,#b45309,#401d03)',
  'linear-gradient(135deg,#db2777,#450a20)',
  'linear-gradient(135deg,#4f46e5,#1b1747)',
  'linear-gradient(135deg,#16a34a,#052e16)',
  'linear-gradient(135deg,#64748b,#1e293b)',
  'linear-gradient(135deg,#d97706,#451a03)',
  'linear-gradient(135deg,#0891b2,#083344)',
]

export const ACCENT_THEMES = {
  '#10e58a': { name: 'Emerald', rgb: '16,229,138' },
  '#22d3ee': { name: 'Cyan', rgb: '34,211,238' },
  '#8b5cf6': { name: 'Royal Violet', rgb: '139,92,246' },
  '#fbbf24': { name: 'Champion Amber', rgb: '251,191,36' },
}

export function timeAgo(ts) {
  if (!ts) return 'long ago'
  const d = new Date(ts.includes('T') ? ts : ts.replace(' ', 'T') + (ts.endsWith('Z') ? '' : 'Z'))
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`
  return d.toLocaleDateString()
}

export function logText(gameId, ev) {
  if (!ev) return ''
  if (ev.type === 'roll') {
    const parts = [`rolled ${ev.roll ?? '\u2014'}`]
    if (ev.again) parts.push('extra roll earned')
    if (ev.forfeited) parts.push('three sixes \u2014 turn forfeited')
    if (ev.blocked) parts.push('no legal move \u2014 turn skipped')
    return parts.join(' \u00b7 ')
  }
  if (ev.type === 'move') {
    if (gameId === 'reversi') {
      const i = typeof ev.move === 'number' ? ev.move : ev.move?.i
      const coord = i != null && i >= 0 ? `${String.fromCharCode(65 + (i % 8))}${Math.floor(i / 8) + 1}` : '?'
      return `played ${coord}${ev.flips ? ` \u2014 flipped ${ev.flips}` : ''}`
    }
    if (gameId === 'ludo') {
      const t = (ev.move?.token ?? -1) + 1
      return `moved token ${t}${ev.captured ? ' \u2014 capture!' : ''}${ev.again ? ' \u00b7 extra roll' : ''}`
    }
    if (gameId === 'tictactoe') {
      const i = ev.move?.i
      return i != null ? `claimed square ${String.fromCharCode(65 + (i % 3))}${Math.floor(i / 3) + 1}` : 'moved'
    }
    return 'moved'
  }
  if (ev.type === 'pass') return 'had no legal move \u2014 turn passed'
  if (ev.type === 'skip') return 'skipped \u2014 no legal move'
  return ev.message || ev.type
}
