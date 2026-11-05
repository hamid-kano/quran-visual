/** Basmala as written at the head of al-Fatiha (its first ayah). */
export const BASMALA = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ'

/** Every surah opens with the basmala except al-Tawba; in al-Fatiha it is the first ayah itself. */
export const showsBasmalaHeader = (surah: number) => surah !== 1 && surah !== 9

/** Diacritics, Quranic annotation signs and tatweel. */
// eslint-disable-next-line no-misleading-character-class -- matching combining marks is the intent
const MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u08D3-\u08FF]/g
const LETTER = /[\u0621-\u064A\u0671]/

/** Removes diacritics and annotation signs, leaving the letters as written. */
export const stripMarks = (text: string) => text.replace(MARKS, '')

/**
 * Words of an ayah as written, skipping any standalone sign (۞, ۩ …).
 * Only ordinary and no-break spaces separate words in the KFGQPC text.
 */
export const ayahWords = (text: string) => text.split(/[ \u00a0]+/).filter(isWord)

/** Whether a space-separated token of the text is a word (not a standalone sign such as ۞). */
export const isWord = (token: string) => LETTER.test(stripMarks(token))

/**
 * Comparison key of a word: its letters as pronounced, with spelling variants unified.
 * The dagger alif (ٰ) is a letter that is read, so it counts as alif — except over alif
 * maqsura (ىٰ), where it only marks how ى is read. This keeps مَٰلِك and مَلِك apart.
 */
export const wordKey = (w: string) =>
  w
    .replace(/ىٰ/g, 'ى')
    .replace(/\u0670/g, 'ا')
    .replace(MARKS, '')
    .replace(/[^ء-يٱ]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')

/**
 * Looser key used only to line the text up with the morphology corpus, whose spelling of
 * hamza and long vowels differs (ءَا for أٓ, صَىٰحِب for صَٰحِب …): consonants only.
 * Never used to compare ayahs with each other.
 */
export const alignKey = (w: string) => wordKey(w).replace(/[ءؤئاوي]/g, '')

/**
 * Full vowelled form of a word for detecting differences in vowels alone, with marks that
 * depend only on the neighbouring word removed: pause signs, the small meem of iqlab,
 * open-tanween shapes (they mark idgham/ikhfa with what follows) and a shadda on the first
 * letter (idgham with what precedes).
 */
export function vocalKey(w: string) {
  const v = w
    // eslint-disable-next-line no-misleading-character-class -- removing combining marks is the intent
    .replace(/[\u0640\u06D6-\u06DC\u06DE\u06E2\u06E9\u06ED]/g, '')
    .replace(/\u0657/g, '\u064B')
    .replace(/\u065E/g, '\u064C')
    .replace(/\u0656/g, '\u064D')
    .replace(/\u06E1/g, '\u0652')
    .normalize('NFC')
  // An Arabic word cannot begin with a doubled consonant: a shadda there comes from the
  // previous word (idgham), so it is dropped.
  return v.replace(/^(.[\u064B-\u065F\u0670]*)/, (head) => head.replace(/\u0651/g, ''))
}

/**
 * Lines up the words of an ayah with the corpus words. The two sometimes split differently:
 * the mushaf writes بَعۡدَ مَا and إِلۡ يَاسِينَ as two words, the corpus as one; مَالِيَ and لَّوۡمَا
 * as one word, the corpus as two. Returns, for every text word, the corpus segments it covers,
 * or null if the ayah cannot be lined up with certainty.
 */
export function alignWords<S extends [string, ...unknown[]]>(
  textWords: string[],
  corpusWords: S[][],
): S[][] | null {
  const key = (segs: S[]) => alignKey(segs.map((s) => s[0]).join(''))
  const out: S[][] = []
  let j = 0
  for (let i = 0; i < textWords.length; i++) {
    const t = alignKey(textWords[i]!)
    const c = corpusWords[j]
    if (!c) return null
    if (key(c) === t) {
      out.push(c)
      j++
      continue
    }
    const next = corpusWords[j + 1]
    if (next && key([...c, ...next]) === t) {
      out.push([...c, ...next])
      j += 2
      continue
    }
    const t2 = textWords[i + 1]
    if (t2 !== undefined && key(c) === t + alignKey(t2)) {
      // one corpus word spans two text words: split at a segment boundary when possible
      const cut = c.findIndex((_, k) => key(c.slice(0, k + 1)) === t)
      if (cut >= 0 && cut < c.length - 1) out.push(c.slice(0, cut + 1), c.slice(cut + 1))
      else out.push(c, c)
      i++
      j++
      continue
    }
    return null
  }
  return j === corpusWords.length ? out : null
}

/** Last letter of an ayah as written. */
export const finalLetter = (text: string) =>
  [...stripMarks(text).replace(/[^ء-يٱ]/g, '')].pop() ?? ''

/**
 * Indices of the words of `a` and `b` that belong to their longest common subsequence,
 * and the matched pairs themselves.
 */
export function commonWords(
  a: string[],
  b: string[],
): [Set<number>, Set<number>, [number, number][]] {
  const W = b.length + 1
  const dp = new Uint16Array((a.length + 1) * W)
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i * W + j] =
        a[i - 1] === b[j - 1]
          ? dp[(i - 1) * W + j - 1]! + 1
          : Math.max(dp[(i - 1) * W + j]!, dp[i * W + j - 1]!)
  const ia = new Set<number>()
  const ib = new Set<number>()
  const pairs: [number, number][] = []
  let i = a.length
  let j = b.length
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      ia.add(i - 1)
      ib.add(j - 1)
      pairs.unshift([i - 1, j - 1])
      i--
      j--
    } else if (dp[(i - 1) * W + j]! >= dp[i * W + j - 1]!) i--
    else j--
  }
  return [ia, ib, pairs]
}
