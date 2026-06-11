/* Briques partagées des fiches techniques imprimables (tambour, convoyeur)
   et des pages d'administration : en-tête de document, sections numérotées,
   badges d'état, bouton d'impression. */

export function PrinterIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9V3h12v6" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" rx="1" />
    </svg>
  )
}

/** Bandeau d'en-tête vert commun à toutes les fiches. */
export function FicheHeader({ title, reference, date }) {
  return (
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
            <h1 className="text-xl font-bold sm:text-2xl">{title}</h1>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <p className="font-mono text-sm font-semibold tracking-wider">{reference}</p>
          <p className="text-xs text-emerald-200">Éditée le {date}</p>
        </div>
      </div>
    </header>
  )
}

/** Pied de fiche : plateforme, référence, date d'impression. */
export function FicheFooter({ reference, date }) {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 text-[11px] text-slate-400 sm:px-8 print:bg-white">
      <span>Plateforme Tambours — OCP · Installation KOCH</span>
      <span className="font-mono">{reference}</span>
      <span>Imprimé le {date}</span>
    </footer>
  )
}

/** Bouton « Imprimer la fiche » de la barre d'outils (écran uniquement). */
export function PrintButton({ label = 'Imprimer la fiche' }) {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-emerald-800 hover:to-teal-700 active:scale-[0.98]"
    >
      <PrinterIcon className="h-4 w-4" />
      {label}
    </button>
  )
}

/** Bouton d'impression flottant — mobile uniquement. */
export function FloatingPrintButton() {
  return (
    <button
      onClick={() => window.print()}
      title="Imprimer la fiche"
      className="fixed bottom-5 right-5 z-30 flex items-center justify-center rounded-full bg-emerald-700 p-3.5 text-white shadow-lg shadow-emerald-700/30 transition hover:bg-emerald-800 active:scale-95 sm:hidden print:hidden"
    >
      <PrinterIcon className="h-6 w-6" />
    </button>
  )
}

export function SectionTitle({ no, children }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="font-mono text-[11px] font-bold text-emerald-600">{no}</span>
      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-700">{children}</h3>
      <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
    </div>
  )
}

export function SpecTile({ label, value, mono }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 print:px-2 print:py-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      {/* truncate on screen only — printed fiches must show the full value */}
      <div className={`mt-0.5 truncate text-sm font-semibold text-slate-800 print:overflow-visible print:whitespace-normal print:text-xs ${mono ? 'font-mono' : ''}`}>
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

export function EtatBadge({ etat, large }) {
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
