/**
 * Generates every JSON file the interface reads, from vetted sources only:
 *   - Quran text (Uthmani, Hafs):    sources/kfgqpc-hafs-v18.json (King Fahd Complex), via quran-text.ts
 *   - Surah metadata & order:        npm `quran-meta` (Tanzil metadata)
 *   - Roots & lemmas:                sources/quran-morphology.txt (Quranic Arabic Corpus v0.4, revised)
 *
 * Everything here is counting and measurement. No interpretation of meaning is produced.
 * Output is deterministic: the same inputs always give byte-identical files.
 */
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { getSurahInfo, findJuz, type Surah as MetaSurah } from 'quran-meta/hafs'
import Graph from 'graphology'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import louvain from 'graphology-communities-louvain'
import { forceSimulation, forceLink, forceManyBody, forceCenter } from 'd3-force-3d'
import {
  SurahIndex,
  SurahText,
  RootIndex,
  RootOccurrences,
  type Surah,
  type RootNode,
  type RootEdge,
} from '../src/data/schemas.ts'

const OUT = 'public/data'
const DATA_VERSION = 1

import { quran } from './quran-text.ts'
import { ayahWords } from '../src/lib/quran.ts'

// ---------- deterministic PRNG (mulberry32) ----------
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const round = (n: number, d = 3) => Math.round(n * 10 ** d) / 10 ** d

// ---------- 1. parse morphology ----------
interface Token {
  s: number
  a: number
  w: number
  root?: string
  lemma?: string
}
const tokens: Token[] = []
for (const line of readFileSync('sources/quran-morphology.txt', 'utf8').split('\n')) {
  if (!line.trim()) continue
  const [loc, , , feats = ''] = line.split('\t')
  const [s, a, w] = (loc ?? '').split(':').map(Number)
  if (!s || !a || !w) throw new Error(`Bad location: ${line}`)
  const t: Token = { s, a, w }
  for (const f of feats.split('|')) {
    if (f.startsWith('ROOT:')) t.root = f.slice(5)
    else if (f.startsWith('LEM:')) t.lemma = f.slice(4)
  }
  tokens.push(t)
}

// word counts per surah (distinct s:a:w)
const wordsPerSurah = new Map<number, Set<string>>()
for (const t of tokens) {
  const set = wordsPerSurah.get(t.s) ?? new Set()
  set.add(`${t.a}:${t.w}`)
  wordsPerSurah.set(t.s, set)
}

// root occurrences: one per word segment carrying a root
const rootTokens = tokens.filter((t): t is Token & { root: string } => !!t.root)
const rootCount = new Map<string, number>()
const rootSurahCount = new Map<string, Map<number, number>>()
const rootLemmas = new Map<string, Map<string, number>>()
const rootAyahs = new Map<string, Map<string, [number, number]>>()
const ayahRoots = new Map<string, Set<string>>()

for (const t of rootTokens) {
  rootCount.set(t.root, (rootCount.get(t.root) ?? 0) + 1)
  const bySurah = rootSurahCount.get(t.root) ?? new Map()
  bySurah.set(t.s, (bySurah.get(t.s) ?? 0) + 1)
  rootSurahCount.set(t.root, bySurah)
  if (t.lemma) {
    const lem = rootLemmas.get(t.root) ?? new Map()
    lem.set(t.lemma, (lem.get(t.lemma) ?? 0) + 1)
    rootLemmas.set(t.root, lem)
  }
  const key = `${t.s}:${t.a}`
  const occ = rootAyahs.get(t.root) ?? new Map()
  occ.set(key, [t.s, t.a])
  rootAyahs.set(t.root, occ)
  const ar = ayahRoots.get(key) ?? new Set()
  ar.add(t.root)
  ayahRoots.set(key, ar)
}

// ---------- 2. surah root profiles (TF-IDF) and similarity ----------
const roots = [...rootCount.keys()].sort()
const idf = new Map<string, number>()
for (const r of roots) idf.set(r, Math.log(114 / (rootSurahCount.get(r)?.size ?? 1)))

type Vec = Map<string, number>
const profiles: Vec[] = []
for (let s = 1; s <= 114; s++) {
  const v: Vec = new Map()
  for (const r of roots) {
    const c = rootSurahCount.get(r)?.get(s)
    if (c) v.set(r, (1 + Math.log(c)) * (idf.get(r) ?? 0))
  }
  profiles[s] = v
}
const norm = (v: Vec) => Math.sqrt([...v.values()].reduce((x, y) => x + y * y, 0))
function cosine(a: Vec, b: Vec) {
  let dot = 0
  for (const [k, x] of a) {
    const y = b.get(k)
    if (y) dot += x * y
  }
  const n = norm(a) * norm(b)
  return n ? dot / n : 0
}
const sim: number[][] = Array.from({ length: 115 }, () => Array(115).fill(0))
for (let i = 1; i <= 114; i++)
  for (let j = i + 1; j <= 114; j++) {
    const c = cosine(profiles[i]!, profiles[j]!)
    sim[i]![j] = c
    sim[j]![i] = c
  }

