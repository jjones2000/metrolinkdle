import { useState } from 'react'
import { ALL_STOPS, LINE_COLORS } from '../gameLogic'

export function StopSearch({ onSelect, disabled, excluded = new Set(), isDarkMode }) {
  const [query,   setQuery]   = useState('')
  const [focused, setFocused] = useState(false)
  const [hiIdx,   setHiIdx]   = useState(0)

  // Dynamic Theme Colors
  const colors = {
    bg: isDarkMode ? '#1E1E1E' : '#FFFFFF',
    text: isDarkMode ? '#F5F5F5' : '#333333',
    border: isDarkMode ? '#383838' : '#CCCCCC',
    hover: isDarkMode ? '#2A2A2A' : '#F0F0F0',
    subtext: isDarkMode ? '#666' : '#999'
  }

  const filtered = query.length < 1 ? [] : ALL_STOPS
    .filter(s => !excluded.has(s.name) && s.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8)

  function choose(stop) {
    // 1. Clear the query immediately
    setQuery('')
    setFocused(false)
    setHiIdx(0)
    // 2. Trigger the guess in App.jsx
    onSelect(stop)
  }

  function handleKey(e) {
    if (!filtered.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHiIdx(i => Math.min(i + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHiIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && filtered[hiIdx]) choose(filtered[hiIdx])
    if (e.key === 'Escape') setFocused(false)
  }

  function handleChange(e) {
    setQuery(e.target.value)
    // We don't call onSelect(null) here because we want 
    // to wait until they actually click a station
    setHiIdx(0)
  }

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <input
        value={query}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        onKeyDown={handleKey}
        disabled={disabled}
        placeholder="Search for a station..."
        autoComplete="off"
        style={{
          width: '100%', padding: '16px 20px',
          background: colors.bg, 
          border: `2.5px solid ${focused ? '#FFCC00' : colors.border}`,
          borderRadius: 14, 
          color: colors.text,
          fontFamily: "'DM Sans',sans-serif", fontSize: 16,
          outline: 'none', transition: 'all .2s', boxSizing: 'border-box',
          boxShadow: focused ? '0 0 15px rgba(255, 204, 0, 0.2)' : 'none'
        }}
      />

      {focused && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: colors.bg, 
          border: '2.5px solid #FFCC00', 
          borderRadius: 14,
          zIndex: 9999, overflow: 'hidden', maxHeight: 300, 
          overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        }}>
          {filtered.map((stop, i) => (
            <div key={stop.name} onMouseDown={() => choose(stop)}
              style={{
                padding: '14px 18px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12,
                borderBottom: `1px solid ${isDarkMode ? '#2A2A2A' : '#EEEEEE'}`,
                background: i === hiIdx ? colors.hover : 'transparent',
                fontSize: 15, color: colors.text, transition: 'background .1s',
              }}>
              {/* Line colour dots */}
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {stop.lines.map(ln => (
                  <div key={ln} style={{ 
                    width: 10, height: 10, borderRadius: '50%', 
                    background: LINE_COLORS[ln] || '#888',
                    border: '1px solid rgba(0,0,0,0.1)'
                  }} />
                ))}
              </div>
              <span style={{ flex: 1, fontWeight: 500 }}>{stop.name}</span>
              <span style={{ fontSize: 11, color: colors.subtext, fontWeight: 700 }}>Z{stop.zone}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}