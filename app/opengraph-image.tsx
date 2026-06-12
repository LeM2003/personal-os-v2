import { ImageResponse } from 'next/og'

export const alt = 'Personal OS — Tâches, budget, école, projets. Tout au même endroit.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const CHIPS = ['✅ Tâches & habitudes', '💰 Budget en FCFA', '📚 École & examens', '📊 Stats & discipline']

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '72px 84px',
          background: 'linear-gradient(135deg, #060d1a 0%, #0b1830 60%, #102347 100%)',
          color: '#e2eaf5',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Halo accent */}
        <div
          style={{
            position: 'absolute',
            top: -160,
            right: -120,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background: 'radial-gradient(circle, rgba(56,189,248,.28) 0%, rgba(56,189,248,0) 70%)',
            display: 'flex',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 34,
            }}
          >
            ⚡
          </div>
          <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: -1, display: 'flex' }}>
            Personal OS
          </div>
        </div>

        <div
          style={{
            fontSize: 68,
            fontWeight: 800,
            letterSpacing: -2,
            lineHeight: 1.08,
            maxWidth: 940,
            display: 'flex',
          }}
        >
          Toute ta vie, organisée. Une seule app.
        </div>

        <div
          style={{
            fontSize: 30,
            color: '#9fb3cc',
            marginTop: 22,
            maxWidth: 880,
            lineHeight: 1.35,
            display: 'flex',
          }}
        >
          Gratuit · Hors ligne · Prêt en 30 secondes
        </div>

        <div style={{ display: 'flex', gap: 14, marginTop: 44, flexWrap: 'wrap' }}>
          {CHIPS.map(chip => (
            <div
              key={chip}
              style={{
                display: 'flex',
                padding: '12px 22px',
                borderRadius: 9999,
                background: 'rgba(56,189,248,.10)',
                border: '1px solid rgba(56,189,248,.35)',
                fontSize: 24,
                color: '#cfe3f7',
              }}
            >
              {chip}
            </div>
          ))}
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 44,
            right: 84,
            fontSize: 26,
            color: '#38bdf8',
            fontWeight: 700,
            display: 'flex',
          }}
        >
          personal-os.click
        </div>
      </div>
    ),
    { ...size },
  )
}
