/**
 * Studies computed from the text itself (KFGQPC Hafs v18), with nothing added:
 *   - fawasil.json: the last letter of every ayah, a string per surah.
 *
 * The rules live in src/lib so the site and the tests use the very same definitions.
 */
import { writeFileSync } from 'node:fs'
import { Fawasil } from '../src/data/schemas.ts'
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
