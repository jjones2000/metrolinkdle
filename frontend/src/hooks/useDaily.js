/**
 * useDaily.js
 * -----------
 * Fetches the daily target stop from the FastAPI backend.
 *
 * Uses localStorage (not sessionStorage) so the cached stop survives
 * page refreshes. Cache is keyed by date so it auto-invalidates at midnight.
 * The game will load instantly from cache on refresh while silently
 * revalidating in the background.
 */
import { useState, useEffect } from 'react'
import { fetchDailyStop } from '../api'

const CACHE_KEY = 'metrolinkdle_daily_cache'
const TODAY = new Date().toISOString().slice(0, 10)

function getCached() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { date, stop, game_number } = JSON.parse(raw)
    if (date === TODAY && stop && game_number) return { stop, game_number }
  } catch {}
  return null
}

function setCache(date, stop, game_number) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ date, stop, game_number }))
  } catch {}
}

export function useDaily() {
  const cached = getCached()
  const [targetStop, setTargetStop] = useState(cached?.stop || null)
  const [gameNumber, setGameNumber] = useState(cached?.game_number || null)
  // Only show loading screen if we have nothing cached at all
  const [loading,    setLoading]    = useState(!cached)
  const [error,      setError]      = useState(null)

  useEffect(() => {
    // Always fetch in background to revalidate, but only block UI if no cache
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
        // If we have cached data, don't show an error — just use the cache
        if (!cached) {
          setError(err.message)
        }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  return { targetStop, gameNumber, loading, error }
}
