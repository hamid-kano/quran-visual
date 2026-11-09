import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { Lexicon, LexiconEntry, RootIndex, SurahMorphology } from '../src/data/schemas.ts'
import { continuesToken, rootLemmaPath, wordSlug } from '../src/lib/lexicon.ts'
import { filterLexicon, lexKey } from '../src/lib/lexiconSearch.ts'

const read = (f: string) => JSON.parse(readFileSync(`public/data/${f}`, 'utf8'))
const lex = Lexicon.parse(read('lexicon.json'))
const bySlug = new Map(lex.entries.map((e) => [e.slug, e]))
const entry = (slug: string) => LexiconEntry.parse(read(`lex/${slug}.json`))
const morph = Array.from({ length: 114 }, (_, i) =>
  SurahMorphology.parse(read(`morph/${i + 1}.json`)),
)

describe('the lexicon', () => {
  it('counts every mushaf word once, leaving out only words the corpus gives no lemma', () => {
    expect(lex.words).toBe(77430)
    expect(lex.entries.reduce((n, e) => n + e.count, 0)).toBe(lex.counted)
    // the rest: words whose core is a pronoun (هُمۡ، and with a prefix لَهُمۡ، فَهُوَ), to which the
    // corpus gives no lemma, and the opening letters of 29 surahs (30 ayahs)
    let pron = 0
    let opening = 0
    let split = 0
    for (const m of morph)
      for (const a of m.ayahs)
        a!.forEach((w, i) => {
          if (continuesToken(a!, i)) split++
          else if (!wordSlug(w)) {
            if (w.some(([, , f]) => f.startsWith('INL'))) opening++
            else if (
              w.filter(([, , f]) => !f.includes('PREF')).every(([, , f]) => f.includes('PRON'))
            )
              pron++
          }
        })
    expect(opening).toBe(30)
    // «إِلۡ يَاسِينَ» is one name written as two words, counted once
    expect(split).toBe(1)
    expect(pron + opening + split).toBe(lex.words - lex.counted)
  })

  it('gives each entry a unique address', () => {
    expect(bySlug.size).toBe(lex.entries.length)
  })

  it('agrees with the corpus on well-known counts', () => {
    expect(bySlug.get('اللَّه'.normalize('NFC'))!.count).toBe(2699)
    expect(bySlug.get('رَحْمٰن'.normalize('NFC'))!.count).toBe(57)
    // إلياس three times, «إِلۡ يَاسِينَ» among them once
    expect(bySlug.get('إِلْياس'.normalize('NFC'))!.count).toBe(3)
  })

  it('keeps apart lemmas spelt alike: ما as a noun and as a particle', () => {
    expect(bySlug.get('ما-اسم')!.tag).toBe('N')
    expect(bySlug.get('ما-حرف')!.tag).toBe('P')
    expect(bySlug.get('عاد-عود')!.root).toBe('عود')
  })

  it('points every listed place at a word whose stem is that very entry', () => {
    for (const e of lex.entries) {
      const d = entry(e.slug)
      expect(d.occ).toHaveLength(e.count)
      expect(d.forms.reduce((n, [, c]) => n + c, 0)).toBe(e.count)
      expect(d.kinds.reduce((n, [, c]) => n + c, 0)).toBe(e.count)
      expect(new Set(d.occ.map(([s, a]) => `${s}:${a}`)).size).toBe(e.ayahs)
      for (const [s, a, w] of d.occ) expect(wordSlug(morph[s - 1]!.ayahs[a - 1]![w]!)).toBe(e.slug)
    }
  })

  it('finds every lemma the roots index lists', () => {
    const roots = RootIndex.parse(read('roots.json'))
    for (const r of roots.roots)
      for (const l of r.lemmas) {
        const path = rootLemmaPath(l.lemma, r.root)
        if (path.startsWith('/words?q=')) continue
        const slug = decodeURIComponent(path.slice('/words/'.length))
        expect(bySlug.get(slug)?.root, `${r.root} ${l.lemma}`).toBe(r.root)
      }
  })
})

describe('searching the lexicon', () => {
  it('finds a lemma as people type it, without vowels or hamza seats', () => {
    expect(filterLexicon(lex.entries, 'رحمة', 'all', 'count')[0]!.lemma).toBe('رَحْمَة')
    expect(filterLexicon(lex.entries, 'رحمه', 'all', 'count')[0]!.lemma).toBe('رَحْمَة')
    expect(filterLexicon(lex.entries, 'اله', 'all', 'count')[0]!.lemma).toBe('إِلٰه')
  })

  it('lists a root’s lemmas when the query is the root, spaced or not', () => {
    for (const q of ['صبر', 'ص ب ر']) {
      const found = filterLexicon(lex.entries, q, 'all', 'count')
      for (const e of lex.entries.filter((x) => x.root === 'صبر')) expect(found).toContain(e)
    }
  })

  it('filters by type and orders by letters', () => {
    expect(filterLexicon(lex.entries, '', 'V', 'count').every((e) => e.tag === 'V')).toBe(true)
    const alpha = filterLexicon(lex.entries, '', 'all', 'alpha')
    for (let i = 1; i < 200; i++)
      expect(
        lexKey(alpha[i - 1]!.lemma).localeCompare(lexKey(alpha[i]!.lemma), 'ar'),
      ).toBeLessThanOrEqual(0)
  })
})

describe('the line over the words of a prostration', () => {
  const text = JSON.parse(readFileSync('sources/kfgqpc-hafs-v18.json', 'utf8')) as {
    sora: number
    aya_no: number
    aya_text: string
  }[]
  it('is marked (U+06E4) in the fifteen places of prostration and nowhere else', () => {
    const marked = [
      ...new Set(
        text.filter((a) => a.aya_text.includes('\u06E4')).map((a) => `${a.sora}:${a.aya_no}`),
      ),
    ]
    expect(marked).toEqual([
      '7:206',
      '13:15',
      '16:49',
      '17:107',
      '19:58',
      '22:18',
      '22:77',
      '25:60',
      '27:25',
      '32:15',
      '38:24',
      '41:37',
      '53:62',
      '84:21',
      '96:19',
    ])
  })
  it('is not part of a word’s form', () => {
    const allah = entry('اللَّه')
    expect(allah.forms.some(([f]) => f.includes('\u06E4'))).toBe(false)
    // لله as the KFGQPC text spells it (lam kasra, lam shadda fatha, ha kasra): with the line
    // in 41:37 and 53:62, without it elsewhere; one form, counted 116 times
    const lillah = '\u0644\u0650\u0644\u0651\u064E\u0647\u0650'
    expect(allah.forms.filter(([f]) => f === lillah)).toEqual([[lillah, 116]])
    for (const e of lex.entries.slice(0, 400))
      expect(
        entry(e.slug).forms.some(([f]) => f.includes('\u06E4')),
        e.slug,
      ).toBe(false)
  })
})
