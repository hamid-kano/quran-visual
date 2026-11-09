import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import type { Mushaf, Surah } from '../../data/schemas'
import { loadMushaf, loadSurahText, loadSurahs } from '../../data/load'
import { useAsync } from '../../data/useAsync'
import { ErrorNote, Loading } from '../../components/Status'
import { Drawer } from '../../components/Drawer'
import {
  IconBack,
  IconChevronDown,
  IconClose,
  IconCopy,
  IconForward,
  IconInfo,
  IconMenu,
  IconPause,
  IconPlay,
  IconStop,
} from '../../components/icons'
import { TIME, countOf, toArabicDigits } from '../../lib/arabic'
import { juzName, khatma, ordinals, pageOf } from '../../lib/mushaf'
import { PAGE_COUNT, divisionAt, parsePage, spreadOf, spreadPages } from '../../lib/mushafPage'
import { daysBetween, localDay, storedPlan } from '../../lib/khatmaPlan'
import { LINE, PAGE_CHROME, Sheet, type Picked } from './Sheet'
import { reciterLabel } from '../recitation/reciters'
import { ReciterSheet } from '../recitation/ReciterPicker'
import { AyahMenu } from './AyahMenu'
import { useMushafRecitation } from '../recitation/useMushafRecitation'

type Ord = ReturnType<typeof ordinals>

// ---------- the reader's settings, kept in this browser only ----------

const PAGE_KEY = 'qv.mushafPage'
const SIZE_KEY = 'qv.mushafSize'
/** Before the middle size existed: true was the larger, scrolling text. */
const LARGE_KEY = 'qv.mushafLarge'

/**
 * The text size: the whole page at the size its line width allows; the largest size at which
 * the whole page still fits the screen; or larger still, the page scrolling.
 */
type Size = 'page' | 'fit' | 'scroll'
const SIZES: Size[] = ['page', 'fit', 'scroll']
function storedSize(): Size {
  const v = stored(SIZE_KEY)
  if (SIZES.includes(v as Size)) return v as Size
  return stored(LARGE_KEY) === true ? 'scroll' : 'page'
}
function stored(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null')
  } catch {
    return null
  }
}
function store(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    // private windows and blocked storage: the setting simply is not kept
  }
}

// ---------- page geometry ----------

/**
 * Width of a line in em of the text. Measured over all pages, at 17.5em the flowing text of a
 * page comes closest to the printed page's line count (within a line on three pages in four);
 * a page that runs longer is set slightly smaller, one that runs shorter has its lines opened.
 */
const LINE_EMS = 17.5
/** Space beside the text inside the page frame, each side, in px. */
const PAGE_PAD_X = 22

interface Layout {
  spread: boolean
  pageW: number
  pageH: number
  font: number
  /** The text is larger than the page holds, and the page scrolls. */
  scroll: boolean
  /** This screen has room for a larger text that still shows the whole page. */
  canFit: boolean
}

/** The middle size is offered only where it is clearly larger than the whole-page size. */
const FIT_GAIN = 1.06

/** Smallest text a whole page may be set in; below it (a phone held sideways) the page scrolls. */
const MIN_FIT_FONT = 14

/**
 * One page, or two side by side when the screen is wide enough to keep each one legible. The
 * whole page fits the screen; with the larger text, or on a screen too short for a whole page,
 * the page takes the full width and scrolls.
 */
