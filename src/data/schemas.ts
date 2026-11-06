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
/** Ayahs as [surah, ayah], in mushaf order. */
export const AyahList = z.array(z.tuple([z.number().int(), z.number().int()]))
export const RootOccurrences = z.record(Root, AyahList)

export type Surah = z.infer<typeof Surah>
export type SurahIndex = z.infer<typeof SurahIndex>
export type SurahText = z.infer<typeof SurahText>
export type RootNode = z.infer<typeof RootNode>
export type RootEdge = z.infer<typeof RootEdge>
export type RootIndex = z.infer<typeof RootIndex>
export type RootOccurrences = z.infer<typeof RootOccurrences>

// ---------- fingerprints (فواصل الآيات وأطوالها) ----------

export const Fingerprint = z.object({
  id: z.number().int().min(1).max(114),
  /** Words per ayah, in order. */
  lengths: z.array(z.number().int().positive()),
  /** Last letter of each ayah as written (one character per ayah). */
  endings: z.string(),
})
export const Fingerprints = z.array(Fingerprint).length(114)

// ---------- names (أسماء الأعلام) ----------

export const NameNode = z.object({
  /** Dictionary form as in the corpus, with diacritics. */
  name: z.string().min(2),
  count: z.number().int().positive(),
  surahs: z.number().int().positive(),
  community: z.number().int(),
  x: z.number(),
  y: z.number(),
})
export const NameIndex = z.object({
  version: z.number().int(),
  names: z.array(NameNode).min(50),
  edges: z.array(z.object({ a: z.string(), b: z.string(), together: z.number().int().positive() })),
  occurrences: z.record(z.string(), z.array(z.tuple([z.number().int(), z.number().int()]))),
})

// ---------- similar ayahs (المتشابهات اللفظية) ----------

const AyahRef = z.tuple([z.number().int().min(1).max(114), z.number().int().positive()])
export const SimilarIndex = z.object({
  version: z.number().int(),
  /** Near-identical pairs: [surahA, ayahA, surahB, ayahB, score 60..99]. */
  pairs: z.array(
    z.tuple([z.number(), z.number(), z.number(), z.number(), z.number().int().min(50).max(99)]),
  ),
  /** Ayahs repeated word for word. */
  repeats: z.array(z.array(AyahRef).min(2)),
})

// ---------- word morphology (الصرف) ----------

/** One segment of a word: [form, tag (N|V|P), features joined by "|"]. */
export const Segment = z.tuple([z.string(), z.enum(['N', 'V', 'P']), z.string()])
export const SurahMorphology = z.object({
  id: z.number().int().min(1).max(114),
  /** Per ayah, per word, its segments. Null where the text's word division differs from the corpus. */
  ayahs: z.array(z.array(z.array(Segment)).nullable()),
})

// ---------- search ----------

/** Per surah, per ayah: words separated by spaces, a word's alternative keys by "|". */
export const SearchIndex = z.object({
  version: z.number().int(),
  surahs: z.array(z.array(z.string().min(1))).length(114),
})

// ---------- topics (thematic index of Mushaf Al-Tajweed) ----------

export const TopicNode = z.object({
  id: z.number().int().positive(),
  label: z.string().min(2),
  parent: z.number().int().positive().nullable(),
  depth: z.number().int().min(0).max(6),
  /** Distinct ayahs under this topic and all its subtopics. */
  ayahs: z.number().int().positive(),
  surahs: z.number().int().positive(),
  /** Ayahs tagged with this topic itself. */
  direct: z.number().int().min(0),
})

export const TopicIndex = z.object({
  version: z.number().int(),
  source: z.object({ name: z.string(), archive: z.string().url(), commit: z.string() }),
  nodes: z.array(TopicNode).min(100),
  /** Topic id → ayahs tagged with it directly, as [surah, ayah]. */
  tags: z.record(z.string(), z.array(z.tuple([z.number().int(), z.number().int()]))),
})

