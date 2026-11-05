import { describe, expect, it } from 'vitest'
import {
  RECITERS,
  ayahUrl,
  basmalaUrl,
  firstStep,
  nextStep,
  recitesBasmala,
  type Step,
} from '../src/features/recitation/reciters.ts'

/** Every file a recitation plays, in order. */
function sequence(surah: number, from: number, last: number, repeat: number) {
  const out: string[] = []
  for (let s: Step | null = firstStep(surah, from, repeat); s; s = nextStep(s, last, repeat))
    out.push(s.basmala ? 'basmala' : String(s.ayah))
  return out
}

describe('order of recitation', () => {
  it('recites the basmala before a surah, then every ayah once', () => {
    expect(sequence(112, 1, 4, 1)).toEqual(['basmala', '1', '2', '3', '4'])
  })
  it('has no separate basmala in al-Fatiha (it is ayah 1) or before al-Tawba', () => {
    expect(sequence(1, 1, 7, 1)).toEqual(['1', '2', '3', '4', '5', '6', '7'])
    expect(sequence(9, 1, 3, 1)).toEqual(['1', '2', '3'])
    expect(recitesBasmala(1)).toBe(false)
    expect(recitesBasmala(9)).toBe(false)
    expect(recitesBasmala(2)).toBe(true)
  })
  it('starts from a chosen ayah without the basmala', () => {
    expect(sequence(2, 284, 286, 1)).toEqual(['284', '285', '286'])
  })
  it('repeats each ayah, but not the basmala', () => {
    expect(sequence(108, 1, 3, 3)).toEqual(['basmala', '1', '1', '1', '2', '2', '2', '3', '3', '3'])
  })
})

describe('recordings', () => {
  it('names each file by surah and ayah', () => {
    const r = RECITERS[0]!
    expect(ayahUrl(r, 2, 255)).toBe(`https://everyayah.com/data/${r.folder}/002255.mp3`)
    expect(basmalaUrl(r)).toBe(`https://everyayah.com/data/${r.folder}/001001.mp3`)
  })
  it('lists each reciter once, with the folders published by EveryAyah', () => {
    expect(new Set(RECITERS.map((r) => r.id)).size).toBe(RECITERS.length)
    expect(RECITERS.map((r) => r.folder)).toEqual([
      'Alafasy_128kbps',
      'Husary_128kbps',
      'Abdul_Basit_Murattal_192kbps',
      'Minshawy_Murattal_128kbps',
    ])
  })
})
