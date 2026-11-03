import { useMemo } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { loadSimilar, loadSurahText, loadSurahs } from '../../data/load'
import { useAsync } from '../../data/useAsync'
import type { SimilarIndex, Surah } from '../../data/schemas'
import { ErrorNote, Loading } from '../../components/Status'
import { AyahMark } from '../../components/AyahText'
import { SearchBox, type SearchItem } from '../../components/SearchBox'
import { AYAH, countOf, formatNumber, formatPercent, toArabicDigits } from '../../lib/arabic'
import { ayahWords, commonWords, wordKey } from '../../lib/quran'

type Ref = [number, number]
const key = (s: number, a: number) => `${s}:${a}`

interface Match {
  other: Ref
  score: number | null // null: repeated word for word
}

/** For every ayah, the ayahs similar to it. */
function useMatches(data: SimilarIndex | null) {
  return useMemo(() => {
    const m = new Map<string, Match[]>()
    const add = (from: Ref, match: Match) =>
      m.set(key(...from), [...(m.get(key(...from)) ?? []), match])
    if (!data) return m
    for (const [s1, a1, s2, a2, score] of data.pairs) {
      add([s1, a1], { other: [s2, a2], score: score / 100 })
      add([s2, a2], { other: [s1, a1], score: score / 100 })
    }
    for (const group of data.repeats)
      for (const r of group)
        for (const o of group) if (o !== r) add(r as Ref, { other: o as Ref, score: null })
    return m
  }, [data])
}

/** An ayah with the words it does not share with its counterpart marked. */
function DiffLine({ text, marked, n }: { text: string; marked: Set<number>; n: number }) {
  const words = ayahWords(text)
  return (
    <p className="ayah text-[1.35rem] leading-[2.3]">
      {words.map((w, i) => (
        <span key={i}>
          {marked.has(i) ? (
            <mark className="rounded bg-[#ead9a8] px-0.5 text-[#6b4a0c]">{w}</mark>
          ) : (
            w
          )}{' '}
        </span>
      ))}
      <AyahMark n={n} />
    </p>
  )
}

function Pair({
  base,
  match,
  texts,
  byId,
}: {
  base: Ref
  match: Match
  texts: Map<string, string>
  byId: Map<number, Surah>
}) {
  const a = texts.get(key(...base))
  const b = texts.get(key(...match.other))
  if (!a || !b) return <p className="text-ink-soft">…</p>
  const wa = ayahWords(a)
  const wb = ayahWords(b)
  const [ka, kb] = commonWords(wa.map(wordKey), wb.map(wordKey))
  const onlyA = new Set(wa.map((_, i) => i).filter((i) => !ka.has(i)))
  const onlyB = new Set(wb.map((_, i) => i).filter((i) => !kb.has(i)))
  const [s, n] = match.other
  return (
    <div className="border-t border-[#e0cf9f] pt-3">
      <p className="flex flex-wrap items-baseline justify-between gap-2 text-sm text-ink-soft">
        <Link to={`/similar/${s}`} className="hover:text-ink hover:underline">
          سورة {byId.get(s)?.name}، الآية {toArabicDigits(n)}
        </Link>
        <span>
          {match.score === null ? 'مكرّرة بلفظها' : `تطابق ${formatPercent(match.score)}`}
        </span>
      </p>
      {match.score === null ? (
        <p className="ayah text-[1.35rem] leading-[2.3]">
          {b} <AyahMark n={n} />
        </p>
      ) : (
        <>
          <DiffLine text={b} marked={onlyB} n={n} />
          <p className="mt-1 text-xs text-ink-soft">وفي الآية الأصل يختلف:</p>
          <DiffLine text={a} marked={onlyA} n={base[1]} />
        </>
      )}
    </div>
  )
}

