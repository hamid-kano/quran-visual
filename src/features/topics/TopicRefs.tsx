import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { loadTopics } from '../../data/load'
import type { TopicIndex } from '../../data/schemas'
import { useAsync } from '../../data/useAsync'
import { AYAH, TOPIC, countOf, formatNumber } from '../../lib/arabic'
import {
  INTERPRETIVE_SECTION,
  buildTree,
  pathOf,
  surahTopics,
  topicsOfAyah,
  type Tree,
} from './tree'

const INTERPRETIVE_NOTE =
  'قسم «العلوم والفنون» من الفهرس يربط آياتٍ بمفاهيم علمية حديثة، وهو اجتهاد في الفهم يختلف فيه أهل العلم، يُعرض كما ورد في المصدر ولا تتبنّاه المنصة.'

/** Loads the topic index once and builds its tree. */
function useTopicTree(): { ix: TopicIndex; tree: Tree } | 'loading' | 'error' {
  const state = useAsync(loadTopics, 'topics')
  return useMemo(
    () =>
      state.status === 'ready'
        ? { ix: state.data, tree: buildTree(state.data) }
        : state.status === 'error'
          ? 'error'
          : 'loading',
    [state],
  )
}

/** One topic: the topics above it as context, its name as the link, and an optional count. */
function TopicRow({
  tree,
  id,
  context,
  count,
}: {
  tree: Tree
  id: number
  /** How many levels above the topic to name: all of them, or only the nearest. */
  context: 'path' | 'parent'
  count?: string
}) {
  const path = pathOf(tree, id)
  const node = path[path.length - 1]!
  const above = path.slice(0, -1)
  const shown = context === 'parent' ? above.slice(-1) : above
  const interpretive = path[0]?.label === INTERPRETIVE_SECTION
  return (
    <li className="py-2">
      <Link to={`/topics/${id}`} className="group block rounded px-1 py-1 hover:bg-vellum-deep">
        {shown.length > 0 && (
          <span className="block text-xs text-ink-soft">
            {shown.map((n) => n.label).join(' › ')}
          </span>
        )}
        <span className="flex items-baseline justify-between gap-3">
          <span className="font-display text-lg font-bold text-ink group-hover:underline">
            {node.label}
            {interpretive && <span className="ms-1 text-[#a6852f]">*</span>}
          </span>
          {count && <span className="shrink-0 text-sm text-ink-soft">{count}</span>}
        </span>
      </Link>
    </li>
  )
}

const SOURCE = (
  <>
    من{' '}
    <Link to="/topics" className="underline decoration-[#cdb67a] underline-offset-4">
      الفهرس الموضوعي لمصحف التجويد
    </Link>
  </>
)

const PREVIEW = 8

/** The topics a surah's ayahs are tagged with, most frequent first. */
export function SurahTopics({ surah, ayahCount }: { surah: number; ayahCount: number }) {
  const t = useTopicTree()
  const [all, setAll] = useState(false)
  const list = useMemo(() => (typeof t === 'object' ? surahTopics(t.ix, surah) : []), [t, surah])
  const classified = useMemo(() => {
    if (typeof t !== 'object') return 0
    const seen = new Set<number>()
    for (const tags of Object.values(t.ix.tags))
      for (const [s, a] of tags) if (s === surah) seen.add(a)
    return seen.size
  }, [t, surah])

  if (t === 'error') return <p className="mt-3 text-sm text-ink-soft">تعذّر تحميل الموضوعات.</p>
  if (t === 'loading') return <p className="mt-3 text-sm text-ink-soft">جارٍ التحميل…</p>
  const shown = all ? list : list.slice(0, PREVIEW)
  const interpretive = shown.some((x) => pathOf(t.tree, x.id)[0]?.label === INTERPRETIVE_SECTION)
  return (
    <>
      <p className="mt-1 text-sm text-ink-soft">
        {SOURCE}، مرتّبةً بعدد آيات السورة الموسومة بكلٍّ منها. وفي الفهرس{' '}
        {countOf(classified, AYAH)} منها، من أصل {formatNumber(ayahCount)}.
      </p>
      {list.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">لم تُصنَّف آيات هذه السورة في الفهرس.</p>
      ) : (
        <ul className="mt-2 divide-y divide-[#e0cf9f]">
          {shown.map((x) => (
            <TopicRow
              key={x.id}
              tree={t.tree}
              id={x.id}
              context="parent"
              count={countOf(x.ayahs, AYAH)}
            />
          ))}
        </ul>
      )}
      {interpretive && (
        <p className="mt-2 text-xs leading-relaxed text-ink-soft">* {INTERPRETIVE_NOTE}</p>
      )}
      {list.length > PREVIEW && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="mt-2 rounded-full border border-[#cdb67a] px-4 py-1.5 text-sm text-ink hover:bg-vellum-deep"
        >
          {all ? 'عرض أكثرها فقط' : `عرض الموضوعات كلها (${countOf(list.length, TOPIC)})`}
        </button>
      )}
    </>
  )
}

/** The topics one ayah is tagged with, each under its full path. */
export function AyahTopics({ surah, ayah }: { surah: number; ayah: number }) {
  const t = useTopicTree()
  const ids = useMemo(
    () => (typeof t === 'object' ? topicsOfAyah(t.ix, surah, ayah) : []),
    [t, surah, ayah],
  )
  if (t === 'error') return <p className="mt-3 text-sm text-ink-soft">تعذّر تحميل الموضوعات.</p>
  if (t === 'loading') return <p className="mt-3 text-sm text-ink-soft">جارٍ التحميل…</p>
  const interpretive = ids.some((id) => pathOf(t.tree, id)[0]?.label === INTERPRETIVE_SECTION)
  return (
    <>
      <p className="mt-1 text-sm text-ink-soft">{SOURCE}.</p>
      {ids.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">لم تُصنَّف هذه الآية في الفهرس.</p>
      ) : (
        <ul className="mt-2 divide-y divide-[#e0cf9f]">
          {ids.map((id) => (
            <TopicRow key={id} tree={t.tree} id={id} context="path" />
          ))}
        </ul>
      )}
      {interpretive && (
        <p className="mt-2 text-xs leading-relaxed text-ink-soft">* {INTERPRETIVE_NOTE}</p>
      )}
    </>
  )
}
