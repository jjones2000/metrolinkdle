/**
 * usePlayerId.js
 * --------------
 * Generates a random UUID on first visit and persists it in localStorage.
 * This gives each browser an anonymous but stable identity for stats
 * without any login requirement.
 */
import { useState } from 'react'

function generateId() {
  // Use crypto.randomUUID where available (all modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export function usePlayerId() {
  const [playerId] = useState(() => {
    const stored = localStorage.getItem('metrodle_player_id')
    if (stored) return stored
    const newId = generateId()
    localStorage.setItem('metrodle_player_id', newId)
    return newId
  })
  return playerId
}
