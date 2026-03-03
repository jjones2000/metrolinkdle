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

const CACHE_KEY = 'metrodle_daily_cache'

function getCached() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { date, stop } = JSON.parse(raw)
    // Invalidate if the cached date is not today
    if (date === new Date().toISOString().slice(0, 10)) return stop
  } catch {
    // ignore parse errors
  }
  return null
}

function setCache(date, stop) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ date, stop }))
  } catch {
    // ignore storage errors (private browsing quota)
  }
}

/**
 * @returns {{ targetStop: string|null, loading: boolean, error: string|null }}
 */
export function useDaily() {
  const [targetStop, setTargetStop] = useState(() => getCached())
  const [loading,    setLoading]    = useState(!getCached())
  const [error,      setError]      = useState(null)

  useEffect(() => {
    // Already have a valid cached value — nothing to do
    if (targetStop) return

    let cancelled = false

    fetchDailyStop()
      .then(data => {
        if (cancelled) return
        setCache(data.date, data.stop)
        setTargetStop(data.stop)
        setLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        console.error('Failed to fetch daily stop:', err)
        setError(err.message)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [targetStop])

  return { targetStop, loading, error }
}
