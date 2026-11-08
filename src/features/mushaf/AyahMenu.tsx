import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { Surah } from '../../data/schemas'
import { loadSurahText } from '../../data/load'
import { useAsync } from '../../data/useAsync'
import { BottomSheet } from '../../components/BottomSheet'
import { AyahMark } from '../../components/AyahText'
import {
  IconCheck,
  IconClose,
  IconCopy,
  IconInfo,
  IconPlay,
  IconSearch,
  IconShare,
} from '../../components/icons'
import { normalizeArabic, toArabicDigits } from '../../lib/arabic'
import { RECITERS, reciterLabel } from '../recitation/reciters'
import type { Picked } from './Sheet'

/** The text as copied or shared: the ayah, then where it is, as the mushafs cite it. */
const cite = (text: string, surah: string, ayah: number) =>
  `﴿${text}﴾ [${surah}: ${toArabicDigits(ayah)}]`

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text)
  // older browsers, and pages not served over https
  const t = document.createElement('textarea')
  t.value = text
  t.setAttribute('readonly', '')
  t.style.position = 'fixed'
  t.style.opacity = '0'
  document.body.append(t)
  t.select()
  const ok = document.execCommand('copy')
  t.remove()
  if (!ok) throw new Error('copy failed')
}

/**
 * Everything that can be done with one ayah, opened by a long press: copy it, share it, open
 * its analysis, and hear it, in any of the reciters, alone or with the recitation going on.
 */
export function AyahMenu({
  at,
  surahs,
  reciter,
  onClose,
  onListen,
  onReciter,
}: {
  at: Picked | null
  surahs: Surah[]
  reciter: string
  onClose: () => void
  /** Recite this ayah: alone (`one`), or on from here. */
  onListen: (at: Picked, one: boolean) => void
  /** Choose a reciter and hear this ayah in that voice. */
  onReciter: (id: string, at: Picked) => void
}) {
  // keep the last ayah while the sheet slides away
  const [last, setLast] = useState(at)
  if (at && at !== last) setLast(at)
  const shown = at ?? last

  return (
    <BottomSheet
      open={!!at}
      onClose={onClose}
      label={
        shown
          ? `سورة ${surahs[shown.surah - 1]!.name}، الآية ${toArabicDigits(shown.ayah)}`
          : 'الآية'
      }
      header={shown && <Head at={shown} surahs={surahs} onClose={onClose} />}
    >
      {shown && (
        <Body
          key={`${shown.surah}:${shown.ayah}`}
          at={shown}
          surahs={surahs}
          reciter={reciter}
          onListen={onListen}
          onReciter={onReciter}
        />
      )}
    </BottomSheet>
  )
}

function Head({ at, surahs, onClose }: { at: Picked; surahs: Surah[]; onClose: () => void }) {
  const s = surahs[at.surah - 1]!
  return (
    <div className="flex items-center justify-between gap-2 px-4 pb-1 pt-1">
      <p className="font-display text-xl font-bold text-gold-soft">
        سورة {s.name} · الآية {toArabicDigits(at.ayah)}
      </p>
      <button
        type="button"
        onClick={onClose}
        aria-label="إغلاق"
        className="tap grid size-11 place-items-center rounded-full text-mist active:bg-gold/15 hover:text-vellum"
      >
        <IconClose className="size-5" />
      </button>
    </div>
  )
}

