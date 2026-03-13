import { useRef, useState, useEffect, useCallback } from 'react'
import {
  ALL_STOPS, LINE_COLORS, SVG_PATHS, TOPO_PATHS,
  geoToSvg, topoToSvg, SVG_W, SVG_H, evaluateGuess
} from '../gameLogic'

import { TOPO_STOPS } from '../networkData';

// Line draw order (back → front)
const LINE_ORDER = [
  'red', 'light-blue', 'pink', 'yellow', 'purple', 'green', 'blue', 'Second City Crossing',
  'MediaCity Spur','Piccadilly Spur',
]

const PIN_URL = "./round-pushpin_1f4cd.png";
const CIRCLE_URL = "./doughnut_1f369.png";
const BEE_URL = "./honeybee.png"


// ─── MapView ──────────────────────────────────────────────────────────────────
//
// Renders one map mode (geo or topo). The key architecture decision:
//
//   HOVER FIX: City-centre stops are 4-10px apart in geo SVG space, so their
//   invisible hit areas overlap heavily and later stops obscure earlier ones.
//   The fix is a three-layer SVG:
//     1. Track polylines     — visual only, no pointer events
//     2. Visual stop dots    — visual only, pointerEvents: 'none'
//     3. Hit circles         — invisible, TOP of z-order, full pointer events
//
//   Because the hit layer is rendered last, every stop's circle is equally
//   reachable regardless of how close they are. Hit radius is 7-8px in SVG
//   space; as the user zooms in, the SVG canvas scales up and the hit areas
//   grow proportionally — so close stops become easy to separate at any zoom.
//
function MapView({ paths, stops, stopStatuses, targetStop, revealTarget, isDarkMode, colors }) {
  const [tooltip,     setTooltip]     = useState(null)
  const [hoveredStop, setHoveredStop] = useState(null)
  const [pan,         setPan]         = useState({ x: 0, y: 0, scale: 1 })
  const dragRef   = useRef(null)
  const touchRef  = useRef(null)
  const scrollRef = useRef(null)
  // Keep a ref to current pan so event handlers always see latest values
  // without needing to be re-registered on every pan change
  const panRef    = useRef(pan)
  useEffect(() => { panRef.current = pan }, [pan])

  // Register wheel + touch listeners once only (empty dep array).
  // Handlers read panRef.current instead of closing over stale pan state.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const onWheel = (e) => {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.12 : 0.89
      setPan(p => ({ ...p, scale: Math.max(0.4, Math.min(14, p.scale * factor)) }))
    }

    const onTouchStart = (e) => {
      const cur = panRef.current
      if (e.touches.length === 1) {
        touchRef.current = {
          type: 'pan',
          x: e.touches[0].clientX - cur.x,
          y: e.touches[0].clientY - cur.y,
        }
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        touchRef.current = {
          type: 'pinch',
          dist: Math.hypot(dx, dy),
          scale: cur.scale,
        }
      }
    }

    const onTouchMove = (e) => {
      e.preventDefault()
      if (!touchRef.current) return
      if (e.touches.length === 1 && touchRef.current.type === 'pan') {
        setPan(p => ({
          ...p,
          x: e.touches[0].clientX - touchRef.current.x,
          y: e.touches[0].clientY - touchRef.current.y,
        }))
      } else if (e.touches.length === 2 && touchRef.current.type === 'pinch') {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.hypot(dx, dy)
        const ratio = dist / touchRef.current.dist
        setPan(p => ({ ...p, scale: Math.max(0.4, Math.min(14, touchRef.current.scale * ratio)) }))
      }
    }

    const onTouchEnd = () => { touchRef.current = null }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [])  // runs once — handlers use panRef, not stale closure values

  function onMouseDown(e) {
    dragRef.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y }
  }
  function onMouseMove(e) {
    const drag = dragRef.current
    if (!drag) return
    setPan(p => ({ ...p, x: e.clientX - drag.x, y: e.clientY - drag.y }))
  }
  function onMouseUp() { dragRef.current = null }

  const handleEnter = useCallback((stop, e) => {
    setHoveredStop(stop.name)
    setTooltip({ name: stop.name, x: e.clientX, y: e.clientY })
  }, [])

  const handleLeave = useCallback(() => {
    setHoveredStop(null)
    setTooltip(null)
  }, [])

  // Group paths by line name for ordered rendering
  const pathsByLine = {}
  paths.forEach(p => { (pathsByLine[p.line] = pathsByLine[p.line] || []).push(p) })

  const transform = `translate(${pan.x}px,${pan.y}px) scale(${pan.scale})`

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={scrollRef}
        style={{
          overflow: 'hidden',
          cursor: dragRef.current ? 'grabbing' : 'grab',
          touchAction: 'none',
          height: window.innerWidth < 640 ? 'clamp(220px, 40vh, 320px)' : 420,
          background: colors.bg,
          transition: 'background 0.3s',
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={() => { onMouseUp(); setHoveredStop(null); setTooltip(null) }}

      >
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{ width: '100%', height: '100%', display: 'block', userSelect: 'none' }}
        >
          <rect width={SVG_W} height={SVG_H} fill={colors.bg} />

          <g style={{ transform, transformOrigin: 'center' }}>

            {/* ── LAYER 1: Track polylines ── */}
            {LINE_ORDER.map(lname =>
              (pathsByLine[lname] || []).map((p, pi) => (
                <polyline
                  key={`${lname}-${pi}`}
                  points={p.coords.map(([a, b]) =>
                    p.isTopoCoord ? topoToSvg(a, b).join(',') : geoToSvg(a, b).join(',')
                  ).join(' ')}
                  stroke={LINE_COLORS[lname] || '#888'}
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.9"
                />
              ))
            )}

            {/* ── LAYER 2: Visual stop dots — pointerEvents disabled ── */}
            {stops.map(stop => {
              const [x, y]    = stop._svgPos
              const status    = stopStatuses[stop.name]
              const isTarget  = revealTarget && targetStop && stop.name === targetStop.name
              const isHovered = hoveredStop === stop.name
              const r         = stop.zone === '1' ? 4 : 3

              const fill = isTarget          ? '#FFCC00'
                : status === 'correct'       ? '#22C55E'
                : status === 'partial'       ? '#FFCC00'
                : status === 'wrong'         ? '#EF4444'
                : colors.dotDefault

              const strokeCol = isHovered         ? '#FFCC00'
                : (isTarget || status)            ? (isDarkMode ? '#fff' : '#333')
                : colors.dotStroke

              const sw = isHovered ? 2 : (isTarget || status) ? 1.5 : 0.8

              return (
                <g key={stop.name} style={{ pointerEvents: 'none' }}>
                  {/* Halo ring — only shows when hovered */}
                  {isHovered && (
                    <circle
                      cx={x} cy={y} r={r + 6}
                      fill="none"
                      stroke="#FFCC00"
                      strokeWidth="1.5"
                      opacity="0.55"
                    />
                  )}
                  {/* Visible dot */}
                  <circle
                    cx={x} cy={y} r={r}
                    fill={fill}
                    stroke={strokeCol}
                    strokeWidth={sw}
                    style={{
                      filter: isHovered ? 'drop-shadow(0 0 5px rgba(255,204,0,0.9))' : 'none',
                      transition: 'fill 0.2s',
                    }}
                  />
                </g>
              )
            })}

            {/* ── LAYER 3: Invisible hit circles — rendered last, always on top ──
                This is the key to the hover fix. Because these are the last
                elements in the SVG, they sit above everything else in z-order
                and are always reachable by the mouse — even when stops overlap.
                The hit radius (7-8 SVG units) is intentionally larger than the
                visual dot so it's easy to target without zooming. ── */}
            {stops.map(stop => {
              const [x, y] = stop._svgPos
              const hitR   = 10 / pan.scale  // ~10 screen-px at any zoom
              return (
                <circle
                  key={`hit-${stop.name}`}
                  cx={x} cy={y}
                  r={hitR}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={e => handleEnter(stop, e)}
                  onMouseLeave={handleLeave}
                />
              )
            })}

          </g>
        </svg>

        {/* Tooltip — fixed position escapes SVG clipping */}
        {tooltip && (
          <div style={{
            position:   'fixed',
            left:       tooltip.x + 14,
            top:        tooltip.y - 14,
            background: colors.tooltipBg,
            color:      colors.tooltipText,
            border:     '1.5px solid #FFCC00',
            borderRadius: 8,
            padding:    '5px 12px',
            fontSize:   12,
            fontWeight: 700,
            pointerEvents: 'none',
            zIndex:     9999,
            whiteSpace: 'nowrap',
            boxShadow:  '0 4px 16px rgba(0,0,0,0.3)',
            animation:  'tooltipIn 0.12s ease-out',
          }}>
            {tooltip.name}
          </div>
        )}
      </div>

      {/* Reset view */}
      <div style={{
        padding: '5px 10px', display: 'flex', justifyContent: 'flex-end',
        borderTop: `1px solid ${colors.border}`,
      }}>
        <button
          onClick={() => setPan({ x: 0, y: 0, scale: 1 })}
          style={{
            background: 'none', border: `1.5px solid ${colors.border}`,
            color: colors.text, borderRadius: 6, padding: '3px 12px',
            fontSize: 11, cursor: 'pointer', fontWeight: 700,
          }}
        >
          RESET VIEW
        </button>
      </div>
    </div>
  )
}

