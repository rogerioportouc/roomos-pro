import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'

// Pages
import LoginPage     from './pages/Login'
import AppShell     from './components/AppShell'
import Dashboard    from './pages/Dashboard'
import FloorMap     from './pages/FloorMap'
import Rooms        from './pages/Rooms'
import Bookings     from './pages/Bookings'
import Timeline     from './pages/Timeline'
import Users        from './pages/Users'
import ApiDocs      from './pages/ApiDocs'
import Appearance   from './pages/Appearance'
import Settings     from './pages/Settings'
import Wallboard    from './pages/Wallboard'
import AuthCallback from './pages/AuthCallback'

// Global styles
import './styles/globals.css'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore(s => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user)
  if (!user || user.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/auth/callback"   element={<AuthCallback />} />
        <Route path="/wallboard"       element={<Wallboard />} />
        <Route path="/" element={<RequireAuth><AppShell /></RequireAuth>}>
          <Route index                 element={<Dashboard />} />
          <Route path="floor-map"      element={<FloorMap />} />
          <Route path="rooms"          element={<Rooms />} />
          <Route path="bookings"       element={<Bookings />} />
          <Route path="timeline"       element={<Timeline />} />
          <Route path="users"          element={<RequireAdmin><Users /></RequireAdmin>} />
          <Route path="api"            element={<RequireAdmin><ApiDocs /></RequireAdmin>} />
          <Route path="appearance"     element={<RequireAdmin><Appearance /></RequireAdmin>} />
          <Route path="settings"       element={<RequireAdmin><Settings /></RequireAdmin>} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