function Body({
  at,
  surahs,
  reciter,
  onListen,
  onReciter,
}: {
  at: Picked
  surahs: Surah[]
  reciter: string
  onListen: (at: Picked, one: boolean) => void
  onReciter: (id: string, at: Picked) => void
}) {
  const s = surahs[at.surah - 1]!
  const text = useAsync(() => loadSurahText(s.id), String(s.id))
  const ayah = text.status === 'ready' ? text.data.ayahs[at.ayah - 1]!.text : null
  const [done, setDone] = useState<'copied' | 'failed' | null>(null)
  const [query, setQuery] = useState('')

  const copy = async () => {
    if (!ayah) return
    try {
      await copyText(cite(ayah, s.name, at.ayah))
      setDone('copied')
    } catch {
      setDone('failed')
    }
  }
  const canShare = typeof navigator.share === 'function'
  const share = () => {
    if (ayah) navigator.share({ text: cite(ayah, s.name, at.ayah) }).catch(() => {})
  }

  // reciters in alphabetical order (a choice does not move the rows under the finger);
  // searching ignores hamza forms and diacritics
  const list = useMemo(() => {
    const q = normalizeArabic(query)
    const coll = new Intl.Collator('ar')
    return RECITERS.filter((r) => !q || normalizeArabic(reciterLabel(r)).includes(q)).sort((a, b) =>
      coll.compare(reciterLabel(a), reciterLabel(b)),
    )
  }, [query])
  const current = RECITERS.find((r) => r.id === reciter)

  const tile =
    'tap flex min-h-16 flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-gold/15 px-2 text-sm text-vellum active:bg-gold/15 hover:bg-white/5 disabled:opacity-40'

  return (
    <div className="px-4">
      <p className="line-clamp-3 rounded-xl bg-vellum/95 px-3 py-2 font-quran text-[1.35rem] leading-[2] text-ink">
        {ayah ?? '…'} {ayah && <AyahMark n={at.ayah} />}
      </p>

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={copy} disabled={!ayah} className={tile}>
          {done === 'copied' ? (
            <IconCheck className="size-6 text-gold-soft" />
          ) : (
            <IconCopy className="size-6" />
          )}
          <span aria-live="polite">
            {done === 'copied' ? 'نُسخت الآية' : done === 'failed' ? 'تعذّر النسخ' : 'نسخ'}
          </span>
        </button>
        {canShare && (
          <button type="button" onClick={share} disabled={!ayah} className={tile}>
            <IconShare className="size-6" />
            مشاركة
          </button>
        )}
        <Link to={`/ayah/${s.id}/${at.ayah}`} className={tile}>
          <IconInfo className="size-6" />
          تحليل الآية
        </Link>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => onListen(at, true)}
          className="tap flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-gold/25 font-semibold text-gold-soft active:bg-gold/35"
        >
          <IconPlay className="size-5" />
          استمع إلى الآية
        </button>
        <button
          type="button"
          onClick={() => onListen(at, false)}
          className="tap flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border border-gold/30 text-vellum active:bg-gold/15"
        >
          <IconPlay className="size-5" />
          استمع من هنا
        </button>
      </div>

      <section aria-labelledby="qurra" className="mt-4">
        <div className="flex items-baseline justify-between">
          <h3 id="qurra" className="text-sm font-semibold text-vellum">
            اختر القارئ
          </h3>
          <span className="text-xs text-mist">
            {toArabicDigits(RECITERS.length)} قارئًا · رواية حفص
          </span>
        </div>
        <p className="mt-0.5 text-xs text-mist/80">
          {current && (
            <>
              القارئ الآن: <span className="text-gold-soft">{reciterLabel(current)}</span>.{' '}
            </>
          )}
          المس اسم قارئ لتسمع الآية بصوته، ويبقى اختيارك للتلاوة.
        </p>
        <label className="relative mt-2 block">
          <span className="sr-only">ابحث عن قارئ</span>
          <IconSearch className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-mist" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن قارئ"
            className="h-11 w-full rounded-full border border-gold/25 bg-night pe-3 ps-10 text-vellum placeholder:text-mist/70 focus:border-gold/60 focus:outline-none"
          />
        </label>
        <ul className="mt-2" role="list">
          {list.map((r) => {
            const on = r.id === reciter
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onReciter(r.id, at)}
                  aria-pressed={on}
                  className={`tap flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-right active:bg-white/10 hover:bg-white/5 ${on ? 'bg-gold/10' : ''}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className={on ? 'font-semibold text-gold-soft' : 'text-vellum'}>
                      {r.name}
                    </span>
                    {r.style && (
                      <span className="ms-2 rounded-full bg-white/5 px-2 py-0.5 text-xs text-mist">
                        {r.style}
                      </span>
                    )}
                  </span>
                  {on ? (
                    <IconCheck className="size-5 shrink-0 text-gold-soft" />
                  ) : (
                    <IconPlay className="size-4 shrink-0 text-mist" />
                  )}
                </button>
              </li>
            )
          })}
          {list.length === 0 && (
            <li className="px-3 py-4 text-center text-sm text-mist">لا يوجد قارئ بهذا الاسم.</li>
          )}
        </ul>
      </section>
    </div>
  )
}