// ---------- 3. galaxy layout (3D force simulation, deterministic) ----------
const K = 6
const neighborsOf = (s: number) =>
  Array.from({ length: 114 }, (_, k) => k + 1)
    .filter((o) => o !== s)
    .sort((x, y) => sim[s]![y]! - sim[s]![x]! || x - y)
    .slice(0, K)

interface SimNode {
  id: number
  x: number
  y: number
  z: number
}
const rand = rng(114)
const nodes: SimNode[] = Array.from({ length: 114 }, (_, k) => {
  // seed positions on a sphere ordered by revelation, then let similarity pull them together
  const order = getSurahInfo((k + 1) as MetaSurah)[2] as number
  const phi = Math.acos(1 - (2 * (order - 0.5)) / 114)
  const theta = Math.PI * (1 + Math.sqrt(5)) * order
  return {
    id: k + 1,
    x: 40 * Math.sin(phi) * Math.cos(theta) + rand(),
    y: 40 * Math.cos(phi) + rand(),
    z: 40 * Math.sin(phi) * Math.sin(theta) + rand(),
  }
})
const linkSet = new Map<string, { source: number; target: number; value: number }>()
for (let s = 1; s <= 114; s++)
  for (const o of neighborsOf(s)) {
    const key = s < o ? `${s}-${o}` : `${o}-${s}`
    linkSet.set(key, { source: Math.min(s, o), target: Math.max(s, o), value: sim[s]![o]! })
  }
const links = [...linkSet.values()]
const simulation = forceSimulation(nodes, 3)
  .randomSource(rng(7))
  .force(
    'link',
    forceLink(links)
      .id((d: SimNode) => d.id)
      .distance((l: { value: number }) => 30 * (1 - l.value) + 4)
      .strength((l: { value: number }) => 0.15 + l.value),
  )
  .force('charge', forceManyBody().strength(-40))
  .force('center', forceCenter(0, 0, 0))
  .stop()
for (let i = 0; i < 600; i++) simulation.tick()

const maxR = Math.max(...nodes.map((n) => Math.hypot(n.x, n.y, n.z)))
const scale = 50 / maxR

// ---------- 4. write surah index + texts ----------
rmSync(OUT, { recursive: true, force: true })
mkdirSync(join(OUT, 'surah'), { recursive: true })

const surahs: Surah[] = quran.map((q) => {
  const [, ayahCount, order, , , isMeccan] = getSurahInfo(q.id as MetaSurah) as [
    number,
    number,
    number,
    number,
    string,
    boolean,
  ]
  if (ayahCount !== q.verses.length) throw new Error(`Ayah count mismatch in surah ${q.id}`)
  if (isMeccan !== (q.type === 'meccan')) throw new Error(`Revelation type mismatch in ${q.id}`)
  if (findJuz(q.id as MetaSurah, 1 as never) !== q.verses[0]!.juz)
    throw new Error(`Juz of ${q.id} disagrees between KFGQPC and Tanzil`)
  const keyRoots = [...profiles[q.id]!.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([root]) => ({ root, count: rootSurahCount.get(root)!.get(q.id)! }))
  const node = nodes[q.id - 1]!
  return {
    id: q.id,
    name: q.name,
    transliteration: q.transliteration,
    revelation: q.type,
    order,
    ayahs: ayahCount,
    // words as the mushaf separates them (the corpus differs in a handful of joins)
    words: q.verses.reduce((n, v) => n + ayahWords(v.text).length, 0),
    juz: q.verses[0]!.juz,
    keyRoots,
    neighbors: neighborsOf(q.id).map((o) => ({ surah: o, similarity: round(sim[q.id]![o]!) })),
    position: [round(node.x * scale, 2), round(node.y * scale, 2), round(node.z * scale, 2)],
  }
})

const write = (file: string, data: unknown) => writeFileSync(join(OUT, file), JSON.stringify(data))

write('surahs.json', SurahIndex.parse({ version: DATA_VERSION, surahs }))
for (const q of quran) {
  write(
    `surah/${q.id}.json`,
    SurahText.parse({ id: q.id, ayahs: q.verses.map((v) => ({ n: v.id, text: v.text })) }),
  )
}

