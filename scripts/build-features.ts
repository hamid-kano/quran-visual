/**
 * Second generation pass: fingerprints, names network, similar ayahs, word morphology.
 * Same rules as build-data.ts: vetted sources only, counting only, deterministic output.
 */
import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import Graph from 'graphology'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import louvain from 'graphology-communities-louvain'
import {
  Fingerprints,
  NameIndex,
  SimilarIndex,
  SurahMorphology,
  type Fingerprint,
  type Segment,
} from '../src/data/schemas.ts'
import { ayahWords, commonWords, finalLetter, stripMarks, wordKey } from '../src/lib/quran.ts'

const require = createRequire(import.meta.url)
const OUT = 'public/data'
const DATA_VERSION = 1

interface QuranJsonSurah {
  id: number
  verses: { id: number; text: string }[]
}
const quran: QuranJsonSurah[] = require('quran-json/dist/quran.json')

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
const write = (file: string, data: unknown) => writeFileSync(join(OUT, file), JSON.stringify(data))

const bare = stripMarks
const normalize = wordKey

// ---------- morphology, grouped by ayah and word ----------
const morph = new Map<string, Segment[][]>() // "s:a" → words → segments
for (const line of readFileSync('sources/quran-morphology.txt', 'utf8').split('\n')) {
  if (!line.trim()) continue
  const [loc = '', form = '', tag = '', feats = ''] = line.split('\t')
  const [s, a, w] = loc.split(':').map(Number) as [number, number, number]
  const key = `${s}:${a}`
  const words = morph.get(key) ?? []
  ;(words[w - 1] ??= []).push([form, tag as Segment[1], feats])
  morph.set(key, words)
}

// ---------- 1. fingerprints ----------
const fingerprints: Fingerprint[] = quran.map((q) => ({
  id: q.id,
  lengths: q.verses.map((v) => morph.get(`${q.id}:${v.id}`)!.length),
  endings: q.verses.map((v) => finalLetter(v.text)).join(''),
}))
write('fingerprints.json', Fingerprints.parse(fingerprints))

// ---------- 2. names network ----------
// The divine name is left out of the network: it appears alongside nearly every name and would
// connect everything to everything. Its occurrences remain in the roots section.
const EXCLUDED = new Set(['الله', 'اللهم'])
const nameAyahs = new Map<string, Map<string, [number, number]>>()
const nameCount = new Map<string, number>()
const ayahNames = new Map<string, Set<string>>()
for (const [key, words] of morph) {
  const [s, a] = key.split(':').map(Number) as [number, number]
  for (const segs of words)
    for (const [, , feats] of segs) {
      const f = feats.split('|')
      if (!f.includes('PN')) continue
      const lem = f.find((x) => x.startsWith('LEM:'))?.slice(4)
      if (!lem || EXCLUDED.has(bare(lem))) continue
      nameCount.set(lem, (nameCount.get(lem) ?? 0) + 1)
      const m = nameAyahs.get(lem) ?? new Map()
      m.set(key, [s, a])
      nameAyahs.set(lem, m)
      const set = ayahNames.get(key) ?? new Set()
      set.add(lem)
      ayahNames.set(key, set)
    }
}
const pairCount = new Map<string, number>()
for (const set of ayahNames.values()) {
  const l = [...set].sort()
  for (let i = 0; i < l.length; i++)
    for (let j = i + 1; j < l.length; j++) {
      const k = `${l[i]}|${l[j]}`
      pairCount.set(k, (pairCount.get(k) ?? 0) + 1)
    }
}
const ng = new Graph({ type: 'undirected' })
const nr = rng(11)
const names = [...nameCount.keys()].sort()
for (const n of names) ng.addNode(n, { x: nr() * 100, y: nr() * 100 })
const nameEdges = [...pairCount.entries()]
  .map(([k, together]) => {
    const [a, b] = k.split('|') as [string, string]
    return { a, b, together }
  })
  .sort((x, y) => x.a.localeCompare(y.a) || x.b.localeCompare(y.b))
