/**
 * Runs after `vite build`. GitHub Pages has no server, so every page the site can show is
 * written out as its own HTML file, each with its own title, description and link-preview
 * image (Open Graph). Without this, a shared link to سورة الرحمن would preview as the home page.
 *
 *   dist/<route>/index.html  one per page, served with status 200
 *   dist/404.html            catches anything else
 *   dist/og/*.png            1200×630 preview images: one per surah, one for the site
 *
 * Images are drawn as SVG and rendered with resvg. Arabic text is shaped with fontkit and
 * written as outlines, so the image does not depend on fonts installed on the build machine.
 */
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import * as fontkit from 'fontkit'
import { Resvg } from '@resvg/resvg-js'
import {
  Fingerprints,
  Lexicon,
  NameIndex,
  RootIndex,
  SurahIndex,
  SurahText,
  TopicIndex,
} from '../src/data/schemas.ts'
import type { Surah } from '../src/data/schemas.ts'
import {
  AYAH,
  ENTRY,
  ROOT,
  SURAH,
  TIME,
  countOf,
  revelationLabel,
  spacedRoot,
  stripTashkeel,
  toArabicDigits,
} from '../src/lib/arabic.ts'
import { fingerprintGeometry } from '../src/features/fingerprints/geometry.ts'

const SITE = (process.env.SITE_URL ?? 'https://hamid-kano.github.io/quran-visual/').replace(
  /\/?$/,
  '/',
)
const SITE_NAME = 'آيات مرئية'
const W = 1200
const H = 630

const read = (f: string) => JSON.parse(readFileSync(join('public/data', f), 'utf8'))
const surahs = SurahIndex.parse(read('surahs.json')).surahs
const fingerprints = Fingerprints.parse(read('fingerprints.json'))
const roots = RootIndex.parse(read('roots.json')).roots
const names = NameIndex.parse(read('names.json')).names
const lexicon = Lexicon.parse(read('lexicon.json'))
const topics = TopicIndex.parse(read('topics.json')).nodes

// ---------- text as outlines ----------

interface Font {
  unitsPerEm: number
  layout: (
    text: string,
    features?: string[],
    script?: string,
    language?: string,
    direction?: string,
  ) => {
    glyphs: { path: { toSVG: () => string } }[]
    positions: { xAdvance: number; xOffset: number; yOffset: number }[]
  }
}
const fontFile = (w: number) =>
  `node_modules/@fontsource/amiri/files/amiri-arabic-${w}-normal.woff2`
const bold = fontkit.openSync(fontFile(700)) as unknown as Font
const regular = fontkit.openSync(fontFile(400)) as unknown as Font

/**
 * Shapes a line and returns SVG paths right-aligned at `right`. fontkit shapes but does not
 * apply the bidirectional algorithm, so runs of digits are laid out left-to-right on their own.
 */
function textLine(text: string, font: Font, size: number, right: number, baseline: number) {
  const scale = size / font.unitsPerEm
  const runs = text.match(/[0-9٠-٩٬]+|[^0-9٠-٩٬]+/g) ?? []
  const shaped = runs.map((run) => {
    const isNumber = /^[0-9٠-٩٬]+$/.test(run)
    const r = font.layout(
      run,
      undefined,
      isNumber ? undefined : 'arab',
      undefined,
      isNumber ? 'ltr' : 'rtl',
    )
    let x = 0
    let d = ''
    r.glyphs.forEach((g, i) => {
      const p = r.positions[i]!
      const path = g.path.toSVG()
      if (path)
        d += `<path transform="translate(${((x + p.xOffset) * scale).toFixed(2)} ${(-p.yOffset * scale).toFixed(2)}) scale(${scale.toFixed(5)} ${(-scale).toFixed(5)})" d="${path}"/>`
      x += p.xAdvance
    })
    return { d, width: x * scale }
  })
  // logical order runs right to left
  let cursor = right
  let out = ''
  for (const s of shaped) {
    cursor -= s.width
    out += `<g transform="translate(${cursor.toFixed(2)} ${baseline})">${s.d}</g>`
  }
  return { svg: out, width: right - cursor }
}

/** A line shrunk to fit `maxWidth` if needed. */
function fittedLine(
  text: string,
  font: Font,
  size: number,
  right: number,
  baseline: number,
  maxWidth: number,
) {
  const first = textLine(text, font, size, right, baseline)
  if (first.width <= maxWidth) return first.svg
  return textLine(text, font, (size * maxWidth) / first.width, right, baseline).svg
}

