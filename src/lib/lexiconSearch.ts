import type { LexiconIndexEntry } from '../data/schemas'
import { stripMarks } from './quran'

/**
 * A lemma or a typed query reduced to its letters, with the hamza seats and alif forms that
 * people type interchangeably unified: so «رحمه» finds رَحْمَة and «اله» finds إِلٰه.
 */
export function lexKey(text: string) {
  return stripMarks(text.normalize('NFC'))
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^ء-ي]/g, '')
}

export type LexType = 'all' | LexiconIndexEntry['tag']
export type LexSort = 'count' | 'alpha'

/**
 * The entries matching a query, type and order. A query matches a lemma containing it or a root
 * equal to it; matches on the whole lemma come first, then lemmas that start with it.
 */
export function filterLexicon(
  entries: LexiconIndexEntry[],
  query: string,
  type: LexType,
  sort: LexSort,
): LexiconIndexEntry[] {
  const q = lexKey(query)
  const ofType = type === 'all' ? entries : entries.filter((e) => e.tag === type)
  const order = (list: LexiconIndexEntry[]) =>
    sort === 'alpha'
      ? [...list].sort(
          (a, b) => lexKey(a.lemma).localeCompare(lexKey(b.lemma), 'ar') || b.count - a.count,
        )
      : list
  if (!q) return order(ofType)
  const rank = (e: LexiconIndexEntry) => {
    const k = lexKey(e.lemma)
    if (k === q) return 0
    if (k.startsWith(q)) return 1
    if (k.includes(q)) return 2
    if (e.root && lexKey(e.root) === q) return 3
    return -1
  }
  const ranked = ofType.map((e) => [e, rank(e)] as const).filter(([, r]) => r >= 0)
  // stable: within a rank, the chosen order (frequency, or alphabetical) holds
  const sorted = order(ranked.map(([e]) => e))
  const r = new Map(ranked)
  return sorted.sort((a, b) => r.get(a)! - r.get(b)!)
}
