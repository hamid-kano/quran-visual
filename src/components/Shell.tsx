import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'

const links: { to: string; label: string; end: boolean; also?: string[] }[] = [
  { to: '/', label: 'مجرّة السور', end: true },
  { to: '/read', label: 'القراءة', end: false, also: ['/khatma'] },
  {
    to: '/studies',
    label: 'علوم القرآن',
    end: false,
    also: ['/fawasil', '/waqf', '/nida', '/anbiya'],
  },
  { to: '/search', label: 'البحث', end: false },
  { to: '/fingerprints', label: 'بصمات السور', end: false },
  { to: '/journey', label: 'رحلة النزول', end: false },
  { to: '/roots', label: 'شبكة الجذور', end: false },
  { to: '/words', label: 'معجم الألفاظ', end: false },
  { to: '/topics', label: 'الموضوعات', end: false },
  { to: '/names', label: 'الأعلام', end: false },
  { to: '/similar', label: 'المتشابهات', end: false },
  { to: '/about', label: 'المنهج والمصادر', end: false },
]

export function Shell() {
  const nav = useRef<HTMLElement>(null)
  const { pathname } = useLocation()
  const within = (paths?: string[]) =>
    !!paths?.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  // on narrow screens the menu scrolls: keep the current section in view
  useEffect(() => {
    nav.current
      ?.querySelector('[aria-current="page"], [data-current]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [pathname])
  return (
    <div className="flex h-dvh flex-col bg-night">
      <header className="relative z-20 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-gold/20 bg-night-deep/80 px-4 py-3 backdrop-blur sm:px-6">
        <NavLink
          to="/"
          className="flex items-baseline gap-3"
          aria-label="آيات مرئية، الصفحة الرئيسية"
        >
          <span className="font-display text-2xl font-bold text-gold">آيات مرئية</span>
          <span className="hidden text-sm text-mist xl:inline">استكشاف بصري لكتاب الله</span>
        </NavLink>
        <nav
          ref={nav}
          aria-label="الأقسام"
          className="-mx-4 min-w-0 max-w-full overflow-x-auto px-4 [mask-image:linear-gradient(to_left,black_85%,transparent)] [scrollbar-width:none] sm:mx-0 sm:px-0 lg:[mask-image:none]"
        >
          <ul className="flex gap-1 whitespace-nowrap text-[0.95rem]">
            {links.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  end={l.end}
                  // a section's own pages light it up too (the khatma under reading, …)
                  data-current={within(l.also) || undefined}
                  className={({ isActive }) =>
                    `block rounded-full px-3 py-1.5 transition-colors ${
                      isActive || within(l.also)
                        ? 'bg-gold/15 text-gold-soft'
                        : 'text-mist hover:text-vellum'
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="relative min-h-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
