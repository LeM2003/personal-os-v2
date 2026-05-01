"use client"

/**
 * AbstractMark — marque décorative SVG, neutre et universelle.
 *
 * Utilisée dans les EmptyState, Bravo, Loading, Error et widgets décoratifs.
 * Respecte le thème clair/sombre via les variables CSS.
 *
 * @param {'rings'|'arc'|'bars'|'grid'|'stack'|'offset'} variant
 * @param {number} size — largeur/hauteur en px (défaut 96)
 * @param {'accent'|'success'|'warning'|'alert'|'muted'} tone
 */
export default function AbstractMark({ variant = 'rings', size = 96, tone = 'accent' }) {
  const color = {
    accent:  'var(--gold)',
    success: '#4ade80',
    warning: '#fb923c',
    alert:   '#f87171',
    muted:   'var(--muted)',
  }[tone] || 'var(--gold)'

  const common = { width: size, height: size, viewBox: '0 0 96 96', fill: 'none', 'aria-hidden': true }

  if (variant === 'rings') return (
    <svg {...common}>
      <circle cx="48" cy="48" r="44" stroke={color} strokeOpacity="0.18" strokeWidth="1.2"/>
      <circle cx="48" cy="48" r="32" stroke={color} strokeOpacity="0.35" strokeWidth="1.2"/>
      <circle cx="48" cy="48" r="18" fill={color} fillOpacity="0.12"/>
      <circle cx="48" cy="48" r="5" fill={color}/>
    </svg>
  )
  if (variant === 'offset') return (
    <svg {...common}>
      <circle cx="38" cy="52" r="26" fill={color} fillOpacity="0.12"/>
      <circle cx="58" cy="44" r="26" stroke={color} strokeOpacity="0.45" strokeWidth="1.3"/>
    </svg>
  )
  if (variant === 'bars') return (
    <svg {...common}>
      {[0,1,2,3,4].map(i => (
        <rect key={i} x={14 + i*14} y={24 + (i%2)*8} width="8"
          height={48 - (i%2)*16} rx="2" fill={color} fillOpacity={0.15 + i*0.12}/>
      ))}
    </svg>
  )
  if (variant === 'arc') return (
    <svg {...common}>
      <path d="M14 72a38 38 0 0168 0" stroke={color} strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round"/>
      <path d="M24 72a28 28 0 0148 0" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="48" cy="72" r="4" fill={color}/>
    </svg>
  )
  if (variant === 'grid') return (
    <svg {...common}>
      {[0,1,2,3].map(r => [0,1,2,3].map(c => (
        <rect key={`${r}-${c}`} x={18 + c*16} y={18 + r*16} width="10" height="10"
          rx="2" fill={color} fillOpacity={(r+c) % 3 === 0 ? 0.7 : 0.12}/>
      )))}
    </svg>
  )
  if (variant === 'stack') return (
    <svg {...common}>
      <rect x="18" y="22" width="60" height="14" rx="3" fill={color} fillOpacity="0.35"/>
      <rect x="14" y="40" width="68" height="14" rx="3" fill={color} fillOpacity="0.18"/>
      <rect x="22" y="58" width="52" height="14" rx="3" fill={color}/>
    </svg>
  )
  return null
}
