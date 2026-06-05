import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function onLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/ocp-logo.png" alt="OCP" className="h-10 w-auto object-contain" />
            <span className="font-semibold text-slate-800">Tambours · Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">
              {user?.first_name} {user?.last_name}
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                admin
              </span>
            </span>
            <button
              onClick={onLogout}
              className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-md hover:bg-slate-100"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* Body — sidebar + content */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 grid grid-cols-12 gap-6">
        <aside className="col-span-3">
          <nav className="bg-white border border-slate-200 rounded-xl p-2 space-y-1">
            <SideLink to="/admin/design" label="Design du schéma" />
            <SideLink to="/admin/import" label="Importer Excel" />
            <SideLink to="/admin/users" label="Utilisateurs" />
            {/* future: <SideLink to="/admin/domains" label="Domaines email" /> */}
          </nav>
        </aside>

        <main className="col-span-9">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function SideLink({ to, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `block px-3 py-2 rounded-md text-sm transition ${
          isActive
            ? 'bg-emerald-50 text-emerald-700 font-medium'
            : 'text-slate-600 hover:bg-slate-50'
        }`
      }
    >
      {label}
    </NavLink>
  )
}
