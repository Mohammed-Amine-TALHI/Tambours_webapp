import { useState } from 'react'

/**
 * Displays a one-time temporary password to the admin.
 * The password is shown ONCE and cannot be retrieved afterwards.
 */
export default function TempPasswordModal({ open, onClose, user, password }) {
  const [copied, setCopied] = useState(false)
  if (!open) return null

  async function copy() {
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {/* ignore */}
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-emerald-600 text-white px-6 py-4">
          <h3 className="font-semibold">Mot de passe temporaire généré</h3>
          <p className="text-sm text-emerald-50/90 mt-0.5">
            Communiquez-le à <strong>{user?.first_name} {user?.last_name}</strong> — il ne sera plus affiché.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Nom d'utilisateur</p>
            <p className="font-mono text-slate-800">{user?.username}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Mot de passe (unique)</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-lg bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 select-all">
                {password}
              </code>
              <button
                onClick={copy}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
              >
                {copied ? 'Copié ✓' : 'Copier'}
              </button>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2">
            ⚠ L'utilisateur devra le changer dès sa première connexion.
            Ce mot de passe ne sera <strong>plus jamais</strong> affiché.
          </div>

          <button
            onClick={onClose}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg py-2.5"
          >
            J'ai noté le mot de passe
          </button>
        </div>
      </div>
    </div>
  )
}