// ---------- 5. roots network ----------
const totalAyahs = 6236
const MIN_ROOT = 12 // roots frequent enough to carry a stable signal
const MIN_TOGETHER = 6
const EDGES_PER_NODE = 5

const graphRoots = roots.filter((r) => (rootAyahs.get(r)?.size ?? 0) >= MIN_ROOT)
const graphRootSet = new Set(graphRoots)
const pair = new Map<string, number>()
for (const rs of ayahRoots.values()) {
  const list = [...rs].filter((r) => graphRootSet.has(r)).sort()
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) {
      const k = `${list[i]}|${list[j]}`
      pair.set(k, (pair.get(k) ?? 0) + 1)
    }
}
const candidates: RootEdge[] = []
for (const [k, together] of pair) {
  if (together < MIN_TOGETHER) continue
  const [a, b] = k.split('|') as [string, string]
  const pa = rootAyahs.get(a)!.size / totalAyahs
  const pb = rootAyahs.get(b)!.size / totalAyahs
  const pab = together / totalAyahs
  const npmi = Math.log(pab / (pa * pb)) / -Math.log(pab)
  if (npmi > 0.1) candidates.push({ a, b, together, npmi: round(npmi) })
}
// keep each root's strongest links (sparsify for readability)
const byRoot = new Map<string, RootEdge[]>()
for (const e of candidates) {
  for (const r of [e.a, e.b]) byRoot.set(r, [...(byRoot.get(r) ?? []), e])
}
const kept = new Set<RootEdge>()
for (const list of byRoot.values()) {
  list
    .sort((x, y) => y.npmi * Math.log(1 + y.together) - x.npmi * Math.log(1 + x.together))
    .slice(0, EDGES_PER_NODE)
    .forEach((e) => kept.add(e))
}
const edges = [...kept].sort((x, y) => x.a.localeCompare(y.a) || x.b.localeCompare(y.b))

const graph = new Graph({ type: 'undirected' })
const gr = rng(2)
for (const r of graphRoots) graph.addNode(r, { x: gr() * 100, y: gr() * 100 })
for (const e of edges) graph.addEdge(e.a, e.b, { weight: e.npmi })
for (const n of graph.nodes()) if (graph.degree(n) === 0) graph.dropNode(n)

const communities = louvain(graph, { rng: rng(3), getEdgeWeight: 'weight' })
forceAtlas2.assign(graph, {
  iterations: 900,
  getEdgeWeight: 'weight',
  settings: { ...forceAtlas2.inferSettings(graph), barnesHutOptimize: false, gravity: 0.6 },
})

// renumber communities by size so colors are stable
const commSize = new Map<number, number>()
for (const c of Object.values(communities)) commSize.set(c, (commSize.get(c) ?? 0) + 1)
const commRank = new Map(
  [...commSize.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).map(([c], i) => [c, i]),
)

const rootNodes: RootNode[] = roots.map((r) => {
  const inGraph = graph.hasNode(r)
  return {
    root: r,
    count: rootCount.get(r)!,
    surahs: rootSurahCount.get(r)!.size,
    lemmas: [...(rootLemmas.get(r) ?? new Map<string, number>()).entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8)
      .map(([lemma, count]) => ({ lemma, count })),
    community: inGraph ? commRank.get(communities[r]!)! : -1,
    x: inGraph ? round(graph.getNodeAttribute(r, 'x'), 2) : null,
    y: inGraph ? round(graph.getNodeAttribute(r, 'y'), 2) : null,
  }
})
const graphEdges = edges.filter((e) => graph.hasEdge(e.a, e.b))
write('roots.json', RootIndex.parse({ version: DATA_VERSION, roots: rootNodes, edges: graphEdges }))

const occ: Record<string, [number, number][]> = {}
for (const r of roots)
  occ[r] = [...rootAyahs.get(r)!.values()].sort((x, y) => x[0] - y[0] || x[1] - y[1])
write('root-occurrences.json', RootOccurrences.parse(occ))
// one small file per root, so a root's page loads only its own ayahs
mkdirSync(join(OUT, 'occ'), { recursive: true })
for (const [r, list] of Object.entries(RootOccurrences.parse(occ))) write(`occ/${r}.json`, list)

console.log(
  `surahs: 114 · ayahs: ${quran.reduce((n, q) => n + q.verses.length, 0)} · roots: ${roots.length}` +
    ` · network: ${graph.order} roots / ${graph.size} links / ${commSize.size} clusters`,
)
