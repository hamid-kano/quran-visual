/** Line icons drawn for the interface: 24×24, 1.75 stroke, currentColor. Decorative unless labelled. */
type P = { className?: string }

function Svg({ className = 'size-6', children }: P & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  )
}

export const IconGalaxy = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="2.2" />
    <ellipse cx="12" cy="12" rx="9.5" ry="4" transform="rotate(-25 12 12)" />
    <circle cx="19.2" cy="8.2" r="1" fill="currentColor" stroke="none" />
    <circle cx="5" cy="15.6" r="0.9" fill="currentColor" stroke="none" />
  </Svg>
)

export const IconMushaf = (p: P) => (
  <Svg {...p}>
    <path d="M12 6.5c-2-1.6-4.8-2-8-1.6v13c3.2-.4 6 0 8 1.6 2-1.6 4.8-2 8-1.6v-13c-3.2-.4-6 0-8 1.6Z" />
    <path d="M12 6.5v13" />
  </Svg>
)

export const IconSearch = (p: P) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </Svg>
)

export const IconStudies = (p: P) => (
  <Svg {...p}>
    <path d="M4 19V8l8-4 8 4v11" />
    <path d="M8 19v-6h8v6" />
    <path d="M3 19h18" />
  </Svg>
)

export const IconMore = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
  </Svg>
)

export const IconMenu = (p: P) => (
  <Svg {...p}>
    <path d="M4 7h16M4 12h16M4 17h10" />
  </Svg>
)

export const IconClose = (p: P) => (
  <Svg {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Svg>
)

/** Points to the reading direction's "forward" (left in Arabic). */
export const IconForward = (p: P) => (
  <Svg {...p}>
    <path d="m14.5 6-6 6 6 6" />
  </Svg>
)

/** Points back (right in Arabic). */
export const IconBack = (p: P) => (
  <Svg {...p}>
    <path d="m9.5 6 6 6-6 6" />
  </Svg>
)

export const IconHome = (p: P) => (
  <Svg {...p}>
    <path d="M4 11 12 4l8 7" />
    <path d="M6 9.5V20h12V9.5" />
  </Svg>
)

export const IconCopy = (p: P) => (
  <Svg {...p}>
    <rect x="8" y="8" width="11" height="12" rx="2" />
    <path d="M16 8V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h1" />
  </Svg>
)

export const IconPlay = (p: P) => (
  <Svg {...p}>
    <path d="M8 5.5v13l10-6.5-10-6.5Z" />
  </Svg>
)

export const IconInfo = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5.5M12 7.6v.1" />
  </Svg>
)

export const IconPause = (p: P) => (
  <Svg {...p}>
    <path d="M8.5 5.5v13M15.5 5.5v13" />
  </Svg>
)

export const IconStop = (p: P) => (
  <Svg {...p}>
    <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" />
  </Svg>
)
