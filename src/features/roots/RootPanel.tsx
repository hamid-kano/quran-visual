import { useEffect, useMemo } from 'react'
import { Link } from 'react-router'
import { rootLemmaPath } from '../../lib/lexicon'
import type { RootIndex, RootNode, Surah } from '../../data/schemas'
import { loadRootOccurrences } from '../../data/load'
import { useAsync } from '../../data/useAsync'
import { AYAH, TIME, countOf, formatNumber, spacedRoot, toArabicDigits } from '../../lib/arabic'
import { Distribution, OccurrenceList } from '../../components/AyahRefs'
import { RootLetters } from '../../components/RootLetters'
import { ReviewLink } from '../../components/ReviewLink'

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
  const occ = useAsync(() => loadRootOccurrences(node.root), node.root)
  const byId = useMemo(() => new Map(surahs.map((s) => [s.id, s])), [surahs])
  const list = useMemo(() => (occ.status === 'ready' ? occ.data : []), [occ])
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
          className="min-h-11 rounded-full px-3 text-sm text-ink-soft hover:bg-vellum-deep hover:text-ink"
        >
          إغلاق
        </button>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-4 border-y border-[#d8c48e] py-4">
        <div>
          <dt className="text-sm text-ink-soft">ورد</dt>
          <dd className="font-display text-xl font-bold">{countOf(node.count, TIME)}</dd>
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
          <p className="mt-1 text-sm text-ink-soft">اختر لفظاً لتراه في معجم الألفاظ.</p>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {node.lemmas.map((l) => (
              <li key={l.lemma}>
                <Link
                  to={rootLemmaPath(l.lemma, node.root)}
                  className="-my-1 inline-flex items-baseline gap-1.5 rounded px-1 py-1 hover:bg-vellum-deep"
                >
                  <span className="font-quran text-2xl text-ink">{l.lemma}</span>
                  <span className="text-xs text-ink-soft">{toArabicDigits(l.count)}</span>
                </Link>
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
        {occ.status === 'ready' && (
          <Distribution perSurah={perSurah} surahs={surahs} label="توزيع الجذر على السور" />
        )}
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
                  <span className="text-sm text-ink-soft">معاً في {countOf(r.together, AYAH)}</span>
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
        {occ.status === 'ready' && <OccurrenceList key={node.root} list={list} byId={byId} />}
      </section>
      <ReviewLink subject={`الجذر «${spacedRoot(node.root)}»`} />
    </article>
  )
}
