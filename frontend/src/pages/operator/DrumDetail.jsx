import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import OperatorShell from './OperatorShell'
import { getDrum, getComponentLocations, KIND_LABEL } from '../../lib/schemaApi'

export default function DrumDetail() {
  const { id } = useParams()
  const [drum, setDrum] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    setDrum(null)
    getDrum(id).then(setDrum).catch(() => setError('Tambour introuvable.'))
  }, [id])

  return (
    <OperatorShell
      breadcrumb={
        <>
          <Link to="/app" className="hover:text-emerald-700">Schéma</Link>
          <span>/</span>
          {drum?.conveyor && (
            <>
              <Link to={`/app/conveyors/${drum.conveyor.id}`} className="hover:text-emerald-700">
                {drum.conveyor.code}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-slate-700 font-medium">Tambour {drum?.numero ?? '…'}</span>
        </>
      }
    >
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {drum && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xl font-bold">
              {drum.numero}
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-slate-800">
                Tambour {drum.numero} — {drum.conveyor?.code}
              </h1>
              <p className="text-sm text-slate-500">
                {drum.diametre && <>Ø {drum.diametre} · </>}
                {drum.longueur && <>L {drum.longueur} · </>}
                {drum.etat && <>État {drum.etat}</>}
              </p>
            </div>
          </div>

          {/* Liaisons */}
          {(drum.liaison_dynano || drum.liaison_anano || drum.liaison_etat) && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-2">Liaisons</h2>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <Field label="Dynano bloc" value={drum.liaison_dynano} />
                <Field label="Anano bloc" value={drum.liaison_anano} />
                <Field label="État" value={drum.liaison_etat} />
              </div>
            </div>
          )}

          {/* Components */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {drum.components.map((c) => (
              <ComponentCard key={c.id} component={c} />
            ))}
            {drum.components.length === 0 && (
              <p className="text-sm text-slate-400">Aucun composant enregistré.</p>
            )}
          </div>

          {/* Drum-level datasheets */}
          {drum.datasheets?.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Fiches techniques du tambour</h2>
              <DatasheetList items={drum.datasheets} />
            </div>
          )}
        </div>
      )}
    </OperatorShell>
  )
}

