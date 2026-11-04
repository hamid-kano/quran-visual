import { toArabicDigits } from '../lib/arabic'

export function AyahMark({ n }: { n: number }) {
  return (
    <span className="ayah-mark" role="img" aria-label={`الآية ${toArabicDigits(n)}`}>
      {toArabicDigits(n)}
    </span>
  )
}

/** Continuous mushaf-style run of ayahs. */
export function AyahRun({ ayahs }: { ayahs: { n: number; text: string }[] }) {
  return (
    <p className="ayah text-justify">
      {ayahs.map((a) => (
        <span key={a.n}>
          {a.text} <AyahMark n={a.n} />{' '}
        </span>
      ))}
    </p>
  )
}
