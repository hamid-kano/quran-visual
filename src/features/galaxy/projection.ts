/** The galaxy scene's opening camera: where it stands, what it looks at, and its field of view. */
export const CAMERA = [0, 8, 105] as const
export const FOV = 45

type V = [number, number, number]
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: V, b: V): V => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const unit = (a: V): V => {
  const n = Math.hypot(...a)
  return [a[0] / n, a[1] / n, a[2] / n]
}

// the camera's axes when it looks at the centre with the world's up as its up
const forward = unit(sub([0, 0, 0], [...CAMERA]))
const right = unit(cross(forward, [0, 1, 0]))
const up = cross(right, forward)
const focal = 1 / Math.tan(((FOV / 2) * Math.PI) / 180)

/** A point in the galaxy as it lands on a screen of the given size, with the scale there. */
export function project(p: V, w: number, h: number) {
  const d = sub(p, [...CAMERA])
  const z = dot(d, forward)
  const k = (focal * h) / 2 / z
  return { x: w / 2 + dot(d, right) * k, y: h / 2 - dot(d, up) * k, k }
}