// ---------- images ----------

const frame = `
  <defs>
    <radialGradient id="glow" cx="27%" cy="50%" r="65%">
      <stop offset="0" stop-color="#1d3d68"/>
      <stop offset="0.55" stop-color="#0d1d33"/>
      <stop offset="1" stop-color="#08142a"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect x="26" y="26" width="${W - 52}" height="${H - 52}" fill="none" stroke="#c9a54a" stroke-opacity="0.35" stroke-width="1.5"/>
  <rect x="34" y="34" width="${W - 68}" height="${H - 68}" fill="none" stroke="#c9a54a" stroke-opacity="0.18" stroke-width="1"/>`

const TEXT_RIGHT = W - 96
const TEXT_WIDTH = 520

function surahImage(s: Surah) {
  const fp = fingerprints[s.id - 1]!
  const size = 500
  const { spokes, stroke, ring } = fingerprintGeometry(fp, size, 330, H / 2)
  const rosette =
    `<circle cx="330" cy="${H / 2}" r="${ring}" fill="none" stroke="#c9a54a" stroke-opacity="0.4" stroke-width="1.5"/>` +
    spokes
      .map(
        (p) =>
          `<line x1="${p.x1.toFixed(2)}" y1="${p.y1.toFixed(2)}" x2="${p.x2.toFixed(2)}" y2="${p.y2.toFixed(2)}" stroke="${p.color}" stroke-width="${stroke.toFixed(2)}" stroke-linecap="round"/>`,
      )
      .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${frame}
  ${rosette}
  <g fill="#e6cf8f">${fittedLine(`سورة ${s.name}`, bold, 104, TEXT_RIGHT, 292, TEXT_WIDTH)}</g>
  <g fill="#f3ead6" fill-opacity="0.88">${textLine(`${revelationLabel(s.revelation)}، ${countOf(s.ayahs, AYAH)}`, regular, 50, TEXT_RIGHT, 380).svg}</g>
  <g fill="#c9a54a">${textLine(SITE_NAME, bold, 40, TEXT_RIGHT, 540).svg}</g>
</svg>`
}

function siteImage() {
  // the galaxy seen from the front: each surah a dot, sized by its ayahs
  const xs = surahs.map((s) => s.position[0])
  const ys = surahs.map((s) => s.position[1])
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2
  const k = 500 / span
  const dots = [...surahs]
    .sort((a, b) => a.position[2] - b.position[2])
    .map((s) => {
      const r = 2.2 + Math.sqrt(s.ayahs) * 0.75
      const color = s.revelation === 'meccan' ? '#e2c46f' : '#5fb7a1'
      return `<circle cx="${(330 + (s.position[0] - cx) * k).toFixed(1)}" cy="${(H / 2 - (s.position[1] - cy) * k).toFixed(1)}" r="${r.toFixed(1)}" fill="${color}" fill-opacity="0.9"/>`
    })
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${frame}
  ${dots}
  <g fill="#e6cf8f">${textLine(SITE_NAME, bold, 120, TEXT_RIGHT, 300).svg}</g>
  <g fill="#f3ead6" fill-opacity="0.88">${textLine('استكشاف بصري لكتاب الله', regular, 52, TEXT_RIGHT, 392).svg}</g>
</svg>`
}

const png = (svg: string) => new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng()

mkdirSync('dist/og', { recursive: true })
writeFileSync('dist/og/site.png', png(siteImage()))
for (const s of surahs) writeFileSync(`dist/og/surah-${s.id}.png`, png(surahImage(s)))

// ---------- pages ----------

interface Meta {
  title: string
  description: string
  image: string
  imageAlt: string
}

const SITE_IMAGE = { image: 'og/site.png', imageAlt: 'مجرّة السور: كل نقطة سورة' }
const surahImageOf = (s: Surah) => ({
  image: `og/surah-${s.id}.png`,
  imageAlt: `بصمة سورة ${s.name}`,
})
const titled = (t: string) => `${t} | ${SITE_NAME}`
/** The ayah's opening words, whole words only, marked as cut where they stop short of its end. */
function excerpt(text: string, max = 110) {
  if (text.length <= max) return `﴿${text}﴾`
  const cut = text.slice(0, max + 1)
  return `﴿${cut.slice(0, cut.lastIndexOf(' '))}…﴾`
}

