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
