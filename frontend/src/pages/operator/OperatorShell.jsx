import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

export default function OperatorShell({ children, breadcrumb }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function onLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-screen-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/app" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-emerald-600 text-white flex items-center justify-center font-semibold">T</div>
            <span className="font-semibold text-slate-800">Tambours · Installation KOCH</span>
          </Link>
          <div className="flex items-center gap-3">
            {user?.role === 'admin' && (
              <Link to="/admin" className="text-sm text-emerald-700 hover:text-emerald-900 px-3 py-1.5 rounded-md hover:bg-emerald-50">
                Admin
              </Link>
            )}
            <span className="text-sm text-slate-600">{user?.first_name} {user?.last_name}</span>
            <button
              onClick={onLogout}
              className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-md hover:bg-slate-100"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {breadcrumb && (
        <div className="bg-white border-b border-slate-100">
          <div className="max-w-screen-2xl mx-auto px-6 py-2 text-sm text-slate-500 flex items-center gap-2">
            {breadcrumb}
          </div>
        </div>
      )}

      <main className="flex-1 max-w-screen-2xl w-full mx-auto px-6 py-6">
        {children}
      </main>
    </div>
  )
}
