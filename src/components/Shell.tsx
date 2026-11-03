import { NavLink, Outlet } from 'react-router'

const links = [
  { to: '/', label: 'مجرّة السور', end: true },
  { to: '/roots', label: 'شبكة الجذور', end: false },
  { to: '/about', label: 'المنهج والمصادر', end: false },
]

export function Shell() {
  return (
    <div className="flex h-dvh flex-col bg-night">
      <header className="relative z-20 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-gold/20 bg-night-deep/80 px-4 py-3 backdrop-blur sm:px-6">
        <NavLink
          to="/"
          className="flex items-baseline gap-3"
          aria-label="آيات مرئية، الصفحة الرئيسية"
        >
          <span className="font-display text-2xl font-bold text-gold">آيات مرئية</span>
          <span className="hidden text-sm text-mist md:inline">استكشاف بصري لكتاب الله</span>
        </NavLink>
        <nav aria-label="الأقسام">
          <ul className="flex gap-1 text-[0.95rem]">
            {links.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) =>
                    `block rounded-full px-3 py-1.5 transition-colors ${
                      isActive ? 'bg-gold/15 text-gold-soft' : 'text-mist hover:text-vellum'
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