function layoutFor(W: number, H: number, size: Size): Layout {
  const large = size === 'scroll'
  const margin = W < 500 || H < 500 ? 6 : 16
  const pageH = Math.floor(H - 2 * margin)
  const byHeight = (pageH - PAGE_CHROME) / (15 * LINE)
  const widthFor = (f: number) => f * LINE_EMS + 2 * PAGE_PAD_X
  const textFor = (w: number) => (w - 2 * PAGE_PAD_X) / LINE_EMS
  if (byHeight < MIN_FIT_FONT) {
    const pageW = Math.floor(Math.min(W - 2 * margin, 760))
    const font = Math.min(textFor(pageW) * (large ? 1.25 : 1), large ? 32 : 26)
    return { spread: false, pageW, pageH, font, scroll: true, canFit: false }
  }
  const twoFit = W - 2 * margin >= 2 * widthFor(Math.min(byHeight, 26)) && W > H
  const room = twoFit ? (W - 2 * margin) / 2 : W - 2 * margin
  if (large) {
    const font = Math.min(textFor(room) * 1.25, 44)
    return { spread: twoFit, pageW: Math.floor(room), pageH, font, scroll: true, canFit: true }
  }
  const pageW = Math.min(room, widthFor(byHeight))
  const font = Math.min(byHeight, textFor(pageW), 40)
  // the largest text at which the page, across the full width, still fits the height: the
  // lines run about 15·f/textFor(room) and each is f·LINE high, so f² ≈ byHeight·textFor(room)
  const fitFont = Math.min(Math.sqrt(byHeight * textFor(room)), 44)
  const canFit = fitFont >= font * FIT_GAIN
  if (size === 'fit' && canFit)
    // a shade over, for the page to bring down to what it actually holds
    return {
      spread: twoFit,
      pageW: Math.floor(room),
      pageH,
      font: fitFont * 1.03,
      scroll: false,
      canFit,
    }
  return { spread: twoFit, pageW: Math.floor(pageW), pageH, font, scroll: false, canFit }
}

// ---------- the reader ----------

