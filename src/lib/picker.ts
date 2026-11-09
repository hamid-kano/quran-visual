import { toArabicDigits } from './arabic'

/** One choice in a Picker (src/components/Picker.tsx). */
export interface PickerOption {
  value: string
  label: string
  /** The heading of the group it belongs to; options of one group are listed together. */
  group?: string
  /** Shown before the label, quieter (a surah's number). */
  lead?: string
  /** More text to find it by (a surah's number in both digit forms). */
  keywords?: string
}

/** The surahs as picker options, with their numbers to search by in both digit forms. */
export const surahOption = (s: { id: number; name: string }, group: string): PickerOption => ({
  value: String(s.id),
  label: s.name,
  lead: toArabicDigits(s.id),
  group,
  keywords: `${s.id} سورة`,
})
