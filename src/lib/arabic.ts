const DIGITS = '٠١٢٣٤٥٦٧٨٩'

/** 255 → ٢٥٥ */
export const toArabicDigits = (n: number | string) =>
  String(n).replace(/\d/g, (d) => DIGITS[Number(d)]!)

/** رحم → ر ح م */
export const spacedRoot = (root: string) => [...root].join(' ')

/** Removes tashkeel and normalizes alef/ya/ta-marbuta forms for search. */
export function normalizeArabic(text: string) {
  return text
    .normalize('NFKD')
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
}

export const revelationLabel = (r: 'meccan' | 'medinan') => (r === 'meccan' ? 'مكية' : 'مدنية')

export const formatPercent = (x: number) => `${toArabicDigits(Math.round(x * 100))}٪`

const arNumber = new Intl.NumberFormat('ar-EG')
/** 77429 → ٧٧٬٤٢٩ */
export const formatNumber = (n: number) => arNumber.format(n)
