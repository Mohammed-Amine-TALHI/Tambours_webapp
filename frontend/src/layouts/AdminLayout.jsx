import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import SearchPalette, { SearchTrigger } from '../components/SearchPalette'
import { useSearchPalette } from '../lib/useSearchPalette'

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { open, openPalette, closePalette } = useSearchPalette()

  async function onLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="h-0.5 bg-gradient-to-r from-emerald-700 via-teal-500 to-emerald-700" />
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/admin" className="flex min-w-0 items-center gap-2.5">
            <img src="/ocp-logo.png" alt="OCP" className="h-9 w-auto shrink-0 object-contain" />
            <span className="truncate font-semibold text-slate-800">
              Tambours
              <span className="hidden font-normal text-slate-400 sm:inline"> · Administration</span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            <SearchTrigger onOpen={openPalette} />
            <Link
              to="/app"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
            >
              <EyeIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Vue opérateur</span>
            </Link>
            <span className="hidden items-center gap-2 text-sm text-slate-600 md:flex">
              {user?.first_name} {user?.last_name}
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                admin
              </span>
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

      {/* Body — sidebar + content */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:flex-row">
        <aside className="lg:w-64 lg:shrink-0">
          <nav className="flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 lg:flex-col lg:overflow-visible">
            <SideLink to="/admin/design" icon={ShapesIcon} label="Design du schéma" desc="Zones sur le plan maître" />
            <SideLink to="/admin/import" icon={UploadIcon} label="Importer Excel" desc="Convoyeurs & tambours" />
            <SideLink to="/admin/etats" icon={TagIcon} label="États" desc="Statuts personnalisés" />
            <SideLink to="/admin/users" icon={UsersIcon} label="Utilisateurs" desc="Comptes & accès" />

            <div className="my-1 hidden border-t border-slate-100 lg:block" />

            {/* Accès direct à la plateforme opérateur */}
            <Link
              to="/app"
              className="flex shrink-0 items-center gap-2.5 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/60 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
            >
              <EyeIcon className="h-4 w-4 shrink-0" />
              <span className="lg:flex-1">Vue opérateur</span>
              <span aria-hidden className="hidden lg:inline">→</span>
            </Link>
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      {open && <SearchPalette onClose={closePalette} />}
    </div>
  )
}

function SideLink({ to, icon: Icon, label, desc }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${
          isActive
            ? 'bg-emerald-600 font-medium text-white shadow-sm'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-emerald-100' : 'text-slate-400'}`} />
          <span className="min-w-0">
            <span className="block whitespace-nowrap">{label}</span>
            <span className={`hidden text-[11px] font-normal lg:block ${isActive ? 'text-emerald-100/90' : 'text-slate-400'}`}>
              {desc}
            </span>
          </span>
        </>
      )}
    </NavLink>
  )
}

/* ---------------- icons ---------------- */

function ShapesIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.3 10 12 3l3.7 7Z" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <circle cx="17.5" cy="17.5" r="3.5" />
    </svg>
  )
}

function UploadIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M12 4v12" />
    </svg>
  )
}

function UsersIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function TagIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.6 2.9 21 11.3a2 2 0 0 1 0 2.8l-6.9 6.9a2 2 0 0 1-2.8 0L2.9 12.6A2 2 0 0 1 2.3 11l.6-6.1a2 2 0 0 1 1.8-1.8L10.8 2.5a2 2 0 0 1 1.8.4Z" />
      <circle cx="8" cy="8" r="1.5" />
    </svg>
  )
}

function EyeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
