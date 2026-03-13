import { useState, useCallback, useMemo } from 'react'
import { NetworkMap }  from './components/NetworkMap'
import { StopSearch }  from './components/StopSearch'
import { GuessRow }    from './components/GuessRow'
import { ResultModal } from './components/ResultModal'
import { HowToModal }  from './components/HowToModal'
import { usePlayerId } from './hooks/usePlayerId'
import { useDaily }    from './hooks/useDaily'
import { useStats }    from './hooks/useStats'
import { STOPS, MAX_GUESSES, buildShareText } from './gameLogic'
import KofiWidget from './components/KofiWidget';

const APPLE_BEE_URL = "./honeybee.png";

const MODE = {
  SUN : "./sun_2600-fe0f.png",
  MOON : "./crescent-moon_1f319.png"
}

// 2. Small helper component to keep the list clean
const ModeIcon = ({ src }) => (
  <img 
    src={src} 
    alt="mode" 
    style={{ width: 18, height: 18, verticalAlign: 'middle', margin: '0 4px' }} 
  />
);

// ─── Attempt pips ─────────────────────────────────────────────────────────────
function AttemptPips({ total, used, isDarkMode }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '10px 0' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: 12, height: 12, borderRadius: '50%', transition: 'all .3s',
          background: i < used ? (isDarkMode ? '#888' : '#333') : i === used ? '#FFCC00' : (isDarkMode ? '#383838' : '#E5E5E5'),
          border: isDarkMode ? 'none' : '2px solid #333',
          boxShadow: i === used ? '0 0 10px rgba(255,204,0,0.7)' : 'none',
          transform: i === used ? 'scale(1.2)' : 'scale(1)',
        }} />
      ))}
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, show }) {
  return (
    <div style={{
      position: 'fixed', bottom: 100, left: '50%',
      transform: `translateX(-50%) translateY(${show ? 0 : 20}px)`,
      background: '#333', color: '#FFCC00', padding: '12px 24px',
      borderRadius: 12, fontWeight: 700, fontSize: 14, border: '2px solid #FFCC00',
      opacity: show ? 1 : 0, transition: 'all .3s',
      zIndex: 9999, pointerEvents: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
    }}>
      {message}
    </div>
  )
}

// ─── Loading screen ───────────────────────────────────────────────────────────
function LoadingScreen({ error }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: '#111', color: '#F5F5F5',
      fontFamily: "'DM Sans',sans-serif", gap: 16 }}>
      <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 40, letterSpacing: 4, color: '#FFCC00' }}>
        METROLINKDLE
      </div>
      {error ? <div style={{ color: '#EF4444' }}>{error}</div> : <div style={{ color: '#888' }}>Loading Bee Network...</div>}
    </div>
  )
}

