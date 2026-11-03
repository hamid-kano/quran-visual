import type { Fingerprint } from '../../data/schemas'
import { endingColor } from './endings'

/**
 * Radial fingerprint: one spoke per ayah, starting at the top and turning counter-clockwise
 * (the direction of Arabic reading). Spoke length is the ayah's word count relative to the
 * longest ayah of the same surah; its color is the ayah's final letter.
 */
export function FingerprintGlyph({
  fp,
  size,
  active,
  onActive,
  title,
}: {
  fp: Fingerprint
  size: number
  active?: number | null
  onActive?: (ayah: number | null) => void
  title: string
}) {
  const n = fp.lengths.length
  const c = size / 2
  const inner = size * 0.2
  const outer = size * 0.48
  const max = Math.max(...fp.lengths)
  const stroke = Math.max(0.6, Math.min(size * 0.022, ((2 * Math.PI * inner) / n) * 0.75))
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" role="img" aria-label={title}>
      <circle
        cx={c}
        cy={c}
        r={inner * 0.92}
        fill="none"
        stroke="#c9a54a"
        strokeOpacity={0.35}
        strokeWidth={0.8}
      />
      {fp.lengths.map((len, i) => {
        const angle = -Math.PI / 2 - (2 * Math.PI * i) / n
        const r = inner + (outer - inner) * Math.sqrt(len / max)
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const isActive = active === i + 1
        return (
          <g key={i}>
            <line
              x1={c + inner * cos}
              y1={c + inner * sin}
              x2={c + r * cos}
              y2={c + r * sin}
              stroke={endingColor(fp.endings[i] ?? '')}
              strokeWidth={isActive ? stroke * 2.2 : stroke}
              strokeOpacity={active && !isActive ? 0.7 : 1}
              strokeLinecap="round"
            />
            {onActive && (
              <line
                x1={c + inner * cos}
                y1={c + inner * sin}
                x2={c + outer * cos}
                y2={c + outer * sin}
                stroke="transparent"
                strokeWidth={Math.max(stroke * 2.5, 6)}
                onPointerEnter={() => onActive(i + 1)}
                onClick={() => onActive(i + 1)}
              />
            )}
          </g>
        )
      })}
    </svg>
  )
}
