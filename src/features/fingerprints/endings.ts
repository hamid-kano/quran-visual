/** Colors for the most frequent final letters of ayahs (فواصل). Everything else is muted. */
export const ENDING_COLORS: Record<string, string> = {
  ن: '#e2c46f',
  ا: '#5fb7a1',
  م: '#d98c6a',
  ر: '#8fb3e8',
  ى: '#c99bd6',
  د: '#e0a45e',
  ب: '#a7c46a',
  ة: '#e8a1b0',
  ل: '#6fc3d6',
}
export const OTHER_ENDING = '#7d8aa3'
export const endingColor = (ch: string) => ENDING_COLORS[ch] ?? OTHER_ENDING

/** Letter frequencies in a string of endings, most frequent first. */
export function endingCounts(endings: string) {
  const m = new Map<string, number>()
  for (const ch of endings) m.set(ch, (m.get(ch) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}