function Reader({ start, mushaf, surahs }: { start: number; mushaf: Mushaf; surahs: Surah[] }) {
  const navigate = useNavigate()
  const ord: Ord = useMemo(() => ordinals(surahs.map((s) => s.ayahs)), [surahs])
  const [page, setPageState] = useState(start)
  // the latest page, for handlers that run between renders (swipes, keys)
  const pageRef = useRef(start)
  const setPage = (p: number) => {
    pageRef.current = p
    setPageState(p)
  }
  const [size, setSize] = useState<Size>(storedSize)
  const [menu, setMenu] = useState(false)
  const [picked, setPicked] = useState<Picked | null>(null)
  // the ayah whose full menu is open (a long press)
  const [held, setHeld] = useState<Picked | null>(null)
  // the list of reciters, opened from the player or the menu
  const [reciters, setReciters] = useState(false)
  // on a phone or tablet the mushaf opens on the whole screen; a tap on the page brings the
  // bars, another hides them
  const [bars, setBars] = useState(
    () => !(typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches),
  )

  // the pager's size decides one page or two, and the size of the text
  const scroller = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{ W: number; H: number } | null>(null)
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const measure = () => setBox({ W: el.clientWidth, H: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const layout = box ? layoutFor(box.W, box.H, size) : null
  const spread = layout?.spread ?? false
  const items = spread ? spreadOf(PAGE_COUNT) : PAGE_COUNT
  const indexOf = useCallback((p: number) => (spread ? spreadOf(p) - 1 : p - 1), [spread])
  const current = indexOf(page)
  const sideRoom = !!layout && !!box && (box.W - layout.pageW * (spread ? 2 : 1)) / 2 >= 56

  /** Brings a page into view: at once for a jump, gliding for the next or previous page. */
  const show = useCallback(
    (p: number, glide = false) => {
      const target = Math.min(PAGE_COUNT, Math.max(1, p))
      setPage(target)
      setPicked(null)
      const item = scroller.current?.children[indexOf(target)] as HTMLElement | undefined
      item?.scrollIntoView({
        behavior: glide ? 'smooth' : 'instant',
        inline: 'start',
        block: 'nearest',
      })
    },
    [indexOf],
  )
  const showRef = useRef(show)
  const spreadRef = useRef(spread)
  useEffect(() => {
    showRef.current = show
    spreadRef.current = spread
  })
  // the recitation turns the pages: the ayah being recited is always in view
  const rec = useMushafRecitation(surahs, (s) => {
    if (!s) return
    const p = pageOf(mushaf, ord, [s.surah, s.ayah])
    const now = pageRef.current
    const open = spreadRef.current ? spreadPages(spreadOf(now)) : [now]
    if (!open.includes(p)) showRef.current(p, true)
  })
  const reading =
    rec.step && !rec.step.basmala ? { surah: rec.step.surah, ayah: rec.step.ayah } : null
  const step = useCallback(
    (dir: 1 | -1) => {
      const p = pageRef.current
      show(spread ? spreadPages(spreadOf(p) + dir)[0] : p + dir, true)
    },
    [show, spread],
  )

  // place the current page whenever the arrangement changes (first view, rotation, resize)
  useLayoutEffect(() => {
    if (!layout) return
    const item = scroller.current?.children[indexOf(pageRef.current)] as HTMLElement | undefined
    item?.scrollIntoView({ behavior: 'instant', inline: 'start', block: 'nearest' })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the arrangement matters
  }, [spread, layout?.pageW, layout?.pageH])

  // a swipe: the page in view becomes the current one
  const frame = useRef(0)
  const onScroll = () => {
    if (frame.current) return
    frame.current = requestAnimationFrame(() => {
      frame.current = 0
      const el = scroller.current
      if (!el || !el.clientWidth) return
      const i = Math.round(Math.abs(el.scrollLeft) / el.clientWidth)
      if (i !== indexOf(pageRef.current)) {
        setPage(spread ? spreadPages(i + 1)[0] : i + 1)
        setPicked(null)
      }
    })
  }

  // the address, the title and «تابع القراءة» follow the page, once it settles
  useEffect(() => {
    const t = setTimeout(() => {
      navigate(`/mushaf/${page}`, { replace: true, preventScrollReset: true })
      store(PAGE_KEY, page)
    }, 300)
    document.title = `الصفحة ${toArabicDigits(page)} · المصحف · آيات مرئية`
    return () => clearTimeout(t)
  }, [page, navigate])
  useEffect(
    () => () => {
      document.title = 'آيات مرئية'
    },
    [],
  )

  // keyboard: left is forward in an Arabic book
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (menu || e.altKey || e.ctrlKey || e.metaKey) return
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, [contenteditable]')) return
      if (e.key === 'ArrowLeft' || e.key === 'PageDown') step(1)
      else if (e.key === 'ArrowRight' || e.key === 'PageUp') step(-1)
      else if (e.key === 'Home') show(1)
      else if (e.key === 'End') show(PAGE_COUNT)
      else if (e.key === 'Escape') setPicked(null)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menu, step, show])

  // with two pages open, the bar names the right-hand one (the first read) and both numbers
  const [right, left] = spread ? spreadPages(spreadOf(page)) : [page, page]
  const first = mushaf.pages[right - 1]!
  const surahHere = surahs[first[0] - 1]!
  const juz = divisionAt(mushaf.juz, ord, first)
  const listenFrom = (s: number, a: number) => {
    setPicked(null)
    setMenu(false)
    rec.start(s, a)
  }

  const close = () => {
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate('/')
  }

  const sheet = (p: number, side?: 'right' | 'left') =>
    layout && (
      <Sheet
        key={p}
        page={p}
        side={side}
        width={layout.pageW}
        height={layout.pageH}
        font={layout.font}
        large={layout.scroll}
        mushaf={mushaf}
        ord={ord}
        surahs={surahs}
        picked={picked}
        reading={reading}
        onPick={setPicked}
        onHold={(at) => {
          setPicked(at)
          setHeld(at)
        }}
        onBackground={() => (picked ? setPicked(null) : setBars(!bars))}
      />
    )

  return (
    <div className="flex h-dvh flex-col bg-night">
      {/* top bar: the menu on the reading side, where the drawer opens; closing on the other */}
      {bars && (
        <header className="z-20 flex shrink-0 items-center gap-1 border-b border-gold/15 bg-night-deep/95 px-1.5 pt-[env(safe-area-inset-top)] backdrop-blur">
          <button
            type="button"
            onClick={() => setMenu(true)}
            aria-haspopup="dialog"
            aria-label="فهرس المصحف والإعدادات"
            className="tap grid size-12 place-items-center rounded-full text-vellum active:bg-gold/15 hover:bg-white/5"
          >
            <IconMenu />
          </button>
          <div className="min-w-0 flex-1 leading-tight" aria-live="polite">
            <p className="truncate font-display text-lg font-bold text-gold-soft">
              سورة {surahHere.name}
            </p>
            <p className="truncate text-xs text-mist">
              {juzName(juz)} ·{' '}
              {right === left
                ? `الصفحة ${toArabicDigits(right)}`
                : `الصفحتان ${toArabicDigits(right)}–${toArabicDigits(left)}`}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="إغلاق المصحف"
            className="tap grid size-12 place-items-center rounded-full text-mist active:bg-gold/15 hover:bg-white/5 hover:text-vellum"
          >
            <IconClose />
          </button>
        </header>
      )}

      {/* the pages, in a row read from right to left: swiping towards the right turns forward */}
      <div
        className={`relative min-h-0 flex-1 ${bars ? '' : 'pt-[env(safe-area-inset-top)]'} ${
          // the player sits under the pages, never over the ayah being recited
          rec.status !== 'idle' && !picked
            ? 'pb-[calc(3.5rem+env(safe-area-inset-bottom))]'
            : bars
              ? ''
              : 'pb-[env(safe-area-inset-bottom)]'
        }`}
      >
        <div
          ref={scroller}
          onScroll={onScroll}
          dir="rtl"
          tabIndex={-1}
          aria-label="صفحات المصحف"
          className="scrollbar-none flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain outline-none"
        >
          {Array.from({ length: items }, (_, i) => {
            const near = Math.abs(i - current) <= 2
            return (
              <div
                key={i}
                className="flex h-full w-full shrink-0 snap-start snap-always items-center justify-center"
                aria-hidden={i !== current}
                inert={i !== current}
              >
                {near &&
                  (spread ? (
                    <>
                      {sheet(spreadPages(i + 1)[0], 'right')}
                      {sheet(spreadPages(i + 1)[1], 'left')}
                    </>
                  ) : (
                    sheet(i + 1)
                  ))}
              </div>
            )
          })}
        </div>

        {/* with a mouse, where there is room beside the pages: page-turn buttons */}
        {sideRoom && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              disabled={current === 0}
              aria-label="الصفحة السابقة"
              className="tap absolute inset-y-0 right-0 hidden w-14 place-items-center text-mist hover:bg-white/5 hover:text-vellum disabled:opacity-0 pointer-fine:grid"
            >
              <IconBack className="size-8" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              disabled={current === items - 1}
              aria-label="الصفحة التالية"
              className="tap absolute inset-y-0 left-0 hidden w-14 place-items-center text-mist hover:bg-white/5 hover:text-vellum disabled:opacity-0 pointer-fine:grid"
            >
              <IconForward className="size-8" />
            </button>
          </>
        )}

        {picked && !held ? (
          <AyahSheet
            picked={picked}
            surahs={surahs}
            onListen={() => listenFrom(picked.surah, picked.ayah)}
            onClose={() => setPicked(null)}
          />
        ) : (
          rec.status !== 'idle' && (
            <Player rec={rec} surahs={surahs} onReciters={() => setReciters(true)} />
          )
        )}

        {/* on the whole screen, the one way in: the menu, at the page's lower corner */}
        {!bars && !picked && (
          <button
            type="button"
            onClick={() => setMenu(true)}
            aria-haspopup="dialog"
            aria-label="القائمة: الفهرس والتلاوة والإعدادات"
            className="tap absolute bottom-[max(0.375rem,env(safe-area-inset-bottom))] right-2 z-30 grid size-11 place-items-center rounded-full border border-gold/30 bg-night-deep/70 text-gold-soft shadow-lg backdrop-blur active:bg-gold/20"
          >
            <IconMenu className="size-5" />
          </button>
        )}
      </div>

      {bars && <BottomBar page={page} onStep={step} onJump={show} />}

      <AyahMenu
        at={held}
        surahs={surahs}
        reciter={rec.reciter.id}
        onClose={() => {
          setHeld(null)
          setPicked(null)
        }}
        onListen={(at, one) => {
          setHeld(null)
          setPicked(null)
          rec.start(at.surah, at.ayah, one)
        }}
        onReciter={(id, at) => {
          rec.setReciter(id, true)
          rec.start(at.surah, at.ayah, true)
        }}
      />

      <ReciterSheet
        open={reciters}
        onClose={() => setReciters(false)}
        current={rec.reciter.id}
        playing={rec.status !== 'idle'}
        onPick={(id) => {
          rec.setReciter(id)
          setReciters(false)
        }}
      />

      <Drawer open={menu} onClose={() => setMenu(false)} title="المصحف">
        <Index
          mushaf={mushaf}
          ord={ord}
          surahs={surahs}
          page={page}
          size={size}
          canFit={layout?.canFit ?? true}
          onSize={(v) => {
            setSize(v)
            store(SIZE_KEY, v)
          }}
          onJump={(p) => {
            setMenu(false)
            show(p)
          }}
          rec={rec}
          onReciters={() => setReciters(true)}
          onListen={() => listenFrom(first[0], first[1])}
          onClose={close}
        />
      </Drawer>
    </div>
  )
}

