/**
 * Search must find every occurrence a reader expects, from ordinary spelling, and nothing else.
 * Recall is checked against the morphology corpus: searching a name must return exactly the
 * words the corpus tags with that name's lemma.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SearchIndex, SurahMorphology, SurahText } from '../src/data/schemas.ts'
import { ayahWords, stripMarks } from '../src/lib/quran.ts'
import { matchAyah, parseQuery, queryKeys, searchKeys, type SearchMode } from '../src/lib/search.ts'

const read = (f: string) => JSON.parse(readFileSync(`public/data/${f}`, 'utf8'))
const index = SearchIndex.parse(read('search.json')).surahs.map((s) =>
  s.map((a) => a.split(' ').map((w) => w.split('|'))),
)
const text = (s: number) => SurahText.parse(read(`surah/${s}.json`)).ayahs

function search(q: string, mode: SearchMode = 'word') {
  const parsed = parseQuery(q)
  const hits = new Set<string>()
  let ayahs = 0
  index.forEach((surah, si) =>
    surah.forEach((ayah, ai) => {
      const m = matchAyah(ayah, parsed, mode)
      if (m) {
        ayahs++
        m.forEach((w) => hits.add(`${si + 1}:${ai + 1}:${w}`))
      }
    }),
  )
  return { words: hits, ayahs }
}

describe('the index', () => {
  it('has one entry per word of every ayah, in mushaf order', () => {
    for (let s = 1; s <= 114; s++) {
      const t = text(s)
      expect(index[s - 1]).toHaveLength(t.length)
      t.forEach((a, i) =>
        expect(index[s - 1]![i], `${s}:${a.n}`).toHaveLength(ayahWords(a.text).length),
      )
    }
  })
})

describe('ordinary spelling finds the Uthmani word', () => {
  // [query, surah, ayah, the word's letters as written in the mushaf]
  const cases: [string, number, number, string][] = [
    ['الصلاة', 2, 3, 'ٱلصلوة'],
    ['الزكاة', 2, 43, 'ٱلزكوة'],
    ['الحياة', 2, 212, 'ٱلحيوة'],
    ['الربا', 2, 275, 'ٱلربوا'],
    ['الرحمن', 1, 1, 'ٱلرحمن'],
    ['السماوات', 2, 33, 'ٱلسموت'],
    ['السموات', 2, 33, 'ٱلسموت'],
    ['هذا', 2, 25, 'هذا'],
    ['ذلك', 2, 2, 'ذلك'],
    ['لكن', 3, 198, 'لكن'],
    ['إله', 2, 163, 'إله'],
    ['آمنوا', 2, 9, 'ءامنوا'],
    ['القرآن', 2, 185, 'ٱلقرءان'],
    ['الآخرة', 2, 94, 'ٱلأخرة'],
    ['إبراهيم', 2, 124, 'إبرهم'],
    ['إبراهيم', 3, 33, 'إبرهيم'],
    ['النبيين', 2, 61, 'ٱلنبين'],
    ['داود', 4, 163, 'داود'],
    ['إيلافهم', 106, 2, 'إلفهم'],
    ['له', 2, 102, 'له'],
    ['يسألونك', 2, 189, 'يسلونك'],
    ['بريئون', 10, 41, 'بريون'],
    ['الليل', 2, 164, 'ٱليل'],
    ['مائة', 2, 259, 'مائة'],
    ['شيء', 2, 20, 'شيء'],
    ['يأيها', 2, 21, 'يأيها'],
  ]
  for (const [q, s, a, letters] of cases)
    it(`${q} → ${s}:${a}`, () => {
      const w = ayahWords(text(s)[a - 1]!.text).find((x) => stripMarks(x) === letters)
      expect(w, letters).toBeDefined()
      const keys = searchKeys(w!)
      expect(
        queryKeys(q).some((k) => keys.includes(k)),
        keys.join(','),
      ).toBe(true)
    })
})

describe('whole-word search finds exactly the corpus occurrences of a name', () => {
  // words tagged with a proper-noun lemma, by mushaf word position
  const lemmaWords = (lemma: string) => {
    const bare = (x: string) => x.replace(/[ً-ٰٟۡ-ۭ]/g, '')
    const out = new Set<string>()
    for (let s = 1; s <= 114; s++)
      SurahMorphology.parse(read(`morph/${s}.json`)).ayahs.forEach((ayah, ai) =>
        ayah?.forEach((segs, wi) => {
          const hit = segs.some(([, , f]) => {
            const fs = f.split('|')
            const lem = fs.find((x) => x.startsWith('LEM:'))?.slice(4) ?? ''
            return fs.includes('PN') && bare(lem) === bare(lemma)
          })
          if (hit) out.add(`${s}:${ai + 1}:${wi}`)
        }),
      )
    return out
  }
  const names: [string, string, number][] = [
    ['الله', 'اللَّه', 2699],
    ['موسى', 'مُوسَىٰ', 136],
    ['إبراهيم', 'إِبْراهِيم', 69],
    ['نوح', 'نُوح', 43],
    ['مريم', 'مَرْيَم', 34],
    ['فرعون', 'فِرْعَوْن', 74],
    ['يوسف', 'يُوسُف', 27],
    ['عيسى', 'عِيسَى', 25],
    ['آدم', 'آدَم', 25],
    ['سليمان', 'سُلَيْمان', 17],
    ['محمد', 'مُحَمَّد', 4],
  ]
  for (const [q, lemma, n] of names)
    it(`${q}: ${n}`, () => {
      const want = lemmaWords(lemma)
      expect(want.size).toBe(n)
      expect([...search(q).words].sort()).toEqual([...want].sort())
    })
})

describe('known phrases', () => {
  it('finds الرحمن 57 times', () => expect(search('الرحمن').words.size).toBe(57))
  it('finds يا أيها الذين آمنوا in 89 ayahs', () =>
    expect(search('يا أيها الذين آمنوا').ayahs).toBe(89))
  it('finds فبأي آلاء ربكما تكذبان in 31 ayahs', () =>
    expect(search('فبأي آلاء ربكما تكذبان').ayahs).toBe(31))
  it('finds the basmala as an ayah only in al-Fatiha and al-Naml', () => {
    const { words } = search('بسم الله الرحمن الرحيم')
    expect([...new Set([...words].map((k) => k.split(':').slice(0, 2).join(':')))].sort()).toEqual([
      '1:1',
      '27:30',
    ])
  })
})

describe('no false matches from prefixes', () => {
  it('does not take كلالة for الله, or سجد for جد', () => {
    expect([...search('الله').words]).not.toContain('4:12:52')
    expect(search('جد').words.size).toBeLessThan(search('جد', 'part').words.size)
  })
  it('does not take لله for الله through the interrogative', () => {
    const lillah = search('لله').words
    const allah = search('الله').words
    expect(lillah.size).toBeLessThan(allah.size)
  })
})
