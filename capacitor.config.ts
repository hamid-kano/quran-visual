import type { CapacitorConfig } from '@capacitor/cli'

/**
 * The mobile app (Android and iOS): the site's app build (`pnpm build:app`, in dist-app/) carried
 * inside the app, so it opens at once and reads without a connection. Only the recitations come
 * from the network, from EveryAyah, as on the website.
 */
const config: CapacitorConfig = {
  // the app's permanent identity in the stores: to be confirmed before the first release
  appId: 'com.hypertech.ayatmaria',
  appName: 'آيات مرئية',
  webDir: 'dist-app',
  // the night colour of the interface, so no white flash shows before the page paints
  backgroundColor: '#0d1d33',
  android: {
    // the app's pages load from https://localhost inside the app
    allowMixedContent: false,
  },
  ios: {
    contentInset: 'never',
  },
  plugins: {
    SplashScreen: {
      // hidden by the app itself once the first page has painted (src/lib/native.ts)
      launchAutoHide: false,
      backgroundColor: '#0d1d33',
      showSpinner: false,
    },
    // Capacitor's own system bars: the page draws under them (viewport-fit=cover in index.html)
    // and keeps clear of them with env(safe-area-inset-*), as on a phone's browser
    SystemBars: {
      insetsHandling: 'native',
      initialViewportFitValueHint: 'cover',
      // light text and icons, for the night background
      style: 'DARK',
    },
  },
}

export default config
