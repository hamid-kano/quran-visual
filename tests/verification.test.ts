/**
 * Verification against primary sources and well-known counts. Every number or statement the
 * interface shows as fact is checked here, so a change in data or code cannot silently make
 * the site say something untrue.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  NameIndex,
  RootIndex,
  SimilarIndex,
  SurahIndex,
  SurahMorphology,
  SurahText,
} from '../src/data/schemas.ts'
import { describeWord } from '../src/lib/morphology.ts'
import { alignKey, ayahWords, vocalKey, wordKey } from '../src/lib/quran.ts'

const read = (f: string) => JSON.parse(readFileSync(`public/data/${f}`, 'utf8'))
const surahs = SurahIndex.parse(read('surahs.json')).surahs
const text = (s: number) => SurahText.parse(read(`surah/${s}.json`)).ayahs
const morph = (s: number) => SurahMorphology.parse(read(`morph/${s}.json`)).ayahs

interface KfgqpcAyah {
  sora: number
  aya_no: number
  jozz: number
  aya_text: string
}
const official: KfgqpcAyah[] = JSON.parse(readFileSync('sources/kfgqpc-hafs-v18.json', 'utf8'))
const corpusLines = readFileSync('sources/quran-morphology.txt', 'utf8').split('\n').filter(Boolean)

describe('the text is the King Fahd Complex text, unchanged', () => {
  it('matches the official file character for character, ayah number aside', () => {
    expect(official).toHaveLength(6236)
    for (const r of official) {
      const ours = text(r.sora)[r.aya_no - 1]!.text
      expect(ours, `${r.sora}:${r.aya_no}`).toBe(r.aya_text.replace(/\u00a0[٠-٩]+$/, ''))
    }
  })

  it('contains only Arabic letters, Quranic marks and spaces', () => {
    for (const s of surahs)
      for (const a of text(s.id))
        // eslint-disable-next-line no-misleading-character-class -- a range of combining marks is the intent
        expect(a.text, `${s.id}:${a.n}`).toMatch(/^[\u0600-\u06FF\u08D3-\u08FF \u00a0]+$/)
  })

  it('places each surah in the juz the official file gives for its first ayah', () => {
    for (const s of surahs) {
      const first = official.find((r) => r.sora === s.id && r.aya_no === 1)!
      expect(s.juz, `surah ${s.id}`).toBe(first.jozz)
    }
  })
})

describe('counts', () => {
  it('has 114 surahs and 6236 ayahs', () => {
    expect(surahs).toHaveLength(114)
    expect(surahs.reduce((n, s) => n + s.ayahs, 0)).toBe(6236)
  })

  it('counts 77,430 mushaf words and 77,429 corpus words, as the methodology page says', () => {
    expect(surahs.reduce((n, s) => n + s.words, 0)).toBe(77430)
    expect(
      new Set(corpusLines.map((l) => l.split('\t')[0]!.split(':').slice(0, 3).join(':'))).size,
    ).toBe(77429)
  })

  it('has 1651 roots', () => {
    expect(RootIndex.parse(read('roots.json')).roots).toHaveLength(1651)
  })

  it('counts the root رحم 339 times, as the corpus does', () => {
    expect(RootIndex.parse(read('roots.json')).roots.find((r) => r.root === 'رحم')?.count).toBe(339)
  })
})

describe('revelation order (Tanzil)', () => {
  const byOrder = (o: number) => surahs.find((s) => s.order === o)!.id
  it('begins with al-ʿAlaq, al-Qalam, al-Muzzammil, al-Muddaththir, al-Fatiha', () => {
    expect([1, 2, 3, 4, 5].map(byOrder)).toEqual([96, 68, 73, 74, 1])
  })
  it('ends with al-Maʾida, al-Tawba, al-Nasr', () => {
    expect([112, 113, 114].map(byOrder)).toEqual([5, 9, 110])
  })
  it('has al-Baqara as the first Medinan surah', () => {
    const firstMedinan = [...surahs]
      .sort((a, b) => a.order - b.order)
      .find((s) => s.revelation === 'medinan')
    expect(firstMedinan?.id).toBe(2)
  })
})

describe('names', () => {
  const names = NameIndex.parse(read('names.json'))
  const count = (key: string) => names.names.find((n) => wordKey(n.name) === key)?.count
  it('matches well-known mention counts', () => {
    expect(count('موسي')).toBe(136)
    expect(count('ابراهيم')).toBe(69)
    expect(count('نوح')).toBe(43)
    expect(count('مريم')).toBe(34)
    expect(count('يوسف')).toBe(27)
    expect(count('عيسي')).toBe(25)
    expect(count('ادم')).toBe(25)
    expect(count('هرون') ?? count('هارون')).toBe(20)
    expect(count('محمد')).toBe(4)
    expect(count('احمد')).toBe(1)
  })

  it('has 104 names; the divine name occurs in 1825 ayahs and meets 64 of them', () => {
    expect(names.names).toHaveLength(104)
    const allah = new Set<string>()
    for (const l of corpusLines) {
      const [loc, , , f = ''] = l.split('\t')
      if (f.split('|').includes('PN') && f.includes('ROOT:أله'))
        allah.add(loc!.split(':').slice(0, 2).join(':'))
    }
    expect(allah.size).toBe(1825)
    const meeting = Object.values(names.occurrences).filter((l) =>
      l.some(([s, a]) => allah.has(`${s}:${a}`)),
    )
    expect(meeting).toHaveLength(64)
  })
})

describe('similar and repeated ayahs', () => {
  const similar = SimilarIndex.parse(read('similar.json'))
  const group = (s: number, a: number) =>
    similar.repeats.find((g) => g.some(([x, y]) => x === s && y === a))
  it('finds al-Rahman 13 in 31 places and al-Mursalat 15 in 11 places', () => {
    expect(group(55, 13)).toHaveLength(31)
    expect(group(77, 15)).toHaveLength(11)
    expect(group(77, 15)!.some(([s, a]) => s === 83 && a === 10)).toBe(true)
  })

  it('lists repeats whose words agree letter for letter', () => {
    for (const g of similar.repeats) {
      const keys = g.map(([s, a]) =>
        ayahWords(text(s)[a - 1]!.text)
          .map(wordKey)
          .join(' '),
      )
      expect(new Set(keys).size).toBe(1)
    }
  })

  it('keeps مَٰلِكِ and مَلِكِ apart, and ignores marks that only depend on neighbours', () => {
    expect(wordKey('مَٰلِكِ')).not.toBe(wordKey('مَلِكِ'))
    expect(wordKey('عَلَىٰ')).toBe(wordKey('عَلَى'))
    expect(vocalKey('رَّحِيمٌ')).toBe(vocalKey('رَحِيمٞ'))
    expect(vocalKey('مَّا')).toBe(vocalKey('مَا'))
    expect(vocalKey('فَتَحۡنَا')).not.toBe(vocalKey('فُتِحَتۡ'))
  })
})

describe('morphology alignment and descriptions', () => {
  it('aligns every word of every ayah with corpus segments of the same letters', () => {
    for (const s of surahs) {
      const m = morph(s.id)
      text(s.id).forEach((a, i) => {
        const words = ayahWords(a.text)
        const segs = m[i]
        expect(segs, `${s.id}:${a.n}`).not.toBeNull()
        expect(segs).toHaveLength(words.length)
        words.forEach((w, k) => {
          const joined = alignKey(segs![k]!.map((x) => x[0]).join(''))
          // إِلۡ يَاسِينَ: one corpus word shared by two mushaf words
          if (s.id === 37 && a.n === 130 && k >= 2) return
          expect(joined, `${s.id}:${a.n}:${k + 1} ${w}`).toBe(alignKey(w))
        })
      })
    }
  })

  const word = (s: number, a: number, w: number) => describeWord(morph(s)[a - 1]![w - 1]!)
  const all = (s: number, a: number, w: number) =>
    word(s, a, w).segments.flatMap((x) => [x.label, ...x.details])

  it('splits بَعۡدَ مَا and joins مَالِيَ as the mushaf writes them', () => {
    expect(word(8, 6, 4).segments.map((x) => x.label)).toEqual(['ظرف زمان'])
    expect(word(8, 6, 5).segments.map((x) => x.label)).toEqual(['اسم موصول'])
    expect(word(27, 20, 4).segments).toHaveLength(3)
  })

  it('gives quadriliteral verbs their own patterns', () => {
    expect(all(7, 20, 1)).toContain('رباعي مجرّد على وزن فَعْلَلَ')
    expect(all(22, 11, 11)).toContain('رباعي مزيد على وزن افْعَلَلَّ')
  })

  it('does not assign a single pattern to triliteral form I', () => {
    expect(all(1, 5, 2)).toContain('ثلاثي مجرّد')
    expect(all(1, 5, 2).join(' ')).not.toContain('وزن فَعَلَ')
  })

  it('marks plurals tagged P alone, such as أُوْلَٰٓئِكَ and صُمٌّۢ', () => {
    expect(all(2, 5, 1)).toContain('جمع')
    expect(all(2, 18, 1)).toContain('جمع')
  })

  it('names imperative verbal nouns such as هَلُمَّ', () => {
    expect(word(6, 150, 2).segments[0]!.label).toBe('اسم فعل أمر')
  })
})

describe('quoted words on the methodology page', () => {
  it('are spelled exactly as in the text', () => {
    const page = readFileSync('src/features/about/AboutPage.tsx', 'utf8')
    const quoted = [...page.matchAll(/«([^»]+)»/g)].map((m) => m[1]!).filter((q) => /[ً-ْ]/.test(q))
    const all = surahs.flatMap((s) => text(s.id).map((a) => a.text)).join('\n')
    expect(quoted.length).toBeGreaterThan(2)
    for (const q of quoted) expect(all, q).toContain(q)
  })
})

describe('the Quran font', () => {
  it('has a glyph for every character of the text, the corpus forms and lemmas', async () => {
    const fontkit = await import('fontkit')
    const font = fontkit.openSync('public/fonts/kfgqpc-hafs-18.woff2') as unknown as {
      hasGlyphForCodePoint: (c: number) => boolean
    }
    const chars = new Set<number>()
    for (const s of surahs)
      for (const a of text(s.id)) for (const c of a.text) chars.add(c.codePointAt(0)!)
    for (const l of corpusLines) {
      const [, form = '', , feats = ''] = l.split('\t')
      const lemma =
        feats
          .split('|')
          .find((x) => x.startsWith('LEM:'))
          ?.slice(4) ?? ''
      for (const c of form + lemma) chars.add(c.codePointAt(0)!)
    }
    for (const d of '٠١٢٣٤٥٦٧٨٩') chars.add(d.codePointAt(0)!)
    chars.delete(0x20)
    const missing = [...chars]
      .filter((c) => !font.hasGlyphForCodePoint(c))
      .map((c) => c.toString(16))
    expect(missing).toEqual([])
  })
})

describe('Quranic words quoted in the documentation', () => {
  it('are copied exactly from the text', () => {
    const all = surahs.flatMap((s) => text(s.id).map((a) => a.text)).join('\n')
    // marks used only in the Quranic encoding identify a quoted Quranic word
    // eslint-disable-next-line no-misleading-character-class -- a set of combining marks is the intent
    const quranic = /[ٱٰ۪ۡۢٓٞٗ]/
    for (const file of ['VERIFICATION.md', 'src/features/about/AboutPage.tsx']) {
      const words = readFileSync(file, 'utf8')
        .split(/[\s«»()،.:,]+/)
        .filter((w) => quranic.test(w))
      expect(words.length, file).toBeGreaterThan(0)
      for (const w of words) expect(all, `${file}: ${w}`).toContain(w)
    }
  })
})