export default function App() {
  const playerId = usePlayerId()
  const { targetStop: targetName, gameNumber, loading, error } = useDaily()
  const { stats, recordResult } = useStats(playerId)

  const [isDarkMode, setIsDarkMode] = useState(false)
  const targetStop = targetName ? STOPS[targetName] : null

  const [guesses,      setGuesses]      = useState([])
  const [gameOver,     setGameOver]     = useState(false)
  const [won,          setWon]          = useState(false)
  const [revealTarget, setRevealTarget] = useState(false)
  const [showResult,   setShowResult]   = useState(false)
  const [showHowTo,    setShowHowTo]    = useState(false)
  const [toast,        setToast]        = useState({ msg: '', show: false })

  const theme = useMemo(() => ({
    bg: isDarkMode ? '#111111' : '#F5F5F5',
    card: isDarkMode ? '#1A1A1A' : '#FFFFFF',
    text: isDarkMode ? '#F5F5F5' : '#333333',
    subtext: isDarkMode ? '#888888' : '#666666',
    border: isDarkMode ? '#383838' : '#E5E5E5',
    hexStroke: isDarkMode ? '%23222222' : '%23E5E5E5',
    shadow: isDarkMode ? 'none' : '8px 8px 0px #FFCC00'
  }), [isDarkMode])

  const guessedNames = new Set(guesses.map(g => g.stop.name))

  function showToast(msg) {
    setToast({ msg, show: true })
    setTimeout(() => setToast({ msg: '', show: false }), 2200)
  }

  // Handle instant guess and clear the bar
  const handleSelectStop = useCallback((selected) => {
    if (!selected || !targetStop || gameOver) return
    
    if (guessedNames.has(selected.name)) {
      showToast('Already guessed!')
      return 
    }

    const newGuesses = [...guesses, { stop: selected }]
    setGuesses(newGuesses)

    const today = new Date().toISOString().slice(0, 10)

    if (selected.name === targetStop.name) {
      setWon(true); setGameOver(true); setRevealTarget(true)
      recordResult({ date: today, won: true, guesses: newGuesses.length, targetStop: targetStop.name })
      setTimeout(() => setShowResult(true), 700)
    } else if (newGuesses.length >= MAX_GUESSES) {
      setGameOver(true); setRevealTarget(true)
      recordResult({ date: today, won: false, guesses: newGuesses.length, targetStop: targetStop.name })
      setTimeout(() => { showToast(`It was ${targetStop.name}`); setShowResult(true) }, 500)
    }
  }, [targetStop, gameOver, guesses, guessedNames, recordResult])

  function handleShare() {
    const text = buildShareText(guesses, targetStop, won, gameNumber)
    navigator.clipboard?.writeText(text)
      .then(() => showToast('Copied to clipboard!'))
      .catch(() => showToast('Copy failed'))
  }

  if (loading || error) return <LoadingScreen error={error} />

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background-color: ${theme.bg}; transition: background-color 0.3s ease; }

        .honeycomb-bg {
          min-height: 100vh;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100' viewBox='0 0 56 100'%3E%3Cpath d='M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100' fill='none' stroke='${theme.hexStroke}' stroke-width='1.5'/%3E%3C/svg%3E");
          background-size: 35px 62.5px;
        }

        .bee-card {
          background: ${theme.card};
          border: 3px solid #333;
          border-radius: 20px;
          box-shadow: ${theme.shadow};
        }

        .map-container {
          touch-action: none;
          width: 100%;
          position: relative;
          overflow: hidden;
          border-radius: 18px;
        }
      `}</style>

      <div className="honeycomb-bg" style={{ color: theme.text, fontFamily: "'DM Sans',sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        <header style={{ width: '100%', background: theme.card, borderBottom: '5px solid #FFCC00',
          padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 68, position: 'sticky', top: 0, zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src={APPLE_BEE_URL} alt="Bee" style={{ width: 34, height: 34 }} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
              <span style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 34, letterSpacing: 2, color: theme.text }}>
                METROLINK<span style={{ color: '#FFCC00' }}>DLE</span>
              </span>
              {gameNumber && (
                <span style={{ fontSize: 11, fontWeight: 700, color: theme.subtext, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  #{gameNumber} · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setIsDarkMode(!isDarkMode)} style={{
                background: theme.card, border: '2.5px solid #333', borderRadius: 10, width: 40, height: 40,
                cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '3px 3px 0 #333'
              }}>{isDarkMode ? <ModeIcon src={MODE.SUN} /> : <ModeIcon src={MODE.MOON} />}</button>
            <button onClick={() => setShowHowTo(true)} style={{
                background: theme.card, border: '2.5px solid #333', borderRadius: 10, width: 40, height: 40,
                cursor: 'pointer', fontSize: 18, fontWeight: 900, boxShadow: '3px 3px 0 #333'
              }}>❓</button>
          </div>
        </header>

        <main style={{ width: '100%', maxWidth: 550, padding: '24px 16px 80px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          <AttemptPips total={MAX_GUESSES} used={guesses.length} isDarkMode={isDarkMode} />

          <div className="bee-card">
            <div className="map-container">
              <NetworkMap guesses={guesses} targetStop={targetStop} revealTarget={revealTarget} isDarkMode={isDarkMode} />
            </div>
          </div>

          {!gameOver && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: theme.subtext, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                Start typing to guess today's station
              </p>
              <StopSearch 
                onSelect={handleSelectStop} 
                disabled={gameOver} 
                excluded={guessedNames} 
                isDarkMode={isDarkMode} 
              />
            </div>
          )}

          {guesses.length > 0 && targetStop && (
            <div className="bee-card" style={{ padding: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 6,
                padding: '0 0 10px', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1,
                color: theme.subtext, fontWeight: 800, textAlign: 'center' }}>
                <div style={{ textAlign: 'left' }}>Stop</div>
                <div>Line</div>
                <div>Away</div>
                <div>Dir</div>
                <div>Zone</div>
              </div>
              {guesses.map((g) => (
                <GuessRow key={g.stop.name} guessStop={g.stop} targetStop={targetStop} isDarkMode={isDarkMode} />
              ))}
            </div>
          )}
        </main>
       <KofiWidget />

        <footer style={{ width: '100%', borderTop: '3px solid #333', background: '#FFCC00',
          padding: '24px', textAlign: 'center', marginTop: 'auto' }}>
          <img src={APPLE_BEE_URL} alt="Bee" style={{ width: 24, height: 24, marginBottom: 8 }} />
          <p style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 16, color: '#333', letterSpacing: 1, marginBottom: 2 }}>
            {gameNumber ? `Metrolinkdle #${gameNumber}` : 'Metrolinkdle'}
          </p>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#333', letterSpacing: 0.5 }}>
            Bee Network Fan Project • Data © TfGM
          </p>
        </footer>
      </div>

      {showHowTo && <HowToModal onClose={() => setShowHowTo(false)} isDarkMode={isDarkMode} />}
      {showResult && targetStop && (
        <ResultModal won={won} guesses={guesses} targetStop={targetStop} stats={stats} onClose={() => setShowResult(false)} onShare={handleShare} gameNumber={gameNumber} isDarkMode={isDarkMode} />
      )}
      <Toast message={toast.msg} show={toast.show} />
    </>
  )
}