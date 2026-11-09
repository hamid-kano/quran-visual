/**
 * Keeps visitors on the latest deploy. The service worker fetches a new version in the
 * background and takes over the page (skipWaiting and clientsClaim, from the autoUpdate
 * setting), but the page on screen is still running the old code. So when the new worker takes
 * over, the page reloads into the new version right away, unless a recitation is playing. Then
 * the reload waits until the visitor leaves the page (switches tab or app), and stays unseen.
 * An installed app is checked for updates whenever it comes back to the screen.
 */
let busy = false
let pending = false

/** A recitation is playing: hold any reload until it stops and the page is out of view. */
export function holdUpdate(on: boolean) {
  busy = on
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return
  const sw = navigator.serviceWorker
  // the very first install takes over a page that already runs the current code: no reload
  const hadWorker = !!sw.controller
  let reloaded = false
  const reload = () => {
    if (reloaded) return
    reloaded = true
    location.reload()
  }
  sw.addEventListener('controllerchange', () => {
    if (!hadWorker) return
    if (busy) pending = true
    else reload()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && pending) reload()
    else if (document.visibilityState === 'visible')
      void sw.getRegistration().then((r) => r?.update().catch(() => {}))
  })
  window.addEventListener('load', () => {
    sw.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(
      () => {},
    )
  })
}
