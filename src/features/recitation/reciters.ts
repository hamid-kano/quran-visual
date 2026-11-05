/**
 * Reciters and their recordings on EveryAyah (https://everyayah.com), which publishes one
 * file per ayah. Folder names are taken from EveryAyah's own list of recitations.
 * The audio is streamed from EveryAyah and is not stored in this project.
 */
export interface Reciter {
  id: string
  name: string
  style: string
  folder: string
}

export const RECITERS: Reciter[] = [
  { id: 'alafasy', name: 'مشاري راشد العفاسي', style: 'مرتّل', folder: 'Alafasy_128kbps' },
  { id: 'husary', name: 'محمود خليل الحصري', style: 'مرتّل', folder: 'Husary_128kbps' },
  {
    id: 'abdulbasit',
    name: 'عبد الباسط عبد الصمد',
    style: 'مرتّل',
    folder: 'Abdul_Basit_Murattal_192kbps',
  },
  {
    id: 'minshawi',
    name: 'محمد صدّيق المنشاوي',
    style: 'مرتّل',
    folder: 'Minshawy_Murattal_128kbps',
  },
]

export const AUDIO_BASE = 'https://everyayah.com/data/'

const pad = (n: number) => String(n).padStart(3, '0')

/** EveryAyah names each file by surah and ayah: 002255.mp3 is al-Baqara 255. */
export const ayahUrl = (r: Reciter, surah: number, ayah: number) =>
  `${AUDIO_BASE}${r.folder}/${pad(surah)}${pad(ayah)}.mp3`

/**
 * The basmala before a surah is al-Fatiha's first ayah, recited by the same reciter.
 * It is not recited before al-Tawba, and in al-Fatiha it is the first ayah itself.
 */
export const basmalaUrl = (r: Reciter) => ayahUrl(r, 1, 1)
export const recitesBasmala = (surah: number) => surah !== 1 && surah !== 9

/** One step of a recitation: the basmala, or an ayah with the repeats left after it. */
export interface Step {
  basmala: boolean
  ayah: number
  /** Further times this ayah will be recited after the current one. */
  repeatsLeft: number
}

/** First step when starting at `from`: the basmala only when starting at the surah's start. */
export function firstStep(surah: number, from: number, repeat: number): Step {
  if (from === 1 && recitesBasmala(surah))
    return { basmala: true, ayah: 1, repeatsLeft: repeat - 1 }
  return { basmala: false, ayah: from, repeatsLeft: repeat - 1 }
}

/** The step after `s`, or null at the end of the surah (or of the chosen range). */
export function nextStep(s: Step, last: number, repeat: number): Step | null {
  if (s.basmala) return { basmala: false, ayah: s.ayah, repeatsLeft: s.repeatsLeft }
  if (s.repeatsLeft > 0) return { ...s, repeatsLeft: s.repeatsLeft - 1 }
  if (s.ayah >= last) return null
  return { basmala: false, ayah: s.ayah + 1, repeatsLeft: repeat - 1 }
}
