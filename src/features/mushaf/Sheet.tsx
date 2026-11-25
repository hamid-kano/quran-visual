import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Mushaf, Surah } from '../../data/schemas'
import { loadSurahText } from '../../data/load'
import { useAsync } from '../../data/useAsync'
import { AyahMark } from '../../components/AyahText'
import { toArabicDigits } from '../../lib/arabic'
import { juzName, type ordinals } from '../../lib/mushaf'
import { divisionAt, pageRuns } from '../../lib/mushafPage'
import { BASMALA, showsBasmalaHeader } from '../../lib/quran'
import { tapFeedback } from '../../lib/native'

type Ord = ReturnType<typeof ordinals>

/** Line height of the mushaf text, in em. */
export const LINE = 2
/** The least space between two words of a printed line, in em; a line needing less is set smaller. */
const MIN_GAP = 0.2
/** A surah's last line shorter than this share of the line width stands centred, not spread. */
const SHORT_LINE = 0.75
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
  // the page sizes: every line as printed, a line too long for the page set a little smaller
  useLayoutEffect(() => {
    const el = body.current
    if (!el || p.large || !ready) return
    const fit = () => {
      el.style.fontSize = `${p.font}px`
      const cs = getComputedStyle(el)
      const room = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      if (!room) return
      el.querySelectorAll<HTMLElement>('[data-line]').forEach((line) => {
        line.style.fontSize = ''
        line.style.justifyContent = ''
        const words = [...line.children] as HTMLElement[]
        const gap = p.font * MIN_GAP * words.length // each word's own margin, both sides
        const natural = words.reduce((w, c) => w + c.getBoundingClientRect().width, 0) + gap
        if (natural > room) line.style.fontSize = `${(room / natural) * 0.995}em`
        // the opening pages, and a line that ends a surah well short of the margin: centred
        else if (opening || (line.dataset.end && natural < room * SHORT_LINE))
          line.style.justifyContent = 'center'
      })
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [p.font, p.large, p.width, p.height, ready, fontsReady, opening])

  // the larger, scrolling size: the text flows down the page
  useLayoutEffect(() => {
    const el = body.current
    if (!el || !p.large) return
    el.style.fontSize = `${p.font}px`
    el.style.setProperty('--lh', String(LINE))
  }, [p.font, p.large])

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
    tapFeedback()
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

  /** What makes an ayah (or one word of it, on a printed line) answer to a tap or a key. */
  const ayahProps = (at: Picked, focusable = true) => {
    const on = p.picked?.surah === at.surah && p.picked.ayah === at.ayah
    const live = p.reading?.surah === at.surah && p.reading.ayah === at.ayah
    return {
      'data-ayah': true,
      ...(focusable
        ? {
            role: 'button',
            tabIndex: 0,
            'aria-pressed': on,
            'aria-current': live || undefined,
            'aria-haspopup': 'dialog' as const,
          }
        : {}),
      ...holdHandlers(at),
      onClick: () => {
        if (held.current) held.current = false
        else p.onPick(on ? null : at)
      },
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          p.onPick(on ? null : at)
        }
      },
      className: `cursor-pointer rounded-sm [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none] [box-decoration-break:clone] pointer-coarse:select-none ${
        on ? 'bg-[#e9d49b]' : live ? 'bg-[#cfe6d8]' : ''
      }`,
    }
  }

  // the page as printed: its lines, each heading line and each line's words
  const printed = useMemo(
    () =>
      ready && !p.large ? printedLines(p.mushaf.lines[p.page - 1]!, runs, text.data, counts) : null,
    [ready, p.large, p.mushaf, p.page, runs, text, counts],
  )

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
        className={`min-h-0 flex-1 px-[22px] ${p.large ? 'overflow-y-auto overscroll-y-contain' : 'overflow-hidden'} flex flex-col ${p.large ? '' : 'justify-center'} ${printed ? 'px-[calc(22px-0.1em)]' : ''}`}
      >
        {printed ? (
          <div
            className="grid h-full font-quran text-ink"
            style={{ gridTemplateRows: 'repeat(15, minmax(0, 1fr))' }}
          >
            {printed.map((line, i) => {
              // the eight lines of the opening pages stand in the middle of the page
              const row = { gridRowStart: i + 1 + (printed.length < 15 ? 4 : 0) }
              if (line.kind === 'title')
                return (
                  <h2
                    key={i}
                    style={row}
                    className="mushaf-title my-[0.12em] flex items-center justify-center font-display font-bold"
                  >
                    <span style={{ fontSize: '0.8em' }}>سورة {name(line.surah)}</span>
                  </h2>
                )
              if (line.kind === 'basmala')
                return (
                  <p
                    key={i}
                    style={row}
                    className="flex items-center justify-center whitespace-nowrap"
                  >
                    {BASMALA}
                  </p>
                )
              return (
                <p
                  key={i}
                  data-line
                  data-end={line.end || undefined}
                  style={row}
                  className="flex items-center justify-between whitespace-nowrap"
                >
                  {line.words.map((w, j) => (
                    <span
                      key={j}
                      {...ayahProps(w, w.first)}
                      // a word's own space, on a line set to center
                      style={{ marginInline: `${MIN_GAP / 2}em` }}
                    >
                      {w.text}
                      {w.mark && (
                        <>
                          {'\u00a0'}
                          <AyahMark n={w.ayah} />
                        </>
                      )}
                    </span>
                  ))}
                </p>
              )
            })}
          </div>
        ) : (
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
                      {ayahs.map((a) => (
                        <span key={a.n}>
                          <span {...ayahProps({ surah: r.surah, ayah: a.n })}>
                            {a.text} <AyahMark n={a.n} />
                          </span>{' '}
                        </span>
                      ))}
                    </p>
                  </section>
                )
              })}
          </div>
        )}
      </div>

      <footer className="flex h-[38px] shrink-0 items-start justify-center pt-1 text-sm text-ink-soft">
        {toArabicDigits(p.page)}
      </footer>
    </article>
  )
}

