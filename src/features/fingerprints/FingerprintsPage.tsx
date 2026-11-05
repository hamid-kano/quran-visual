import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { ReviewLink } from '../../components/ReviewLink'
import { loadFingerprints, loadSurahText, loadSurahs } from '../../data/load'
import { useAsync } from '../../data/useAsync'
import type { Fingerprint, Surah } from '../../data/schemas'
import { ErrorNote, Loading } from '../../components/Status'
import { AyahMark } from '../../components/AyahText'
import { AYAH, WORD, countOf, revelationLabel, toArabicDigits } from '../../lib/arabic'
import { FingerprintGlyph } from './FingerprintGlyph'
import { ENDING_COLORS, OTHER_ENDING, endingColor, endingCounts } from './endings'

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-mist">
      {Object.entries(ENDING_COLORS).map(([ch, color]) => (
        <li key={ch} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: color }} />
          <span className="font-display text-lg leading-none text-vellum">{ch}</span>
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full" style={{ background: OTHER_ENDING }} />
        حروف أخرى
      </li>
    </ul>
  )
}

function Gallery({ surahs, fps }: { surahs: Surah[]; fps: Fingerprint[] }) {
  const [order, setOrder] = useState<'mushaf' | 'revelation'>('mushaf')
  const list = useMemo(
    () => (order === 'mushaf' ? surahs : [...surahs].sort((a, b) => a.order - b.order)),
    [surahs, order],
  )
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="max-w-3xl">
        <h1 className="font-display text-4xl font-bold text-gold-soft">بصمات السور</h1>
        <p className="mt-3 text-[1.05rem] leading-relaxed text-mist">
          لكل سورة بصمة من آياتها: كل خط آية، تبدأ من الأعلى وتدور عكس عقارب الساعة. يطول الخط بعدد
          كلمات الآية نسبةً إلى أطول آية في السورة نفسها، ولونه الحرف الذي تنتهي به الآية.
        </p>
        <div className="mt-4">
          <Legend />
        </div>
        <div className="mt-4 flex gap-1" role="group" aria-label="ترتيب العرض">
          {(['mushaf', 'revelation'] as const).map((o) => (
            <button
              key={o}
              type="button"
              aria-pressed={order === o}
              onClick={() => setOrder(o)}
              className={`rounded-full px-3 py-1 text-sm ${
                order === o ? 'bg-gold/20 text-gold-soft' : 'text-mist hover:text-vellum'
              }`}
            >
              {o === 'mushaf' ? 'ترتيب المصحف' : 'ترتيب النزول'}
            </button>
          ))}
        </div>
      </header>
      <ol className="mt-8 grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {list.map((s) => (
          <li key={s.id}>
            <Link
              to={`/fingerprints/${s.id}`}
              className="group block rounded-xl p-1.5 transition-colors hover:bg-gold/10"
            >
              <FingerprintGlyph fp={fps[s.id - 1]!} size={120} title={`بصمة سورة ${s.name}`} />
              <p className="mt-1 text-center font-display text-lg text-vellum group-hover:text-gold-soft">
                {s.name}
              </p>
              <p className="text-center text-xs text-mist">
                {toArabicDigits(order === 'mushaf' ? s.id : s.order)}
              </p>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  )
}

