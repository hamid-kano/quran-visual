import type { Surah } from '../../data/schemas'

export type ColorMode = 'revelation' | 'order'

export const MECCAN = '#e2c46f'
export const MEDINAN = '#5fb7a1'
const EARLY = '#f4e3a8'
const LATE = '#b45f3a'

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
function mix(a: string, b: string, t: number) {
  const [x, y] = [rgb(a), rgb(b)]
  return `#${x
    .map((v, i) =>
      Math.round(v + (y[i]! - v) * t)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}

/** Color of a surah star under the current mode. */
export function surahColor(s: Surah, mode: ColorMode): string {
  if (mode === 'revelation') return s.revelation === 'meccan' ? MECCAN : MEDINAN
  return mix(EARLY, LATE, (s.order - 1) / 113)
}

export const orderGradient = `linear-gradient(to left, ${EARLY}, ${LATE})`

/** Visual radius of a star: area grows with the number of ayahs. */
export const starRadius = (s: Surah) => 0.3 + Math.sqrt(s.ayahs) * 0.075
