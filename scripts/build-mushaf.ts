/**
 * The divisions of the Madinah mushaf, for reading by page and planning a khatma.
 *
 *   - Pages (604) and juz (30): as given for every ayah in the KFGQPC Hafs v18 file, the same
 *     edition as the text and font shown. Every page there begins with a new ayah.
 *   - Quarters of a hizb (240; a hizb is four, a juz two hizbs in count): where the text itself
 *     carries the sign ۞ (U+06DE), together with the quarters that open a surah, which carry no
 *     sign; those are taken from Tanzil's list (npm quran-meta). The build fails unless the two
 *     make exactly 240.
 *
 * Writes public/data/mushaf.json.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { getRubAlHizbMeta, type RubAlHizbId } from 'quran-meta/hafs'
import { Mushaf } from '../src/data/schemas.ts'
import { quran } from './quran-text.ts'

type Ref = [number, number]
const RUB = '۞'

const all = quran.flatMap((s) => s.verses.map((v) => ({ s: s.id, a: v.id, ...v })))

/** The first ayah of each value of a field that only grows through the mushaf. */
function firsts(field: 'page' | 'juz', count: number): Ref[] {
  const out: Ref[] = []
  for (const v of all) {
    const n = v[field]
    if (n === out.length + 1) out.push([v.s, v.a])
    else if (n !== out.length) throw new Error(`mushaf: ${field} jumps at ${v.s}:${v.a}`)
  }
  if (out.length !== count) throw new Error(`mushaf: ${out.length} ${field}s, not ${count}`)
  return out
}

const pages = firsts('page', 604)
const juz = firsts('juz', 30)

const marked = all.filter((v) => v.text.includes(RUB)).map((v): Ref => [v.s, v.a])
const surahOpening = Array.from(
  { length: 240 },
  (_, i) => getRubAlHizbMeta((i + 1) as RubAlHizbId).first as Ref,
)
  .filter(([, a]) => a === 1)
  .map(([s]): Ref => [s, 1])
for (const [s] of surahOpening)
  if (all.find((v) => v.s === s && v.a === 1)!.text.includes(RUB))
    throw new Error(`mushaf: ${s}:1 opens a quarter and also carries the sign`)
const order = new Map(all.map((v, i) => [`${v.s}:${v.a}`, i]))
const quarters = [...marked, ...surahOpening].sort(
  (x, y) => order.get(x.join(':'))! - order.get(y.join(':'))!,
)
if (quarters.length !== 240 || new Set(quarters.map((q) => q.join(':'))).size !== 240)
  throw new Error(`mushaf: ${quarters.length} quarters, not 240`)
if (quarters[0]!.join(':') !== '1:1')
  throw new Error('mushaf: the first quarter must open the mushaf')

/*
 * The page reader puts a surah's heading (its name, then the basmala) on the page of its first
 * ayah, just before it. Check that against the lines the file gives every ayah (1–15 on its
 * page): from page 3 on, the lines no ayah occupies must be exactly the heading lines of the
 * surahs opening on that page — one for al-Tawba, which has no basmala, two for the others.
 */
const raw: { sora: number; aya_no: number; page: number; line_start: number; line_end: number }[] =
  JSON.parse(readFileSync('sources/kfgqpc-hafs-v18.json', 'utf8'))
for (let p = 3; p <= 604; p++) {
  const rows = raw.filter((r) => r.page === p)
  const used = new Set(rows.flatMap((r) => range(r.line_start, r.line_end)))
  const free = range(1, 15).filter((l) => !used.has(l))
  const heading = rows
    .filter((r) => r.aya_no === 1)
    .flatMap((r) => range(r.line_start - (r.sora === 9 ? 1 : 2), r.line_start - 1))
  if (free.join() !== heading.join())
    throw new Error(`mushaf: page ${p} has free lines ${free} but headings at ${heading}`)
}
function range(a: number, b: number) {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i)
}

writeFileSync('public/data/mushaf.json', JSON.stringify(Mushaf.parse({ pages, juz, quarters })))
console.log(`mushaf: ${pages.length} pages, ${juz.length} juz, ${quarters.length} quarters`)
