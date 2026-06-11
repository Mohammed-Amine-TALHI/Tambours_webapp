import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMasterSchema, updateConveyorZone, importConveyorCharacteristics } from '../../lib/schemaApi'
import Spinner from '../../components/Spinner'

const S = 1000 // viewBox scale; zones are stored as 0..1 fractions
const MIN = 0.005
const ZMIN = 1 // min zoom
const ZMAX = 6 // max zoom
const ZBTN =
  'h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white/95 text-lg font-semibold text-slate-700 shadow-sm backdrop-blur hover:bg-emerald-50 hover:border-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed'

const TOOLS = [
  { id: 'select', label: 'Sélection', Icon: CursorIcon },
  { id: 'rect', label: 'Rectangle', Icon: RectIcon },
  { id: 'ellipse', label: 'Cercle', Icon: CircleIcon },
  { id: 'poly', label: 'Polygone', Icon: PolyIcon },
]

export default function SchemaDesign() {
  const canvasRef = useRef(null)
  const viewportRef = useRef(null)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const [zones, setZones] = useState({})
  const [dirty, setDirty] = useState(() => new Set())
  const [selectedId, setSelectedId] = useState(null)
  const [tool, setTool] = useState('select')
  const [op, setOp] = useState(null)       // active drag operation
  const [polyDraft, setPolyDraft] = useState(null) // array of [x,y] while drawing a polygon
  const [fullscreen, setFullscreen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [scale, setScale] = useState(1) // zoom
  const [tx, setTx] = useState(0)       // pan x (px)
  const [ty, setTy] = useState(0)       // pan y (px)
  const [filter, setFilter] = useState('') // conveyor list/chips filter

  useEffect(() => {
    getMasterSchema()
      .then((d) => {
        setData(d)
        const z = {}
        for (const c of d.conveyors) z[c.id] = c.master_zone ?? null
        setZones(z)
      })
      .catch(() => setError('Impossible de charger le schéma.'))
      .finally(() => setLoading(false))
  }, [])

  const conveyors = data?.conveyors ?? []
  const master = data?.master
  const selected = conveyors.find((c) => c.id === selectedId) || null
  const placedCount = conveyors.filter((c) => zones[c.id]).length

  const f = filter.trim().toLowerCase()
  const visibleConveyors = !f
    ? conveyors
    : conveyors.filter(
        (c) => c.code.toLowerCase().includes(f) || (c.name ?? '').toLowerCase().includes(f),
      )

  function markDirty(id) {
    setDirty((d) => new Set(d).add(id))
    setSavedAt(null)
  }

  function setZone(id, z) {
    setZones((prev) => ({ ...prev, [id]: z }))
  }

  // ---- zoom / pan (transform on canvasRef; pt() reads its rect so the draw math stays correct) ----
  function clampTx(v, s = scale) {
    const w = viewportRef.current?.clientWidth ?? 0
    return Math.min(0, Math.max(w * (1 - s), v))
  }
  function clampTy(v, s = scale) {
    const h = viewportRef.current?.clientHeight ?? 0
    return Math.min(0, Math.max(h * (1 - s), v))
  }
  // Zoom toward a viewport point (defaults to centre), keeping that point stationary.
  function applyZoom(target, ox, oy) {
    const vp = viewportRef.current
    if (!vp) return
    const rect = vp.getBoundingClientRect()
    const cx = ox ?? rect.width / 2
    const cy = oy ?? rect.height / 2
    const ns = Math.min(ZMAX, Math.max(ZMIN, target))
    if (ns === scale) return
    setTx(clampTx(cx - ((cx - tx) * ns) / scale, ns))
    setTy(clampTy(cy - ((cy - ty) * ns) / scale, ns))
    setScale(ns)
  }
  function resetView() { setScale(1); setTx(0); setTy(0) }

  // ---- coordinate helpers ----
  function pt(e) {
    const r = canvasRef.current.getBoundingClientRect()
    return {
      x: clamp((e.clientX - r.left) / r.width),
      y: clamp((e.clientY - r.top) / r.height),
    }
  }

  // ---- create (rect / ellipse) ----
  function onCanvasMouseDown(e) {
    if (tool === 'poly') return // polygon uses clicks
    if (tool === 'rect' || tool === 'ellipse') {
      if (!selectedId) return
      const p = pt(e)
      setOp({ kind: 'create', start: p })
      return
    }
    // select tool, empty area: drag to pan when zoomed in
    if (tool === 'select' && scale > 1) {
      setOp({ kind: 'pan', sx: e.clientX, sy: e.clientY, baseTx: tx, baseTy: ty })
    }
  }

  function onMouseMove(e) {
    if (!op) return

    if (op.kind === 'pan') {
      setTx(clampTx(op.baseTx + (e.clientX - op.sx)))
      setTy(clampTy(op.baseTy + (e.clientY - op.sy)))
      return
    }

    const p = pt(e)

    if (op.kind === 'create') {
      const rect = bbox(op.start, p)
      setZone(selectedId, { type: tool, ...rect, angle: 0 })
      return
    }

    const z = op.orig
    const c = centerOf(z)

    if (op.kind === 'move-label') {
      const dx = p.x - op.start.x
      const dy = p.y - op.start.y
      const base = op.orig.labelOff ?? [0, -0.026]
      setZone(op.cid, { ...op.orig, labelOff: [base[0] + dx, base[1] + dy] })
      return
    }

    if (op.kind === 'move') {
      const dx = p.x - op.start.x
      const dy = p.y - op.start.y
      if (z.type === 'poly') {
        setZone(op.cid, { ...z, points: z.points.map(([x, y]) => [clamp(x + dx), clamp(y + dy)]) })
      } else {
        setZone(op.cid, { ...z, x: clamp(z.x + dx), y: clamp(z.y + dy) })
      }
    } else if (op.kind === 'resize') {
      const local = rotate(p.x, p.y, c.cx, c.cy, -(z.angle || 0))
      const halfW = Math.max(MIN / 2, Math.abs(local.x - c.cx))
      const halfH = Math.max(MIN / 2, Math.abs(local.y - c.cy))
      setZone(op.cid, { ...z, x: c.cx - halfW, y: c.cy - halfH, w: halfW * 2, h: halfH * 2 })
    } else if (op.kind === 'rotate') {
      const deg = (Math.atan2(p.y - c.cy, p.x - c.cx) * 180) / Math.PI + 90
      setZone(op.cid, { ...z, angle: Math.round(deg) })
    }
  }

  function endOp() {
    if (!op) return
    if (op.kind === 'pan') { setOp(null); return }
    if (op.kind === 'create') {
      const z = zones[selectedId]
      if (!z || (z.w < MIN && z.h < MIN)) {
        setZone(selectedId, op.origZone ?? null) // discard stray click
      } else {
        setZone(selectedId, round(z))
        markDirty(selectedId)
        setTool('select')
      }
    } else {
      setZone(op.cid, round(zones[op.cid]))
      markDirty(op.cid)
    }
    setOp(null)
  }

  // ---- polygon ----
  function onCanvasClick(e) {
    if (tool !== 'poly' || !selectedId) return
    const p = pt(e)
    setPolyDraft((d) => [...(d || []), [p.x, p.y]])
  }

  function finishPolygon() {
    if (polyDraft && polyDraft.length >= 3) {
      setZone(selectedId, { type: 'poly', points: polyDraft.map(([x, y]) => [round1(x), round1(y)]) })
      markDirty(selectedId)
    }
    setPolyDraft(null)
    setTool('select')
  }

  // ---- shape interactions (select tool) ----
  function startMove(e, cid) {
    if (tool !== 'select') { setSelectedId(cid); return }
    e.stopPropagation()
    setSelectedId(cid)
    setOp({ kind: 'move', cid, start: pt(e), orig: zones[cid] })
  }
  function startHandle(e, cid, kind) {
    e.stopPropagation()
    setSelectedId(cid)
    setOp({ kind, cid, start: pt(e), orig: zones[cid] })
  }
  function startLabelMove(e, cid) {
    if (tool !== 'select') return
    e.stopPropagation()
    setSelectedId(cid)
    setOp({ kind: 'move-label', cid, start: pt(e), orig: zones[cid] })
  }

  function clearZone(id) {
    setZone(id, null)
    markDirty(id)
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      for (const id of dirty) await updateConveyorZone(id, zones[id])
      setDirty(new Set())
      setSavedAt(Date.now())
    } catch {
      setError("L'enregistrement a échoué.")
    } finally {
      setSaving(false)
    }
  }

  // ----- shared UI pieces (used by both layouts) -----
  const saveBtn = (
    <button
      onClick={save}
      disabled={saving || dirty.size === 0}
      className="inline-flex min-w-32 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-700 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-emerald-800 hover:to-teal-700 disabled:opacity-50"
    >
      {saving ? <Spinner variant="onColor" /> : `Enregistrer${dirty.size ? ` (${dirty.size})` : ''}`}
    </button>
  )

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTool(t.id); setPolyDraft(null) }}
            title={t.label}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition sm:px-3 ${
              tool === t.id ? 'bg-emerald-600 font-medium text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <t.Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>
      {tool === 'poly' && polyDraft?.length >= 3 && (
        <button onClick={finishPolygon} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100">
          Terminer le polygone ({polyDraft.length} points)
        </button>
      )}
      {tool !== 'select' && !selectedId && (
        <span className="text-xs font-medium text-amber-600">Sélectionnez d'abord un convoyeur.</span>
      )}
    </div>
  )

  const progress = (
    <div className="flex items-center gap-2.5" title={`${placedCount} zone(s) placée(s) sur ${conveyors.length}`}>
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${conveyors.length ? (placedCount / conveyors.length) * 100 : 0}%` }}
        />
      </div>
      <span className="whitespace-nowrap text-sm font-medium text-slate-600">
        {placedCount}/{conveyors.length} positionnés
      </span>
    </div>
  )

  const selectedBanner = selected && (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2">
      <span className="font-mono text-sm font-bold text-emerald-800">{selected.code}</span>
      <span className="text-xs text-slate-600">
        {zones[selected.id] ? 'Forme définie — déplacez, redimensionnez ou pivotez.' : 'Choisissez une forme puis dessinez sur le plan.'}
      </span>
      {zones[selected.id] && (
        <button onClick={() => clearZone(selected.id)} className="text-xs font-medium text-red-600 hover:underline">Effacer la forme</button>
      )}
      <Link to={`/admin/conveyors/${selected.id}`} className="text-xs font-medium text-emerald-700 hover:underline">
        Infos &amp; fiches →
      </Link>
    </div>
  )

  const filterInput = (
    <input
      value={filter}
      onChange={(e) => setFilter(e.target.value)}
      placeholder="Filtrer…"
      className="w-28 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
    />
  )

  const cursorClass =
    tool !== 'select'
      ? 'cursor-crosshair'
      : scale > 1
        ? op?.kind === 'pan' ? 'cursor-grabbing' : 'cursor-grab'
        : ''

  const canvas = master?.image_url ? (
    <div
      ref={viewportRef}
      className={`relative overflow-hidden rounded-xl ${fullscreen ? 'inline-block max-w-full' : 'w-full'}`}
    >
      <div
        ref={canvasRef}
        className={`relative ${fullscreen ? 'inline-block' : 'w-full'} ${cursorClass}`}
        style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})`, transformOrigin: '0 0' }}
        onMouseDown={onCanvasMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endOp}
        onMouseLeave={endOp}
        onClick={onCanvasClick}
      >
        <img
          src={master.image_url}
          alt="Schéma des installations"
          className={`rounded-xl border border-slate-100 select-none pointer-events-none ${
            fullscreen ? 'block w-auto h-auto max-w-full max-h-[calc(100vh-72px)]' : 'w-full h-auto'
          }`}
          draggable={false}
        />
        <svg viewBox={`0 0 ${S} ${S}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          {conveyors.map((c) => {
            const z = zones[c.id]
            if (!z) return null
            return (
              <ShapeView
                key={c.id}
                code={c.code}
                zone={z}
                selected={c.id === selectedId}
                onBodyDown={(e) => startMove(e, c.id)}
                onLabelDown={(e) => startLabelMove(e, c.id)}
                onResizeDown={(e) => startHandle(e, c.id, 'resize')}
                onRotateDown={(e) => startHandle(e, c.id, 'rotate')}
              />
            )
          })}
          {polyDraft && polyDraft.length > 0 && (
            <polyline
              points={polyDraft.map(([x, y]) => `${x * S},${y * S}`).join(' ')}
              fill="rgba(5,150,105,0.15)" stroke="#059669" strokeWidth={2} strokeDasharray="6 4"
            />
          )}
        </svg>
      </div>

      {/* zoom controls — overlaid on the viewport (shared by both layouts) */}
      <div className="absolute bottom-3 right-3 z-20 flex flex-col gap-1.5">
        <button className={ZBTN} onClick={() => applyZoom(scale * 1.5)} disabled={scale >= ZMAX} title="Zoom avant">+</button>
        <button className={ZBTN} onClick={() => applyZoom(scale / 1.5)} disabled={scale <= ZMIN} title="Zoom arrière">−</button>
        <button
          className={`${ZBTN} text-sm`}
          onClick={resetView}
          disabled={scale === 1 && tx === 0 && ty === 0}
          title="Réinitialiser la vue"
        >
          ⟲
        </button>
      </div>
    </div>
  ) : (
    <div className="rounded-xl border border-dashed border-slate-200 px-10 py-16 text-center text-sm text-slate-400">
      Aucune image de schéma maître.
      {' '}<Link to="/admin/import" className="text-emerald-600 hover:underline">Importer un fichier</Link>.
    </div>
  )

  // Conveyor chip — shared between the chips bar and the fullscreen panel.
  function ConveyorChip({ c, vertical }) {
    const sel = c.id === selectedId
    const placed = !!zones[c.id]
    return (
      <button
        onClick={() => setSelectedId(c.id)}
        title={c.name || c.code}
        className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition ${
          vertical ? 'w-full justify-between' : ''
        } ${
          sel
            ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
            : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/40'
        }`}
      >
        <span className="font-mono font-semibold">{c.code}</span>
        {placed ? (
          <CheckIcon className={`h-3.5 w-3.5 ${sel ? 'text-emerald-100' : 'text-emerald-500'}`} />
        ) : (
          <span className={`h-2 w-2 rounded-full ${sel ? 'bg-emerald-200' : 'bg-slate-300'}`} />
        )}
      </button>
    )
  }

  const sidebar = (
    <div className="space-y-3">
      {progress}
      <CharImport />
      {selectedBanner}
      {filterInput}
      <div className={`space-y-1 overflow-y-auto pr-1 ${fullscreen ? 'max-h-[calc(100vh-280px)]' : 'max-h-[55vh]'}`}>
        {visibleConveyors.map((c) => (
          <ConveyorChip key={c.id} c={c} vertical />
        ))}
        {conveyors.length === 0 && (
          <p className="text-sm text-slate-400">
            Aucun convoyeur. <Link to="/admin/import" className="text-emerald-600 hover:underline">Importer un fichier</Link>.
          </p>
        )}
        {conveyors.length > 0 && visibleConveyors.length === 0 && (
          <p className="text-sm text-slate-400">Aucun résultat.</p>
        )}
      </div>
    </div>
  )

  const errorBanner = error && (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
  )
  const loadingEl = (
    <div className="flex items-center gap-3 text-slate-500 text-sm py-16 justify-center">
      <Spinner /> Chargement du schéma…
    </div>
  )

  // ----- Full-screen: canvas fills the viewport, side panel collapsible -----
  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 shrink-0">
          <h1 className="mr-1 text-base font-bold text-slate-900">Design du schéma</h1>
          {toolbar}
          <div className="ml-auto flex items-center gap-2">
            {savedAt && !dirty.size && <SavedBadge />}
            <button onClick={() => setPanelOpen((p) => !p)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900">
              {panelOpen ? 'Masquer le panneau' : 'Afficher le panneau'}
            </button>
            {saveBtn}
            <button onClick={() => setFullscreen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900">
              Quitter le plein écran
            </button>
          </div>
        </div>
        {errorBanner && <div className="px-4 pt-2 shrink-0">{errorBanner}</div>}
        <div className="flex-1 min-h-0 flex">
          <section className="flex-1 min-w-0 flex items-center justify-center p-2 overflow-auto">
            {loading ? loadingEl : canvas}
          </section>
          {panelOpen && (
            <aside className="w-72 shrink-0 overflow-y-auto border-l border-slate-200 bg-white p-3">
              {sidebar}
            </aside>
          )}
        </div>
      </div>
    )
  }

  // ----- Normal (embedded in admin layout) -----
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Design du schéma</h1>
          <p className="mt-1 text-sm text-slate-500">
            <span className="font-medium text-emerald-700">1.</span> Sélectionnez un convoyeur ·{' '}
            <span className="font-medium text-emerald-700">2.</span> Choisissez une forme et dessinez sa zone ·{' '}
            <span className="font-medium text-emerald-700">3.</span> Enregistrez.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savedAt && !dirty.size && <SavedBadge />}
          <button onClick={() => setFullscreen(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900">
            <ExpandIcon className="h-4 w-4" />
            Plein écran
          </button>
          {saveBtn}
        </div>
      </div>

      {errorBanner}

      {loading ? loadingEl : (
        <div className="space-y-4">
          {/* control bar — tools, progress, characteristics import, conveyor chips */}
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {toolbar}
              <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2">
                {progress}
                <CharImport />
              </div>
            </div>

            {selectedBanner}

            {conveyors.length === 0 ? (
              <p className="text-sm text-slate-400">
                Aucun convoyeur. <Link to="/admin/import" className="text-emerald-600 hover:underline">Importer un fichier</Link>.
              </p>
            ) : (
              <div className="flex items-center gap-2">
                {filterInput}
                <div className="flex flex-1 gap-1.5 overflow-x-auto pb-1">
                  {visibleConveyors.map((c) => (
                    <ConveyorChip key={c.id} c={c} />
                  ))}
                  {visibleConveyors.length === 0 && (
                    <span className="py-1.5 text-sm text-slate-400">Aucun résultat.</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* full-width canvas */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            {canvas}
          </div>
        </div>
      )}
    </div>
  )
}

function SavedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
      <CheckIcon className="h-3.5 w-3.5" /> Enregistré
    </span>
  )
}

/* ---------------- icons ---------------- */

function CursorIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 3 7.5 17 2.2-6.8L21.5 11Z" />
    </svg>
  )
}

function RectIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="6" width="17" height="12" rx="1.5" />
    </svg>
  )
}

function CircleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="8.5" />
    </svg>
  )
}

function PolyIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 21 10l-3.5 10h-11L3 10Z" />
    </svg>
  )
}

function CheckIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m4.5 12.5 5 5 10-11" />
    </svg>
  )
}

function ExpandIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h6v6" />
      <path d="M9 21H3v-6" />
      <path d="m21 3-7 7" />
      <path d="m3 21 7-7" />
    </svg>
  )
}

/* ---------------- optional Excel upload: bulk conveyor characteristics ----------------
   Parses a "caractéristiques" workbook server-side and fills the characteristics of
   every detected conveyor whose code matches a row (T1, CV1, B1…). Machine sheets and
   rows for conveyors that aren't in the schema are ignored. */
function CharImport() {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [err, setErr] = useState(null)

  async function onFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return
    setBusy(true); setErr(null); setResult(null)
    try {
      setResult(await importConveyorCharacteristics(file))
    } catch (e2) {
      setErr(e2?.response?.data?.errors?.file?.[0] ?? e2?.response?.data?.message ?? "Échec de l'import.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={onFile} className="hidden" />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        title="Remplir les caractéristiques des convoyeurs détectés depuis un fichier Excel"
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-50"
      >
        {busy ? <Spinner /> : <span aria-hidden>⬆</span>}
        Caractéristiques (Excel)
      </button>
      {result && (
        <span className="text-xs text-emerald-700">
          {result.updated?.length ?? 0} convoyeur(s) rempli(s)
          {result.unmatched?.length ? ` · ${result.unmatched.length} sans correspondance` : ''}
        </span>
      )}
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  )
}

/** A zone shape + (when selected) move/resize/rotate handles, in the 0..1000 viewBox. */
function ShapeView({ code, zone: z, selected, onBodyDown, onLabelDown, onResizeDown, onRotateDown }) {
  const fill = selected ? 'rgba(5,150,105,0.30)' : 'rgba(5,150,105,0.12)'
  const stroke = selected ? '#059669' : 'rgba(5,150,105,0.5)'
  const sw = selected ? 3 : 1.5
  const off = z.labelOff ?? [0, -0.026]

  if (z.type === 'poly' && Array.isArray(z.points)) {
    const ax = Math.min(...z.points.map((p) => p[0])) * S
    const ay = Math.min(...z.points.map((p) => p[1])) * S
    return (
      <g>
        <polygon className="cursor-move" onMouseDown={onBodyDown}
          points={z.points.map(([x, y]) => `${x * S},${y * S}`).join(' ')}
          fill={fill} stroke={stroke} strokeWidth={sw} />
        <LabelChip x={ax + off[0] * S} y={ay + off[1] * S} text={code} selected={selected} onMouseDown={onLabelDown} />
      </g>
    )
  }

  const c = centerOf(z)
  const cx = c.cx * S, cy = c.cy * S
  const transform = z.angle ? `rotate(${z.angle} ${cx} ${cy})` : undefined
  const x = z.x * S, y = z.y * S, w = z.w * S, h = z.h * S

  return (
    <g>
      <g transform={transform}>
        <g className="cursor-move" onMouseDown={onBodyDown}>
          {z.type === 'ellipse' ? (
            <ellipse cx={cx} cy={cy} rx={w / 2} ry={h / 2} fill={fill} stroke={stroke} strokeWidth={sw} />
          ) : (
            <rect x={x} y={y} width={w} height={h} rx={4} fill={fill} stroke={stroke} strokeWidth={sw} />
          )}
        </g>
        {selected && (
          <>
            {/* rotate handle */}
            <line x1={cx} y1={y} x2={cx} y2={y - 28} stroke="#059669" strokeWidth={1.5} />
            <circle cx={cx} cy={y - 28} r={8} fill="#fff" stroke="#059669" strokeWidth={2}
              className="cursor-grab" onMouseDown={onRotateDown} />
            {/* resize handle (bottom-right) */}
            <rect x={x + w - 7} y={y + h - 7} width={14} height={14} rx={2} fill="#fff" stroke="#059669" strokeWidth={2}
              className="cursor-nwse-resize" onMouseDown={onResizeDown} />
          </>
        )}
      </g>
      <LabelChip x={x + off[0] * S} y={y + off[1] * S} text={code} selected={selected} onMouseDown={onLabelDown} />
    </g>
  )
}

/** A filled rounded box + the conveyor code, drawn in the 0..1000 overlay space. */
function LabelChip({ x, y, text, selected, onMouseDown }) {
  const label = String(text ?? '')
  if (!label) return null
  const w = label.length * 8.5 + 14
  const h = 22
  return (
    <g
      onMouseDown={onMouseDown}
      className={onMouseDown ? 'cursor-move' : undefined}
      style={onMouseDown ? undefined : { pointerEvents: 'none' }}
    >
      <rect x={x} y={y} width={w} height={h} rx={4}
        fill={selected ? '#059669' : 'rgba(5,150,105,0.88)'} stroke="#ffffff" strokeWidth={1} />
      <text x={x + 7} y={y + h / 2 + 0.5} dominantBaseline="middle"
        fontSize="13" fontWeight="700" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fill="#ffffff">{label}</text>
    </g>
  )
}

// ---- geometry ----
function clamp(n) { return Math.min(1, Math.max(0, n)) }
function round1(n) { return Math.round(n * 1e4) / 1e4 }
function bbox(a, b) {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) }
}
function centerOf(z) {
  if (z.type === 'poly' && z.points?.length) {
    const n = z.points.length
    const sx = z.points.reduce((s, p) => s + p[0], 0)
    const sy = z.points.reduce((s, p) => s + p[1], 0)
    return { cx: sx / n, cy: sy / n }
  }
  return { cx: z.x + z.w / 2, cy: z.y + z.h / 2 }
}
function rotate(px, py, cx, cy, deg) {
  const r = (deg * Math.PI) / 180
  const cos = Math.cos(r), sin = Math.sin(r)
  const dx = px - cx, dy = py - cy
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos }
}
function round(z) {
  if (!z) return z
  const off = z.labelOff ? { labelOff: [round1(z.labelOff[0]), round1(z.labelOff[1])] } : {}
  if (z.type === 'poly') return { ...z, points: z.points.map(([x, y]) => [round1(x), round1(y)]), ...off }
  return { ...z, x: round1(clamp(z.x)), y: round1(clamp(z.y)), w: round1(z.w), h: round1(z.h), angle: z.angle || 0, ...off }
}
