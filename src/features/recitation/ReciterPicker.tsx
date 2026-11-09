import { useMemo, useState } from 'react'
import { BottomSheet } from '../../components/BottomSheet'
import { IconCheck, IconClose, IconPlay, IconSearch } from '../../components/icons'
import { normalizeArabic, toArabicDigits } from '../../lib/arabic'
import { RECITERS, reciterLabel } from './reciters'

/**
 * The reciters, searchable, the chosen one marked. Alphabetical, so a choice does not move
 * the rows under the finger; searching ignores hamza forms and diacritics.
 */
export function ReciterList({
  current,
  onPick,
  hint,
}: {
  current: string
  onPick: (id: string) => void
  hint: string
}) {
  const [query, setQuery] = useState('')
  const list = useMemo(() => {
    const q = normalizeArabic(query)
    const coll = new Intl.Collator('ar')
    return RECITERS.filter((r) => !q || normalizeArabic(reciterLabel(r)).includes(q)).sort((a, b) =>
      coll.compare(reciterLabel(a), reciterLabel(b)),
    )
  }, [query])
  const now = RECITERS.find((r) => r.id === current)

  return (
    <div>
      <p className="text-xs text-mist/80">
        {now && (
          <>
            القارئ الآن: <span className="text-gold-soft">{reciterLabel(now)}</span>.{' '}
          </>
        )}
        {hint}
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
          const on = r.id === current
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onPick(r.id)}
                aria-pressed={on}
                className={`tap flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-right active:bg-white/10 hover:bg-white/5 ${on ? 'bg-gold/10' : ''}`}
              >
                <span className="min-w-0 flex-1">
                  <span className={on ? 'font-semibold text-gold-soft' : 'text-vellum'}>
                    {r.name}
                  </span>
                  {/* a space, and a box of its own: Arabic letters join across touching
                      elements, which would set the name's last letter in its joined form */}
                  {r.style && (
                    <>
                      {' '}
                      <span className="ms-1 inline-block rounded-full bg-white/5 px-2 py-0.5 text-xs text-mist">
                        {r.style}
                      </span>
                    </>
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
    </div>
  )
}

/** The reciters in a sheet of their own: from the player, and from the menu. */
export function ReciterSheet({
  open,
  onClose,
  current,
  onPick,
  playing,
}: {
  open: boolean
  onClose: () => void
  current: string
  onPick: (id: string) => void
  /** A recitation is going on: the new voice takes it up from the same ayah. */
  playing: boolean
}) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      label="اختيار القارئ"
      header={
        <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-1">
          <div>
            <p className="font-display text-xl font-bold text-gold-soft">اختيار القارئ</p>
            <p className="text-xs text-mist">
              {toArabicDigits(RECITERS.length)} قارئًا · رواية حفص · من موقع EveryAyah
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="tap grid size-11 place-items-center rounded-full text-mist active:bg-gold/15 hover:text-vellum"
          >
            <IconClose className="size-5" />
          </button>
        </div>
      }
    >
      <div className="px-4">
        {open && (
          <ReciterList
            current={current}
            onPick={onPick}
            hint={
              playing
                ? 'اختر قارئًا آخر فتُكمل التلاوة بصوته من الآية نفسها.'
                : 'يُحفظ اختيارك، وتُتلى به الآيات في المصحف وفي صفحات السور.'
            }
          />
        )}
      </div>
    </BottomSheet>
  )
}
