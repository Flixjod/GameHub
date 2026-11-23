import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, SocketProvider, ToastProvider, ThemeProvider, useAuth } from './store.jsx'
import { Sidebar, MobileNav } from './components/Sidebar.jsx'
import { TopBar } from './components/TopBar.jsx'
import Drawer from './components/Drawer.jsx'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import Games from './pages/Games.jsx'
import Play from './pages/Play.jsx'
import Tournaments from './pages/Tournaments.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import Friends from './pages/Friends.jsx'
import Store from './pages/Store.jsx'
import Settings from './pages/Settings.jsx'
import Profile from './pages/Profile.jsx'
import Achievements from './pages/Achievements.jsx'
import { api } from './lib/api.js'

function Shell({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  const [pending, setPending] = React.useState(0)

  React.useEffect(() => {
    api('/friends').then((d) => setPending(d.requests.length)).catch(() => {})
  }, [location.pathname, user?.id])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-line-2 border-t-emerald-neon" />
          <p className="text-sm text-ink-faint">Loading GameHub…</p>
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="min-h-full">
      <Sidebar pendingRequests={pending} />
      <div className="lg:pl-[248px]">
        <TopBar onMenu={() => window.dispatchEvent(new CustomEvent('gh:toggle-drawer'))} />
        <main className="mx-auto max-w-[1200px] px-4 pb-28 pt-6 sm:px-6 lg:pb-10">{children}</main>
      </div>
      <MobileNav pendingRequests={pending} />
      <Drawer pendingRequests={pending} />
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <ThemeProvider>
          <SocketProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="*" element={
                <Shell>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/games" element={<Games />} />
                    <Route path="/play/:gameId" element={<Play />} />
                    <Route path="/tournaments" element={<Tournaments />} />
                    <Route path="/leaderboard" element={<Leaderboard />} />
                    <Route path="/friends" element={<Friends />} />
                    <Route path="/store" element={<Store />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/profile/:username" element={<Profile />} />
                    <Route path="/achievements" element={<Achievements />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Shell>
              } />
            </Routes>
          </SocketProvider>
        </ThemeProvider>
      </AuthProvider>
    </ToastProvider>
  )
}
