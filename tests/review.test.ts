import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { TopicIndex } from '../src/data/schemas.ts'
import { NOTE_KINDS, UNCERTAIN, issueUrl, mailUrl } from '../src/lib/review.ts'

const topics = TopicIndex.parse(JSON.parse(readFileSync('public/data/topics.json', 'utf8')))
const label = (id: number) => topics.nodes.find((n) => n.id === id)?.label
const place = {
  subject: 'سورة البقرة، الآية ٢٥٥',
  url: 'https://hamid-kano.github.io/quran-visual/ayah/2/255',
}

describe('review links', () => {
  it('opens the issue form with the place filled in', () => {
    const u = new URL(issueUrl(place))
    expect(u.origin + u.pathname).toBe('https://github.com/hamid-kano/quran-visual/issues/new')
    expect(u.searchParams.get('template')).toBe('review.yml')
    expect(u.searchParams.get('title')).toBe('ملاحظة: سورة البقرة، الآية ٢٥٥')
    expect(u.searchParams.get('location')).toBe(place.url)
  })

  it('writes an email whose subject and body decode back exactly', () => {
    const m = mailUrl(place, 'notes@example.org')
    expect(m.startsWith('mailto:notes@example.org?subject=')).toBe(true)
    expect(m).not.toContain('+')
    const q = new URLSearchParams(m.split('?')[1])
    expect(q.get('subject')).toBe('ملاحظة: سورة البقرة، الآية ٢٥٥')
    expect(q.get('body')).toContain(`الرابط: ${place.url}`)
  })

  it('offers in the site the same kinds of note as the issue form', () => {
    const form = readFileSync('.github/ISSUE_TEMPLATE/review.yml', 'utf8')
    const options = [...form.matchAll(/^ {8}- (.+)$/gm)].map((m) => m[1])
    expect(options).toEqual([...NOTE_KINDS])
    // the field the site fills in must keep its id
    expect(form).toMatch(/id: location/)
  })
})

describe('the review page', () => {
  it('points at the topics it names', () => {
    for (const [l, id] of UNCERTAIN) expect(label(id)).toBe(l)
    expect(label(928)).toBe('العلوم والفنون')
  })
})
