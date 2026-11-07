import type { Mushaf } from '../data/schemas'
import type { ordinals } from './mushaf'

type Ref = [number, number]
type Ord = ReturnType<typeof ordinals>

export const PAGE_COUNT = 604

/** A run of one surah's ayahs on a page; `opens` when the surah begins there (with its heading). */
export interface Run {
  surah: number
  from: number
  to: number
  opens: boolean
}

/** First and last ayah of a page (1–604). Every page of this mushaf begins with a new ayah. */
export function pageRange(m: Mushaf, ord: Ord, page: number): { from: Ref; to: Ref } {
  if (!Number.isInteger(page) || page < 1 || page > m.pages.length) throw new RangeError('page')
  const next = m.pages[page]
  return {
    from: m.pages[page - 1]!,
    to: next ? ord.at(ord.of(next) - 1) : ord.at(ord.total - 1),
  }
}

/**
 * The page's ayahs grouped by surah, in order. A surah's heading always sits on the page of
 * its first ayah (checked against the source's line numbers when the data is built).
 */
export function pageRuns(m: Mushaf, ord: Ord, counts: number[], page: number): Run[] {
  const { from, to } = pageRange(m, ord, page)
  const runs: Run[] = []
  for (let s = from[0]; s <= to[0]; s++) {
    const a = s === from[0] ? from[1] : 1
    const b = s === to[0] ? to[1] : counts[s - 1]!
    runs.push({ surah: s, from: a, to: b, opens: a === 1 })
  }
  return runs
}

/** The last division (juz, quarter…) that begins at or before the page's first ayah, 1-based. */
export function divisionAt(starts: Ref[], ord: Ord, page: Ref) {
  const i = ord.of(page)
  let n = 0
  for (const r of starts) {
    if (ord.of(r) > i) break
    n++
  }
  return n
}

/** Pages read as an open book: the odd page on the right, the even on the left (1 and 2 first). */
export const spreadOf = (page: number) => Math.ceil(page / 2)
export const spreadPages = (spread: number): [number, number] => [spread * 2 - 1, spread * 2]

/** A page number typed by the reader, if it is one. Accepts Arabic-Indic digits too. */
export function parsePage(input: string): number | null {
  const ascii = input.trim().replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
  if (!/^\d{1,3}$/.test(ascii)) return null
  const n = Number(ascii)
  return n >= 1 && n <= PAGE_COUNT ? n : null
}
