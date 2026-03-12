/**
 * gameLogic.js
 * ------------
 * Pure functions for all Metrolinkdle game logic.
 * No React dependencies — easy to unit-test independently.
 */

import { NET } from './networkData'

export const STOPS       = NET.stops        // { name -> {name,code,zone,lat,lng,lines[]} }
export const GRAPH       = NET.graph        // { name -> [neighbour_names] }
export const LINE_COLORS = NET.lineColors   // { lineName -> hex }
export const SVG_PATHS   = NET.svgPaths     // [ {line, color, coords} ]
export const BOUNDS      = NET.bounds       // {minLat,maxLat,minLng,maxLng}
export const ALL_STOPS   = Object.values(STOPS)
export const MAX_GUESSES = 8

const TARGET_URL = "direct-hit_1f3af.png";



// ─── BFS ─────────────────────────────────────────────────────────────────────

/**
 * Shortest-path hop count between two stop names.
 * Returns 999 if no path exists (disconnected graph — shouldn't happen).
 */
export function bfsDistance(from, to) {
  if (!GRAPH[from] || !GRAPH[to]) return 999
  if (from === to) return 0
  const visited = new Set([from])
  const queue   = [[from, 0]]
  while (queue.length) {
    const [node, dist] = queue.shift()
    for (const nb of (GRAPH[node] || [])) {
      if (nb === to) return dist + 1
      if (!visited.has(nb)) {
        visited.add(nb)
        queue.push([nb, dist + 1])
      }
    }
  }
  return 999
}

// ─── Compass bearing ─────────────────────────────────────────────────────────

/** Bearing in degrees from stop `from` toward stop `to`. */
export function bearing(from, to) {
  const dLng = to.lng - from.lng
  const dLat = to.lat - from.lat
  const deg  = Math.atan2(dLng, dLat) * (180 / Math.PI)
  return (deg + 360) % 360
}

/** Arrow character for a bearing (8 cardinal/intercardinal directions). */
export function bearingArrow(deg) {
  return ['↑','↗','→','↘','↓','↙','←','↖'][Math.round(deg / 45) % 8]
}

// ─── Zone helpers ─────────────────────────────────────────────────────────────

/** Returns the lowest zone number for a zone string like "2/3" → 2. */
export function zoneNum(z) {
  if (!z) return 1
  return Math.min(...String(z).split('/').map(Number))
}

// ─── Clue evaluation ─────────────────────────────────────────────────────────

/**
 * Evaluate a single guess against the target.
 * Returns an object with one status per clue column:
 *   "correct" | "partial" | "wrong"
 *
 * @param {object} guessStop   - stop object from STOPS
 * @param {object} targetStop  - stop object from STOPS
 */
export function evaluateGuess(guessStop, targetStop) {
  // Line
  const sharedLines = guessStop.lines.filter(l => targetStop.lines.includes(l))
  const lineStatus  = sharedLines.length > 0 ? 'correct' : 'wrong'

  // Distance
  const dist       = bfsDistance(guessStop.name, targetStop.name)
  const distStatus = dist === 0 ? 'correct' : dist <= 6 ? 'partial' : 'wrong'

  // Direction
  const deg = bearing(guessStop, targetStop)
  const arrow = dist === 0 ? '🎯' : bearingArrow(deg);

  // Zone
  const zd         = Math.abs(zoneNum(guessStop.zone) - zoneNum(targetStop.zone))
  const zoneStatus = zd === 0 ? 'correct' : zd === 1 ? 'partial' : 'wrong'

  // Overall row status (used for map dot colour)
  const rowStatus = dist === 0 ? 'correct'
    : lineStatus === 'correct' || distStatus === 'partial' ? 'partial'
    : 'wrong'

  return {
    sharedLines,
    lineStatus,
    dist,
    distStatus,
    arrow,
    deg,
    zoneStatus,
    rowStatus,
  }
}

// ─── Share string ─────────────────────────────────────────────────────────────

const STATUS_EMOJI = { correct: '🟢', partial: '🟡', wrong: '🔴' }

export function buildShareText(guesses, targetStop, won) {
  const score = won ? `${guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`
  const rows  = guesses.map(({ stop }, i) => {
    const isLast = won && i === guesses.length - 1
    if (isLast) return '🎯🎯🎯🎯'
    const ev = evaluateGuess(stop, targetStop)
    return [
      STATUS_EMOJI[ev.lineStatus],
      STATUS_EMOJI[ev.distStatus],
      ev.arrow,
      STATUS_EMOJI[ev.zoneStatus],
    ].join('')
  })
  return [`Metrolinkdle ${score}`, ...rows, 'https://metrolinkdle.app'].join('\n')
}


// ─── SVG projection ───────────────────────────────────────────────────────────

export const SVG_W = 500, SVG_H = 420, PAD = 22

export function geoToSvg(lng, lat) {
  const x = PAD + (lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng) * (SVG_W - PAD * 2)
  const y = PAD + (1 - (lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * (SVG_H - PAD * 2)
  return [x, y]
}

// ─── Topological projection ───────────────────────────────────────────────────

export const TOPO_BOUNDS = NET.topoBounds    // {minX, maxX, minY, maxY}
export const TOPO_PATHS  = NET.topoPaths     // [ {line, color, coords:[topoX,topoY][]} ]

export function topoToSvg(topoX, topoY) {
  const x = PAD + (topoX - TOPO_BOUNDS.minX) / (TOPO_BOUNDS.maxX - TOPO_BOUNDS.minX) * (SVG_W - PAD * 2)
  const y = PAD + (topoY - TOPO_BOUNDS.minY) / (TOPO_BOUNDS.maxY - TOPO_BOUNDS.minY) * (SVG_H - PAD * 2)
  return [x, y]
}
