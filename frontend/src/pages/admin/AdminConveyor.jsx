import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  getConveyorAdmin, updateConveyor, updateDrum,
  uploadDatasheet, deleteDatasheet, KIND_LABEL,
} from '../../lib/schemaApi'
import Spinner from '../../components/Spinner'
import { SectionTitle } from '../../components/fiche'

const S = 1000
const DEFAULT_R = 0.03
const clampN = (n) => Math.min(1, Math.max(0, n))
const round3 = (n) => Math.round(n * 1000) / 1000

export default function AdminConveyor() {
  const { id } = useParams()
  const [conveyor, setConveyor] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getConveyorAdmin(id).then(setConveyor).catch(() => setError('Convoyeur introuvable.'))
  }, [id])

  if (error) return <p className="text-sm text-rose-600">{error}</p>
  if (!conveyor) return <div className="flex items-center gap-3 text-slate-500 text-sm py-16 justify-center"><Spinner /> Chargement…</div>

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/admin/design" className="text-sm text-slate-500 hover:text-emerald-700">← Design du schéma</Link>
          <div className="mt-1 flex items-center gap-3">
            <span className="flex h-10 min-w-10 items-center justify-center rounded-xl bg-emerald-600 px-2.5 font-mono text-base font-black text-white">
              {conveyor.code}
            </span>
            <h1 className="text-2xl font-bold text-slate-900">
              {conveyor.name || conveyor.code}
              <span className="ml-2 text-lg font-normal text-slate-400">· {conveyor.drums.length} tambour(s)</span>
            </h1>
          </div>
        </div>
        <Link
          to={`/app/conveyors/${conveyor.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
        >
          Voir côté opérateur →
        </Link>
      </div>

      <InfoEditor conveyor={conveyor} onSaved={(c) => setConveyor((cur) => ({ ...cur, ...c }))} />

      <DrumMarkerDesigner key={conveyor.id} conveyor={conveyor} />

      <div className="space-y-4">
        <SectionTitle no="03">Tambours, composants & fiches techniques</SectionTitle>
        {conveyor.drums.map((d) => (
          <DrumEditor key={d.id} drum={d} />
        ))}
        {conveyor.drums.length === 0 && <p className="text-sm text-slate-400">Aucun tambour.</p>}
      </div>
    </div>
  )
}

/* ---------------- info validation ---------------- */
function InfoEditor({ conveyor, onSaved }) {
  const [name, setName] = useState(conveyor.name ?? '')
  const [family, setFamily] = useState(conveyor.family ?? '')
  const [chars, setChars] = useState(
    Object.entries(conveyor.characteristics ?? {}).map(([key, value]) => ({ key, value: String(value) }))
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState(null)

  function setChar(i, patch) { setChars((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c))) }

  async function save() {
    setSaving(true); setErr(null); setSaved(false)
    try {
      const characteristics = {}
      for (const { key, value } of chars) {
        const k = key.trim()
        if (k) characteristics[k] = value
      }
      const c = await updateConveyor(conveyor.id, { name: name.trim() || null, family: family.trim() || null, characteristics })
      onSaved(c)
      setSaved(true)
    } catch {
      setErr("L'enregistrement a échoué.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <SectionTitle no="01">Informations du convoyeur</SectionTitle>
        {saved && <span className="mb-3 shrink-0 text-xs text-emerald-600">Validé ✓</span>}
      </div>
      {err && <p className="text-xs text-red-600">{err}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="block text-sm font-medium text-slate-700">Nom</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder={conveyor.inst_label || 'ex : Convoyeur principal'} />
        </label>
        <label className="space-y-1">
          <span className="block text-sm font-medium text-slate-700">Famille</span>
          <input value={family} onChange={(e) => setFamily(e.target.value.toUpperCase())} className="input font-mono uppercase" placeholder="ex : T" />
        </label>
      </div>

      <div className="space-y-2">
        <span className="block text-sm font-medium text-slate-700">Caractéristiques</span>
        {chars.length === 0 && (
          <p className="text-xs text-slate-400">
            Aucune caractéristique — ajoutez par exemple « Débit », « Vitesse », « Longueur »…
          </p>
        )}
        {chars.map((c, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <input value={c.key} onChange={(e) => setChar(i, { key: e.target.value })} placeholder="Libellé (ex : Débit)" className="input text-sm" />
            <input value={c.value} onChange={(e) => setChar(i, { value: e.target.value })} placeholder="Valeur (ex : 1000 t/h)" className="input text-sm" />
            <button onClick={() => setChars((cs) => cs.filter((_, idx) => idx !== i))} className="px-2 text-slate-400 hover:text-red-600" title="Supprimer">✕</button>
          </div>
        ))}
        <button
          onClick={() => setChars((cs) => [...cs, { key: '', value: '' }])}
          className="w-full rounded-lg border border-dashed border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
        >
          + Ajouter une caractéristique
        </button>
      </div>

      <button onClick={save} disabled={saving}
        className="inline-flex min-w-40 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-700 to-teal-600 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:from-emerald-800 hover:to-teal-700 disabled:opacity-50">
        {saving ? <Spinner variant="onColor" /> : 'Valider les infos'}
      </button>
    </div>
  )
}

/* ---------------- drum + components ---------------- */
function DrumEditor({ drum }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    diametre: drum.diametre ?? '', longueur: drum.longueur ?? '', etat: drum.etat ?? '',
    liaison_dynano: drum.liaison_dynano ?? '', liaison_anano: drum.liaison_anano ?? '', liaison_etat: drum.liaison_etat ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function upd(k, v) { setForm((f) => ({ ...f, [k]: v })); setSaved(false) }

  async function save() {
    setSaving(true)
    try {
      await updateDrum(drum.id, Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() || null])))
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-slate-50">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-sm font-semibold text-white">{drum.numero}</span>
        <span className="flex-1 text-sm font-medium text-slate-800">
          Tambour {drum.numero}
          {drum.diametre && <span className="font-normal text-slate-400"> · Ø{drum.diametre}</span>}
        </span>
        <span className={`text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden>▸</span>
      </button>

      {open && (
        <div className="space-y-5 border-t border-slate-100 px-5 pb-5">
          {/* drum fields */}
          <div className="grid grid-cols-2 gap-3 pt-4 md:grid-cols-3">
            <Field label="Diamètre"><input value={form.diametre} onChange={(e) => upd('diametre', e.target.value)} placeholder="ex : 1000" className="input text-sm" /></Field>
            <Field label="Longueur"><input value={form.longueur} onChange={(e) => upd('longueur', e.target.value)} placeholder="ex : 1800" className="input text-sm" /></Field>
            <Field label="État"><input value={form.etat} onChange={(e) => upd('etat', e.target.value)} placeholder="ex : bon" className="input text-sm" /></Field>
            <Field label="Dynano bloc"><input value={form.liaison_dynano} onChange={(e) => upd('liaison_dynano', e.target.value)} placeholder="ex : 200/260" className="input text-sm" /></Field>
            <Field label="Anano bloc"><input value={form.liaison_anano} onChange={(e) => upd('liaison_anano', e.target.value)} className="input text-sm" /></Field>
            <Field label="État liaison"><input value={form.liaison_etat} onChange={(e) => upd('liaison_etat', e.target.value)} placeholder="ex : disp (Mag)" className="input text-sm" /></Field>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={save} disabled={saving}
              className="inline-flex min-w-28 items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
              {saving ? <Spinner variant="onColor" /> : 'Enregistrer'}
            </button>
            {saved && <span className="text-xs text-emerald-600">Enregistré ✓</span>}
          </div>

          {/* components datasheets */}
          {drum.components.map((cmp) => (
            <DatasheetSection
              key={cmp.id}
              title={`${KIND_LABEL[cmp.kind] ?? cmp.kind}${cmp.type_label ? ` — ${cmp.type_label}` : ''}`}
              initial={cmp.datasheets}
              target={{ componentId: cmp.id }}
            />
          ))}
          {/* drum-level datasheets */}
          <DatasheetSection title="Fiches du tambour (général)" initial={drum.datasheets} target={{ drumId: drum.id }} />
        </div>
      )}
    </div>
  )
}

