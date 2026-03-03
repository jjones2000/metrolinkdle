export function HowToModal({ onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(3px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1E1E1E', border: '2px solid #383838', borderRadius: 20, padding: 28,
        maxWidth: 440, width: '100%', position: 'relative', animation: 'popIn .3s cubic-bezier(.34,1.56,.64,1)' }}>

        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: '#2A2A2A',
          border: '1px solid #383838', color: '#888', width: 30, height: 30, borderRadius: '50%',
          cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

        <h2 style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 26, letterSpacing: 2, color: '#FFCC00', marginBottom: 14 }}>
          How to Play Metrodle
        </h2>

        <p style={{ fontSize: 14, color: '#888', lineHeight: 1.7, marginBottom: 12 }}>
          A new secret Metrolink stop is chosen every day.
          You have <strong style={{ color: '#F5F5F5' }}>8 guesses</strong> to find it.
        </p>

        <ul style={{ paddingLeft: 18, fontSize: 14, color: '#888', lineHeight: 1.9, marginBottom: 14 }}>
          <li><strong style={{ color: '#F5F5F5' }}>Line</strong> — 🟢 shares a line with the target, 🔴 doesn't</li>
          <li><strong style={{ color: '#F5F5F5' }}>Stops Away</strong> — 🟢 0–2 stops, 🟡 3–6, 🔴 7+ (shortest path)</li>
          <li><strong style={{ color: '#F5F5F5' }}>Direction</strong> — compass arrow pointing from your guess toward the target</li>
          <li><strong style={{ color: '#F5F5F5' }}>Zone</strong> — 🟢 same zone, 🟡 1 zone off, 🔴 2+ zones off</li>
        </ul>

        <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>
          Guessed stops light up on the network map. City-centre stops like Piccadilly
          Gardens serve many lines — use them early to triangulate!
        </p>
      </div>
    </div>
  )
}
