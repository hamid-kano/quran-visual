import { Suspense, lazy, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router'
import { loadRoots, loadSurahs } from '../../data/load'
import { useAsync } from '../../data/useAsync'
import { ErrorNote, Loading } from '../../components/Status'
import { SearchBox, type SearchItem } from '../../components/SearchBox'
import { TIME, countOf, formatNumber, spacedRoot } from '../../lib/arabic'
import { RootPanel } from './RootPanel'

const RootGraph = lazy(() => import('./RootGraph'))

export default function RootsPage() {
  const state = useAsync(() => Promise.all([loadRoots(), loadSurahs()]), 'roots')
  const { root } = useParams()
  const navigate = useNavigate()

  const data = state.status === 'ready' ? state.data[0] : null
  const surahs = useMemo(() => (state.status === 'ready' ? state.data[1].surahs : []), [state])
  const byRoot = useMemo(() => new Map((data?.roots ?? []).map((r) => [r.root, r])), [data])
  const searchItems = useMemo<SearchItem[]>(
    () =>
      [...(data?.roots ?? [])]
        .sort((a, b) => b.count - a.count)
        .map((r) => ({
          key: r.root,
          label: spacedRoot(r.root),
          hint: countOf(r.count, TIME),
          terms: [r.root, ...r.lemmas.map((l) => l.lemma)],
        })),
    [data],
  )

  if (state.status === 'loading') return <Loading label="جارٍ نسج شبكة الجذور" />
  if (state.status === 'error') return <ErrorNote error={state.error} />

  const selected = root && byRoot.has(root) ? root : null
  const node = selected ? byRoot.get(selected) : undefined
  const select = (r: string | null) =>
    navigate(r ? `/roots/${encodeURIComponent(r)}` : '/roots', { replace: !!selected && !!r })
  const inGraph = data!.roots.filter((r) => r.x !== null).length

  return (
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#132a49_0%,#0d1d33_60%,#08142a_100%)]">
      <Suspense fallback={<Loading label="جارٍ نسج شبكة الجذور" />}>
        <RootGraph data={data!} selected={selected} onSelect={select} />
      </Suspense>

      <section
        aria-label="أدوات الشبكة"
        className="absolute inset-x-3 top-3 z-10 rounded-2xl border border-gold/20 bg-night-deep/75 p-4 backdrop-blur sm:inset-x-auto sm:right-5 sm:top-5 sm:w-[22rem]"
      >
        <h1 className="font-display text-3xl font-bold text-gold-soft">شبكة الجذور</h1>
        <p className="mt-1 text-[0.95rem] leading-relaxed text-mist">
          {formatNumber(inGraph)} جذراً من أكثر الجذور وروداً. يصل الخط بين جذرين يجتمعان في الآيات
          أكثر مما تقتضيه الصدفة، وتشترك الجذور المتقاربة في لون واحد.
        </p>
        <div className="mt-3">
          <SearchBox
            items={searchItems}
            label="ابحث عن جذر"
            placeholder={`ابحث في ${formatNumber(data!.roots.length)} جذراً، مثل: رحم`}
            onChoose={select}
          />
        </div>
      </section>

      {node && (
        <aside
          aria-label={`تفاصيل الجذر ${spacedRoot(node.root)}`}
          className="absolute inset-x-2 bottom-2 z-10 h-[58%] sm:inset-x-auto sm:bottom-5 sm:left-5 sm:top-5 sm:h-auto sm:w-[27rem]"
        >
          <RootPanel
            key={node.root}
            node={node}
            data={data!}
            surahs={surahs}
            onSelect={select}
            onClose={() => select(null)}
          />
        </aside>
      )}
    </div>
  )
}
