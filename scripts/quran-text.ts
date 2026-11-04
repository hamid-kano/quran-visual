/**
 * The Quranic text and surah metadata used by every generator.
 *
 *   - Text: King Fahd Glorious Quran Printing Complex, Hafs Unicode text v18
 *     (sources/kfgqpc-hafs-v18.json), used exactly as published. The only change is
 *     removing the ayah number the file appends to each ayah, which the interface draws itself.
 *   - Surah names: the same file, with diacritics removed for display in the interface.
 *   - Transliteration: npm `quran-json`. Revelation place: Tanzil, via npm `quran-meta`,
 *     cross-checked against `quran-json`.
 */
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { getSurahInfo, type Surah as MetaSurah } from 'quran-meta/hafs'

const require = createRequire(import.meta.url)

interface KfgqpcAyah {
  sora: number
  aya_no: number
  jozz: number
  page: number
  sora_name_ar: string
  aya_text: string
}

export interface QuranSurah {
  id: number
  name: string
  transliteration: string
  type: 'meccan' | 'medinan'
  verses: { id: number; text: string; juz: number; page: number }[]
}

const kfgqpc: KfgqpcAyah[] = JSON.parse(readFileSync('sources/kfgqpc-hafs-v18.json', 'utf8'))
const meta: {
  id: number
  transliteration: string
  type: 'meccan' | 'medinan'
}[] = require('quran-json/dist/chapters/index.json')

/** The file ends every ayah with a no-break space and the ayah number in Arabic digits. */
const AYAH_NUMBER = /\u00a0[٠-٩]+$/

/** Surah name for display: the KFGQPC name without diacritics. */
function displayName(id: number, name: string) {
  const plain = name.replace(/[ً-ٰٓ]/g, '')
  // The source spells al-Shura with a dotted ya; the mushaf heading writes it with alif maqsura.
  return id === 42 ? 'الشورى' : plain
}

export const quran: QuranSurah[] = Array.from({ length: 114 }, (_, k) => {
  const id = k + 1
  const rows = kfgqpc.filter((r) => r.sora === id).sort((a, b) => a.aya_no - b.aya_no)
  const m = meta[k]!
  if (m.id !== id) throw new Error(`metadata out of order at ${id}`)
  const isMeccan = getSurahInfo(id as MetaSurah)[5] as boolean
  if (isMeccan !== (m.type === 'meccan')) throw new Error(`revelation place disagrees for ${id}`)
  return {
    id,
    name: displayName(id, rows[0]!.sora_name_ar),
    transliteration: m.transliteration,
    type: m.type,
    verses: rows.map((r, i) => {
      if (r.aya_no !== i + 1) throw new Error(`missing ayah ${id}:${i + 1}`)
      if (!AYAH_NUMBER.test(r.aya_text)) throw new Error(`unexpected ending in ${id}:${r.aya_no}`)
      return { id: r.aya_no, text: r.aya_text.replace(AYAH_NUMBER, ''), juz: r.jozz, page: r.page }
    }),
  }
})