// ---------- the bar under the pages ----------

function BottomBar({
  page,
  onStep,
  onJump,
}: {
  page: number
  onStep: (d: 1 | -1) => void
  onJump: (p: number) => void
}) {
  // while the slider moves, show where it would land; turn there when it stops
  const [drag, setDrag] = useState<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const shown = drag ?? page
  return (
    <nav
      aria-label="التنقل بين الصفحات"
      className="z-20 flex shrink-0 items-center gap-1 border-t border-gold/15 bg-night-deep/95 px-1.5 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <button
        type="button"
        onClick={() => onStep(-1)}
        disabled={page <= 1}
        aria-label="الصفحة السابقة"
        className="tap grid size-12 shrink-0 place-items-center rounded-full text-vellum active:bg-gold/15 disabled:opacity-30"
      >
        <IconBack />
      </button>
      <label className="flex min-w-0 flex-1 flex-col items-stretch py-1.5">
        <span className="text-center text-xs text-mist">
          الصفحة <span className="font-semibold text-gold-soft">{toArabicDigits(shown)}</span> من{' '}
          {toArabicDigits(PAGE_COUNT)}
        </span>
        <input
          type="range"
          dir="rtl"
          min={1}
          max={PAGE_COUNT}
          value={shown}
          aria-valuetext={`الصفحة ${toArabicDigits(shown)}`}
          onChange={(e) => {
            const v = Number(e.target.value)
            setDrag(v)
            clearTimeout(timer.current)
            timer.current = setTimeout(() => {
              onJump(v)
              setDrag(null)
            }, 180)
          }}
          className="h-7 w-full accent-[#c9a54a]"
        />
      </label>
      <button
        type="button"
        onClick={() => onStep(1)}
        disabled={page >= PAGE_COUNT}
        aria-label="الصفحة التالية"
        className="tap grid size-12 shrink-0 place-items-center rounded-full text-vellum active:bg-gold/15 disabled:opacity-30"
      >
        <IconForward />
      </button>
    </nav>
  )
}

