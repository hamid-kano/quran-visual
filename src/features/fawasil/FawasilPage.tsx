import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import type { Surah } from '../../data/schemas'
import { loadFawasil, loadSurahText, loadSurahs } from '../../data/load'
import { useAsync } from '../../data/useAsync'
import { ErrorNote, Loading } from '../../components/Status'
import { ReviewLink } from '../../components/ReviewLink'
import {
  AYAH,
  LETTER as LETTER_FORMS,
  countOf,
  formatNumber,
  formatPercent,
  toArabicDigits,
} from '../../lib/arabic'
import { ayahPath } from '../../lib/links'
import { ayahWords } from '../../lib/quran'
import {
  FASILA_COLORS,
  FASILA_LETTERS,
  OTHER_COLOR,
  fasilaColor,
  letterCounts,
} from '../../lib/fawasil'

const LETTER = 'font-quran text-[1.15em] leading-none'

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-mist" aria-label="ألوان الحروف">
      {FASILA_LETTERS.map((l, i) => (
        <li key={l} className="flex items-center gap-1.5">
          <span
            className="size-3 rounded-sm"
            style={{ background: FASILA_COLORS[i] }}
            aria-hidden
          />
          <span className={LETTER}>{l}</span>
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span className="size-3 rounded-sm" style={{ background: OTHER_COLOR }} aria-hidden />
        غيرها
      </li>
    </ul>
  )
}

/** How many ayahs end in each letter: labelled bars, the eight coloured letters then the rest. */
function LetterBars({ letters, tone }: { letters: string; tone: 'dark' | 'page' }) {
  const counts = letterCounts(letters)
  const total = letters.length
  const max = counts[0]?.[1] ?? 1
  const text = tone === 'dark' ? 'text-vellum' : 'text-ink'
  const soft = tone === 'dark' ? 'text-mist' : 'text-ink-soft'
  return (
    <ul className="space-y-1.5">
      {counts.map(([l, n]) => (
        <li key={l} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3">
          <span className={`${LETTER} text-center ${text}`}>{l}</span>
          <span className="h-3 rounded-sm" aria-hidden>
            <span
              className="block h-full rounded-e-[4px]"
              style={{ width: `${Math.max(1, (n / max) * 100)}%`, background: fasilaColor(l) }}
            />
          </span>
          <span className={`text-sm ${soft}`}>
            {formatNumber(n)} ({n / total < 0.01 ? 'أقل من ١٪' : formatPercent(n / total)})
          </span>
        </li>
      ))}
    </ul>
  )
}

/** One surah's ayahs as thin coloured cells, the whole strip one width whatever its length. */
function Strip({ letters, surah }: { letters: string; surah: Surah }) {
  return (
    <span className="flex h-5 overflow-hidden rounded-sm" aria-hidden>
      {[...letters].map((l, i) => (
        <span
          key={i}
          className="h-full min-w-px flex-1"
          style={{ background: fasilaColor(l) }}
          title={`${surah.name} ${toArabicDigits(i + 1)}: ${l}`}
        />
      ))}
    </span>
  )
}

function Index({ surahs, letters }: { surahs: Surah[]; letters: string[] }) {
  const [order, setOrder] = useState<'mushaf' | 'even'>('mushaf')
  const rows = useMemo(() => {
    const r = surahs.map((s) => {
      const l = letters[s.id - 1]!
      const [top, n] = letterCounts(l)[0]!
      return { s, l, top, share: n / l.length }
    })
    return order === 'even' ? [...r].sort((a, b) => b.share - a.share || a.s.id - b.s.id) : r
  }, [surahs, letters, order])
  const all = letters.join('')

  useEffect(() => {
    document.title = 'الفواصل · آيات مرئية'
    return () => {
      document.title = 'آيات مرئية'
    }
  }, [])

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 2xl:max-w-7xl">
      <h1 className="font-display text-4xl font-bold text-gold-soft">الفواصل</h1>
      <div className="mt-3 max-w-3xl space-y-2 leading-relaxed text-mist">
        <p>
          الفاصلة آخر كلمة في الآية، وبتواليها يُعرف إيقاع السورة. يُعرض هنا لكل آية الحرف الأخير من
          فاصلتها كما رُسم في المصحف، دون الحركات: فما خُتم بتنوين الفتح مثل «
          <span className="font-quran">رَقِيبٗا</span>» ينتهي بالألف المكتوبة، وهي التي يُوقف عليها.
          وما كان من الحروف المقطّعة آيةً، مثل «<span className="font-quran">طه</span>»، فحرفه
          الأخير كما كُتب.
        </p>
      </div>

      <section className="mt-6" aria-labelledby="all">
        <h2 id="all" className="font-display text-2xl font-bold text-vellum">
          في القرآن كله
        </h2>
        <p className="mt-1 text-sm text-mist">
          {countOf(all.length, AYAH)}، تنتهي فواصلها بـ
          {countOf(letterCounts(all).length, LETTER_FORMS)}.
        </p>
        <div className="mt-3 max-w-2xl">
          <LetterBars letters={all} tone="dark" />
        </div>
      </section>

      <section className="mt-10" aria-labelledby="surahs">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="surahs" className="font-display text-2xl font-bold text-vellum">
              السور
            </h2>
            <p className="mt-1 text-sm text-mist">
              كل شريط سورة، وكل خط فيه آية من أولها إلى آخرها. اختر سورة لترى فواصلها.
            </p>
          </div>
          <div role="group" aria-label="الترتيب" className="flex">
            {(
              [
                ['mushaf', 'ترتيب المصحف'],
                ['even', 'الأكثر اتساقاً'],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                aria-pressed={order === k}
                onClick={() => setOrder(k)}
                className={`min-h-11 rounded-full px-4 text-sm ${
                  order === k ? 'bg-gold/20 text-gold-soft' : 'text-mist hover:text-vellum'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <Legend />
        </div>
        <ol className="mt-4 space-y-1">
          {rows.map(({ s, l, top, share }) => (
            <li key={s.id}>
              <Link
                to={`/fawasil/${s.id}`}
                className="grid grid-cols-[6.5rem_1fr_4.5rem] items-center gap-3 rounded px-2 py-1.5 hover:bg-gold/10 sm:grid-cols-[9rem_1fr_5rem]"
                aria-label={`سورة ${s.name}: ${formatPercent(share)} من فواصلها بحرف ${top}`}
              >
                <span className="truncate text-vellum">
                  <span className="me-1.5 text-xs text-mist">{toArabicDigits(s.id)}</span>
                  {s.name}
                </span>
                <Strip letters={l} surah={s} />
                <span className="text-sm text-mist">
                  <span className={`${LETTER} text-vellum`}>{top}</span> {formatPercent(share)}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

function Detail({ surah, surahs, letters }: { surah: Surah; surahs: Surah[]; letters: string }) {
  const text = useAsync(() => loadSurahText(surah.id), String(surah.id))
  const prev = surahs[surah.id - 2]
  const next = surahs[surah.id]
  useEffect(() => {
    document.title = `فواصل سورة ${surah.name} · آيات مرئية`
    return () => {
      document.title = 'آيات مرئية'
    }
  }, [surah.name])
  const nav =
    'inline-flex min-h-11 items-center rounded-full px-3 text-sm text-mist hover:bg-gold/10 hover:text-vellum'

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <nav aria-label="مسار الصفحة" className="flex items-center gap-1 text-sm text-mist">
        <Link to="/fawasil" className={nav}>
          الفواصل
        </Link>
        <span aria-hidden>›</span>
        <span className="px-3 text-vellum" aria-current="page">
          سورة {surah.name}
        </span>
      </nav>
      <article className="page mt-3 rounded-md px-5 pb-8 pt-6 sm:px-8" aria-labelledby="t">
        <h1 id="t" className="font-display text-3xl font-bold text-ink">
          فواصل سورة {surah.name}
        </h1>
        <p className="mt-1 text-ink-soft">{countOf(surah.ayahs, AYAH)}</p>
        <div className="mt-4 max-w-xl">
          <LetterBars letters={letters} tone="page" />
        </div>

        <h2 className="mt-8 font-display text-xl font-bold text-ink">فاصلة كل آية</h2>
        <p className="mt-1 text-sm text-ink-soft">آخر كلمة في كل آية، واختر أيّها لتفتح آيتها.</p>
        {text.status === 'loading' && <p className="mt-3 text-ink-soft">جارٍ التحميل…</p>}
        {text.status === 'error' && <p className="mt-3 text-ink-soft">تعذّر تحميل النص.</p>}
        {text.status === 'ready' && (
          <ol className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
            {text.data.ayahs.map((a, i) => {
              const l = letters[i]!
              return (
                <li key={a.n}>
                  <Link
                    to={ayahPath(surah.id, a.n)}
                    className="flex items-center justify-between gap-2 rounded border-s-4 bg-vellum-deep/50 py-1 pe-2 ps-2 hover:bg-vellum-deep"
                    style={{ borderInlineStartColor: fasilaColor(l) }}
                  >
                    <span className="text-xs text-ink-soft">{toArabicDigits(a.n)}</span>
                    <span className="truncate font-quran text-xl text-ink">
                      {ayahWords(a.text).at(-1)}
                    </span>
                    <span className={`${LETTER} text-ink-soft`}>{l}</span>
                  </Link>
                </li>
              )
            })}
          </ol>
        )}
        <ReviewLink subject={`فواصل سورة ${surah.name}`} />
      </article>
      <nav aria-label="السور المجاورة" className="mt-4 flex justify-between">
        {prev ? (
          <Link to={`/fawasil/${prev.id}`} rel="prev" className={nav}>
            → سورة {prev.name}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link to={`/fawasil/${next.id}`} rel="next" className={nav}>
            سورة {next.name} ←
          </Link>
        )}
      </nav>
    </div>
  )
}

export default function FawasilPage() {
  const state = useAsync(() => Promise.all([loadSurahs(), loadFawasil()]), 'fawasil')
  const { id } = useParams()
  if (state.status === 'loading') return <Loading />
  if (state.status === 'error') return <ErrorNote error={state.error} />
  const [{ surahs }, { letters }] = state.data
  const surah = id && /^\d+$/.test(id) ? surahs[Number(id) - 1] : undefined
  if (id && !surah) return <Navigate to="/fawasil" replace />
  return (
    <div className="absolute inset-0 overflow-y-auto">
      {surah ? (
        <Detail key={surah.id} surah={surah} surahs={surahs} letters={letters[surah.id - 1]!} />
      ) : (
        <Index surahs={surahs} letters={letters} />
      )}
    </div>
  )
}
