import type { Fingerprint } from '../../data/schemas'
import { endingColor } from './endings'

export interface Spoke {
  x1: number
  y1: number
  x2: number
  y2: number
  /** Outer end at full length, for hit areas. */
  xMax: number
  yMax: number
  color: string
}

/**
 * Geometry of a fingerprint: one spoke per ayah, starting at the top and turning
 * counter-clockwise (the direction of Arabic reading). Spoke length is the square root of the
 * ayah's word count relative to the longest ayah of the same surah; its color is the ayah's
 * final letter. Shared by the page and the link-preview images, so both draw the same figure.
 */
export function fingerprintGeometry(fp: Fingerprint, size: number, cx = size / 2, cy = size / 2) {
  const n = fp.lengths.length
  const inner = size * 0.2
  const outer = size * 0.48
  const max = Math.max(...fp.lengths)
  const stroke = Math.max(0.6, Math.min(size * 0.022, ((2 * Math.PI * inner) / n) * 0.75))
  const spokes: Spoke[] = fp.lengths.map((len, i) => {
    const angle = -Math.PI / 2 - (2 * Math.PI * i) / n
    const r = inner + (outer - inner) * Math.sqrt(len / max)
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    return {
      x1: cx + inner * cos,
      y1: cy + inner * sin,
      x2: cx + r * cos,
      y2: cy + r * sin,
      xMax: cx + outer * cos,
      yMax: cy + outer * sin,
      color: endingColor(fp.endings[i] ?? ''),
    }
  })
  return { spokes, stroke, ring: inner * 0.92 }
}
