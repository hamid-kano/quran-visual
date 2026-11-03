import { Suspense, lazy, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { loadSurahs } from '../../data/load'
import { useAsync } from '../../data/useAsync'
import { ErrorNote, Loading } from '../../components/Status'
import { SearchBox, type SearchItem } from '../../components/SearchBox'
import { toArabicDigits } from '../../lib/arabic'
import { useReducedMotion } from '../../lib/useReducedMotion'
import { MECCAN, MEDINAN, orderGradient, type ColorMode } from './colors'
import { SurahPanel } from './SurahPanel'

const GalaxyScene = lazy(() => import('./GalaxyScene'))

function Toggle({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-sm transition-colors ${
        pressed ? 'bg-gold/20 text-gold-soft' : 'text-mist hover:text-vellum'
      }`}
    >
      {children}
    </button>
  )
}

export default function GalaxyPage() {
  const state = useAsync(loadSurahs, 'surahs')
  const { id } = useParams()
  const navigate = useNavigate()
  const reducedMotion = useReducedMotion()
  const [colorMode, setColorMode] = useState<ColorMode>('revelation')
  const [showLinks, setShowLinks] = useState(false)
  const [showNames, setShowNames] = useState(false)

  const selected = id && /^\d+$/.test(id) && +id >= 1 && +id <= 114 ? +id : null
  const select = (s: number | null) =>
    navigate(s ? `/surah/${s}` : '/', { replace: !!selected && !!s })

  const surahs = useMemo(() => (state.status === 'ready' ? state.data.surahs : []), [state])
  const byId = useMemo(() => new Map(surahs.map((s) => [s.id, s])), [surahs])
  const current = selected ? byId.get(selected) : undefined
  const searchItems = useMemo<SearchItem[]>(
    () =>
      surahs.map((s) => ({
        key: String(s.id),
        label: `سورة ${s.name}`,
        hint: toArabicDigits(s.id),
        terms: [s.name, s.transliteration, String(s.id), toArabicDigits(s.id)],
      })),
    [surahs],
  )

  if (state.status === 'loading') return <Loading label="جارٍ رسم المجرّة" />
  if (state.status === 'error') return <ErrorNote error={state.error} />

  return (
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#183459_0%,#0d1d33_55%,#08142a_100%)]">
      <Suspense fallback={<Loading label="جارٍ رسم المجرّة" />}>
        <GalaxyScene
          surahs={surahs}
          selected={selected}
          onSelect={select}
          colorMode={colorMode}
          showLinks={showLinks}
          showNames={showNames}
          reducedMotion={reducedMotion}
        />
      </Suspense>

      <section
        aria-label="أدوات المجرّة"
        className="absolute inset-x-3 top-3 z-10 rounded-2xl border border-gold/20 bg-night-deep/75 p-4 backdrop-blur sm:inset-x-auto sm:right-5 sm:top-5 sm:w-[22rem]"
      >
        <h1 className="font-kufi text-2xl text-gold-soft">مجرّة السور</h1>
        <p
          className={`mt-1 text-[0.95rem] leading-relaxed text-mist ${current ? 'hidden sm:block' : ''}`}
        >
          كل نجم سورة، يكبر بعدد آياتها. وتتقارب السور كلما اشتركت في جذور كلماتها المميِّزة.
        </p>
        <div className="mt-3">
          <SearchBox
            items={searchItems}
            label="ابحث عن سورة"
            placeholder="ابحث باسم السورة أو رقمها"
            onChoose={(k) => select(+k)}
          />
        </div>
        <div
          className={`mt-3 flex-wrap items-center gap-1 ${current ? 'hidden sm:flex' : 'flex'}`}
          role="group"
          aria-label="طريقة العرض"
        >
          <Toggle pressed={colorMode === 'revelation'} onClick={() => setColorMode('revelation')}>
            مكان النزول
          </Toggle>
          <Toggle pressed={colorMode === 'order'} onClick={() => setColorMode('order')}>
            ترتيب النزول
          </Toggle>
          <span className="mx-1 h-4 w-px bg-gold/20" aria-hidden />
          <Toggle pressed={showLinks} onClick={() => setShowLinks((v) => !v)}>
            الروابط
          </Toggle>
          <Toggle pressed={showNames} onClick={() => setShowNames((v) => !v)}>
            كل الأسماء
          </Toggle>
        </div>
        <div
          className={`mt-3 text-sm text-mist ${current ? 'hidden sm:block' : ''}`}
          aria-live="polite"
        >
          {colorMode === 'revelation' ? (
            <div className="flex gap-5">
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ background: MECCAN }} /> مكية
              </span>
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ background: MEDINAN }} /> مدنية
              </span>
            </div>
          ) : (
            <div>
              <div className="h-2 rounded-full" style={{ background: orderGradient }} />
              <div className="mt-1 flex justify-between">
                <span>أول ما نزل</span>
                <span>آخر ما نزل</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {current && (
        <aside
          aria-label={`تفاصيل سورة ${current.name}`}
          className="absolute inset-x-2 bottom-2 z-10 h-[58%] sm:inset-x-auto sm:bottom-5 sm:left-5 sm:top-5 sm:h-auto sm:w-[27rem]"
        >
          <SurahPanel
            key={current.id}
            surah={current}
            byId={byId}
            onSelect={select}
            onClose={() => select(null)}
          />
        </aside>
      )}
    </div>
  )
}
