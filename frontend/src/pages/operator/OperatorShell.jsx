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
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur print:hidden">
        <div className="h-0.5 bg-gradient-to-r from-emerald-700 via-teal-500 to-emerald-700" />
        <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/app" className="flex min-w-0 items-center gap-2.5">
            <img src="/ocp-logo.png" alt="OCP" className="h-9 w-auto shrink-0 object-contain" />
            <span className="truncate font-semibold text-slate-800">
              Tambours
              <span className="hidden font-normal text-slate-400 sm:inline"> · Installation KOCH</span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 hover:text-emerald-900"
              >
                Admin
              </Link>
            )}
            <span className="hidden text-sm text-slate-600 md:inline">
              {user?.first_name} {user?.last_name}
            </span>
            <button
              onClick={onLogout}
              className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {breadcrumb && (
        <div className="border-b border-slate-100 bg-white print:hidden">
          <div className="mx-auto flex max-w-screen-2xl items-center gap-2 overflow-x-auto whitespace-nowrap px-4 py-2 text-sm text-slate-500 sm:px-6">
            {breadcrumb}
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-screen-2xl flex-1 px-4 py-5 sm:px-6 sm:py-6 print:max-w-none print:p-0">
        {children}
      </main>
    </div>
  )
}
