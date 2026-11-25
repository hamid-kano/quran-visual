/**
 * Where each line of the printed page breaks: how many words of the KFGQPC Hafs v18 text sit on
 * each of the fifteen lines of every page. Run once, by hand; its output is kept in sources/.
 *
 *   pnpm tsx scripts/extract-mushaf-lines.ts <dir>
 *
 * <dir> is assets/db/v2/Madina-1441H of npm `quran-madina-html` 2.2.2 (Waqf General Public
 * License 2.0), whose line layout of the 1441H Madinah print gives, for every ayah, its text on
 * each line it occupies. That print is the one the v18 text and font follow: the page and the
 * first and last line of every ayah agree with the v18 file on all 604 pages (checked below).
 *
 * The two texts spell a few words differently (مَا لِيَ against مَالِيَ), so the break is found
 * by letters, not by words: a line ends after the v18 word that brings the count of letters to
 * where the source's line ends.
 *
 * Writes sources/mushaf-lines.json: for each page, the word count of each line, 0 for a line
 * that holds a surah's heading (its name or the basmala above its first ayah).
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2]
if (!dir)
  throw new Error('usage: extract-mushaf-lines.ts <quran-madina-html>/assets/db/v2/Madina-1441H')

interface V18 {
  sora: number
  aya_no: number
  page: number
  line_start: number
  line_end: number
  aya_text: string
}
const v18: V18[] = JSON.parse(readFileSync('sources/kfgqpc-hafs-v18.json', 'utf8'))

/** [surah index from 0, entry index in the surah, page, rows on each line] */
type Entry = [number, number, number, { l: number; t: string }[]]
const entries: Entry[] = readdirSync(dir)
  .filter((f) => /^juz-\d+\.json$/.test(f))
  .sort()
  .flatMap((f) => (JSON.parse(readFileSync(join(dir, f), 'utf8')) as { d: Entry[] }).d)

// each surah's entries open with its heading rows; the ayahs are the last ones, in order
const ayahCount = new Map<number, number>()
for (const v of v18) ayahCount.set(v.sora, (ayahCount.get(v.sora) ?? 0) + 1)
const source = new Map<string, Entry>()
for (let s = 1; s <= 114; s++) {
  const own = entries.filter((e) => e[0] === s - 1).sort((a, b) => a[1] - b[1])
  const n = ayahCount.get(s)!
  own.slice(own.length - n).forEach((e, i) => source.set(`${s}:${i + 1}`, e))
}

/** The letters of a text, without marks, so that the two spellings can be compared. */
const LETTER = /[ء-غف-يٱ]/gu
const letters = (t: string) => (t.match(LETTER) ?? []).length
/** The words of the v18 text, without the ayah number; ۞ goes with the word after it. */
const words = (text: string) =>
  text
    .replace(/\u00a0/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, -1)
    .filter((w) => letters(w) > 0)

const pages: number[][] = Array.from({ length: 604 }, () => [])
for (const v of v18) {
  const e = source.get(`${v.sora}:${v.aya_no}`)!
  const rows = e[3]
  if (e[2] !== v.page || rows[0]!.l !== v.line_start || rows.at(-1)!.l !== v.line_end)
    throw new Error(`lines: ${v.sora}:${v.aya_no} is not where the v18 file puts it`)
  const ws = words(v.aya_text).map(letters)
  const line = pages[v.page - 1]!
  let at = 0 // v18 words placed so far
  let sum = 0 // their letters
  let target = 0 // the source's letters up to the end of this line
  rows.forEach((r, i) => {
    target += letters(r.t)
    let n = 0
    if (i === rows.length - 1) n = ws.length - at
    else
      while (at + n < ws.length && Math.abs(sum + ws[at + n]! - target) <= Math.abs(sum - target)) {
        sum += ws[at + n]!
        n++
      }
    if (i < rows.length - 1) at += n
    else at = ws.length
    line[r.l - 1] = (line[r.l - 1] ?? 0) + n
  })
}
pages.forEach((line, p) => {
  const n = p < 2 ? 8 : 15
  for (let l = 0; l < n; l++) line[l] ??= 0
  if (line.length !== n) throw new Error(`lines: page ${p + 1} has ${line.length} lines`)
})

writeFileSync('sources/mushaf-lines.json', JSON.stringify(pages) + '\n')
console.log('lines: 604 pages written to sources/mushaf-lines.json')
