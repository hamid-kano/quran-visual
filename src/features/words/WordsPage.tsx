import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import type { Lexicon, LexiconIndexEntry, Surah } from '../../data/schemas'
import { loadLexEntry, loadLexicon, loadSurahs } from '../../data/load'
import { useAsync } from '../../data/useAsync'
import { ErrorNote, Loading } from '../../components/Status'
import { Distribution, OccurrenceList } from '../../components/AyahRefs'
import { RootLetters } from '../../components/RootLetters'
import { ReviewLink } from '../../components/ReviewLink'
import { AYAH, ENTRY, SURAH, TIME, WORD, countOf, formatNumber, spacedRoot } from '../../lib/arabic'
import { filterLexicon, type LexSort, type LexType } from '../../lib/lexiconSearch'

/** A word quoted from the mushaf, in its script. */
const Q = ({ children }: { children: string }) => (
  <span className="font-quran text-[1.1em]">{children}</span>
)

const PAGE = 120
const TYPES: [LexType, string][] = [
  ['all', 'الكل'],
  ['N', 'الأسماء'],
  ['V', 'الأفعال'],
  ['P', 'الحروف'],
]
const wordPath = (slug: string) => `/words/${encodeURIComponent(slug)}`

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
      className={`min-h-11 rounded-full px-4 text-sm transition-colors ${
        pressed ? 'bg-gold/20 text-gold-soft' : 'text-mist hover:text-vellum'
      }`}
    >
      {children}
    </button>
  )
}

