import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api, { ensureCsrf } from '../../lib/api'
import TempPasswordModal from '../../components/TempPasswordModal'
import { SectionTitle } from '../../components/fiche'

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
    ? `${form.email_local}@${selectedDomain.domain}` : null

  return (
    <div className="space-y-5">
      <div>
        <Link to="/admin/users" className="text-sm text-slate-500 hover:text-emerald-700">← Utilisateurs</Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Nouvel utilisateur</h1>
        <p className="mt-1 text-sm text-slate-500">
          Le compte est créé avec un mot de passe temporaire à remettre à l'utilisateur.
        </p>
      </div>

      {generalError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {generalError}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        {/* Identité */}
        <section>
          <SectionTitle no="01">Identité</SectionTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Prénom" error={errors.first_name}>
              <input required value={form.first_name} onChange={(e) => update('first_name', e.target.value)} placeholder="Gabriel" className="input" />
            </Field>
            <Field label="Nom" error={errors.last_name}>
              <input required value={form.last_name} onChange={(e) => update('last_name', e.target.value)} placeholder="Thomas" className="input" />
            </Field>
          </div>
        </section>

        {/* Compte */}
        <section className="space-y-4">
          <SectionTitle no="02">Compte & accès</SectionTitle>

          <Field label="Nom d'utilisateur" error={errors.username} hint="Lettres, chiffres, points, tirets — ex : gabriel.thomas">
            <input
              required
              value={form.username}
              onChange={(e) => update('username', e.target.value.toLowerCase())}
              placeholder="gabriel.thomas"
              className="input font-mono"
            />
          </Field>

          <Field label="Email" error={errors.email_local}>
            <div className="grid w-full grid-cols-[1fr_auto_10rem]">
              <input
                required
                value={form.email_local}
                onChange={(e) => update('email_local', e.target.value)}
                placeholder="gabriel.thomas"
                className="input min-w-0 rounded-r-none"
              />
              <span className="flex items-center border-y border-slate-300 bg-slate-100 px-3 text-sm text-slate-500">@</span>
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
            {emailPreview && (
              <p className="pt-1 text-xs text-slate-500">
                Adresse complète : <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-700">{emailPreview}</span>
              </p>
            )}

            {/* Inline new-domain form */}
            {addingDomain && (
              <div className="mt-3 space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                <p className="text-xs font-medium text-emerald-800">Ajouter un nouveau domaine email</p>
                {newDomainErr && (
                  <p className="text-xs text-red-600">{newDomainErr}</p>
                )}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
                  <input
                    autoFocus
                    required
                    value={newDomain.domain}
                    onChange={(e) => setNewDomain((d) => ({ ...d, domain: e.target.value }))}
                    placeholder="exemple.com"
                    className="input font-mono text-sm sm:col-span-3"
                    pattern="^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
                    title="Format attendu : exemple.com"
                  />
                  <input
                    value={newDomain.label}
                    onChange={(e) => setNewDomain((d) => ({ ...d, label: e.target.value }))}
                    placeholder="Libellé (facultatif)"
                    className="input text-sm sm:col-span-2"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={saveDomain}
                    disabled={savingDomain || !newDomain.domain.trim()}
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {savingDomain ? 'Ajout…' : 'Ajouter'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAddingDomain(false); setNewDomain({ domain: '', label: '' }); setNewDomainErr(null) }}
                    className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </Field>

          <Field label="Rôle" error={errors.role}>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                { value: 'operateur', title: 'Opérateur', desc: 'Consulte le schéma, les tambours et les fiches.' },
                { value: 'admin', title: 'Administrateur', desc: 'Gère les données, les imports et les comptes.' },
              ].map((r) => (
                <label
                  key={r.value}
                  className={`cursor-pointer rounded-xl border px-3.5 py-3 transition ${
                    form.role === r.value
                      ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/15'
                      : 'border-slate-300 hover:border-emerald-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio" name="role" value={r.value}
                    checked={form.role === r.value}
                    onChange={(e) => update('role', e.target.value)}
                    className="sr-only"
                  />
                  <span className={`block text-sm font-semibold ${form.role === r.value ? 'text-emerald-800' : 'text-slate-700'}`}>
                    {r.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">{r.desc}</span>
                </label>
              ))}
            </div>
          </Field>
        </section>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Un mot de passe temporaire sera généré automatiquement et affiché <strong>une seule fois</strong> —
          vous pourrez l'imprimer pour le remettre à l'utilisateur.
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-gradient-to-r from-emerald-700 to-teal-600 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:from-emerald-800 hover:to-teal-700 disabled:opacity-50"
          >
            {submitting ? 'Création…' : 'Créer l\'utilisateur'}
          </button>
          <Link to="/admin/users" className="px-4 py-2.5 text-slate-600 hover:text-slate-900">
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
