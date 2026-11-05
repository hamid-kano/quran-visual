import { useEffect, useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import type { Surah } from '../../data/schemas'
import {
  loadMorphology,
  loadNames,
  loadRoots,
  loadSimilar,
  loadSurahText,
  loadSurahs,
} from '../../data/load'
import { useAsync } from '../../data/useAsync'
import { ErrorNote, Loading } from '../../components/Status'
import { RootLetters } from '../../components/RootLetters'
import { WordExplorer } from '../../components/WordExplorer'
import {
  TIME,
  WORD,
  countOf,
  revelationLabel,
  stripTashkeel,
  toArabicDigits,
} from '../../lib/arabic'
import { adjacentAyahs, ayahPath } from '../../lib/links'
import { describeWord } from '../../lib/morphology'
import { ayahWords } from '../../lib/quran'
import { RecitationBar } from '../recitation/RecitationBar'
import { useRecitation } from '../recitation/useRecitation'
import { key, useMatches } from '../similar/matches'
import { Pair } from '../similar/Pair'
import { AyahTopics } from '../topics/TopicRefs'

const refLabel = (byId: Map<number, Surah>, [s, a]: [number, number]) =>
  `${byId.get(s)?.name ?? ''} ${toArabicDigits(a)}`

function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="page mt-5 rounded-md px-5 pb-6 pt-5 sm:px-7" aria-labelledby={id}>
      <h2 id={id} className="font-display text-2xl font-bold text-ink">
        {title}
      </h2>
      {children}
    </section>
  )
}

