import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Mushaf, Surah } from '../../data/schemas'
import { loadSurahText } from '../../data/load'
import { useAsync } from '../../data/useAsync'
import { AyahMark } from '../../components/AyahText'
import { toArabicDigits } from '../../lib/arabic'
import { juzName, type ordinals } from '../../lib/mushaf'
import { divisionAt, pageRuns } from '../../lib/mushafPage'
import { BASMALA, showsBasmalaHeader } from '../../lib/quran'

type Ord = ReturnType<typeof ordinals>

/** Line height of the mushaf text, in em. */
export const LINE = 2
/** How far a short page's lines may open up: about two lines over thirteen. */
const MAX_STRETCH = 1.16
/** Height of the page's own head (surah, juz) and foot (page number), together, in px. */
export const PAGE_CHROME = 76

export interface Picked {
  surah: number
  ayah: number
}

export interface SheetProps {
  page: number
  width: number
  height: number
  /** Font size the page starts from; a page whose text runs longer is set a little smaller. */
  font: number
  /** Text larger than the page holds (the font given is already the larger one): it scrolls. */
  large: boolean
  mushaf: Mushaf
  ord: Ord
  surahs: Surah[]
  picked: Picked | null
  /** The ayah being recited, if any. */
  reading?: Picked | null
  onPick: (p: Picked | null) => void
  /** A long press on an ayah (or a right click, or the context-menu key): its full menu. */
  onHold: (p: Picked) => void
  /** A tap on the page outside any ayah. */
  onBackground: () => void
  /** The right-hand page of an open spread, or the left (shapes the spine). */
  side?: 'right' | 'left'
}

/** How long a press must last to open an ayah's menu, in ms (the platforms' own is about 500). */
const HOLD_MS = 450
/** A finger that moves this far, in px, is turning the page, not pressing. */
const HOLD_SLOP = 10

