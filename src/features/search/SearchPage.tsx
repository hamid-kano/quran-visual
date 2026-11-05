import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { loadRoots, loadSearchIndex, loadSurahText, loadSurahs } from '../../data/load'
import type { RootNode, Surah } from '../../data/schemas'
import { useAsync } from '../../data/useAsync'
import { ErrorNote, Loading } from '../../components/Status'
import { AyahMark } from '../../components/AyahText'
import { RootLetters } from '../../components/RootLetters'
import { AYAH, TIME, countOf, formatNumber, toArabicDigits } from '../../lib/arabic'
import { ayahWords } from '../../lib/quran'
import { matchAyah, parseQuery, queryKeys, type SearchMode } from '../../lib/search'

const PAGE = 20
const EXAMPLES = ['الصبر', 'يا أيها الذين آمنوا', 'الرحمن', 'نوح', 'السماوات والأرض']

interface Hit {
  surah: number
  ayah: number
  words: number[]
}

/** Ayahs containing the query, per surah, from al-Fatiha to al-Nas. */
function Distribution({ perSurah, surahs }: { perSurah: Map<number, number>; surahs: Surah[] }) {
  const max = Math.max(1, ...perSurah.values())
  const W = 342
  const H = 48
  const bw = W / 114
  return (
    <figure className="mt-4">
      <svg
        viewBox={`0 0 ${W} ${H + 2}`}
        className="w-full"
        role="img"
        aria-label="توزيع النتائج على السور"
      >
        <line x1={0} x2={W} y1={H} y2={H} stroke="#c9a54a" strokeOpacity={0.4} strokeWidth={0.6} />
        {surahs.map((s, i) => {
          const v = perSurah.get(s.id) ?? 0
          if (!v) return null
          const h = Math.max(1.5, (v / max) * (H - 2))
          return (
            <rect
              key={s.id}
              x={W - (i + 1) * bw + 0.25}
              y={H - h}
              width={Math.max(bw - 0.5, 0.8)}
              height={h}
              fill={s.revelation === 'meccan' ? '#e2c46f' : '#5fb7a1'}
            >
              <title>{`سورة ${s.name}: ${countOf(v, AYAH)}`}</title>
            </rect>
          )
        })}
      </svg>
      <div className="flex justify-between text-xs text-mist" aria-hidden>
        <span>الفاتحة</span>
        <span>الناس</span>
      </div>
    </figure>
  )
}

/** One result: the ayah with its matched words highlighted. */
function Result({ hit, surah, text }: { hit: Hit; surah: Surah; text: string | undefined }) {
  const marked = new Set(hit.words)
  return (
    <li className="py-4">
      <Link
        to={`/surah/${hit.surah}`}
        className="-my-3 inline-block py-3 text-sm text-ink-soft hover:text-ink hover:underline"
      >
        سورة {surah.name}، الآية {toArabicDigits(hit.ayah)}
      </Link>
      <p className="ayah mt-1 text-[1.4rem] leading-[2.25]">
        {text === undefined
          ? '…'
          : ayahWords(text).map((w, i) => (
              <span key={i}>
                {marked.has(i) ? (
                  <mark className="rounded bg-[#ead9a8] px-0.5 text-[#6b4a0c]">{w}</mark>
                ) : (
                  w
                )}{' '}
              </span>
            ))}
        <AyahMark n={hit.ayah} />
      </p>
    </li>
  )
}

