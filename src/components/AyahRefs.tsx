import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { Surah } from '../data/schemas'
import { loadSurahText } from '../data/load'
import { useAsync } from '../data/useAsync'
import { AYAH, countOf, toArabicDigits } from '../lib/arabic'
import { AyahMark } from './AyahText'
import { ayahPath } from '../lib/links'
import { isWord } from '../lib/quran'

const PAGE = 8

/** Ayahs per surah, drawn across the 114 surahs in mushaf order. */
export function Distribution({
  perSurah,
  surahs,
  label,
}: {
  perSurah: Map<number, number>
  surahs: Surah[]
  label: string
}) {
  const max = Math.max(1, ...perSurah.values())
  const W = 342
  const H = 64
  const bw = W / 114
  return (
    <figure className="mt-3">
      <svg viewBox={`0 0 ${W} ${H + 2}`} className="w-full" role="img" aria-label={label}>
        <line x1={0} x2={W} y1={H} y2={H} stroke="#cdb67a" strokeWidth={0.6} />
        {surahs.map((s, i) => {
          const v = perSurah.get(s.id) ?? 0
          if (!v) return null
          const h = Math.max(1.5, (v / max) * (H - 2))
          return (
            <rect
              key={s.id}
              // mushaf order flows right-to-left
              x={W - (i + 1) * bw + 0.25}
              y={H - h}
              width={Math.max(bw - 0.5, 0.8)}
              height={h}
              fill={s.revelation === 'meccan' ? '#a6852f' : '#3f8a77'}
            >
              <title>{`سورة ${s.name}: ${countOf(v, AYAH)}`}</title>
            </rect>
          )
        })}
      </svg>
      <div className="flex justify-between text-xs text-ink-soft" aria-hidden>
        <span>الفاتحة</span>
        <span>الناس</span>
      </div>
      <figcaption className="mt-1 flex gap-4 text-xs text-ink-soft">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-[#a6852f]" /> سورة مكية
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-[#3f8a77]" /> سورة مدنية
        </span>
      </figcaption>
    </figure>
  )
}

/** A paged list of ayahs, each with its reference and text. */
/** An ayah's text with the words at the given indexes (as counted by ayahWords) marked. */
function MarkedText({ text, words }: { text: string; words: number[] }) {
  let n = -1
  return (
    <>
      {text.split(/([ \u00a0]+)/).map((t, i) => {
        if (!isWord(t)) return t
        n++
        return words.includes(n) ? (
          <mark key={i} className="rounded-sm bg-[#efd98f] px-0.5 text-inherit">
            {t}
          </mark>
        ) : (
          t
        )
      })}
    </>
  )
}

export function OccurrenceList({
  list,
  byId,
  marks,
}: {
  list: [number, number][]
  byId: Map<number, Surah>
  /** Words to mark in each ayah, by "surah:ayah", as indexes into its words. */
  marks?: Map<string, number[]>
}) {
  const [shown, setShown] = useState(PAGE)
  const visible = list.slice(0, shown)
  const surahIds = useMemo(() => [...new Set(visible.map(([s]) => s))], [visible])
  const texts = useAsync(() => Promise.all(surahIds.map(loadSurahText)), surahIds.join(','))
  const textOf = useMemo(() => {
    const m = new Map<string, string>()
    if (texts.status === 'ready')
      for (const t of texts.data) for (const a of t.ayahs) m.set(`${t.id}:${a.n}`, a.text)
    return m
  }, [texts])

  return (
    <div className="mt-3">
      <ol className="divide-y divide-[#e0cf9f]">
        {visible.map(([s, a]) => (
          <li key={`${s}:${a}`} className="py-3">
            <Link
              to={ayahPath(s, a)}
              className="-my-3 inline-block py-3 text-sm text-ink-soft hover:text-ink hover:underline"
            >
              سورة {byId.get(s)?.name}، الآية {toArabicDigits(a)}
            </Link>
            <p className="ayah mt-1 text-[1.3rem] leading-[2.2]">
              {textOf.has(`${s}:${a}`) ? (
                <MarkedText text={textOf.get(`${s}:${a}`)!} words={marks?.get(`${s}:${a}`) ?? []} />
              ) : (
                '…'
              )}{' '}
              <AyahMark n={a} />
            </p>
          </li>
        ))}
      </ol>
      {shown < list.length && (
        <button
          type="button"
          onClick={() => setShown((n) => n + PAGE)}
          className="mt-2 rounded-full border border-[#cdb67a] px-4 py-1.5 text-sm text-ink hover:bg-vellum-deep"
        >
          عرض المزيد (بقي {countOf(list.length - shown, AYAH)})
        </button>
      )}
    </div>
  )
}
