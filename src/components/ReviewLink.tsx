import { useId, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { REVIEW, issueUrl, mailUrl } from '../lib/review'
import { SITE_URL } from '../lib/platform'

/**
 * «ملاحظة على هذا الموضع»: opens a ready note about the place shown, by email or as a GitHub
 * issue, with the place's name and address already filled in.
 */
export function ReviewLink({
  subject,
  tone = 'page',
}: {
  subject: string
  tone?: 'page' | 'dark'
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const { pathname, search } = useLocation()
  // the public address, also when the page is opened from a local copy or in the app
  const url = `${SITE_URL}${pathname}${search}`
  const place = { subject, url }
  const page = tone === 'page'
  const quiet = page ? 'text-ink-soft hover:text-ink' : 'text-mist hover:text-vellum'
  const chip = page
    ? 'border-[#cdb67a] text-ink hover:bg-vellum-deep'
    : 'border-gold/30 text-vellum hover:bg-gold/10'

  return (
    <div className={`mt-6 border-t pt-3 text-sm ${page ? 'border-[#e0cf9f]' : 'border-gold/15'}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        className={`inline-flex min-h-11 items-center gap-2 ${quiet}`}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" aria-hidden>
          <path strokeWidth="1.8" strokeLinejoin="round" d="M4 5h16v11H9l-5 4z" />
        </svg>
        ملاحظة على هذا الموضع
      </button>
      {open && (
        <div id={id} className="pb-1">
          <p className={page ? 'text-ink-soft' : 'text-mist'}>
            لأهل الاختصاص: تُفتح رسالة جاهزة فيها اسم الموضع ورابطه، فيكفي أن تُكتب الملاحظة.{' '}
            <Link to="/review" className="underline underline-offset-4">
              عن المراجعة
            </Link>
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {REVIEW.email && (
              <a
                href={mailUrl(place, REVIEW.email)}
                className={`inline-flex min-h-11 items-center rounded-full border px-4 ${chip}`}
              >
                بالبريد الإلكتروني
              </a>
            )}
            <a
              href={issueUrl(place)}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex min-h-11 items-center rounded-full border px-4 ${chip}`}
            >
              على GitHub
              <span className="sr-only"> (يُفتح في نافذة جديدة)</span>
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
