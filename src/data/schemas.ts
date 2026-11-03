/**
 * The data contract between the generator (scripts/) and the interface (src/).
 * The interface never knows how the files were produced — only that they match
 * these schemas. Any future generator (Python, ML, …) must emit the same shapes.
 */
import { z } from 'zod'

/** A root as written in the corpus, e.g. "رحم". */
export const Root = z.string().min(2).max(5)

export const RootWeight = z.object({
  root: Root,
  /** Occurrences of the root inside the surah. */
  count: z.number().int().positive(),
})

export const Neighbor = z.object({
  surah: z.number().int().min(1).max(114),
  /** Cosine similarity of TF-IDF root profiles, 0..1. */
  similarity: z.number().min(0).max(1),
})

export const Surah = z.object({
  id: z.number().int().min(1).max(114),
  name: z.string().min(1),
  transliteration: z.string().min(2),
  revelation: z.enum(['meccan', 'medinan']),
  /** Revelation order (Tanzil metadata), 1..114. */
  order: z.number().int().min(1).max(114),
  ayahs: z.number().int().positive(),
  words: z.number().int().positive(),
  juz: z.number().int().min(1).max(30),
  /** Roots that characterize the surah (highest TF-IDF), with raw counts. */
  keyRoots: z.array(RootWeight).max(12),
  neighbors: z.array(Neighbor).max(12),
  /** Precomputed galaxy position. */
  position: z.tuple([z.number(), z.number(), z.number()]),
})

export const SurahIndex = z.object({
  version: z.number().int(),
  surahs: z.array(Surah).length(114),
})

export const Ayah = z.object({
  n: z.number().int().positive(),
  text: z.string().min(1),
})

export const SurahText = z.object({
  id: z.number().int().min(1).max(114),
  ayahs: z.array(Ayah).min(3),
})

export const RootNode = z.object({
  root: Root,
  count: z.number().int().positive(),
  surahs: z.number().int().positive(),
  /** Most frequent lemmas (dictionary forms) derived from this root. */
  lemmas: z.array(z.object({ lemma: z.string(), count: z.number().int().positive() })).max(8),
  /** Community (cluster) found by Louvain on the co-occurrence graph; -1 if not in graph. */
  community: z.number().int(),
  /** Graph layout position, or null for roots outside the network. */
  x: z.number().nullable(),
  y: z.number().nullable(),
})

export const RootEdge = z.object({
  a: Root,
  b: Root,
  /** Ayahs in which both roots appear. */
  together: z.number().int().positive(),
  /** Normalized pointwise mutual information, -1..1. */
  npmi: z.number().min(-1).max(1),
})

export const RootIndex = z.object({
  version: z.number().int(),
  roots: z.array(RootNode).min(1000),
  edges: z.array(RootEdge),
})

/** Occurrences per root as "surah:ayah" pairs packed into [surah, ayah] tuples. */
export const RootOccurrences = z.record(
  Root,
  z.array(z.tuple([z.number().int(), z.number().int()])),
)

export type Surah = z.infer<typeof Surah>
export type SurahIndex = z.infer<typeof SurahIndex>
export type SurahText = z.infer<typeof SurahText>
export type RootNode = z.infer<typeof RootNode>
export type RootEdge = z.infer<typeof RootEdge>
export type RootIndex = z.infer<typeof RootIndex>
export type RootOccurrences = z.infer<typeof RootOccurrences>
