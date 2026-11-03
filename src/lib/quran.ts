/** Basmala as written at the head of al-Fatiha (its first ayah). */
export const BASMALA = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ'

/** Every surah opens with the basmala except al-Tawba; in al-Fatiha it is the first ayah itself. */
export const showsBasmalaHeader = (surah: number) => surah !== 1 && surah !== 9

/** Diacritics, Quranic annotation signs and tatweel. */
// eslint-disable-next-line no-misleading-character-class -- matching combining marks is the intent
const MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u08D3-\u08FF]/g
const LETTER = /[\u0621-\u064A\u0671]/

/** Removes diacritics and annotation signs, leaving the letters as written. */
export const stripMarks = (text: string) => text.replace(MARKS, '')

/** Words of an ayah as written, skipping any standalone sign. */
export const ayahWords = (text: string) =>
  text.split(/\s+/).filter((w) => LETTER.test(stripMarks(w)))

/** Comparison key of a word: letters only, with alef, ya and ta marbuta forms unified. */
export const wordKey = (w: string) =>
  stripMarks(w)
    .replace(/[^ء-يٱ]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')

/** Last letter of an ayah as written. */
export const finalLetter = (text: string) =>
  [...stripMarks(text).replace(/[^ء-يٱ]/g, '')].pop() ?? ''

/** Indices of the words of `a` and `b` that belong to their longest common subsequence. */
export function commonWords(a: string[], b: string[]): [Set<number>, Set<number>] {
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
  let i = a.length
  let j = b.length
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      ia.add(i - 1)
      ib.add(j - 1)
      i--
      j--
    } else if (dp[(i - 1) * W + j]! >= dp[i * W + j - 1]!) i--
    else j--
  }
  return [ia, ib]
}
