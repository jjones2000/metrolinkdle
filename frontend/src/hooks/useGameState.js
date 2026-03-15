/**
 * useGameState.js
 * ---------------
 * Persists the current day's game state (guesses, won, gameOver) to
 * localStorage so refreshing the page restores progress.
 *
 * State is keyed by today's date so it auto-clears the next day.
 */
import { useState, useEffect } from 'react'

const TODAY = new Date().toISOString().slice(0, 10)
const STATE_KEY = `metrolinkdle_game_${TODAY}`

function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state))
  } catch {}
}

export function useGameState() {
  const saved = loadState()

  const [guesses,      setGuesses]      = useState(saved?.guesses      || [])
  const [gameOver,     setGameOver]     = useState(saved?.gameOver      || false)
  const [won,          setWon]          = useState(saved?.won           || false)
  const [revealTarget, setRevealTarget] = useState(saved?.revealTarget  || false)

  // Persist whenever state changes
  useEffect(() => {
    saveState({ guesses, gameOver, won, revealTarget })
  }, [guesses, gameOver, won, revealTarget])

  return {
    guesses,      setGuesses,
    gameOver,     setGameOver,
    won,          setWon,
    revealTarget, setRevealTarget,
  }
}
