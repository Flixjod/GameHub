import React from 'react'

export function readPref(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw == null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function writePref(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* private mode */ }
}

export function usePref(key, fallback) {
  const [value, setValue] = React.useState(() => readPref(key, fallback))
  const set = React.useCallback((v) => {
    setValue((prev) => {
      const next = typeof v === 'function' ? v(prev) : v
      writePref(key, next)
      return next
    })
  }, [key])
  return [value, set]
}
