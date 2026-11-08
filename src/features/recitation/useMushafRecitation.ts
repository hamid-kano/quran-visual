import { useCallback, useEffect, useRef, useState } from 'react'
import { RECITERS, altUrl, ayahUrl, basmalaUrl, firstStep, nextStep, type Step } from './reciters'
import { STORE, readSaved, type RecitationStatus, type Saved } from './useRecitation'

/** A step of the recitation in the mushaf: as in a surah, with the surah it belongs to. */
export interface MushafStep extends Step {
  surah: number
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
) {
  const onStepRef = useRef(onStep)
  useEffect(() => {
    onStepRef.current = onStep
  })
  const [saved, setSaved] = useState(readSaved)
  const reciter = RECITERS.find((r) => r.id === saved.reciter) ?? RECITERS[0]!
  const [status, setStatus] = useState<RecitationStatus>('idle')
  const [step, setStep] = useState<MushafStep | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)
  const ahead = useRef<HTMLAudioElement | null>(null)
  const stepRef = useRef<MushafStep | null>(null)
  // one ayah only (its repeats included), then stop
  const single = useRef(false)
  const [only, setOnly] = useState(false)
  const settings = useRef({ reciter, repeat: saved.repeat })
  const surahsRef = useRef(surahs)
  useEffect(() => {
    settings.current = { reciter, repeat: saved.repeat }
    surahsRef.current = surahs
  }, [reciter, saved.repeat, surahs])

  const urlOf = (s: MushafStep) =>
    s.basmala
      ? basmalaUrl(settings.current.reciter)
      : ayahUrl(settings.current.reciter, s.surah, s.ayah)

  /** The step after `s`: the next ayah, or the opening of the next surah. */
  const after = (s: MushafStep): MushafStep | null => {
    if (single.current && !s.basmala && s.repeatsLeft === 0) return null
    const count = surahsRef.current[s.surah - 1]?.ayahs ?? 0
    const n = nextStep(s, count, settings.current.repeat)
    if (n) return { ...n, surah: s.surah }
    if (s.surah >= surahsRef.current.length) return null
    return { ...firstStep(s.surah + 1, 1, settings.current.repeat), surah: s.surah + 1 }
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
    if ('mediaSession' in navigator && typeof MediaMetadata !== 'undefined') {
      const name = surahsRef.current[s.surah - 1]?.name ?? ''
      navigator.mediaSession.metadata = new MediaMetadata({
        title: s.basmala ? `سورة ${name}، البسملة` : `سورة ${name}، الآية ${s.ayah}`,
        artist: settings.current.reciter.name,
        album: 'آيات مرئية',
      })
    }
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
      playStep.current(s ? after(s) : null)
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
  }, [])

  /** From an ayah on; with `one`, that ayah alone (no basmala before it), then stop. */
  const start = useCallback((surah: number, ayah: number, one = false) => {
    single.current = one
    setOnly(one)
    const repeat = settings.current.repeat
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
    playStep.current({ ...firstStep(surah, ayah, settings.current.repeat), surah })
  }, [])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    const ms = navigator.mediaSession
    ms.setActionHandler('play', resume)
    ms.setActionHandler('pause', pause)
    ms.setActionHandler('nexttrack', () => go(1))
    ms.setActionHandler('previoustrack', () => go(-1))
    return () => {
      for (const a of ['play', 'pause', 'nexttrack', 'previoustrack'] as const)
        ms.setActionHandler(a, null)
    }
  }, [go, pause, resume])

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
    },
  }
}