const pages = new Map<string, Meta>()
pages.set('', {
  title: `${SITE_NAME}: استكشاف بصري لكتاب الله`,
  description:
    'استكشاف بصري لسور القرآن الكريم وجذوره وأعلامه ومتشابهاته، مبنيّ على نص مجمع الملك فهد ومصادر موثّقة.',
  ...SITE_IMAGE,
})
const sections: [string, string, string][] = [
  [
    'search',
    'البحث في القرآن الكريم',
    'ابحث بالإملاء المعتاد، بتشكيل أو بدونه، فيُطابَق ما تكتبه مع رسم المصحف.',
  ],
  [
    'fingerprints',
    'بصمات السور',
    'وردة لكل سورة: خط لكل آية، يطول بعدد كلماتها ويتلوّن بالحرف الذي تنتهي به.',
  ],
  [
    'journey',
    'رحلة النزول',
    'متوسط طول الآية وعدد الآيات على امتداد ترتيب النزول، من العلق إلى النصر.',
  ],
  [
    'roots',
    'شبكة الجذور',
    `${countOf(roots.length, ROOT)} في القرآن، وشبكة لأكثرها وروداً تصل بين الجذور التي تجتمع في الآيات.`,
  ],
  [
    'topics',
    'خريطة الموضوعات',
    'موضوعات القرآن الكريم وآياتها، من الفهرس الموضوعي لمصحف التجويد، في شجرة تُفتح موضوعاً موضوعاً.',
  ],
  [
    'names',
    'أسماء الأعلام',
    'الأنبياء والأقوام والأماكن والكتب المذكورة في القرآن، ومن ذُكر منها مع من في الآية نفسها.',
  ],
  [
    'similar',
    'المتشابهات اللفظية',
    'آيات تتقارب ألفاظها، تُعرض مع نظائرها وتُبرز الفروق بينها كلمة كلمة.',
  ],
  [
    'words',
    'معجم الألفاظ',
    `ألفاظ القرآن الكريم بمداخلها المعجمية: ${countOf(lexicon.entries.length, ENTRY)}، لكل مدخل عدد وروده وصيغه في المصحف ومواضعه وجذره.`,
  ],
  [
    'review',
    'مراجعة أهل الاختصاص',
    'ما نرجو من أهل الاختصاص في علوم القرآن والعربية مراجعته في المنصة قبل إطلاقها العام، وكيف تُرسل الملاحظات.',
  ],
  [
    'about',
    'المنهج والمصادر',
    'مصادر النص والبيانات، وكيف يُحسب كل رقم في المنصة، وما يُتحقَّق منه قبل كل نشر.',
  ],
]
for (const [route, title, description] of sections)
  pages.set(route, { title: titled(title), description, ...SITE_IMAGE })

for (const s of surahs) {
  const facts = `${revelationLabel(s.revelation)}، ${countOf(s.ayahs, AYAH)}`
  pages.set(`surah/${s.id}`, {
    title: titled(`سورة ${s.name}`),
    description: `سورة ${s.name}، ${facts}. موقعها في مجرّة السور، وأقرب السور إليها في المعجم، وجذورها المميِّزة، ونصها بالرسم العثماني.`,
    ...surahImageOf(s),
  })
  for (const a of SurahText.parse(read(`surah/${s.id}.json`)).ayahs)
    pages.set(`ayah/${s.id}/${a.n}`, {
      title: titled(`سورة ${s.name}، الآية ${toArabicDigits(a.n)}`),
      description: `${excerpt(a.text)} — جذور كلماتها وموضوعاتها ونظائرها اللفظية، وتلاوتها.`,
      ...surahImageOf(s),
    })
  pages.set(`fingerprints/${s.id}`, {
    title: titled(`بصمة سورة ${s.name}`),
    description: `سورة ${s.name}، ${facts}: خط لكل آية، يطول بعدد كلماتها ويتلوّن بالحرف الذي تنتهي به.`,
    ...surahImageOf(s),
  })
  pages.set(`similar/${s.id}`, {
    title: titled(`متشابهات سورة ${s.name}`),
    description: `آيات سورة ${s.name} التي تتقارب ألفاظها مع آيات في مواضع أخرى، مع إبراز الفروق كلمة كلمة.`,
    ...surahImageOf(s),
  })
}
for (const r of roots) {
  const spaced = spacedRoot(r.root)
  pages.set(`roots/${r.root}`, {
    title: titled(`الجذر ${spaced}`),
    description: `ورد الجذر «${spaced}» ${countOf(r.count, TIME)} في ${countOf(r.surahs, SURAH)}. مشتقاته، وتوزيعه على السور، والجذور التي يقترن بها، ومواضعه كلها.`,
    ...SITE_IMAGE,
  })
}
for (const t of topics) {
  pages.set(`topics/${t.id}`, {
    title: titled(t.label),
    description: `«${t.label}» في القرآن الكريم: ${countOf(t.ayahs, AYAH)} في ${countOf(t.surahs, SURAH)}، من الفهرس الموضوعي لمصحف التجويد.`,
    ...SITE_IMAGE,
  })
}
for (const n of names) {
  const plain = stripTashkeel(n.name)
  pages.set(`names/${n.name}`, {
    title: titled(plain),
    description: `ورد «${plain}» ${countOf(n.count, TIME)} في ${countOf(n.surahs, SURAH)}، مع الأعلام التي ذُكر معها في الآية نفسها، ومواضعه كلها.`,
    ...SITE_IMAGE,
  })
}