// ---------- what can be done with a chosen ayah ----------

function AyahSheet({
  picked,
  surahs,
  onListen,
  onClose,
}: {
  picked: Picked
  surahs: Surah[]
  onListen: () => void
  onClose: () => void
}) {
  const s = surahs[picked.surah - 1]!
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      const { ayahs } = await loadSurahText(s.id)
      const text = ayahs[picked.ayah - 1]!.text
      await navigator.clipboard.writeText(`${text} [${s.name}: ${toArabicDigits(picked.ayah)}]`)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  const action =
    'tap flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-xs text-vellum active:bg-gold/15 hover:bg-white/5'
  return (
    <div
      role="dialog"
      aria-label={`سورة ${s.name}، الآية ${toArabicDigits(picked.ayah)}`}
      className="absolute inset-x-2 bottom-2 z-30 mx-auto max-w-md rounded-2xl border border-gold/25 bg-night-deep/95 p-2 shadow-2xl backdrop-blur"
    >
      <div className="flex items-center justify-between px-2 pb-1">
        <p className="font-display text-lg font-bold text-gold-soft">
          سورة {s.name} · الآية {toArabicDigits(picked.ayah)}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="tap grid size-10 place-items-center rounded-full text-mist active:bg-gold/15"
        >
          <IconClose className="size-5" />
        </button>
      </div>
      <div className="flex gap-1">
        <button type="button" onClick={onListen} className={action}>
          <IconPlay className="size-5" />
          استمع من هنا
        </button>
        <Link to={`/ayah/${s.id}/${picked.ayah}`} className={action}>
          <IconInfo className="size-5" />
          تحليل الآية
        </Link>
        <button type="button" onClick={copy} className={action}>
          <IconCopy className="size-5" />
          <span aria-live="polite">{copied ? 'نُسخت' : 'نسخ'}</span>
        </button>
      </div>
    </div>
  )
}

