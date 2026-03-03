/**
 * api.js
 * ------
 * All communication with the FastAPI backend lives here.
 * The rest of the app never touches fetch() directly.
 *
 * In development:  VITE_API_URL is empty and Vite's proxy forwards /api → localhost:8000
 * In production:   VITE_API_URL = https://your-app.up.railway.app
 */

const BASE = import.meta.env.VITE_API_URL ?? ''

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${res.status}: ${text}`)
  }
  return res.json()
}

// ─── Daily target ─────────────────────────────────────────────────────────────

/**
 * Returns { stop: string, date: string }
 * The stop name is used to compare against guesses on the client.
 */
export async function fetchDailyStop() {
  return request('/api/daily')
}

// ─── Stats ────────────────────────────────────────────────────────────────────

/**
 * Record the result of a completed game.
 * @param {Object} result
 * @param {string} result.player_id   - anonymous UUID stored in localStorage
 * @param {string} result.date        - ISO date string "YYYY-MM-DD"
 * @param {boolean} result.won
 * @param {number}  result.guesses    - number of guesses used (1–8)
 * @param {string}  result.target_stop
 */
export async function postGameResult(result) {
  return request('/api/stats', {
    method: 'POST',
    body: JSON.stringify(result),
  })
}

/**
 * Fetch aggregated stats for a player.
 * Returns { games_played, games_won, win_rate,
 *           current_streak, max_streak, guess_distribution }
 */
export async function fetchPlayerStats(playerId) {
  return request(`/api/stats/${playerId}`)
}
