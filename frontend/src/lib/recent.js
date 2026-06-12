/* Derniers tambours consultés — persistés en localStorage pour proposer
   des raccourcis dans la recherche et sur la page d'accueil. */

const KEY = 'tambours.recent-drums'
const MAX = 6

export function getRecentDrums() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function pushRecentDrum({ id, numero, conveyorCode }) {
  if (!id) return
  try {
    const list = getRecentDrums().filter((d) => d.id !== id)
    list.unshift({ id, numero, conveyorCode, at: Date.now() })
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
  } catch {
    /* stockage indisponible — fonctionnalité simplement désactivée */
  }
}
