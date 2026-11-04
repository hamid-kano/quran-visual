/**
 * Search index: for every ayah, the search keys of each of its words (see src/lib/search.ts).
 * Words are separated by spaces and a word's alternative keys by "|", in mushaf word order,
 * so the interface can highlight the exact words that matched.
 */
import { writeFileSync } from 'node:fs'
import { SearchIndex } from '../src/data/schemas.ts'
import { ayahWords } from '../src/lib/quran.ts'
import { searchKeys } from '../src/lib/search.ts'
import { quran } from './quran-text.ts'

const surahs = quran.map((q) =>
  q.verses.map((v) =>
    ayahWords(v.text)
      .map((w) => searchKeys(w).join('|'))
      .join(' '),
  ),
)
writeFileSync('public/data/search.json', JSON.stringify(SearchIndex.parse({ version: 1, surahs })))
console.log(`search: ${surahs.flat().length} ayahs indexed`)
