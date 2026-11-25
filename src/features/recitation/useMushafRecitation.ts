import { holdUpdate } from '../../lib/appUpdate'
import { setMediaActions, setMediaState, setNowPlaying } from '../../lib/mediaSession'
import { toArabicDigits } from '../../lib/arabic'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  RECITERS,
  altUrl,
  ayahUrl,
  basmalaUrl,
  firstStep,
  nextStep,
  reciterLabel,
  type Step,
} from './reciters'
import { STORE, readSaved, type RecitationStatus, type Saved } from './useRecitation'

/** A step of the recitation in the mushaf: as in a surah, with the surah it belongs to. */
export interface MushafStep extends Step {
  surah: number
}

type Ref = [number, number]
/** The first and last ayah of the page an ayah is on. */
export type PageBounds = (surah: number, ayah: number) => { first: Ref; last: Ref }

/** The page being repeated, and how many more times it will be read after this one. */
interface PageLoop {
  first: Ref
  last: Ref
  left: number
}

/**
 * Recitation for the mushaf: from any ayah on, ayah by ayah, carrying on into the next surah
 * (with its basmala) until the end of the Quran or until stopped. Same reciter and repeat
 * settings as the surah reading page, kept together in this browser.
 */
export function useMushafRecitation(
  surahs: { ayahs: number; name: string }[],
  /** Told of every step as it starts, to keep the ayah in view. */
  onStep?: (s: MushafStep | null) => void,
  /** Where each page begins and ends, for repeating a whole page. */
  pageBounds?: PageBounds,
) {
  const onStepRef = useRef(onStep)
  useEffect(() => {
    onStepRef.current = onStep
  })
  const [saved, setSaved] = useState(readSaved)
  const reciter = RECITERS.find((r) => r.id === saved.reciter) ?? RECITERS[0]!
  const [status, setStatus] = useState<RecitationStatus>('idle')
  // a new version of the site waits while a recitation plays
  useEffect(() => {
    holdUpdate(status === 'playing' || status === 'loading')
    return () => holdUpdate(false)
  }, [status])
  const [step, setStep] = useState<MushafStep | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)
  const ahead = useRef<HTMLAudioElement | null>(null)
  const stepRef = useRef<MushafStep | null>(null)
  // one ayah only (its repeats included), then stop
  const single = useRef(false)
  const [only, setOnly] = useState(false)
  const settings = useRef({ reciter, repeat: saved.repeat, by: saved.by })
  const surahsRef = useRef(surahs)
  const boundsRef = useRef(pageBounds)
  useEffect(() => {
    settings.current = { reciter, repeat: saved.repeat, by: saved.by }
    surahsRef.current = surahs
    boundsRef.current = pageBounds
  }, [reciter, saved.repeat, saved.by, surahs, pageBounds])
  // repeating by page: the page being read and the readings of it still to come
  const loop = useRef<PageLoop | null>(null)
  /** How many times each ayah is read: once each when it is the page that repeats. */
  const ayahRepeat = () =>
    single.current || settings.current.by === 'ayah' ? settings.current.repeat : 1
  /** The repeat of the page an ayah is on, when the page is what repeats. */
  const loopAt = (surah: number, ayah: number): PageLoop | null => {
    const bounds = boundsRef.current
    if (single.current || settings.current.by !== 'page' || !bounds) return null
    return { ...bounds(surah, ayah), left: settings.current.repeat - 1 }
  }

  const urlOf = (s: MushafStep) =>
    s.basmala
      ? basmalaUrl(settings.current.reciter)
      : ayahUrl(settings.current.reciter, s.surah, s.ayah)

  /**
   * The step after `s`: the next ayah, or the opening of the next surah; when the page repeats,
   * its first ayah again after its last. With `commit`, the move is taken (the page's count of
   * readings goes down, or the next page begins); without, it is only looked at.
   */
  const after = (s: MushafStep, commit = false): MushafStep | null => {
    if (single.current && !s.basmala && s.repeatsLeft === 0) return null
    const l = loop.current
    const endsPage =
      !!l && !s.basmala && s.repeatsLeft === 0 && s.surah === l.last[0] && s.ayah === l.last[1]
    if (l && endsPage && l.left > 0) {
      if (commit) l.left--
      return { ...firstStep(l.first[0], l.first[1], ayahRepeat()), surah: l.first[0] }
    }
    const count = surahsRef.current[s.surah - 1]?.ayahs ?? 0
    const nn = nextStep(s, count, ayahRepeat())
    let n: MushafStep | null = nn ? { ...nn, surah: s.surah } : null
    if (!n && s.surah < surahsRef.current.length)
      n = { ...firstStep(s.surah + 1, 1, ayahRepeat()), surah: s.surah + 1 }
    if (commit && endsPage) loop.current = n ? loopAt(n.surah, n.ayah) : null
    return n
  }

  // reads only refs and state setters, so the first closure stays right for the reader's life
  const playStep = useRef((s: MushafStep | null) => {
    stepRef.current = s
    setStep(s)
    onStepRef.current?.(s)
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
    const n = after(s)
    if (n && urlOf(n) !== el.src) {
      ahead.current ??= new Audio()
      ahead.current.preload = 'auto'
      ahead.current.src = urlOf(n)
    }
    const name = surahsRef.current[s.surah - 1]?.name ?? ''
    setNowPlaying({
      title: s.basmala ? `سورة ${name}، البسملة` : `سورة ${name}، الآية ${toArabicDigits(s.ayah)}`,
      artist: reciterLabel(settings.current.reciter),
      album: 'آيات مرئية',
    })
  })

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
      playStep.current(s ? after(s, true) : null)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `after` reads only refs
  }, [])

  /** From an ayah on; with `one`, that ayah alone (no basmala before it), then stop. */
  const start = useCallback((surah: number, ayah: number, one = false) => {
    single.current = one
    setOnly(one)
    loop.current = loopAt(surah, ayah)
    const repeat = ayahRepeat()
    playStep.current(
      one
        ? { basmala: false, ayah, repeatsLeft: repeat - 1, surah }
        : { ...firstStep(surah, ayah, repeat), surah },
    )
  }, [])
  const pause = useCallback(() => audio.current?.pause(), [])
  const resume = useCallback(() => {
    audio.current?.play().catch(() => setStatus('error'))
  }, [])
  const stop = useCallback(() => playStep.current(null), [])
  const go = useCallback((delta: 1 | -1) => {
    const s = stepRef.current
    if (!s) return
    const list = surahsRef.current
    let surah = s.surah
    let ayah = s.ayah + delta
    if (ayah < 1) {
      if (surah === 1) return
      surah--
      ayah = list[surah - 1]!.ayahs
    } else if (ayah > list[surah - 1]!.ayahs) {
      if (surah === list.length) return
      surah++
      ayah = 1
    }
    loop.current = loopAt(surah, ayah)
    playStep.current({ ...firstStep(surah, ayah, ayahRepeat()), surah })
  }, [])

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
    /** The repeat applies to each ayah, or to the whole page. */
    repeatBy: saved.by,
    status,
    step,
    /** Reciting one ayah only. */
    only,
    start,
    pause,
    resume,
    stop,
    go,
    /** Choose the reciter; with `quiet`, keep what is playing as it is. */
    setReciter: (id: string, quiet = false) => {
      const next = RECITERS.find((r) => r.id === id)
      if (!next) return
      save({ reciter: id })
      settings.current = { ...settings.current, reciter: next }
      // carry on from the same ayah in the new voice
      const s = stepRef.current
      if (s && !quiet) playStep.current({ ...s })
    },
    setRepeat: (n: number) => {
      save({ repeat: n })
      settings.current = { ...settings.current, repeat: n }
      if (loop.current) loop.current.left = n - 1
    },
    /** Repeat each ayah, or the whole page; a recitation under way follows from here on. */
    setRepeatBy: (by: Saved['by']) => {
      save({ by })
      settings.current = { ...settings.current, by }
      const s = stepRef.current
      loop.current = s ? loopAt(s.surah, s.ayah) : null
    },
  }
}
