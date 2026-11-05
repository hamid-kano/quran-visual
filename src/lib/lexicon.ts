import type { Segment } from '../data/schemas'

/**
 * The lexicon counts words by their stem's lemma (المدخل) as the Quranic Arabic Corpus gives it.
 * A word's stem is its first segment that is neither a prefix nor a suffix and carries a lemma;
 * prefixes such as و ف ب ال are part of the word, not words of their own.
 */
export function stemOf(word: Segment[]): Segment | null {
  return (
    word.find(
      ([, , raw]) => !raw.includes('PREF') && !raw.includes('SUFF') && raw.includes('LEM:'),
    ) ?? null
  )
}

const feature = (raw: string, name: string) =>
  raw
    .split('|')
    .find((x) => x.startsWith(`${name}:`))
    ?.slice(name.length + 1) ?? null

export const lemmaOf = (stem: Segment) => feature(stem[2], 'LEM')!
export const rootOf = (stem: Segment) => feature(stem[2], 'ROOT')

export const TYPE_WORD = { N: 'اسم', V: 'فعل', P: 'حرف' } as const

/**
 * Lemmas the corpus spells the same for different entries, and what tells them apart in their
 * address: the type of word (ما اسماً وحرفاً) or the root (عاد من عود ومن عدو). The data build
 * checks this list against the corpus and fails if it is out of date.
 */
export const AMBIGUOUS: Record<string, 'type' | 'root'> = {
  عَلَى: 'type',
  ما: 'type',
  إِذا: 'type',
  لَمّا: 'type',
  أَوْفَى: 'type',
  عَصا: 'type',
  نَعَم: 'type',
  أَحْصَى: 'type',
  آن: 'root',
  عاد: 'root',
  قائِل: 'root',
  جَواب: 'root',
  يُغاثُ: 'root',
}

/** The entry's address in the lexicon: its lemma, with what sets it apart where it shares one. */
export function lexSlug(lemma: string, tag: Segment[1], root: string | null) {
  const by = AMBIGUOUS[lemma]
  const slug = by ? `${lemma}-${by === 'type' ? TYPE_WORD[tag] : (root ?? '')}` : lemma
  // one canonical order of the marks, so the address is the same however it was typed or copied
  return slug.normalize('NFC')
}

/** The lexicon address of a word in the text, or null if the corpus gives it no lemma. */
export function wordSlug(word: Segment[]) {
  const stem = stemOf(word)
  return stem ? lexSlug(lemmaOf(stem), stem[1], rootOf(stem)) : null
}

/**
 * Where a root's lemma (as the roots index lists it, without its type) is found in the lexicon:
 * its entry, or a search listing both entries when one spelling is both a noun and a verb.
 */
export function rootLemmaPath(lemma: string, root: string) {
  if (AMBIGUOUS[lemma] === 'type') return `/words?q=${encodeURIComponent(lemma)}`
  return `/words/${encodeURIComponent(lexSlug(lemma, 'N', root))}`
}
