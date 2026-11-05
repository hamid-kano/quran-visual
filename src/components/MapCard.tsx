import { useState, type ReactNode } from 'react'

/**
 * The tools card over a full-screen map (galaxy, roots, names). On a phone it shows only the
 * title and search, so the map stays visible; the explanation and options open on request.
 */
export function MapCard({
  title,
  label,
  search,
  children,
}: {
  title: string
  label: string
  search: ReactNode
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <section
      aria-label={label}
      className="absolute inset-x-3 top-3 z-10 rounded-2xl border border-gold/20 bg-night-deep/80 p-3 backdrop-blur sm:inset-x-auto sm:right-5 sm:top-5 sm:w-[22rem] sm:p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-gold-soft sm:text-3xl">{title}</h1>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="min-h-11 rounded-full px-3 text-sm text-mist hover:text-vellum sm:hidden"
        >
          {open ? 'إخفاء الخيارات' : 'الشرح والخيارات'}
        </button>
      </div>
      <div className="mt-2 sm:mt-3">{search}</div>
      <div className={open ? 'block' : 'hidden sm:block'}>{children}</div>
    </section>
  )
}
