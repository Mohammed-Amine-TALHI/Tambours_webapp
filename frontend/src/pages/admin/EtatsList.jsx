import { useEffect, useState } from 'react'
import { createEtat, deleteEtat, getEtats, updateEtat } from '../../lib/schemaApi'
import ConfirmDialog from '../../components/ConfirmDialog'

/* Panneau d'administration du vocabulaire des états : liste, ajout,
   renommage et couleur de badge. Ces états alimentent les listes
   déroulantes de l'édition des tambours. */

const TONES = [
  { id: 'emerald', label: 'Bon', dot: 'bg-emerald-500', chip: 'border-emerald-200 bg-emerald-100 text-emerald-700' },
  { id: 'amber', label: 'À surveiller', dot: 'bg-amber-500', chip: 'border-amber-200 bg-amber-100 text-amber-700' },
  { id: 'rose', label: 'Critique', dot: 'bg-rose-500', chip: 'border-rose-200 bg-rose-100 text-rose-700' },
  { id: 'slate', label: 'Neutre', dot: 'bg-slate-400', chip: 'border-slate-200 bg-slate-100 text-slate-600' },
]

const toneChip = (tone) => TONES.find((t) => t.id === tone)?.chip ?? TONES[3].chip

export default function EtatsList() {
  const [etats, setEtats] = useState(null)
  const [error, setError] = useState(null)
  const [newLabel, setNewLabel] = useState('')
  const [newTone, setNewTone] = useState('emerald')
  const [adding, setAdding] = useState(false)
  const [confirm, setConfirm] = useState(null) // etat à supprimer

  useEffect(() => {
    let active = true
    getEtats()
      .then((list) => active && setEtats(list))
      .catch(() => active && setError('Impossible de charger les états.'))
    return () => {
      active = false
    }
  }, [])

  async function onAdd(e) {
    e.preventDefault()
    const label = newLabel.trim()
    if (!label) return
    setAdding(true)
    setError(null)
    try {
      const etat = await createEtat({ label, tone: newTone })
      setEtats((xs) => [...xs, etat])
      setNewLabel('')
    } catch (err) {
      setError(err?.response?.data?.errors?.label?.[0] ?? err?.response?.data?.message ?? "Impossible d'ajouter cet état.")
    } finally {
      setAdding(false)
    }
  }

  async function onRename(etat, label) {
    const clean = label.trim()
    if (!clean || clean === etat.label) return
    try {
      const updated = await updateEtat(etat.id, { label: clean })
      setEtats((xs) => xs.map((x) => (x.id === etat.id ? updated : x)))
    } catch (err) {
      setError(err?.response?.data?.errors?.label?.[0] ?? 'Renommage impossible.')
    }
  }

  async function onTone(etat, tone) {
    try {
      const updated = await updateEtat(etat.id, { tone })
      setEtats((xs) => xs.map((x) => (x.id === etat.id ? updated : x)))
    } catch {
      setError('Changement de couleur impossible.')
    }
  }

  async function onDelete(etat) {
    try {
      await deleteEtat(etat.id)
      setEtats((xs) => xs.filter((x) => x.id !== etat.id))
    } catch {
      setError('Suppression impossible.')
    } finally {
      setConfirm(null)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          États
          {etats && (
            <span className="ml-2 align-middle rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-sm font-medium text-slate-500">
              {etats.length}
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Personnalisez les statuts proposés dans les fiches tambours (libellé et couleur).
          Les états ne sont visibles que par les administrateurs.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {/* ajout */}
      <form onSubmit={onAdd} className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Nouvel état — ex : Disponible (Magasin)"
          className="input max-w-xs"
        />
        <ToneSwatches value={newTone} onChange={setNewTone} />
        <button
          type="submit"
          disabled={adding || !newLabel.trim()}
          className="rounded-xl bg-gradient-to-r from-emerald-700 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-emerald-800 hover:to-teal-700 disabled:opacity-50"
        >
          {adding ? 'Ajout…' : '+ Ajouter'}
        </button>
      </form>

      {/* liste */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {!etats ? (
          <p className="px-4 py-10 text-center text-sm text-slate-400">Chargement…</p>
        ) : etats.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-400">
            Aucun état défini — ajoutez-en un ci-dessus.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {etats.map((etat) => (
              <EtatRow
                key={etat.id}
                etat={etat}
                onRename={onRename}
                onTone={onTone}
                onAskDelete={() => setConfirm(etat)}
              />
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={!!confirm}
        danger
        title="Supprimer cet état ?"
        message={confirm ? `« ${confirm.label} » sera retiré de la liste. Les tambours qui l'utilisent gardent leur valeur actuelle.` : ''}
        confirmLabel="Supprimer"
        onConfirm={() => onDelete(confirm)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}

function EtatRow({ etat, onRename, onTone, onAskDelete }) {
  const [label, setLabel] = useState(etat.label)

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-2.5">
      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneChip(etat.tone)}`}>
        {etat.label}
      </span>
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={() => onRename(etat, label)}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        aria-label={`Renommer ${etat.label}`}
        className="input max-w-60 text-sm"
      />
      <div className="ml-auto flex items-center gap-3">
        <ToneSwatches value={etat.tone} onChange={(tone) => onTone(etat, tone)} />
        <button
          onClick={onAskDelete}
          aria-label={`Supprimer ${etat.label}`}
          className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
        >
          Supprimer
        </button>
      </div>
    </li>
  )
}

function ToneSwatches({ value, onChange }) {
  return (
    <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Couleur du badge">
      {TONES.map((t) => (
        <button
          key={t.id}
          type="button"
          role="radio"
          aria-checked={value === t.id}
          title={t.label}
          onClick={() => onChange(t.id)}
          className={`h-6 w-6 rounded-full transition ${t.dot} ${
            value === t.id ? 'ring-2 ring-slate-700 ring-offset-2' : 'opacity-50 hover:opacity-90'
          }`}
        />
      ))}
    </div>
  )
}