for (const e of nameEdges) ng.addEdge(e.a, e.b, { weight: e.together })
const nameComm = louvain(ng, { rng: rng(12), getEdgeWeight: 'weight' })
forceAtlas2.assign(ng, {
  iterations: 1200,
  getEdgeWeight: 'weight',
  settings: {
    ...forceAtlas2.inferSettings(ng),
    gravity: 2.5,
    scalingRatio: 6,
    barnesHutOptimize: false,
  },
})
const commSize = new Map<number, number>()
for (const c of Object.values(nameComm)) commSize.set(c, (commSize.get(c) ?? 0) + 1)
const commRank = new Map(
  [...commSize.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).map(([c], i) => [c, i]),
)
const round = (n: number) => Math.round(n * 100) / 100
write(
  'names.json',
  NameIndex.parse({
    version: DATA_VERSION,
    names: names.map((n) => ({
      name: n,
      count: nameCount.get(n)!,
      surahs: new Set([...nameAyahs.get(n)!.values()].map(([s]) => s)).size,
      community: ng.degree(n) ? commRank.get(nameComm[n]!)! : -1,
      x: round(ng.getNodeAttribute(n, 'x')),
      y: round(ng.getNodeAttribute(n, 'y')),
    })),
    edges: nameEdges,
    occurrences: Object.fromEntries(
      names.map((n) => [
        n,
        [...nameAyahs.get(n)!.values()].sort((x, y) => x[0] - y[0] || x[1] - y[1]),
      ]),
    ),
  }),
)

// ---------- 3. similar ayahs ----------
interface A {
  s: number
  a: number
  tokens: string[]
}
const ayahs: A[] = []
for (const q of quran)
  for (const v of q.verses)
    ayahs.push({ s: q.id, a: v.id, tokens: ayahWords(v.text).map(normalize) })

const MIN_LEN = 4
const df = new Map<string, number>()
for (const x of ayahs) for (const t of new Set(x.tokens)) df.set(t, (df.get(t) ?? 0) + 1)
const index = new Map<string, number[]>()
ayahs.forEach((x, i) => {
  if (x.tokens.length < MIN_LEN) return
  for (const t of new Set(x.tokens))
    if ((df.get(t) ?? 0) <= 400) (index.get(t) ?? index.set(t, []).get(t)!).push(i)
})

const lcs = (a: string[], b: string[]) => commonWords(a, b)[0].size

const exact = new Map<string, [number, number][]>()
for (const x of ayahs) {
  if (x.tokens.length < 3) continue
  const k = x.tokens.join(' ')
  exact.set(k, [...(exact.get(k) ?? []), [x.s, x.a]])
}
const repeats = [...exact.values()].filter((g) => g.length > 1)

const pairs: [number, number, number, number, number][] = []
for (let i = 0; i < ayahs.length; i++) {
  const x = ayahs[i]!
  if (x.tokens.length < MIN_LEN) continue
  const shared = new Map<number, number>()
  for (const t of new Set(x.tokens))
    for (const j of index.get(t) ?? []) if (j > i) shared.set(j, (shared.get(j) ?? 0) + 1)
  for (const [j, n] of shared) {
    const y = ayahs[j]!
    const longer = Math.max(x.tokens.length, y.tokens.length)
    if (n < 2 || Math.min(x.tokens.length, y.tokens.length) < longer * 0.6) continue
    if (x.tokens.join(' ') === y.tokens.join(' ')) continue
    const common = lcs(x.tokens, y.tokens)
    const score = common / longer
    if (common >= MIN_LEN && score >= 0.6)
      pairs.push([x.s, x.a, y.s, y.a, Math.min(99, Math.round(score * 100))])
  }
}
write('similar.json', SimilarIndex.parse({ version: DATA_VERSION, pairs, repeats }))

// ---------- 4. word morphology per surah ----------
mkdirSync(join(OUT, 'morph'), { recursive: true })
let misaligned = 0
for (const q of quran) {
  const out = q.verses.map((v) => {
    const words = morph.get(`${q.id}:${v.id}`)!
    const textWords = ayahWords(v.text)
    if (textWords.length !== words.length) {
      misaligned++
      return null
    }
    // drop LEM-less noise? keep everything — the interface chooses what to show
    return words
  })
  write(`morph/${q.id}.json`, SurahMorphology.parse({ id: q.id, ayahs: out }))
}

console.log(
  `fingerprints: 114 · names: ${names.length} / ${nameEdges.length} links · similar pairs: ${pairs.length}` +
    ` · repeated ayahs: ${repeats.length} groups · morphology: ${6236 - misaligned} aligned ayahs (${misaligned} not)`,
)