// ---------- the recitation in progress ----------

type Recitation = ReturnType<typeof useMushafRecitation>

function Player({
  rec,
  surahs,
  onReciters,
}: {
  rec: Recitation
  surahs: Surah[]
  onReciters: () => void
}) {
  const playing = rec.status === 'playing' || rec.status === 'loading'
  const st = rec.step
  const where = st
    ? `${surahs[st.surah - 1]?.name ?? ''} · ${st.basmala ? 'البسملة' : `الآية ${toArabicDigits(st.ayah)}`}`
    : ''
  const btn =
    'tap grid size-11 shrink-0 place-items-center rounded-full text-vellum active:bg-gold/20'
  return (
    <section
      aria-label="التلاوة"
      className="absolute bottom-[max(0.375rem,env(safe-area-inset-bottom))] left-2 right-16 z-30 mx-auto flex max-w-sm items-center gap-0.5 rounded-full border border-gold/30 bg-night-deep/90 py-0.5 pe-1 ps-3 shadow-xl backdrop-blur"
    >
      {/* the reciter's name opens the list of reciters: the voice can change mid-recitation */}
      <button
        type="button"
        onClick={onReciters}
        aria-haspopup="dialog"
        aria-label={`القارئ: ${reciterLabel(rec.reciter)}. تغيير القارئ`}
        className="tap -my-0.5 min-w-0 flex-1 rounded-full py-1 text-right leading-tight active:bg-gold/15"
      >
        <span className="block truncate text-sm text-vellum" aria-live="polite">
          {rec.status === 'error'
            ? 'تعذّر التشغيل، تحقّق من الاتصال'
            : rec.status === 'loading'
              ? `${where}…`
              : where}
        </span>
        <span className="flex items-center gap-1 text-xs text-gold-soft/90">
          <span className="truncate">{reciterLabel(rec.reciter)}</span>
          <IconChevronDown className="size-3.5 shrink-0" />
        </span>
      </button>
      <button type="button" aria-label="الآية السابقة" onClick={() => rec.go(-1)} className={btn}>
        <IconBack className="size-5" />
      </button>
      <button
        type="button"
        aria-label={playing ? 'إيقاف مؤقت' : 'متابعة'}
        onClick={() => (playing ? rec.pause() : rec.resume())}
        className={`${btn} bg-gold/25 text-gold-soft`}
      >
        {playing ? <IconPause className="size-5" /> : <IconPlay className="size-5" />}
      </button>
      <button type="button" aria-label="الآية التالية" onClick={() => rec.go(1)} className={btn}>
        <IconForward className="size-5" />
      </button>
      <button type="button" aria-label="إيقاف التلاوة" onClick={rec.stop} className={btn}>
        <IconStop className="size-5" />
      </button>
    </section>
  )
}

// ---------- the drawer: surahs, juz, a page number, the day's portion, the text size ----------