// ─── NetworkMap (exported component) ─────────────────────────────────────────
export function NetworkMap({ guesses, targetStop, revealTarget, isDarkMode }) {
  const [mode, setMode] = useState('geo') // 'geo' | 'topo'

  const colors = {
    bg:          isDarkMode ? '#1A1A1A' : '#F9F9F9',
    containerBg: isDarkMode ? '#1E1E1E' : '#F8F8F8',
    border:      isDarkMode ? '#383838' : '#E0E0E0',
    text:        isDarkMode ? '#888'    : '#666',
    dotDefault:  isDarkMode ? '#3a5060' : '#BCC7CC',
    dotStroke:   isDarkMode ? '#556'    : '#96A4AA',
    tooltipBg:   isDarkMode ? '#1A1A1A' : '#FFFFFF',
    tooltipText: isDarkMode ? '#FFFFFF' : '#222222',
  }

  // Per-stop status colours from guesses
  const stopStatuses = {}
  if (targetStop) {
    for (const { stop } of guesses) {
      const ev = evaluateGuess(stop, targetStop)
      stopStatuses[stop.name] = ev.rowStatus
    }
  }

  // Pre-compute SVG positions for the active mode
const stopsWithPos = ALL_STOPS.map(stop => {
  // 1. Get the specific topo data, or an empty object if the name doesn't exist, useful whilst filling in the data
  const topoData = TOPO_STOPS[stop.name] || {};

  return {
    ...stop,
    _svgPos: mode === 'geo'
      ? geoToSvg(stop.lng, stop.lat)
      : topoToSvg(topoData.topoX ?? 0, topoData.topoY ?? 0), 
  };
});

  // Mark topo paths so MapView knows which projection function to call
  const activePaths = mode === 'geo'
    ? SVG_PATHS
    : TOPO_PATHS.map(p => ({ ...p, isTopoCoord: true }))

  const uniqueLines = [...new Set(ALL_STOPS.flatMap(s => s.lines))].filter(l => LINE_COLORS[l])

  return (
    <div style={{
      width: '100%',
      background: colors.containerBg,
      border: `1.5px solid ${colors.border}`,
      borderRadius: 16,
      overflow: 'hidden',
      transition: 'background 0.3s, border 0.3s',
    }}>

      {/* Header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 15, letterSpacing: 2, color: '#FFCC00' }}>
          <img src={BEE_URL} alt="Bee" style={{ width: 12, height: 12 }} /> Network Map
          </span>

          {/* Geo / Topo toggle */}
          <div style={{
            display: 'flex',
            background: isDarkMode ? '#2A2A2A' : '#E4E4E4',
            borderRadius: 20,
            padding: 2,
            gap: 2,
          }}>
            {[
  [
    'geo', 
    <>
      <img src={PIN_URL} alt="Pin" style={{ width: 16, height: 16, marginBottom: 4, verticalAlign: 'middle' }} />
      <span> Geographic</span>
    </>
  ],
  [
    'topo', 
    <>
      <img src={CIRCLE_URL} alt="Topological" style={{ width: 16, height: 16, marginBottom: 4, verticalAlign: 'middle' }} />
      <span> Topological</span>
    </>
  ]
].map(([m, label]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: '3px 11px',
                  borderRadius: 18,
                  border: 'none',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: mode === m ? '#FFCC00' : 'transparent',
                  color:      mode === m ? '#000'    : colors.text,
                  transition: 'background 0.2s, color 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Line legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {uniqueLines.slice(0, 8).map(ln => (
            <div key={ln} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: colors.text }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: LINE_COLORS[ln] }} />
              {ln.replace(' and ', ' & ')}
            </div>
          ))}
        </div>
      </div>

      {/* Map — key=mode forces a fresh MapView (resets pan/zoom) when switching */}
      <MapView
        key={mode}
        paths={activePaths}
        stops={stopsWithPos}
        stopStatuses={stopStatuses}
        targetStop={targetStop}
        revealTarget={revealTarget}
        isDarkMode={isDarkMode}
        colors={colors}
      />

      {/* Info bar for topo mode */}
      {mode === 'topo' && (
        <div style={{
          padding: '6px 14px',
          borderTop: `1px solid ${colors.border}`,
          fontSize: 11,
          color: colors.text,
          textAlign: 'center',
          background: isDarkMode ? '#222' : '#F0F0F0',
        }}>
          Schematic view — stops evenly spaced for readability. Switch to Geographic for real positions.
        </div>
      )}

      <style>{`
        @keyframes tooltipIn {
          from { opacity: 0; transform: translateY(3px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}