import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

function FullScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
        <p className="text-sm text-slate-500">Chargement…</p>
      </div>
    </div>
  )
}

/** Requires the user to be authenticated. */
export function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  // Force password change if needed (except on the first-login route itself)
  if (user.must_change_password && location.pathname !== '/first-login') {
    return <Navigate to="/first-login" replace />
  }

  return children
}

/** Requires admin role (and password already changed). */
export function RequireAdmin({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace />
  if (user.must_change_password) return <Navigate to="/first-login" replace />
  if (user.role !== 'admin') return <Navigate to="/app" replace />

  return children
}

/** Page only for users who still need to change their temp password. */
export function RequirePasswordChange({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace />
  if (!user.must_change_password) {
    // Already changed → redirect to their home
    return <Navigate to={user.role === 'admin' ? '/admin/users' : '/app'} replace />
  }
  return children
}

/** Public-only page (e.g. login) — bounces logged-in users to their home. */
export function PublicOnly({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (user) {
    if (user.must_change_password) return <Navigate to="/first-login" replace />
    return <Navigate to={user.role === 'admin' ? '/admin/users' : '/app'} replace />
  }
  return children
}