// ---------- the printed lines ----------

interface Word extends Picked {
  text: string
  /** The ayah ends with this word: its number follows. */
  mark: boolean
  /** The ayah's first word on this page: the one a key reaches. */
  first: boolean
}
type Line =
  | { kind: 'title'; surah: number }
  | { kind: 'basmala' }
  | { kind: 'text'; words: Word[]; end: boolean }

/** Letters, as opposed to signs that stand alone between words (۞). */
const LETTER = /[\u0621-\u063A\u0641-\u064A\u0671]/u

/**
 * Lays the page's words on its printed lines: `counts` gives the words of each line, 0 for a
 * heading line, which takes the next heading of a surah opening on the page.
 */
function printedLines(
  counts: number[],
  runs: ReturnType<typeof pageRuns>,
  texts: { ayahs: { n: number; text: string }[] }[],
  ayahCounts: number[],
): Line[] {
  const words: (Word & { ends: boolean })[] = []
  const headings: Line[] = []
  runs.forEach((r, i) => {
    if (r.opens) {
      headings.push({ kind: 'title', surah: r.surah })
      if (showsBasmalaHeader(r.surah)) headings.push({ kind: 'basmala' })
    }
    for (const a of texts[i]!.ayahs.slice(r.from - 1, r.to)) {
      // a sign standing alone (۞) goes with the word after it, as the line data counts words
      const parts: string[] = []
      let sign = ''
      for (const t of a.text.split(/\s+/).filter(Boolean)) {
        if (LETTER.test(t)) {
          parts.push(sign ? `${sign} ${t}` : t)
          sign = ''
        } else sign = sign ? `${sign} ${t}` : t
      }
      parts.forEach((text, j) =>
        words.push({
          surah: r.surah,
          ayah: a.n,
          text,
          mark: j === parts.length - 1,
          first: j === 0,
          ends: j === parts.length - 1 && a.n === ayahCounts[r.surah - 1],
        }),
      )
    }
  })
  let at = 0
  return counts.map((n): Line => {
    if (n === 0) return headings.shift() ?? { kind: 'basmala' }
    const ws = words.slice(at, (at += n))
    return { kind: 'text', words: ws, end: ws.at(-1)?.ends ?? false }
  })
}
