/**
 * The topic tree must be the source index, unchanged except for the listed spelling fixes:
 * every ayah the source tags under a topic is under that topic here, and nothing else is.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { TopicIndex } from '../src/data/schemas.ts'
import { CORRECTIONS, cleanLabel } from '../src/lib/topics.ts'

const index = TopicIndex.parse(JSON.parse(readFileSync('public/data/topics.json', 'utf8')))
const source: { ayahs: Record<string, string[]> } = JSON.parse(
  readFileSync('sources/qurany-concepts.json', 'utf8'),
)
const byId = new Map(index.nodes.map((n) => [n.id, n]))
const pathOf = (id: number) => {
  const parts: string[] = []
  for (let n = byId.get(id); n; n = n.parent ? byId.get(n.parent) : undefined)
    parts.unshift(n.label)
  return parts.join(' > ')
}
const idOfPath = new Map(index.nodes.map((n) => [pathOf(n.id), n.id]))
const tagged = (id: number) => new Set((index.tags[String(id)] ?? []).map(([s, a]) => `${s}:${a}`))

describe('faithful to the source index', () => {
  it('keeps every (ayah, topic) pair of the source, and adds none', () => {
    const want = new Set<string>()
    for (const [ayah, paths] of Object.entries(source.ayahs))
      for (const p of paths) want.add(`${ayah}|${p.split('>').map(cleanLabel).join(' > ')}`)
    const got = new Set<string>()
    for (const [id, list] of Object.entries(index.tags))
      for (const [s, a] of list) got.add(`${s}:${a}|${pathOf(Number(id))}`)
    expect(got.size).toBe(want.size)
    expect(got.size).toBe(17979)
    for (const w of want) expect(got.has(w), w).toBe(true)
  })

  it('has 15 sections, 1174 topics and 5491 tagged ayahs', () => {
    expect(index.nodes.filter((n) => n.parent === null)).toHaveLength(15)
    expect(index.nodes).toHaveLength(1174)
    const all = new Set(Object.values(index.tags).flatMap((l) => l.map(([s, a]) => `${s}:${a}`)))
    expect(all.size).toBe(5491)
  })

  it('tags only ayahs that exist', () => {
    const counts = JSON.parse(readFileSync('public/data/surahs.json', 'utf8')).surahs.map(
      (s: { ayahs: number }) => s.ayahs,
    )
    for (const list of Object.values(index.tags))
      for (const [s, a] of list) expect(a >= 1 && a <= counts[s - 1], `${s}:${a}`).toBe(true)
  })
})

describe('tree structure', () => {
  it('links every topic to an existing parent one level up', () => {
    for (const n of index.nodes)
      if (n.parent === null) expect(n.depth).toBe(0)
      else expect(byId.get(n.parent)!.depth).toBe(n.depth - 1)
  })

  it('counts distinct ayahs of each topic and its subtopics', () => {
    const children = new Map<number, number[]>()
    for (const n of index.nodes)
      if (n.parent) children.set(n.parent, [...(children.get(n.parent) ?? []), n.id])
    const under = (id: number): Set<string> => {
      const s = tagged(id)
      for (const c of children.get(id) ?? []) for (const a of under(c)) s.add(a)
      return s
    }
    for (const n of index.nodes) {
      const all = under(n.id)
      expect(n.ayahs, n.label).toBe(all.size)
      expect(n.surahs, n.label).toBe(new Set([...all].map((a) => a.split(':')[0])).size)
      expect(n.direct, n.label).toBe(tagged(n.id).size)
    }
  })
})

describe('known ayahs under their topics', () => {
  const has = (path: string, ayah: string) => {
    const id = idOfPath.get(path)
    expect(id, path).toBeDefined()
    expect(tagged(id!).has(ayah), `${ayah} in ${path}`).toBe(true)
  }
  it('al-Fatiha 2 under رب العالمين', () =>
    has('أركان الإسلام > التوحيد > توحيد الله تعالى > صفات الله تعالى > رب العالمين', '1:2'))
  it('Sad 50 under جنات عدن (the source page shows the wrong text, but tags the right number)', () =>
    has('الإيمان > الغيب > الجنة > أسماء الجنة > جنات عدن', '38:50'))
  it('Sad 55 under صفات النار', () => has('الإيمان > الغيب > النار > صفات النار', '38:55'))
})

describe('label cleaning', () => {
  it('leaves no known spelling error and balances every bracket', () => {
    for (const n of index.nodes) {
      for (const [from] of CORRECTIONS)
        expect(n.label.split(/[\s()]+/), n.label).not.toContain(from)
      expect(n.label.split('(').length, n.label).toBe(n.label.split(')').length)
      expect(n.label).not.toMatch(/^\(|\s{2}|\(\s|\s\)|[\u200b-\u200f\ufeff]/)
    }
  })

  it('repairs brackets turned around by right-to-left copying', () => {
    expect(cleanLabel('(عاد (قوم هود')).toBe('عاد (قوم هود)')
    expect(cleanLabel('(الميسر(القمار')).toBe('الميسر (القمار)')
    expect(cleanLabel('أهل الكتاب: ( اليهود و النصارى)')).toBe('أهل الكتاب (اليهود والنصارى)')
  })
})