export type SearchIndex = z.infer<typeof SearchIndex>
export type TopicNode = z.infer<typeof TopicNode>
export type TopicIndex = z.infer<typeof TopicIndex>
export type Fingerprint = z.infer<typeof Fingerprint>
export type NameIndex = z.infer<typeof NameIndex>
export type NameNode = z.infer<typeof NameNode>
export type SimilarIndex = z.infer<typeof SimilarIndex>
const Ref = z.tuple([z.number().int().min(1).max(114), z.number().int().min(1)])
/** The first ayah of each page, juz and quarter of a hizb of the Madinah mushaf, in order. */
export const Mushaf = z.object({
  pages: z.array(Ref).length(604),
  juz: z.array(Ref).length(30),
  quarters: z.array(Ref).length(240),
})
export type Mushaf = z.infer<typeof Mushaf>

/** The last letter of every ayah: one string per surah, one letter per ayah. */
export const Fawasil = z.object({ letters: z.array(z.string()).length(114) })
export type Fawasil = z.infer<typeof Fawasil>

const WordRef = z.tuple([z.number().int(), z.number().int(), z.number().int()])
/** Every stop sign as [surah, ayah, index of the word it follows], by kind, in mushaf order. */
export const Waqf = z.object({
  lazim: z.array(WordRef),
  jaiz: z.array(WordRef),
  sila: z.array(WordRef),
  qila: z.array(WordRef),
  muanaqa: z.array(WordRef),
  sakt: z.array(WordRef),
})
export type Waqf = z.infer<typeof Waqf>

/** Vocatives grouped by the one called, most frequent first. */
export const Nida = z.object({
  groups: z.array(
    z.object({
      /** The lemmas of the one called. */
      key: z.string().min(1),
      /** The call as the mushaf most often writes it. */
      label: z.string().min(1),
      /** [surah, ayah, first word, number of words], in mushaf order. */
      places: z.array(
        z.tuple([z.number().int(), z.number().int(), z.number().int(), z.number().int()]),
      ),
    }),
  ),
})
export type Nida = z.infer<typeof Nida>

export const LexiconIndexEntry = z.object({
  /** Address in the lexicon: the lemma, with type or root added where lemmas are spelt alike. */
  slug: z.string().min(1),
  lemma: z.string().min(1),
  tag: z.enum(['N', 'V', 'P']),
  /** The description most of its occurrences carry: اسم، صفة، اسم علم، فعل، حرف جر… */
  kind: z.string().min(1),
  root: z.string().nullable(),
  count: z.number().int().positive(),
  ayahs: z.number().int().positive(),
  surahs: z.number().int().positive(),
})
export const Lexicon = z.object({
  /** Words in the mushaf, and how many of them have a lemma (and so are counted here). */
  words: z.number().int().positive(),
  counted: z.number().int().positive(),
  /** Most frequent first. */
  entries: z.array(LexiconIndexEntry),
})
export const LexiconEntry = z.object({
  /** Every occurrence as [surah, ayah, word index in the ayah], in mushaf order. */
  occ: z.array(z.tuple([z.number().int(), z.number().int(), z.number().int()])),
  /** How its occurrences are described, most frequent first: [description, count]. */
  kinds: z.array(z.tuple([z.string(), z.number().int().positive()])),
  /** The forms it takes in the mushaf, most frequent first. Pause signs, and marks that depend
   *  only on the neighbouring word, do not make a form of their own. */
  forms: z.array(z.tuple([z.string(), z.number().int().positive()])),
})

export type Segment = z.infer<typeof Segment>
export type SurahMorphology = z.infer<typeof SurahMorphology>
export type Lexicon = z.infer<typeof Lexicon>
export type LexiconIndexEntry = z.infer<typeof LexiconIndexEntry>
export type LexiconEntry = z.infer<typeof LexiconEntry>
