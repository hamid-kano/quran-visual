import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { Drawer } from './Drawer'
import { IconGalaxy, IconMore, IconMushaf, IconSearch, IconStudies } from './icons'

interface Item {
  to: string
  label: string
  end?: boolean
  /** Other addresses that belong to this item (a surah opened from the galaxy, …). */
  also?: string[]
}

/** Every section, grouped as the side navigation shows them. */
const GROUPS: { title?: string; items: Item[] }[] = [
  { items: [{ to: '/', label: 'مجرّة السور', end: true, also: ['/surah'] }] },
  {
    title: 'القراءة',
    items: [
      { to: '/mushaf', label: 'المصحف' },
      { to: '/read', label: 'القراءة بالسور' },
      { to: '/khatma', label: 'خطة الختمة' },
    ],
  },
  {
    title: 'الاستكشاف',
    items: [
      { to: '/search', label: 'البحث' },
      { to: '/topics', label: 'الموضوعات' },
      { to: '/words', label: 'معجم الألفاظ' },
      { to: '/roots', label: 'شبكة الجذور' },
      { to: '/names', label: 'الأعلام' },
      { to: '/similar', label: 'المتشابهات' },
    ],
  },
  {
    title: 'التحليل',
    items: [
      { to: '/fingerprints', label: 'بصمات السور' },
      { to: '/journey', label: 'رحلة النزول' },
    ],
  },
  {
    title: 'علوم القرآن',
    items: [
      { to: '/studies', label: 'أبواب علوم القرآن' },
      { to: '/fawasil', label: 'الفواصل' },
      { to: '/waqf', label: 'الوقف والابتداء' },
      { to: '/nida', label: 'النداء' },
      { to: '/anbiya', label: 'الأنبياء' },
    ],
  },
  {
    title: 'عن المنصة',
    items: [
      { to: '/about', label: 'المنهج والمصادر' },
      { to: '/review', label: 'مراجعة أهل الاختصاص' },
    ],
  },
]

/** The phone's tab bar: the four most used places, and everything else under «المزيد». */
const TABS: (Item & { icon: (p: { className?: string }) => React.ReactNode })[] = [
  { to: '/', label: 'المجرّة', end: true, also: ['/surah'], icon: IconGalaxy },
  { to: '/mushaf', label: 'المصحف', also: ['/read', '/khatma'], icon: IconMushaf },
  { to: '/search', label: 'البحث', icon: IconSearch },
  {
    to: '/studies',
    label: 'علوم القرآن',
    also: ['/fawasil', '/waqf', '/nida', '/anbiya'],
    icon: IconStudies,
  },
]

/** Pages that take the whole screen with their own bars: the mushaf. */
const IMMERSIVE = ['/mushaf']

const within = (pathname: string, paths?: string[]) =>
  !!paths?.some((p) => pathname === p || pathname.startsWith(`${p}/`))

function Brand() {
  return (
    <NavLink to="/" className="flex items-baseline gap-2" aria-label="آيات مرئية، الصفحة الرئيسية">
      <span className="font-display text-2xl font-bold text-gold">آيات مرئية</span>
    </NavLink>
  )
}

/** The grouped list of sections, in the large screens' sidebar and in the phone's drawer. */
export function SectionNav({ onPick }: { onPick?: () => void }) {
  const { pathname } = useLocation()
  return (
    <nav aria-label="الأقسام" className="px-3 py-3">
      {GROUPS.map((g, i) => (
        <div key={g.title ?? i} className={i ? 'mt-4' : ''}>
          {g.title && (
            <p className="px-3 pb-1 text-xs font-semibold tracking-wide text-mist/70">{g.title}</p>
          )}
          <ul>
            {g.items.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  end={l.end}
                  onClick={onPick}
                  data-current={within(pathname, l.also) || undefined}
                  className={({ isActive }) =>
                    `tap flex min-h-11 items-center rounded-lg px-3 text-[0.95rem] transition-colors ${
                      isActive || within(pathname, l.also)
                        ? 'bg-gold/15 font-semibold text-gold-soft'
                        : 'text-mist hover:bg-white/5 hover:text-vellum active:bg-white/10'
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

export function Shell() {
  const { pathname } = useLocation()
  // the drawer belongs to the page it was opened on: going elsewhere closes it
  const [menuAt, setMenuAt] = useState<string | null>(null)
  const menu = menuAt === pathname
  const setMenu = (open: boolean) => setMenuAt(open ? pathname : null)

  if (within(pathname, IMMERSIVE))
    return (
      <div className="h-dvh bg-night">
        <Outlet />
      </div>
    )

  const tabOn = (t: Item) =>
    (t.end ? pathname === t.to : within(pathname, [t.to])) || within(pathname, t.also)
  const anyTab = TABS.some(tabOn)

  return (
    <div className="flex h-dvh bg-night">
      {/* large screens: the sections always in view */}
      <aside className="hidden w-60 shrink-0 flex-col border-e border-gold/15 bg-night-deep/70 lg:flex">
        <div className="px-6 pb-2 pt-5">
          <Brand />
          <p className="mt-1 text-xs text-mist">استكشاف بصري لكتاب الله</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          <SectionNav />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* phones and tablets: an app bar on top, tabs at the bottom */}
        <header className="relative z-20 flex shrink-0 items-center justify-between gap-3 border-b border-gold/15 bg-night-deep/90 px-4 pb-1.5 pt-[max(0.375rem,env(safe-area-inset-top))] backdrop-blur lg:hidden">
          <Brand />
        </header>

        <main className="relative min-h-0 flex-1">
          <Outlet />
        </main>

        <nav
          aria-label="التنقل الرئيسي"
          className="relative z-20 shrink-0 border-t border-gold/15 bg-night-deep/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        >
          <ul className="mx-auto grid max-w-xl grid-cols-5">
            {TABS.map((t) => {
              const on = tabOn(t)
              const Icon = t.icon
              return (
                <li key={t.to}>
                  <NavLink
                    to={t.to}
                    end={t.end}
                    aria-current={on ? 'page' : undefined}
                    className="tap group flex h-16 flex-col items-center justify-center gap-1 text-[0.7rem]"
                  >
                    <span
                      className={`grid h-8 w-14 place-items-center rounded-full transition-colors ${
                        on ? 'bg-gold/20 text-gold-soft' : 'text-mist group-active:bg-white/10'
                      }`}
                    >
                      <Icon className="size-[1.4rem]" />
                    </span>
                    <span className={on ? 'font-semibold text-gold-soft' : 'text-mist'}>
                      {t.label}
                    </span>
                  </NavLink>
                </li>
              )
            })}
            <li>
              <button
                type="button"
                onClick={() => setMenu(true)}
                aria-haspopup="dialog"
                className="tap group flex h-16 w-full flex-col items-center justify-center gap-1 text-[0.7rem]"
              >
                <span
                  className={`grid h-8 w-14 place-items-center rounded-full transition-colors ${
                    !anyTab ? 'bg-gold/20 text-gold-soft' : 'text-mist group-active:bg-white/10'
                  }`}
                >
                  <IconMore className="size-[1.4rem]" />
                </span>
                <span className={!anyTab ? 'font-semibold text-gold-soft' : 'text-mist'}>
                  المزيد
                </span>
              </button>
            </li>
          </ul>
        </nav>
      </div>

      <Drawer open={menu} onClose={() => setMenu(false)} title="الأقسام">
        <SectionNav onPick={() => setMenu(false)} />
      </Drawer>
    </div>
  )
}
