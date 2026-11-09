import { TIME, countOf, toArabicDigits } from '../../lib/arabic'
import { useId, useState } from 'react'
import { IconChevronDown } from '../../components/icons'
import { reciterLabel } from './reciters'
import { ReciterSheet } from './ReciterPicker'
import type { useRecitation } from './useRecitation'

type Recitation = ReturnType<typeof useRecitation>

function IconButton({
  label,
  onClick,
  disabled,
  children,
  primary,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
  primary?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid place-items-center rounded-full transition-colors disabled:opacity-40 ${
        primary
          ? 'size-11 bg-[#7a5a12] text-vellum hover:bg-[#6b4a0c]'
          : 'size-9 text-ink hover:bg-vellum-deep'
      }`}
    >
      {children}
    </button>
  )
}

const svg = (d: string) => (
  <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
    <path d={d} />
  </svg>
)
// in right-to-left reading the "next ayah" arrow points left
const PLAY = svg('M16 5v14L5 12z')
const PAUSE = svg('M7 5h4v14H7zM13 5h4v14h-4z')
const NEXT = svg('M14 6 8 12l6 6V6zM8 6H6v12h2z')
const PREV = svg('M10 6l6 6-6 6V6zM16 6h2v12h-2z')
const STOP = svg('M7 7h10v10H7z')

/**
 * Player controls: reciter, play/pause, previous/next ayah, repeats. With `single`, the bar
 * plays one ayah only (the hook's last ayah), so it has no previous/next.
 */
export function RecitationBar({
  r,
  ayahCount,
  single,
}: {
  r: Recitation
  ayahCount: number
  single?: number
}) {
  const [picking, setPicking] = useState(false)
  const repeatId = useId()
  const active = r.status !== 'idle'
  const playing = r.status === 'playing' || r.status === 'loading'
  const where = r.step
    ? r.step.basmala
      ? 'البسملة'
      : single
        ? `الآية ${toArabicDigits(r.step.ayah)}`
        : `الآية ${toArabicDigits(r.step.ayah)} من ${toArabicDigits(ayahCount)}`
    : null

  return (
    <section
      aria-label={single ? 'الاستماع إلى الآية' : 'الاستماع إلى السورة'}
      className={`rounded-md border border-[#cdb67a] bg-vellum px-3 py-2.5 ${active ? 'sticky top-0 z-10 shadow-[0_10px_24px_-18px_rgba(0,0,0,0.5)]' : ''}`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
        <div className="flex items-center gap-1">
          <IconButton
            primary
            label={
              playing
                ? 'إيقاف مؤقت'
                : active
                  ? 'متابعة'
                  : single
                    ? 'استمع إلى الآية'
                    : 'استمع إلى السورة'
            }
            onClick={() =>
              playing
                ? r.pause()
                : active && r.status !== 'error'
                  ? r.resume()
                  : r.start(single ?? r.step?.ayah ?? 1)
            }
          >
            {playing ? PAUSE : PLAY}
          </IconButton>
          {!single && (
            <>
              <IconButton
                label="الآية السابقة"
                onClick={() => r.go(-1)}
                disabled={!active || (r.step?.ayah ?? 1) <= 1}
              >
                {PREV}
              </IconButton>
              <IconButton
                label="الآية التالية"
                onClick={() => r.go(1)}
                disabled={!active || (r.step?.ayah ?? 1) >= ayahCount}
              >
                {NEXT}
              </IconButton>
            </>
          )}
          {active && (
            <IconButton label="إيقاف" onClick={r.stop}>
              {STOP}
            </IconButton>
          )}
        </div>

        {/* the reciter: the same searchable list as in the mushaf */}
        <button
          type="button"
          onClick={() => setPicking(true)}
          aria-haspopup="dialog"
          aria-label={`القارئ: ${reciterLabel(r.reciter)}. تغيير القارئ`}
          className="inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border border-[#cdb67a] bg-vellum pe-2.5 ps-3.5 text-sm text-ink hover:bg-[#efe3c4]"
        >
          <span className="truncate">{reciterLabel(r.reciter)}</span>
          <IconChevronDown className="size-4 shrink-0 text-ink-soft" />
        </button>

        <div className="flex items-center gap-2 text-sm text-ink-soft">
          <span id={`${repeatId}-label`}>تكرار كل آية</span>
          <div
            role="group"
            aria-labelledby={`${repeatId}-label`}
            className="flex rounded-full border border-[#cdb67a] p-0.5"
          >
            {[1, 3, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={r.repeat === n}
                aria-label={countOf(n, TIME)}
                onClick={() => r.setRepeat(n)}
                className={`min-h-8 rounded-full px-3 transition-colors ${
                  r.repeat === n
                    ? 'bg-[#e9d49b] font-semibold text-ink'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                {n === 1 ? 'مرة' : toArabicDigits(n)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-1.5 min-h-5 text-sm text-ink-soft" aria-live="polite">
        {r.status === 'error'
          ? 'تعذّر تشغيل التلاوة. تحقّق من الاتصال بالإنترنت ثم أعد المحاولة.'
          : r.status === 'loading'
            ? `جارٍ التحميل… ${where ?? ''}`
            : where
              ? `${reciterLabel(r.reciter)}، ${where}`
              : single
                ? 'استمع إلى الآية بصوت القارئ الذي تختاره.'
                : 'اختر رقم أي آية لتبدأ التلاوة منها.'}
      </p>
      <ReciterSheet
        open={picking}
        onClose={() => setPicking(false)}
        current={r.reciter.id}
        playing={active}
        onPick={(id) => {
          r.setReciter(id)
          setPicking(false)
        }}
      />
    </section>
  )
}
