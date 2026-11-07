import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { Mushaf, SurahIndex } from '../src/data/schemas.ts'
import { ordinals } from '../src/lib/mushaf.ts'
import {
  divisionAt,
  pageRange,
  pageRuns,
  parsePage,
  spreadOf,
  spreadPages,
} from '../src/lib/mushafPage.ts'

const read = (f: string) => JSON.parse(readFileSync(`public/data/${f}`, 'utf8'))
const m = Mushaf.parse(read('mushaf.json'))
const surahs = SurahIndex.parse(read('surahs.json')).surahs
const counts = surahs.map((s) => s.ayahs)
const ord = ordinals(counts)
const source: { sora: number; aya_no: number; page: number; jozz: number }[] = JSON.parse(
  readFileSync('sources/kfgqpc-hafs-v18.json', 'utf8'),
)

describe('a page of the mushaf', () => {
  it('holds exactly the ayahs the KFGQPC file puts on it, every ayah once', () => {
    const seen: string[] = []
    for (let p = 1; p <= 604; p++)
      for (const r of pageRuns(m, ord, counts, p))
        for (let a = r.from; a <= r.to; a++) seen.push(`${r.surah}:${a}:${p}`)
    expect(seen).toEqual(source.map((r) => `${r.sora}:${r.aya_no}:${r.page}`))
  })

  it('opens a surah only at its first ayah', () => {
    const opened = Array.from({ length: 604 }, (_, i) => pageRuns(m, ord, counts, i + 1))
      .flat()
      .filter((r) => r.opens)
      .map((r) => r.surah)
    expect(opened).toEqual(surahs.map((s) => s.id))
  })

  it('knows its first and last pages', () => {
    expect(pageRange(m, ord, 1)).toEqual({ from: [1, 1], to: [1, 7] })
    expect(pageRange(m, ord, 2)).toEqual({ from: [2, 1], to: [2, 5] })
    expect(pageRange(m, ord, 604)).toEqual({ from: [112, 1], to: [114, 6] })
    expect(() => pageRange(m, ord, 0)).toThrow()
    expect(() => pageRange(m, ord, 605)).toThrow()
  })

  it('names the juz its first ayah is in, as the file does', () => {
    for (let p = 1; p <= 604; p++) {
      const first = m.pages[p - 1]!
      const row = source.find((r) => r.sora === first[0] && r.aya_no === first[1])!
      expect(divisionAt(m.juz, ord, first)).toBe(row.jozz)
    }
  })

  it('pairs pages as an open book and reads typed page numbers', () => {
    expect(spreadOf(1)).toBe(1)
    expect(spreadOf(2)).toBe(1)
    expect(spreadOf(604)).toBe(302)
    expect(spreadPages(302)).toEqual([603, 604])
    expect(parsePage('٣٤٥')).toBe(345)
    expect(parsePage(' 12 ')).toBe(12)
    expect(parsePage('0')).toBeNull()
    expect(parsePage('605')).toBeNull()
    expect(parsePage('12a')).toBeNull()
  })
})
