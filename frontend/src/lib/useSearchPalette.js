import { useEffect, useState } from 'react'

/** État d'ouverture de la palette de recherche + raccourci clavier Ctrl/Cmd+K. */
export function useSearchPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return { open, openPalette: () => setOpen(true), closePalette: () => setOpen(false) }
}
