import type { Fingerprint } from '../../data/schemas'
import { fingerprintGeometry } from './geometry'

/** Radial fingerprint of a surah (see geometry.ts for how it is drawn). */
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
  const c = size / 2
  const { spokes, stroke, ring } = fingerprintGeometry(fp, size)
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" role="img" aria-label={title}>
      <circle
        cx={c}
        cy={c}
        r={ring}
        fill="none"
        stroke="#c9a54a"
        strokeOpacity={0.35}
        strokeWidth={0.8}
      />
      {spokes.map((s, i) => {
        const isActive = active === i + 1
        return (
          <g key={i}>
            <line
              x1={s.x1}
              y1={s.y1}
              x2={s.x2}
              y2={s.y2}
              stroke={s.color}
              strokeWidth={isActive ? stroke * 2.2 : stroke}
              strokeOpacity={active && !isActive ? 0.7 : 1}
              strokeLinecap="round"
            />
            {onActive && (
              <line
                x1={s.x1}
                y1={s.y1}
                x2={s.xMax}
                y2={s.yMax}
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
