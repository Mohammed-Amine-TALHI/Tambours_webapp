/**
 * Small spinning ring. Defaults to a green (emerald) circle on light surfaces.
 * Pass `variant="onColor"` for use on top of an emerald button.
 */
export default function Spinner({ className = '', variant = 'green' }) {
  const colors =
    variant === 'onColor'
      ? 'border-white/40 border-t-white'
      : 'border-emerald-200 border-t-emerald-600'
  return (
    <span
      role="status"
      aria-label="Chargement"
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 ${colors} ${className}`}
    />
  )
}