function Detail({ surah, fp, surahs }: { surah: Surah; fp: Fingerprint; surahs: Surah[] }) {
  const [active, setActive] = useState<number>(1)
  const text = useAsync(() => loadSurahText(surah.id), String(surah.id))
  const counts = endingCounts(fp.endings)
  const prev = surahs[surah.id - 2]
  const next = surahs[surah.id]
  const ayah = text.status === 'ready' ? text.data.ayahs[active - 1] : undefined

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
      <section aria-label="البصمة" className="mx-auto w-full max-w-[34rem]">
        <FingerprintGlyph
          fp={fp}
          size={520}
          active={active}
          onActive={(a) => a && setActive(a)}
          title={`بصمة سورة ${surah.name}، ${countOf(surah.ayahs, AYAH)}`}
        />
        <p className="mt-2 text-center text-sm text-mist">
          مرّر على الخطوط أو انقرها لقراءة الآية.
        </p>
      </section>

      <article className="page rounded-md px-6 py-6">
        <nav className="flex justify-between text-sm text-ink-soft" aria-label="السور المجاورة">
          {prev ? <Link to={`/fingerprints/${prev.id}`}>→ سورة {prev.name}</Link> : <span />}
          <Link to="/fingerprints">كل البصمات</Link>
          {next ? <Link to={`/fingerprints/${next.id}`}>سورة {next.name} ←</Link> : <span />}
        </nav>
        <h1 className="mt-4 font-display text-4xl font-bold text-ink">سورة {surah.name}</h1>
        <p className="mt-1 text-ink-soft">
          {revelationLabel(surah.revelation)}، {countOf(surah.ayahs, AYAH)}،{' '}
          {countOf(surah.words, WORD)}
        </p>

        <h2 className="mt-6 font-display text-xl font-bold">حروف الفواصل</h2>
        <p className="mt-1 text-sm text-ink-soft">الحرف الأخير من كل آية في رسمها.</p>
        <ul className="mt-3 space-y-1.5">
          {counts.slice(0, 6).map(([ch, n]) => (
            <li key={ch} className="flex items-center gap-3">
              <span className="w-6 text-center font-display text-2xl leading-none">{ch}</span>
              <span className="relative h-2 flex-1 rounded-full bg-vellum-deep" aria-hidden>
                <span
                  className="absolute inset-y-0 right-0 rounded-full"
                  style={{
                    width: `${(n / fp.endings.length) * 100}%`,
                    background: endingColor(ch),
                  }}
                />
              </span>
              <span className="w-16 text-left text-sm text-ink-soft">{countOf(n, AYAH)}</span>
            </li>
          ))}
        </ul>

        <h2 className="mt-6 font-display text-xl font-bold">الآية {toArabicDigits(active)}</h2>
        <p className="text-sm text-ink-soft">
          {countOf(fp.lengths[active - 1] ?? 0, WORD)}، تنتهي بحرف{' '}
          <span className="font-display text-lg text-ink">{fp.endings[active - 1]}</span>
        </p>
        <p className="ayah mt-2 min-h-[5rem]" aria-live="polite">
          {ayah ? (
            <>
              {ayah.text} <AyahMark n={ayah.n} />
            </>
          ) : (
            '…'
          )}
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={active <= 1}
            onClick={() => setActive((a) => Math.max(1, a - 1))}
            className="rounded-full border border-[#cdb67a] px-3 py-1 text-sm disabled:opacity-40"
          >
            الآية السابقة
          </button>
          <button
            type="button"
            disabled={active >= surah.ayahs}
            onClick={() => setActive((a) => Math.min(surah.ayahs, a + 1))}
            className="rounded-full border border-[#cdb67a] px-3 py-1 text-sm disabled:opacity-40"
          >
            الآية التالية
          </button>
        </div>
        <Link
          to={`/surah/${surah.id}`}
          className="mt-6 inline-block text-sm text-[#7a5a12] underline underline-offset-4"
        >
          عرض السورة في المجرّة
        </Link>
        <ReviewLink subject={`بصمة سورة ${surah.name}`} />
      </article>
    </div>
  )
}

export default function FingerprintsPage() {
  const state = useAsync(() => Promise.all([loadSurahs(), loadFingerprints()]), 'fingerprints')
  const { id } = useParams()
  if (state.status === 'loading') return <Loading />
  if (state.status === 'error') return <ErrorNote error={state.error} />
  const [{ surahs }, fps] = state.data
  const n = Number(id)
  const surah = id ? surahs[n - 1] : undefined
  if (id && !surah) return <Navigate to="/fingerprints" replace />
  return (
    <div className="absolute inset-0 overflow-y-auto">
      {surah ? (
        <Detail key={surah.id} surah={surah} fp={fps[surah.id - 1]!} surahs={surahs} />
      ) : (
        <Gallery surahs={surahs} fps={fps} />
      )}
    </div>
  )
}
