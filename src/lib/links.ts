/** Address of an ayah's own page. */
export const ayahPath = (surah: number, ayah: number) => `/ayah/${surah}/${ayah}`

/**
 * The ayahs before and after one, in mushaf order across surah boundaries.
 * `counts[i]` is the number of ayahs in surah i + 1.
 */
export function adjacentAyahs(
  counts: number[],
  surah: number,
  ayah: number,
): { prev: [number, number] | null; next: [number, number] | null } {
  const prev: [number, number] | null =
    ayah > 1 ? [surah, ayah - 1] : surah > 1 ? [surah - 1, counts[surah - 2]!] : null
  const next: [number, number] | null =
    ayah < counts[surah - 1]! ? [surah, ayah + 1] : surah < counts.length ? [surah + 1, 1] : null
  return { prev, next }
}
