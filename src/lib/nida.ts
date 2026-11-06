import type { Segment } from '../data/schemas'
import { stemOf, lemmaOf } from './lexicon'

/**
 * Vocatives (النداء) as the Quranic Arabic Corpus marks them: the particle يا, written joined to
 * the next word (يَٰقَوۡمِ، يَٰٓأَيُّهَا), and the mim of ٱللَّهُمَّ. A call with no particle
 * («رَبَّنَا») is not marked in the corpus and is not counted.
 *
 * The one called (المنادى) is read grammatically from the corpus's tags:
 *   - after يَٰٓأَيُّهَا / يَٰٓأَيَّتُهَا it is the next word (ٱلنَّاسُ), and when that is
 *     ٱلَّذِينَ, the verb of its clause too (ٱلَّذِينَ ءَامَنُوٓاْ);
 *   - otherwise it is the word يا is joined to (يَٰقَوۡمِ), with the noun it governs in the
 *     genitive when it has one (يَٰبَنِيٓ إِسۡرَٰٓءِيلَ، يَٰٓأَهۡلَ ٱلۡكِتَٰبِ).
 */
export interface Vocative {
  /** Index of the word that carries the particle (as ayahWords counts). */
  word: number
  /** How many words the call spans, from that word. */
  span: number
  /** The lemmas of the one called, which group calls together. */
  key: string
}

const has = (seg: Segment, f: string) => seg[2].split('|').includes(f)
const isVocParticle = (seg: Segment) => has(seg, 'VOC') && has(seg, 'PREF')
const isVocMim = (seg: Segment) => has(seg, 'VOC') && has(seg, 'SUFF')
const nounGenitive = (word: Segment[] | undefined) => {
  const stem = word && stemOf(word)
  return !!stem && stem[1] === 'N' && has(stem, 'GEN')
}
const lemma = (word: Segment[] | undefined) => {
  const stem = word && stemOf(word)
  return stem ? lemmaOf(stem) : null
}

export function vocativesIn(words: Segment[][]): Vocative[] {
  const out: Vocative[] = []
  const push = (v: Vocative) => out.push({ ...v, key: v.key.normalize('NFC') })
  words.forEach((w, i) => {
    if (w.some(isVocMim)) {
      push({ word: i, span: 1, key: lemma(w) ?? 'اللَّهُمَّ' })
      return
    }
    if (!w.some(isVocParticle)) return
    const head = lemma(w)
    if (stemOf(w)?.[1] === 'N' && has(stemOf(w)!, 'ROOT:أيي')) {
      // يَٰٓأَيُّهَا / يَٰٓأَيَّتُهَا: the one called follows
      const nextStem = words[i + 1] && stemOf(words[i + 1]!)
      const next = lemma(words[i + 1])
      if (nextStem && has(nextStem, 'REL'))
        push({ word: i, span: 3, key: [next, lemma(words[i + 2])].join(' ') })
      else push({ word: i, span: 2, key: next ?? '' })
      return
    }
    const stem = stemOf(w)
    const bare =
      !!stem && !w.some((s) => has(s, 'DET')) && !w.some((s) => has(s, 'SUFF') && has(s, 'PRON'))
    if (bare && nounGenitive(words[i + 1]))
      push({ word: i, span: 2, key: [head, lemma(words[i + 1])].join(' ') })
    else push({ word: i, span: 1, key: head ?? '' })
  })
  return out
}
