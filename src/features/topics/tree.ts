import type { TopicIndex, TopicNode } from '../../data/schemas'

/** One hue per section, in the site's illuminated palette. */
export const SECTION_COLORS = [
  '#e2c46f',
  '#5fb7a1',
  '#d98c6a',
  '#8fb3e8',
  '#c99bd6',
  '#a7c46a',
  '#e8a1b0',
  '#6fc3d6',
  '#d7b98a',
  '#9aa7f0',
  '#c7d98f',
  '#e0a45e',
  '#b9a1e0',
  '#7fc9b0',
  '#e6b3a0',
]

/** The section that a scientific reading of ayahs belongs to: flagged wherever it appears. */
export const INTERPRETIVE_SECTION = 'العلوم والفنون'

export interface Tree {
  byId: Map<number, TopicNode>
  children: Map<number | null, TopicNode[]>
  /** Additive size for the layout: (ayah, topic) tags in the subtree. */
  weight: Map<number, number>
  section: Map<number, number>
}

export function buildTree(ix: TopicIndex): Tree {
  const byId = new Map(ix.nodes.map((n) => [n.id, n]))
  const children = new Map<number | null, TopicNode[]>()
  for (const n of ix.nodes) children.set(n.parent, [...(children.get(n.parent) ?? []), n])
  const weight = new Map<number, number>()
  const w = (n: TopicNode): number => {
    const v = n.direct + (children.get(n.id) ?? []).reduce((s, c) => s + w(c), 0)
    weight.set(n.id, v)
    return v
  }
  const roots = children.get(null) ?? []
  roots.forEach(w)
  for (const list of children.values()) list.sort((a, b) => weight.get(b.id)! - weight.get(a.id)!)
  const section = new Map<number, number>()
  roots.forEach((r, i) => {
    const mark = (n: TopicNode) => {
      section.set(n.id, i)
      ;(children.get(n.id) ?? []).forEach(mark)
    }
    mark(r)
  })
  return { byId, children, weight, section }
}

export const pathOf = (tree: Tree, id: number | null) => {
  const out: TopicNode[] = []
  for (
    let n = id ? tree.byId.get(id) : undefined;
    n;
    n = n.parent ? tree.byId.get(n.parent) : undefined
  )
    out.unshift(n)
  return out
}

/** Distinct ayahs under a topic, in mushaf order. */
export function ayahsUnder(ix: TopicIndex, tree: Tree, id: number): [number, number][] {
  const seen = new Map<string, [number, number]>()
  const walk = (n: number) => {
    for (const [s, a] of ix.tags[String(n)] ?? []) seen.set(`${s}:${a}`, [s, a])
    for (const c of tree.children.get(n) ?? []) walk(c.id)
  }
  walk(id)
  return [...seen.values()].sort((x, y) => x[0] - y[0] || x[1] - y[1])
}
/** Topics an ayah is tagged with directly, in the index's order. */
export function topicsOfAyah(ix: TopicIndex, surah: number, ayah: number): number[] {
  const out: number[] = []
  for (const n of ix.nodes)
    if ((ix.tags[String(n.id)] ?? []).some(([s, a]) => s === surah && a === ayah)) out.push(n.id)
  return out
}

/**
 * The topics a surah's ayahs are tagged with directly, each with how many of the surah's ayahs
 * carry it: most first, then in the index's order.
 */
export function surahTopics(ix: TopicIndex, surah: number): { id: number; ayahs: number }[] {
  const out: { id: number; ayahs: number; at: number }[] = []
  ix.nodes.forEach((n, at) => {
    const ayahs = new Set(
      (ix.tags[String(n.id)] ?? []).filter(([s]) => s === surah).map(([, a]) => a),
    ).size
    if (ayahs) out.push({ id: n.id, ayahs, at })
  })
  return out
    .sort((x, y) => y.ayahs - x.ayahs || x.at - y.at)
    .map(({ id, ayahs }) => ({ id, ayahs }))
}