/** One page of the Madinah mushaf: its ayahs, with each surah's heading where the surah opens. */
export function Sheet(p: SheetProps) {
  const counts = useMemo(() => p.surahs.map((s) => s.ayahs), [p.surahs])
  const runs = useMemo(
    () => pageRuns(p.mushaf, p.ord, counts, p.page),
    [p.mushaf, p.ord, counts, p.page],
  )
  const text = useAsync(
    () => Promise.all(runs.map((r) => loadSurahText(r.surah))),
    runs.map((r) => r.surah).join(','),
  )
  const first = p.mushaf.pages[p.page - 1]!
  const juz = divisionAt(p.mushaf.juz, p.ord, first)
  const opening = p.page <= 2 // al-Fatiha and the opening of al-Baqara: short, centred lines

  // fit the text to the page: start from the given size, step down only when it runs over
  const body = useRef<HTMLDivElement>(null)
  const [fontsReady, setFontsReady] = useState(() => document.fonts?.status === 'loaded')
  useLayoutEffect(() => {
    if (fontsReady) return
    let live = true
    void document.fonts?.ready.then(() => live && setFontsReady(true))
    return () => {
      live = false
    }
  }, [fontsReady])
  const ready = text.status === 'ready'
  useLayoutEffect(() => {
    const el = body.current
    const inner = el?.firstElementChild as HTMLElement | null
    if (!el || !inner) return
    let f = p.font
    el.style.fontSize = `${f}px`
    el.style.setProperty('--lh', String(LINE))
    if (p.large || !ready) return
    const room = el.clientHeight
    for (let i = 0; i < 12 && inner.offsetHeight > room && f > 9; i++) {
      // text height grows about with the square of the size (more lines, each taller)
      f = i < 3 ? f * Math.sqrt(room / inner.offsetHeight) * 0.995 : f * 0.98
      el.style.fontSize = `${f}px`
    }
    // a page whose text ends a line or two short: open its lines a little, as the printed
    // page spreads its fifteen lines over the same height
    const h = inner.offsetHeight
    if (!opening && h > 0 && h < room)
      el.style.setProperty('--lh', String(LINE * Math.min(room / h, MAX_STRETCH)))
  }, [p.font, p.large, p.width, p.height, ready, fontsReady, opening])

  // long press: a timer from the touch, cancelled by movement or an early lift; the tap that
  // follows a long press is swallowed so it does not also pick or unpick the ayah
  const hold = useRef<{ timer: number; x: number; y: number } | null>(null)
  const held = useRef(false)
  const cancelHold = () => {
    if (hold.current) clearTimeout(hold.current.timer)
    hold.current = null
  }
  const openHold = (at: Picked) => {
    cancelHold()
    held.current = true
    navigator.vibrate?.(12)
    p.onHold(at)
  }
  const holdHandlers = (at: Picked) => ({
    onPointerDown: (e: React.PointerEvent) => {
      held.current = false
      if (e.pointerType === 'mouse') return // a mouse has its right click
      cancelHold()
      hold.current = {
        x: e.clientX,
        y: e.clientY,
        timer: window.setTimeout(() => openHold(at), HOLD_MS),
      }
    },
    onPointerMove: (e: React.PointerEvent) => {
      const h = hold.current
      if (h && Math.hypot(e.clientX - h.x, e.clientY - h.y) > HOLD_SLOP) cancelHold()
    },
    onPointerUp: cancelHold,
    onPointerCancel: cancelHold,
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault()
      if (!held.current) openHold(at)
    },
  })

  const name = (s: number) => p.surahs[s - 1]?.name ?? ''
  const spine =
    p.side === 'right'
      ? 'rounded-e-none sm:rounded-s-lg'
      : p.side === 'left'
        ? 'rounded-s-none sm:rounded-e-lg'
        : 'rounded-lg'

  return (
    <article
      className={`page relative flex shrink-0 flex-col ${spine}`}
      style={{ width: p.width, height: p.height }}
      aria-label={`الصفحة ${toArabicDigits(p.page)}`}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('[data-ayah]')) p.onBackground()
      }}
    >
      <header className="flex h-[38px] shrink-0 items-end justify-between px-[22px] pb-1 font-display text-[0.95rem] text-ink-soft">
        <span>سورة {name(first[0])}</span>
        <span>{juzName(juz)}</span>
      </header>

      <div
        ref={body}
        className={`min-h-0 flex-1 px-[22px] ${p.large ? 'overflow-y-auto overscroll-y-contain' : 'overflow-hidden'} flex flex-col ${p.large ? '' : 'justify-center'}`}
      >
        <div className={opening ? 'mx-auto w-[80%]' : ''}>
          {text.status === 'error' && (
            <p className="py-10 text-center font-[family-name:var(--font-ui)] text-base text-ink-soft">
              تعذّر تحميل الصفحة. تحقّق من الاتصال ثم أعد المحاولة.
            </p>
          )}
          {text.status === 'loading' && <div style={{ height: `${LINE * 15}em` }} aria-hidden />}
          {ready &&
            runs.map((r, i) => {
              const ayahs = text.data[i]!.ayahs.slice(r.from - 1, r.to)
              const ends = r.to === counts[r.surah - 1]
              return (
                <section key={r.surah} aria-label={`سورة ${name(r.surah)}`}>
                  {r.opens && (
                    <h2
                      className="mushaf-title flex items-center justify-center font-display font-bold text-ink"
                      style={{ height: 'calc(var(--lh) * 1em)' }}
                    >
                      <span style={{ fontSize: '0.8em' }}>سورة {name(r.surah)}</span>
                    </h2>
                  )}
                  {r.opens && showsBasmalaHeader(r.surah) && (
                    <p
                      className="text-center font-quran text-ink"
                      style={{ lineHeight: 'var(--lh)' }}
                    >
                      {BASMALA}
                    </p>
                  )}
                  <p
                    className="font-quran text-ink"
                    style={{
                      lineHeight: 'var(--lh)',
                      textAlign: opening ? 'center' : 'justify',
                      // a surah's last line is centred; a page that runs on keeps its last line
                      // at the start, like the line before a page turn
                      textAlignLast: opening || ends ? 'center' : 'start',
                    }}
                  >
                    {ayahs.map((a) => {
                      const on = p.picked?.surah === r.surah && p.picked.ayah === a.n
                      const live = p.reading?.surah === r.surah && p.reading.ayah === a.n
                      const at = { surah: r.surah, ayah: a.n }
                      return (
                        <span key={a.n}>
                          <span
                            data-ayah
                            role="button"
                            tabIndex={0}
                            aria-pressed={on}
                            aria-current={live || undefined}
                            aria-haspopup="dialog"
                            {...holdHandlers(at)}
                            onClick={() => {
                              if (held.current) held.current = false
                              else p.onPick(on ? null : at)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                p.onPick(on ? null : at)
                              }
                            }}
                            className={`cursor-pointer rounded-sm [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none] [box-decoration-break:clone] pointer-coarse:select-none ${
                              on ? 'bg-[#e9d49b]' : live ? 'bg-[#cfe6d8]' : ''
                            }`}
                          >
                            {a.text} <AyahMark n={a.n} />
                          </span>{' '}
                        </span>
                      )
                    })}
                  </p>
                </section>
              )
            })}
        </div>
      </div>

      <footer className="flex h-[38px] shrink-0 items-start justify-center pt-1 text-sm text-ink-soft">
        {toArabicDigits(p.page)}
      </footer>
    </article>
  )
}
