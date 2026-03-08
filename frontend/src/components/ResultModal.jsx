import { LINE_COLORS, MAX_GUESSES } from '../gameLogic'

const WIN_LABELS = ['GENIUS!','EXCELLENT','GREAT','GOOD','NOT BAD','PHEW!','LUCKY','GOT IT!']
const WIN_EMOJI_IMGS = [
  { emoji: '🎉', url: 'party-popper_1f389.png' },
  { emoji: '🏆', url: 'trophy_1f3c6.png' },
  { emoji: '⭐', url: 'star_2b50.png' },
  { emoji: '🌟', url: 'glowing-star_1f31f.png' },
  { emoji: '✨', url: 'sparkles_2728.png' },
  { emoji: '💫', url: 'dizzy_1f4ab.png' },
  { emoji: '🎊', url: 'confetti-ball_1f38a.png' },
  { emoji: '🎯', url: 'direct-hit_1f3af.png' },
];

const SAD_URL = "pensive-face_1f614.png";


function StatBox({ value, label }) {
  return (
    <div style={{ background: '#2A2A2A', border: '1px solid #383838', borderRadius: 10, padding: '12px 6px', textAlign: 'center' }}>
      <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 28, color: '#FFCC00', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '.5px', marginTop: 3, lineHeight: 1.3 }}>{label}</div>
    </div>
  )
}

function DistBar({ n, label, max, highlight }) {
  const pct = max > 0 ? Math.max(8, (n / max) * 100) : 8
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
      <div style={{ width: 16, textAlign: 'right', color: '#888', fontWeight: 700, fontSize: 13 }}>{label}</div>
      <div style={{ flex: 1 }}>
        <div style={{
          width: `${pct}%`, background: highlight ? '#FFCC00' : '#383838',
          borderRadius: 4, height: 22, display: 'flex', alignItems: 'center',
          padding: '0 8px', minWidth: 28, transition: 'width 0.5s ease',
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: highlight ? '#000' : '#F5F5F5' }}>{n}</span>
        </div>
      </div>
    </div>
  )
}

export function ResultModal({ won, guesses, targetStop, stats, onClose, onShare, onPlayAgain }) {
  const n     = guesses.length
  const emoji = won ? <img src={WIN_EMOJI_IMGS[n - 1].url} alt={WIN_EMOJI_IMGS[n - 1].emoji} height={48}/> : <img src={SAD_URL} alt="😔" height={48}/>;  const title = won ? WIN_LABELS[n - 1] : 'BETTER LUCK NEXT TIME'
  const dist  = stats?.guess_distribution || {}
  const maxDist = Math.max(...Object.values(dist).map(Number), 1)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(3px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1E1E1E', border: '2px solid #383838', borderRadius: 20, padding: 28,
        maxWidth: 460, width: '100%', position: 'relative', maxHeight: '90vh', overflowY: 'auto',
        animation: 'popIn .3s cubic-bezier(.34,1.56,.64,1)' }}>

        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: '#2A2A2A',
          border: '1px solid #383838', color: '#888', width: 30, height: 30, borderRadius: '50%',
          cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

        {/* Result header */}
        <div style={{ textAlign: 'center', paddingBottom: 16, borderBottom: '1px solid #383838', marginBottom: 18 }}>
          <div style={{ fontSize: 44, lineHeight: 1, marginBottom: 6 }}>{emoji}</div>
          <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 34, letterSpacing: 3, color: '#FFCC00' }}>{title}</div>
          <div style={{ background: '#FFCC00', color: '#000', borderRadius: 12, padding: '12px 20px', margin: '14px 0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, opacity: .6, marginBottom: 2 }}>Today's stop was</div>
            <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 26, letterSpacing: 2 }}>{targetStop.name}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
            {targetStop.lines.map(ln => (
              <span key={ln} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                background: LINE_COLORS[ln] || '#888', color: '#000' }}>{ln}</span>
            ))}
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 18 }}>
              <StatBox value={stats.games_played}   label="Played" />
              <StatBox value={`${stats.win_rate}%`} label="Win %" />
              <StatBox value={stats.current_streak} label="Streak" />
              <StatBox value={stats.max_streak}     label="Best" />
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 10 }}>
              Guess Distribution
            </div>
            {Array.from({ length: MAX_GUESSES }, (_, i) => i + 1).map(i => (
              <DistBar key={i} n={dist[String(i)] || 0} label={i}
                max={maxDist} highlight={won && n === i} />
            ))}
          </>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button onClick={onShare} style={{ flex: 1, padding: 14, background: '#FFCC00', color: '#000',
            border: 'none', borderRadius: 10, fontFamily: "'Bebas Neue',cursive", fontSize: 20,
            letterSpacing: 2, cursor: 'pointer' }}>📋 Share</button>
          <button onClick={onPlayAgain} style={{ flex: 1, padding: 14, background: 'transparent',
            color: '#F5F5F5', border: '2px solid #383838', borderRadius: 10,
            fontFamily: "'Bebas Neue',cursive", fontSize: 20, letterSpacing: 2, cursor: 'pointer' }}>↺ New Game</button>
        </div>
      </div>
    </div>
  )
}
