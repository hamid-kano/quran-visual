import { ayahWords, stripMarks } from './quran'

/**
 * The fasila of an ayah, as this site measures it: the last letter of its last word as written
 * in the mushaf, marks aside (so «رَقِيبٗا» ends in ا and «ٱلۡهُدَىٰ» in ى).
 */
export function finalLetter(ayahText: string): string {
  const last = ayahWords(ayahText).at(-1)
  const letter = last ? [...stripMarks(last)].at(-1) : undefined
  if (!letter) throw new Error(`no final letter in «${ayahText}»`)
  return letter
}

/** The letters given a colour of their own (the eight most frequent), in their fixed order. */
export const FASILA_LETTERS = ['ن', 'ا', 'م', 'ر', 'ى', 'د', 'ب', 'ة'] as const
/** Validated for colour-blind separation on the vellum page (dataviz palette check). */
export const FASILA_COLORS = [
  '#2a78d6',
  '#eb6834',
  '#1baf7a',
  '#eda100',
  '#e87ba4',
  '#008300',
  '#6250d6',
  '#e34948',
] as const
export const OTHER_COLOR = '#b3a88f'

export const fasilaColor = (letter: string) => {
  const i = (FASILA_LETTERS as readonly string[]).indexOf(letter)
  return i < 0 ? OTHER_COLOR : FASILA_COLORS[i]!
}

/** Each letter with how many ayahs end in it, most first. */
export function letterCounts(letters: string): [string, number][] {
  const m = new Map<string, number>()
  for (const l of letters) m.set(l, (m.get(l) ?? 0) + 1)
  return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ar'))
}
