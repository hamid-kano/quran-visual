import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { Fawasil, SurahIndex, SurahText } from '../src/data/schemas.ts'
import { finalLetter, letterCounts } from '../src/lib/fawasil.ts'

const read = (f: string) => JSON.parse(readFileSync(`public/data/${f}`, 'utf8'))
const surahs = SurahIndex.parse(read('surahs.json')).surahs
const texts = surahs.map((s) => SurahText.parse(read(`surah/${s.id}.json`)))
const ayah = (s: number, a: number) => texts[s - 1]!.ayahs[a - 1]!.text

describe('fawasil', () => {
  const f = Fawasil.parse(read('fawasil.json'))

  it('give one letter per ayah, every one an Arabic letter', () => {
    for (const s of surahs) expect([...f.letters[s.id - 1]!]).toHaveLength(s.ayahs)
    expect(f.letters.join('')).toMatch(/^[ء-ي]+$/u)
  })

  it('read the last written letter, marks aside', () => {
    expect(finalLetter(ayah(1, 1))).toBe('م') // ٱلرَّحِيمِ
    expect(finalLetter(ayah(1, 2))).toBe('ن') // ٱلۡعَٰلَمِينَ
    expect(finalLetter(ayah(4, 1))).toBe('ا') // رَقِيبٗا: the written alif of tanween al-fath
    expect(finalLetter(ayah(18, 13))).toBe('ى') // هُدٗى
    expect(finalLetter(ayah(20, 1))).toBe('ه') // طه
    expect(finalLetter(ayah(53, 57))).toBe('ة') // ٱلۡأٓزِفَةُ
    expect(finalLetter(ayah(110, 1))).toBe('ح') // وَٱلۡفَتۡحُ
  })

  it('show the rhyme of surahs known for it', () => {
    // every ayah of al-Qamar after the first ends in ر (…مُّسۡتَمِرّٞ، مُّسۡتَقِرّٞ …)
    const qamar = f.letters[53]!
    expect(letterCounts(qamar)[0]![0]).toBe('ر')
    expect(qamar.split('').filter((l) => l === 'ر').length).toBe(qamar.length)
    // al-Ikhlas: all four in د
    expect(f.letters[111]).toBe('دددد')
    // nun ends about half the ayahs of the Quran
    const all = f.letters.join('')
    expect(letterCounts(all)[0]).toEqual(['ن', 3124])
  })
})
