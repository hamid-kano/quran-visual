import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { Prophets, Surah } from '../../data/schemas'
import { loadProphets, loadSurahs } from '../../data/load'
import { useAsync } from '../../data/useAsync'
import { ErrorNote, Loading } from '../../components/Status'
import { OccurrenceList } from '../../components/AyahRefs'
import { ReviewLink } from '../../components/ReviewLink'
import { PROPHET, SURAH, TIME, countOf, toArabicDigits } from '../../lib/arabic'
import { PROPHETS } from '../../lib/prophets'

type Entry = Prophets['prophets'][number] & { index: number }

/** Mentions in a surah, by step: one hue from light to dark (checked as an ordinal ramp). */
const STEPS: [number, string, string][] = [
  [1, '#c4a253', 'مرة'],
  [2, '#a07c26', '٢–٣'],
  [4, '#765914', '٤–٩'],
  [10, '#4a3708', '١٠ فأكثر'],
]
const stepColor = (n: number) => [...STEPS].reverse().find(([min]) => n >= min)?.[1]
const TRACK = '#e6d9bb'

function perSurah(places: [number, number, number][]) {
  const m = new Map<number, number>()
  for (const [s] of places) m.set(s, (m.get(s) ?? 0) + 1)
  return m
}

function Row({
  e,
  columns,
  byId,
  open,
  onToggle,
}: {
  e: Entry
  columns: Surah[]
  byId: Map<number, Surah>
  open: boolean
  onToggle: () => void
}) {
  const counts = useMemo(() => perSurah(e.places), [e.places])
  const info = PROPHETS[e.index]!
  const { list, marks } = useMemo(() => {
    const list: [number, number][] = []
    const marks = new Map<string, number[]>()
    for (const [s, a, w] of e.places) {
      const k = `${s}:${a}`
      if (!marks.has(k)) list.push([s, a])
      marks.set(k, [...(marks.get(k) ?? []), w])
    }
    return { list, marks }
  }, [e.places])

  return (
    <li className="py-1.5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full rounded px-1 py-1 text-right hover:bg-vellum-deep"
      >
        <span className="flex items-baseline justify-between gap-3">
          <span className="font-display text-lg font-bold text-ink">{info.name}</span>
          <span className="text-sm text-ink-soft">
            {countOf(e.places.length, TIME)} في {countOf(counts.size, SURAH)}
          </span>
        </span>
        <span className="mt-1 flex h-4 gap-px" aria-hidden>
          {columns.map((s) => {
            const n = counts.get(s.id) ?? 0
            return (
              <span
                key={s.id}
                className="h-full min-w-px flex-1"
                style={{ background: n ? stepColor(n) : TRACK }}
                title={n ? `${s.name}: ${toArabicDigits(n)}` : undefined}
              />
            )
          })}
        </span>
      </button>
      {open && (
        <div className="mb-2 mt-1 rounded border border-[#e0cf9f] px-3 py-2">
          {(info.note || info.except) && (
            <p className="text-sm leading-relaxed text-ink-soft">
              {info.note}
              {info.except && <> استُثنيت ثلاثة مواضع: {info.except.why}</>}
            </p>
          )}
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {[...counts]
              .sort((a, b) => a[0] - b[0])
              .map(([s, n]) => (
                <li key={s}>
                  <Link
                    to={`/surah/${s}`}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#cdb67a] px-3 text-sm text-ink hover:bg-vellum-deep"
                  >
                    {byId.get(s)?.name}
                    <span className="text-xs text-ink-soft">{toArabicDigits(n)}</span>
                  </Link>
                </li>
              ))}
          </ul>
          <OccurrenceList list={list} byId={byId} marks={marks} />
        </div>
      )}
    </li>
  )
}

