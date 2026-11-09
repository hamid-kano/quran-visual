import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import type { Surah } from '../../data/schemas'
import { loadFrequency, loadLexicon, loadSurahs } from '../../data/load'
import { useAsync } from '../../data/useAsync'
import { ErrorNote, Loading } from '../../components/Status'
import { ReviewLink } from '../../components/ReviewLink'
import { Picker } from '../../components/Picker'
import { surahOption, type PickerOption } from '../../lib/picker'
import {
  ENTRY,
  ROOT,
  SURAH,
  WORD,
  countOf,
  formatNumber,
  spacedRoot,
  toArabicDigits,
} from '../../lib/arabic'
import { rank, type Kind, type Scope, type Unit } from '../../lib/frequency'

const STEP = 30

const KINDS: [Kind, string][] = [
  ['NV', 'الأسماء والأفعال'],
  ['N', 'الأسماء'],
  ['V', 'الأفعال'],
  ['P', 'الحروف'],
]

const parseScope = (v: string | null): Scope => {
  if (v === 'meccan' || v === 'medinan') return v
  const n = Number(v)
  return Number.isInteger(n) && n >= 1 && n <= 114 ? n : 'all'
}

const scopeName = (scope: Scope, surahs: Surah[]) =>
  scope === 'all'
    ? 'المصحف كله'
    : scope === 'meccan'
      ? 'السور المكية'
      : scope === 'medinan'
        ? 'السور المدنية'
        : `سورة ${surahs[scope - 1]!.name}`

function Chip({
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
      className={`tap min-h-11 rounded-full px-4 text-sm transition-colors ${
        pressed ? 'bg-gold/20 text-gold-soft' : 'text-mist hover:text-vellum'
      }`}
    >
      {children}
    </button>
  )
}

/** The most frequent words of the Quran, in the whole mushaf, a group of surahs, or one surah. */
export default function TopWordsPage() {
  const data = useAsync(
    () => Promise.all([loadLexicon(), loadFrequency(), loadSurahs()]),
    'top-words',
  )
  if (data.status === 'loading') return <Loading />
  if (data.status === 'error') return <ErrorNote error={data.error} />
  const [lex, freq, index] = data.data
  return <Ranking lex={lex} bySurah={freq.bySurah} surahs={index.surahs} />
}

