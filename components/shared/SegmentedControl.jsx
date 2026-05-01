"use client"

/**
 * SegmentedControl — pill iOS-style
 *
 * @param {Array<{value:string,label:string,count?:number}>} options
 * @param {string} value
 * @param {(v:string)=>void} onChange
 * @param {'sm'|'md'} size
 */
export default function SegmentedControl({ options, value, onChange, size = 'md' }) {
  const pad      = size === 'sm' ? '6px 12px' : '8px 16px'
  const fontSize = size === 'sm' ? 12 : 13

  return (
    <div style={{
      display: 'inline-flex',
      background: 'var(--input-bg)',
      border: '1px solid var(--border)',
      borderRadius: 999,
      padding: 3,
      gap: 2,
    }}>
      {options.map(opt => {
        const active = opt.value === value
        return (
          <button key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              padding: pad,
              fontSize,
              fontFamily: 'DM Sans',
              fontWeight: active ? 600 : 500,
              color: active ? '#5B8DBF' : 'var(--muted)',
              background: active ? 'var(--card)' : 'transparent',
              border: 'none',
              borderRadius: 999,
              cursor: 'pointer',
              transition: 'background .18s, color .18s',
              boxShadow: active ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}>
            {opt.label}
            {typeof opt.count === 'number' && opt.count > 0 && (
              <span style={{
                background: active ? 'rgba(91,141,191,.15)' : 'var(--border)',
                color: active ? '#5B8DBF' : 'var(--muted)',
                borderRadius: 999, padding: '1px 6px',
                fontSize: fontSize - 2, fontWeight: 700,
              }}>{opt.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
