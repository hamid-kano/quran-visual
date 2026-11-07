/** The reader's khatma plan, kept in this browser only. */
const PLAN_KEY = 'qv.khatma'

export interface Plan {
  days: number
  /** The first day, as YYYY-MM-DD in the reader's own calendar day. */
  start: string
}
export const isPlan = (v: unknown): v is Plan =>
  typeof v === 'object' &&
  v !== null &&
  Number.isInteger((v as Plan).days) &&
  (v as Plan).days >= 1 &&
  (v as Plan).days <= 604 &&
  /^\d{4}-\d{2}-\d{2}$/.test((v as Plan).start)

export const localDay = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
/** Calendar days from one local date to another (both YYYY-MM-DD). */
export const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T12:00:00`) - Date.parse(`${a}T12:00:00`)) / 86_400_000)
export const dateOf = (start: string, offset: number) => {
  const d = new Date(`${start}T12:00:00`)
  d.setDate(d.getDate() + offset)
  return d
}

/** The stored plan, if there is one. */
export function storedPlan(): Plan | null {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(PLAN_KEY) ?? 'null')
    return isPlan(v) ? v : null
  } catch {
    return null
  }
}
export function savePlan(p: Plan) {
  try {
    localStorage.setItem(PLAN_KEY, JSON.stringify(p))
  } catch {
    // the plan still works for this visit
  }
}
