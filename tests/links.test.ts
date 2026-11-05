import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SimilarIndex, SurahIndex, SurahMorphology, TopicIndex } from '../src/data/schemas.ts'
import { adjacentAyahs, ayahPath } from '../src/lib/links.ts'
import { describeWord } from '../src/lib/morphology.ts'
import { buildTree, pathOf, surahTopics, topicsOfAyah } from '../src/features/topics/tree.ts'
import { buildMatches, key } from '../src/features/similar/matches.ts'

const read = (f: string) => JSON.parse(readFileSync(`public/data/${f}`, 'utf8'))
const surahs = SurahIndex.parse(read('surahs.json')).surahs
const counts = surahs.map((s) => s.ayahs)
const topics = TopicIndex.parse(read('topics.json'))
const tree = buildTree(topics)
const labels = (ids: number[]) => ids.map((id) => tree.byId.get(id)!.label)

describe('ayah addresses', () => {
  it('builds the page address', () => {
    expect(ayahPath(2, 255)).toBe('/ayah/2/255')
  })

  it('steps across surah boundaries and stops at both ends of the mushaf', () => {
    expect(adjacentAyahs(counts, 1, 1)).toEqual({ prev: null, next: [1, 2] })
    expect(adjacentAyahs(counts, 1, 7)).toEqual({ prev: [1, 6], next: [2, 1] })
    expect(adjacentAyahs(counts, 2, 1)).toEqual({ prev: [1, 7], next: [2, 2] })
    expect(adjacentAyahs(counts, 114, 6)).toEqual({ prev: [114, 5], next: null })
  })

  it('visits all 6236 ayahs exactly once walking forward', () => {
    let at: [number, number] | null = [1, 1]
    let n = 0
    while (at) {
      n++
      at = adjacentAyahs(counts, ...at).next
    }
    expect(n).toBe(6236)
  })
})

describe('topics of an ayah and of a surah', () => {
  it('tags Ayat al-Kursi (2:255) with the attributes it names', () => {
    const l = labels(topicsOfAyah(topics, 2, 255))
    for (const t of ['الحيّ', 'القيّوم', 'العلي', 'العظيم', 'الشفاعة']) expect(l).toContain(t)
  })

  it('agrees with the index: every topic found for an ayah lists that ayah', () => {
    for (const [s, a] of [
      [1, 1],
      [2, 255],
      [12, 4],
      [112, 1],
    ] as const)
      for (const id of topicsOfAyah(topics, s, a))
        expect(topics.tags[String(id)]).toContainEqual([s, a])
  })

  it('counts al-Ikhlas: four ayahs under the absolute oneness of Allah', () => {
    const top = surahTopics(topics, 112)
    expect(top[0]!.ayahs).toBe(4)
    expect(labels(top.filter((t) => t.ayahs === 4).map((t) => t.id))).toEqual(
      expect.arrayContaining(['التوحيد المطلق لله تعالى', 'وحدانيته']),
    )
    // most first
    for (let i = 1; i < top.length; i++)
      expect(top[i - 1]!.ayahs).toBeGreaterThanOrEqual(top[i]!.ayahs)
  })

  it('places each topic under a path that starts at a section', () => {
    for (const { id } of surahTopics(topics, 2)) expect(pathOf(tree, id)[0]!.parent).toBeNull()
  })
})

describe('roots of an ayah', () => {
  it('reads al-Ikhlas 1 as قول، أحد and the name of Allah', () => {
    const m = SurahMorphology.parse(read('morph/112.json'))
    const roots = [...new Set(m.ayahs[0]!.map((w) => describeWord(w).root).filter(Boolean))]
    expect(roots).toEqual(['قول', 'أله', 'أحد'])
  })
})

describe('similar ayahs of one ayah', () => {
  const m = buildMatches(SimilarIndex.parse(read('similar.json')))
  it('is symmetric', () => {
    for (const [k, list] of m)
      for (const x of list) {
        const [s, a] = k.split(':').map(Number) as [number, number]
        expect(m.get(key(...x.other))!.some((y) => y.other[0] === s && y.other[1] === a)).toBe(true)
      }
  })

  it('finds «فبأي آلاء ربكما تكذبان» (55:13) repeated word for word', () => {
    const list = m.get(key(55, 13))!.filter((x) => x.score === null)
    expect(list).toHaveLength(30)
  })
})

describe('the galaxy preview', () => {
  it('draws each star where the 3D scene’s opening camera shows it', async () => {
    const { PerspectiveCamera, Vector3 } = await import('three')
    const { CAMERA, FOV, project } = await import('../src/features/galaxy/projection.ts')
    for (const [w, h] of [
      [1280, 800],
      [390, 844],
    ] as const) {
      const cam = new PerspectiveCamera(FOV, w / h, 0.5, 600)
      cam.position.set(...CAMERA)
      cam.lookAt(0, 0, 0)
      cam.updateMatrixWorld()
      for (const s of surahs) {
        const v = new Vector3(...s.position).project(cam)
        const p = project(s.position, w, h)
        expect(p.x).toBeCloseTo(((v.x + 1) / 2) * w, 6)
        expect(p.y).toBeCloseTo(((1 - v.y) / 2) * h, 6)
      }
    }
  })
})

describe('per-root occurrence files', () => {
  it('hold exactly each root’s list from the full index', async () => {
    const { readdirSync } = await import('node:fs')
    const { RootOccurrences, AyahList } = await import('../src/data/schemas.ts')
    const all = RootOccurrences.parse(read('root-occurrences.json'))
    const files = readdirSync('public/data/occ')
    expect(files).toHaveLength(Object.keys(all).length)
    for (const [root, list] of Object.entries(all))
      expect(AyahList.parse(read(`occ/${root}.json`))).toEqual(list)
  })
})
