import { Capacitor } from '@capacitor/core'

/**
 * Running inside the mobile app (Capacitor on Android or iOS), not in a browser. The native
 * plugins are loaded only there, so the website's code does not carry them.
 */
export const NATIVE = Capacitor.isNativePlatform()

/**
 * The app's start: hide the splash once the first page has painted, and give Android's back
 * button the order an app user expects: close what is open (a menu, a sheet), then go back a
 * page, and on the first page leave the app in the background rather than close it.
 */
export function startNative() {
  if (!NATIVE) return
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      void import('@capacitor/splash-screen').then(({ SplashScreen }) =>
        SplashScreen.hide({ fadeOutDuration: 250 }),
      )
    }),
  )
  void import('@capacitor/app').then(({ App }) =>
    App.addListener('backButton', ({ canGoBack }) => {
      // the drawer and the sheets are modal dialogs, closed as Escape closes them
      const dialogs = document.querySelectorAll('dialog[open]')
      const top = dialogs[dialogs.length - 1]
      if (top) {
        top.dispatchEvent(new Event('cancel', { cancelable: true }))
        return
      }
      if (canGoBack) history.back()
      else void App.minimizeApp()
    }),
  )
}

/** Keep the screen on while reading the mushaf; returns the call that lets it sleep again. */
export function keepAwake(): () => void {
  if (!NATIVE) return () => {}
  const plugin = import('@capacitor-community/keep-awake').then((m) => m.KeepAwake)
  void plugin.then((k) => k.keepAwake()).catch(() => {})
  return () => void plugin.then((k) => k.allowSleep()).catch(() => {})
}

/** Share text through the system's share sheet; false where none is offered. */
export async function shareText(text: string): Promise<boolean> {
  if (NATIVE) {
    const { Share } = await import('@capacitor/share')
    await Share.share({ text })
    return true
  }
  if (typeof navigator.share === 'function') {
    await navigator.share({ text })
    return true
  }
  return false
}

/** The system can share text here: always in the app, in a browser where it offers it. */
export const canShareText = () => NATIVE || typeof navigator.share === 'function'

/** A light tap felt in the hand (a long press taking effect): the app's haptics, or vibration. */
export function tapFeedback() {
  if (NATIVE)
    void import('@capacitor/haptics')
      .then(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Light }))
      .catch(() => {})
  else navigator.vibrate?.(12)
}
