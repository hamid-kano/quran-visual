import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { Mushaf, SurahIndex, SurahText } from '../src/data/schemas.ts'
import { khatma, marksByAyah, ordinals, pageOf, quarterName, juzName } from '../src/lib/mushaf.ts'

const read = (f: string) => JSON.parse(readFileSync(`public/data/${f}`, 'utf8'))
const m = Mushaf.parse(read('mushaf.json'))
const surahs = SurahIndex.parse(read('surahs.json')).surahs
const ord = ordinals(surahs.map((s) => s.ayahs))
const source: { sora: number; aya_no: number; page: number; jozz: number }[] = JSON.parse(
  readFileSync('sources/kfgqpc-hafs-v18.json', 'utf8'),
)
const text = (s: number, a: number) => SurahText.parse(read(`surah/${s}.json`)).ayahs[a - 1]!.text

describe('the mushaf divisions', () => {
  it('number every ayah from 0 to 6235 and back', () => {
    expect(ord.total).toBe(6236)
    for (const s of surahs)
      for (const a of [1, s.ayahs]) expect(ord.at(ord.of([s.id, a]))).toEqual([s.id, a])
  })

  it('agree with the KFGQPC file on the page and juz of every ayah', () => {
    for (const r of source) {
      expect(pageOf(m, ord, [r.sora, r.aya_no])).toBe(r.page)
      const juz = m.juz.filter((j) => ord.of(j) <= ord.of([r.sora, r.aya_no])).length
      expect(juz).toBe(r.jozz)
    }
  })

  it('put a quarter wherever the text carries ۞, and otherwise only at a surah’s opening', () => {
    const starts = new Set(m.quarters.map((q) => q.join(':')))
    for (const r of source) {
      const marked = text(r.sora, r.aya_no).includes('۞')
      const start = starts.has(`${r.sora}:${r.aya_no}`)
      if (marked) expect(start).toBe(true)
      else if (start) expect(r.aya_no).toBe(1)
    }
  })

  it('names the quarters as the margin does', () => {
    expect(quarterName(1)).toBe('الحزب ١')
    expect(quarterName(2)).toBe('ربع الحزب ١')
    expect(quarterName(3)).toBe('نصف الحزب ١')
    expect(quarterName(4)).toBe('ثلاثة أرباع الحزب ١')
    expect(quarterName(240)).toBe('ثلاثة أرباع الحزب ٦٠')
    expect(juzName(30)).toBe('الجزء الثلاثون')
    expect(marksByAyah(m).get('1:1')).toEqual({ page: 1, juz: 1, quarter: 1 })
  })
})

describe('a khatma plan', () => {
  for (const days of [1, 3, 7, 10, 15, 29, 30, 60, 365, 604]) {
    it(`over ${days} days covers every page and every ayah once, in order`, () => {
      const plan = khatma(m, ord, days)
      expect(plan).toHaveLength(days)
      expect(plan[0]!.from).toEqual([1, 1])
      expect(plan.at(-1)!.to).toEqual([114, 6])
      for (let i = 0; i < plan.length; i++) {
        const p = plan[i]!
        expect(p.day).toBe(i + 1)
        expect(p.toPage).toBeGreaterThanOrEqual(p.fromPage)
        // whole pages: it starts at its first page's first ayah and ends at its last page's last
        expect(pageOf(m, ord, p.from)).toBe(p.fromPage)
        expect(m.pages[p.fromPage - 1]).toEqual(p.from)
        expect(pageOf(m, ord, p.to)).toBe(p.toPage)
        if (i > 0) {
          expect(p.fromPage).toBe(plan[i - 1]!.toPage + 1)
          expect(ord.of(p.from)).toBe(ord.of(plan[i - 1]!.to) + 1)
        }
      }
      // as even as whole pages allow
      const sizes = plan.map((p) => p.toPage - p.fromPage + 1)
      expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1)
    })
  }
})

describe('the text as the reader shows it', () => {
  it('keeps every token, numbering only the words as the analysis does', async () => {
    const { tokens, ayahWords } = await import('../src/lib/quran.ts')
    for (const s of surahs)
      for (const a of SurahText.parse(read(`surah/${s.id}.json`)).ayahs) {
        const t = tokens(a.text)
        // nothing of the text is lost
        expect(t.map((x) => x.text).join(' ')).toBe(
          a.text
            .split(/[ \u00a0]+/)
            .filter(Boolean)
            .join(' '),
        )
        expect(t.filter((x) => x.word !== null).map((x) => x.text)).toEqual(ayahWords(a.text))
      }
    expect(tokens(text(3, 93))[0]).toEqual({ text: '\u06DE', word: null })
  })
})
