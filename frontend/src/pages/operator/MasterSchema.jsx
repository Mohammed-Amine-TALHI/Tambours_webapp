import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import OperatorShell from './OperatorShell'
import { getMasterSchema } from '../../lib/schemaApi'

export default function MasterSchema() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getMasterSchema().then(setData).catch(() => setError('Impossible de charger le schéma.'))
  }, [])

  const conveyors = data?.conveyors ?? []

  return (
    <OperatorShell>
      <div className="space-y-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Schéma des installations</h1>
          <p className="text-sm text-slate-500">
            Cliquez sur une zone du plan ou choisissez un convoyeur dans la liste pour ouvrir sa fiche.
          </p>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="flex flex-col items-start gap-3 lg:flex-row">
          <ConveyorPanel
            conveyors={conveyors}
            onSelect={(c) => navigate(`/app/conveyors/${c.id}`)}
          />

          <div className="w-full min-w-0 flex-1">
            {data?.master?.image_url ? (
              <ZoomableSchema
                imageUrl={data.master.image_url}
                conveyors={conveyors}
                onOpen={(c) => navigate(`/app/conveyors/${c.id}`)}
              />
            ) : !error ? (
              <div className="text-sm text-slate-400 py-10 text-center border border-dashed border-slate-200 rounded-lg">
                Aucune image de schéma maître chargée.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </OperatorShell>
  )
}

/** Natural sort so B2 < B10 and T8 < T8bis < T9. */
function naturalCompare(a, b) {
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

/**
 * Side panel listing every conveyor (grouped by family) for direct selection.
 * Complements the clickable master image and reaches conveyors that have no
 * drawn zone, which aren't clickable on the schema.
 */
function ConveyorPanel({ conveyors, onSelect }) {
  const [filter, setFilter] = useState('')
  const f = filter.trim().toLowerCase()

  const groups = useMemo(() => {
    const list = conveyors
      .filter(
        (c) =>
          !f ||
          c.code.toLowerCase().includes(f) ||
          (c.name ?? '').toLowerCase().includes(f),
      )
      .slice()
      .sort((a, b) => naturalCompare(a.code, b.code))

    const byFamily = new Map()
    for (const c of list) {
      const key = c.family || 'Autres'
      if (!byFamily.has(key)) byFamily.set(key, [])
      byFamily.get(key).push(c)
    }
    return [...byFamily.entries()].sort(([a], [b]) => naturalCompare(a, b))
  }, [conveyors, f])

  return (
    <aside className="w-full lg:w-72 lg:shrink-0">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="font-semibold text-slate-800">Convoyeurs</h2>
          <p className="text-xs text-slate-400">
            {conveyors.length} installation{conveyors.length > 1 ? 's' : ''}
          </p>
        </div>

        <div className="p-2">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrer…"
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>

        <div className="max-h-[55vh] space-y-2 overflow-y-auto px-2 pb-2 lg:max-h-[calc(100vh-13rem)]">
          {groups.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-slate-400">Aucun convoyeur.</p>
          ) : (
            groups.map(([family, items]) => (
              <div key={family}>
                <div className="px-2 pb-0.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {family}
                </div>
                <div className="space-y-0.5">
                  {items.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => onSelect(c)}
                      title={c.name || c.code}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-emerald-50"
                    >
                      <span className="font-mono text-sm font-semibold text-slate-700">{c.code}</span>
                      {c.name && <span className="truncate text-xs text-slate-400">{c.name}</span>}
                      <span
                        className="ml-auto shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500"
                        title={`${c.drum_count} tambour(s)`}
                      >
                        {c.drum_count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  )
}

const ZBTN =
  'h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white/95 text-lg font-semibold text-slate-700 shadow-sm backdrop-blur hover:bg-emerald-50 hover:border-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed'

/** Full-width schema with +/- zoom, drag-to-pan, and a search overlay on the image. */
function ZoomableSchema({ imageUrl, conveyors, onOpen }) {
  const vpRef = useRef(null)
  const panRef = useRef(null)          // { x, y, tx, ty, moved }
  const suppressClickRef = useRef(false)

  const [scale, setScale] = useState(1)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const [query, setQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [hovered, setHovered] = useState(null)
  const [grabbing, setGrabbing] = useState(false)

  const MIN = 1
  const MAX = 6

  const q = query.trim().toLowerCase()
  const matches = useMemo(
    () =>
      !q
        ? []
        : conveyors.filter(
            (c) => c.code.toLowerCase().includes(q) || (c.name ?? '').toLowerCase().includes(q),
          ),
    [conveyors, q],
  )
  const matchIds = useMemo(() => new Set(matches.map((c) => c.id)), [matches])
  const soleMatchId = matches.length === 1 ? matches[0].id : null

  function clampTx(v, s = scale) {
    const w = vpRef.current?.clientWidth ?? 0
    return Math.min(0, Math.max(w * (1 - s), v))
  }
  function clampTy(v, s = scale) {
    const h = vpRef.current?.clientHeight ?? 0
    return Math.min(0, Math.max(h * (1 - s), v))
  }

  // Zoom toward a viewport point (defaults to centre) keeping that point stationary.
  function applyZoom(target, ox, oy) {
    const vp = vpRef.current
    if (!vp) return
    const rect = vp.getBoundingClientRect()
    const cx = ox ?? rect.width / 2
    const cy = oy ?? rect.height / 2
    const ns = Math.min(MAX, Math.max(MIN, target))
    if (ns === scale) return
    setScale(ns)
    setTx(clampTx(cx - ((cx - tx) * ns) / scale, ns))
    setTy(clampTy(cy - ((cy - ty) * ns) / scale, ns))
  }

  // Centre a conveyor's zone in the viewport at a comfortable zoom level.
  function zoomToZone(c, target = 2.8) {
    const center = zoneCenter(c)
    const vp = vpRef.current
    if (!center || !vp) return
    const rect = vp.getBoundingClientRect()
    const ns = Math.min(MAX, Math.max(MIN, target))
    setScale(ns)
    setTx(clampTx(rect.width / 2 - center.x * rect.width * ns, ns))
    setTy(clampTy(rect.height / 2 - center.y * rect.height * ns, ns))
  }

  const resetView = () => {
    setScale(1)
    setTx(0)
    setTy(0)
  }

  // Auto-frame when the search narrows down to exactly one located conveyor.
  useEffect(() => {
    if (!soleMatchId) return
    const c = conveyors.find((x) => x.id === soleMatchId)
    if (c?.master_zone) zoomToZone(c)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soleMatchId])

  function onMouseDown(e) {
    setShowResults(false)
    if (scale <= 1) return
    panRef.current = { x: e.clientX, y: e.clientY, tx, ty, moved: false }
    setGrabbing(true)
  }
  function onMouseMove(e) {
    const p = panRef.current
    if (!p) return
    const dx = e.clientX - p.x
    const dy = e.clientY - p.y
    if (!p.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) p.moved = true
    setTx(clampTx(p.tx + dx))
    setTy(clampTy(p.ty + dy))
  }
  function endPan() {
    if (panRef.current?.moved) {
      // swallow the click that follows a drag so we don't open a conveyor by accident
      suppressClickRef.current = true
      setTimeout(() => {
        suppressClickRef.current = false
      }, 0)
    }
    panRef.current = null
    setGrabbing(false)
  }

  function handleOpen(c) {
    if (suppressClickRef.current) return
    onOpen(c)
  }

  return (
    <div className="relative w-full">
      {/* viewport — clips the zoomed/panned content */}
      <div
        ref={vpRef}
        className={`relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-white ${
          scale > 1 ? (grabbing ? 'cursor-grabbing' : 'cursor-grab') : ''
        }`}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endPan}
        onMouseLeave={endPan}
      >
        <div style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})`, transformOrigin: '0 0' }}>
          <img
            src={imageUrl}
            alt="Schéma des installations"
            className="block w-full h-auto select-none"
            draggable={false}
          />
          <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
            {conveyors.map((c) => (
              <Zone
                key={c.id}
                conveyor={c}
                active={hovered === c.id || matchIds.has(c.id)}
                dim={!!q && !matchIds.has(c.id) && hovered !== c.id}
                onEnter={() => setHovered(c.id)}
                onLeave={() => setHovered(null)}
                onClick={() => handleOpen(c)}
              />
            ))}
          </svg>
        </div>
      </div>

      {/* search overlay — sits ON the image, outside the clipped viewport so its list isn't cut off */}
      <div className="absolute top-3 left-3 z-20 w-72 max-w-[75%]">
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setShowResults(true)
            }}
            onFocus={() => setShowResults(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && matches[0]) handleOpen(matches[0])
              if (e.key === 'Escape') {
                setQuery('')
                setShowResults(false)
              }
            }}
            placeholder="Rechercher un convoyeur…"
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white/95 shadow-sm backdrop-blur focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>

        {showResults && q && (
          <div className="mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
            {matches.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-400">Aucun résultat</div>
            ) : (
              matches.slice(0, 12).map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleOpen(c)}
                  onMouseEnter={() => setHovered(c.id)}
                  onMouseLeave={() => setHovered(null)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-emerald-50"
                  title={c.name || c.code}
                >
                  <span className="font-mono font-semibold text-slate-700">{c.code}</span>
                  {c.name && <span className="truncate text-xs text-slate-400">{c.name}</span>}
                  <span className="ml-auto shrink-0 text-xs text-slate-400">{c.drum_count}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* zoom controls overlay */}
      <div className="absolute bottom-3 right-3 z-20 flex flex-col gap-1.5">
        <button className={ZBTN} onClick={() => applyZoom(scale * 1.5)} disabled={scale >= MAX} title="Zoom avant">
          +
        </button>
        <button className={ZBTN} onClick={() => applyZoom(scale / 1.5)} disabled={scale <= MIN} title="Zoom arrière">
          −
        </button>
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
  )
}

/** Centre point of a conveyor's master zone, as 0..1 fractions of the image. */
function zoneCenter(c) {
  const z = c.master_zone
  if (!z) return null
  if (z.type === 'rect' || z.type === 'ellipse') return { x: z.x + z.w / 2, y: z.y + z.h / 2 }
  if (z.type === 'poly' && Array.isArray(z.points) && z.points.length) {
    const xs = z.points.map((p) => p[0])
    const ys = z.points.map((p) => p[1])
    return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
  }
  return null
}

/** Renders a conveyor's clickable zone (rect, ellipse or polygon) in a 0..1000 viewBox. */
function Zone({ conveyor, active, dim, onEnter, onLeave, onClick }) {
  const z = conveyor.master_zone
  if (!z) return null
  const S = 1000
  const fill = active ? 'rgba(5,150,105,0.35)' : 'rgba(5,150,105,0.10)'
  const stroke = active ? '#059669' : 'rgba(5,150,105,0.4)'
  const sw = active ? 3 : 1.5

  const off = z.labelOff ?? [0, -0.026]
  let shape
  let ax
  let ay
  if (z.type === 'rect' || z.type === 'ellipse') {
    const cx = (z.x + z.w / 2) * S
    const cy = (z.y + z.h / 2) * S
    const transform = z.angle ? `rotate(${z.angle} ${cx} ${cy})` : undefined
    shape = z.type === 'ellipse' ? (
      <ellipse cx={cx} cy={cy} rx={(z.w / 2) * S} ry={(z.h / 2) * S} transform={transform} fill={fill} stroke={stroke} strokeWidth={sw} />
    ) : (
      <rect x={z.x * S} y={z.y * S} width={z.w * S} height={z.h * S} rx={4} transform={transform} fill={fill} stroke={stroke} strokeWidth={sw} />
    )
    ax = z.x * S
    ay = z.y * S
  } else if (z.type === 'poly' && Array.isArray(z.points)) {
    shape = <polygon points={z.points.map(([x, y]) => `${x * S},${y * S}`).join(' ')} fill={fill} stroke={stroke} strokeWidth={sw} />
    ax = Math.min(...z.points.map((p) => p[0])) * S
    ay = Math.min(...z.points.map((p) => p[1])) * S
  } else {
    return null
  }

  return (
    <g
      className="cursor-pointer"
      style={{ opacity: dim ? 0.2 : 1, transition: 'opacity .15s' }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      {shape}
      <ZoneLabel x={ax + off[0] * S} y={ay + off[1] * S} text={conveyor.code} active={active} />
    </g>
  )
}

/** A filled rounded box + the conveyor code, so operators can read each zone's label. */
function ZoneLabel({ x, y, text, active }) {
  const label = String(text ?? '')
  if (!label) return null
  const w = label.length * 8.5 + 14
  const h = 22
  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect x={x} y={y} width={w} height={h} rx={4}
        fill={active ? '#059669' : 'rgba(5,150,105,0.88)'} stroke="#ffffff" strokeWidth={1} />
      <text x={x + 7} y={y + h / 2 + 0.5} dominantBaseline="middle"
        fontSize="13" fontWeight="700" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fill="#ffffff">{label}</text>
    </g>
  )
}
