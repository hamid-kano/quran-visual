import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  Fingerprints,
  NameIndex,
  SimilarIndex,
  SurahIndex,
  SurahMorphology,
} from '../src/data/schemas.ts'
import { describeWord } from '../src/lib/morphology.ts'
import { commonWords, wordKey } from '../src/lib/quran.ts'

const read = (f: string) => JSON.parse(readFileSync(`public/data/${f}`, 'utf8'))
const surahs = SurahIndex.parse(read('surahs.json')).surahs
const fps = Fingerprints.parse(read('fingerprints.json'))
const names = NameIndex.parse(read('names.json'))
const similar = SimilarIndex.parse(read('similar.json'))

describe('fingerprints', () => {
  it('has one length and one ending per ayah, and word counts that sum per surah', () => {
    for (const s of surahs) {
      const fp = fps[s.id - 1]!
      expect(fp.lengths).toHaveLength(s.ayahs)
      expect([...fp.endings]).toHaveLength(s.ayahs)
      expect(fp.lengths.reduce((a, b) => a + b, 0)).toBe(s.words)
    }
  })

  it('reads al-Ikhlas as ending in د four times', () => {
    expect(fps[111]!.endings).toBe('دددد')
  })
})

describe('names', () => {
  it('does not include the divine name', () => {
    expect(names.names.some((n) => wordKey(n.name) === 'الله')).toBe(false)
  })

  it('counts Musa as the most mentioned name', () => {
    const top = [...names.names].sort((a, b) => b.count - a.count)[0]!
    expect(wordKey(top.name)).toBe('موسي')
  })
})

describe('similar ayahs', () => {
  it('pairs are ordered and within bounds', () => {
    for (const [s1, a1, s2, a2] of similar.pairs) {
      expect(s1 < s2 || (s1 === s2 && a1 < a2)).toBe(true)
      expect(a1).toBeLessThanOrEqual(surahs[s1 - 1]!.ayahs)
      expect(a2).toBeLessThanOrEqual(surahs[s2 - 1]!.ayahs)
    }
  })

  it('finds the 31 repetitions in al-Rahman as one group', () => {
    const g = similar.repeats.find((r) => r.some(([s, a]) => s === 55 && a === 13))
    expect(g).toHaveLength(31)
  })

  it('aligns common words', () => {
    const [a, b] = commonWords(['ا', 'ب', 'ج'], ['ا', 'ج'])
    expect([...a]).toEqual([2, 0])
    expect([...b]).toEqual([1, 0])
  })
})

describe('morphology', () => {
  const fatiha = SurahMorphology.parse(read('morph/1.json'))
  it('aligns every word of al-Fatiha', () => {
    expect(fatiha.ayahs.every((a) => a !== null)).toBe(true)
    expect(fatiha.ayahs[0]).toHaveLength(4)
  })

  it('describes بسم as a preposition followed by a noun of root سمو', () => {
    const info = describeWord(fatiha.ayahs[0]![0]!)
    expect(info.root).toBe('سمو')
    expect(info.segments.map((s) => s.label)).toEqual(['حرف جر', 'اسم'])
  })

  it('describes نعبد as an imperfect verb', () => {
    const info = describeWord(fatiha.ayahs[4]![1]!)
    expect(info.root).toBe('عبد')
    expect(info.segments[0]!.label).toBe('فعل مضارع')
  })
})
