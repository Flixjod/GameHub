import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { io } from 'socket.io-client'
import { api, setToken, getToken } from './lib/api.js'
import { ACCENT_THEMES } from './lib/helpers.js'

// ---------------- Auth ----------------
const AuthCtx = createContext(null)
export function useAuth() {
  return useContext(AuthCtx)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getToken()) { setLoading(false); return }
    api('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (username, password) => {
    const d = await api('/auth/login', { method: 'POST', body: { username, password } })
    setToken(d.token)
    setUser(d.user)
    return d.user
  }, [])

  const register = useCallback(async (username, password, displayName, email) => {
    const d = await api('/auth/register', { method: 'POST', body: { username, password, displayName, email } })
    setToken(d.token)
    setUser(d.user)
    return d.user
  }, [])

  const guest = useCallback(async () => {
    const d = await api('/auth/guest', { method: 'POST' })
    setToken(d.token)
    setUser(d.user)
    return d.user
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    try { setUser((await api('/auth/me')).user) } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    const onRefresh = (e) => { if (e.detail) setUser(e.detail); else refreshUser() }
    window.addEventListener('gh:refresh-user', onRefresh)
    return () => window.removeEventListener('gh:refresh-user', onRefresh)
  }, [refreshUser])

  const value = useMemo(() => ({
    user,
    loading,
    login,
    register,
    guest,
    logout,
    refreshUser,
    setUser,
  }), [user, loading, login, register, guest, logout, refreshUser])

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

// ---------------- Accent theme ----------------
const ThemeCtx = createContext(null)
export function useTheme() {
  return useContext(ThemeCtx)
}

export function ThemeProvider({ children }) {
  const { user, setUser } = useAuth()
  const accent = ACCENT_THEMES[user?.settings?.accent] ? user.settings.accent : '#10e58a'

  useEffect(() => {
    const rgb = ACCENT_THEMES[accent]?.rgb || '16,229,138'
    document.documentElement.style.setProperty('--color-emerald-neon', accent)
    document.documentElement.style.setProperty('--accent-rgb', rgb)
  }, [accent])

  const setAccent = useCallback(async (hex) => {
    setUser((u) => ({ ...u, settings: { ...u.settings, accent: hex } }))
    try {
      await api('/auth/me', { method: 'PATCH', body: { settings: { accent: hex } } })
    } catch { /* ignore */ }
  }, [setUser])

  return <ThemeCtx.Provider value={{ accent, setAccent }}>{children}</ThemeCtx.Provider>
}

// ---------------- Toasts ----------------
const ToastCtx = createContext(null)
export function useToast() {
  return useContext(ToastCtx)
}

let toastId = 0
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const push = useCallback((message, kind = 'info', ms = 3600) => {
    const id = ++toastId
    setToasts((t) => [...t, { id, message, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ms)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none max-md:bottom-24 max-md:left-4 max-md:right-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto animate-slide-up glass rounded-xl px-4 py-3 text-sm shadow-2xl border ${
              t.kind === 'error' ? 'border-red-500/40 text-red-200' :
              t.kind === 'success' ? 'border-emerald-neon/40 text-ink' :
              'border-line-2 text-ink-dim'}`}
            style={t.kind === 'success' ? { boxShadow: '0 8px 30px -6px rgba(var(--accent-rgb),.4), 0 0 0 1px rgba(var(--accent-rgb),.3)' } : undefined}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

// ---------------- Realtime socket ----------------
const SocketCtx = createContext(null)
export function useSocket() {
  return useContext(SocketCtx)
}

export function SocketProvider({ children }) {
  const { user, loading } = useAuth()
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const toast = useToast()
  const activity = useRef(0) // bump counter so pages can react to 'notify'
  const [, forceTick] = useState(0)

  useEffect(() => {
    if (loading || !user) return
    const s = io({
      auth: { token: getToken() },
      transports: ['websocket', 'polling'],
      reconnectionDelay: 800,
      reconnectionDelayMax: 5000,
    })
    s.on('connect', () => setConnected(true))
    s.on('disconnect', () => setConnected(false))
    s.on('reconnect', () => setConnected(true))
    setSocket(s)
    s.on('notify', (n) => {
      activity.current++
      forceTick((x) => x + 1)
      toast(n.title, n.type === 'achievement' || n.type === 'friend' ? 'success' : 'info', 4500)
    })
    s.on('error:msg', (d) => toast(d.error || 'Something went wrong', 'error'))
    return () => { s.close(); setSocket(null) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, loading])

  // live notifications share the activity ref through a tiny subscribe API
  const value = useMemo(() => ({ socket, connected, activity, toast }), [socket, connected])
  return <SocketCtx.Provider value={value}>{children}</SocketCtx.Provider>
}

export function useLiveNotifications(onPing) {
  const { socket } = useSocket()
  useEffect(() => {
    if (!socket || !onPing) return
    const h = (n) => onPing(n)
    socket.on('notify', h)
    return () => socket.off('notify', h)
  }, [socket, onPing])
}
