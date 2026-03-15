import { useState, useEffect, useCallback } from 'react'
import { fetchPlayerStats, postGameResult, fetchDailyStats } from '../api'

export function useStats(playerId) {
  const [stats,        setStats]        = useState(null)
  const [dailyStats,   setDailyStats]   = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    if (!playerId) return
    fetchPlayerStats(playerId)
      .then(data => { setStats(data); setStatsLoading(false) })
      .catch(err  => { console.warn('Stats fetch failed:', err); setStatsLoading(false) })
  }, [playerId])

  const recordResult = useCallback(async ({ date, won, guesses, targetStop }) => {
    try {
      await postGameResult({
        player_id:   playerId,
        date,
        won,
        guesses,
        target_stop: targetStop,
      })
      // Refresh both player stats and today's global stats
      const [fresh, daily] = await Promise.all([
        fetchPlayerStats(playerId),
        fetchDailyStats(date),
      ])
      setStats(fresh)
      setDailyStats(daily)
    } catch (err) {
      console.warn('Failed to record result:', err)
    }
  }, [playerId])

  return { stats, dailyStats, statsLoading, recordResult }
}
