/**
 * Topic tree from the thematic index of Mushaf Al-Tajweed, via the Qurany Concepts Tool
 * (sources/qurany-concepts.json, see scripts/sources/extract-qurany.py).
 *
 * The index assigns each ayah one or more paths such as
 *   أركان الإسلام > التوحيد > توحيد الله تعالى > صفات الله تعالى > رب العالمين
 * The tree and its ayahs are taken as they are. Only the writing of labels is cleaned,
 * by the rules and the explicit list below; nothing is added, removed or reclassified.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { TopicIndex, type TopicNode } from '../src/data/schemas.ts'
import { cleanLabel } from '../src/lib/topics.ts'

interface Source {
  source: { name: string; archive: string; commit: string }
  ayahs: Record<string, string[]>
}
const src: Source = JSON.parse(readFileSync('sources/qurany-concepts.json', 'utf8'))

// ---------- build the tree ----------
const nodes = new Map<string, TopicNode & { key: string }>()
const direct = new Map<string, Set<string>>()
const changed = new Map<string, string>()

for (const [ayah, paths] of Object.entries(src.ayahs))
  for (const raw of paths) {
    const parts = raw.split('>').map((p) => {
      const c = cleanLabel(p)
      if (c !== p.trim()) changed.set(p.trim(), c)
      return c
    })
    if (parts.some((p) => !p)) throw new Error(`empty label in ${ayah}: ${raw}`)
    for (let d = 0; d < parts.length; d++) {
      const key = parts.slice(0, d + 1).join(' > ')
      if (!nodes.has(key))
        nodes.set(key, {
          key,
          id: 0,
          label: parts[d]!,
          parent: null,
          depth: d,
          ayahs: 0,
          surahs: 0,
          direct: 0,
        })
    }
    const leaf = parts.join(' > ')
    const set = direct.get(leaf) ?? new Set<string>()
    set.add(ayah)
    direct.set(leaf, set)
  }

// stable ids: sections and their children in a fixed (alphabetical) order
const keys = [...nodes.keys()].sort((a, b) => a.localeCompare(b, 'ar'))
keys.forEach((k, i) => (nodes.get(k)!.id = i + 1))
for (const n of nodes.values()) {
  const parentKey = n.key.split(' > ').slice(0, -1).join(' > ')
  n.parent = parentKey ? nodes.get(parentKey)!.id : null
}

// subtree ayahs (an ayah tagged in two branches of a topic counts once)
const subtree = new Map<string, Set<string>>()
for (const [leaf, ayahs] of direct) {
  const parts = leaf.split(' > ')
  for (let d = 1; d <= parts.length; d++) {
    const k = parts.slice(0, d).join(' > ')
    const set = subtree.get(k) ?? new Set<string>()
    for (const a of ayahs) set.add(a)
    subtree.set(k, set)
  }
}
for (const n of nodes.values()) {
  const all = subtree.get(n.key)!
  n.ayahs = all.size
  n.surahs = new Set([...all].map((a) => a.split(':')[0])).size
  n.direct = direct.get(n.key)?.size ?? 0
}

const byAyah = (a: string, b: string) => {
  const [s1, a1] = a.split(':').map(Number)
  const [s2, a2] = b.split(':').map(Number)
  return s1! - s2! || a1! - a2!
}
const tags: Record<string, [number, number][]> = {}
for (const [leaf, ayahs] of direct)
  tags[String(nodes.get(leaf)!.id)] = [...ayahs]
    .sort(byAyah)
    .map((a) => a.split(':').map(Number) as [number, number])

const out = TopicIndex.parse({
  version: 1,
  source: src.source,
  nodes: keys.map((k) => {
    const { key: _key, ...node } = nodes.get(k)!
    void _key
    return node
  }),
  tags,
})
writeFileSync('public/data/topics.json', JSON.stringify(out))

const tagged = Object.values(src.ayahs).filter((p) => p.length).length
console.log(
  `topics: ${out.nodes.length} topics in ${out.nodes.filter((n) => n.parent === null).length} sections · ` +
    `${tagged} ayahs tagged · ${changed.size} labels cleaned`,
)
