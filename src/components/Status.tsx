export function Loading({ label = 'جارٍ التحميل' }: { label?: string }) {
  return (
    <div role="status" className="grid h-full min-h-[50vh] place-items-center text-mist">
      <span className="text-lg font-semibold">{label}…</span>
    </div>
  )
}

export function ErrorNote({ error }: { error: Error }) {
  return (
    <div role="alert" className="grid h-full min-h-[50vh] place-items-center p-6 text-center">
      <div>
        <p className="font-kufi text-xl text-gold-soft">لم تُحمَّل البيانات</p>
        <p className="mt-2 text-mist">{error.message}. تحقّق من الاتصال ثم أعد تحميل الصفحة.</p>
      </div>
    </div>
  )
}
