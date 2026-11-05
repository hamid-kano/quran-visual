import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { loadSurahs, loadTopics } from '../../data/load'
import type { TopicIndex, TopicNode } from '../../data/schemas'
import {
  INTERPRETIVE_SECTION,
  SECTION_COLORS,
  ayahsUnder,
  buildTree,
  pathOf,
  type Tree,
} from './tree'
import { useAsync } from '../../data/useAsync'
import { ErrorNote, Loading } from '../../components/Status'
import { SearchBox, type SearchItem } from '../../components/SearchBox'
import { Distribution, OccurrenceList } from '../../components/AyahRefs'
import { ReviewLink } from '../../components/ReviewLink'
import { AYAH, SURAH, countOf, formatNumber } from '../../lib/arabic'

const useWide = () =>
  useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia('(min-width: 640px)')
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => window.matchMedia('(min-width: 640px)').matches,
    () => true,
  )

interface Cell {
  node: TopicNode
  top: number
  height: number
  depth: number
}

/**
 * Columns from right to left: the focused topic (or the sections), then its subtopics, then
 * theirs. Each box is as tall as the share of tagged ayahs under it.
 */
function Icicle({
  tree,
  focus,
  levels,
  onOpen,
}: {
  tree: Tree
  focus: number | null
  levels: number
  onOpen: (id: number | null) => void
}) {
  const cells: Cell[] = []
  const lay = (list: TopicNode[], top: number, height: number, depth: number) => {
    if (depth >= levels || !list.length) return
    const total = list.reduce((s, n) => s + tree.weight.get(n.id)!, 0)
    let y = top
    for (const n of list) {
      const h = (height * tree.weight.get(n.id)!) / total
      cells.push({ node: n, top: y, height: h, depth })
      lay(tree.children.get(n.id) ?? [], y, h, depth + 1)
      y += h
    }
  }
  const focused = focus ? tree.byId.get(focus) : undefined
  if (focused) {
    cells.push({ node: focused, top: 0, height: 100, depth: 0 })
    lay(tree.children.get(focused.id) ?? [], 0, 100, 1)
  } else lay(tree.children.get(null) ?? [], 0, 100, 0)

  const width = 100 / levels
  /** Box height in pixels, for deciding what text fits (the map is 34rem tall). */
  const px = (h: number) => (h / 100) * 544
  return (
    <div
      className="relative h-[34rem] overflow-hidden rounded-lg border border-gold/15 bg-night-deep/60"
      role="tree"
      aria-label="شجرة الموضوعات"
    >
      {cells.map(({ node, top, height, depth }) => {
        const color = SECTION_COLORS[tree.section.get(node.id)! % SECTION_COLORS.length]!
        const isFocus = node.id === focus
        const hasChildren = (tree.children.get(node.id)?.length ?? 0) > 0
        // a topic with nothing below it takes the rest of the row
        const span = hasChildren || isFocus ? 1 : levels - depth
        const roomy = px(height) >= 30
        return (
          <button
            key={node.id}
            type="button"
            role="treeitem"
            aria-selected={isFocus}
            title={`${node.label}: ${countOf(node.ayahs, AYAH)}`}
            onClick={() => onOpen(isFocus ? node.parent : node.id)}
            className="group absolute overflow-hidden border-b border-s border-night-deep text-right transition-colors"
            style={{
              right: `${depth * width}%`,
              width: `${width * span}%`,
              top: `${top}%`,
              height: `${height}%`,
              background: `color-mix(in srgb, ${color} ${isFocus ? 34 : 24 - depth * 5}%, #0d1d33)`,
            }}
          >
            <span
              className="absolute inset-y-0 right-0 w-1"
              style={{ background: color, opacity: isFocus ? 1 : 0.75 }}
              aria-hidden
            />
            {roomy && (
              <span className="flex h-full flex-col justify-start px-3 py-1.5">
                <span
                  className={`truncate leading-snug ${isFocus ? 'font-display text-xl font-bold text-gold-soft' : 'text-[0.95rem] text-vellum group-hover:text-gold-soft'}`}
                >
                  {node.label}
                </span>
                {px(height) >= 46 && (
                  <span className="text-xs text-mist">
                    {countOf(node.ayahs, AYAH)}
                    {hasChildren && !isFocus && <span aria-hidden> ‹</span>}
                  </span>
                )}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function TopicDetail({
  ix,
  tree,
  node,
  onOpen,
}: {
  ix: TopicIndex
  tree: Tree
  node: TopicNode
  onOpen: (id: number) => void
}) {
  const surahs = useAsync(loadSurahs, 'surahs')
  const list = useMemo(() => ayahsUnder(ix, tree, node.id), [ix, tree, node.id])
  const perSurah = useMemo(() => {
    const m = new Map<number, number>()
    for (const [s] of list) m.set(s, (m.get(s) ?? 0) + 1)
    return m
  }, [list])
  const subtopics = tree.children.get(node.id) ?? []
  const interpretive = pathOf(tree, node.id)[0]?.label === INTERPRETIVE_SECTION
  const data = surahs.status === 'ready' ? surahs.data.surahs : null
  const byId = useMemo(() => new Map((data ?? []).map((s) => [s.id, s])), [data])

  return (
    <article className="page rounded-md px-6 pb-8 pt-6 sm:px-8" aria-labelledby="topic-title">
      <h2 id="topic-title" className="font-display text-3xl font-bold leading-tight text-ink">
        {node.label}
      </h2>
      <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-y border-[#d8c48e] py-3">
        <div>
          <dt className="text-sm text-ink-soft">الآيات</dt>
          <dd className="text-lg font-semibold">{formatNumber(node.ayahs)}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink-soft">السور</dt>
          <dd className="text-lg font-semibold">{formatNumber(node.surahs)}</dd>
        </div>
        {subtopics.length > 0 && (
          <div>
            <dt className="text-sm text-ink-soft">الموضوعات الفرعية</dt>
            <dd className="text-lg font-semibold">{formatNumber(subtopics.length)}</dd>
          </div>
        )}
      </dl>

      {interpretive && (
        <p className="mt-4 rounded border border-[#d8c48e] bg-vellum-deep/60 px-4 py-3 text-sm leading-relaxed text-ink">
          يربط هذا القسم من الفهرس آياتٍ بمفاهيم علمية حديثة. وهو اجتهاد في الفهم يختلف فيه أهل
          العلم، يُعرض كما ورد في المصدر، ولا تتبنّاه المنصة.
        </p>
      )}

      {subtopics.length > 0 && (
        <section className="mt-6" aria-labelledby="subtopics">
          <h3 id="subtopics" className="text-lg font-semibold">
            الموضوعات الفرعية
          </h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {subtopics.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onOpen(c.id)}
                  className="inline-flex items-baseline gap-2 rounded-full border border-[#cdb67a] px-3 py-1 hover:bg-vellum-deep"
                >
                  <span>{c.label}</span>
                  <span className="text-xs text-ink-soft">{formatNumber(c.ayahs)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data && (
        <>
          <section className="mt-6" aria-labelledby="dist">
            <h3 id="dist" className="text-lg font-semibold">
              حضوره في السور
            </h3>
            <p className="mt-1 text-sm text-ink-soft">
              عدد آياته في كل سورة، من الفاتحة إلى الناس. وُسمت به آيات من{' '}
              {countOf(node.surahs, SURAH)}.
            </p>
            <Distribution perSurah={perSurah} surahs={data} label="توزيع الموضوع على السور" />
          </section>
          <section className="mt-7" aria-labelledby="ayahs">
            <h3 id="ayahs" className="text-lg font-semibold">
              آياته
            </h3>
            <OccurrenceList key={node.id} list={list} byId={byId} />
          </section>
        </>
      )}
      <ReviewLink subject={`موضوع «${node.label}»`} />
    </article>
  )
}

export default function TopicsPage() {
  const state = useAsync(loadTopics, 'topics')
  const { id } = useParams()
  const navigate = useNavigate()
  const wide = useWide()

  const ix = state.status === 'ready' ? state.data : null
  const tree = useMemo(() => (ix ? buildTree(ix) : null), [ix])
  const focus = tree && id && tree.byId.has(Number(id)) ? Number(id) : null
  const node = focus && tree ? tree.byId.get(focus)! : null

  useEffect(() => {
    document.title = node
      ? `${node.label} · خريطة الموضوعات · آيات مرئية`
      : 'خريطة الموضوعات · آيات مرئية'
    return () => {
      document.title = 'آيات مرئية'
    }
  }, [node])

  const searchItems = useMemo<SearchItem[]>(
    () =>
      tree
        ? [...tree.byId.values()]
            .sort((a, b) => b.ayahs - a.ayahs)
            .map((n) => ({
              key: String(n.id),
              label: n.label,
              hint:
                pathOf(tree, n.parent)
                  .map((p) => p.label)
                  .slice(-1)[0] ?? 'قسم',
              terms: [],
            }))
        : [],
    [tree],
  )

  if (state.status === 'loading') return <Loading label="جارٍ تحميل الفهرس" />
  if (state.status === 'error') return <ErrorNote error={state.error} />

  const open = (n: number | null) => {
    navigate(n ? `/topics/${n}` : '/topics')
    document.getElementById('topics-top')?.scrollIntoView({ block: 'start' })
  }
  const crumbs = pathOf(tree!, focus)
  const tagged = new Set(Object.values(ix!.tags).flatMap((l) => l.map(([s, a]) => `${s}:${a}`)))
    .size

  return (
    <div className="absolute inset-0 overflow-y-auto">
      <div id="topics-top" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-4xl font-bold text-gold-soft">خريطة الموضوعات</h1>
        <p className="mt-3 max-w-3xl text-[1.05rem] leading-relaxed text-mist">
          موضوعات القرآن الكريم وآياتها، من الفهرس الموضوعي لـ«مصحف التجويد» الذي أعدّه الدكتور محمد
          حبش، كما نقلته أداة «قرآني» في جامعة ليدز. تُعرض الشجرة كما وردت في الفهرس، وصُحّح إملاء
          بعض العناوين فقط. وفي الفهرس {countOf(tagged, AYAH)} مصنّفة في موضوع أو أكثر، من آيات
          القرآن كلها وعددها {formatNumber(6236)}.
        </p>

        <div className="mt-5 max-w-md">
          <SearchBox
            items={searchItems}
            label="ابحث عن موضوع"
            placeholder="ابحث عن موضوع، مثل: الصبر"
            onChoose={(k) => open(Number(k))}
          />
        </div>

        <nav
          aria-label="موضعك في الشجرة"
          className="mt-5 flex flex-wrap items-center gap-1 text-sm"
        >
          <button
            type="button"
            onClick={() => open(null)}
            className={`min-h-11 rounded-full px-3 ${focus ? 'text-mist hover:text-vellum' : 'bg-gold/15 text-gold-soft'}`}
          >
            كل الأقسام
          </button>
          {crumbs.map((c) => (
            <span key={c.id} className="flex items-center gap-1">
              <span className="text-mist/60" aria-hidden>
                ‹
              </span>
              <button
                type="button"
                onClick={() => open(c.id)}
                aria-current={c.id === focus ? 'page' : undefined}
                className={`min-h-11 rounded-full px-3 ${c.id === focus ? 'bg-gold/15 text-gold-soft' : 'text-mist hover:text-vellum'}`}
              >
                {c.label}
              </button>
            </span>
          ))}
        </nav>

        <div className="mt-4">
          <Icicle tree={tree!} focus={focus} levels={wide ? 3 : 2} onOpen={open} />
          <p className="mt-2 text-sm text-mist">
            اختر موضوعاً لتفتحه وتعرض آياته، واختر الموضوع المفتوح للرجوع إلى ما فوقه. ارتفاع كل
            موضوع بقدر ما وُسم به من آيات.
          </p>
        </div>

        <div className="mt-8">
          {node ? (
            <TopicDetail key={node.id} ix={ix!} tree={tree!} node={node} onOpen={(n) => open(n)} />
          ) : (
            <section aria-labelledby="sections">
              <h2 id="sections" className="font-display text-2xl font-bold text-vellum">
                الأقسام
              </h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {(tree!.children.get(null) ?? []).map((s) => (
                  <li key={s.id}>
                    <Link
                      to={`/topics/${s.id}`}
                      className="flex items-baseline justify-between gap-3 rounded-lg border border-gold/20 px-4 py-2.5 hover:bg-gold/10"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ background: SECTION_COLORS[tree!.section.get(s.id)!] }}
                          aria-hidden
                        />
                        <span className="font-display text-lg text-vellum">{s.label}</span>
                      </span>
                      <span className="shrink-0 text-sm text-mist">{countOf(s.ayahs, AYAH)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
