import { Routes, Route, Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { AppShell } from './components/layout/AppShell'
import { Spinner } from './components/ui/Spinner'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { DashboardPage } from './pages/DashboardPage'
import { CreateRoomPage } from './pages/CreateRoomPage'
import { RoomOverviewPage } from './pages/RoomOverviewPage'
import { RoomExpensesPage } from './pages/RoomExpensesPage'
import { NewExpensePage } from './pages/NewExpensePage'
import { JoinRoomPage } from './pages/JoinRoomPage'
import { ProfilePage } from './pages/ProfilePage'
import { AdminPage } from './pages/AdminPage'
import { NotFoundPage } from './pages/NotFoundPage'
import type { ReactNode } from 'react'

function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) {
    const redirect = location.pathname + location.search
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />
  }

  return <>{children}</>
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirect')

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (user) {
    return <Navigate to={redirectTo || '/'} replace />
  }

  return <>{children}</>
}

export function AppRouter() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
      <Route path="/join/:token" element={<JoinRoomPage />} />

      {/* Private routes */}
      <Route element={<PrivateRoute><AppShell /></PrivateRoute>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/rooms/new" element={<CreateRoomPage />} />
        <Route path="/rooms/:id" element={<RoomOverviewPage />} />
        <Route path="/rooms/:id/expenses" element={<RoomExpensesPage />} />
        <Route path="/rooms/:id/expenses/new" element={<NewExpensePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
