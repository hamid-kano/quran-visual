/** A root shown as separate letters (ر ح م), spaced with a gap rather than space characters. */
export function RootLetters({ root, className = '' }: { root: string; className?: string }) {
  return (
    <span className={`inline-flex gap-[0.32em] ${className}`} aria-label={`جذر ${root}`}>
      {[...root].map((ch, i) => (
        <span key={i} aria-hidden>
          {ch}
        </span>
      ))}
    </span>
  )
}
