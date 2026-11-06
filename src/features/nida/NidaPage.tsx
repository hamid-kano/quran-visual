import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { Nida, Surah } from '../../data/schemas'
import { loadNida, loadSurahs } from '../../data/load'
import { useAsync } from '../../data/useAsync'
import { ErrorNote, Loading } from '../../components/Status'
import { OccurrenceList } from '../../components/AyahRefs'
import { ReviewLink } from '../../components/ReviewLink'
import { TIME, countOf, formatNumber, formatPercent } from '../../lib/arabic'
import { PAGE_MECCAN, PAGE_MEDINAN } from '../../lib/colors'

type Group = Nida['groups'][number]

function split(g: Group, byId: Map<number, Surah>) {
  let meccan = 0
  for (const [s] of g.places) if (byId.get(s)?.revelation === 'meccan') meccan++
  return { meccan, medinan: g.places.length - meccan }
}

function Row({
  g,
  byId,
  max,
  open,
  onToggle,
}: {
  g: Group
  byId: Map<number, Surah>
  max: number
  open: boolean
  onToggle: () => void
}) {
  const { meccan, medinan } = split(g, byId)
  const n = g.places.length
  const { list, marks } = useMemo(() => {
    const list: [number, number][] = []
    const marks = new Map<string, number[]>()
    for (const [s, a, w, span] of g.places) {
      const k = `${s}:${a}`
      if (!marks.has(k)) list.push([s, a])
      marks.set(k, [...(marks.get(k) ?? []), ...Array.from({ length: span }, (_, i) => w + i)])
    }
    return { list, marks }
  }, [g])

  return (
    <li className="py-1.5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full rounded px-1 py-1 text-right hover:bg-vellum-deep"
      >
        <span className="flex items-baseline justify-between gap-3">
          <span className="font-quran text-xl leading-snug text-ink">{g.label}</span>
          <span className="text-sm text-ink-soft">
            {formatNumber(n)}
            <span className="sr-only">
              : في السور المكية {formatNumber(meccan)}، وفي المدنية {formatNumber(medinan)}
            </span>
          </span>
        </span>
        <span className="mt-1 flex h-2.5" aria-hidden>
          <span
            className="block h-full"
            style={{ width: `${(meccan / max) * 100}%`, background: PAGE_MECCAN }}
          />
          {medinan > 0 && (
            <span
              className={`block h-full ${meccan > 0 ? 'border-s-2 border-vellum' : ''}`}
              style={{ width: `${(medinan / max) * 100}%`, background: PAGE_MEDINAN }}
            />
          )}
        </span>
      </button>
      {open && (
        <div className="mb-2 mt-1 rounded border border-[#e0cf9f] px-3">
          <p className="pt-2 text-sm text-ink-soft">
            {countOf(n, TIME)}: في السور المكية {formatNumber(meccan)}، وفي المدنية{' '}
            {formatNumber(medinan)}.
          </p>
          <OccurrenceList list={list} byId={byId} marks={marks} />
        </div>
      )}
    </li>
  )
}

export default function NidaPage() {
  const state = useAsync(() => Promise.all([loadSurahs(), loadNida()]), 'nida')
  const [open, setOpen] = useState<string | null>(null)
  useEffect(() => {
    document.title = 'النداء في القرآن · آيات مرئية'
    return () => {
      document.title = 'آيات مرئية'
    }
  }, [])
  const data = state.status === 'ready' ? state.data : null
  const byId = useMemo(() => new Map((data?.[0].surahs ?? []).map((s) => [s.id, s])), [data])

  if (state.status === 'loading') return <Loading />
  if (state.status === 'error') return <ErrorNote error={state.error} />
  const { groups } = state.data[1]
  const total = groups.reduce((n, g) => n + g.places.length, 0)
  const meccan = groups.reduce((n, g) => n + split(g, byId).meccan, 0)
  const max = groups[0]?.places.length ?? 1

  return (
    <div className="absolute inset-0 overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-4xl font-bold text-gold-soft">النداء في القرآن</h1>
        <div className="mt-3 max-w-3xl space-y-2 leading-relaxed text-mist">
          <p>
            مواضع النداء كما وسمتها المدوّنة القرآنية العربية: بحرف «يا» متصلاً بما بعده، مثل «
            <span className="font-quran">يَٰقَوۡمِ</span>» و«
            <span className="font-quran">يَٰٓأَيُّهَا ٱلنَّاسُ</span>»، وبالميم في «
            <span className="font-quran">ٱللَّهُمَّ</span>». وتُجمع بحسب المنادى، ويُعرض النداء كما
            كُتب في المصحف.
          </p>
          <p className="text-sm">
            يدخل في العدّ النداء في القصص على ألسنة الأنبياء وغيرهم، ولا يُعيَّن هنا المنادي. ولا
            يدخل فيه النداء بلا حرف، مثل «<span className="font-quran">رَبَّنَا</span>»، لأن
            المدوّنة لا تسمه. ومنه ما يُراد به التحسّر أو التنبيه، مثل «
            <span className="font-quran">يَٰلَيۡتَنِي</span>» و«
            <span className="font-quran">يَٰوَيۡلَتَىٰٓ</span>»، ويعدّ بعض النحاة «يا» فيه حرف
            تنبيه.
          </p>
          <p>
            ورد النداء {countOf(total, TIME)}، منها في السور المكية {formatNumber(meccan)} (
            {formatPercent(meccan / total)}) وفي المدنية {formatNumber(total - meccan)}. والتصنيف
            بحسب السورة كلها.
          </p>
        </div>

        <section className="page mt-6 rounded-md px-4 py-5 sm:px-7" aria-labelledby="list">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="list" className="font-display text-2xl font-bold text-ink">
              المنادى
            </h2>
            <ul className="flex gap-4 text-sm text-ink-soft" aria-label="الألوان">
              <li className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm" style={{ background: PAGE_MECCAN }} />
                في سورة مكية
              </li>
              <li className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm" style={{ background: PAGE_MEDINAN }} />
                في سورة مدنية
              </li>
            </ul>
          </div>
          <p className="mt-1 text-sm text-ink-soft">اختر نداءً لترى مواضعه.</p>
          <ul className="mt-3 divide-y divide-[#efe3bf]">
            {groups.map((g) => (
              <Row
                key={g.key}
                g={g}
                byId={byId}
                max={max}
                open={open === g.key}
                onToggle={() => setOpen(open === g.key ? null : g.key)}
              />
            ))}
          </ul>
          <ReviewLink subject="صفحة النداء في القرآن" />
        </section>
        <p className="mt-4 text-sm text-mist">
          وطريقة تعيين المنادى مشروحة في{' '}
          <Link to="/about" className="underline underline-offset-4">
            صفحة المنهج
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
