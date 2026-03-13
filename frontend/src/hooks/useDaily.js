/**
 * useDaily.js
 * -----------
 * Fetches the daily target stop from the FastAPI backend.
 *
 * Caches the result in sessionStorage so we only hit the API once per
 * browser session (not once per re-render).  The cache is keyed by date
 * so it automatically refreshes at midnight.
 */
import { useState, useEffect } from 'react'
import { fetchDailyStop } from '../api'

const CACHE_KEY = 'metrolinkdle_daily_cache'

function getCached() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { date, stop, game_number } = JSON.parse(raw)
    // Invalidate if the cached date is not today, or if game_number is missing
    if (date === new Date().toISOString().slice(0, 10) && game_number) {
      return { stop, game_number }
    }
  } catch {
    // ignore parse errors
  }
  return null
}

function setCache(date, stop, game_number) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ date, stop, game_number }))
  } catch {
    // ignore storage errors (private browsing quota)
  }
}

/**
 * @returns {{ targetStop: string|null, gameNumber: number|null, loading: boolean, error: string|null }}
 */
export function useDaily() {
  const cached = getCached()
  const [targetStop, setTargetStop] = useState(cached?.stop || null)
  const [gameNumber, setGameNumber] = useState(cached?.game_number || null)
  const [loading,    setLoading]    = useState(!cached)
  const [error,      setError]      = useState(null)

  useEffect(() => {
    if (targetStop && gameNumber) return

    let cancelled = false

    fetchDailyStop()
      .then(data => {
        if (cancelled) return
        setCache(data.date, data.stop, data.game_number)
        setTargetStop(data.stop)
        setGameNumber(data.game_number)
        setLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        console.error('Failed to fetch daily stop:', err)
        setError(err.message)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [targetStop, gameNumber])

  return { targetStop, gameNumber, loading, error }
}