export default function AnbiyaPage() {
  const state = useAsync(() => Promise.all([loadSurahs(), loadProphets()]), 'anbiya')
  const [rows, setRows] = useState<'count' | 'first'>('count')
  const [cols, setCols] = useState<'mushaf' | 'revelation'>('mushaf')
  const [open, setOpen] = useState<number | null>(null)
  useEffect(() => {
    document.title = 'الأنبياء في القرآن · آيات مرئية'
    return () => {
      document.title = 'آيات مرئية'
    }
  }, [])

  const data = state.status === 'ready' ? state.data : null
  const surahs = useMemo(() => data?.[0].surahs ?? [], [data])
  const byId = useMemo(() => new Map(surahs.map((s) => [s.id, s])), [surahs])
  const columns = useMemo(
    () => (cols === 'revelation' ? [...surahs].sort((a, b) => a.order - b.order) : surahs),
    [surahs, cols],
  )
  const entries = useMemo(() => {
    const list: Entry[] = (data?.[1].prophets ?? []).map((p, index) => ({ ...p, index }))
    const first = (e: Entry) => e.places[0]![0] * 1000 + e.places[0]![1]
    return rows === 'count'
      ? [...list].sort((a, b) => b.places.length - a.places.length || first(a) - first(b))
      : [...list].sort((a, b) => first(a) - first(b))
  }, [data, rows])
  const gathered = useMemo(() => {
    // in how many of the surahs each of them is named
    const named = new Map<number, number>()
    ;(data?.[1].prophets ?? []).forEach((e) => {
      for (const s of new Set(e.places.map(([x]) => x))) named.set(s, (named.get(s) ?? 0) + 1)
    })
    return [...named].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 6)
  }, [data])

  if (state.status === 'loading') return <Loading />
  if (state.status === 'error') return <ErrorNote error={state.error} />
  const total = entries.reduce((n, e) => n + e.places.length, 0)
  const chip = (on: boolean) =>
    `min-h-11 rounded-full px-4 text-sm ${on ? 'bg-gold/20 text-gold-soft' : 'text-mist hover:text-vellum'}`

  return (
    <div className="absolute inset-0 overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 xl:max-w-6xl">
        <h1 className="font-display text-4xl font-bold text-gold-soft">الأنبياء في القرآن</h1>
        <div className="mt-3 max-w-3xl space-y-2 leading-relaxed text-mist">
          <p>
            الأنبياء والرسل عليهم السلام المذكورون بأسمائهم في القرآن الكريم، وهم خمسة وعشرون على
            المشهور، ومواضع ذكر كل اسم في السور. ورد ذكرهم بأسمائهم {countOf(total, TIME)}.
          </p>
          <p className="text-sm">
            يُعدّ ذكر الاسم نفسه كما وسمته المدوّنة القرآنية العربية اسمَ علم. ولا يدخل في العدّ ما
            جاء بوصف أو كنية، ولا الضمير العائد على الاسم، فهذه خريطة لذكر الأسماء لا لمواضع القصص
            كلها.
          </p>
        </div>

        <section className="page mt-6 rounded-md px-4 py-5 sm:px-7" aria-labelledby="map">
          <h2 id="map" className="font-display text-2xl font-bold text-ink">
            ذكرهم في السور
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            كل صف نبي، وكل خانة فيه سورة، ولونها بعدد مرات ذكره فيها. اختر نبياً لترى مواضعه.
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div
              className="flex flex-wrap rounded-full bg-night/90"
              role="group"
              aria-label="ترتيب الأنبياء"
            >
              <button
                type="button"
                aria-pressed={rows === 'count'}
                onClick={() => setRows('count')}
                className={chip(rows === 'count')}
              >
                الأكثر ذكراً
              </button>
              <button
                type="button"
                aria-pressed={rows === 'first'}
                onClick={() => setRows('first')}
                className={chip(rows === 'first')}
              >
                بأول ذكر في المصحف
              </button>
            </div>
            <div
              className="flex flex-wrap rounded-full bg-night/90"
              role="group"
              aria-label="ترتيب السور"
            >
              <button
                type="button"
                aria-pressed={cols === 'mushaf'}
                onClick={() => setCols('mushaf')}
                className={chip(cols === 'mushaf')}
              >
                السور بترتيب المصحف
              </button>
              <button
                type="button"
                aria-pressed={cols === 'revelation'}
                onClick={() => setCols('revelation')}
                className={chip(cols === 'revelation')}
              >
                بترتيب النزول
              </button>
            </div>
          </div>
          <ul
            className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-soft"
            aria-label="مفتاح الألوان"
          >
            {STEPS.map(([, color, label]) => (
              <li key={color} className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm" style={{ background: color }} />
                {label}
              </li>
            ))}
            <li className="ms-auto">
              {cols === 'mushaf' ? 'الفاتحة ← الناس' : 'أول ما نزل ← آخر ما نزل'}
            </li>
          </ul>
          <ul className="mt-2 divide-y divide-[#efe3bf]">
            {entries.map((e) => (
              <Row
                key={e.index}
                e={e}
                columns={columns}
                byId={byId}
                open={open === e.index}
                onToggle={() => setOpen(open === e.index ? null : e.index)}
              />
            ))}
          </ul>
        </section>

        <section className="page mt-5 rounded-md px-5 py-5 sm:px-7" aria-labelledby="most">
          <h2 id="most" className="font-display text-2xl font-bold text-ink">
            السور الأكثر جمعاً لأسمائهم
          </h2>
          <ol className="mt-3 space-y-1">
            {gathered.map(([s, n]) => (
              <li key={s} className="flex items-baseline justify-between gap-3">
                <Link
                  to={`/surah/${s}`}
                  className="font-display text-lg text-ink underline decoration-[#cdb67a] underline-offset-4"
                >
                  سورة {byId.get(s)?.name}
                </Link>
                <span className="text-sm text-ink-soft">{countOf(n, PROPHET)}</span>
              </li>
            ))}
          </ol>
          <ReviewLink subject="صفحة الأنبياء في القرآن" />
        </section>
      </div>
    </div>
  )
}
