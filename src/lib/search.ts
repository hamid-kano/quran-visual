/**
 * Search keys: bridge the Uthmani spelling of the mushaf and the ordinary spelling people type.
 *
 * Each written word yields a small set of keys. A query matches a word when one of the
 * query's keys is found in one of the word's keys. Every rule below only *adds* a way of
 * writing the same word, so a correct spelling is never lost; the cost is at most a rare extra
 * match in partial-word mode.
 *
 * Rules (U+ code points in brackets):
 *  - Alif forms إ أ آ ٱ → ا ; ى → ي ; ة → ه.
 *  - Hamza and its seats are dropped (ء ؤ ئ, and the combining hamza [0654]) — both in the text and
 *    in the query, because the mushaf often seats hamza differently (شُرَكَٰٓؤُاْ / شركاء,
 *    بَرِيٓـُٔونَ / بريئون). A seated ؤ or ئ may also be typed as و or ي, and a combining hamza
 *    may stand where ordinary spelling writes أ (يَسۡـَٔلُونَكَ / يسألونك).
 *  - Dagger alif [0670] is read as alif, and ordinary spelling writes it in some words (السماوات)
 *    and not in others (هذا، الرحمن، إله): both forms are kept. Over alif maqsura (ىٰ) it is
 *    only a reading mark.
 *  - Waw carrying a dagger alif reads as alif: ٱلصَّلَوٰةَ → الصلاة, ٱلرِّبَوٰاْ → الربا.
 *  - Small high yeh [06E7] is a written yeh (إِبۡرَٰهِـۧمَ). Small waw/yeh [06E5, 06E6] are
 *    usually not written (لَهُۥ، دَاوُۥدَ) but sometimes are (إِۦلَٰفِهِمۡ → إيلافهم): both kept.
 *  - The alif after tanween fath (نُوحًا) is not part of the word: a key without it is added.
 *  - ٱلَّيۡلِ and similar: the definite article's lam is merged into a doubled lam;
 *    ordinary spelling writes both (الليل).
 */

const MARKS =
  // eslint-disable-next-line no-misleading-character-class -- removing combining marks is the intent
  /[\u0610-\u061A\u064B-\u0653\u0655-\u065F\u06D6-\u06E4\u06E7-\u06ED\u0640\u08D3-\u08FF]/g
const MAX_KEYS = 16

/** Expands one written word into its search keys (first key is the canonical one). */
export function searchKeys(word: string): string[] {
  let forms = [
    word
      .normalize('NFC')
      .replace(/\u0640/g, '')
      // the small high yeh is a written letter
      .replace(/\u06E7/g, 'ي')
      // waw carrying a dagger alif reads as alif
      .replace(/و\u0670/g, 'ا')
      // dagger alif over alif maqsura is only a reading mark
      .replace(/ى\u0670/g, 'ى'),
  ]
  // the alif written after tanween fath is not part of the word: نُوحًا ← نوح
  if (
    /[\u064B\u0657][\u0610-\u061A\u06D6-\u06ED]*ا[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]*$/.test(
      forms[0]!,
    )
  )
    forms.push(forms[0]!.replace(/ا([\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]*)$/, '$1'))
  // ٱلّ… : the article's lam merged into a doubled lam
  // (marks are in canonical order after NFC, so a vowel may precede the shadda)
  if (/^ٱل[\u064B-\u0650]*\u0651/.test(forms[0]!)) forms.push(forms[0]!.replace(/^ٱل/, 'ٱلل'))

  const branch = (ch: string, options: string[]) => {
    const out: string[] = []
    for (const f of forms) {
      let acc = ['']
      for (const c of f) {
        const opts = c === ch ? options : [c]
        const next: string[] = []
        for (const a of acc) for (const o of opts) next.push(a + o)
        acc = next.slice(0, MAX_KEYS)
      }
      out.push(...acc)
    }
    forms = [...new Set(out)].slice(0, MAX_KEYS)
  }
  branch('\u0670', ['ا', ''])
  // a combining hamza on a tatweel stands where ordinary spelling writes أ (يَسۡـَٔلُونَكَ / يسألونك)
  branch('\u0654', ['', 'ا'])
  branch('\u06E5', ['', 'و'])
  branch('\u06E6', ['', 'ي'])
  branch('ؤ', ['', 'و'])
  branch('ئ', ['', 'ي'])
  return [...new Set(forms.map(finish))].filter(Boolean)
}

/** Letters only, with the unifications shared by text and query. */
function finish(s: string) {
  return s
    .replace(MARKS, '')
    .replace(/[\u0654ء]/g, '')
    .replace(/[^ء-يٱ]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ا{2,}/g, 'ا')
}

