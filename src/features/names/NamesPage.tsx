import { Suspense, lazy, useMemo } from 'react'
import { MapCard } from '../../components/MapCard'
import { SheetPanel } from '../../components/SheetPanel'
import { Link, useNavigate, useParams } from 'react-router'
import { ReviewLink } from '../../components/ReviewLink'
import { loadNames, loadSurahs } from '../../data/load'
import { useAsync } from '../../data/useAsync'
import type { NameIndex, NameNode, Surah } from '../../data/schemas'
import { ErrorNote, Loading } from '../../components/Status'
import { SearchBox, type SearchItem } from '../../components/SearchBox'
import { Distribution, OccurrenceList } from '../../components/AyahRefs'
import type { NetworkNode } from '../../components/NetworkGraph'
import { TIME, countOf, formatNumber, stripTashkeel } from '../../lib/arabic'
import { communityColor } from '../roots/colors'

const NetworkGraph = lazy(() => import('../../components/NetworkGraph'))

/** Name without diacritics, for compact labels. */
const plain = stripTashkeel

function NamePanel({
  node,
  data,
  surahs,
  onSelect,
  onClose,
}: {
  node: NameNode
  data: NameIndex
  surahs: Surah[]
  onSelect: (n: string) => void
  onClose: () => void
}) {
  const list = useMemo(() => data.occurrences[node.name] ?? [], [data, node.name])
  const byId = useMemo(() => new Map(surahs.map((s) => [s.id, s])), [surahs])
  const perSurah = useMemo(() => {
    const m = new Map<number, number>()
    for (const [s] of list) m.set(s, (m.get(s) ?? 0) + 1)
    return m
  }, [list])
  const together = useMemo(
    () =>
      data.edges
        .filter((e) => e.a === node.name || e.b === node.name)
        .map((e) => ({ name: e.a === node.name ? e.b : e.a, together: e.together }))
        .sort((x, y) => y.together - x.together || x.name.localeCompare(y.name)),
    [data.edges, node.name],
  )

  return (
    <article
      className="page scrollbar-thin h-full overflow-y-auto rounded-md px-6 pb-8 pt-6"
      aria-labelledby="name-title"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 id="name-title" className="font-display text-5xl font-bold leading-[1.5] text-ink">
          {plain(node.name)}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-full px-3 text-sm text-ink-soft hover:bg-vellum-deep hover:text-ink"
        >
          إغلاق
        </button>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-4 border-y border-[#d8c48e] py-4">
        <div>
          <dt className="text-sm text-ink-soft">ورد</dt>
          <dd className="text-lg font-semibold">{countOf(node.count, TIME)}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink-soft">في آيات</dt>
          <dd className="text-lg font-semibold">{formatNumber(list.length)}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink-soft">في سور</dt>
          <dd className="text-lg font-semibold">{formatNumber(node.surahs)}</dd>
        </div>
      </dl>

      <section className="mt-6" aria-labelledby="name-dist">
        <h3 id="name-dist" className="font-display text-xl font-bold">
          حضوره في السور
        </h3>
        <Distribution perSurah={perSurah} surahs={surahs} label="توزيع ذكره على السور" />
      </section>

      {together.length > 0 && (
        <section className="mt-6" aria-labelledby="name-with">
          <h3 id="name-with" className="font-display text-xl font-bold">
            يُذكر معه في الآية نفسها
          </h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {together.map((t) => (
              <li key={t.name}>
                <button
                  type="button"
                  onClick={() => onSelect(t.name)}
                  className="inline-flex items-baseline gap-2 rounded-full border border-[#cdb67a] px-3 py-1 hover:bg-vellum-deep"
                >
                  <span className="font-display text-lg">{plain(t.name)}</span>
                  <span className="text-xs text-ink-soft">{formatNumber(t.together)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-7" aria-labelledby="name-occ">
        <h3 id="name-occ" className="font-display text-xl font-bold">
          مواضع ذكره
        </h3>
        <OccurrenceList key={node.name} list={list} byId={byId} />
      </section>
      <ReviewLink subject={`العلم «${stripTashkeel(node.name)}»`} />
    </article>
  )
}

export default function NamesPage() {
  const state = useAsync(() => Promise.all([loadNames(), loadSurahs()]), 'names')
  const { name } = useParams()
  const navigate = useNavigate()
  const data = state.status === 'ready' ? state.data[0] : null
  const surahs = useMemo(() => (state.status === 'ready' ? state.data[1].surahs : []), [state])

  const nodes = useMemo<NetworkNode[]>(
    () =>
      (data?.names ?? [])
        .filter((n) => n.community >= 0)
        .map((n) => ({
          key: n.name,
          label: plain(n.name),
          x: n.x,
          y: n.y,
          size: 1.6 + Math.sqrt(n.count) * 0.22,
          color: communityColor(n.community),
          weight: n.count,
        })),
    [data],
  )
  const items = useMemo<SearchItem[]>(
    () =>
      [...(data?.names ?? [])]
        .sort((a, b) => b.count - a.count)
        .map((n) => ({
          key: n.name,
          label: plain(n.name),
          hint: countOf(n.count, TIME),
          terms: [n.name],
        })),
    [data],
  )

  if (state.status === 'loading') return <Loading />
  if (state.status === 'error') return <ErrorNote error={state.error} />

  const byName = new Map(data!.names.map((n) => [n.name, n]))
  const selected = name && byName.has(name) ? name : null
  const node = selected ? byName.get(selected) : undefined
  const select = (n: string | null) =>
    navigate(n ? `/names/${encodeURIComponent(n)}` : '/names', { replace: !!selected && !!n })

  return (
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#132a49_0%,#0d1d33_60%,#08142a_100%)]">
      <Suspense fallback={<Loading />}>
        <NetworkGraph
          nodes={nodes}
          edges={data!.edges}
          selected={selected}
          onSelect={select}
          labelThreshold={0}
          focusRatio={0.85}
          ariaLabel="شبكة الأعلام: كل نقطة اسم علم، ويصل الخط بين اسمين ذُكرا في آية واحدة"
        />
      </Suspense>

      <MapCard
        title="أسماء الأعلام"
        label="أدوات الشبكة"
        search={
          <SearchBox
            items={items}
            label="ابحث عن اسم"
            placeholder="ابحث عن اسم، مثل: موسى"
            onChoose={select}
          />
        }
      >
        <p className="mt-3 text-[0.95rem] leading-relaxed text-mist">
          الكلمات التي وسمتها المدوّنة القرآنية أسماءَ أعلام: أنبياء وأقوام وأماكن وكتب، وأسماء
          للجنة والنار وغير ذلك. يصل الخط بين اسمين ذُكرا في آية واحدة، ويكبر الاسم بعدد مرات ذكره.
          ولم يُدرج لفظ الجلالة: ورد في ١٨٢٥ آية، ويجتمع في الآيات مع ٦٤ اسماً من هذه الأسماء، فلو
          أُدرج لتوسّط الشبكة وغلب على الروابط بين بقية الأسماء.
        </p>
        <p className="mt-2 text-xs text-mist">
          الأسماء التي لم تجتمع مع غيرها في آية تظهر في البحث فقط.{' '}
          <Link to="/about" className="underline underline-offset-4">
            المنهج
          </Link>
        </p>
      </MapCard>

      {node && (
        <SheetPanel label={`تفاصيل ${plain(node.name)}`}>
          <NamePanel
            key={node.name}
            node={node}
            data={data!}
            surahs={surahs}
            onSelect={select}
            onClose={() => select(null)}
          />
        </SheetPanel>
      )}
    </div>
  )
}
