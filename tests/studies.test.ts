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

describe('stop signs', async () => {
  const { Waqf } = await import('../src/data/schemas.ts')
  const { waqfIn, WAQF_KINDS, WAQF_SIGN } = await import('../src/lib/waqf.ts')
  const { ayahWords } = await import('../src/lib/quran.ts')
  const w = Waqf.parse(read('waqf.json'))

  it('account for every sign in the text: each counted once, the in-word seen left out', () => {
    for (const k of WAQF_KINDS) {
      const inText = texts.reduce(
        (n, t) => n + t.ayahs.reduce((m, a) => m + a.text.split(WAQF_SIGN[k]).length - 1, 0),
        0,
      )
      // three small seens sit inside a word (يَبۡصُۜطُ، بَصۜۡطَةٗ، ٱلۡمُصَۜيۡطِرُونَ) and are no stop
      expect(w[k].length, k).toBe(k === 'sakt' ? inText - 3 : inText)
    }
  })

  it('attach each sign to the word it is written on', () => {
    for (const k of WAQF_KINDS)
      for (const [s, a, i] of w[k]) expect(ayahWords(ayah(s, a))[i]).toContain(WAQF_SIGN[k])
  })

  it('find the known places', () => {
    // «إِنَّمَا يَسۡتَجِيبُ ٱلَّذِينَ يَسۡمَعُونَۘ وَٱلۡمَوۡتَىٰ…» (al-An‘am 36)
    expect(w.lazim).toContainEqual([6, 36, 3])
    // «لَا رَيۡبَۛ فِيهِۛ» (al-Baqarah 2)
    expect(w.muanaqa.filter(([s, a]) => s === 2 && a === 2).map(([, , i]) => i)).toEqual([3, 4])
    // the saktahs: عِوَجَاۜ، مَّرۡقَدِنَاۜۗ، مَالِيَهۡۜ، مَنۡۜ رَاقٖ، بَلۡۜ رَانَ
    expect(w.sakt.map(([s, a]) => `${s}:${a}`)).toEqual([
      '18:1',
      '36:52',
      '69:28',
      '75:27',
      '83:14',
    ])
    expect(waqfIn(ayah(2, 245)).some((m) => m.kind === 'sakt')).toBe(false)
  })
})

describe('vocatives', async () => {
  const { Nida, SurahMorphology } = await import('../src/data/schemas.ts')
  const { ayahWords } = await import('../src/lib/quran.ts')
  const n = Nida.parse(read('nida.json'))
  const count = (label: string) =>
    n.groups.find((g) => g.label.normalize('NFC') === label.normalize('NFC'))?.places.length

  it('count every vocative the corpus marks, once', () => {
    let marked = 0
    for (const s of surahs) {
      const m = SurahMorphology.parse(read(`morph/${s.id}.json`))
      for (const a of m.ayahs)
        for (const w of a!) if (w.some(([, , f]) => f.split('|').includes('VOC'))) marked++
    }
    expect(n.groups.reduce((t, g) => t + g.places.length, 0)).toBe(marked)
    expect(marked).toBe(366)
  })

  it('agree with the well-known counts', () => {
    expect(count('يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُواْ')).toBe(89)
    expect(count('يَٰٓأَيُّهَا ٱلنَّاسُ')).toBe(20)
    expect(count('يَٰبَنِيٓ إِسۡرَٰٓءِيلَ')).toBe(6)
    expect(count('ٱللَّهُمَّ')).toBe(5)
  })

  it('point at the words of the call as written, the first carrying the vocative', () => {
    const morph = surahs.map((x) => SurahMorphology.parse(read(`morph/${x.id}.json`)))
    for (const g of n.groups)
      for (const [s, a, w, span] of g.places) {
        expect(ayahWords(ayah(s, a)).slice(w, w + span)).toHaveLength(span)
        const word = morph[s - 1]!.ayahs[a - 1]![w]!
        expect(word.some(([, , f]) => f.split('|').includes('VOC'))).toBe(true)
      }
  })
})

describe('the prophets named', async () => {
  const { Prophets } = await import('../src/data/schemas.ts')
  const { ayahWords } = await import('../src/lib/quran.ts')
  const p = Prophets.parse(read('prophets.json'))
  const count = Object.fromEntries(p.prophets.map((x) => [x.name, x.places.length]))

  it('are counted as commonly known', () => {
    expect(count).toEqual({
      آدم: 25,
      إدريس: 2,
      نوح: 43,
      هود: 7,
      صالح: 9,
      إبراهيم: 69,
      لوط: 27,
      إسماعيل: 12,
      إسحاق: 17,
      يعقوب: 16,
      يوسف: 27,
      أيوب: 4,
      شعيب: 11,
      موسى: 136,
      هارون: 20,
      'ذو الكفل': 2,
      داود: 16,
      سليمان: 17,
      إلياس: 3,
      اليسع: 2,
      يونس: 4,
      زكريا: 7,
      يحيى: 5,
      عيسى: 25,
      'محمد ﷺ': 5,
    })
  })

  it('point at the very word of each mention', () => {
    for (const x of p.prophets)
      for (const [s, a, w] of x.places) expect(ayahWords(ayah(s, a))[w]).toBeDefined()
    const zul = p.prophets.find((x) => x.name === 'ذو الكفل')!
    expect(zul.places.map(([s, a]) => `${s}:${a}`)).toEqual(['21:85', '38:48'])
    expect(p.prophets.find((x) => x.name === 'هود')!.places.some(([s]) => s === 2)).toBe(false)
  })
})
