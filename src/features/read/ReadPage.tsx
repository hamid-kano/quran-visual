import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router'
import type { Surah } from '../../data/schemas'
import { loadSurahText, loadSurahs } from '../../data/load'
import { useAsync } from '../../data/useAsync'
import { ErrorNote, Loading } from '../../components/Status'
import { WordExplorer } from '../../components/WordExplorer'
import { ReviewLink } from '../../components/ReviewLink'
import { AYAH, countOf, revelationLabel, toArabicDigits } from '../../lib/arabic'
import { BASMALA, showsBasmalaHeader } from '../../lib/quran'
import { RecitationBar } from '../recitation/RecitationBar'
import { useRecitation } from '../recitation/useRecitation'

// ---------- the reader's own settings, kept in this browser only ----------

const SIZES = [
  ['صغير', '1.6rem'],
  ['متوسط', '2rem'],
  ['كبير', '2.5rem'],
] as const
type Size = (typeof SIZES)[number][0]
const SIZE_KEY = 'qv.readSize'
const LAST_KEY = 'qv.lastRead'

function stored<T>(key: string, ok: (v: unknown) => v is T): T | null {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(key) ?? 'null')
    return ok(v) ? v : null
  } catch {
    return null
  }
}
function store(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    // private windows and blocked storage: the setting simply is not kept
  }
}
const isSize = (v: unknown): v is Size => SIZES.some(([s]) => s === v)
interface Last {
  surah: number
  ayah: number
}
const isLast = (v: unknown): v is Last =>
  typeof v === 'object' &&
  v !== null &&
  Number.isInteger((v as Last).surah) &&
  Number.isInteger((v as Last).ayah)

// ---------- the list of surahs ----------

