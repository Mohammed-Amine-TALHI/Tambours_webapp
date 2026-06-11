import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { ensureCsrf } from '../../lib/api'
import Spinner from '../../components/Spinner'

// Target conveyor codes (operator-facing names). Used for autocomplete suggestions.
const KNOWN_CODES = [
  // B-series
  'B0', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B9', 'B10', 'B11', 'B12',
  // T-series (with sub-variants)
  'T1', 'T2', 'T3', 'T3a', 'T3b', 'T4', 'T5', 'T6', 'T7', 'T8', 'T8bis',
  'T9', 'T10', 'T11', 'T12', 'T13', 'T14', 'T14a', 'T14b', 'T15', 'T16', 'T17',
  // Autres installations
  'RP', 'STACKER',
]

function familyOf(code) {
  const m = /^([A-Za-z]+)/.exec(code.trim())
  return m ? m[1].toUpperCase() : ''
}

export default function SchemaImport() {
  const fileInput = useRef(null)
  const [step, setStep] = useState('upload') // upload | mapping | done
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  const [token, setToken] = useState(null)
  const [rows, setRows] = useState([]) // { inst_label, drum_count, numeros, has_image, include, code, name, family }
  const [result, setResult] = useState(null)

  async function onUpload(e) {
    e.preventDefault()
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      await ensureCsrf()
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await api.post('/api/admin/import/preview', fd)
      setToken(data.token)
      setRows(
        data.groups.map((g) => ({
          inst_label: g.inst_label,
          drum_count: g.drum_count,
          numeros: g.numeros,
          has_image: g.has_image,
          include: true,
          code: g.guess_code || '',
          name: '',
          family: familyOf(g.guess_code || ''),
        }))
      )
      setStep('mapping')
    } catch (err) {
      setError(
        err?.response?.data?.errors?.file?.[0] ??
        err?.response?.data?.message ??
        "Impossible de lire ce fichier. Format attendu : .xlsx"
      )
    } finally {
      setBusy(false)
    }
  }

  function updateRow(i, patch) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  const included = rows.filter((r) => r.include)
  const allIncluded = rows.length > 0 && included.length === rows.length
  const codes = included.map((r) => r.code.trim().toUpperCase())
  const hasEmptyCode = included.some((r) => r.code.trim() === '')
  const dupCodes = codes.filter((c, i) => c !== '' && codes.indexOf(c) !== i)
  const canCommit = included.length > 0 && !hasEmptyCode && dupCodes.length === 0

  async function onCommit() {
    if (!canCommit) return
    setError(null)
    setBusy(true)
    try {
      await ensureCsrf()
      const mappings = included.map((r) => ({
        inst_label: r.inst_label,
        code: r.code.trim().toUpperCase(),
        name: r.name.trim() || null,
        family: r.family.trim() || null,
      }))
      const { data } = await api.post('/api/admin/import/commit', { token, mappings })
      setResult(data)
      setStep('done')
    } catch (err) {
      setError(
        err?.response?.data?.errors
          ? Object.values(err.response.data.errors).flat().join(' ')
          : err?.response?.data?.message ?? "L'import a échoué."
      )
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setStep('upload')
    setFile(null)
    setToken(null)
    setRows([])
    setResult(null)
    setError(null)
    if (fileInput.current) fileInput.current.value = ''
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Importer un fichier Excel</h1>
        <p className="mt-1 text-sm text-slate-500">
          Chargez le classeur « ETAT DES TAMBOURS » pour créer ou mettre à jour les convoyeurs,
          tambours et composants. Les fiches techniques déjà associées sont conservées.
        </p>
      </div>

      {/* Stepper */}
      <ol className="flex items-center gap-2 text-sm">
        <Step n={1} label="Fichier" active={step === 'upload'} done={step !== 'upload'} />
        <Connector done={step !== 'upload'} />
        <Step n={2} label="Correspondance" active={step === 'mapping'} done={step === 'done'} />
        <Connector done={step === 'done'} />
        <Step n={3} label="Terminé" active={step === 'done'} done={false} />
      </ol>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {step === 'upload' && (
        <form onSubmit={onUpload} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          {/* Zone de dépôt : clic ou glisser-déposer */}
          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              const f = e.dataTransfer.files?.[0]
              if (f) setFile(f)
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
              dragOver
                ? 'border-emerald-500 bg-emerald-50'
                : file
                  ? 'border-emerald-300 bg-emerald-50/40'
                  : 'border-slate-300 bg-slate-50/60 hover:border-emerald-300 hover:bg-emerald-50/30'
            }`}
          >
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <svg className="h-9 w-9 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <path d="m7 9 5-5 5 5" />
              <path d="M12 4v12" />
            </svg>
            {file ? (
              <>
                <span className="text-sm font-semibold text-emerald-800">{file.name}</span>
                <span className="text-xs text-slate-500">
                  {Math.round(file.size / 1024)} Ko — cliquez pour changer de fichier
                </span>
              </>
            ) : (
              <>
                <span className="text-sm font-semibold text-slate-700">
                  Glissez le fichier ici, ou cliquez pour parcourir
                </span>
                <span className="text-xs text-slate-400">Format .xlsx ou .xls · 20 Mo maximum</span>
              </>
            )}
          </label>

          <button
            type="submit"
            disabled={!file || busy}
            className="inline-flex min-w-44 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-700 to-teal-600 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:from-emerald-800 hover:to-teal-700 disabled:opacity-50"
          >
            {busy ? <Spinner variant="onColor" /> : 'Analyser le fichier'}
          </button>
        </form>
      )}

      {step === 'mapping' && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="w-10 px-3 py-2 font-medium">
                      <input
                        type="checkbox"
                        checked={allIncluded}
                        onChange={(e) => setRows((rs) => rs.map((r) => ({ ...r, include: e.target.checked })))}
                        title="Tout sélectionner / désélectionner"
                        className="accent-emerald-600"
                      />
                    </th>
                    <th className="px-3 py-2 font-medium">Inst (Excel)</th>
                    <th className="px-3 py-2 font-medium">Tambours</th>
                    <th className="px-3 py-2 font-medium">Code convoyeur</th>
                    <th className="px-3 py-2 font-medium">Nom (facultatif)</th>
                    <th className="w-28 px-3 py-2 font-medium">Famille</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r, i) => {
                    const codeUp = r.code.trim().toUpperCase()
                    const isDup = codeUp !== '' && dupCodes.includes(codeUp)
                    return (
                      <tr key={i} className={r.include ? '' : 'opacity-40'}>
                        <td className="px-3 py-2 align-top">
                          <input
                            type="checkbox"
                            checked={r.include}
                            onChange={(e) => updateRow(i, { include: e.target.checked })}
                            className="mt-1.5 accent-emerald-600"
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="font-medium text-slate-800">{r.inst_label}</div>
                          {!r.has_image && (
                            <div className="mt-0.5 text-xs text-amber-600">aucune image</div>
                          )}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="text-slate-700">{r.drum_count}</div>
                          <div className="text-xs text-slate-400">N° {r.numeros.join(', ')}</div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <input
                            list="known-codes"
                            disabled={!r.include}
                            value={r.code}
                            onChange={(e) => {
                              const code = e.target.value.toUpperCase()
                              updateRow(i, { code, family: familyOf(code) })
                            }}
                            placeholder="ex : T15"
                            className={`input font-mono uppercase ${isDup ? 'border-red-400 bg-red-50' : ''}`}
                          />
                          {isDup && <div className="mt-0.5 text-xs text-red-600">code en double</div>}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <input
                            disabled={!r.include}
                            value={r.name}
                            onChange={(e) => updateRow(i, { name: e.target.value })}
                            placeholder={r.inst_label}
                            className="input"
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <input
                            disabled={!r.include}
                            value={r.family}
                            onChange={(e) => updateRow(i, { family: e.target.value.toUpperCase() })}
                            className="input font-mono uppercase"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <datalist id="known-codes">
            {KNOWN_CODES.map((c) => <option key={c} value={c} />)}
          </datalist>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onCommit}
              disabled={!canCommit || busy}
              className="inline-flex min-w-52 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-700 to-teal-600 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:from-emerald-800 hover:to-teal-700 disabled:opacity-50"
            >
              {busy ? <Spinner variant="onColor" /> : `Importer ${included.length} convoyeur(s)`}
            </button>
            <button onClick={reset} className="px-4 py-2.5 text-slate-600 hover:text-slate-900">
              Recommencer
            </button>
            {hasEmptyCode && (
              <span className="text-xs text-amber-600">Chaque convoyeur sélectionné doit avoir un code.</span>
            )}
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            ✓ {result?.message ?? 'Import terminé.'}
          </div>
          <ul className="space-y-1 text-sm text-slate-700">
            {result?.conveyors?.map((c) => (
              <li key={c.code} className="flex items-center gap-2">
                <span className="font-mono font-medium text-slate-800">{c.code}</span>
                <span className="text-slate-400">·</span>
                <span>{c.drums} tambour(s)</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3 pt-1">
            <button onClick={reset} className="rounded-xl bg-gradient-to-r from-emerald-700 to-teal-600 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:from-emerald-800 hover:to-teal-700">
              Importer un autre fichier
            </button>
            <Link to="/app" className="px-4 py-2.5 text-slate-600 hover:text-slate-900">
              Voir le schéma
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function Step({ n, label, active, done }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
          active
            ? 'bg-emerald-600 text-white'
            : done
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-slate-100 text-slate-400'
        }`}
      >
        {done ? '✓' : n}
      </span>
      <span className={active ? 'font-medium text-slate-800' : 'text-slate-500'}>{label}</span>
    </li>
  )
}

function Connector({ done }) {
  return <span aria-hidden className={`h-px w-6 sm:w-10 ${done ? 'bg-emerald-300' : 'bg-slate-200'}`} />
}
