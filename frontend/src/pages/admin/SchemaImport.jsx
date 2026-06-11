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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Importer un fichier Excel</h1>
        <p className="text-sm text-slate-500 mt-1">
          Chargez le classeur « ETAT DES TAMBOURS » pour créer ou mettre à jour les convoyeurs,
          tambours et composants. Les fiches techniques déjà associées sont conservées.
        </p>
      </div>

      {/* Stepper */}
      <ol className="flex items-center gap-2 text-sm">
        <Step n={1} label="Fichier" active={step === 'upload'} done={step !== 'upload'} />
        <span className="text-slate-300">→</span>
        <Step n={2} label="Correspondance" active={step === 'mapping'} done={step === 'done'} />
        <span className="text-slate-300">→</span>
        <Step n={3} label="Terminé" active={step === 'done'} done={false} />
      </ol>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      )}

      {step === 'upload' && (
        <form onSubmit={onUpload} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Fichier .xlsx</label>
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
            />
            <p className="text-xs text-slate-400">Taille maximale : 20 Mo.</p>
          </div>
          <button
            type="submit"
            disabled={!file || busy}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg inline-flex items-center justify-center min-w-44"
          >
            {busy ? <Spinner variant="onColor" /> : 'Analyser le fichier'}
          </button>
        </form>
      )}

      {step === 'mapping' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium w-10"></th>
                  <th className="px-3 py-2 font-medium">Inst (Excel)</th>
                  <th className="px-3 py-2 font-medium">Tambours</th>
                  <th className="px-3 py-2 font-medium">Code convoyeur</th>
                  <th className="px-3 py-2 font-medium">Nom (facultatif)</th>
                  <th className="px-3 py-2 font-medium w-28">Famille</th>
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
                          <div className="text-xs text-amber-600 mt-0.5">aucune image</div>
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
                        {isDup && <div className="text-xs text-red-600 mt-0.5">code en double</div>}
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
          <datalist id="known-codes">
            {KNOWN_CODES.map((c) => <option key={c} value={c} />)}
          </datalist>

          <div className="flex items-center gap-3">
            <button
              onClick={onCommit}
              disabled={!canCommit || busy}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg inline-flex items-center justify-center min-w-52"
            >
              {busy ? <Spinner variant="onColor" /> : `Importer ${included.length} convoyeur(s)`}
            </button>
            <button onClick={reset} className="text-slate-600 hover:text-slate-900 px-4 py-2.5">
              Recommencer
            </button>
            {hasEmptyCode && (
              <span className="text-xs text-amber-600">Chaque convoyeur sélectionné doit avoir un code.</span>
            )}
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-3 py-2">
            {result?.message ?? 'Import terminé.'}
          </div>
          <ul className="text-sm text-slate-700 space-y-1">
            {result?.conveyors?.map((c) => (
              <li key={c.code} className="flex items-center gap-2">
                <span className="font-mono font-medium text-slate-800">{c.code}</span>
                <span className="text-slate-400">·</span>
                <span>{c.drums} tambour(s)</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3 pt-1">
            <button onClick={reset} className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-5 py-2.5 rounded-lg">
              Importer un autre fichier
            </button>
            <Link to="/app" className="text-slate-600 hover:text-slate-900 px-4 py-2.5">
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
        className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold ${
          active
            ? 'bg-emerald-600 text-white'
            : done
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-slate-100 text-slate-400'
        }`}
      >
        {n}
      </span>
      <span className={active ? 'font-medium text-slate-800' : 'text-slate-500'}>{label}</span>
    </li>
  )
}
