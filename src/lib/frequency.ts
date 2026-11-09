import type { LexiconIndexEntry } from '../data/schemas'

/** Counted by the word's entry in the lexicon (قال، يقول، قُل: one), or by its root. */
export type Unit = 'lemma' | 'root'
/** Nouns and verbs together (the default: particles crowd the top), or one kind alone. */
export type Kind = 'NV' | 'N' | 'V' | 'P'
/** The whole mushaf, the Meccan or the Medinan surahs, or one surah. */
export type Scope = 'all' | 'meccan' | 'medinan' | number

export interface Ranked {
  /** The entry's slug, or the root. */
  key: string
  /** The lemma as the corpus gives it, or the root. */
  label: string
  /** What it is: the entry's kind, or for a root how many entries share it. */
  root: string | null
  kind: string
  /** Lexicon entries counted together (one for a lemma). */
  entries: number
  count: number
  /** In how many of the surahs in scope it occurs. */
  surahs: number
}

/**
 * The most frequent words in a scope: every lexicon entry's occurrences summed over the surahs
 * in scope (`bySurah` holds each entry's [surah, count, …] in the index's order). By root,
 * the entries sharing a root are added together; words with no root (most particles) are left out.
 */
export function rank(
  entries: LexiconIndexEntry[],
  bySurah: number[][],
  inScope: (surah: number) => boolean,
  unit: Unit,
  kind: Kind,
): Ranked[] {
  const acc = new Map<string, Ranked & { seen: Set<number> }>()
  entries.forEach((e, i) => {
    if (unit === 'lemma' && !(kind === 'NV' ? e.tag !== 'P' : e.tag === kind)) return
    if (unit === 'root' && !e.root) return
    const pairs = bySurah[i] ?? []
    let count = 0
    const seen = new Set<number>()
    for (let j = 0; j < pairs.length; j += 2)
      if (inScope(pairs[j]!)) {
        count += pairs[j + 1]!
        seen.add(pairs[j]!)
      }
    if (!count) return
    const key = unit === 'root' ? e.root! : e.slug
    const r = acc.get(key)
    if (r) {
      r.count += count
      r.entries++
      for (const s of seen) r.seen.add(s)
    } else
      acc.set(key, {
        key,
        label: unit === 'root' ? e.root! : e.lemma,
        root: e.root,
        kind: e.kind,
        entries: 1,
        count,
        surahs: 0,
        seen,
      })
  })
  return [...acc.values()]
    .map(({ seen, ...r }) => ({ ...r, surahs: seen.size }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ar'))
}
