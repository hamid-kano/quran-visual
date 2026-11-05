import { useLayoutEffect, useRef, useState } from 'react'
import type { Surah } from '../../data/schemas'
import { MECCAN, MEDINAN, starRadius } from './colors'
import { project } from './projection'

/**
 * A still drawing of the galaxy from the scene's opening view, shown at once while the 3D
 * scene (a large download) loads, then faded out beneath it.
 */
export function GalaxyPreview({ surahs, hidden }: { surahs: Surah[]; hidden: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ${hidden ? 'opacity-0' : 'opacity-100'}`}
    >
      {size && (
        <>
          <svg width={size.w} height={size.h} className="absolute inset-0">
            <defs>
              {[MECCAN, MEDINAN].map((c, i) => (
                <radialGradient key={c} id={`glow-${i}`}>
                  <stop offset="0" stopColor={c} stopOpacity="0.38" />
                  <stop offset="0.25" stopColor={c} stopOpacity="0.15" />
                  <stop offset="1" stopColor={c} stopOpacity="0" />
                </radialGradient>
              ))}
            </defs>
            {surahs.map((s) => {
              const p = project(s.position, size.w, size.h)
              const r = starRadius(s) * p.k
              const g = s.revelation === 'meccan' ? 0 : 1
              return (
                <g key={s.id}>
                  <circle cx={p.x} cy={p.y} r={r * 4} fill={`url(#glow-${g})`} />
                  <circle cx={p.x} cy={p.y} r={r} fill={g ? MEDINAN : MECCAN} />
                </g>
              )
            })}
          </svg>
          {surahs
            .filter((s) => s.ayahs >= 100)
            .map((s) => {
              const r = starRadius(s)
              const p = project(
                [s.position[0], s.position[1] - r - 1.1, s.position[2]],
                size.w,
                size.h,
              )
              return (
                <span
                  key={s.id}
                  className="absolute left-0 top-0 whitespace-nowrap text-[13px] font-semibold text-mist select-none"
                  style={{ transform: `translate(-50%, -50%) translate(${p.x}px, ${p.y}px)` }}
                >
                  {s.name}
                </span>
              )
            })}
        </>
      )}
    </div>
  )
}
