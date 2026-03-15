import { useState } from 'react'
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

const S = {
  modal: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', zIndex: 1100,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '14px', backdropFilter: 'blur(4px)',
  },
  card: {
    background: '#1A1A1A', border: '2px solid #2A2A2A', borderRadius: 18,
    width: '100%', maxWidth: 340, maxHeight: 'calc(100vh - 96px)',
    overflowY: 'auto', boxSizing: 'border-box',
    animation: 'popIn .3s cubic-bezier(.34,1.56,.64,1)',
  },
  cardWide: {
    maxWidth: 560,
  },
  header: {
    background: '#111', padding: '14px 16px 0', textAlign: 'center',
    borderBottom: '1px solid #2A2A2A',
  },
  closeBtn: {
    position: 'absolute', top: 10, right: 10, background: '#222',
    border: '1px solid #333', color: '#666', width: 26, height: 26,
    borderRadius: '50%', cursor: 'pointer', fontSize: 13,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  stopBanner: {
    background: '#FFCC00', color: '#000', borderRadius: 8,
    padding: '6px 14px', margin: '8px auto 10px', display: 'inline-block',
  },
  tabs: {
    display: 'flex', borderBottom: '1px solid #2A2A2A',
  },
  tab: (active) => ({
    flex: 1, padding: '9px 4px', fontSize: 11, fontWeight: 700,
    textAlign: 'center', cursor: 'pointer', textTransform: 'uppercase',
    letterSpacing: '0.5px', border: 'none', background: 'transparent',
    color: active ? '#FFCC00' : '#555',
    borderBottom: active ? '2px solid #FFCC00' : '2px solid transparent',
    marginBottom: -1, transition: 'all .2s',
  }),
  pane: { padding: '12px 14px' },
  statGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5, marginBottom: 12,
  },
  statBox: {
    background: '#222', borderRadius: 6, padding: '7px 3px', textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: 1, color: '#555', marginBottom: 6,
  },
  distRow: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 },
  distNum: { width: 10, textAlign: 'right', color: '#555', fontSize: 10, fontWeight: 700 },
  distBar: (pct, hi) => ({
    width: `${pct}%`, background: hi ? '#FFCC00' : '#2A2A2A',
    borderRadius: 3, height: 13, display: 'flex', alignItems: 'center',
    padding: '0 5px', minWidth: 18, transition: 'width .5s ease',
  }),
  summaryLine: { textAlign: 'center', fontSize: 10, color: '#555', marginTop: 8 },
  actions: { display: 'flex', gap: 6, padding: '10px 14px 14px' },
  btnShare: {
    flex: 1, padding: '9px 4px', background: '#FFCC00', color: '#000',
    border: 'none', borderRadius: 8, fontFamily: "'Bebas Neue',cursive",
    fontSize: 17, letterSpacing: 2, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
  },
  btnClose: {
    flex: 1, padding: '9px 4px', background: 'transparent', color: '#888',
    border: '2px solid #2A2A2A', borderRadius: 8,
    fontFamily: "'Bebas Neue',cursive", fontSize: 17, letterSpacing: 2, cursor: 'pointer',
  },
  laptopInner: { display: 'flex' },
  laptopPane: { flex: 1, padding: '12px 14px' },
  laptopPaneTitle: {
    fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: 1.5, color: '#555', marginBottom: 8,
    paddingBottom: 6, borderBottom: '1px solid #222',
  },
  todayHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
  },
}

