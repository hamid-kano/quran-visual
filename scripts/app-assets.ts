/**
 * The app's icon and splash screen, drawn from the site's mark (public/favicon.svg): the
 * eight-pointed star of the mushaf's hizb sign, in gold on the night of the interface.
 * Writes assets/*.png for `npx capacitor-assets generate`, which makes every size each platform needs.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'

const NIGHT = '#0d1d33'
const GOLD = '#c9a54a'

/** The star alone, centred in a box of `size`, filling `scale` of it. */
const star = (size: number, scale: number) => {
  const k = (size * scale) / 64
  const o = (size - 64 * k) / 2
  return `<g transform="translate(${o} ${o}) scale(${k})">
    <g fill="none" stroke="${GOLD}" stroke-width="3" stroke-linejoin="round">
      <rect x="17" y="17" width="30" height="30"/>
      <rect x="17" y="17" width="30" height="30" transform="rotate(45 32 32)"/>
    </g>
    <circle cx="32" cy="32" r="5" fill="${GOLD}"/>
  </g>`
}
const svg = (size: number, body: string, bg = true) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${
    bg ? `<rect width="${size}" height="${size}" fill="${NIGHT}"/>` : ''
  }${body}</svg>`
const png = (file: string, s: string) => {
  writeFileSync(`assets/${file}`, new Resvg(s).render().asPng())
  console.log(`assets/${file}`)
}

mkdirSync('assets', { recursive: true })
// the square icon (iOS, and Android before adaptive icons): the platforms round its corners
png('icon-only.png', svg(1024, star(1024, 1.15)))
// Android's adaptive icon: the star kept inside the central safe zone (two thirds), on night
png('icon-foreground.png', svg(1024, star(1024, 0.95), false))
png('icon-background.png', svg(1024, ''))
// the splash: the star, small, in the middle of the night
png('splash.png', svg(2732, star(2732, 0.42)))
png('splash-dark.png', svg(2732, star(2732, 0.42)))
