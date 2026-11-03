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

/** Removes tashkeel only, keeping letters exactly as written (موسى stays موسى). */
export const stripTashkeel = (text: string) => text.replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')

interface Forms {
  one: string
  two: string
  few: string
  many: string
}
export const AYAH: Forms = { one: 'آية واحدة', two: 'آيتان', few: 'آيات', many: 'آية' }
export const WORD: Forms = { one: 'كلمة واحدة', two: 'كلمتان', few: 'كلمات', many: 'كلمة' }
export const TIME: Forms = { one: 'مرة واحدة', two: 'مرتان', few: 'مرات', many: 'مرة' }
export const SURAH: Forms = { one: 'سورة واحدة', two: 'سورتان', few: 'سور', many: 'سورة' }

/** Counted noun with Arabic number agreement: ١ آية واحدة، آيتان، ٣ آيات، ١١ آية. */
export function countOf(n: number, f: Forms) {
  if (n === 1) return f.one
  if (n === 2) return f.two
  const mod = n % 100
  return `${formatNumber(n)} ${mod >= 3 && mod <= 10 ? f.few : f.many}`
}