function ComponentCard({ component }) {
  const [open, setOpen] = useState(false)
  const [loc, setLoc] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function toggleLocations() {
    if (!open && !loc) {
      setLoading(true)
      try {
        setLoc(await getComponentLocations(component.id))
      } finally {
        setLoading(false)
      }
    }
    setOpen((o) => !o)
  }

  const others = (loc?.locations ?? []).filter((l) => l.component_id !== component.id)

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">
          {KIND_LABEL[component.kind] ?? component.kind}
        </h3>
        {component.etat && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{component.etat}</span>
        )}
      </div>

      <dl className="space-y-1 text-sm">
        <Row label="Type" value={component.type_label} />
        <Row label="Plan KOCH" value={component.plan_koch} />
        <Row label="Plan OCP" value={component.plan_ocp} />
        <Row label="Repère" value={component.repere} />
      </dl>

      {/* Cross-reference */}
      {component.plan_key && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <button
            onClick={toggleLocations}
            className="text-sm text-emerald-700 hover:text-emerald-900 font-medium"
          >
            {loading ? 'Recherche…' : open ? 'Masquer les emplacements' : 'Où trouve-t-on ce composant ?'}
          </button>
          {open && loc && (
            <div className="mt-2">
              {others.length === 0 ? (
                <p className="text-xs text-slate-400">Ce composant n'est utilisé qu'ici.</p>
              ) : (
                <>
                  <p className="text-xs text-slate-500 mb-2">
                    Nomenclature — composant présent dans {loc.count} emplacement(s) :
                  </p>
                  <CrossRefTree
                    locations={loc.locations ?? []}
                    currentComponentId={component.id}
                    onOpenDrum={(drumId) => navigate(`/app/drums/${drumId}`)}
                  />
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Datasheets */}
      <div className="mt-4 border-t border-slate-100 pt-3">
        <h4 className="text-xs font-medium text-slate-500 mb-2">Fiches techniques</h4>
        {component.datasheets?.length > 0 ? (
          <DatasheetList items={component.datasheets} />
        ) : (
          <p className="text-xs text-slate-400">Aucune fiche disponible.</p>
        )}
      </div>
    </div>
  )
}

/* ---------------- cross-reference rendered as a BOM / nomenclature tree ----------------
   Convoyeur (≈ FERT) → Tambour ×N (≈ HALB) → Composant (≈ ROH).                          */
function buildCrossRefTree(locations) {
  const conv = new Map()
  for (const l of locations) {
    const cid = l.conveyor?.id ?? `c?${l.conveyor?.code ?? ''}`
    if (!conv.has(cid)) conv.set(cid, { conveyor: l.conveyor, drums: new Map() })
    const node = conv.get(cid)
    const did = l.drum?.id ?? `d?${l.drum?.numero ?? ''}`
    if (!node.drums.has(did)) node.drums.set(did, { drum: l.drum, items: [] })
    node.drums.get(did).items.push(l)
  }
  return [...conv.values()].map((c) => ({
    conveyor: c.conveyor,
    drums: [...c.drums.values()].sort((a, b) => (a.drum?.numero ?? 0) - (b.drum?.numero ?? 0)),
  }))
}

function CrossRefTree({ locations, currentComponentId, onOpenDrum }) {
  const tree = useMemo(() => buildCrossRefTree(locations), [locations])
  return (
    <ul className="space-y-2 text-sm">
      {tree.map((c) => {
        const total = c.drums.reduce((n, d) => n + d.items.length, 0)
        return (
          <li key={c.conveyor?.id ?? c.conveyor?.code ?? 'none'}>
            {/* conveyor root */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-emerald-700">{c.conveyor?.code ?? '—'}</span>
              {c.conveyor?.name && <span className="text-xs text-slate-400 truncate max-w-[12rem]">{c.conveyor.name}</span>}
              <TreeTag>Convoyeur</TreeTag>
              {total > 1 && <Qty n={total} />}
            </div>
            {/* tambours */}
            <ul className="mt-1 ml-1.5 space-y-1 border-l-2 border-slate-200 pl-3">
              {c.drums.map((dn) => (
                <li key={dn.drum?.id ?? dn.drum?.numero ?? 'none'}>
                  <button
                    onClick={() => dn.drum && onOpenDrum(dn.drum.id)}
                    className="inline-flex items-center gap-2 -ml-1 rounded-md px-2 py-0.5 text-left hover:bg-emerald-50"
                    title="Ouvrir ce tambour"
                  >
                    <span className="font-medium text-slate-700">Tambour {dn.drum?.numero ?? '?'}</span>
                    {dn.items.length > 1 && <Qty n={dn.items.length} />}
                    <TreeTag>Tambour</TreeTag>
                    <span className="text-slate-300">→</span>
                  </button>
                  {/* composants */}
                  <ul className="ml-1.5 border-l border-slate-100 pl-3">
                    {dn.items.map((it) => {
                      const here = it.component_id === currentComponentId
                      return (
                        <li key={it.component_id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 py-0.5">
                          <span className={here ? 'font-medium text-emerald-700' : 'text-slate-600'}>
                            {it.type_label || KIND_LABEL[it.kind] || it.kind}
                          </span>
                          {it.repere && <span className="text-xs text-slate-400">Rep. {it.repere}</span>}
                          {it.plan_koch && <span className="text-xs font-mono text-slate-400">{it.plan_koch}</span>}
                          {it.etat && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{it.etat}</span>}
                          {here && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">ici</span>}
                        </li>
                      )
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          </li>
        )
      })}
    </ul>
  )
}

function TreeTag({ children }) {
  return <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{children}</span>
}

function Qty({ n }) {
  return <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-1.5">×{n}</span>
}

function DatasheetList({ items }) {
  return (
    <ul className="space-y-1.5">
      {items.map((ds) => (
        <li key={ds.id}>
          <a
            href={ds.download_url}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-sm text-slate-700"
          >
            <span className="text-emerald-600">⬇</span>
            <span className="flex-1 truncate">{ds.title}</span>
            {ds.size && <span className="text-xs text-slate-400">{Math.round(ds.size / 1024)} Ko</span>}
          </a>
        </li>
      ))}
    </ul>
  )
}

function Row({ label, value }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-800 font-medium text-right">{value}</dd>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-slate-800 font-medium">{value || '—'}</div>
    </div>
  )
}