for (const e of lexicon.entries)
  pages.set(`words/${e.slug}`, {
    title: titled(`${stripTashkeel(e.lemma)} في معجم الألفاظ`),
    description: `«${e.lemma}» في القرآن الكريم: ورد ${countOf(e.count, TIME)} في ${countOf(e.ayahs, AYAH)} من ${countOf(e.surahs, SURAH)}، مع صيغه في المصحف ومواضعه${e.root ? ` وألفاظ جذره «${spacedRoot(e.root)}»` : ''}.`,
    ...SITE_IMAGE,
  })

// ---------- what each page needs first ----------
//
// The app's code for a page, and the data it fetches, are otherwise found only after the main
// script has run. Naming them in the page's HTML lets the browser fetch them at once.

const BASE = process.env.BASE_PATH ?? '/quran-visual/'
interface Chunk {
  file: string
  imports?: string[]
}
const manifest = JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf8')) as Record<
  string,
  Chunk
>
/** A source module's chunk with the chunks it imports, leaving out the main entry. */
function chunksOf(src: string, out = new Set<string>()): Set<string> {
  const c = manifest[src]
  if (!c) throw new Error(`prerender: ${src} is not in the build manifest`)
  if (src === 'index.html' || out.has(c.file)) return out
  out.add(c.file)
  for (const i of c.imports ?? []) chunksOf(i, out)
  return out
}
const feature = (f: string) => `src/features/${f}.tsx`

interface Hints {
  modules: string[]
  data: string[]
  quranFont: boolean
  /** Reading pages preload the interface fonts. Pages led by a map or a large index do not, so
   *  the fonts (shown meanwhile in a fallback face) do not hold the map or the index back. */
  uiFonts?: boolean
}
/** The page's code, its data files (as the app names them) and whether it opens on Quran text. */
function hintsFor(route: string): Hints {
  const [section = '', a] = route.split('/')
  const one = (...src: string[]) => [...new Set(src.flatMap((x) => [...chunksOf(x)]))]
  switch (section) {
    case '':
      return {
        // Not the 3D scene: a still preview stands in for it at once. This page is also what the
        // installed service worker serves for every address, so its hints must suit any page.
        modules: one(feature('galaxy/GalaxyPage')),
        data: ['surahs.json'],
        quranFont: false,
        uiFonts: false,
      }
    case 'surah':
      return {
        // the surah's panel comes first; the galaxy behind it follows
        modules: one(feature('galaxy/GalaxyPage')),
        data: ['surahs.json', `surah/${a}.json`],
        quranFont: true,
      }
    case 'ayah':
      return {
        modules: one(feature('ayah/AyahPage')),
        data: ['surahs.json', `surah/${a}.json`],
        quranFont: true,
      }
    case 'roots':
      return {
        modules: one(feature('roots/RootsPage'), feature('roots/RootGraph')),
        data: ['roots.json', 'surahs.json', ...(a ? [`occ/${encodeURIComponent(a)}.json`] : [])],
        quranFont: !!a,
        uiFonts: false,
      }
    case 'names':
      return {
        modules: one(feature('names/NamesPage'), 'src/components/NetworkGraph.tsx'),
        data: ['names.json', 'surahs.json'],
        quranFont: !!a,
        uiFonts: false,
      }
    case 'fingerprints':
      return {
        modules: one(feature('fingerprints/FingerprintsPage')),
        data: ['surahs.json', 'fingerprints.json', ...(a ? [`surah/${a}.json`] : [])],
        quranFont: !!a,
      }
    case 'similar':
      return {
        modules: one(feature('similar/SimilarPage')),
        data: ['similar.json', 'surahs.json', ...(a ? [`surah/${a}.json`] : [])],
        quranFont: !!a,
      }
    case 'topics':
      return {
        modules: one(feature('topics/TopicsPage')),
        data: ['topics.json', ...(a ? ['surahs.json'] : [])],
        quranFont: !!a,
      }
    case 'search':
      return {
        modules: one(feature('search/SearchPage')),
        data: ['search.json', 'surahs.json', 'roots.json'],
        quranFont: false,
        uiFonts: false,
      }
    case 'journey':
      return {
        modules: one(feature('journey/JourneyPage')),
        data: ['surahs.json'],
        quranFont: false,
      }
    case 'about':
      return { modules: one(feature('about/AboutPage')), data: [], quranFont: false }
    case 'words':
      return {
        modules: one(feature('words/WordsPage')),
        data: ['lexicon.json', 'surahs.json', ...(a ? [`lex/${encodeURIComponent(a)}.json`] : [])],
        quranFont: true,
      }
    case 'review':
      return { modules: one(feature('review/ReviewPage')), data: [], quranFont: false }
    default:
      throw new Error(`prerender: no hints for ${route}`)
  }
}

