import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { loadMorphology } from '../data/load'
import { useAsync } from '../data/useAsync'
import { toArabicDigits } from '../lib/arabic'
import { describeWord } from '../lib/morphology'
import { ayahWords } from '../lib/quran'
import { ayahPath } from '../lib/links'
import { AyahMark } from './AyahText'
import { RootLetters } from './RootLetters'

type Picked = { ayah: number; word: number }

/**
 * A mushaf-style run of ayahs in which every word can be chosen to show its root,
 * dictionary form and morphology (from the Quranic Arabic Corpus).
 */
export function WordExplorer({
  surah,
  ayahs,
  activeAyah = null,
  onPlayFrom,
  linkAyahs = true,
}: {
  surah: number
  ayahs: { n: number; text: string }[]
  /** The ayah being recited, highlighted and kept in view. */
  activeAyah?: number | null
  /** When given, each ayah number starts the recitation from that ayah. */
  onPlayFrom?: (ayah: number) => void
  /** Link the chosen word's ayah to its own page (off on that page itself). */
  linkAyahs?: boolean
}) {
  const activeRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!activeAyah) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    activeRef.current?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
  }, [activeAyah])
  const morph = useAsync(() => loadMorphology(surah), String(surah))
  const [picked, setPicked] = useState<Picked | null>(null)
  const ready = morph.status === 'ready'

  const pickedText = picked
    ? ayahWords(ayahs.find((a) => a.n === picked.ayah)?.text ?? '')[picked.word]
    : undefined
  const segs = picked && ready ? morph.data.ayahs[picked.ayah - 1]?.[picked.word] : undefined
  const info = segs ? describeWord(segs) : null
  const unaligned = picked && ready && morph.data.ayahs[picked.ayah - 1] === null

  return (
    <div>
      <p className="ayah text-justify">
        {ayahs.map((a) => (
          <span
            key={a.n}
            ref={a.n === activeAyah ? activeRef : undefined}
            className={
              a.n === activeAyah ? 'rounded bg-[#efe0b4] [box-decoration-break:clone]' : undefined
            }
            aria-current={a.n === activeAyah ? 'true' : undefined}
          >
            {ayahWords(a.text).map((w, i) => {
              const on = picked?.ayah === a.n && picked.word === i
              return (
                <span key={i}>
                  <button
                    type="button"
                    disabled={!ready}
                    onClick={() => setPicked(on ? null : { ayah: a.n, word: i })}
                    aria-pressed={on}
                    className={`rounded px-px transition-colors ${
                      on ? 'bg-[#ead9a8] text-[#6b4a0c]' : 'hover:bg-vellum-deep'
                    }`}
                  >
                    {w}
                  </button>{' '}
                </span>
              )
            })}
            {onPlayFrom ? (
              <button
                type="button"
                onClick={() => onPlayFrom(a.n)}
                aria-label={`استمع من الآية ${toArabicDigits(a.n)}`}
                title={`استمع من الآية ${toArabicDigits(a.n)}`}
                className="rounded-full hover:bg-vellum-deep"
              >
                <AyahMark n={a.n} />
              </button>
            ) : (
              <AyahMark n={a.n} />
            )}{' '}
          </span>
        ))}
      </p>

      {picked && (
        <div
          className="sticky bottom-0 -mx-6 mt-3 border-t border-[#cdb67a] bg-vellum px-6 pb-2 pt-3 shadow-[0_-12px_24px_-16px_rgba(0,0,0,0.35)]"
          aria-live="polite"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-ink-soft">
                الكلمة {toArabicDigits(picked.word + 1)} من{' '}
                {linkAyahs ? (
                  <Link
                    to={ayahPath(surah, picked.ayah)}
                    className="-my-2 inline-block py-2 text-ink underline decoration-[#cdb67a] underline-offset-4"
                  >
                    الآية {toArabicDigits(picked.ayah)}
                  </Link>
                ) : (
                  <>الآية {toArabicDigits(picked.ayah)}</>
                )}
              </p>
              <p className="font-quran text-3xl leading-[1.8] text-ink">{pickedText}</p>
            </div>
            <button
              type="button"
              onClick={() => setPicked(null)}
              className="rounded-full px-3 py-1 text-sm text-ink-soft hover:bg-vellum-deep"
            >
              إغلاق
            </button>
          </div>
          {unaligned && (
            <p className="text-sm text-ink-soft">
              تقسيم الكلمات في هذه الآية يختلف بين النص والمدوّنة الصرفية، فلا يُعرض تحليلها.
            </p>
          )}
          {info && (
            <div className="space-y-2">
              <dl className="flex flex-wrap gap-x-6 gap-y-1">
                {info.root && (
                  <div className="flex items-baseline gap-2">
                    <dt className="text-sm text-ink-soft">الجذر</dt>
                    <dd>
                      <Link
                        to={`/roots/${encodeURIComponent(info.root)}`}
                        className="font-display text-xl font-bold text-ink underline decoration-[#cdb67a] underline-offset-4"
                      >
                        <RootLetters root={info.root} />
                      </Link>
                    </dd>
                  </div>
                )}
                {info.lemma && (
                  <div className="flex items-baseline gap-2">
                    <dt className="text-sm text-ink-soft">المدخل</dt>
                    <dd className="font-quran text-xl text-ink">{info.lemma}</dd>
                  </div>
                )}
              </dl>
              <ul className="space-y-1 text-sm">
                {info.segments.map((s, i) => (
                  <li key={i} className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-quran text-lg text-ink">{s.form}</span>
                    <span className="font-semibold text-ink">{s.label}</span>
                    {s.details.length > 0 && (
                      <span className="text-ink-soft">{s.details.join('، ')}</span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-ink-soft">وصف صرفي من المدوّنة القرآنية العربية.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