function Index({ surahs }: { surahs: Surah[] }) {
  const [last] = useState(() => stored(LAST_KEY, isLast))
  const lastSurah = last ? surahs[last.surah - 1] : undefined
  useEffect(() => {
    document.title = 'القراءة · آيات مرئية'
    return () => {
      document.title = 'آيات مرئية'
    }
  }, [])

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-4xl font-bold text-gold-soft">القراءة</h1>
      <p className="mt-3 max-w-3xl leading-relaxed text-mist">
        السورة كاملة بخط مجمع الملك فهد، مع التلاوة بصوت من تختار من القرّاء، تتابع الآية المقروءة.
      </p>
      {lastSurah && last && (
        <Link
          to={`/read/${lastSurah.id}${last.ayah > 1 ? `#${last.ayah}` : ''}`}
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-gold/20 px-5 text-gold-soft hover:bg-gold/30"
        >
          تابع القراءة: سورة {lastSurah.name}
          {last.ayah > 1 && <>، الآية {toArabicDigits(last.ayah)}</>}
        </Link>
      )}
      <ol className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {surahs.map((s) => (
          <li key={s.id}>
            <Link
              to={`/read/${s.id}`}
              className="page flex h-full items-center gap-3 rounded-md px-4 py-3 hover:ring-2 hover:ring-gold/50"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full border border-[#cdb67a] text-sm text-ink-soft">
                {toArabicDigits(s.id)}
              </span>
              <span>
                <span className="block font-display text-xl font-bold text-ink">{s.name}</span>
                <span className="block text-xs text-ink-soft">
                  {revelationLabel(s.revelation)} · {countOf(s.ayahs, AYAH)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  )
}

// ---------- one surah ----------

function Reader({ surah, surahs }: { surah: Surah; surahs: Surah[] }) {
  const text = useAsync(() => loadSurahText(surah.id), String(surah.id))
  const recitation = useRecitation(surah.id, surah.name, surah.ayahs)
  const { hash } = useLocation()
  const target = /^#\d+$/.test(hash) ? Number(hash.slice(1)) : null
  const goTo = target && target >= 1 && target <= surah.ayahs ? target : null
  const [size, setSize] = useState<Size>(() => stored(SIZE_KEY, isSize) ?? 'متوسط')
  const fontSize = SIZES.find(([s]) => s === size)![1]
  const reciting = recitation.step && !recitation.step.basmala ? recitation.step.ayah : null
  const prev = surahs[surah.id - 2]
  const next = surahs[surah.id]

  useEffect(() => {
    document.title = `سورة ${surah.name} · القراءة · آيات مرئية`
    return () => {
      document.title = 'آيات مرئية'
    }
  }, [surah.name])

  // where the reader is, for «تابع القراءة»
  useEffect(() => {
    store(LAST_KEY, { surah: surah.id, ayah: reciting ?? goTo ?? 1 })
  }, [surah.id, reciting, goTo])

  // an address pointing at an ayah: bring it into view once the mushaf font has laid the text out
  useEffect(() => {
    if (!goTo || text.status !== 'ready') return
    let live = true
    void document.fonts.ready.then(() => {
      if (live) document.getElementById(`a${goTo}`)?.scrollIntoView({ block: 'start' })
    })
    return () => {
      live = false
    }
  }, [goTo, text.status])

  return (
    <div className="mx-auto max-w-4xl px-3 pb-10 sm:px-6">
      {/* kept in view on wide screens; on a phone it would hide too much of the text */}
      <div className="z-10 -mx-3 bg-night/90 px-3 py-2 backdrop-blur sm:sticky sm:top-0 sm:-mx-6 sm:px-6">
        <div className="page rounded-md px-3 py-2">
          <RecitationBar r={recitation} ayahCount={surah.ayahs} />
        </div>
      </div>

      <nav
        aria-label="مسار الصفحة"
        className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-mist"
      >
        <span className="flex items-center gap-1">
          <Link
            to="/read"
            className="inline-flex min-h-11 items-center rounded-full px-3 hover:bg-gold/10 hover:text-vellum"
          >
            القراءة
          </Link>
          <span aria-hidden>›</span>
          <span className="px-2 text-vellum" aria-current="page">
            سورة {surah.name}
          </span>
        </span>
        <span role="group" aria-label="حجم الخط" className="flex items-center">
          {SIZES.map(([s], i) => (
            <button
              key={s}
              type="button"
              aria-pressed={size === s}
              aria-label={`خط ${s}`}
              title={`خط ${s}`}
              onClick={() => {
                setSize(s)
                store(SIZE_KEY, s)
              }}
              className={`grid min-h-11 min-w-11 place-items-center rounded-full font-quran leading-none ${
                size === s ? 'bg-gold/20 text-gold-soft' : 'text-mist hover:text-vellum'
              }`}
              style={{ fontSize: `${0.85 + i * 0.3}rem` }}
            >
              <span aria-hidden>أ</span>
            </button>
          ))}
        </span>
      </nav>

      <article
        className="page mt-2 rounded-md px-5 pb-8 pt-6 sm:px-12"
        aria-labelledby="surah-name"
      >
        <header className="rounded border-y-4 border-double border-[#b8994f] bg-vellum-deep/60 px-4 py-3 text-center">
          <h1 id="surah-name" className="font-display text-3xl font-bold text-ink">
            سورة {surah.name}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {revelationLabel(surah.revelation)} · {countOf(surah.ayahs, AYAH)} · رقمها في المصحف{' '}
            {toArabicDigits(surah.id)}
          </p>
        </header>

        {text.status === 'loading' && (
          <p className="mt-6 text-center text-ink-soft">جارٍ تحميل السورة…</p>
        )}
        {text.status === 'error' && (
          <p className="mt-6 text-center text-ink-soft">تعذّر تحميل السورة. أعد المحاولة لاحقاً.</p>
        )}
        {text.status === 'ready' && (
          <div className="mt-5">
            {showsBasmalaHeader(surah.id) && (
              <p
                className={`ayah text-center ${recitation.step?.basmala ? 'rounded bg-[#efe0b4]' : ''}`}
                style={{ fontSize }}
              >
                {BASMALA}
              </p>
            )}
            <WordExplorer
              surah={surah.id}
              ayahs={text.data.ayahs}
              activeAyah={reciting ?? (recitation.step ? null : goTo)}
              onPlayFrom={recitation.start}
              fontSize={fontSize}
              anchors
              cardClass="-mx-5 px-5 sm:-mx-12 sm:px-12"
            />
          </div>
        )}
        <p className="mt-4 text-sm text-ink-soft">
          اختر رقم أي آية لتبدأ التلاوة منها، وأي كلمة لمعرفة جذرها ووزنها.{' '}
          <Link to={`/surah/${surah.id}`} className="underline underline-offset-4">
            تفاصيل السورة
          </Link>
        </p>
        <ReviewLink subject={`سورة ${surah.name} في صفحة القراءة`} />
      </article>

      <nav aria-label="السور المجاورة" className="mt-4 flex justify-between gap-3 text-sm">
        {prev ? (
          <Link
            to={`/read/${prev.id}`}
            rel="prev"
            className="inline-flex min-h-11 items-center rounded-full px-3 text-mist hover:bg-gold/10 hover:text-vellum"
          >
            → سورة {prev.name}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            to={`/read/${next.id}`}
            rel="next"
            className="inline-flex min-h-11 items-center rounded-full px-3 text-mist hover:bg-gold/10 hover:text-vellum"
          >
            سورة {next.name} ←
          </Link>
        )}
      </nav>
    </div>
  )
}

export default function ReadPage() {
  const state = useAsync(loadSurahs, 'surahs')
  const { id } = useParams()
  if (state.status === 'loading') return <Loading />
  if (state.status === 'error') return <ErrorNote error={state.error} />
  const surahs = state.data.surahs
  if (id === undefined)
    return (
      <div className="absolute inset-0 overflow-y-auto">
        <Index surahs={surahs} />
      </div>
    )
  const surah = /^\d+$/.test(id) ? surahs[Number(id) - 1] : undefined
  if (!surah) return <Navigate to="/read" replace />
  return (
    <div className="absolute inset-0 overflow-y-auto">
      <Reader key={surah.id} surah={surah} surahs={surahs} />
    </div>
  )
}
