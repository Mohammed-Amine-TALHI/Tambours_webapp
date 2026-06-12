import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { getRecentDrums } from '../lib/recent'

/* Palette de recherche globale (Ctrl+K) : convoyeurs, tambours et composants
   (type, plan KOCH/OCP, repère). Navigation clavier complète.
   Monter le composant uniquement quand la palette est ouverte :
   `{open && <SearchPalette onClose={…} />}` — l'état repart à zéro à chaque ouverture. */

export function SearchTrigger({ onOpen, className = '' }) {
  return (
    <button
      onClick={onOpen}
      aria-label="Rechercher"
      className={`inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-500 shadow-sm transition hover:border-emerald-300 hover:text-slate-700 ${className}`}
    >
      <SearchIcon className="h-4 w-4" />
      <span className="hidden md:inline">Rechercher…</span>
      <kbd className="hidden rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 md:inline">
        Ctrl K
      </kbd>
    </button>
  )
}

export default function SearchPalette({ onClose }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [fetched, setFetched] = useState(null) // { q, data } — dernière réponse reçue
  const [active, setActive] = useState(0)

  const q = query.trim()
  const results = q.length >= 2 && fetched?.q === q ? fetched.data : null
  const loading = q.length >= 2 && !results

  // Recherche avec anti-rebond ; les setState n'ont lieu que dans les callbacks.
  useEffect(() => {
    if (q.length < 2) return
    const t = setTimeout(() => {
      api.get('/api/search', { params: { q } })
        .then(({ data }) => setFetched({ q, data }))
        .catch(() => setFetched({ q, data: { conveyors: [], drums: [], components: [] } }))
    }, 250)
    return () => clearTimeout(t)
  }, [q])

  // Liste aplatie pour la navigation clavier.
  const items = useMemo(() => {
    const list = []
    if (!q) {
      for (const d of getRecentDrums()) {
        list.push({
          group: 'Récemment consultés',
          label: `Tambour ${d.numero}`,
          detail: d.conveyorCode ? `Convoyeur ${d.conveyorCode}` : '',
          to: `/app/drums/${d.id}`,
          icon: 'drum',
        })
      }
      return list
    }
    if (!results) return list
    for (const c of results.conveyors) {
      list.push({ group: 'Convoyeurs', label: c.code, detail: c.name ?? '', to: `/app/conveyors/${c.id}`, icon: 'conveyor' })
    }
    for (const d of results.drums) {
      list.push({
        group: 'Tambours',
        label: `Tambour ${d.numero}`,
        detail: d.conveyor ? `Convoyeur ${d.conveyor.code}` : '',
        to: `/app/drums/${d.id}`,
        icon: 'drum',
      })
    }
    for (const c of results.components) {
      list.push({
        group: 'Composants',
        label: c.type_label || c.kind,
        detail: [c.plan_koch && `KOCH ${c.plan_koch}`, c.plan_ocp && `OCP ${c.plan_ocp}`, c.conveyor && c.drum && `${c.conveyor.code} · T${c.drum.numero}`]
          .filter(Boolean)
          .join(' — '),
        to: c.drum ? `/app/drums/${c.drum.id}` : null,
        icon: 'component',
      })
    }
    return list
  }, [q, results])

  // Index actif borné à la liste courante (pas d'effet de resynchronisation).
  const cursor = items.length === 0 ? 0 : Math.min(active, items.length - 1)

  const go = useCallback(
    (item) => {
      if (!item?.to) return
      onClose()
      navigate(item.to)
    },
    [navigate, onClose],
  )

  function onKeyDown(e) {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(Math.min(cursor + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(Math.max(cursor - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      go(items[cursor])
    }
  }

  let lastGroup = null

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm print:hidden"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="mx-auto mt-[12vh] w-[min(40rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* champ de recherche */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-4">
          <SearchIcon className="h-5 w-5 shrink-0 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0) }}
            onKeyDown={onKeyDown}
            placeholder="Convoyeur, tambour, plan KOCH/OCP, type de composant…"
            className="w-full py-3.5 text-[15px] text-slate-800 placeholder-slate-400 focus:outline-none"
          />
          {loading && <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />}
          <button onClick={onClose} aria-label="Fermer" className="rounded-md border border-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 hover:bg-slate-50">
            Esc
          </button>
        </div>

        {/* résultats */}
        <div className="max-h-[55vh] overflow-y-auto p-2">
          {items.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-slate-400">
              {q.length >= 2
                ? loading ? 'Recherche…' : 'Aucun résultat.'
                : 'Tapez au moins 2 caractères — code convoyeur, numéro de plan, type…'}
            </p>
          )}
          {items.map((item, i) => {
            const header = item.group !== lastGroup ? item.group : null
            lastGroup = item.group
            return (
              <div key={`${item.group}-${item.to}-${i}`}>
                {header && (
                  <div className="px-3 pb-1 pt-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {header}
                  </div>
                )}
                <button
                  onClick={() => go(item)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                    i === cursor ? 'bg-emerald-50' : ''
                  }`}
                >
                  <ItemIcon kind={item.icon} active={i === cursor} />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm font-medium ${i === cursor ? 'text-emerald-800' : 'text-slate-800'}`}>
                      {item.label}
                    </span>
                    {item.detail && <span className="block truncate text-xs text-slate-400">{item.detail}</span>}
                  </span>
                  {i === cursor && <span aria-hidden className="text-xs text-emerald-500">↵</span>}
                </button>
              </div>
            )
          })}
        </div>

        <div className="flex items-center gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-2 text-[11px] text-slate-400">
          <span><kbd className="font-mono">↑↓</kbd> naviguer</span>
          <span><kbd className="font-mono">↵</kbd> ouvrir</span>
          <span><kbd className="font-mono">Esc</kbd> fermer</span>
        </div>
      </div>
    </div>
  )
}

function ItemIcon({ kind, active }) {
  const cls = `h-8 w-8 shrink-0 rounded-lg p-1.5 ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`
  if (kind === 'conveyor') {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="2" y="9" width="20" height="6" rx="3" />
        <circle cx="7" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="17" cy="12" r="1" />
      </svg>
    )
  }
  if (kind === 'drum') {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="6" y="5" width="12" height="14" rx="2.5" />
        <line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
      </svg>
    )
  }
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 2 7l10 5 10-5-10-5Z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" />
    </svg>
  )
}

function SearchIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}