function Index({
  mushaf,
  ord,
  surahs,
  page,
  size,
  canFit,
  onSize,
  onJump,
  rec,
  onReciters,
  onListen,
  onClose,
}: {
  mushaf: Mushaf
  ord: Ord
  surahs: Surah[]
  page: number
  size: Size
  /** This screen has room for the middle size. */
  canFit: boolean
  onSize: (v: Size) => void
  onJump: (p: number) => void
  rec: Recitation
  onReciters: () => void
  onListen: () => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<'surahs' | 'juz'>('surahs')
  const [typed, setTyped] = useState('')
  const typedPage = parsePage(typed)
  const here = mushaf.pages[page - 1]!
  const juzHere = divisionAt(mushaf.juz, ord, here)
  const surahPages = useMemo(
    () => surahs.map((s) => pageOf(mushaf, ord, [s.id, 1])),
    [mushaf, ord, surahs],
  )
  const juzPages = useMemo(() => mushaf.juz.map((r) => pageOf(mushaf, ord, r)), [mushaf, ord])

  // the khatma plan, if the reader keeps one: today's pages
  const today = useMemo(() => {
    const plan = storedPlan()
    if (!plan) return null
    const day = daysBetween(plan.start, localDay())
    return khatma(mushaf, ord, plan.days)[day] ?? null
  }, [mushaf, ord])

  // open on the surah being read
  const list = useRef<HTMLOListElement>(null)
  useEffect(() => {
    list.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'center' })
  }, [tab])

  // where the screen has no room for the middle size, it shows as the whole page
  const shown: Size = size === 'fit' && !canFit ? 'page' : size
  const seg = (on: boolean) =>
    `tap min-h-10 flex-1 rounded-full text-sm ${on ? 'bg-gold/20 font-semibold text-gold-soft' : 'text-mist hover:text-vellum'}`
  const row =
    'tap flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-right hover:bg-white/5 active:bg-white/10'

  return (
    <div className="flex flex-col gap-4 px-3 py-3">
      <section aria-labelledby="tilawa" className="rounded-xl border border-gold/20 px-3 py-2.5">
        <h3 id="tilawa" className="text-xs text-mist">
          التلاوة
        </h3>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="w-14 shrink-0 text-sm text-mist">القارئ</span>
          <button
            type="button"
            onClick={onReciters}
            aria-haspopup="dialog"
            className="tap flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full border border-gold/30 bg-night pe-2 ps-4 text-right text-vellum active:bg-gold/15 hover:border-gold/50"
          >
            <span className="min-w-0 flex-1 truncate">{reciterLabel(rec.reciter)}</span>
            <span className="shrink-0 rounded-full bg-gold/15 px-2.5 py-1 text-xs text-gold-soft">
              تغيير
            </span>
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="w-14 shrink-0 text-sm text-mist" id="repeat-label">
            التكرار
          </span>
          <div
            role="group"
            aria-labelledby="repeat-label"
            className="flex min-w-0 flex-1 rounded-full bg-night p-1"
          >
            {[1, 3, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={rec.repeat === n}
                aria-label={n === 1 ? 'كل آية مرة واحدة' : `كل آية ${countOf(n, TIME)}`}
                onClick={() => rec.setRepeat(n)}
                className={seg(rec.repeat === n)}
              >
                {n === 1 ? 'مرة' : `${toArabicDigits(n)} مرات`}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={onListen}
          className="tap mt-2.5 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-gold/25 text-gold-soft active:bg-gold/35"
        >
          <IconPlay className="size-5" />
          استمع من أول الصفحة
        </button>
        <p className="mt-1.5 text-xs leading-relaxed text-mist/80">
          أو المس أي آية واختر «استمع من هنا»، أو اضغط عليها مطوّلًا لتنسخها أو تسمعها بصوت أي قارئ.
          تتقدّم الصفحات مع التلاوة.
        </p>
      </section>

      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (typedPage) onJump(typedPage)
        }}
      >
        <label className="flex-1">
          <span className="sr-only">رقم الصفحة</span>
          <input
            inputMode="numeric"
            enterKeyHint="go"
            placeholder="انتقل إلى صفحة (١–٦٠٤)"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="h-11 w-full rounded-full border border-gold/30 bg-night px-4 text-vellum placeholder:text-mist/70 focus:border-gold"
          />
        </label>
        <button
          type="submit"
          disabled={!typedPage}
          className="tap h-11 rounded-full bg-gold/25 px-5 text-gold-soft disabled:opacity-40"
        >
          انتقل
        </button>
      </form>

      {today && (
        <div className="rounded-xl border border-gold/30 bg-gold/10 px-3 py-2">
          <p className="text-sm text-vellum">
            ورد اليوم في خطة الختمة:{' '}
            {today.fromPage === today.toPage
              ? `الصفحة ${toArabicDigits(today.fromPage)}`
              : `الصفحات ${toArabicDigits(today.fromPage)}–${toArabicDigits(today.toPage)}`}
          </p>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => onJump(today.fromPage)}
              className="tap min-h-10 rounded-full bg-gold/25 px-4 text-sm text-gold-soft"
            >
              ابدأ الورد
            </button>
            <Link
              to="/khatma"
              className="tap inline-flex min-h-10 items-center rounded-full px-3 text-sm text-mist"
            >
              الخطة
            </Link>
          </div>
        </div>
      )}

      <div>
        <p className="mb-1 px-1 text-xs text-mist">حجم الخط</p>
        <div className="flex rounded-full bg-night p-1" role="group" aria-label="حجم الخط">
          {(
            [
              ['page', 'الصفحة كاملة'],
              ['fit', 'خط أكبر'],
              ['scroll', 'أكبر مع تمرير'],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              aria-pressed={shown === v}
              disabled={v === 'fit' && !canFit}
              onClick={() => onSize(v)}
              className={`${seg(shown === v)} disabled:opacity-40`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-1 px-1 text-xs leading-relaxed text-mist/80">
          {size === 'scroll'
            ? 'الخط أكبر، وتُمرَّر الصفحة إلى الأسفل لإكمالها.'
            : size === 'fit' && canFit
              ? 'أكبر خط تظهر به الصفحة كلها في الشاشة دون تمرير.'
              : canFit
                ? 'تظهر الصفحة كلها في الشاشة.'
                : 'تظهر الصفحة كلها في الشاشة، وهذا أكبر خط تتسع له الشاشة دون تمرير.'}
        </p>
      </div>

      <div>
        <div className="flex rounded-full bg-night p-1" role="tablist" aria-label="الفهرس">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'surahs'}
            onClick={() => setTab('surahs')}
            className={seg(tab === 'surahs')}
          >
            السور
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'juz'}
            onClick={() => setTab('juz')}
            className={seg(tab === 'juz')}
          >
            الأجزاء
          </button>
        </div>
        <ol ref={list} className="mt-2" role="tabpanel">
          {tab === 'surahs'
            ? surahs.map((s, i) => {
                const on = s.id === here[0]
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      aria-current={on}
                      onClick={() => onJump(surahPages[i]!)}
                      className={`${row} ${on ? 'bg-gold/15' : ''}`}
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-full border border-gold/30 text-xs text-mist">
                        {toArabicDigits(s.id)}
                      </span>
                      <span
                        className={`flex-1 font-display text-lg ${on ? 'font-bold text-gold-soft' : 'text-vellum'}`}
                      >
                        {s.name}
                      </span>
                      <span className="text-xs text-mist">ص {toArabicDigits(surahPages[i]!)}</span>
                    </button>
                  </li>
                )
              })
            : juzPages.map((p, i) => {
                const on = i + 1 === juzHere
                return (
                  <li key={i}>
                    <button
                      type="button"
                      aria-current={on}
                      onClick={() => onJump(p)}
                      className={`${row} ${on ? 'bg-gold/15' : ''}`}
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-full border border-gold/30 text-xs text-mist">
                        {toArabicDigits(i + 1)}
                      </span>
                      <span
                        className={`flex-1 font-display text-lg ${on ? 'font-bold text-gold-soft' : 'text-vellum'}`}
                      >
                        {juzName(i + 1)}
                      </span>
                      <span className="text-xs text-mist">ص {toArabicDigits(p)}</span>
                    </button>
                  </li>
                )
              })}
        </ol>
      </div>

      <p className="px-1 text-xs leading-relaxed text-mist/80">
        آيات كل صفحة كما في مصحف المدينة (ملف مجمع الملك فهد)، أما توزيع الكلمات على الأسطر فيتبع
        عرض الشاشة، فلا تطابق الأسطر أسطر المصحف المطبوع.
      </p>

      <div className="border-t border-gold/15 pt-3">
        <Link to={`/read/${here[0]}`} className={row}>
          قراءة السورة مع التلاوة
        </Link>
        <Link to="/khatma" className={row}>
          خطة الختمة
        </Link>
        <Link to="/" className={row}>
          أقسام المنصة
        </Link>
        <button type="button" onClick={onClose} className={row}>
          إغلاق المصحف
        </button>
      </div>
    </div>
  )
}

// ---------- the route ----------

export default function MushafPage() {
  const state = useAsync(() => Promise.all([loadMushaf(), loadSurahs()]), 'mushaf')
  const { page } = useParams()
  if (page === undefined) {
    const last = stored(PAGE_KEY)
    const p = typeof last === 'number' && parsePage(String(last)) ? last : 1
    return <Navigate to={`/mushaf/${p}`} replace />
  }
  const n = parsePage(page)
  if (!n) return <Navigate to="/mushaf/1" replace />
  if (state.status === 'loading') return <Loading />
  if (state.status === 'error') return <ErrorNote error={state.error} />
  const [mushaf, { surahs }] = state.data
  return <Reader start={n} mushaf={mushaf} surahs={surahs} />
}
