import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import OperatorShell from './OperatorShell'
import { getConveyor } from '../../lib/schemaApi'
import {
  EtatBadge, FicheFooter, FicheHeader, FloatingPrintButton,
  PrintButton, SectionTitle, SpecTile,
} from '../../components/fiche'

/* Fiche convoyeur imprimable : schéma repéré, tambours et caractéristiques
   réunis dans un seul document remis à l'opérateur. */

export default function ConveyorView() {
  const { id } = useParams()
  const navigate = useNavigate()
  // Loaded data is keyed by the route id so switching conveyor shows the
  // skeleton again without resetting state synchronously in the effect.
  const [loaded, setLoaded] = useState(null) // { id, conveyor }
  const [loadError, setLoadError] = useState(null) // { id, message }
  const [hovered, setHovered] = useState(null)

  useEffect(() => {
    let active = true
    getConveyor(id)
      .then((c) => active && setLoaded({ id, conveyor: c }))
      .catch(() => active && setLoadError({ id, message: 'Convoyeur introuvable.' }))
    return () => {
      active = false
    }
  }, [id])

  const conveyor = loaded?.id === id ? loaded.conveyor : null
  const error = loadError?.id === id ? loadError.message : null

  function openDrum(d) {
    navigate(`/app/drums/${d.id}`)
  }

  const drums = conveyor?.drums ?? []
  const reference = conveyor ? `FC-${conveyor.code}` : ''
  const printedOn = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  const characteristics = Object.entries(conveyor?.characteristics ?? {})

  return (
    <OperatorShell
      breadcrumb={
        <>
          <Link to="/app" className="hover:text-emerald-700">Schéma</Link>
          <span>/</span>
          <span className="font-medium text-slate-700">{conveyor?.code ?? '…'}</span>
        </>
      }
    >
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {!conveyor && !error && <SheetSkeleton />}

      {conveyor && (
        <div className="mx-auto max-w-6xl">
          {/* Toolbar — écran uniquement */}
          <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
            <Link
              to="/app"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-white hover:text-emerald-700"
            >
              <span aria-hidden>←</span> Schéma des installations
            </Link>
            <PrintButton />
          </div>

          {/* Fiche convoyeur */}
          <article className="print-sheet overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none">
            <FicheHeader title="Fiche convoyeur" reference={reference} date={printedOn} />

            {/* Identité */}
            <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-slate-50/70 px-5 py-4 sm:px-8">
              <div className="flex h-14 min-w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 px-3 font-mono text-lg font-black text-white">
                {conveyor.code}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-slate-900">{conveyor.name || conveyor.code}</h2>
                <p className="text-sm text-slate-500">
                  {conveyor.family && (
                    <>Famille <span className="font-semibold text-emerald-700">{conveyor.family}</span> · </>
                  )}
                  {drums.length} tambour{drums.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="space-y-7 px-5 py-6 sm:px-8 print:space-y-5 print:py-5">
              {/* 01 — Schéma & repères */}
              <section className="break-inside-avoid">
                <SectionTitle no="01">Schéma & repères des tambours</SectionTitle>
                {conveyor.image_url ? (
                  <MarkedSchema
                    key={conveyor.id}
                    conveyor={conveyor}
                    drums={drums}
                    hovered={hovered}
                    onHover={setHovered}
                    onOpen={openDrum}
                  />
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
                    Aucune image pour ce convoyeur.
                  </div>
                )}
                {drums.some((d) => (d.circles ?? []).length === 0) && (
                  <p className="mt-2 text-xs text-amber-600 print:hidden">
                    Certains tambours n'ont pas encore de repère sur l'image — utilisez la liste ci-dessous.
                  </p>
                )}
              </section>

              {/* 02 — Tambours */}
              <section>
                <SectionTitle no="02">Tambours ({drums.length})</SectionTitle>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3 print:gap-2">
                  {drums.map((d) => (
                    <button
                      key={d.id}
                      onMouseEnter={() => setHovered(d.id)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => openDrum(d)}
                      className={`flex items-center gap-3 break-inside-avoid rounded-2xl border px-3 py-2.5 text-left transition ${
                        hovered === d.id
                          ? 'border-emerald-400 bg-emerald-50'
                          : 'border-slate-200 bg-white hover:border-emerald-300'
                      }`}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-sm font-bold text-white">
                        {d.numero}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-800">
                          Tambour {d.numero}
                          {d.diametre && <span className="font-normal text-slate-400"> · Ø{d.diametre}</span>}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {(d.components ?? []).map((c) => c.kind).join(' · ') || 'Aucun composant'}
                        </span>
                      </span>
                      {d.etat && <EtatBadge etat={d.etat} />}
                      <span className="text-slate-300 print:hidden" aria-hidden>→</span>
                    </button>
                  ))}
                  {drums.length === 0 && (
                    <p className="text-sm text-slate-400">Aucun tambour.</p>
                  )}
                </div>
              </section>

              {/* 03 — Caractéristiques */}
              {characteristics.length > 0 && (
                <section className="break-inside-avoid">
                  <SectionTitle no="03">Caractéristiques techniques</SectionTitle>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-4 print:gap-2">
                    {characteristics.map(([k, v]) => (
                      <SpecTile key={k} label={k} value={String(v)} />
                    ))}
                  </div>
                </section>
              )}
            </div>

            <FicheFooter reference={reference} date={printedOn} />
          </article>

          <FloatingPrintButton />
        </div>
      )}
    </OperatorShell>
  )
}

/** Image du convoyeur + repères cliquables ; possède son propre ratio d'image. */
function MarkedSchema({ conveyor, drums, hovered, onHover, onOpen }) {
  const [aspect, setAspect] = useState(null) // image w/h → uniform overlay scale (round markers)

  return (
    <div className="relative inline-block w-full overflow-hidden rounded-2xl border border-slate-200">
      <img
        src={conveyor.image_url}
        alt={`Schéma ${conveyor.code}`}
        onLoad={(e) => setAspect(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)}
        className="h-auto w-full select-none bg-white"
        draggable={false}
      />
      {aspect != null && (
        <svg viewBox={`0 0 ${1000 * aspect} 1000`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          {drums.flatMap((d) => (d.circles ?? []).map((c, i) => {
            const cx = c.x * 1000 * aspect
            const cy = c.y * 1000
            const r = (c.r || 0.03) * 1000
            const on = hovered === d.id
            return (
              <g
                key={`${d.id}-${i}`}
                className="cursor-pointer"
                onMouseEnter={() => onHover(d.id)}
                onMouseLeave={() => onHover(null)}
                onClick={() => onOpen(d)}
              >
                <circle cx={cx} cy={cy} r={r}
                  fill={on ? 'rgba(5,150,105,0.35)' : 'rgba(5,150,105,0.12)'}
                  stroke={on ? '#059669' : 'rgba(5,150,105,0.6)'}
                  strokeWidth={on ? 6 : 4} />
                <text x={cx} y={cy} dominantBaseline="central" textAnchor="middle"
                  fontSize="26" fontWeight="700" fill="#065f46"
                  stroke="#ffffff" strokeWidth={3} paintOrder="stroke">
                  {d.numero}
                </text>
              </g>
            )
          }))}
        </svg>
      )}
    </div>
  )
}

function SheetSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse space-y-4">
      <div className="flex justify-between">
        <div className="h-9 w-52 rounded-lg bg-slate-200/70" />
        <div className="h-9 w-40 rounded-xl bg-slate-200/70" />
      </div>
      <div className="h-32 rounded-3xl bg-slate-200/70" />
      <div className="h-80 rounded-2xl bg-slate-200/60" />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="h-16 rounded-2xl bg-slate-200/60" />
        <div className="h-16 rounded-2xl bg-slate-200/60" />
        <div className="h-16 rounded-2xl bg-slate-200/60" />
      </div>
    </div>
  )
}
