import { useState } from 'react'
import { Link } from 'react-router'
import type { Surah } from '../../data/schemas'
import { loadSurahText } from '../../data/load'
import { useAsync } from '../../data/useAsync'
import {
  AYAH,
  countOf,
  formatNumber,
  formatPercent,
  revelationLabel,
  toArabicDigits,
} from '../../lib/arabic'
import { WordExplorer } from '../../components/WordExplorer'
import { RecitationBar } from '../recitation/RecitationBar'
import { useRecitation } from '../recitation/useRecitation'
import { RootLetters } from '../../components/RootLetters'
import { ReviewLink } from '../../components/ReviewLink'
import { SurahTopics } from '../topics/TopicRefs'
import { BASMALA, showsBasmalaHeader } from '../../lib/quran'

const PREVIEW = 5

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="font-display text-xl font-bold text-ink">{value}</dd>
    </div>
  )
}

export function SurahPanel({
  surah,
  byId,
  onSelect,
  onClose,
}: {
  surah: Surah
  byId: Map<number, Surah>
  onSelect: (id: number) => void
  onClose: () => void
}) {
  const [full, setFull] = useState(false)
  const recitation = useRecitation(surah.id, surah.name, surah.ayahs)
  const text = useAsync(() => loadSurahText(surah.id), String(surah.id))

  return (
    <article
      className="page scrollbar-thin h-full overflow-y-auto rounded-md px-6 pb-8 pt-6"
      aria-labelledby="surah-title"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-soft">سورة رقم {toArabicDigits(surah.id)}</p>
          <h2 id="surah-title" className="font-display text-4xl font-bold leading-tight text-ink">
            سورة {surah.name}
          </h2>
          <p className="mt-1 text-ink-soft" dir="ltr" lang="en">
            {surah.transliteration}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-full px-3 text-sm text-ink-soft hover:bg-vellum-deep hover:text-ink"
        >
          إغلاق
        </button>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-x-4 gap-y-3 border-y border-[#d8c48e] py-4">
        <Fact label="النزول" value={revelationLabel(surah.revelation)} />
        <Fact label="ترتيب النزول" value={toArabicDigits(surah.order)} />
        <Fact label="تبدأ في الجزء" value={toArabicDigits(surah.juz)} />
        <Fact label="الآيات" value={toArabicDigits(surah.ayahs)} />
        <Fact label="الكلمات" value={formatNumber(surah.words)} />
      </dl>

      <section className="mt-6" aria-labelledby="key-roots">
        <h3 id="key-roots" className="font-display text-xl font-bold text-ink">
          جذور تميّز السورة
        </h3>
        <p className="mt-1 text-sm text-ink-soft">
          الأكثر حضوراً فيها مقارنةً ببقية السور. اختر جذراً لتتبّعه في القرآن كله.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {surah.keyRoots.map((r) => (
            <li key={r.root}>
              <Link
                to={`/roots/${encodeURIComponent(r.root)}`}
                className="inline-flex items-baseline gap-2 rounded-full border border-[#cdb67a] px-3 py-1 hover:bg-vellum-deep"
              >
                <RootLetters root={r.root} className="font-display text-xl font-bold text-ink" />
                <span className="text-xs text-ink-soft">{toArabicDigits(r.count)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6" aria-labelledby="surah-topics">
        <h3 id="surah-topics" className="font-display text-xl font-bold text-ink">
          موضوعاتها
        </h3>
        <SurahTopics surah={surah.id} ayahCount={surah.ayahs} />
      </section>

      <section className="mt-6" aria-labelledby="near">
        <h3 id="near" className="font-display text-xl font-bold text-ink">
          أقرب السور إليها في المعجم
        </h3>
        <p className="mt-1 text-sm text-ink-soft">نسبة اشتراك الجذور المميِّزة بين السورتين.</p>
        <ol className="mt-3 space-y-1.5">
          {surah.neighbors.map((n) => {
            const o = byId.get(n.surah)!
            return (
              <li key={n.surah}>
                <button
                  type="button"
                  onClick={() => onSelect(n.surah)}
                  className="group flex w-full items-center gap-3 rounded px-1 py-1 text-right hover:bg-vellum-deep"
                >
                  <span className="w-24 shrink-0 font-display text-lg text-ink">{o.name}</span>
                  <span className="relative h-1.5 flex-1 rounded-full bg-vellum-deep" aria-hidden>
                    <span
                      className="absolute inset-y-0 right-0 rounded-full bg-[#a6852f]"
                      style={{ width: `${Math.min(100, n.similarity * 100)}%` }}
                    />
                  </span>
                  <span className="w-10 shrink-0 text-left text-sm text-ink-soft">
                    {formatPercent(n.similarity)}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </section>

      <section className="mt-7" aria-labelledby="text">
        <h3 id="text" className="font-display text-xl font-bold text-ink">
          {full ? 'نص السورة' : 'مطلع السورة'}
        </h3>
        <p className="mt-1 text-sm text-ink-soft">
          اختر أي كلمة لمعرفة جذرها ووزنها، ومنها تنتقل إلى صفحة آيتها.
        </p>
        <div className="mt-3">
          <RecitationBar r={recitation} ayahCount={surah.ayahs} />
        </div>
        {text.status === 'loading' && <p className="mt-3 text-ink-soft">جارٍ تحميل النص…</p>}
        {text.status === 'error' && (
          <p className="mt-3 text-ink-soft">تعذّر تحميل النص. أعد المحاولة لاحقاً.</p>
        )}
        {text.status === 'ready' && (
          <div className="mt-3">
            {showsBasmalaHeader(surah.id) && (
              <p
                className={`ayah text-center ${recitation.step?.basmala ? 'rounded bg-[#efe0b4]' : ''}`}
              >
                {BASMALA}
              </p>
            )}
            <WordExplorer
              surah={surah.id}
              ayahs={full || recitation.step ? text.data.ayahs : text.data.ayahs.slice(0, PREVIEW)}
              activeAyah={recitation.step && !recitation.step.basmala ? recitation.step.ayah : null}
              onPlayFrom={recitation.start}
            />
            <Link
              to={`/read/${surah.id}`}
              className="mt-2 me-2 inline-flex rounded-full bg-[#ead9a8] px-4 py-1.5 text-sm text-ink hover:bg-[#e2cd92]"
            >
              اقرأ السورة في صفحة القراءة
            </Link>
            {text.data.ayahs.length > PREVIEW && (
              <button
                type="button"
                onClick={() => setFull((f) => !f)}
                className="mt-2 rounded-full border border-[#cdb67a] px-4 py-1.5 text-sm text-ink hover:bg-vellum-deep"
              >
                {full ? 'عرض المطلع فقط' : `عرض السورة كاملة (${countOf(surah.ayahs, AYAH)})`}
              </button>
            )}
          </div>
        )}
      </section>
      <ReviewLink subject={`سورة ${surah.name}`} />
    </article>
  )
}
