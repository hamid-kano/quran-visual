import { holdUpdate } from '../../lib/appUpdate'
import { setMediaActions, setMediaState, setNowPlaying } from '../../lib/mediaSession'
import { toArabicDigits } from '../../lib/arabic'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  RECITERS,
  altUrl,
  ayahUrl,
  reciterLabel,
  basmalaUrl,
  firstStep,
  nextStep,
  type Reciter,
  type Step,
} from './reciters'

export type RecitationStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error'

export const STORE = 'qv.recitation'
export interface Saved {
  reciter: string
  repeat: number
}
export function readSaved(): Saved {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) ?? '{}') as Partial<Saved>
    return {
      reciter: RECITERS.some((r) => r.id === v.reciter) ? v.reciter! : RECITERS[0]!.id,
      repeat: [1, 3, 5].includes(v.repeat ?? 0) ? v.repeat! : 1,
    }
  } catch {
    return { reciter: RECITERS[0]!.id, repeat: 1 }
  }
}

/**
 * Plays a surah ayah by ayah, in order, with the basmala first where it is recited.
 * One audio element is reused; the next file is fetched ahead so ayahs follow without a gap.
 */
export function useRecitation(surah: number, surahName: string, ayahCount: number) {
  const [saved, setSaved] = useState(readSaved)
  const reciter: Reciter = RECITERS.find((r) => r.id === saved.reciter) ?? RECITERS[0]!
  const [status, setStatus] = useState<RecitationStatus>('idle')
  // a new version of the site waits while a recitation plays
  useEffect(() => {
    holdUpdate(status === 'playing' || status === 'loading')
    return () => holdUpdate(false)
  }, [status])
  const [step, setStep] = useState<Step | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)
  const ahead = useRef<HTMLAudioElement | null>(null)
  const stepRef = useRef<Step | null>(null)
  const settings = useRef({ reciter, repeat: saved.repeat })
  // keep the latest choices for the audio event handlers
  useEffect(() => {
    settings.current = { reciter, repeat: saved.repeat }
  }, [reciter, saved.repeat])

  const urlOf = useCallback(
    (s: Step) =>
      s.basmala
        ? basmalaUrl(settings.current.reciter)
        : ayahUrl(settings.current.reciter, surah, s.ayah),
    [surah],
  )

  const playStep = useCallback(
    (s: Step | null) => {
      stepRef.current = s
      setStep(s)
      const el = audio.current
      if (!el) return
      if (!s) {
        el.pause()
        setStatus('idle')
        return
      }
      el.src = urlOf(s)
      setStatus('loading')
      el.play().catch(() => setStatus('error'))
      // fetch the following file in advance
      const n = nextStep(s, ayahCount, settings.current.repeat)
      if (n && urlOf(n) !== el.src) {
        ahead.current ??= new Audio()
        ahead.current.preload = 'auto'
        ahead.current.src = urlOf(n)
      }
      setNowPlaying({
        title: s.basmala
          ? `سورة ${surahName}، البسملة`
          : `سورة ${surahName}، الآية ${toArabicDigits(s.ayah)}`,
        artist: reciterLabel(settings.current.reciter),
        album: 'آيات مرئية',
      })
    },
    [ayahCount, surahName, urlOf],
  )

  // one audio element for the life of the panel
  useEffect(() => {
    const el = new Audio()
    el.preload = 'auto'
    audio.current = el
    const onPlaying = () => setStatus('playing')
    const onWaiting = () => setStatus('loading')
    const onPause = () => !el.ended && stepRef.current && setStatus('paused')
    const onError = () => {
      // the same file at EveryAyah's other quality, before giving up
      const alt = el.src && altUrl(settings.current.reciter, el.src)
      if (alt) {
        el.src = alt
        el.play().catch(() => setStatus('error'))
      } else setStatus('error')
    }
    const onEnded = () => {
      const s = stepRef.current
      playStep(s ? nextStep(s, ayahCount, settings.current.repeat) : null)
    }
    el.addEventListener('playing', onPlaying)
    el.addEventListener('waiting', onWaiting)
    el.addEventListener('pause', onPause)
    el.addEventListener('error', onError)
    el.addEventListener('ended', onEnded)
    return () => {
      el.pause()
      el.removeAttribute('src')
      el.removeEventListener('playing', onPlaying)
      el.removeEventListener('waiting', onWaiting)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('error', onError)
      el.removeEventListener('ended', onEnded)
      audio.current = null
    }
  }, [ayahCount, playStep])

  const start = useCallback(
    (from = 1) => playStep(firstStep(surah, from, settings.current.repeat)),
    [playStep, surah],
  )
  const pause = useCallback(() => audio.current?.pause(), [])
  const resume = useCallback(() => {
    audio.current?.play().catch(() => setStatus('error'))
  }, [])
  const stop = useCallback(() => playStep(null), [playStep])
  const go = useCallback(
    (delta: number) => {
      const s = stepRef.current
      const at = s ? s.ayah + delta : 1
      if (at >= 1 && at <= ayahCount)
        playStep({ basmala: false, ayah: at, repeatsLeft: settings.current.repeat - 1 })
    },
    [ayahCount, playStep],
  )

  // the controls outside the page (lock screen, notification, headphones)
  useEffect(() => {
    setMediaActions({
      play: resume,
      pause,
      nexttrack: () => go(1),
      previoustrack: () => go(-1),
      stop,
    })
    return () =>
      setMediaActions({ play: null, pause: null, nexttrack: null, previoustrack: null, stop: null })
  }, [go, pause, resume, stop])
  useEffect(() => {
    setMediaState(
      status === 'idle' ? 'none' : status === 'paused' || status === 'error' ? 'paused' : 'playing',
    )
  }, [status])

  const save = (next: Partial<Saved>) => {
    const v = { ...saved, ...next }
    setSaved(v)
    try {
      localStorage.setItem(STORE, JSON.stringify(v))
    } catch {
      /* private browsing: keep the choice for this visit only */
    }
  }

  return {
    reciter,
    repeat: saved.repeat,
    status,
    step,
    start,
    pause,
    resume,
    stop,
    go,
    setReciter: (id: string) => {
      save({ reciter: id })
      const next = RECITERS.find((r) => r.id === id)
      if (!next) return
      settings.current = { ...settings.current, reciter: next }
      // continue the same ayah in the new voice
      const s = stepRef.current
      if (s) playStep({ ...s })
    },
    setRepeat: (n: number) => {
      save({ repeat: n })
      settings.current = { ...settings.current, repeat: n }
    },
  }
}
