import { useMemo } from 'react'
import type { SimilarIndex } from '../../data/schemas'

export type Ref = [number, number]
export const key = (s: number, a: number) => `${s}:${a}`

export interface Match {
  other: Ref
  score: number | null // null: repeated word for word
}

/** For every ayah, the ayahs similar to it. */
export function buildMatches(data: SimilarIndex | null) {
  const m = new Map<string, Match[]>()
  const add = (from: Ref, match: Match) =>
    m.set(key(...from), [...(m.get(key(...from)) ?? []), match])
  if (!data) return m
  for (const [s1, a1, s2, a2, score] of data.pairs) {
    add([s1, a1], { other: [s2, a2], score: score / 100 })
    add([s2, a2], { other: [s1, a1], score: score / 100 })
  }
  for (const group of data.repeats)
    for (const r of group)
      for (const o of group) if (o !== r) add(r as Ref, { other: o as Ref, score: null })
  return m
}

export const useMatches = (data: SimilarIndex | null) => useMemo(() => buildMatches(data), [data])
