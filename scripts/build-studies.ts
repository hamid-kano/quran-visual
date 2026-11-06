/**
 * Studies computed from the text itself (KFGQPC Hafs v18), with nothing added:
 *   - fawasil.json: the last letter of every ayah, a string per surah.
 *   - waqf.json: every stop sign of the mushaf, with the word it follows.
 *   - nida.json: every vocative the corpus marks, grouped by the one called.
 *
 * The rules live in src/lib so the site and the tests use the very same definitions.
 */
import { writeFileSync } from 'node:fs'
import { readFileSync } from 'node:fs'
import { Fawasil, Nida, SurahMorphology, Waqf } from '../src/data/schemas.ts'
import { vocativesIn } from '../src/lib/nida.ts'
import { ayahWords } from '../src/lib/quran.ts'
import { WAQF_KINDS, waqfIn, type WaqfKind } from '../src/lib/waqf.ts'
import { FASILA_LETTERS, finalLetter, letterCounts } from '../src/lib/fawasil.ts'
import { quran } from './quran-text.ts'

const write = (file: string, data: unknown) =>
  writeFileSync(`public/data/${file}`, JSON.stringify(data))

// ---------- fawasil ----------
const letters = quran.map((s) => s.verses.map((v) => finalLetter(v.text)).join(''))
const top = letterCounts(letters.join(''))
  .slice(0, FASILA_LETTERS.length)
  .map(([l]) => l)
if (top.join('') !== FASILA_LETTERS.join(''))
  throw new Error(
    `fawasil: the most frequent letters are now ${top.join(' ')}; update FASILA_LETTERS`,
  )
write('fawasil.json', Fawasil.parse({ letters }))
console.log(`fawasil: ${letters.join('').length} ayahs`)

// ---------- waqf ----------
const waqf = Object.fromEntries(
  WAQF_KINDS.map((k) => [k, [] as [number, number, number][]]),
) as Record<WaqfKind, [number, number, number][]>
for (const s of quran)
  for (const v of s.verses) for (const m of waqfIn(v.text)) waqf[m.kind].push([s.id, v.id, m.word])
// the signs of tied stops come in pairs within one ayah
const perAyah = new Map<string, number>()
for (const [s, a] of waqf.muanaqa) perAyah.set(`${s}:${a}`, (perAyah.get(`${s}:${a}`) ?? 0) + 1)
if ([...perAyah.values()].some((n) => n !== 2))
  throw new Error('waqf: a tied stop without its pair')
write('waqf.json', Waqf.parse(waqf))
console.log(`waqf: ${WAQF_KINDS.map((k) => `${k} ${waqf[k].length}`).join(', ')}`)

// ---------- nida ----------
/** Pause signs belong to the reading, not to the words of the call. */
const unpaused = (w: string) => w.replace(/[\u06D6-\u06DC]/g, '')
const calls = new Map<
  string,
  { labels: Map<string, number>; places: [number, number, number, number][] }
>()
for (const s of quran) {
  const morph = SurahMorphology.parse(
    JSON.parse(readFileSync(`public/data/morph/${s.id}.json`, 'utf8')),
  )
  s.verses.forEach((v, i) => {
    const words = ayahWords(v.text)
    for (const c of vocativesIn(morph.ayahs[i]!)) {
      const label = words
        .slice(c.word, c.word + c.span)
        .map(unpaused)
        .join(' ')
      const g = calls.get(c.key) ?? {
        labels: new Map<string, number>(),
        places: [] as [number, number, number, number][],
      }
      g.labels.set(label, (g.labels.get(label) ?? 0) + 1)
      g.places.push([s.id, v.id, c.word, c.span])
      calls.set(c.key, g)
    }
  })
}
const groups = [...calls]
  .map(([key, g]) => ({
    key,
    // shown as the call is most often written, without a joined و or ف before it
    label: [...g.labels].sort(
      (a, b) => Number(/^[وف]/.test(a[0])) - Number(/^[وف]/.test(b[0])) || b[1] - a[1],
    )[0]![0],
    places: g.places,
  }))
  .sort((a, b) => b.places.length - a.places.length || a.places[0]![0] - b.places[0]![0])
write('nida.json', Nida.parse({ groups }))
console.log(
  `nida: ${groups.reduce((n, g) => n + g.places.length, 0)} calls in ${groups.length} groups`,
)
