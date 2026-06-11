import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api, { ensureCsrf } from '../lib/api'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await ensureCsrf()
      await api.post('/api/password/forgot', { email: email.trim().toLowerCase() })
      setDone(true)
      // After 1.5s, navigate to reset page with email pre-filled
      setTimeout(() => {
        navigate('/reset-password', { state: { email: email.trim().toLowerCase() } })
      }, 1500)
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Erreur. Veuillez réessayer.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-bg flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-emerald-900/10">
        <div className="relative bg-gradient-to-br from-emerald-700 via-emerald-700 to-teal-700 px-8 py-6 text-white">
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{ backgroundImage: 'repeating-linear-gradient(135deg, #fff 0 1px, transparent 1px 14px)' }}
          />
          <div className="relative">
            <h1 className="text-xl font-semibold">Mot de passe oublié</h1>
            <p className="text-sm text-emerald-50/90 mt-1">
              Nous vous enverrons un code de réinitialisation par email.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="px-8 py-7 space-y-5">
          {done ? (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-3 py-3">
              ✓ Si un compte existe pour cette adresse, un code vous a été envoyé.<br />
              Redirection vers la page de réinitialisation…
            </div>
          ) : (
            <>
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">
                  Adresse email
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="gabriel.thomas@ocpgroup.ma"
                />
                <p className="text-xs text-slate-500 pt-1">
                  Entrez l'email associé à votre compte.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting || !email}
                className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium py-2.5"
              >
                {submitting ? 'Envoi en cours…' : 'Envoyer le code'}
              </button>
            </>
          )}

          <div className="pt-2 text-center">
            <Link to="/login" className="text-sm text-emerald-700 hover:text-emerald-800">
              ← Retour à la connexion
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