function Results({ hits, byId }: { hits: Hit[]; byId: Map<number, Surah> }) {
  const [shown, setShown] = useState(PAGE)
  const visible = hits.slice(0, shown)
  const ids = useMemo(() => [...new Set(visible.map((h) => h.surah))], [visible])
  const texts = useAsync(() => Promise.all(ids.map(loadSurahText)), ids.join(','))
  const textOf = useMemo(() => {
    const m = new Map<string, string>()
    if (texts.status === 'ready')
      for (const t of texts.data) for (const a of t.ayahs) m.set(`${t.id}:${a.n}`, a.text)
    return m
  }, [texts])
  return (
    <div className="page mt-6 rounded-md px-5 pb-6 pt-2 sm:px-8">
      <ol className="divide-y divide-[#e0cf9f]">
        {visible.map((h) => (
          <Result
            key={`${h.surah}:${h.ayah}`}
            hit={h}
            surah={byId.get(h.surah)!}
            text={textOf.get(`${h.surah}:${h.ayah}`)}
          />
        ))}
      </ol>
      {shown < hits.length && (
        <button
          type="button"
          onClick={() => setShown((n) => n + PAGE)}
          className="mt-2 rounded-full border border-[#cdb67a] px-4 py-1.5 text-sm text-ink hover:bg-vellum-deep"
        >
          عرض المزيد (بقي {countOf(hits.length - shown, AYAH)})
        </button>
      )}
    </div>
  )
}

