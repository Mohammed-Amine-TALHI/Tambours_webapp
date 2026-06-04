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

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get('/api/admin/users')
      setUsers(data.users)
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Impossible de charger les utilisateurs.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Utilisateurs</h1>
          <p className="text-sm text-slate-500 mt-1">Gestion des comptes administrateurs et opérateurs.</p>
        </div>
        <Link
          to="/admin/users/new"
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          + Nouvel utilisateur
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Nom</th>
              <th className="text-left px-4 py-3">Username</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Rôle</th>
              <th className="text-left px-4 py-3">État</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Chargement…</td></tr>
            )}
            {!loading && users.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Aucun utilisateur.</td></tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3">{u.first_name} {u.last_name}</td>
                <td className="px-4 py-3 font-mono text-slate-700">{u.username}</td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex text-xs px-2 py-0.5 rounded-full border ${
                    u.role === 'admin'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
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
                <td className="px-4 py-3 text-right space-x-1">
                  <button
                    disabled={busyId === u.id}
                    onClick={() => resetPassword(u)}
                    className="text-xs px-2 py-1 rounded-md text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                  >
                    Reset MDP
                  </button>
                  <button
                    disabled={busyId === u.id}
                    onClick={() => toggleActive(u)}
                    className="text-xs px-2 py-1 rounded-md text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  >
                    {u.is_active ? 'Désactiver' : 'Activer'}
                  </button>
                  <button
                    disabled={busyId === u.id}
                    onClick={() => deleteUser(u)}
                    className="text-xs px-2 py-1 rounded-md text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
