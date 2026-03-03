/**
 * useStats.js
 * -----------
 * Fetches player stats from the backend on mount and exposes a
 * `recordResult` function to post a completed game.
 */
import { useState, useEffect, useCallback } from 'react'
import { fetchPlayerStats, postGameResult } from '../api'

/**
 * @param {string} playerId  - from usePlayerId()
 * @returns {{
 *   stats: object|null,
 *   statsLoading: boolean,
 *   recordResult: (result: object) => Promise<void>
 * }}
 */
export function useStats(playerId) {
  const [stats,        setStats]        = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // Fetch on mount
  useEffect(() => {
    if (!playerId) return
    fetchPlayerStats(playerId)
      .then(data => { setStats(data); setStatsLoading(false) })
      .catch(err  => { console.warn('Stats fetch failed:', err); setStatsLoading(false) })
  }, [playerId])

  // Post a result and refresh stats
  const recordResult = useCallback(async ({ date, won, guesses, targetStop }) => {
    try {
      await postGameResult({
        player_id:   playerId,
        date,
        won,
        guesses,
        target_stop: targetStop,
      })
      // Refresh stats after recording
      const fresh = await fetchPlayerStats(playerId)
      setStats(fresh)
    } catch (err) {
      // Non-fatal — stats are nice-to-have, not game-breaking
      console.warn('Failed to record result:', err)
    }
  }, [playerId])

  return { stats, statsLoading, recordResult }
}
