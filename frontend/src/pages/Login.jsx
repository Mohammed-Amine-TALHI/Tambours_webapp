import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const user = await login(identifier.trim(), password)
      if (user.must_change_password) {
        navigate('/first-login', { replace: true })
      } else {
        navigate(user.role === 'admin' ? '/admin/users' : '/app', { replace: true })
      }
    } catch (err) {
      const msg =
        err?.response?.data?.errors?.login?.[0] ??
        err?.response?.data?.message ??
        'Connexion impossible. Veuillez réessayer.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header band */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 px-8 py-7 text-white">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-xl bg-white flex items-center justify-center p-1 shrink-0">
              <img src="/ocp-logo.png" alt="OCP" className="h-full w-auto object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Plateforme Tambours</h1>
              <p className="text-sm text-emerald-50/90">Recherche pièces convoyeurs</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="px-8 py-7 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Connexion</h2>
            <p className="text-sm text-slate-500 mt-1">
              Entrez vos identifiants pour accéder à la plateforme.
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Nom d'utilisateur ou adresse e-mail
            </label>
            <input
              type="text"
              autoComplete="username"
              autoFocus
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              placeholder="gabriel.thomas ou gabriel@example.com"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Mot de passe
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showPassword ? 'Masquer' : 'Afficher'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 transition-colors"
          >
            {submitting ? 'Connexion en cours…' : 'Se connecter'}
          </button>

          <p className="text-sm text-center pt-2">
            <Link to="/forgot-password" className="text-emerald-700 hover:text-emerald-800 font-medium">
              Mot de passe oublié ?
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
