import { Link } from 'react-router'
import type { Surah } from '../../data/schemas'
import { AyahMark } from '../../components/AyahText'
import { formatPercent, toArabicDigits } from '../../lib/arabic'
import { ayahPath } from '../../lib/links'
import { ayahWords, commonWords, vocalKey, wordKey } from '../../lib/quran'
import { key, type Match, type Ref } from './matches'

/**
 * An ayah with its differences from the counterpart marked: a filled highlight for words it
 * does not share, a dotted underline for shared words whose vowels differ.
 */
export function DiffLine({
  text,
  marked,
  vowels,
  n,
}: {
  text: string
  marked: Set<number>
  vowels: Set<number>
  n: number
}) {
  const words = ayahWords(text)
  return (
    <p className="ayah text-[1.35rem] leading-[2.3]">
      {words.map((w, i) => (
        <span key={i}>
          {marked.has(i) ? (
            <mark className="rounded bg-[#ead9a8] px-0.5 text-[#6b4a0c]">{w}</mark>
          ) : vowels.has(i) ? (
            <span
              className="underline decoration-[#a6852f] decoration-dotted decoration-2 underline-offset-[10px]"
              title="الكلمة نفسها بضبط مختلف"
            >
              {w}
            </span>
          ) : (
            w
          )}{' '}
        </span>
      ))}
      <AyahMark n={n} />
    </p>
  )
}

export function Pair({
  base,
  match,
  texts,
  byId,
}: {
  base: Ref
  match: Match
  texts: Map<string, string>
  byId: Map<number, Surah>
}) {
  const a = texts.get(key(...base))
  const b = texts.get(key(...match.other))
  if (!a || !b) return <p className="text-ink-soft">…</p>
  const wa = ayahWords(a)
  const wb = ayahWords(b)
  const [ka, kb, matched] = commonWords(wa.map(wordKey), wb.map(wordKey))
  const onlyA = new Set(wa.map((_, i) => i).filter((i) => !ka.has(i)))
  const onlyB = new Set(wb.map((_, i) => i).filter((i) => !kb.has(i)))
  const vowelPairs = matched.filter(([i, j]) => vocalKey(wa[i]!) !== vocalKey(wb[j]!))
  const vowelsA = new Set(vowelPairs.map(([i]) => i))
  const vowelsB = new Set(vowelPairs.map(([, j]) => j))
  const [s, n] = match.other
  return (
    <div className="border-t border-[#e0cf9f] pt-3">
      <p className="flex flex-wrap items-baseline justify-between gap-2 text-sm text-ink-soft">
        <Link
          to={ayahPath(s, n)}
          className="-my-3 inline-block py-3 hover:text-ink hover:underline"
        >
          سورة {byId.get(s)?.name}، الآية {toArabicDigits(n)}
        </Link>
        <span>
          {match.score === null ? 'مكرّرة بلفظها' : `تطابق ${formatPercent(match.score)}`}
        </span>
      </p>
      {match.score === null ? (
        <p className="ayah text-[1.35rem] leading-[2.3]">
          {b} <AyahMark n={n} />
        </p>
      ) : (
        <>
          <DiffLine text={b} marked={onlyB} vowels={vowelsB} n={n} />
          <p className="mt-1 text-xs text-ink-soft">وفي الآية الأصل يختلف:</p>
          <DiffLine text={a} marked={onlyA} vowels={vowelsA} n={base[1]} />
        </>
      )}
    </div>
  )
}