/** Roots whose letters, or one of whose lemmas, match the query exactly. */
function matchingRoots(q: string, roots: RootNode[]): RootNode[] {
  const letters = q.replace(/\s+/g, '')
  const full = queryKeys(letters)[0]
  if (!full) return []
  // الصبر → صبر: the article is not part of the lemma
  const key = full.startsWith('ال') && full.length > 4 ? full.slice(2) : full
  return roots
    .filter(
      (r) => queryKeys(r.root)[0] === key || r.lemmas.some((l) => queryKeys(l.lemma).includes(key)),
    )
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
}

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const mode: SearchMode = params.get('mode') === 'part' ? 'part' : 'word'
  const [input, setInput] = useState(q)
  const deferred = useDeferredValue(input)
  const state = useAsync(
    () => Promise.all([loadSearchIndex(), loadSurahs(), loadRoots()]),
    'search',
  )

  // keep the address in step with what is being searched, without filling the history
  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams()
      if (deferred.trim()) next.set('q', deferred.trim())
      if (mode === 'part') next.set('mode', 'part')
      if (next.toString() !== params.toString()) setParams(next, { replace: true })
    }, 300)
    return () => clearTimeout(t)
  }, [deferred, mode, params, setParams])

  useEffect(() => {
    document.title = deferred.trim()
      ? `البحث: ${deferred.trim()} · آيات مرئية`
      : 'البحث · آيات مرئية'
    return () => {
      document.title = 'آيات مرئية'
    }
  }, [deferred])

  const ready = state.status === 'ready' ? state.data : null
  const byId = useMemo(() => new Map((ready?.[1].surahs ?? []).map((s) => [s.id, s])), [ready])

  const result = useMemo(() => {
    if (!ready) return null
    const parsed = parseQuery(deferred)
    if (!parsed.keys.length) return null
    const hits: Hit[] = []
    ready[0].forEach((ayahs, si) =>
      ayahs.forEach((words, ai) => {
        const m = matchAyah(words, parsed, mode)
        if (m) hits.push({ surah: si + 1, ayah: ai + 1, words: m })
      }),
    )
    const perSurah = new Map<number, number>()
    for (const h of hits) perSurah.set(h.surah, (perSurah.get(h.surah) ?? 0) + 1)
    return {
      hits,
      perSurah,
      words: parsed.keys.length === 1 ? hits.reduce((n, h) => n + h.words.length, 0) : null,
      roots: parsed.keys.length === 1 ? matchingRoots(deferred, ready[2].roots) : [],
    }
  }, [ready, deferred, mode])

  if (state.status === 'loading') return <Loading label="جارٍ تحميل الفهرس" />
  if (state.status === 'error') return <ErrorNote error={state.error} />

  const setMode = (m: SearchMode) => {
    const next = new URLSearchParams(params)
    if (m === 'part') next.set('mode', 'part')
    else next.delete('mode')
    setParams(next, { replace: true })
  }

  return (
    <div className="absolute inset-0 overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-4xl font-bold text-gold-soft">البحث في القرآن الكريم</h1>
        <p className="mt-3 text-[1.05rem] leading-relaxed text-mist">
          اكتب كلمة أو عبارة بالإملاء المعتاد، بتشكيل أو بدونه. يُطابَق ما تكتبه مع رسم المصحف، فتجد
          «الصلاة» في «<span className="font-quran text-[1.15em]">ٱلصَّلَوٰةَ</span>»، و«إبراهيم» في
          «<span className="font-quran text-[1.15em]">إِبۡرَٰهِـۧمَ</span>».
        </p>

        <form role="search" className="mt-5" onSubmit={(e) => e.preventDefault()}>
          <label htmlFor="q" className="sr-only">
            ما تبحث عنه
          </label>
          <input
            id="q"
            type="search"
            autoFocus
            autoComplete="off"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="مثل: الصبر، أو: يا أيها الذين آمنوا"
            className="w-full rounded-2xl border border-gold/30 bg-night-deep/80 px-5 py-3 text-xl text-vellum placeholder:text-mist/60 focus:border-gold/70 focus:outline-none"
          />
          <div
            className="mt-3 flex flex-wrap items-center gap-1"
            role="group"
            aria-label="طريقة المطابقة"
          >
            {(
              [
                ['word', 'الكلمة كاملة'],
                ['part', 'جزء من كلمة'],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                className={`rounded-full px-3 py-1 text-sm transition-colors ${
                  mode === m ? 'bg-gold/20 text-gold-soft' : 'text-mist hover:text-vellum'
                }`}
              >
                {label}
              </button>
            ))}
            <span className="ms-2 text-sm text-mist">
              {mode === 'word'
                ? 'تُقبل السوابق المتصلة: و، ف، ب، ل، ك، ال، يا.'
                : 'تُقبل الكلمة إذا احتوت ما كتبته في أي موضع منها.'}
            </span>
          </div>
        </form>

        {!result ? (
          <section className="mt-8" aria-labelledby="examples">
            <h2 id="examples" className="text-lg font-semibold text-vellum">
              جرّب
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {EXAMPLES.map((e) => (
                <li key={e}>
                  <button
                    type="button"
                    onClick={() => setInput(e)}
                    className="rounded-full border border-gold/25 px-4 py-1.5 font-display text-lg text-vellum hover:bg-gold/10"
                  >
                    {e}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section className="mt-8" aria-live="polite" aria-labelledby="summary">
            <h2 id="summary" className="sr-only">
              النتائج
            </h2>
            {result.hits.length > 0 ? (
              <dl className="flex flex-wrap gap-x-8 gap-y-2">
                {result.words !== null && (
                  <div>
                    <dt className="text-sm text-mist">المواضع</dt>
                    <dd className="text-2xl font-semibold text-vellum">
                      {formatNumber(result.words)}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm text-mist">الآيات</dt>
                  <dd className="text-2xl font-semibold text-vellum">
                    {formatNumber(result.hits.length)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-mist">السور</dt>
                  <dd className="text-2xl font-semibold text-vellum">
                    {formatNumber(result.perSurah.size)}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-lg font-semibold text-vellum">لا نتائج</p>
            )}
            {result.hits.length === 0 && (
              <p className="mt-2 text-mist">
                {mode === 'word'
                  ? 'لم تُوجد الكلمة كاملة. جرّب «جزء من كلمة» لتشمل ما اتصلت به الضمائر واللواحق.'
                  : 'تحقّق من الإملاء، أو اكتب جزءاً أقصر من الكلمة.'}
              </p>
            )}

            {result.roots.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-mist">
                <span className="text-sm">لتتبّع كل ما اشتُقّ من الجذر:</span>
                {result.roots.map((r) => (
                  <Link
                    key={r.root}
                    to={`/roots/${encodeURIComponent(r.root)}`}
                    className="inline-flex items-baseline gap-2 rounded-full border border-gold/30 px-3 py-1 hover:bg-gold/10"
                  >
                    <RootLetters root={r.root} className="font-display text-lg text-gold-soft" />
                    <span className="text-xs">{countOf(r.count, TIME)}</span>
                  </Link>
                ))}
              </div>
            )}

            {result.hits.length > 0 && (
              <>
                <Distribution perSurah={result.perSurah} surahs={ready![1].surahs} />
                <Results key={`${deferred}|${mode}`} hits={result.hits} byId={byId} />
              </>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
