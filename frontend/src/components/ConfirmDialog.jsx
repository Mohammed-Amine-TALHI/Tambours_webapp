/* Boîte de confirmation maison — remplace window.confirm pour rester
   cohérent avec le design de la plateforme. */
export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmer', danger, onConfirm, onCancel }) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="px-5 pb-2 pt-5">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          {message && <p className="mt-1.5 text-sm text-slate-500">{message}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 pb-4 pt-3">
          <button
            onClick={onCancel}
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            className={`rounded-lg px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
