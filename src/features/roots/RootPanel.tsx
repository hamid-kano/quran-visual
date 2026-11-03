import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { RootIndex, RootNode, Surah } from '../../data/schemas'
import { loadRootOccurrences, loadSurahText } from '../../data/load'
import { useAsync } from '../../data/useAsync'
import { formatNumber, spacedRoot, toArabicDigits } from '../../lib/arabic'
import { AyahMark } from '../../components/AyahText'
import { RootLetters } from '../../components/RootLetters'

const PAGE = 8

/** Ayahs containing the root, per surah, drawn across the 114 surahs in mushaf order. */
function Distribution({ perSurah, surahs }: { perSurah: Map<number, number>; surahs: Surah[] }) {
  const max = Math.max(1, ...perSurah.values())
  const W = 342
  const H = 64
  const bw = W / 114
  return (
    <figure className="mt-3">
      <svg
        viewBox={`0 0 ${W} ${H + 2}`}
        className="w-full"
        role="img"
        aria-label="توزيع الجذر على السور"
      >
        <line x1={0} x2={W} y1={H} y2={H} stroke="#cdb67a" strokeWidth={0.6} />
        {surahs.map((s, i) => {
          const v = perSurah.get(s.id) ?? 0
          if (!v) return null
          const h = Math.max(1.5, (v / max) * (H - 2))
          return (
            <rect
              key={s.id}
              // mushaf order flows right-to-left
              x={W - (i + 1) * bw + 0.25}
              y={H - h}
              width={Math.max(bw - 0.5, 0.8)}
              height={h}
              fill={s.revelation === 'meccan' ? '#a6852f' : '#3f8a77'}
            >
              <title>{`سورة ${s.name}: ${toArabicDigits(v)} آية`}</title>
            </rect>
          )
        })}
      </svg>
      <div className="flex justify-between text-xs text-ink-soft" aria-hidden>
        <span>الفاتحة</span>
        <span>الناس</span>
      </div>
      <figcaption className="mt-1 flex gap-4 text-xs text-ink-soft">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-[#a6852f]" /> سورة مكية
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-[#3f8a77]" /> سورة مدنية
        </span>
      </figcaption>
    </figure>
  )
}

function Occurrences({ list, byId }: { list: [number, number][]; byId: Map<number, Surah> }) {
  const [shown, setShown] = useState(PAGE)
  const visible = list.slice(0, shown)
  const surahIds = useMemo(() => [...new Set(visible.map(([s]) => s))], [visible])
  const texts = useAsync(() => Promise.all(surahIds.map(loadSurahText)), surahIds.join(','))
  const textOf = useMemo(() => {
    const m = new Map<string, string>()
    if (texts.status === 'ready')
      for (const t of texts.data) for (const a of t.ayahs) m.set(`${t.id}:${a.n}`, a.text)
    return m
  }, [texts])

  return (
    <div className="mt-3">
      <ol className="divide-y divide-[#e0cf9f]">
        {visible.map(([s, a]) => (
          <li key={`${s}:${a}`} className="py-3">
            <Link
              to={`/surah/${s}`}
              className="text-sm text-ink-soft hover:text-ink hover:underline"
            >
              سورة {byId.get(s)?.name}، الآية {toArabicDigits(a)}
            </Link>
            <p className="ayah mt-1 text-[1.3rem] leading-[2.2]">
              {textOf.get(`${s}:${a}`) ?? '…'} <AyahMark n={a} />
            </p>
          </li>
        ))}
      </ol>
      {shown < list.length && (
        <button
          type="button"
          onClick={() => setShown((n) => n + PAGE)}
          className="mt-2 rounded-full border border-[#cdb67a] px-4 py-1.5 text-sm text-ink hover:bg-vellum-deep"
        >
          عرض المزيد ({toArabicDigits(list.length - shown)} آية متبقية)
        </button>
      )}
    </div>
  )
}

export function RootPanel({
  node,
  data,
  surahs,
  onSelect,
  onClose,
}: {
  node: RootNode
  data: RootIndex
  surahs: Surah[]
  onSelect: (r: string) => void
  onClose: () => void
}) {
  const occ = useAsync(loadRootOccurrences, 'occ')
  const byId = useMemo(() => new Map(surahs.map((s) => [s.id, s])), [surahs])
  const list = useMemo(
    () => (occ.status === 'ready' ? (occ.data[node.root] ?? []) : []),
    [occ, node.root],
  )
  const perSurah = useMemo(() => {
    const m = new Map<number, number>()
    for (const [s] of list) m.set(s, (m.get(s) ?? 0) + 1)
    return m
  }, [list])
  const related = useMemo(
    () =>
      data.edges
        .filter((e) => e.a === node.root || e.b === node.root)
        .map((e) => ({ root: e.a === node.root ? e.b : e.a, together: e.together, npmi: e.npmi }))
        .sort((x, y) => y.npmi - x.npmi),
    [data.edges, node.root],
  )

  useEffect(() => {
    document.title = `جذر ${spacedRoot(node.root)} · آيات مرئية`
    return () => {
      document.title = 'آيات مرئية'
    }
  }, [node.root])

  return (
    <article
      className="page scrollbar-thin h-full overflow-y-auto rounded-md px-6 pb-8 pt-6"
      aria-labelledby="root-title"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-soft">الجذر</p>
          <h2 id="root-title" className="font-display text-5xl font-bold leading-tight text-ink">
            <RootLetters root={node.root} />
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-3 py-1 text-sm text-ink-soft hover:bg-vellum-deep hover:text-ink"
        >
          إغلاق
        </button>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-4 border-y border-[#d8c48e] py-4">
        <div>
          <dt className="text-sm text-ink-soft">ورد</dt>
          <dd className="font-display text-xl font-bold">
            {formatNumber(node.count)} <span className="font-normal">مرة</span>
          </dd>
        </div>
        <div>
          <dt className="text-sm text-ink-soft">في آيات</dt>
          <dd className="font-display text-xl font-bold">
            {list.length ? formatNumber(list.length) : '…'}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-ink-soft">في سور</dt>
          <dd className="font-display text-xl font-bold">{formatNumber(node.surahs)}</dd>
        </div>
      </dl>

      {node.lemmas.length > 0 && (
        <section className="mt-6" aria-labelledby="lemmas">
          <h3 id="lemmas" className="font-display text-xl font-bold">
            ما اشتُقّ منه
          </h3>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {node.lemmas.map((l) => (
              <li key={l.lemma} className="flex items-baseline gap-1.5">
                <span className="font-quran text-2xl text-ink">{l.lemma}</span>
                <span className="text-xs text-ink-soft">{toArabicDigits(l.count)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6" aria-labelledby="dist">
        <h3 id="dist" className="font-display text-xl font-bold">
          حضوره في السور
        </h3>
        <p className="mt-1 text-sm text-ink-soft">
          عدد الآيات التي ورد فيها، من الفاتحة إلى الناس.
        </p>
        {occ.status === 'ready' && <Distribution perSurah={perSurah} surahs={surahs} />}
      </section>

      {related.length > 0 && (
        <section className="mt-6" aria-labelledby="related">
          <h3 id="related" className="font-display text-xl font-bold">
            جذور يجتمع معها
          </h3>
          <p className="mt-1 text-sm text-ink-soft">
            تَرِد معه في الآية نفسها أكثر مما تقتضيه نسبة ورود كلٍّ منهما.
          </p>
          <ul className="mt-3 space-y-1">
            {related.map((r) => (
              <li key={r.root}>
                <button
                  type="button"
                  onClick={() => onSelect(r.root)}
                  className="flex w-full items-baseline justify-between rounded px-1 py-1 text-right hover:bg-vellum-deep"
                >
                  <RootLetters root={r.root} className="font-display text-xl font-bold" />
                  <span className="text-sm text-ink-soft">
                    معاً في {formatNumber(r.together)} آية
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-7" aria-labelledby="occ">
        <h3 id="occ" className="font-display text-xl font-bold">
          مواضعه في القرآن
        </h3>
        {occ.status === 'loading' && <p className="mt-3 text-ink-soft">جارٍ التحميل…</p>}
        {occ.status === 'error' && <p className="mt-3 text-ink-soft">تعذّر تحميل المواضع.</p>}
        {occ.status === 'ready' && <Occurrences key={node.root} list={list} byId={byId} />}
      </section>
    </article>
  )
}