/** The distinct roots of an ayah's words, in the order they first occur. */
function AyahRoots({ surah, ayah }: { surah: number; ayah: number }) {
  const state = useAsync(() => Promise.all([loadMorphology(surah), loadRoots()]), `${surah}`)
  const roots = useMemo(() => {
    if (state.status !== 'ready') return null
    const words = state.data[0].ayahs[ayah - 1]
    if (!words) return []
    const seen: string[] = []
    for (const w of words) {
      const r = describeWord(w).root
      if (r && !seen.includes(r)) seen.push(r)
    }
    return seen
  }, [state, ayah])
  const countOfRoot = useMemo(
    () =>
      new Map(state.status === 'ready' ? state.data[1].roots.map((r) => [r.root, r.count]) : []),
    [state],
  )

  if (state.status === 'error')
    return <p className="mt-3 text-sm text-ink-soft">تعذّر تحميل الجذور.</p>
  if (!roots) return <p className="mt-3 text-sm text-ink-soft">جارٍ التحميل…</p>
  if (!roots.length)
    return <p className="mt-3 text-sm text-ink-soft">لا تُنسب كلمات هذه الآية إلى جذور.</p>
  return (
    <>
      <p className="mt-1 text-sm text-ink-soft">
        على ترتيب ورودها في الآية، مع عدد مرات ورود كل جذر في القرآن كله. اختر جذراً لتتبّعه.
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {roots.map((r) => (
          <li key={r}>
            <Link
              to={`/roots/${encodeURIComponent(r)}`}
              className="inline-flex min-h-11 items-baseline gap-2 rounded-full border border-[#cdb67a] px-3 py-1.5 hover:bg-vellum-deep"
            >
              <RootLetters root={r} className="font-display text-xl font-bold text-ink" />
              {countOfRoot.has(r) && (
                <span className="text-xs text-ink-soft">{countOf(countOfRoot.get(r)!, TIME)}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}

/** Proper names (prophets, peoples, places…) mentioned in the ayah. */
function AyahNames({ surah, ayah }: { surah: number; ayah: number }) {
  const state = useAsync(loadNames, 'names')
  const list = useMemo(() => {
    if (state.status !== 'ready') return []
    return state.data.names.filter((n) =>
      (state.data.occurrences[n.name] ?? []).some(([s, a]) => s === surah && a === ayah),
    )
  }, [state, surah, ayah])
  if (!list.length) return null
  return (
    <Section id="ayah-names" title="أعلام ذُكرت فيها">
      <ul className="mt-3 flex flex-wrap gap-2">
        {list.map((n) => (
          <li key={n.name}>
            <Link
              to={`/names/${encodeURIComponent(n.name)}`}
              className="inline-flex min-h-11 items-baseline gap-2 rounded-full border border-[#cdb67a] px-3 py-1.5 hover:bg-vellum-deep"
            >
              <span className="font-display text-xl font-bold text-ink">
                {stripTashkeel(n.name)}
              </span>
              <span className="text-xs text-ink-soft">{countOf(n.count, TIME)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  )
}

/** Ayahs whose wording is near or exactly the same, with their differences marked. */
function AyahSimilar({
  surah,
  ayah,
  byId,
}: {
  surah: number
  ayah: number
  byId: Map<number, Surah>
}) {
  const state = useAsync(loadSimilar, 'similar')
  const matches = useMatches(state.status === 'ready' ? state.data : null)
  const list = useMemo(
    () =>
      [...(matches.get(key(surah, ayah)) ?? [])].sort(
        (x, y) =>
          (y.score ?? 1) - (x.score ?? 1) || x.other[0] - y.other[0] || x.other[1] - y.other[1],
      ),
    [matches, surah, ayah],
  )
  const exact = list.filter((m) => m.score === null)
  const near = list.filter((m) => m.score !== null)
  const surahIds = useMemo(
    () =>
      [...new Set([surah, ...list.filter((m) => m.score !== null).map((m) => m.other[0])])].sort(
        (a, b) => a - b,
      ),
    [surah, list],
  )
  const loaded = useAsync(() => Promise.all(surahIds.map(loadSurahText)), surahIds.join(','))
  const texts = useMemo(() => {
    const m = new Map<string, string>()
    if (loaded.status === 'ready')
      for (const t of loaded.data) for (const a of t.ayahs) m.set(key(t.id, a.n), a.text)
    return m
  }, [loaded])

  if (state.status !== 'ready') return null
  return (
    <Section id="ayah-similar" title="نظائرها اللفظية">
      {list.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">
          لا توجد آية تتقارب ألفاظها معها بمقياس{' '}
          <Link to="/similar" className="underline decoration-[#cdb67a] underline-offset-4">
            المتشابهات اللفظية
          </Link>
          .
        </p>
      ) : (
        <>
          {exact.length > 0 && (
            <>
              <p className="mt-2 text-ink">ترد بلفظها نفسه في غير هذا الموضع:</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {exact.map((m) => (
                  <li key={key(...m.other)}>
                    <Link
                      to={ayahPath(...m.other)}
                      className="inline-flex min-h-11 items-center rounded-full border border-[#cdb67a] px-3 text-sm text-ink hover:bg-vellum-deep"
                    >
                      {refLabel(byId, m.other)}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          {near.length > 0 && (
            <>
              <p className={`text-sm text-ink-soft ${exact.length ? 'mt-5' : 'mt-1'}`}>
                {exact.length ? 'وتتقارب ألفاظها مع غيرها: ' : ''}يُظلَّل ما تنفرد به كل آية من
                كلمات، ويُسطَّر بنقاط ما اتفقت حروفه واختلف ضبطه.
              </p>
              <div className="mt-3 space-y-3">
                {near.map((m) => (
                  <Pair
                    key={key(...m.other)}
                    base={[surah, ayah]}
                    match={m}
                    texts={texts}
                    byId={byId}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </Section>
  )
}

function AyahView({ surah, ayah, surahs }: { surah: Surah; ayah: number; surahs: Surah[] }) {
  const byId = useMemo(() => new Map(surahs.map((s) => [s.id, s])), [surahs])
  const text = useAsync(() => loadSurahText(surah.id), String(surah.id))
  // recitation ends with this ayah; it starts with the basmala only for a surah's first ayah
  const recitation = useRecitation(surah.id, surah.name, ayah)
  const { prev, next } = adjacentAyahs(
    surahs.map((s) => s.ayahs),
    surah.id,
    ayah,
  )
  const line = text.status === 'ready' ? text.data.ayahs[ayah - 1] : undefined
  const title = `سورة ${surah.name}، الآية ${toArabicDigits(ayah)}`

  useEffect(() => {
    document.title = `${title} · آيات مرئية`
    return () => {
      document.title = 'آيات مرئية'
    }
  }, [title])

  const nav =
    'inline-flex min-h-11 items-center rounded-full px-3 text-sm text-mist hover:bg-gold/10 hover:text-vellum'
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <nav aria-label="مسار الصفحة" className="flex flex-wrap items-center gap-1 text-sm text-mist">
        <Link to={`/surah/${surah.id}`} className={nav}>
          سورة {surah.name}
        </Link>
        <span aria-hidden>›</span>
        <span className="px-3 text-vellum" aria-current="page">
          الآية {toArabicDigits(ayah)}
        </span>
      </nav>

      <h1 className="mt-2 font-display text-4xl font-bold text-gold-soft">{title}</h1>
      <p className="mt-2 text-mist">
        سورة {revelationLabel(surah.revelation)}، رقمها في المصحف {toArabicDigits(surah.id)}
        {line && <>، وفي الآية {countOf(ayahWords(line.text).length, WORD)}</>}.
      </p>

      <article className="page mt-5 rounded-md px-5 pb-6 pt-5 sm:px-7" aria-label="نص الآية">
        <RecitationBar r={recitation} ayahCount={surah.ayahs} single={ayah} />
        {text.status === 'loading' && <p className="mt-4 text-ink-soft">جارٍ تحميل النص…</p>}
        {text.status === 'error' && (
          <p className="mt-4 text-ink-soft">تعذّر تحميل النص. أعد المحاولة لاحقاً.</p>
        )}
        {line && (
          <div
            className={`mt-4 rounded ${recitation.step && !recitation.step.basmala ? 'bg-[#efe0b4]/60' : ''}`}
          >
            <WordExplorer surah={surah.id} ayahs={[line]} linkAyahs={false} />
          </div>
        )}
        <p className="mt-2 text-sm text-ink-soft">اختر أي كلمة لمعرفة جذرها ووزنها.</p>
      </article>

      <nav aria-label="الآيات المجاورة" className="mt-4 flex justify-between gap-3">
        {prev ? (
          <Link to={ayahPath(...prev)} className={nav} rel="prev">
            → السابقة: {refLabel(byId, prev)}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link to={ayahPath(...next)} className={nav} rel="next">
            التالية: {refLabel(byId, next)} ←
          </Link>
        )}
      </nav>

      <Section id="ayah-roots" title="جذور كلماتها">
        <AyahRoots surah={surah.id} ayah={ayah} />
      </Section>

      <Section id="ayah-topics" title="موضوعاتها">
        <AyahTopics surah={surah.id} ayah={ayah} />
      </Section>

      <AyahNames surah={surah.id} ayah={ayah} />
      <AyahSimilar surah={surah.id} ayah={ayah} byId={byId} />
    </div>
  )
}

export default function AyahPage() {
  const state = useAsync(loadSurahs, 'surahs')
  const params = useParams()
  if (state.status === 'loading') return <Loading />
  if (state.status === 'error') return <ErrorNote error={state.error} />
  const surahs = state.data.surahs
  const s = /^\d+$/.test(params.surah ?? '') ? surahs[Number(params.surah) - 1] : undefined
  if (!s) return <Navigate to="/" replace />
  const a = /^\d+$/.test(params.ayah ?? '') ? Number(params.ayah) : 0
  if (a < 1 || a > s.ayahs) return <Navigate to={`/surah/${s.id}`} replace />

  return (
    <div className="absolute inset-0 overflow-y-auto">
      <AyahView key={`${s.id}:${a}`} surah={s} ayah={a} surahs={surahs} />
    </div>
  )
}
