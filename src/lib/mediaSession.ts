import { NATIVE } from './native'

/**
 * The recitation's controls outside the page: the lock screen, the notification shade, the
 * headphones' buttons. On the website through the browser's Media Session API; in the app
 * through @capgo/capacitor-media-session, whose Android side also runs the foreground service
 * that keeps the recitation playing with the screen locked (it starts while the state is
 * `playing` and stops when it is not, so the state must be kept current).
 */
export type MediaAction = 'play' | 'pause' | 'nexttrack' | 'previoustrack' | 'stop'
export type MediaState = 'playing' | 'paused' | 'none'
export interface NowPlaying {
  title: string
  artist: string
  album: string
}

const plugin = NATIVE ? import('@capgo/capacitor-media-session').then((m) => m.MediaSession) : null
const web = !NATIVE && typeof navigator !== 'undefined' && 'mediaSession' in navigator
const ignore = () => {}

export function setNowPlaying(n: NowPlaying) {
  if (plugin) void plugin.then((p) => p.setMetadata(n)).catch(ignore)
  else if (web && typeof MediaMetadata !== 'undefined')
    navigator.mediaSession.metadata = new MediaMetadata(n)
}

export function setMediaState(state: MediaState) {
  if (plugin) void plugin.then((p) => p.setPlaybackState({ playbackState: state })).catch(ignore)
  else if (web) navigator.mediaSession.playbackState = state
}

/** Handlers for the outside controls; null removes one. */
export function setMediaActions(handlers: Partial<Record<MediaAction, (() => void) | null>>) {
  for (const [action, fn] of Object.entries(handlers) as [MediaAction, (() => void) | null][]) {
    if (plugin)
      void plugin.then((p) => p.setActionHandler({ action }, fn ? () => fn() : null)).catch(ignore)
    else if (web) {
      try {
        navigator.mediaSession.setActionHandler(action, fn)
      } catch {
        /* an action this browser does not offer */
      }
    }
  }
}
