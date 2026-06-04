import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api, { ensureCsrf } from '../../lib/api'
import TempPasswordModal from '../../components/TempPasswordModal'

export default function UserNew() {
  const navigate = useNavigate()

  const [domains, setDomains] = useState([])
  const [form, setForm] = useState({
    first_name: '', last_name: '', username: '',
    email_local: '', email_domain_id: '', role: 'operateur',
  })
  const [errors, setErrors] = useState({})
  const [generalError, setGeneralError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [modal, setModal] = useState({ open: false, user: null, password: '' })

  // Inline "new domain" state
  const [addingDomain, setAddingDomain] = useState(false)
  const [newDomain, setNewDomain] = useState({ domain: '', label: '' })
  const [newDomainErr, setNewDomainErr] = useState(null)
  const [savingDomain, setSavingDomain] = useState(false)

  async function loadDomains() {
    const { data } = await api.get('/api/email-domains')
    setDomains(data.domains)
    // Default to OCP if not already chosen; never override an existing selection
    setForm((f) => {
      if (f.email_domain_id) return f
      const ocp = data.domains.find((d) => d.domain === 'ocpgroup.ma')
      const fallback = ocp ?? data.domains[0]
      return fallback ? { ...f, email_domain_id: fallback.id } : f
    })
  }

  useEffect(() => { loadDomains() /* eslint-disable-line */ }, [])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  // Domain dropdown change — "__new__" triggers inline form
  function onDomainChange(value) {
    if (value === '__new__') {
      setAddingDomain(true)
      return
    }
    update('email_domain_id', value)
  }

  async function saveDomain(e) {
    e.preventDefault()
    setNewDomainErr(null)
    setSavingDomain(true)
    try {
      await ensureCsrf()
      await api.post('/api/admin/email-domains', {
        domain: newDomain.domain.trim().toLowerCase(),
        label:  newDomain.label.trim() || null,
      })
      // Refresh list — keep current selection (don't switch to the new one)
      await loadDomains()
      setAddingDomain(false)
      setNewDomain({ domain: '', label: '' })
    } catch (err) {
      setNewDomainErr(
        err?.response?.data?.errors?.domain?.[0] ??
        err?.response?.data?.message ??
        'Impossible d\'ajouter ce domaine.'
      )
    } finally {
      setSavingDomain(false)
    }
  }

  async function onSubmit(e) {
    e.preventDefault()
    setGeneralError(null)
    setErrors({})
    setSubmitting(true)
    try {
      await ensureCsrf()
      const { data } = await api.post('/api/admin/users', form)
      setModal({ open: true, user: data.user, password: data.temp_password })
    } catch (err) {
      if (err?.response?.data?.errors) setErrors(err.response.data.errors)
      setGeneralError(err?.response?.data?.message ?? 'Création impossible.')
    } finally {
      setSubmitting(false)
    }
  }

  function onModalClose() {
    setModal({ open: false, user: null, password: '' })
    navigate('/admin/users')
  }

  const selectedDomain = domains.find((d) => d.id === Number(form.email_domain_id))
  const emailPreview = form.email_local && selectedDomain
    ? `${form.email_local}@${selectedDomain.domain}` : '—'

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/users" className="text-sm text-slate-500 hover:text-slate-700">← Retour</Link>
        <h1 className="text-2xl font-semibold text-slate-800 mt-1">Nouvel utilisateur</h1>
      </div>

      {generalError && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
          {generalError}
        </div>
      )}

      <form onSubmit={onSubmit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Prénom" error={errors.first_name}>
            <input required value={form.first_name} onChange={(e) => update('first_name', e.target.value)} className="input" />
          </Field>
          <Field label="Nom" error={errors.last_name}>
            <input required value={form.last_name} onChange={(e) => update('last_name', e.target.value)} className="input" />
          </Field>
        </div>

        <Field label="Nom d'utilisateur" error={errors.username} hint="Lettres, chiffres, points, tirets — ex: gabriel.thomas">
          <input
            required
            value={form.username}
            onChange={(e) => update('username', e.target.value.toLowerCase())}
            placeholder="gabriel.thomas"
            className="input font-mono"
          />
        </Field>

        <Field label="Email" error={errors.email_local}>
          <div className="grid grid-cols-[1fr_auto_10rem] w-full">
            <input
              required
              value={form.email_local}
              onChange={(e) => update('email_local', e.target.value)}
              placeholder="gabriel.thomas"
              className="input rounded-r-none min-w-0"
            />
            <span className="px-3 flex items-center bg-slate-100 border-y border-slate-300 text-slate-500 text-sm">@</span>
            <select
              required
              value={form.email_domain_id}
              onChange={(e) => onDomainChange(e.target.value)}
              className="input rounded-l-none bg-white"
            >
              {domains.map((d) => (
                <option key={d.id} value={d.id}>{d.domain}</option>
              ))}
              <option value="__new__">+ Nouveau…</option>
            </select>
          </div>
          <p className="text-xs text-slate-500 pt-1">
            Aperçu : <span className="font-mono">{emailPreview}</span>
          </p>

          {/* Inline new-domain form */}
          {addingDomain && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 space-y-2">
              <p className="text-xs font-medium text-emerald-800">Ajouter un nouveau domaine email</p>
              {newDomainErr && (
                <p className="text-xs text-red-600">{newDomainErr}</p>
              )}
              <div className="grid grid-cols-5 gap-2">
                <input
                  autoFocus
                  required
                  value={newDomain.domain}
                  onChange={(e) => setNewDomain((d) => ({ ...d, domain: e.target.value }))}
                  placeholder="exemple.com"
                  className="input col-span-3 font-mono text-sm"
                  pattern="^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
                  title="Format attendu : exemple.com"
                />
                <input
                  value={newDomain.label}
                  onChange={(e) => setNewDomain((d) => ({ ...d, label: e.target.value }))}
                  placeholder="Libellé (facultatif)"
                  className="input col-span-2 text-sm"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={saveDomain}
                  disabled={savingDomain || !newDomain.domain.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm px-3 py-1.5 rounded-md"
                >
                  {savingDomain ? 'Ajout…' : 'Ajouter'}
                </button>
                <button
                  type="button"
                  onClick={() => { setAddingDomain(false); setNewDomain({ domain: '', label: '' }); setNewDomainErr(null) }}
                  className="text-slate-600 hover:bg-slate-100 text-sm px-3 py-1.5 rounded-md"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </Field>

        <Field label="Rôle" error={errors.role}>
          <div className="flex gap-2">
            {['operateur', 'admin'].map((r) => (
              <label
                key={r}
                className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-sm text-center transition ${
                  form.role === r
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                    : 'border-slate-300 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio" name="role" value={r}
                  checked={form.role === r}
                  onChange={(e) => update('role', e.target.value)}
                  className="sr-only"
                />
                {r === 'admin' ? 'Administrateur' : 'Opérateur'}
              </label>
            ))}
          </div>
        </Field>

        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
          Un mot de passe temporaire sera généré automatiquement et affiché <strong>une seule fois</strong>.
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg"
          >
            {submitting ? 'Création…' : 'Créer l\'utilisateur'}
          </button>
          <Link to="/admin/users" className="text-slate-600 hover:text-slate-900 px-4 py-2.5">
            Annuler
          </Link>
        </div>
      </form>

      <TempPasswordModal
        open={modal.open}
        user={modal.user}
        password={modal.password}
        onClose={onModalClose}
      />
    </div>
  )
}

function Field({ label, error, hint, children }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      {error && <p className="text-xs text-red-600">{Array.isArray(error) ? error[0] : error}</p>}
    </div>
  )
}
