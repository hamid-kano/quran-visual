/**
 * Integrity checks on the generated data. The build fails if any of these break,
 * so a wrong count or a corrupted text can never reach the published site.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { RootIndex, RootOccurrences, SurahIndex, SurahText } from '../src/data/schemas.ts'
import { BASMALA } from '../src/lib/quran.ts'

const read = (f: string) => JSON.parse(readFileSync(`public/data/${f}`, 'utf8'))
const index = SurahIndex.parse(read('surahs.json'))
const roots = RootIndex.parse(read('roots.json'))
const occ = RootOccurrences.parse(read('root-occurrences.json'))

describe('surahs', () => {
  it('has 114 surahs in mushaf order', () => {
    expect(index.surahs.map((s) => s.id)).toEqual(Array.from({ length: 114 }, (_, i) => i + 1))
  })

  it('totals 6236 ayahs (Hafs, Kufan count)', () => {
    expect(index.surahs.reduce((n, s) => n + s.ayahs, 0)).toBe(6236)
  })

  it('counts 77,430 words as the mushaf separates them', () => {
    expect(index.surahs.reduce((n, s) => n + s.words, 0)).toBe(77430)
  })

  it('has 86 Meccan and 28 Medinan surahs', () => {
    expect(index.surahs.filter((s) => s.revelation === 'meccan')).toHaveLength(86)
    expect(index.surahs.filter((s) => s.revelation === 'medinan')).toHaveLength(28)
  })

  it('has a revelation order that is a permutation of 1..114, starting with al-ʿAlaq', () => {
    const orders = index.surahs.map((s) => s.order).sort((a, b) => a - b)
    expect(orders).toEqual(Array.from({ length: 114 }, (_, i) => i + 1))
    expect(index.surahs.find((s) => s.order === 1)?.id).toBe(96)
  })

  it('has known anchors', () => {
    const s = (id: number) => index.surahs[id - 1]!
    expect([s(1).ayahs, s(2).ayahs, s(108).ayahs, s(114).ayahs]).toEqual([7, 286, 3, 6])
    expect(s(2).juz).toBe(1)
    expect(s(78).juz).toBe(30)
  })
})

describe('texts', () => {
  const files = readdirSync('public/data/surah')
  it('has one text file per surah, each matching its ayah count', () => {
    expect(files).toHaveLength(114)
    for (const meta of index.surahs) {
      const t = SurahText.parse(read(`surah/${meta.id}.json`))
      expect(t.ayahs).toHaveLength(meta.ayahs)
      expect(t.ayahs.map((a) => a.n)).toEqual(Array.from({ length: meta.ayahs }, (_, i) => i + 1))
    }
  })

  it('opens with the basmala in al-Fatiha', () => {
    const t = SurahText.parse(read('surah/1.json'))
    expect(t.ayahs[0]!.text).toBe(BASMALA)
  })
})

describe('roots', () => {
  it('every root has its occurrences and they sum to its ayah spread', () => {
    for (const r of roots.roots) {
      const list = occ[r.root]
      expect(list, r.root).toBeDefined()
      expect(new Set(list!.map(([s]) => s)).size).toBe(r.surahs)
    }
  })

  it('every edge connects roots placed in the network', () => {
    const placed = new Set(roots.roots.filter((r) => r.x !== null).map((r) => r.root))
    for (const e of roots.edges) {
      expect(placed.has(e.a) && placed.has(e.b)).toBe(true)
    }
  })

  it('finds the root of the divine name as the most frequent', () => {
    const top = [...roots.roots].sort((a, b) => b.count - a.count)[0]!
    expect(top.root).toBe('أله')
  })
})
