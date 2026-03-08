import { LINE_COLORS, evaluateGuess } from '../gameLogic'
const TARGET_URL = "direct-hit_1f3af.png"

export function GuessRow({ guessStop, targetStop, isDarkMode, animDelay = 0 }) {
  const ev = evaluateGuess(guessStop, targetStop)

  // Dynamic colors based on status AND theme
  const getColors = (status) => {
    const palette = {
      correct: { bg: '#22C55E', border: '#15803d', text: '#FFFFFF' },
      partial: { bg: '#FFCC00', border: '#B28F00', text: '#000000' },
      wrong:   { bg: '#EF4444', border: '#B91C1C', text: '#FFFFFF' },
    }
    
    // In Dark Mode, we use slightly deeper background colors
    if (isDarkMode) {
      const darkPalette = {
        correct: { bg: '#052A12', border: '#22C55E', text: '#22C55E' },
        partial: { bg: '#2A2000', border: '#FFCC00', text: '#FFCC00' },
        wrong:   { bg: '#2A0505', border: '#EF4444', text: '#EF4444' },
      }
      return darkPalette[status]
    }
    
    return palette[status]
  }

  function Cell({ status, children }) {
    const c = getColors(status)
    return (
      <div style={{
        background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 10,
        padding: '10px 4px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 62,
        transition: 'all 0.3s ease'
      }}>
        {children}
      </div>
    )
  }

  const statusColor = getColors(ev.rowStatus).text

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
      gap: 6, marginBottom: 8,
      animation: `slideIn 0.35s ease ${animDelay}s both`,
    }}>
      {/* Stop name */}
      <Cell status={ev.rowStatus}>
        <div style={{ fontSize: 10, fontWeight: 800, color: statusColor, textAlign: 'center', lineHeight: 1.1 }}>
          {guessStop.name.toUpperCase()}
        </div>
        <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
          {guessStop.lines.slice(0, 3).map(ln => (
            <div key={ln} style={{ width: 6, height: 6, borderRadius: '50%', background: LINE_COLORS[ln] || '#888', border: '1px solid rgba(255,255,255,0.3)' }} />
          ))}
        </div>
      </Cell>

      {/* Line */}
      <Cell status={ev.lineStatus}>
        <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 18, color: getColors(ev.lineStatus).text }}>
          {ev.lineStatus === 'correct' ? '✓' : '✗'}
        </div>
        <div style={{ fontSize: 8, color: getColors(ev.lineStatus).text, opacity: 0.8, textTransform: 'uppercase' }}>
          {ev.sharedLines[0] || 'NONE'}
        </div>
      </Cell>

      {/* Stops away */}
      <Cell status={ev.distStatus}>
        <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 22, color: getColors(ev.distStatus).text }}>
          {ev.dist === 0 ? '★' : ev.dist}
        </div>
        <div style={{ fontSize: 8, color: getColors(ev.distStatus).text, opacity: 0.8 }}>STOPS</div>
      </Cell>

      {/* Direction */}
      <Cell status={ev.dist === 0 ? 'correct' : 'wrong'}>
        <div style={{ fontSize: 24, color: getColors(ev.dist === 0 ? 'correct' : 'wrong').text, transform: `rotate(${ev.deg}deg)`, display: 'inline-block' }}>
          {ev.dist === 0 ? <img src={TARGET_URL} alt="target" height={32}/> : '↑'}
        </div>
      </Cell>

      {/* Zone */}
      <Cell status={ev.zoneStatus}>
        <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 18, color: getColors(ev.zoneStatus).text }}>
          Z{guessStop.zone}
        </div>
        <div style={{ fontSize: 8, color: getColors(ev.zoneStatus).text, opacity: 0.8 }}>ZONE</div>
      </Cell>
    </div>
  )
}