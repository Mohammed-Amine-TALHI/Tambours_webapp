import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import OperatorShell from './OperatorShell'
import { getConveyor } from '../../lib/schemaApi'

export default function ConveyorView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [conveyor, setConveyor] = useState(null)
  const [error, setError] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [aspect, setAspect] = useState(null) // image w/h → uniform overlay scale (round markers)

  useEffect(() => {
    setConveyor(null)
    setAspect(null)
    getConveyor(id).then(setConveyor).catch(() => setError('Convoyeur introuvable.'))
  }, [id])

  function openDrum(d) {
    navigate(`/app/drums/${d.id}`)
  }

  const drums = conveyor?.drums ?? []

  return (
    <OperatorShell
      breadcrumb={
        <>
          <Link to="/app" className="hover:text-emerald-700">Schéma</Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">{conveyor?.code ?? '…'}</span>
        </>
      }
    >
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {conveyor && (
        <div className="grid grid-cols-12 gap-6">
          <section className="col-span-12 lg:col-span-7">
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <h1 className="text-lg font-semibold text-slate-800">{conveyor.code}</h1>
              <p className="text-sm text-slate-500 mb-4">{conveyor.name}</p>

              {conveyor.image_url ? (
                <div className="relative inline-block w-full">
                  <img
                    src={conveyor.image_url}
                    alt={`Schéma ${conveyor.code}`}
                    onLoad={(e) => setAspect(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)}
                    className="w-full h-auto rounded-lg border border-slate-100 bg-white select-none"
                    draggable={false}
                  />
                  {aspect != null && (
                    <svg viewBox={`0 0 ${1000 * aspect} 1000`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                      {drums.flatMap((d) => (d.circles ?? []).map((c, i) => {
                        const cx = c.x * 1000 * aspect
                        const cy = c.y * 1000
                        const r = (c.r || 0.03) * 1000
                        const on = hovered === d.id
                        return (
                          <g
                            key={`${d.id}-${i}`}
                            className="cursor-pointer"
                            onMouseEnter={() => setHovered(d.id)}
                            onMouseLeave={() => setHovered(null)}
                            onClick={() => openDrum(d)}
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
              ) : (
                <div className="text-sm text-slate-400 py-10 text-center border border-dashed border-slate-200 rounded-lg">
                  Aucune image pour ce convoyeur.
                </div>
              )}

              {drums.some((d) => (d.circles ?? []).length === 0) && (
                <p className="mt-3 text-xs text-amber-600">
                  Certains tambours n'ont pas encore de repère sur l'image — utilisez la liste à droite.
                </p>
              )}
            </div>

            {conveyor.characteristics && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 mt-6">
                <h2 className="text-sm font-semibold text-slate-700 mb-2">Caractéristiques</h2>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                  {Object.entries(conveyor.characteristics).map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-slate-50 py-1">
                      <dt className="text-slate-500">{k}</dt>
                      <dd className="text-slate-800 font-medium">{String(v)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </section>

          {/* Drum list */}
          <aside className="col-span-12 lg:col-span-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Tambours ({drums.length})</h2>
              <ul className="space-y-2">
                {drums.map((d) => (
                  <li key={d.id}>
                    <button
                      onMouseEnter={() => setHovered(d.id)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => openDrum(d)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border transition flex items-center gap-3 ${
                        hovered === d.id ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      <span className="h-8 w-8 shrink-0 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-semibold">
                        {d.numero}
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-medium text-slate-800">
                          Tambour {d.numero}
                          {d.diametre && <span className="text-slate-400 font-normal"> · Ø{d.diametre}</span>}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {(d.components ?? []).map((c) => c.kind).join(' · ') || 'Aucun composant'}
                        </span>
                      </span>
                      <span className="text-slate-300">→</span>
                    </button>
                  </li>
                ))}
                {drums.length === 0 && <li className="text-sm text-slate-400">Aucun tambour.</li>}
              </ul>
            </div>
          </aside>
        </div>
      )}
    </OperatorShell>
  )
}
