const RELOADED = 'qv.reloaded'

/** True when a page's code could not be fetched: offline, or replaced by a newer deploy. */
export const isChunkError = (e: unknown) =>
  e instanceof Error &&
  /dynamically imported module|module script failed|Importing a module script/i.test(e.message)

/**
 * Reloads once for this address, so a visitor holding a page from before a new deploy gets the
 * new one. Returns false if this address was already reloaded, to show the error instead.
 */
export function reloadOnce(): boolean {
  try {
    if (sessionStorage.getItem(RELOADED) === location.href) return false
    sessionStorage.setItem(RELOADED, location.href)
  } catch {
    return false
  }
  location.reload()
  return true
}
