import { useEffect, useMemo, useState } from 'react'
import type { Waqf } from '../../data/schemas'
import { loadSurahs, loadWaqf } from '../../data/load'
import { useAsync } from '../../data/useAsync'
import { ErrorNote, Loading } from '../../components/Status'
import { Distribution, OccurrenceList } from '../../components/AyahRefs'
import { ReviewLink } from '../../components/ReviewLink'
import { PLACE, countOf, formatNumber } from '../../lib/arabic'
import { WAQF_INFO, WAQF_KINDS, type WaqfKind } from '../../lib/waqf'

/** The places of one kind of sign, as an ayah list with the word before the sign marked. */
function places(refs: Waqf[WaqfKind]) {
  const list: [number, number][] = []
  const marks = new Map<string, number[]>()
  for (const [s, a, w] of refs) {
    const k = `${s}:${a}`
    if (!marks.has(k)) list.push([s, a])
    marks.set(k, [...(marks.get(k) ?? []), w])
  }
  return { list, marks }
}

const LISTED: WaqfKind[] = ['lazim', 'muanaqa', 'sakt']

export default function WaqfPage() {
  const state = useAsync(() => Promise.all([loadSurahs(), loadWaqf()]), 'waqf')
  const [kind, setKind] = useState<WaqfKind>('jaiz')

  useEffect(() => {
    document.title = 'الوقف والابتداء · آيات مرئية'
    return () => {
      document.title = 'آيات مرئية'
    }
  }, [])

  const data = state.status === 'ready' ? state.data : null
  const byId = useMemo(() => new Map((data?.[0].surahs ?? []).map((s) => [s.id, s])), [data])
  const perSurah = useMemo(() => {
    const m = new Map<number, number>()
    for (const [s] of data?.[1][kind] ?? []) m.set(s, (m.get(s) ?? 0) + 1)
    return m
  }, [data, kind])

  if (state.status === 'loading') return <Loading />
  if (state.status === 'error') return <ErrorNote error={state.error} />
  const [{ surahs }, waqf] = state.data
  const total = WAQF_KINDS.reduce((n, k) => n + waqf[k].length, 0)

  return (
    <div className="absolute inset-0 overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-4xl font-bold text-gold-soft">الوقف والابتداء</h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-mist">
          علامات الوقف من ضبط المصحف، وضعها أهل العلم إرشاداً للقارئ إلى ما يحسن الوقف عنده والوصل
          بحسب المعنى. وتُعرض هنا كما وردت في نص مصحف المدينة من مجمع الملك فهد، وفيه{' '}
          {formatNumber(total)} علامة.
        </p>

        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {WAQF_KINDS.map((k) => {
            const info = WAQF_INFO[k]
            return (
              <li key={k} className="page rounded-md px-5 py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-display text-xl font-bold text-ink">{info.name}</h2>
                  <span className="text-sm text-ink-soft">
                    {k === 'muanaqa'
                      ? `${countOf(waqf[k].length / 2, PLACE)} (${formatNumber(waqf[k].length)} علامات)`
                      : countOf(waqf[k].length, PLACE)}
                  </span>
                </div>
                <p className="mt-1 flex items-baseline gap-3">
                  <span className="min-w-12 font-quran text-3xl text-[#8a6a1f]">{info.sign}</span>
                  <span className="text-ink">{info.meaning}</span>
                </p>
              </li>
            )
          })}
        </ul>
        <p className="mt-3 text-sm text-mist">
          ولم ترد في نص المجمع المعتمد هنا علامة «لا» (الوقف الممنوع)، فلا تُعرض.
        </p>

        <section className="page mt-8 rounded-md px-5 py-5 sm:px-7" aria-labelledby="dist">
          <h2 id="dist" className="font-display text-2xl font-bold text-ink">
            توزيعها على السور
          </h2>
          <div role="group" aria-label="العلامة" className="mt-3 flex flex-wrap gap-1">
            {WAQF_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
                className={`min-h-11 rounded-full border px-4 text-sm ${
                  kind === k
                    ? 'border-[#a6852f] bg-[#ead9a8] text-ink'
                    : 'border-[#cdb67a] text-ink hover:bg-vellum-deep'
                }`}
              >
                {WAQF_INFO[k].name}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-ink-soft">
            عدد علامات «{WAQF_INFO[kind].name}» في كل سورة، من الفاتحة إلى الناس.
          </p>
          <Distribution
            perSurah={perSurah}
            surahs={surahs}
            label={`توزيع علامة ${WAQF_INFO[kind].name} على السور`}
          />
        </section>

        {LISTED.map((k) => {
          const { list, marks } = places(waqf[k])
          return (
            <section
              key={k}
              className="page mt-5 rounded-md px-5 py-5 sm:px-7"
              aria-labelledby={`list-${k}`}
            >
              <h2 id={`list-${k}`} className="font-display text-2xl font-bold text-ink">
                مواضع {WAQF_INFO[k].name}
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                {k === 'muanaqa'
                  ? 'الكلمتان اللتان فوقهما العلامتان مظلّلتان.'
                  : 'الكلمة التي فوقها العلامة مظلّلة.'}
              </p>
              <OccurrenceList key={k} list={list} byId={byId} marks={marks} />
            </section>
          )
        })}

        <div className="page mt-5 rounded-md px-5 py-1 sm:px-7">
          <ReviewLink subject="صفحة الوقف والابتداء" />
        </div>
      </div>
    </div>
  )
}
