import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { Surah } from '../../data/schemas'
import { loadMushaf, loadSurahs } from '../../data/load'
import { useAsync } from '../../data/useAsync'
import { ErrorNote, Loading } from '../../components/Status'
import { DAY, PAGE, countOf, toArabicDigits } from '../../lib/arabic'
import { khatma, ordinals, type Portion } from '../../lib/mushaf'
import {
  dateOf,
  daysBetween,
  localDay,
  savePlan,
  storedPlan,
  type Plan,
} from '../../lib/khatmaPlan'

const PRESETS = [3, 7, 10, 15, 30, 60]

const ONE_DECIMAL = new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 1 })
const DATE = new Intl.DateTimeFormat('ar-SY', { weekday: 'long', day: 'numeric', month: 'long' })

const load = (): Plan => storedPlan() ?? { days: 30, start: localDay() }

function Ref({ r, byId }: { r: [number, number]; byId: Map<number, Surah> }) {
  return (
    <Link
      to={`/read/${r[0]}${r[1] > 1 ? `#${r[1]}` : ''}`}
      className="-my-2 inline-block py-2 underline decoration-[#cdb67a] underline-offset-4 hover:decoration-ink"
    >
      {byId.get(r[0])?.name} {toArabicDigits(r[1])}
    </Link>
  )
}

function PortionText({ p, byId }: { p: Portion; byId: Map<number, Surah> }) {
  return (
    <>
      من <Ref r={p.from} byId={byId} /> إلى <Ref r={p.to} byId={byId} />
    </>
  )
}

const pagesLabel = (p: Portion) =>
  p.fromPage === p.toPage
    ? `الصفحة ${toArabicDigits(p.fromPage)}`
    : `الصفحات ${toArabicDigits(p.fromPage)}–${toArabicDigits(p.toPage)}`

export default function KhatmaPage() {
  const state = useAsync(() => Promise.all([loadMushaf(), loadSurahs()]), 'khatma')
  const [plan, setPlan] = useState<Plan>(load)
  const [custom, setCustom] = useState('')
  const update = (p: Plan) => {
    setPlan(p)
    savePlan(p)
  }

  useEffect(() => {
    document.title = 'خطة الختمة · آيات مرئية'
    return () => {
      document.title = 'آيات مرئية'
    }
  }, [])

  const data = state.status === 'ready' ? state.data : null
  const { portions, byId } = useMemo(() => {
    if (!data) return { portions: [], byId: new Map<number, Surah>() }
    const [mushaf, { surahs }] = data
    return {
      portions: khatma(mushaf, ordinals(surahs.map((s) => s.ayahs)), plan.days),
      byId: new Map(surahs.map((s) => [s.id, s])),
    }
  }, [data, plan.days])

  if (state.status === 'loading') return <Loading />
  if (state.status === 'error') return <ErrorNote error={state.error} />

  const todayIndex = daysBetween(plan.start, localDay())
  const today = portions[todayIndex]
  const perDay = 604 / plan.days

  return (
    <div className="absolute inset-0 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <nav aria-label="مسار الصفحة" className="flex items-center gap-1 text-sm text-mist">
          <Link
            to="/read"
            className="inline-flex min-h-11 items-center rounded-full px-3 hover:bg-gold/10 hover:text-vellum"
          >
            القراءة
          </Link>
          <span aria-hidden>›</span>
          <span className="px-3 text-vellum" aria-current="page">
            خطة الختمة
          </span>
        </nav>
        <h1 className="mt-2 font-display text-4xl font-bold text-gold-soft">خطة الختمة</h1>
        <p className="mt-3 leading-relaxed text-mist">
          يُقسَّم المصحف، وهو ٦٠٤ صفحات في مصحف المدينة، على عدد الأيام الذي تختاره بصفحات كاملة
          متقاربة، ويبدأ ورد كل يوم بأول آية في صفحته الأولى وينتهي بآخر آية في صفحته الأخيرة.
          وتُحفظ خطتك في متصفحك.
        </p>

        <section className="page mt-6 rounded-md px-5 py-5 sm:px-7" aria-labelledby="plan">
          <h2 id="plan" className="font-display text-xl font-bold text-ink">
            مدة الختمة
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {PRESETS.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={plan.days === d}
                onClick={() => update({ ...plan, days: d })}
                className={`min-h-11 rounded-full border px-4 ${
                  plan.days === d
                    ? 'border-[#a6852f] bg-[#ead9a8] text-ink'
                    : 'border-[#cdb67a] text-ink hover:bg-vellum-deep'
                }`}
              >
                {countOf(d, DAY)}
              </button>
            ))}
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                const n = Number(custom)
                if (Number.isInteger(n) && n >= 1 && n <= 604) update({ ...plan, days: n })
              }}
            >
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                أو
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={604}
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  placeholder="عدد الأيام"
                  className="h-11 w-28 rounded-full border border-[#cdb67a] bg-vellum px-4 text-ink"
                />
              </label>
              <button
                type="submit"
                className="min-h-11 rounded-full bg-[#ead9a8] px-4 text-ink hover:bg-[#e2cd92]"
              >
                اعتمد
              </button>
            </form>
          </div>
          <label className="mt-4 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
            تبدأ يوم
            <input
              type="date"
              value={plan.start}
              onChange={(e) => e.target.value && update({ ...plan, start: e.target.value })}
              className="h-11 rounded-full border border-[#cdb67a] bg-vellum px-4 text-ink"
            />
            {plan.start !== localDay() && (
              <button
                type="button"
                onClick={() => update({ ...plan, start: localDay() })}
                className="min-h-11 rounded-full px-3 underline underline-offset-4"
              >
                ابدأ اليوم
              </button>
            )}
          </label>
          <p className="mt-3 text-sm text-ink-soft">
            {plan.days === 604
              ? 'صفحة واحدة كل يوم.'
              : `نحو ${ONE_DECIMAL.format(perDay)} صفحة في اليوم.`}
          </p>
        </section>

        {today ? (
          <section
            className="mt-5 rounded-md border border-gold/40 bg-gold/10 px-5 py-4"
            aria-labelledby="today"
          >
            <h2 id="today" className="font-display text-2xl font-bold text-gold-soft">
              ورد اليوم: اليوم {toArabicDigits(today.day)} من {toArabicDigits(portions.length)}
            </h2>
            <p className="mt-2 text-vellum">
              {pagesLabel(today)}، <PortionText p={today} byId={byId} />
            </p>
            <Link
              to={`/mushaf/${today.fromPage}`}
              className="mt-3 inline-flex min-h-11 items-center rounded-full bg-gold/25 px-5 text-gold-soft hover:bg-gold/35"
            >
              ابدأ القراءة
            </Link>
          </section>
        ) : (
          <p className="mt-5 text-mist">
            {todayIndex < 0
              ? `تبدأ الخطة ${DATE.format(dateOf(plan.start, 0))}.`
              : 'انتهت مدة هذه الخطة. اختر مدة جديدة أو ابدأ اليوم.'}
          </p>
        )}

        <section className="page mt-5 rounded-md px-5 py-5 sm:px-7" aria-labelledby="days">
          <h2 id="days" className="font-display text-xl font-bold text-ink">
            الأوراد يوماً يوماً
          </h2>
          <ol className="mt-3 divide-y divide-[#e0cf9f]">
            {portions.map((p, i) => (
              <li
                key={p.day}
                className={`py-2.5 ${i === todayIndex ? '-mx-2 rounded bg-[#efe0b4] px-2' : ''}`}
                aria-current={i === todayIndex ? 'date' : undefined}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-semibold text-ink">
                    اليوم {toArabicDigits(p.day)}
                    <span className="ms-2 text-sm font-normal text-ink-soft">
                      {DATE.format(dateOf(plan.start, i))}
                    </span>
                  </span>
                  <span className="text-sm text-ink-soft">
                    {pagesLabel(p)} ({countOf(p.toPage - p.fromPage + 1, PAGE)})
                  </span>
                </div>
                <p className="text-ink">
                  <PortionText p={p} byId={byId} />
                </p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  )
}