function Index({ lex }: { lex: Lexicon }) {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const type = (
    ['N', 'V', 'P'].includes(params.get('type') ?? '') ? params.get('type') : 'all'
  ) as LexType
  const sort: LexSort = params.get('sort') === 'alpha' ? 'alpha' : 'count'
  // how many are shown, for the current query, type and order (a new filter starts over)
  const sig = `${query}|${type}|${sort}`
  const [paging, setPaging] = useState({ sig, n: PAGE })
  const shown = paging.sig === sig ? paging.n : PAGE
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
  const list = useMemo(
    () => filterLexicon(lex.entries, query, type, sort),
    [lex.entries, query, type, sort],
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-4xl font-bold text-gold-soft">معجم الألفاظ</h1>
      <p className="mt-3 max-w-3xl leading-relaxed text-mist">
        ألفاظ القرآن الكريم بمداخلها المعجمية كما في المدوّنة القرآنية العربية: كل كلمة تُردّ إلى
        مدخلها، فتُعدّ «<Q>رَحْمَتِهِۦ</Q>» و«<Q>بِرَحۡمَةٖ</Q>» في «<Q>رَحْمَة</Q>»، والسوابق مثل
        الواو والفاء والباء و«ال» جزء من الكلمة لا ألفاظ مستقلة. وفيه{' '}
        {countOf(lex.entries.length, ENTRY)} تشمل {countOf(lex.counted, WORD)} من كلمات المصحف
        البالغة {countOf(lex.words, WORD)}. أما الباقي فلا تنسبه المدوّنة إلى مدخل: الكلمات التي
        أصلها ضمير، مثل «<Q>هُمۡ</Q>» و«<Q>لَهُمۡ</Q>» و«<Q>فَهُوَ</Q>»، والحروف المقطّعة في أوائل
        السور. وتُعدّ «<Q>إِلۡ يَاسِينَ</Q>» اسماً واحداً وإن كُتب كلمتين.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="relative min-w-0 flex-1 basis-64">
          <span className="sr-only">ابحث في المعجم</span>
          <input
            type="search"
            value={query}
            onChange={(e) => set('q', e.target.value || null)}
            placeholder="ابحث بلفظ أو جذر، مثل: رحمة، صبر، ق و ل"
            className="h-11 w-full rounded-full border border-gold/25 bg-night-deep/60 px-5 text-vellum placeholder:text-mist/70 focus:border-gold/60 focus:outline-none"
          />
        </label>
        <div role="group" aria-label="نوع اللفظ" className="flex flex-wrap">
          {TYPES.map(([t, label]) => (
            <Chip key={t} pressed={type === t} onClick={() => set('type', t === 'all' ? null : t)}>
              {label}
            </Chip>
          ))}
        </div>
        <div role="group" aria-label="الترتيب" className="flex">
          <Chip pressed={sort === 'count'} onClick={() => set('sort', null)}>
            الأكثر وروداً
          </Chip>
          <Chip pressed={sort === 'alpha'} onClick={() => set('sort', 'alpha')}>
            ألفبائياً
          </Chip>
        </div>
      </div>

      <p className="mt-4 text-sm text-mist" aria-live="polite">
        {list.length ? countOf(list.length, ENTRY) : 'لا مدخل يطابق البحث.'}
      </p>
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {list.slice(0, shown).map((e) => (
          <li key={e.slug}>
            <Link
              to={wordPath(e.slug)}
              className="page flex h-full flex-col rounded-md px-4 py-3 hover:ring-2 hover:ring-gold/50"
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-quran text-2xl text-ink">{e.lemma}</span>
                <span className="shrink-0 text-sm text-ink-soft">{formatNumber(e.count)}</span>
              </span>
              <span className="mt-1 text-xs text-ink-soft">
                {e.kind}
                {e.root && <> · {spacedRoot(e.root)}</>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {shown < list.length && (
        <button
          type="button"
          onClick={() => setPaging({ sig, n: shown + PAGE })}
          className="mt-4 min-h-11 rounded-full border border-gold/30 px-5 text-vellum hover:bg-gold/10"
        >
          عرض المزيد (بقي {formatNumber(list.length - shown)})
        </button>
      )}
    </div>
  )
}

function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-7" aria-labelledby={id}>
      <h2 id={id} className="font-display text-xl font-bold text-ink">
        {title}
      </h2>
      {children}
    </section>
  )
}

const FORMS = 24

function Entry({ e, lex, surahs }: { e: LexiconIndexEntry; lex: Lexicon; surahs: Surah[] }) {
  const detail = useAsync(() => loadLexEntry(e.slug), e.slug)
  const [allForms, setAllForms] = useState(false)
  const byId = useMemo(() => new Map(surahs.map((s) => [s.id, s])), [surahs])
  const { list, marks, perSurah } = useMemo(() => {
    const marks = new Map<string, number[]>()
    const list: [number, number][] = []
    const perSurah = new Map<number, number>()
    if (detail.status === 'ready')
      for (const [s, a, w] of detail.data.occ) {
        const k = `${s}:${a}`
        if (!marks.has(k)) list.push([s, a])
        marks.set(k, [...(marks.get(k) ?? []), w])
        perSurah.set(s, (perSurah.get(s) ?? 0) + 1)
      }
    return { list, marks, perSurah }
  }, [detail])
  const kin = useMemo(
    () => (e.root ? lex.entries.filter((x) => x.root === e.root && x.slug !== e.slug) : []),
    [lex.entries, e],
  )

  useEffect(() => {
    document.title = `${e.lemma} · معجم الألفاظ · آيات مرئية`
    return () => {
      document.title = 'آيات مرئية'
    }
  }, [e.lemma])

  const forms = detail.status === 'ready' ? detail.data.forms : []
  const kinds = detail.status === 'ready' ? detail.data.kinds : []
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <nav aria-label="مسار الصفحة" className="flex items-center gap-1 text-sm text-mist">
        <Link
          to="/words"
          className="inline-flex min-h-11 items-center rounded-full px-3 hover:bg-gold/10 hover:text-vellum"
        >
          معجم الألفاظ
        </Link>
        <span aria-hidden>›</span>
        <span className="px-3 text-vellum" aria-current="page">
          {e.lemma}
        </span>
      </nav>

      <article className="page mt-3 rounded-md px-5 pb-8 pt-6 sm:px-8" aria-labelledby="lemma">
        <p className="text-sm text-ink-soft">{e.kind}</p>
        <h1 id="lemma" className="font-quran text-5xl leading-[1.6] text-ink">
          {e.lemma}
        </h1>
        <dl className="mt-4 grid grid-cols-3 gap-4 border-y border-[#d8c48e] py-4">
          <div>
            <dt className="text-sm text-ink-soft">ورد</dt>
            <dd className="font-display text-xl font-bold">{countOf(e.count, TIME)}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-soft">في</dt>
            <dd className="font-display text-xl font-bold">{countOf(e.ayahs, AYAH)}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-soft">من</dt>
            <dd className="font-display text-xl font-bold">{countOf(e.surahs, SURAH)}</dd>
          </div>
        </dl>
        {e.root ? (
          <p className="mt-4">
            <span className="text-ink-soft">جذره </span>
            <Link
              to={`/roots/${encodeURIComponent(e.root)}`}
              className="underline decoration-[#cdb67a] underline-offset-8 hover:decoration-ink"
            >
              <RootLetters root={e.root} className="font-display text-2xl font-bold text-ink" />
            </Link>
          </p>
        ) : (
          <p className="mt-4 text-sm text-ink-soft">لا جذر له في المدوّنة.</p>
        )}
        {kinds.length > 1 && (
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            يرد{' '}
            {kinds.map(([k, n], i) => (
              <span key={k}>
                {i > 0 && '، '}
                {k} ({formatNumber(n)})
              </span>
            ))}
            .
          </p>
        )}

        {detail.status === 'error' && <p className="mt-6 text-ink-soft">تعذّر تحميل المدخل.</p>}
        {detail.status === 'loading' && <p className="mt-6 text-ink-soft">جارٍ التحميل…</p>}

        {forms.length > 0 && (
          <Section id="forms" title="صيغه في المصحف">
            <p className="mt-1 text-sm text-ink-soft">
              بما يتصل به من سوابق ولواحق، مع عدد مرات ورود كل صيغة.
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {(allForms ? forms : forms.slice(0, FORMS)).map(([f, n]) => (
                <li
                  key={f}
                  className="inline-flex items-baseline gap-2 rounded-full border border-[#cdb67a] px-3 py-1"
                >
                  <span className="font-quran text-xl text-ink">{f}</span>
                  <span className="text-xs text-ink-soft">{formatNumber(n)}</span>
                </li>
              ))}
            </ul>
            {forms.length > FORMS && (
              <button
                type="button"
                onClick={() => setAllForms((v) => !v)}
                className="mt-2 rounded-full border border-[#cdb67a] px-4 py-1.5 text-sm text-ink hover:bg-vellum-deep"
              >
                {allForms ? 'عرض أكثرها فقط' : `عرض الصيغ كلها (${formatNumber(forms.length)})`}
              </button>
            )}
          </Section>
        )}

        {detail.status === 'ready' && (
          <Section id="dist" title="حضوره في السور">
            <p className="mt-1 text-sm text-ink-soft">
              عدد مرات وروده في كل سورة، من الفاتحة إلى الناس.
            </p>
            <Distribution
              perSurah={perSurah}
              surahs={surahs}
              label={`توزيع «${e.lemma}» على السور`}
            />
          </Section>
        )}

        {kin.length > 0 && (
          <Section id="kin" title="ألفاظ من جذره">
            <ul className="mt-3 flex flex-wrap gap-2">
              {kin.map((x) => (
                <li key={x.slug}>
                  <Link
                    to={wordPath(x.slug)}
                    className="inline-flex min-h-11 items-baseline gap-2 rounded-full border border-[#cdb67a] px-3 py-1.5 hover:bg-vellum-deep"
                  >
                    <span className="font-quran text-xl text-ink">{x.lemma}</span>
                    <span className="text-xs text-ink-soft">{formatNumber(x.count)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {detail.status === 'ready' && (
          <Section id="occ" title="مواضعه">
            <OccurrenceList key={e.slug} list={list} byId={byId} marks={marks} />
          </Section>
        )}

        <ReviewLink subject={`لفظ «${e.lemma}» في معجم الألفاظ`} />
      </article>
    </div>
  )
}

export default function WordsPage() {
  const state = useAsync(() => Promise.all([loadLexicon(), loadSurahs()]), 'lexicon')
  const { slug } = useParams()
  if (state.status === 'loading') return <Loading label="جارٍ تحميل المعجم" />
  if (state.status === 'error') return <ErrorNote error={state.error} />
  const [lex, { surahs }] = state.data
  const key = slug?.normalize('NFC')
  const e = key ? lex.entries.find((x) => x.slug === key) : undefined

  return (
    <div className="absolute inset-0 overflow-y-auto">
      {slug && !e ? (
        <div className="mx-auto max-w-3xl px-4 py-12 text-center">
          <p className="font-display text-2xl text-gold-soft">لا يوجد هذا المدخل في المعجم.</p>
          <Link to="/words" className="mt-4 inline-block text-vellum underline underline-offset-4">
            العودة إلى معجم الألفاظ
          </Link>
        </div>
      ) : e ? (
        <Entry key={e.slug} e={e} lex={lex} surahs={surahs} />
      ) : (
        <Index lex={lex} />
      )}
    </div>
  )
}