/** Keys of a typed query word. Typed text goes through the same rules as the mushaf. */
export function queryKeys(word: string): string[] {
  // typed ؤ/ئ: drop the hamza seat the same way as in the text
  return [...new Set(searchKeys(word.replace(/[ؤئ]/g, 'ء')))]
}

/**
 * Prefixes that attach to a word in writing: conjunctions, prepositions and the article.
 * Prefixes that are also common first letters of words (the interrogative أ, the future س)
 * are left out on purpose: they would make لله match الله and جد match سجد.
 */
const PREFIXES = [
  '',
  'و',
  'ف',
  'ب',
  'ل',
  'ك',
  'ال',
  'وال',
  'فال',
  'بال',
  'كال',
  'لل',
  'ولل',
  'فلل',
  'وب',
  'فب',
  'ول',
  'فل',
  'وك',
  'فك',
  // the vocative is joined to the word in the mushaf: يَٰمُوسَىٰ، يَٰٓأَيُّهَا، وَيَٰٓـَٔادَمُ
  'يا',
  'ويا',
]

/**
 * The interrogative أ before another prefix (أَبِٱللَّهِ، أَفَلَا). Only tried for queries of four
 * letters or more, where it cannot turn a short query into an unrelated word.
 */
const INTERROGATIVE = ['اب', 'اف', 'او', 'افب', 'اول']

/**
 * Forms a query word takes when attached to what precedes it:
 *  - the article merges with a preceding lam: لِلنَّاسِ (الناس), and when the word itself begins
 *    with a lam one lam is written: لِلَّهِ (الله), لِلَّيۡلِ (الليل);
 *  - the oath ت attaches only to the divine name: تَٱللَّهِ.
 */
function attachedForms(q: string): string[] {
  const forms: string[] = []
  if (q.startsWith('ال')) {
    const merged = (q.startsWith('الل') ? q.slice(2) : q.slice(1)).replace(/^ل/, '')
    forms.push(...['ل', 'ول', 'فل'].map((p) => p + 'ل' + merged))
  }
  if (q === 'الله') forms.push('تالله', 'وتالله')
  return forms
}

export type SearchMode = 'word' | 'part'

const join = (prefix: string, word: string) => (prefix + word).replace(/ا{2,}/g, 'ا')

/** Whether a word (given by its keys) matches one query word (given by its keys). */
export function wordMatches(keys: string[], query: string[], mode: SearchMode) {
  for (const q of query) {
    // attached forms already carry their prefix, so they are compared as they are
    const attached = attachedForms(q)
    for (const k of keys) {
      if (mode === 'part') {
        if (k.includes(q) || attached.some((f) => k.includes(f))) return true
      } else if (
        PREFIXES.some((p) => k === join(p, q)) ||
        (q.length >= 4 && INTERROGATIVE.some((p) => k === join(p, q))) ||
        attached.includes(k)
      )
        return true
    }
  }
  return false
}

export interface ParsedQuery {
  /** Keys of each query word. */
  keys: string[][]
  /** Keys of each pair of adjacent query words written as one (for words the mushaf joins). */
  pairs: string[][]
}

/**
 * Finds a query in an ayah and returns the indices of the matched words, or null.
 * A query of several words matches consecutive words; two adjacent query words may match a
 * single word of the mushaf that joins them (يا أيها / يَٰٓأَيُّهَا).
 */
export function matchAyah(ayah: string[][], query: ParsedQuery, mode: SearchMode): number[] | null {
  const { keys, pairs } = query
  if (!keys.length) return null
  const hits = new Set<number>()
  // returns the text indices used when the query from position k matches from text position i
  const from = (i: number, k: number): number[] | null => {
    if (k === keys.length) return []
    if (i >= ayah.length) return null
    if (wordMatches(ayah[i]!, keys[k]!, mode)) {
      const rest = from(i + 1, k + 1)
      if (rest) return [i, ...rest]
    }
    if (k + 1 < keys.length && wordMatches(ayah[i]!, pairs[k]!, mode)) {
      const rest = from(i + 1, k + 2)
      if (rest) return [i, ...rest]
    }
    return null
  }
  for (let i = 0; i < ayah.length; i++) from(i, 0)?.forEach((x) => hits.add(x))
  return hits.size ? [...hits].sort((a, b) => a - b) : null
}

/** Splits a typed query into words and computes their keys. */
export function parseQuery(q: string): ParsedQuery {
  const words = q
    // eslint-disable-next-line no-misleading-character-class -- keeping Arabic letters and marks is the intent
    .replace(/[^\u0600-\u06FF\u08D3-\u08FF\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => queryKeys(w).some(Boolean))
  return {
    keys: words.map(queryKeys),
    pairs: words.slice(1).map((w, i) => queryKeys(words[i]! + w)),
  }
}