function StatBox({ value, label }) {
  return (
    <div style={S.statBox}>
      <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 20, color: '#FFCC00', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 8, color: '#555', textTransform: 'uppercase', letterSpacing: '.5px', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function DistBars({ dist, max, highlight, compact }) {
  return (
    <>
      {Array.from({ length: MAX_GUESSES }, (_, i) => i + 1).map(i => {
        const n = dist[String(i)] || 0
        const pct = max > 0 ? Math.max(8, (n / max) * 100) : 8
        const hi = highlight === i
        return (
          <div key={i} style={S.distRow}>
            <div style={S.distNum}>{i}</div>
            <div style={{ flex: 1 }}>
              <div style={S.distBar(pct, hi)}>
                <span style={{ fontSize: 8, fontWeight: 700, color: hi ? '#000' : '#888' }}>{n}</span>
              </div>
            </div>
          </div>
        )
      })}
    </>
  )
}

function TodaySummary({ dailyStats, won, n }) {
  if (!dailyStats || dailyStats.total_players < 2) return null
  const total = dailyStats.total_players
  const dist  = dailyStats.guess_distribution || {}
  let betterCount = 0
  if (won) for (let i = 1; i < n; i++) betterCount += (dist[String(i)] || 0)
  const percentile = won ? Math.round((1 - betterCount / total) * 100) : null
  return (
    <div style={S.summaryLine}>
      {won
        ? <>Avg solve: <span style={{ color: '#FFCC00', fontWeight: 700 }}>{dailyStats.average_guesses} guesses</span>
            {percentile !== null && percentile >= 50 && <> · Top <span style={{ color: '#FFCC00', fontWeight: 700 }}>{100 - percentile}%</span> today</>}
          </>
        : <>{Math.round(dailyStats.win_rate)}% of players solved today</>
      }
    </div>
  )
}

export function ResultModal({ won, guesses, targetStop, stats, dailyStats, onClose, onShare, gameNumber }) {
  const [tab, setTab] = useState('you')
  const n        = guesses.length
  const emoji    = won ? <img src={WIN_EMOJI_IMGS[n-1].url} alt="" height={28}/> : <img src={SAD_URL} alt="" height={28}/>
  const title    = won ? WIN_LABELS[n-1] : 'BETTER LUCK NEXT TIME'
  const myDist   = stats?.guess_distribution || {}
  const myMax    = Math.max(...Object.values(myDist).map(Number), 1)
  const theirDist = dailyStats?.guess_distribution || {}
  const theirMax  = Math.max(...Object.values(theirDist).map(Number), 1)
  const hasToday  = dailyStats && dailyStats.total_players >= 2
  // Detect wide screen via window width
  const isWide = typeof window !== 'undefined' && window.innerWidth >= 600

  const Header = () => (
    <div style={S.header}>
      <div style={{ marginBottom: 3 }}>{emoji}</div>
      <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 24, letterSpacing: 3, color: '#FFCC00' }}>{title}</div>
      {gameNumber && <div style={{ fontSize: 9, color: '#555', letterSpacing: 2, textTransform: 'uppercase', margin: '2px 0 8px' }}>Puzzle #{gameNumber}</div>}
      <div style={S.stopBanner}>
        <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, opacity: .6 }}>Today's stop was</div>
        <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 17, letterSpacing: 2 }}>{targetStop.name}</div>
      </div>
      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap', paddingBottom: 10 }}>
        {targetStop.lines.map(ln => (
          <span key={ln} style={{ padding: '2px 7px', borderRadius: 4, fontSize: 9, fontWeight: 700,
            background: LINE_COLORS[ln] || '#888', color: '#000' }}>{ln}</span>
        ))}
      </div>
    </div>
  )

  return (
    <div style={S.modal} onClick={ev => ev.target === ev.currentTarget && onClose()}>
      <div style={{ ...S.card, ...(isWide && hasToday ? S.cardWide : {}), position: 'relative' }}>
        <button onClick={onClose} style={S.closeBtn}>✕</button>

        <Header />

        {/* ── WIDE (laptop): stats row + side-by-side panels ── */}
        {isWide && hasToday && stats ? (
          <>
            <div style={{ ...S.statGrid, padding: '10px 14px 0' }}>
              <StatBox value={stats.games_played}   label="Played" />
              <StatBox value={`${stats.win_rate}%`} label="Win %" />
              <StatBox value={stats.current_streak} label="Streak" />
              <StatBox value={stats.max_streak}     label="Best" />
            </div>
            <div style={S.laptopInner}>
              <div style={{ ...S.laptopPane, borderRight: '1px solid #222' }}>
                <div style={S.laptopPaneTitle}>Your Distribution</div>
                <DistBars dist={myDist} max={myMax} highlight={won ? n : null} />
              </div>
              <div style={S.laptopPane}>
                <div style={{ ...S.todayHeader }}>
                  <div style={S.laptopPaneTitle}>Today · {dailyStats.total_players} Players</div>
                </div>
                <DistBars dist={theirDist} max={theirMax} highlight={won ? n : null} />
                <TodaySummary dailyStats={dailyStats} won={won} n={n} />
              </div>
            </div>
          </>
        ) : (
          /* ── NARROW (mobile): tabs ── */
          <>
            {stats && (
              <div style={{ ...S.statGrid, padding: '10px 14px 0' }}>
                <StatBox value={stats.games_played}   label="Played" />
                <StatBox value={`${stats.win_rate}%`} label="Win %" />
                <StatBox value={stats.current_streak} label="Streak" />
                <StatBox value={stats.max_streak}     label="Best" />
              </div>
            )}

            {hasToday ? (
              <>
                <div style={S.tabs}>
                  <button style={S.tab(tab === 'you')}   onClick={() => setTab('you')}>Your Stats</button>
                  <button style={S.tab(tab === 'today')} onClick={() => setTab('today')}>Today</button>
                </div>
                {tab === 'you' && stats && (
                  <div style={S.pane}>
                    <div style={S.sectionTitle}>Your Guess Distribution</div>
                    <DistBars dist={myDist} max={myMax} highlight={won ? n : null} />
                  </div>
                )}
                {tab === 'today' && (
                  <div style={S.pane}>
                    <div style={S.todayHeader}>
                      <div style={S.sectionTitle}>All Players Today</div>
                      <div style={{ fontSize: 9, color: '#444' }}>{dailyStats.total_players} players</div>
                    </div>
                    <DistBars dist={theirDist} max={theirMax} highlight={won ? n : null} />
                    <TodaySummary dailyStats={dailyStats} won={won} n={n} />
                  </div>
                )}
              </>
            ) : stats && (
              <div style={S.pane}>
                <div style={S.sectionTitle}>Your Guess Distribution</div>
                <DistBars dist={myDist} max={myMax} highlight={won ? n : null} />
              </div>
            )}
          </>
        )}

        <div style={S.actions}>
          <button onClick={onShare} style={S.btnShare}>
            <img src={e('1f4cb')} alt="" height={14} />Share
          </button>
          <button onClick={onClose} style={S.btnClose}>✕ Close</button>
        </div>
      </div>
    </div>
  )
}