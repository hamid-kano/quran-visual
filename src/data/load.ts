import type { z } from 'zod'
import {
  Fingerprints,
  Lexicon,
  LexiconEntry,
  NameIndex,
  SimilarIndex,
  SurahMorphology,
  type Fingerprint,
  type NameIndex as NameIndexT,
  type SimilarIndex as SimilarIndexT,
  type SurahMorphology as SurahMorphologyT,
  AyahList,
  RootIndex,
  SearchIndex,
  TopicIndex,
  type TopicIndex as TopicIndexT,
  SurahIndex,
  SurahText,
  type RootIndex as RootIndexT,
  type SurahIndex as SurahIndexT,
  type SurahText as SurahTextT,
} from './schemas'

const base = `${import.meta.env.BASE_URL}data/`
const cache = new Map<string, Promise<unknown>>()

/** Fetches a data file once, validates it against its schema, and memoizes the promise. */
function load<S extends z.ZodType>(file: string, schema: S): Promise<z.infer<S>> {
  let p = cache.get(file)
  if (!p) {
    p = fetch(base + file)
      .then((r) => {
        if (!r.ok) throw new Error(`تعذّر تحميل ${file} (${r.status})`)
        return r.json()
      })
      .then((json) => schema.parse(json))
    p.catch(() => cache.delete(file))
    cache.set(file, p)
  }
  return p as Promise<z.infer<S>>
}

export const loadSurahs = (): Promise<SurahIndexT> => load('surahs.json', SurahIndex)
export const loadSurahText = (id: number): Promise<SurahTextT> =>
  load(`surah/${id}.json`, SurahText)
export const loadRoots = (): Promise<RootIndexT> => load('roots.json', RootIndex)
/** The ayahs one root occurs in, as [surah, ayah] in mushaf order. */
export const loadRootOccurrences = (root: string): Promise<[number, number][]> =>
  load(`occ/${encodeURIComponent(root)}.json`, AyahList)
export const loadFingerprints = (): Promise<Fingerprint[]> =>
  load('fingerprints.json', Fingerprints)
export const loadNames = (): Promise<NameIndexT> => load('names.json', NameIndex)
export const loadSimilar = (): Promise<SimilarIndexT> => load('similar.json', SimilarIndex)
export const loadMorphology = (id: number): Promise<SurahMorphologyT> =>
  load(`morph/${id}.json`, SurahMorphology)

/** Search keys of every word, parsed once into arrays: [surah][ayah][word][key]. */
let searchCache: Promise<string[][][][]> | null = null
export function loadSearchIndex(): Promise<string[][][][]> {
  searchCache ??= load('search.json', SearchIndex).then((ix) =>
    ix.surahs.map((ayahs) => ayahs.map((a) => a.split(' ').map((w) => w.split('|')))),
  )
  searchCache.catch(() => (searchCache = null))
  return searchCache
}

export const loadTopics = (): Promise<TopicIndexT> => load('topics.json', TopicIndex)

export const loadLexicon = (): Promise<z.infer<typeof Lexicon>> => load('lexicon.json', Lexicon)
/** One lexicon entry's places and forms, by its address (slug). */
export const loadLexEntry = (slug: string): Promise<z.infer<typeof LexiconEntry>> =>
  load(`lex/${encodeURIComponent(slug)}.json`, LexiconEntry)
