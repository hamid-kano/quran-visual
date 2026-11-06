import { tokens } from './quran'

/**
 * The stop signs of the Madinah mushaf as they occur in the KFGQPC text, each written over the
 * end of the word it follows.
 */
export const WAQF_KINDS = ['lazim', 'jaiz', 'sila', 'qila', 'muanaqa', 'sakt'] as const
export type WaqfKind = (typeof WAQF_KINDS)[number]

export const WAQF_SIGN: Record<WaqfKind, string> = {
  lazim: 'ۘ', // مـ
  jaiz: 'ۚ', // ج
  sila: 'ۖ', // صلى
  qila: 'ۗ', // قلى
  muanaqa: 'ۛ', // ∴
  sakt: 'ۜ', // س
}

/** What each sign tells the reader, in the plain terms of the science of stopping and starting. */
export const WAQF_INFO: Record<WaqfKind, { name: string; sign: string; meaning: string }> = {
  lazim: {
    name: 'الوقف اللازم',
    sign: 'مـ',
    meaning: 'يلزم الوقف عنده، لأن وصله بما بعده قد يوهم معنى غير مراد.',
  },
  jaiz: { name: 'الوقف الجائز', sign: 'ج', meaning: 'يجوز الوقف والوصل، ويستويان.' },
  sila: { name: 'الوصل أولى', sign: 'صلى', meaning: 'يجوز الوقف، والوصل أولى.' },
  qila: { name: 'الوقف أولى', sign: 'قلى', meaning: 'يجوز الوصل، والوقف أولى.' },
  muanaqa: {
    name: 'تعانق الوقف',
    sign: '∴ ∴',
    meaning: 'علامتان متقاربتان، إذا وُقف عند إحداهما لم يُوقف عند الأخرى.',
  },
  sakt: {
    name: 'السكت',
    sign: 'س',
    meaning: 'سكتة يسيرة من غير تنفّس على آخر الكلمة، ثم يُوصل بما بعدها.',
  },
}

const LETTER = /[ء-يٱ]/u

/**
 * The stop signs in an ayah, each with the index of the word it follows (as ayahWords counts).
 * The small seen is the sign of saktah only at the very end of a word; inside a word (يَبۡصُۜطُ)
 * it notes that the letter is read as seen, and is not a stop sign.
 */
export function waqfIn(ayahText: string): { kind: WaqfKind; word: number }[] {
  const out: { kind: WaqfKind; word: number }[] = []
  for (const t of tokens(ayahText)) {
    if (t.word === null) continue
    const chars = [...t.text]
    chars.forEach((c, i) => {
      const kind = WAQF_KINDS.find((k) => WAQF_SIGN[k] === c)
      if (!kind) return
      if (kind === 'sakt' && chars.slice(i + 1).some((x) => LETTER.test(x))) return
      out.push({ kind, word: t.word! })
    })
  }
  return out
}
