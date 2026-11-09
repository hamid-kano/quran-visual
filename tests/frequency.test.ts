import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { Frequency, Lexicon, RootIndex, SurahIndex } from '../src/data/schemas.ts'
import { rank } from '../src/lib/frequency.ts'

const read = (f: string) => JSON.parse(readFileSync(`public/data/${f}`, 'utf8'))
const lex = Lexicon.parse(read('lexicon.json'))
const freq = Frequency.parse(read('frequency.json'))
const roots = RootIndex.parse(read('roots.json'))
const surahs = SurahIndex.parse(read('surahs.json')).surahs
const all = () => true
const meccan = (s: number) => surahs[s - 1]!.revelation === 'meccan'
const medinan = (s: number) => !meccan(s)

describe('word frequency', () => {
  it('holds each entry by surah, adding up to the lexicon’s own counts', () => {
    expect(freq.bySurah).toHaveLength(lex.entries.length)
    let total = 0
    lex.entries.forEach((e, i) => {
      const pairs = freq.bySurah[i]!
      const counts = pairs.filter((_, j) => j % 2)
      const ids = pairs.filter((_, j) => !(j % 2))
      expect(
        counts.reduce((a, b) => a + b, 0),
        e.slug,
      ).toBe(e.count)
      expect(ids.length, e.slug).toBe(e.surahs)
      expect(ids.every((s, j) => s >= 1 && s <= 114 && (j === 0 || s > ids[j - 1]!))).toBe(true)
      total += e.count
    })
    expect(total).toBe(lex.counted)
  })

  it('ranks the whole mushaf as the lexicon does', () => {
    const r = rank(lex.entries, freq.bySurah, all, 'lemma', 'NV')
    const nv = lex.entries.filter((e) => e.tag !== 'P')
    expect(r).toHaveLength(nv.length)
    expect(r.map((x) => x.count)).toEqual([...nv.map((e) => e.count)].sort((a, b) => b - a))
    // the first noun or verb of the lexicon's own order (the name of Allah)
    const top = nv[0]!
    expect(r[0]).toMatchObject({ key: top.slug, count: top.count, surahs: top.surahs })
    expect(top.root).toBe('أله')
    expect(r.every((x, i) => i === 0 || x.count <= r[i - 1]!.count)).toBe(true)
  })

  it('splits into Meccan and Medinan without losing a word', () => {
    for (const unit of ['lemma', 'root'] as const) {
      const sum = (f: (s: number) => boolean) =>
        rank(lex.entries, freq.bySurah, f, unit, 'NV').reduce((a, x) => a + x.count, 0)
      expect(sum(meccan) + sum(medinan), unit).toBe(sum(all))
    }
  })

  it('counts by root exactly as the roots network does', () => {
    const r = rank(lex.entries, freq.bySurah, all, 'root', 'NV')
    const net = new Map(roots.roots.map((x) => [x.root, x]))
    expect(r).toHaveLength(roots.roots.length)
    for (const x of r) {
      // one written word holds two rooted nouns: يَبۡنَؤُمَّ (Taha 20:94), يا ابنَ أُمَّ. Counting each
      // written word once, under its first entry, as the lexicon does, counts it in ابن alone;
      // the network counts every root in a word, so أمم has one more there
      if (x.key === 'أمم') {
        expect(x.count).toBe(net.get('أمم')!.count - 1)
        continue
      }
      expect(x.count, x.key).toBe(net.get(x.key)?.count)
      expect(x.surahs, x.key).toBe(net.get(x.key)?.surahs)
      // the network lists a root's eight most frequent entries at most
      expect(x.entries, x.key).toBeGreaterThanOrEqual(net.get(x.key)!.lemmas.length)
    }
  })

  it('has يَبۡنَؤُمَّ as the only word with two roots in it', () => {
    const morph = readFileSync('sources/quran-morphology.txt', 'utf8').trim().split('\n')
    const rooted = new Map<string, number>()
    for (const line of morph) {
      const [loc, , , feats] = line.split('\t')
      if (!/(^|\|)ROOT:/.test(feats!) || /PREF|SUFF/.test(feats!)) continue
      const word = loc!.split(':').slice(0, 3).join(':')
      rooted.set(word, (rooted.get(word) ?? 0) + 1)
    }
    expect([...rooted].filter(([, n]) => n > 1)).toEqual([['20:94:2', 2]])
  })

  it('counts one surah alone', () => {
    // al-Fatiha: 29 words, 4 of them names or verbs of رحم (الرحمن twice, الرحيم twice)
    const r = rank(lex.entries, freq.bySurah, (s) => s === 1, 'root', 'NV')
    expect(r.find((x) => x.key === 'رحم')).toMatchObject({ count: 4, surahs: 1 })
  })
})
