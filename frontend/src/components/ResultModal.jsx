import { LINE_COLORS, MAX_GUESSES } from '../gameLogic'

const WIN_LABELS = ['GENIUS!','EXCELLENT','GREAT','GOOD','NOT BAD','PHEW!','LUCKY','GOT IT!']
const CDN = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14/assets/72x72'
const e = code => `${CDN}/${code}.png`
const WIN_EMOJI_IMGS = [
  { emoji: '🎉', url: e('1f389') }, { emoji: '🏆', url: e('1f3c6') },
  { emoji: '⭐', url: e('2b50') },  { emoji: '🌟', url: e('1f31f') },
  { emoji: '✨', url: e('2728') },  { emoji: '💫', url: e('1f4ab') },
  { emoji: '🎊', url: e('1f38a') }, { emoji: '🎯', url: e('1f3af') },
]
const SAD_URL = e('1f614')

function StatBox({ value, label }) {
  return (
    <div style={{ background: '#2A2A2A', border: '1px solid #383838', borderRadius: 6, padding: '5px 3px', textAlign: 'center' }}>
      <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 18, color: '#FFCC00', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: '.5px', marginTop: 2, lineHeight: 1.2 }}>{label}</div>
    </div>
  )
}

function DistBar({ n, label, max, highlight }) {
  const pct = max > 0 ? Math.max(8, (n / max) * 100) : 8
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
      <div style={{ width: 12, textAlign: 'right', color: '#888', fontWeight: 700, fontSize: 11 }}>{label}</div>
      <div style={{ flex: 1 }}>
        <div style={{ width: `${pct}%`, background: highlight ? '#FFCC00' : '#383838',
          borderRadius: 3, height: 15, display: 'flex', alignItems: 'center',
          padding: '0 5px', minWidth: 20, transition: 'width 0.5s ease' }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: highlight ? '#000' : '#F5F5F5' }}>{n}</span>
        </div>
      </div>
    </div>
  )
}

function TodayComparison({ dailyStats, won, guesses }) {
  if (!dailyStats || dailyStats.total_players < 2) return null

  const total = dailyStats.total_players
  const dist  = dailyStats.guess_distribution || {}
  const maxD  = Math.max(...Object.values(dist).map(Number), 1)
  const n     = guesses.length

  // How many players did better (fewer guesses, won)
  let betterCount = 0
  if (won) {
    for (let i = 1; i < n; i++) betterCount += (dist[String(i)] || 0)
  }
  const percentile = won
    ? Math.round((1 - betterCount / total) * 100)
    : null

  return (
    <div style={{ borderTop: '1px solid #383838', marginTop: 10, paddingTop: 10 }}>
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Today's Players</span>
        <span style={{ color: '#555' }}>{total} {total === 1 ? 'player' : 'players'}</span>
      </div>

      {/* Global guess distribution */}
      {Array.from({ length: MAX_GUESSES }, (_, i) => i + 1).map(i => (
        <DistBar key={i} n={dist[String(i)] || 0} label={i} max={maxD} highlight={won && n === i} />
      ))}

      {/* Summary line */}
      <div style={{ marginTop: 8, fontSize: 10, color: '#888', textAlign: 'center' }}>
        {won
          ? <>
              Avg solve: <span style={{ color: '#FFCC00', fontWeight: 700 }}>{dailyStats.average_guesses} guesses</span>
              {percentile !== null && percentile >= 50 && (
                <> · Top <span style={{ color: '#FFCC00', fontWeight: 700 }}>{100 - percentile}%</span> today</>
              )}
            </>
          : <>{Math.round(dailyStats.win_rate)}% of players solved today's puzzle</>
        }
      </div>
    </div>
  )
}

export function ResultModal({ won, guesses, targetStop, stats, dailyStats, onClose, onShare, gameNumber }) {
  const n     = guesses.length
  const emoji = won
    ? <img src={WIN_EMOJI_IMGS[n - 1].url} alt={WIN_EMOJI_IMGS[n - 1].emoji} height={26} />
    : <img src={SAD_URL} alt="😔" height={26} />
  const title = won ? WIN_LABELS[n - 1] : 'BETTER LUCK NEXT TIME'
  const dist  = stats?.guess_distribution || {}
  const maxDist = Math.max(...Object.values(dist).map(Number), 1)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 1100,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '78px 14px 14px', overflowY: 'auto', backdropFilter: 'blur(3px)' }}
      onClick={ev => ev.target === ev.currentTarget && onClose()}>

      <div style={{ background: '#1E1E1E', border: '2px solid #383838', borderRadius: 18,
        padding: '12px 14px', maxWidth: 340, width: '100%', position: 'relative',
        maxHeight: 'calc(100vh - 20px)', overflowY: 'auto', boxSizing: 'border-box',
        animation: 'popIn .3s cubic-bezier(.34,1.56,.64,1)' }}>

        <button onClick={onClose} style={{ position: 'absolute', top: 10, right: 10, background: '#2A2A2A',
          border: '1px solid #383838', color: '#888', width: 26, height: 26, borderRadius: '50%',
          cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

        {/* Header */}
        <div style={{ textAlign: 'center', paddingBottom: 7, borderBottom: '1px solid #383838', marginBottom: 7 }}>
          <div style={{ marginBottom: 2 }}>{emoji}</div>
          <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 22, letterSpacing: 3, color: '#FFCC00' }}>{title}</div>
          {gameNumber && (
            <div style={{ fontSize: 9, color: '#888', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 1 }}>
              Puzzle #{gameNumber}
            </div>
          )}
          <div style={{ background: '#FFCC00', color: '#000', borderRadius: 8, padding: '5px 12px', margin: '5px 0' }}>
            <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, opacity: .6, marginBottom: 1 }}>Today's stop was</div>
            <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 17, letterSpacing: 2 }}>{targetStop.name}</div>
          </div>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
            {targetStop.lines.map(ln => (
              <span key={ln} style={{ padding: '2px 7px', borderRadius: 5, fontSize: 9, fontWeight: 700,
                background: LINE_COLORS[ln] || '#888', color: '#000' }}>{ln}</span>
            ))}
          </div>
        </div>

        {/* Personal stats */}
        {stats && (<>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, marginBottom: 7 }}>
            <StatBox value={stats.games_played}   label="Played" />
            <StatBox value={`${stats.win_rate}%`} label="Win %" />
            <StatBox value={stats.current_streak} label="Streak" />
            <StatBox value={stats.max_streak}     label="Best" />
          </div>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 5 }}>
            Your Guess Distribution
          </div>
          {Array.from({ length: MAX_GUESSES }, (_, i) => i + 1).map(i => (
            <DistBar key={i} n={dist[String(i)] || 0} label={i} max={maxDist} highlight={won && n === i} />
          ))}
        </>)}

        {/* Today vs other players */}
        <TodayComparison dailyStats={dailyStats} won={won} guesses={guesses} />

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <button onClick={onShare} style={{ flex: 1, padding: '9px 4px', background: '#FFCC00', color: '#000',
            border: 'none', borderRadius: 8, fontFamily: "'Bebas Neue',cursive", fontSize: 17,
            letterSpacing: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <img src={e('1f4cb')} alt="📋" height={14} />Share
          </button>
          <button onClick={onClose} style={{ flex: 1, padding: '9px 4px', background: 'transparent',
            color: '#F5F5F5', border: '2px solid #383838', borderRadius: 8,
            fontFamily: "'Bebas Neue',cursive", fontSize: 17, letterSpacing: 2, cursor: 'pointer' }}>✕ Close</button>
        </div>
      </div>
    </div>
  )
}