/* ---------------- datasheet upload + list ---------------- */
function DatasheetSection({ title, initial, target }) {
  const [items, setItems] = useState(initial ?? [])
  const [file, setFile] = useState(null)
  const [docTitle, setDocTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function onUpload() {
    if (!file) return
    setBusy(true); setErr(null)
    try {
      const ds = await uploadDatasheet({ file, title: docTitle.trim() || undefined, ...target })
      setItems((xs) => [...xs, ds])
      setFile(null); setDocTitle('')
    } catch (e) {
      setErr(e?.response?.data?.errors?.file?.[0] ?? e?.response?.data?.message ?? "Échec de l'envoi.")
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(dsId) {
    await deleteDatasheet(dsId)
    setItems((xs) => xs.filter((x) => x.id !== dsId))
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{title}</h4>

      {items.length > 0 ? (
        <ul className="space-y-1.5">
          {items.map((ds) => (
            <li key={ds.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <span className="text-emerald-600" aria-hidden>⬇</span>
              <a href={ds.download_url} className="flex-1 truncate text-slate-700 hover:underline">{ds.title}</a>
              {ds.size && <span className="text-xs text-slate-400">{Math.round(ds.size / 1024)} Ko</span>}
              <button onClick={() => onDelete(ds.id)} className="text-xs text-slate-400 hover:text-red-600" title="Supprimer">✕</button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-400">Aucune fiche.</p>
      )}

      {err && <p className="text-xs text-red-600">{err}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-xs text-slate-600 file:mr-2 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-emerald-700 hover:file:bg-emerald-100" />
        <input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="Titre (Obligatoire)" className="input max-w-48 text-sm" />
        <button onClick={onUpload} disabled={!file || busy}
          className="inline-flex min-w-24 items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50">
          {busy ? <Spinner variant="onColor" /> : 'Envoyer'}
        </button>
      </div>
    </div>
  )
}

/* ---------------- drum marker design (place circles on the conveyor image) ---------------- */
function DrumMarkerDesigner({ conveyor }) {
  const drums = conveyor.drums ?? []
  const canvasRef = useRef(null)
  const dragRef = useRef(null) // { drumId, index, mode: 'move' | 'resize' }

  // markers: { [drumId]: [{x,y,r}, ...] }  — a drum may carry several markers
  // (some pulleys share the same N°), hence the "Dupliquer" action below.
  const [markers, setMarkers] = useState(() => {
    const m = {}
    for (const d of drums) m[d.id] = d.circles ?? (d.circle ? [d.circle] : [])
    return m
  })
  const [selDrumId, setSelDrumId] = useState(drums[0]?.id ?? null)
  const [selIndex, setSelIndex] = useState(-1) // selected marker within selDrumId, -1 = none
  const [dirty, setDirty] = useState(() => new Set())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState(null)
  // image aspect ratio (w/h) so the overlay scales uniformly → markers stay round
  const [aspect, setAspect] = useState(
    conveyor.image_width && conveyor.image_height ? conveyor.image_width / conveyor.image_height : null
  )

  const placedCount = drums.filter((d) => (markers[d.id] ?? []).length > 0).length
  const markerCount = drums.reduce((n, d) => n + (markers[d.id]?.length ?? 0), 0)
  const selDrum = drums.find((d) => d.id === selDrumId)
  const hasSelMarker = selDrumId != null && selIndex >= 0 && !!markers[selDrumId]?.[selIndex]

  function markDirty(drumId) {
    setDirty((s) => new Set(s).add(drumId))
    setSaved(false)
  }
  function setDrumMarkers(drumId, arr) {
    setMarkers((m) => ({ ...m, [drumId]: arr }))
    markDirty(drumId)
  }
  function updateMarker(drumId, index, patch) {
    setMarkers((m) => {
      const arr = (m[drumId] ?? []).slice()
      if (!arr[index]) return m
      arr[index] = { ...arr[index], ...patch }
      return { ...m, [drumId]: arr }
    })
    markDirty(drumId)
  }

  function pointFromEvent(e) {
    const r = canvasRef.current.getBoundingClientRect()
    return {
      x: clampN((e.clientX - r.left) / r.width),
      y: clampN((e.clientY - r.top) / r.height),
    }
  }

  // Click on empty image → ADD a new marker to the selected drum and grab it.
  function onCanvasDown(e) {
    if (!selDrumId) return
    const p = pointFromEvent(e)
    const arr = markers[selDrumId] ?? []
    const idx = arr.length
    setDrumMarkers(selDrumId, [...arr, { x: p.x, y: p.y, r: arr[arr.length - 1]?.r ?? DEFAULT_R }])
    setSelIndex(idx)
    dragRef.current = { drumId: selDrumId, index: idx, mode: 'move' }
  }
  function startMove(e, drumId, index) {
    e.stopPropagation()
    setSelDrumId(drumId)
    setSelIndex(index)
    dragRef.current = { drumId, index, mode: 'move' }
  }
  function startResize(e, drumId, index) {
    e.stopPropagation()
    setSelDrumId(drumId)
    setSelIndex(index)
    dragRef.current = { drumId, index, mode: 'resize' }
  }
  function onMove(e) {
    const d = dragRef.current
    if (!d) return
    const c = markers[d.drumId]?.[d.index]
    if (!c) return
    const p = pointFromEvent(e)
    if (d.mode === 'move') {
      updateMarker(d.drumId, d.index, { x: p.x, y: p.y })
    } else {
      // radius = fraction of image height; weight x by aspect so it's a true screen-circle
      const r = Math.min(0.5, Math.max(0.008, Math.hypot((p.x - c.x) * (aspect || 1), p.y - c.y)))
      updateMarker(d.drumId, d.index, { r })
    }
  }
  function endDrag() { dragRef.current = null }

  // Clone the selected marker (slightly offset) — for tambours that appear twice.
  function duplicateSelected() {
    if (!hasSelMarker) return
    const arr = markers[selDrumId] ?? []
    const src = arr[selIndex]
    const clone = { x: clampN(src.x + 0.03), y: clampN(src.y + 0.03), r: src.r }
    setDrumMarkers(selDrumId, [...arr, clone])
    setSelIndex(arr.length)
  }
  function removeSelected() {
    if (!hasSelMarker) return
    const arr = (markers[selDrumId] ?? []).slice()
    arr.splice(selIndex, 1)
    setDrumMarkers(selDrumId, arr)
    setSelIndex(arr.length ? Math.min(selIndex, arr.length - 1) : -1)
  }
  function selectDrum(id) {
    setSelDrumId(id)
    setSelIndex((markers[id]?.length ?? 0) - 1) // auto-select its last marker, if any
  }

  async function save() {
    setSaving(true); setErr(null)
    try {
      for (const id of dirty) {
        const arr = (markers[id] ?? []).map((c) => ({ x: round3(c.x), y: round3(c.y), r: round3(c.r) }))
        await updateDrum(id, { circles: arr.length ? arr : null })
      }
      setDirty(new Set())
      setSaved(true)
    } catch {
      setErr("L'enregistrement des repères a échoué.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <SectionTitle no="02">Repérage des tambours sur l'image</SectionTitle>
          <p className="-mt-1 text-xs text-slate-500">
            Sélectionnez un tambour, cliquez sur l'image pour ajouter un repère (plusieurs possibles), glissez pour ajuster.
            Pour un tambour qui apparaît deux fois, utilisez « Dupliquer ce repère ».
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-xs text-slate-500">{placedCount}/{drums.length} repéré(s) · {markerCount} repère(s)</span>
          {saved && !dirty.size && <span className="text-xs text-emerald-600">Enregistré ✓</span>}
          <button onClick={save} disabled={saving || !dirty.size}
            className="inline-flex min-w-28 items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            {saving ? <Spinner variant="onColor" /> : 'Enregistrer les repères'}
          </button>
        </div>
      </div>

      {err && <p className="text-xs text-red-600">{err}</p>}

      {!conveyor.image_url ? (
        <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
          Aucune image pour ce convoyeur.
        </div>
      ) : drums.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
          Aucun tambour à repérer.
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-9">
            <div
              ref={canvasRef}
              className={`relative inline-block w-full select-none ${selDrumId ? 'cursor-crosshair' : ''}`}
              onMouseDown={onCanvasDown}
              onMouseMove={onMove}
              onMouseUp={endDrag}
              onMouseLeave={endDrag}
            >
              <img src={conveyor.image_url} alt={`Schéma ${conveyor.code}`}
                onLoad={(e) => setAspect(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)}
                className="pointer-events-none h-auto w-full rounded-lg border border-slate-100 bg-white" draggable={false} />
              {aspect != null && (
                <svg viewBox={`0 0 ${S * aspect} ${S}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                  {drums.flatMap((d) => (markers[d.id] ?? []).map((c, i) => {
                    const sel = d.id === selDrumId && i === selIndex
                    const cx = c.x * S * aspect, cy = c.y * S, r = (c.r || DEFAULT_R) * S
                    return (
                      <g key={`${d.id}-${i}`}>
                        <circle cx={cx} cy={cy} r={r}
                          fill={sel ? 'rgba(5,150,105,0.35)' : 'rgba(5,150,105,0.15)'}
                          stroke={sel ? '#059669' : 'rgba(5,150,105,0.6)'}
                          strokeWidth={sel ? 6 : 4}
                          className="cursor-move" onMouseDown={(e) => startMove(e, d.id, i)} />
                        <text x={cx} y={cy} dominantBaseline="central" textAnchor="middle" fontSize="26" fontWeight="700"
                          fill="#065f46" stroke="#ffffff" strokeWidth={3} paintOrder="stroke"
                          style={{ pointerEvents: 'none' }}>{d.numero}</text>
                        {sel && (
                          <circle cx={cx + r} cy={cy} r={16} fill="#fff" stroke="#059669" strokeWidth={3}
                            className="cursor-ew-resize" onMouseDown={(e) => startResize(e, d.id, i)} />
                        )}
                      </g>
                    )
                  }))}
                </svg>
              )}
            </div>
          </div>

          <div className="col-span-12 space-y-2 lg:col-span-3">
            <div className="grid max-h-72 grid-cols-4 gap-2 overflow-y-auto pr-1 lg:grid-cols-2">
              {drums.map((d) => {
                const sel = d.id === selDrumId
                const count = (markers[d.id] ?? []).length
                return (
                  <button key={d.id} onClick={() => selectDrum(d.id)}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                      sel ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-300'
                    }`}>
                    <span className="font-medium">N°{d.numero}</span>
                    {count > 0 ? (
                      <span className={`min-w-[20px] rounded-full px-1.5 text-center text-[11px] font-semibold ${sel ? 'bg-white text-emerald-700' : 'bg-emerald-100 text-emerald-700'}`}>{count}</span>
                    ) : (
                      <span className={`h-2.5 w-2.5 rounded-full ${sel ? 'bg-emerald-200' : 'bg-slate-300'}`} />
                    )}
                  </button>
                )
              })}
            </div>

            {selDrumId != null && (
              <div className="space-y-2 pt-1">
                {hasSelMarker ? (
                  <>
                    <button onClick={duplicateSelected}
                      className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100">
                      + Dupliquer ce repère
                    </button>
                    <button onClick={removeSelected}
                      className="w-full rounded-lg border border-red-200 px-3 py-2 text-xs text-red-600 hover:bg-red-50">
                      Retirer ce repère
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-slate-400">
                    Cliquez sur l'image pour ajouter un repère au tambour N°{selDrum?.numero}.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="space-y-1">
      <span className="block text-xs text-slate-500">{label}</span>
      {children}
    </label>
  )
}
