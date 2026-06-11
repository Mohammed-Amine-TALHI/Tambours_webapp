import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { ensureCsrf } from '../lib/api'
import { useAuth } from '../auth/AuthContext'

/**
 * Returns a strength score 0..5 and a list of unmet requirements.
 */
function evaluatePassword(pw) {
  const checks = {
    length:    pw.length >= 12,
    upper:     /[A-Z]/.test(pw),
    lower:     /[a-z]/.test(pw),
    digit:     /[0-9]/.test(pw),
    symbol:    /[^A-Za-z0-9]/.test(pw),
  }
  const score = Object.values(checks).filter(Boolean).length
  return { score, checks }
}

const STRENGTH_LABEL = ['Très faible', 'Faible', 'Moyen', 'Bon', 'Fort', 'Très fort']
const STRENGTH_COLOR = ['bg-red-500', 'bg-red-400', 'bg-amber-400', 'bg-yellow-400', 'bg-emerald-500', 'bg-emerald-600']

export default function FirstLogin() {
  const { user, refresh, logout } = useAuth()
  const navigate = useNavigate()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const { score, checks } = useMemo(() => evaluatePassword(newPassword), [newPassword])
  const allRulesPass = score === 5
  const matches = newPassword && newPassword === confirm
  const canSubmit = currentPassword && allRulesPass && matches

  async function onSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    setFieldErrors({})
    setSubmitting(true)
    try {
      await ensureCsrf()
      await api.post('/api/password/change', {
        current_password:           currentPassword,
        new_password:               newPassword,
        new_password_confirmation:  confirm,
      })
      const updated = await refresh()
      navigate(updated.role === 'admin' ? '/admin/users' : '/app', { replace: true })
    } catch (err) {
      const data = err?.response?.data
      if (data?.errors) setFieldErrors(data.errors)
      setError(data?.message ?? 'Impossible de mettre à jour le mot de passe.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-bg flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-emerald-900/10">
        <div className="relative bg-gradient-to-br from-emerald-700 via-emerald-700 to-teal-700 px-8 py-6 text-white">
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{ backgroundImage: 'repeating-linear-gradient(135deg, #fff 0 1px, transparent 1px 14px)' }}
          />
          <div className="relative">
            <h1 className="text-xl font-semibold">Changement de mot de passe requis</h1>
            <p className="text-sm text-emerald-50/90 mt-1">
              Bienvenue {user?.first_name}. Vous devez définir un nouveau mot de passe avant de continuer.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="px-8 py-7 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
              {error}
            </div>
          )}

          {/* Current temp password */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Mot de passe temporaire (reçu de l'admin)
            </label>
            <input
              type={show ? 'text' : 'password'}
              required
              autoFocus
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
            {fieldErrors.current_password && (
              <p className="text-xs text-red-600">{fieldErrors.current_password[0]}</p>
            )}
          </div>

          {/* New password */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Nouveau mot de passe
            </label>
            <input
              type={show ? 'text' : 'password'}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />

            {/* Strength bar */}
            {newPassword && (
              <div className="pt-2 space-y-2">
                <div className="flex gap-1">
                  {[0,1,2,3,4].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded ${i < score ? STRENGTH_COLOR[score] : 'bg-slate-200'}`}
                    />
                  ))}
                </div>
                <p className="text-xs text-slate-500">Force : {STRENGTH_LABEL[score]}</p>
              </div>
            )}

            <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs pt-2">
              <RuleItem ok={checks.length}  label="Au moins 12 caractères" />
              <RuleItem ok={checks.upper}   label="Une majuscule" />
              <RuleItem ok={checks.lower}   label="Une minuscule" />
              <RuleItem ok={checks.digit}   label="Un chiffre" />
              <RuleItem ok={checks.symbol}  label="Un symbole" />
            </ul>

            {fieldErrors.new_password && (
              <p className="text-xs text-red-600">{fieldErrors.new_password[0]}</p>
            )}
          </div>

          {/* Confirm */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Confirmer le nouveau mot de passe
            </label>
            <input
              type={show ? 'text' : 'password'}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
            {confirm && !matches && (
              <p className="text-xs text-red-600">Les mots de passe ne correspondent pas.</p>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600 select-none">
            <input
              type="checkbox"
              checked={show}
              onChange={(e) => setShow(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            Afficher les mots de passe
          </label>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 transition-colors"
            >
              {submitting ? 'Mise à jour…' : 'Définir le mot de passe'}
            </button>
            <button
              type="button"
              onClick={logout}
              className="px-4 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 text-sm"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function RuleItem({ ok, label }) {
  return (
    <li className={`flex items-center gap-1.5 ${ok ? 'text-emerald-600' : 'text-slate-400'}`}>
      <span className="inline-block h-3.5 w-3.5 rounded-full flex items-center justify-center text-[10px]">
        {ok ? '✓' : '○'}
      </span>
      {label}
    </li>
  )
}
