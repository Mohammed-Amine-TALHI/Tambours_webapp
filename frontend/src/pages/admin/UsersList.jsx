import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { ensureCsrf } from '../../lib/api'
import TempPasswordModal from '../../components/TempPasswordModal'

export default function UsersList() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [modal, setModal] = useState({ open: false, user: null, password: '' })

  useEffect(() => {
    let active = true
    api.get('/api/admin/users')
      .then(({ data }) => active && setUsers(data.users))
      .catch((err) => active && setError(err?.response?.data?.message ?? 'Impossible de charger les utilisateurs.'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  async function resetPassword(user) {
    if (!window.confirm(`Réinitialiser le mot de passe de ${user.username} ?`)) return
    setBusyId(user.id)
    try {
      await ensureCsrf()
      const { data } = await api.patch(`/api/admin/users/${user.id}/reset-password`)
      setModal({ open: true, user: data.user, password: data.temp_password })
      setUsers((list) => list.map((u) => (u.id === user.id ? data.user : u)))
    } catch (err) {
      alert(err?.response?.data?.message ?? 'Erreur lors de la réinitialisation.')
    } finally {
      setBusyId(null)
    }
  }

  async function toggleActive(user) {
    setBusyId(user.id)
    try {
      await ensureCsrf()
      const { data } = await api.patch(`/api/admin/users/${user.id}`, {
        is_active: !user.is_active,
      })
      setUsers((list) => list.map((u) => (u.id === user.id ? data.user : u)))
    } catch (err) {
      alert(err?.response?.data?.message ?? 'Erreur.')
    } finally {
      setBusyId(null)
    }
  }

  async function deleteUser(user) {
    if (!window.confirm(`Supprimer définitivement ${user.username} ?`)) return
    setBusyId(user.id)
    try {
      await ensureCsrf()
      await api.delete(`/api/admin/users/${user.id}`)
      setUsers((list) => list.filter((u) => u.id !== user.id))
    } catch (err) {
      alert(err?.response?.data?.message ?? 'Erreur.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Utilisateurs
            {!loading && (
              <span className="ml-2 align-middle rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-sm font-medium text-slate-500">
                {users.length}
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-slate-500">Gestion des comptes administrateurs et opérateurs.</p>
        </div>
        <Link
          to="/admin/users/new"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-emerald-800 hover:to-teal-700"
        >
          <span aria-hidden className="text-base leading-none">+</span>
          Nouvel utilisateur
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Utilisateur</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Rôle</th>
                <th className="px-4 py-3 text-left">État</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Chargement…</td></tr>
              )}
              {!loading && users.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Aucun utilisateur.</td></tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold uppercase text-emerald-700">
                        {(u.first_name?.[0] ?? '') + (u.last_name?.[0] ?? '')}
                      </span>
                      <span>
                        <span className="block font-medium text-slate-800">{u.first_name} {u.last_name}</span>
                        <span className="block font-mono text-xs text-slate-400">{u.username}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${
                      u.role === 'admin'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}>
                      {u.role}
                    </span>
                    {u.must_change_password && (
                      <span className="ml-1 text-xs text-amber-600" title="Doit changer son mot de passe">⏳</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs ${u.is_active ? 'text-emerald-700' : 'text-slate-500'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {u.is_active ? 'Actif' : 'Désactivé'}
                    </span>
                  </td>
                  <td className="space-x-1 whitespace-nowrap px-4 py-3 text-right">
                    <button
                      disabled={busyId === u.id}
                      onClick={() => resetPassword(u)}
                      className="rounded-md border border-emerald-200 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      Reset MDP
                    </button>
                    <button
                      disabled={busyId === u.id}
                      onClick={() => toggleActive(u)}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                    >
                      {u.is_active ? 'Désactiver' : 'Activer'}
                    </button>
                    <button
                      disabled={busyId === u.id}
                      onClick={() => deleteUser(u)}
                      className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <TempPasswordModal
        open={modal.open}
        user={modal.user}
        password={modal.password}
        onClose={() => setModal({ open: false, user: null, password: '' })}
      />
    </div>
  )
}
