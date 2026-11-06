/**
 * The lexicon (معجم الألفاظ): every lemma of the Quranic Arabic Corpus that stands as a word's
 * stem, with how often and where it occurs and the forms it takes in the mushaf.
 *
 * Reads the per-surah morphology (already aligned to the mushaf's words) and the KFGQPC text.
 * Writes lexicon.json (the index) and lex/<entry>.json (each entry's places and forms).
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Lexicon, LexiconEntry, SurahMorphology, type Segment } from '../src/data/schemas.ts'
import { describeSegment } from '../src/lib/morphology.ts'
import { AMBIGUOUS, continuesToken, lemmaOf, lexSlug, rootOf, stemOf } from '../src/lib/lexicon.ts'
import { ayahWords, vocalKey } from '../src/lib/quran.ts'
import { quran } from './quran-text.ts'

const OUT = 'public/data'
const write = (file: string, data: unknown) => writeFileSync(join(OUT, file), JSON.stringify(data))

/** Pause and section signs belong to the reading of the passage, not to the word's form. */
const form = (w: string) => w.replace(/[ۖ-ۜ۞۩]/g, '')

interface Acc {
  lemma: string
  tag: Segment[1]
  root: string | null
  kinds: Map<string, number>
  occ: [number, number, number][]
  /** Forms by their vowelled key (so رَحۡمَتِهِۦ and رَّحۡمَتِهِۦ, whose shadda comes from the word
   *  before, are one form), each with the spellings met and how often. */
  forms: Map<string, Map<string, number>>
}
const entries = new Map<string, Acc>()
let counted = 0
let total = 0

for (const q of quran) {
  const morph = SurahMorphology.parse(
    JSON.parse(readFileSync(join(OUT, `morph/${q.id}.json`), 'utf8')),
  )
  q.verses.forEach(({ text }, i) => {
    const words = ayahWords(text)
    total += words.length
    const segs = morph.ayahs[i]
    if (!segs) throw new Error(`lexicon: ${q.id}:${i + 1} is not aligned`)
    if (segs.length !== words.length) throw new Error(`lexicon: ${q.id}:${i + 1} word count`)
    segs.forEach((word, w) => {
      if (continuesToken(segs, w)) return
      const stem = stemOf(word)
      if (!stem) return
      counted++
      const lemma = lemmaOf(stem)
      const root = rootOf(stem)
      const id = `${lemma}|${stem[1]}|${root ?? ''}`
      const e =
        entries.get(id) ??
        ({ lemma, tag: stem[1], root, kinds: new Map(), occ: [], forms: new Map() } as Acc)
      const d = describeSegment(stem)
      const kind = stem[1] === 'V' ? 'فعل' : d.label.startsWith('اسم فعل') ? 'اسم فعل' : d.label
      e.kinds.set(kind, (e.kinds.get(kind) ?? 0) + 1)
      e.occ.push([q.id, i + 1, w])
      const f = form(words[w]!)
      const k = vocalKey(f)
      const spellings = e.forms.get(k) ?? new Map<string, number>()
      spellings.set(f, (spellings.get(f) ?? 0) + 1)
      e.forms.set(k, spellings)
      entries.set(id, e)
    })
  })
}

// the hand-kept list of shared spellings must match the corpus exactly
const byLemma = new Map<string, Acc[]>()
for (const e of entries.values()) byLemma.set(e.lemma, [...(byLemma.get(e.lemma) ?? []), e])
const shared = new Map(
  [...byLemma]
    .filter(([, v]) => v.length > 1)
    .map(([l, v]) => [l, new Set(v.map((e) => e.tag)).size === v.length ? 'type' : 'root']),
)
const listed = new Map(Object.entries(AMBIGUOUS))
if (shared.size !== listed.size || [...shared].some(([l, by]) => listed.get(l) !== by))
  throw new Error(
    `lexicon: AMBIGUOUS in src/lib/lexicon.ts is out of date; the corpus has ${JSON.stringify(Object.fromEntries(shared))}`,
  )

const most = (m: Map<string, number>) => [...m].sort((a, b) => b[1] - a[1])[0]![0]
const list = [...entries.values()]
  .map((e) => ({
    slug: lexSlug(e.lemma, e.tag, e.root),
    lemma: e.lemma,
    tag: e.tag,
    kind: most(e.kinds),
    root: e.root,
    count: e.occ.length,
    ayahs: new Set(e.occ.map(([s, a]) => `${s}:${a}`)).size,
    surahs: new Set(e.occ.map(([s]) => s)).size,
    e,
  }))
  .sort((a, b) => b.count - a.count || a.lemma.localeCompare(b.lemma, 'ar'))

if (new Set(list.map((x) => x.slug)).size !== list.length) throw new Error('lexicon: slugs clash')

rmSync(join(OUT, 'lex'), { recursive: true, force: true })
mkdirSync(join(OUT, 'lex'), { recursive: true })
for (const x of list)
  write(
    `lex/${x.slug}.json`,
    LexiconEntry.parse({
      occ: x.e.occ,
      kinds: [...x.e.kinds].sort((a, b) => b[1] - a[1]),
      // each form shown in its most frequent spelling
      forms: [...x.e.forms.values()]
        .map((sp): [string, number] => [most(sp), [...sp.values()].reduce((a, b) => a + b, 0)])
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ar')),
    }),
  )
write(
  'lexicon.json',
  Lexicon.parse({
    words: total,
    counted,
    entries: list.map(({ slug, lemma, tag, kind, root, count, ayahs, surahs }) => ({
      slug,
      lemma,
      tag,
      kind,
      root,
      count,
      ayahs,
      surahs,
    })),
  }),
)
console.log(
  `lexicon: ${list.length} entries covering ${counted} of ${total} words (${total - counted} have no lemma in the corpus)`,
)
