import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import OperatorShell from './OperatorShell'
import { getDrum, getComponentLocations, KIND_LABEL } from '../../lib/schemaApi'

/* La page est conçue comme une fiche technique imprimable (A4) remise à
   l'opérateur : toutes les données du tambour sont visibles d'un coup,
   avec un emplacement central réservé à la photo du tambour. */

export default function DrumDetail() {
  const { id } = useParams()
  const [drum, setDrum] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    getDrum(id)
      .then((d) => {
        if (active) {
          setDrum(d)
          setError(null)
        }
      })
      .catch(() => active && setError('Tambour introuvable.'))
    return () => {
      active = false
    }
  }, [id])

  const reference = drum ? `FT-${drum.conveyor?.code ?? '??'}-T${drum.numero}` : ''
  const printedOn = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  // Components flank the central photo zone: even index left, odd index right.
  const leftComponents = (drum?.components ?? []).filter((_, i) => i % 2 === 0)
  const rightComponents = (drum?.components ?? []).filter((_, i) => i % 2 === 1)

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
          <span className="font-medium text-slate-700">Tambour {drum?.numero ?? '…'}</span>
        </>
      }
    >
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {!drum && !error && <SheetSkeleton />}

      {drum && (
        <div className="mx-auto max-w-5xl">
          {/* Toolbar — écran uniquement */}
          <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
            {drum.conveyor ? (
              <Link
                to={`/app/conveyors/${drum.conveyor.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-white hover:text-emerald-700"
              >
                <span aria-hidden>←</span> Convoyeur {drum.conveyor.code}
              </Link>
            ) : (
              <span />
            )}
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-emerald-800 hover:to-teal-700 active:scale-[0.98]"
            >
              <PrinterIcon className="h-4 w-4" />
              Imprimer la fiche
            </button>
          </div>

          {/* Fiche technique */}
          <article className="print-sheet overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none">
            {/* Bandeau d'en-tête */}
            <header className="relative bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700 px-5 py-5 text-white sm:px-8">
              <div
                className="pointer-events-none absolute inset-0 opacity-10"
                style={{ backgroundImage: 'repeating-linear-gradient(135deg, #fff 0 1px, transparent 1px 14px)' }}
              />
              <div className="relative flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                <div className="flex items-center gap-3">
                  <img src="/ocp-logo.png" alt="OCP" className="h-10 w-auto rounded-lg bg-white p-1" />
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-emerald-200">
                      Installation KOCH · Maintenance
                    </p>
                    <h1 className="text-xl font-bold sm:text-2xl">Fiche technique — Tambour</h1>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-mono text-sm font-semibold tracking-wider">{reference}</p>
                  <p className="text-xs text-emerald-200">Éditée le {printedOn}</p>
                </div>
              </div>
            </header>

            {/* Identité */}
            <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-slate-50/70 px-5 py-4 sm:px-8">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-2xl font-black text-white">
                {drum.numero}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-slate-900">Tambour {drum.numero}</h2>
                <p className="truncate text-sm text-slate-500">
                  Convoyeur <span className="font-semibold text-emerald-700">{drum.conveyor?.code ?? '—'}</span>
                  {drum.conveyor?.name && <> — {drum.conveyor.name}</>}
                </p>
              </div>
              {drum.etat && <EtatBadge etat={drum.etat} large />}
            </div>

            <div className="space-y-7 px-5 py-6 sm:px-8 print:space-y-5 print:py-5">
              {/* 01 — Caractéristiques */}
              <section className="break-inside-avoid">
                <SectionTitle no="01">Caractéristiques & liaisons</SectionTitle>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6 print:grid-cols-6 print:gap-2">
                  <SpecTile label="Diamètre" value={drum.diametre && `Ø ${drum.diametre}`} />
                  <SpecTile label="Longueur" value={drum.longueur && `L ${drum.longueur}`} />
                  <SpecTile label="État tambour" value={drum.etat} />
                  <SpecTile label="Liaison dynano" value={drum.liaison_dynano} mono />
                  <SpecTile label="Liaison anano" value={drum.liaison_anano} mono />
                  <SpecTile label="État liaison" value={drum.liaison_etat} />
                </div>
              </section>

              {/* 02 — Vue & composants : photo au centre, composants de part et d'autre */}
              <section>
                <SectionTitle no="02">Composants</SectionTitle>
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_260px_1fr] print:grid-cols-[1fr_190px_1fr] print:gap-3">
                  <div className="order-2 space-y-5 lg:order-1 print:order-1 print:space-y-3">
                    {leftComponents.map((c) => (
                      <ComponentCard key={c.id} component={c} />
                    ))}
                  </div>

                  <PhotoPlaceholder numero={drum.numero} className="order-1 lg:order-2 print:order-2" />

                  <div className="order-3 space-y-5 print:space-y-3">
                    {rightComponents.map((c) => (
                      <ComponentCard key={c.id} component={c} />
                    ))}
                  </div>
                </div>
                {drum.components.length === 0 && (
                  <p className="mt-3 text-center text-sm text-slate-400">Aucun composant enregistré.</p>
                )}
              </section>

              {/* 03 — Documents du tambour */}
              {drum.datasheets?.length > 0 && (
                <section className="break-inside-avoid">
                  <SectionTitle no="03">Fiches techniques du tambour</SectionTitle>
                  <DatasheetList items={drum.datasheets} />
                </section>
              )}
            </div>

            {/* Cartouche de visa — impression uniquement */}
            <div className="hidden grid-cols-3 gap-3 px-8 pb-5 print:grid">
              {['Émis par', 'Visa opérateur', 'Visa responsable'].map((label) => (
                <div key={label} className="rounded-lg border border-slate-300 px-3 pb-10 pt-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
                </div>
              ))}
            </div>

            {/* Pied de fiche */}
            <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 text-[11px] text-slate-400 sm:px-8 print:bg-white">
              <span>Plateforme Tambours — OCP · Installation KOCH</span>
              <span className="font-mono">{reference}</span>
              <span>Imprimé le {printedOn}</span>
            </footer>
          </article>

          {/* Bouton d'impression flottant — mobile uniquement */}
          <button
            onClick={() => window.print()}
            title="Imprimer la fiche"
            className="fixed bottom-5 right-5 z-30 flex h-13 w-13 items-center justify-center rounded-full bg-emerald-700 p-3.5 text-white shadow-lg shadow-emerald-700/30 transition hover:bg-emerald-800 active:scale-95 sm:hidden print:hidden"
          >
            <PrinterIcon className="h-6 w-6" />
          </button>
        </div>
      )}
    </OperatorShell>
  )
}

/* ---------------- emplacement central réservé à la photo ---------------- */

function PhotoPlaceholder({ numero, className = '' }) {
  return (
    <figure
      className={`relative mx-auto flex aspect-[3/4] w-full max-w-[280px] flex-col items-center justify-center self-start rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 px-4 text-center print:max-w-none ${className}`}
    >
      {/* repères d'angle façon plan technique */}
      <CornerMark className="left-2 top-2 border-l-2 border-t-2" />
      <CornerMark className="right-2 top-2 border-r-2 border-t-2" />
      <CornerMark className="bottom-2 left-2 border-b-2 border-l-2" />
      <CornerMark className="bottom-2 right-2 border-b-2 border-r-2" />

      <DrumIcon className="h-16 w-16 text-emerald-400" />
      <figcaption className="mt-3">
        <span className="block text-sm font-semibold text-emerald-700">Photo du tambour {numero}</span>
        <span className="mt-0.5 block text-xs text-emerald-600/70">Emplacement réservé</span>
      </figcaption>
    </figure>
  )
}

function CornerMark({ className }) {
  return <span aria-hidden className={`absolute h-3.5 w-3.5 border-emerald-400 ${className}`} />
}

function DrumIcon({ className }) {
  // tambour vu de côté : corps cylindrique + arbre traversant
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <rect x="14" y="16" width="36" height="32" rx="5" />
      <line x1="3" y1="32" x2="14" y2="32" />
      <line x1="50" y1="32" x2="61" y2="32" />
      <line x1="22" y1="16" x2="22" y2="48" strokeDasharray="3 4" strokeWidth="1.5" />
      <line x1="42" y1="16" x2="42" y2="48" strokeDasharray="3 4" strokeWidth="1.5" />
    </svg>
  )
}

function PrinterIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9V3h12v6" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" rx="1" />
    </svg>
  )
}

/* ---------------- briques de la fiche ---------------- */

function SectionTitle({ no, children }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="font-mono text-[11px] font-bold text-emerald-600">{no}</span>
      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-700">{children}</h3>
      <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
    </div>
  )
}

function SpecTile({ label, value, mono }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`mt-0.5 truncate text-sm font-semibold text-slate-800 ${mono ? 'font-mono' : ''}`}>
        {value || '—'}
      </div>
    </div>
  )
}

function etatTone(etat) {
  const e = String(etat ?? '').toLowerCase()
  if (/(neuf|bon|ok)/.test(e)) return 'border-emerald-200 bg-emerald-100 text-emerald-700'
  if (/(moyen|surveil)/.test(e)) return 'border-amber-200 bg-amber-100 text-amber-700'
  if (/(mauvais|us[ée]|hs|d[ée]fect)/.test(e)) return 'border-rose-200 bg-rose-100 text-rose-700'
  return 'border-slate-200 bg-slate-100 text-slate-600'
}

function EtatBadge({ etat, large }) {
  return (
    <span
      className={`rounded-full border font-medium ${etatTone(etat)} ${
        large ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'
      }`}
    >
      {etat}
    </span>
  )
}

function ComponentCard({ component }) {
  const [loc, setLoc] = useState(null)
  const [loading, setLoading] = useState(!!component.plan_key)
  const navigate = useNavigate()

  // Auto-load every location this component appears in (no click needed).
  useEffect(() => {
    if (!component.plan_key) return
    let active = true
    getComponentLocations(component.id)
      .then((d) => active && setLoc(d))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [component.id, component.plan_key])

  const others = (loc?.locations ?? []).filter((l) => l.component_id !== component.id)

  return (
    <section className="break-inside-avoid overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <header className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
        <h3 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-emerald-700">
          <span aria-hidden className="h-2 w-2 rounded-full bg-emerald-500" />
          {KIND_LABEL[component.kind] ?? component.kind}
        </h3>
        {component.etat && <EtatBadge etat={component.etat} />}
      </header>

      <div className="space-y-4 px-4 py-3">
        <dl className="space-y-1 text-sm">
          <Row label="Type" value={component.type_label} />
          <Row label="Plan KOCH" value={component.plan_koch} mono />
          <Row label="Plan OCP" value={component.plan_ocp} mono />
          <Row label="Repère" value={component.repere} />
        </dl>

        {/* Nomenclature — chaque emplacement du composant est listé automatiquement */}
        {component.plan_key && (
          <div className="border-t border-slate-100 pt-3">
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Emplacements</h4>
            {loading ? (
              <p className="text-xs text-slate-400">Recherche des emplacements…</p>
            ) : !loc ? null : others.length === 0 ? (
              <p className="text-xs text-slate-400">Ce composant n'est utilisé qu'ici.</p>
            ) : (
              <>
                <p className="mb-2 text-xs text-slate-500">
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

        {/* Fiches techniques */}
        <div className="border-t border-slate-100 pt-3">
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Fiches techniques</h4>
          {component.datasheets?.length > 0 ? (
            <DatasheetList items={component.datasheets} />
          ) : (
            <p className="text-xs text-slate-400">Aucune fiche disponible.</p>
          )}
        </div>
      </div>
    </section>
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
              {c.conveyor?.name && <span className="max-w-[12rem] truncate text-xs text-slate-400">{c.conveyor.name}</span>}
              <TreeTag>Convoyeur</TreeTag>
              {total > 1 && <Qty n={total} />}
            </div>
            {/* tambours */}
            <ul className="ml-1.5 mt-1 space-y-1 border-l-2 border-slate-200 pl-3">
              {c.drums.map((dn) => (
                <li key={dn.drum?.id ?? dn.drum?.numero ?? 'none'}>
                  <button
                    onClick={() => dn.drum && onOpenDrum(dn.drum.id)}
                    className="-ml-1 inline-flex items-center gap-2 rounded-md px-2 py-0.5 text-left hover:bg-emerald-50"
                    title="Ouvrir ce tambour"
                  >
                    <span className="font-medium text-slate-700">Tambour {dn.drum?.numero ?? '?'}</span>
                    {dn.items.length > 1 && <Qty n={dn.items.length} />}
                    <TreeTag>Tambour</TreeTag>
                    <span className="text-slate-300 print:hidden">→</span>
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
                          {it.plan_koch && <span className="font-mono text-xs text-slate-400">{it.plan_koch}</span>}
                          {it.etat && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{it.etat}</span>}
                          {here && <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">ici</span>}
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
  return <span className="rounded-full border border-emerald-200 bg-emerald-50 px-1.5 text-[11px] font-semibold text-emerald-700">×{n}</span>
}

function DatasheetList({ items }) {
  return (
    <ul className="space-y-1.5">
      {items.map((ds) => (
        <li key={ds.id} className="break-inside-avoid">
          <a
            href={ds.download_url}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
          >
            <span className="text-emerald-600" aria-hidden>⬇</span>
            <span className="flex-1 truncate">{ds.title}</span>
            {ds.size && <span className="text-xs text-slate-400">{Math.round(ds.size / 1024)} Ko</span>}
          </a>
        </li>
      ))}
    </ul>
  )
}

function Row({ label, value, mono }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`text-right font-medium text-slate-800 ${mono ? 'font-mono text-[13px]' : ''}`}>
        {value || '—'}
      </dd>
    </div>
  )
}

function SheetSkeleton() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse space-y-4">
      <div className="flex justify-between">
        <div className="h-9 w-44 rounded-lg bg-slate-200/70" />
        <div className="h-9 w-40 rounded-xl bg-slate-200/70" />
      </div>
      <div className="h-36 rounded-3xl bg-slate-200/70" />
      <div className="grid gap-4 lg:grid-cols-[1fr_260px_1fr]">
        <div className="h-72 rounded-2xl bg-slate-200/60" />
        <div className="h-72 rounded-2xl bg-slate-200/60" />
        <div className="h-72 rounded-2xl bg-slate-200/60" />
      </div>
    </div>
  )
}