/**
 * The interface's two faces that reading pages open with: the body text and the headings. The
 * stylesheet names them only after the main script has rendered the page.
 */
const UI_FONTS = [
  /^ibm-plex-sans-arabic-arabic-400-normal-.*\.woff2$/,
  /^amiri-arabic-700-normal-.*\.woff2$/,
].map((re) => {
  const f = readdirSync('dist/assets').filter((x) => re.test(x))
  if (f.length !== 1) throw new Error(`prerender: expected one font matching ${re}`)
  return `assets/${f[0]}`
})

const fontTag = (href: string) =>
  `<link rel="preload" href="${href}" as="font" type="font/woff2" crossorigin />`

function hintTags({ modules, data, quranFont, uiFonts = true }: Hints) {
  return [
    ...modules.map((f) => `<link rel="modulepreload" crossorigin href="${BASE}${f}" />`),
    ...(uiFonts ? UI_FONTS : []).map((f) => fontTag(BASE + f)),
    ...(quranFont ? [fontTag(`${BASE}fonts/kfgqpc-hafs-18.woff2`)] : []),
    // fetch() requests are same-origin CORS requests, so the preloads say so to be reused
    ...data.map((f) => `<link rel="preload" href="${BASE}data/${f}" as="fetch" crossorigin />`),
  ].join('\n    ')
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const urlOf = (route: string) => SITE + route.split('/').map(encodeURIComponent).join('/')

function head(route: string, m: Meta) {
  const url = urlOf(route)
  const image = SITE + m.image
  return `<!-- page-meta -->
    <title>${esc(m.title)}</title>
    <meta name="description" content="${esc(m.description)}" />
    <link rel="canonical" href="${esc(url)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:locale" content="ar_AR" />
    <meta property="og:title" content="${esc(m.title)}" />
    <meta property="og:description" content="${esc(m.description)}" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:image" content="${esc(image)}" />
    <meta property="og:image:width" content="${W}" />
    <meta property="og:image:height" content="${H}" />
    <meta property="og:image:alt" content="${esc(m.imageAlt)}" />
    <meta name="twitter:card" content="summary_large_image" />
    ${hintTags(hintsFor(route))}
    <!-- /page-meta -->`
}

const template = readFileSync('dist/index.html', 'utf8')
const META = /<!-- page-meta[\s\S]*?<!-- \/page-meta -->/
if (!META.test(template)) throw new Error('index.html has no page-meta block')

for (const [route, meta] of pages) {
  const html = template.replace(META, head(route, meta))
  const dir = join('dist', route)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), html)
}
// an unknown address keeps the site's default title and description, with no canonical link
writeFileSync('dist/404.html', template)
rmSync('dist/.vite', { recursive: true, force: true })
console.log(`prerender: ${pages.size} pages, ${surahs.length + 1} preview images`)