function Ranking({
  lex,
  bySurah,
  surahs,
}: {
  lex: Awaited<ReturnType<typeof loadLexicon>>
  bySurah: number[][]
  surahs: Surah[]
}) {
  const [params, setParams] = useSearchParams()
  const unit: Unit = params.get('by') === 'root' ? 'root' : 'lemma'
  const kind = (KINDS.some(([k]) => k === params.get('kind')) ? params.get('kind') : 'NV') as Kind
  const scope = parseScope(params.get('in'))
  const set = (k: string, v: string | null) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p)
        if (v) n.set(k, v)
        else n.delete(k)
        return n
      },
      { replace: true },
    )

  const scopeOptions = useMemo<PickerOption[]>(
    () => [
      { value: 'all', label: 'المصحف كله', group: 'المصحف' },
      { value: 'meccan', label: 'السور المكية', group: 'المصحف', keywords: 'مكي' },
      { value: 'medinan', label: 'السور المدنية', group: 'المصحف', keywords: 'مدني' },
      ...surahs.map((s) => surahOption(s, 'سورة واحدة')),
    ],
    [surahs],
  )

  const list = useMemo(() => {
    const inScope =
      scope === 'all'
        ? () => true
        : scope === 'meccan' || scope === 'medinan'
          ? (s: number) => surahs[s - 1]!.revelation === scope
          : (s: number) => s === scope
    return rank(lex.entries, bySurah, inScope, unit, kind)
  }, [lex.entries, bySurah, surahs, scope, unit, kind])
  const total = list.reduce((a, x) => a + x.count, 0)
  const scopeSurahs =
    scope === 'all'
      ? 114
      : typeof scope === 'number'
        ? 1
        : surahs.filter((s) => s.revelation === scope).length

  // how many rows are shown, for the current choice (a new choice starts over)
  const sig = `${unit}|${kind}|${scope}`
  const [paging, setPaging] = useState({ sig, n: STEP })
  const shown = paging.sig === sig ? paging.n : STEP
  const max = list[0]?.count ?? 1

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 2xl:max-w-5xl">
      <nav aria-label="مسار التصفح" className="text-sm text-mist">
        <Link to="/words" className="hover:text-vellum">
          معجم الألفاظ
        </Link>
        <span aria-hidden> › </span>
        <span>الأكثر وروداً</span>
      </nav>
      <h1 className="mt-2 font-display text-4xl font-bold text-gold-soft">الألفاظ الأكثر وروداً</h1>
      <p className="mt-3 max-w-3xl leading-relaxed text-mist">
        ترتيب ألفاظ القرآن الكريم بعدد ورودها، في المصحف كله أو في السور المكية أو المدنية أو في
        سورة واحدة، بمداخلها في معجم الألفاظ أو بجذورها. والأعداد محسوبة من نص المصحف وتحليله
        الصرفي، وطريقة العدّ مبيّنة في آخر الصفحة.
      </p>

      <div className="mt-6 space-y-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div role="group" aria-label="العدّ" className="flex flex-wrap">
            <Chip pressed={unit === 'lemma'} onClick={() => set('by', null)}>
              بالمدخل
            </Chip>
            <Chip pressed={unit === 'root'} onClick={() => set('by', 'root')}>
              بالجذر
            </Chip>
          </div>
          <div className="flex min-w-0 flex-1 basis-56 items-center gap-2">
            <span className="shrink-0 text-sm text-mist" aria-hidden>
              في
            </span>
            <Picker
              label="النطاق"
              value={String(scope)}
              options={scopeOptions}
              onChange={(v) => set('in', v === 'all' ? null : v)}
              placeholder="ابحث باسم السورة أو رقمها"
            />
          </div>
        </div>
        {unit === 'lemma' && (
          <div role="group" aria-label="نوع اللفظ" className="flex flex-wrap">
            {KINDS.map(([k, label]) => (
              <Chip key={k} pressed={kind === k} onClick={() => set('kind', k === 'NV' ? null : k)}>
                {label}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <p className="mt-5 text-sm text-mist" aria-live="polite">
        في {scopeName(scope, surahs)}: {countOf(list.length, unit === 'root' ? ROOT : ENTRY)}، مجموع
        ورودها {countOf(total, WORD)}.
      </p>

      <ol className="mt-3 space-y-1.5">
        {list.slice(0, shown).map((x, i) => {
          const to =
            unit === 'root'
              ? `/roots/${encodeURIComponent(x.key)}`
              : `/words/${encodeURIComponent(x.key)}`
          const label = `${unit === 'root' ? `الجذر ${spacedRoot(x.label)}` : x.label}: ${countOf(x.count, WORD)} في ${countOf(x.surahs, SURAH)}`
          return (
            <li key={x.key}>
              <Link
                to={to}
                aria-label={label}
                className="tap group grid grid-cols-[2.25rem_1fr_auto] items-center gap-x-3 rounded-lg px-2 py-2 hover:bg-white/5 active:bg-white/10"
              >
                <span className="text-center text-sm tabular-nums text-mist">
                  {toArabicDigits(i + 1)}
                </span>
                <span className="min-w-0">
                  <span className="flex items-baseline gap-2">
                    {unit === 'root' ? (
                      <span className="font-display text-xl font-bold text-vellum">
                        {spacedRoot(x.label)}
                      </span>
                    ) : (
                      <span className="font-quran text-2xl leading-snug text-vellum">
                        {x.label}
                      </span>
                    )}
                    <span className="truncate text-xs text-mist">
                      {unit === 'root'
                        ? countOf(x.entries, ENTRY)
                        : `${x.kind}${x.root ? ` · ${spacedRoot(x.root)}` : ''}`}
                    </span>
                  </span>
                  {/* the bar: this word's count against the first in the list */}
                  <span className="mt-1 block h-1.5 rounded-full bg-white/5" aria-hidden>
                    <span
                      className="block h-full rounded-full bg-gold/80 group-hover:bg-gold-soft"
                      style={{ width: `${Math.max((x.count / max) * 100, 0.8)}%` }}
                    />
                  </span>
                </span>
                <span className="text-end leading-tight">
                  <span className="block font-semibold tabular-nums text-vellum">
                    {formatNumber(x.count)}
                  </span>
                  {scopeSurahs > 1 && (
                    <span className="block text-xs text-mist">
                      في {formatNumber(x.surahs)} من {formatNumber(scopeSurahs)}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
      {shown < list.length && (
        <button
          type="button"
          onClick={() => setPaging({ sig, n: shown + STEP })}
          className="tap mt-4 min-h-11 w-full rounded-full border border-gold/30 text-gold-soft hover:bg-gold/10"
        >
          عرض المزيد ({formatNumber(Math.min(STEP, list.length - shown))} من{' '}
          {formatNumber(list.length - shown)} باقية)
        </button>
      )}

      <section aria-labelledby="method" className="mt-10 rounded-xl border border-gold/15 p-5">
        <h2 id="method" className="font-display text-xl font-bold text-gold-soft">
          طريقة العدّ
        </h2>
        <ul className="mt-3 list-disc space-y-2 ps-5 text-sm leading-relaxed text-mist">
          <li>
            تُعدّ كل كلمة من كلمات المصحف مرة واحدة، تحت مدخلها في معجم الألفاظ كما في المدوّنة
            القرآنية العربية (Quranic Arabic Corpus). فتُعدّ «قالَ» و«يقولون» و«قُل» في مدخل «قالَ»،
            والسوابق كالواو والفاء والباء و«ال» جزء من الكلمة لا ألفاظ مستقلة.
          </li>
          <li>
            العدّ بالجذر يجمع المداخل التي تشترك في جذر واحد، فيُعدّ «رَحْمَة» و«الرَّحْمٰن»
            و«رَحِيم» في الجذر «ر ح م». وتخرج منه الكلمات التي لا جذر لها، وأكثرها حروف.
          </li>
          <li>
            لا تُعدّ الكلمات التي لا تنسبها المدوّنة إلى مدخل: الضمائر المستقلة مثل «هُمۡ»
            و«لَهُمۡ»، والحروف المقطّعة في أوائل السور.
          </li>
          <li>
            في المصحف كلمة واحدة مكتوبة تجمع اسمين لهما جذران: «يَبۡنَؤُمَّ» (طه: ٩٤)، أي «يا ابنَ
            أُمَّ». وتُعدّ هنا مرة واحدة في «ابن»، فيقلّ عدد الجذر «أ م م» واحداً عمّا في شبكة
            الجذور، التي تعدّ كل جذر في الكلمة.
          </li>
          <li>
            قد تختلف هذه الأعداد عمّا في كتب الإحصاء، مثل «المعجم المفهرس لألفاظ القرآن الكريم»
            لمحمد فؤاد عبد الباقي، لاختلاف طريقة العدّ ووحدته. لذلك لا يُبنى على تساوي عددين أو
            تناسبهما حكم، فذلك يتغيّر بتغيّر طريقة العدّ.
          </li>
          <li>
            تصنيف السور مكيةً ومدنيةً وفق بيانات مشروع تنزيل، كما في المنصة كلها، وفي بعض السور خلاف
            معروف بين العلماء. وتفصيله في صفحة{' '}
            <Link to="/about" className="text-gold-soft underline underline-offset-4">
              المنهج والمصادر
            </Link>
            .
          </li>
        </ul>
        <ReviewLink subject="الألفاظ الأكثر وروداً" tone="dark" />
      </section>
    </div>
  )
}