function SurahView({
  surah,
  matches,
  byId,
}: {
  surah: Surah
  matches: Map<string, Match[]>
  byId: Map<number, Surah>
}) {
  const ayahs = useMemo(
    () =>
      Array.from({ length: surah.ayahs }, (_, i) => i + 1).filter((a) =>
        matches.has(key(surah.id, a)),
      ),
    [surah, matches],
  )
  const surahIds = useMemo(() => {
    const ids = new Set([surah.id])
    for (const a of ayahs) for (const m of matches.get(key(surah.id, a))!) ids.add(m.other[0])
    return [...ids].sort((x, y) => x - y)
  }, [surah, ayahs, matches])
  const loaded = useAsync(() => Promise.all(surahIds.map(loadSurahText)), surahIds.join(','))
  const texts = useMemo(() => {
    const m = new Map<string, string>()
    if (loaded.status === 'ready')
      for (const t of loaded.data) for (const a of t.ayahs) m.set(key(t.id, a.n), a.text)
    return m
  }, [loaded])

  return (
    <section aria-labelledby="surah-similar" className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="surah-similar" className="font-display text-3xl font-bold text-gold-soft">
          سورة {surah.name}
        </h2>
        <p className="text-mist">
          {ayahs.length
            ? `لها نظائر في ${countOf(ayahs.length, AYAH)}`
            : 'لا توجد فيها آيات تتشابه مع غيرها بهذا المقياس'}
        </p>
      </div>
      <ol className="mt-4 space-y-5">
        {ayahs.map((a) => {
          const list = [...matches.get(key(surah.id, a))!].sort(
            (x, y) =>
              (y.score ?? 1) - (x.score ?? 1) || x.other[0] - y.other[0] || x.other[1] - y.other[1],
          )
          return (
            <li key={a} className="page rounded-md px-5 py-4 sm:px-7">
              <p className="text-sm text-ink-soft">الآية {toArabicDigits(a)}</p>
              <p className="ayah text-[1.4rem] leading-[2.3]">
                {texts.get(key(surah.id, a)) ?? '…'} <AyahMark n={a} />
              </p>
              <div className="mt-2 space-y-3">
                {list.map((m) => (
                  <Pair
                    key={key(...m.other)}
                    base={[surah.id, a]}
                    match={m}
                    texts={texts}
                    byId={byId}
                  />
                ))}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export default function SimilarPage() {
  const state = useAsync(() => Promise.all([loadSimilar(), loadSurahs()]), 'similar')
  const { id } = useParams()
  const navigate = useNavigate()
  const data = state.status === 'ready' ? state.data[0] : null
  const surahs = useMemo(() => (state.status === 'ready' ? state.data[1].surahs : []), [state])
  const byId = useMemo(() => new Map(surahs.map((s) => [s.id, s])), [surahs])
  const matches = useMatches(data)
  const perSurah = useMemo(() => {
    const m = new Map<number, number>()
    for (const k of matches.keys()) {
      const s = Number(k.split(':')[0])
      m.set(s, (m.get(s) ?? 0) + 1)
    }
    return m
  }, [matches])
  const items = useMemo<SearchItem[]>(
    () =>
      surahs.map((s) => ({
        key: String(s.id),
        label: `سورة ${s.name}`,
        hint: formatNumber(perSurah.get(s.id) ?? 0),
        terms: [s.name, String(s.id), toArabicDigits(s.id)],
      })),
    [surahs, perSurah],
  )

  if (state.status === 'loading') return <Loading />
  if (state.status === 'error') return <ErrorNote error={state.error} />
  const surah = id ? byId.get(Number(id)) : undefined
  if (id && !surah) return <Navigate to="/similar" replace />

  return (
    <div className="absolute inset-0 overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-4xl font-bold text-gold-soft">المتشابهات اللفظية</h1>
        <p className="mt-3 text-[1.05rem] leading-relaxed text-mist">
          آيات تتقارب ألفاظها حتى يلتبس بعضها ببعض على الحافظ. تُعرض الآية مع نظائرها، وتُظلَّل
          الكلمات التي تنفرد بها كل آية عن نظيرتها. القياس لفظي آلي: تُعدّ الآيتان متشابهتين إذا
          اشتركتا في ستين في المئة من كلماتهما على ترتيبها.
        </p>
        <div className="mt-5 max-w-md">
          <SearchBox
            items={items}
            label="اختر سورة"
            placeholder="اختر سورة لعرض متشابهاتها"
            onChoose={(k) => navigate(`/similar/${k}`)}
          />
        </div>

        {surah ? (
          <SurahView key={surah.id} surah={surah} matches={matches} byId={byId} />
        ) : (
          <section aria-labelledby="by-surah" className="mt-8">
            <h2 id="by-surah" className="font-display text-2xl font-bold text-vellum">
              السور ونظائرها
            </h2>
            <p className="mt-1 text-sm text-mist">
              عدد آيات كل سورة التي لها نظير في موضع آخر. {formatNumber(data!.pairs.length)} زوجاً
              من الآيات المتقاربة، و{formatNumber(data!.repeats.length)} آية تتكرر بلفظها في أكثر من
              موضع.
            </p>
            <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {surahs.map((s) => {
                const n = perSurah.get(s.id) ?? 0
                return (
                  <li key={s.id}>
                    <Link
                      to={`/similar/${s.id}`}
                      className={`flex items-baseline justify-between rounded-lg border px-3 py-2 ${
                        n
                          ? 'border-gold/25 text-vellum hover:bg-gold/10'
                          : 'border-gold/10 text-mist/60'
                      }`}
                    >
                      <span className="font-display text-lg">{s.name}</span>
                      <span className="text-sm text-mist">{formatNumber(n)}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
