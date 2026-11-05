import { useEffect } from 'react'
import { Link, useRouteError } from 'react-router'
import { isChunkError, reloadOnce } from '../lib/reload'

/** Shown in place of a page that failed to load or to render, inside the site's frame. */
export function RouteError() {
  const error = useRouteError()
  const chunk = isChunkError(error)
  useEffect(() => {
    if (chunk) reloadOnce()
  }, [chunk])

  return (
    <div role="alert" className="grid min-h-[60vh] place-items-center p-6 text-center">
      <div className="max-w-md">
        <p className="font-display text-2xl font-bold text-gold-soft">
          {chunk ? 'تعذّر تحميل الصفحة' : 'حدث خطأ في عرض الصفحة'}
        </p>
        <p className="mt-3 leading-relaxed text-mist">
          {chunk
            ? 'ربما انقطع الاتصال، أو نُشرت نسخة أحدث من الموقع. تحقّق من الاتصال ثم أعد التحميل.'
            : 'أعد تحميل الصفحة، فإن تكرّر الخطأ فارجع إلى الصفحة الرئيسية.'}
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => location.reload()}
            className="min-h-11 rounded-full bg-gold/20 px-5 text-gold-soft hover:bg-gold/30"
          >
            إعادة التحميل
          </button>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center rounded-full border border-gold/30 px-5 text-vellum hover:bg-gold/10"
          >
            الصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  )
}
