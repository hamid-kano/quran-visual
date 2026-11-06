import type { Mushaf } from '../data/schemas'
import { toArabicDigits } from './arabic'

type Ref = [number, number]

/** Position of an ayah in the whole mushaf (0 for al-Fatiha 1), from each surah's ayah count. */
export function ordinals(counts: number[]) {
  const start: number[] = []
  let n = 0
  for (const c of counts) {
    start.push(n)
    n += c
  }
  const of = ([s, a]: Ref) => start[s - 1]! + a - 1
  const at = (i: number): Ref => {
    let s = 1
    while (s < counts.length && start[s]! <= i) s++
    return [s, i - start[s - 1]! + 1]
  }
  return { of, at, total: n }
}

const ORDINAL_JUZ = [
  'الأول',
  'الثاني',
  'الثالث',
  'الرابع',
  'الخامس',
  'السادس',
  'السابع',
  'الثامن',
  'التاسع',
  'العاشر',
  'الحادي عشر',
  'الثاني عشر',
  'الثالث عشر',
  'الرابع عشر',
  'الخامس عشر',
  'السادس عشر',
  'السابع عشر',
  'الثامن عشر',
  'التاسع عشر',
  'العشرون',
  'الحادي والعشرون',
  'الثاني والعشرون',
  'الثالث والعشرون',
  'الرابع والعشرون',
  'الخامس والعشرون',
  'السادس والعشرون',
  'السابع والعشرون',
  'الثامن والعشرون',
  'التاسع والعشرون',
  'الثلاثون',
]
export const juzName = (j: number) => `الجزء ${ORDINAL_JUZ[j - 1]}`

/** A quarter (1–240) as the mushaf's margin names it: الحزب ٣، ربع الحزب ٣، نصف…، ثلاثة أرباع… */
export function quarterName(q: number) {
  const hizb = toArabicDigits(Math.ceil(q / 4))
  return ['الحزب', 'ربع الحزب', 'نصف الحزب', 'ثلاثة أرباع الحزب'][(q - 1) % 4]! + ' ' + hizb
}

export interface Marks {
  page?: number
  juz?: number
  quarter?: number
}

/** What begins at each ayah, by "surah:ayah": a page, a juz, a quarter of a hizb. */
export function marksByAyah(m: Mushaf) {
  const out = new Map<string, Marks>()
  const add = (refs: Ref[], key: keyof Marks) =>
    refs.forEach(([s, a], i) => {
      const k = `${s}:${a}`
      out.set(k, { ...out.get(k), [key]: i + 1 })
    })
  add(m.pages, 'page')
  add(m.juz, 'juz')
  add(m.quarters, 'quarter')
  return out
}

/** The page an ayah is on: the last page that begins at or before it. */
export function pageOf(m: Mushaf, ord: ReturnType<typeof ordinals>, ref: Ref) {
  const i = ord.of(ref)
  let lo = 0
  let hi = m.pages.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (ord.of(m.pages[mid]!) <= i) lo = mid
    else hi = mid - 1
  }
  return lo + 1
}

export interface Portion {
  day: number
  fromPage: number
  toPage: number
  from: Ref
  to: Ref
}

/**
 * A khatma over the given number of days, in whole pages shared as evenly as they go: day d
 * reads to page ⌊604·d/days⌋. Each portion runs from the first ayah of its first page to the
 * last ayah of its last page (every page of this mushaf begins with a new ayah).
 */
export function khatma(m: Mushaf, ord: ReturnType<typeof ordinals>, days: number): Portion[] {
  const n = m.pages.length
  if (!Number.isInteger(days) || days < 1 || days > n) throw new RangeError('days')
  const out: Portion[] = []
  let page = 1
  for (let d = 1; d <= days; d++) {
    const last = Math.floor((n * d) / days)
    if (last < page) continue
    const next = m.pages[last] // first ayah of the page after, if any
    out.push({
      day: out.length + 1,
      fromPage: page,
      toPage: last,
      from: m.pages[page - 1]!,
      to: next ? ord.at(ord.of(next) - 1) : ord.at(ord.total - 1),
    })
    page = last + 1
  }
  return out
}
