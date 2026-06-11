import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api, { ensureCsrf } from '../lib/api'

function evaluatePassword(pw) {
  const checks = {
    length: pw.length >= 12,
    upper:  /[A-Z]/.test(pw),
    lower:  /[a-z]/.test(pw),
    digit:  /[0-9]/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  }
  const score = Object.values(checks).filter(Boolean).length
  return { score, checks }
}

const STRENGTH_LABEL = ['Très faible', 'Faible', 'Moyen', 'Bon', 'Fort', 'Très fort']
const STRENGTH_COLOR = ['bg-red-500', 'bg-red-400', 'bg-amber-400', 'bg-yellow-400', 'bg-emerald-500', 'bg-emerald-600']

export default function ResetPassword() {
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState(location.state?.email ?? '')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [errors, setErrors] = useState({})
  const [generalError, setGeneralError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const { score, checks } = useMemo(() => evaluatePassword(newPassword), [newPassword])
  const allRulesPass = score === 5
  const matches = newPassword && newPassword === confirm
  const canSubmit = email && otp.length === 6 && allRulesPass && matches

  async function onSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    setGeneralError(null)
    setErrors({})
    setSubmitting(true)
    try {
      await ensureCsrf()
      await api.post('/api/password/reset', {
        email:                     email.trim().toLowerCase(),
        otp,
        new_password:              newPassword,
        new_password_confirmation: confirm,
      })
      setDone(true)
      setTimeout(() => navigate('/login', { replace: true }), 2000)
    } catch (err) {
      if (err?.response?.data?.errors) setErrors(err.response.data.errors)
      setGeneralError(err?.response?.data?.message ?? 'Réinitialisation impossible.')
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
            <h1 className="text-xl font-semibold">Réinitialiser le mot de passe</h1>
            <p className="text-sm text-emerald-50/90 mt-1">
              Entrez le code reçu par email et choisissez un nouveau mot de passe.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="px-8 py-7 space-y-5">
          {done ? (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-3 py-3">
              ✓ Mot de passe réinitialisé. Redirection vers la connexion…
            </div>
          ) : (
            <>
              {generalError && (
                <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                  {generalError}
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Adresse email</label>
                <input
                  type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                />
                {errors.email && <p className="text-xs text-red-600">{errors.email[0]}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">
                  Code de vérification (6 chiffres)
                </label>
                <input
                  inputMode="numeric"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="input font-mono text-center text-2xl tracking-[0.5em]"
                />
                {errors.otp && <p className="text-xs text-red-600">{errors.otp[0]}</p>}
                <p className="text-xs text-slate-500 pt-1">
                  Vous n'avez pas reçu le code ?{' '}
                  <Link to="/forgot-password" className="text-emerald-700 hover:text-emerald-800">
                    Renvoyer
                  </Link>
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Nouveau mot de passe</label>
                <input
                  type={show ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input"
                />
                {newPassword && (
                  <div className="pt-2 space-y-2">
                    <div className="flex gap-1">
                      {[0,1,2,3,4].map((i) => (
                        <div key={i}
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
                {errors.new_password && <p className="text-xs text-red-600">{errors.new_password[0]}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Confirmer le mot de passe</label>
                <input
                  type={show ? 'text' : 'password'}
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="input"
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
                  className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium py-2.5"
                >
                  {submitting ? 'Réinitialisation…' : 'Réinitialiser le mot de passe'}
                </button>
                <Link to="/login" className="text-slate-600 hover:text-slate-900 px-4 py-2.5 text-sm">
                  Annuler
                </Link>
              </div>
            </>
          )}
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
