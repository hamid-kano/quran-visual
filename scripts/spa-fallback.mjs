// GitHub Pages has no SPA rewrites. Every known route gets its own index.html (so it is served
// with status 200), and 404.html catches anything else.
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const html = 'dist/index.html'
const surahs = Array.from({ length: 114 }, (_, i) => String(i + 1))
const roots = JSON.parse(readFileSync('public/data/roots.json', 'utf8')).roots.map((r) => r.root)
const names = JSON.parse(readFileSync('public/data/names.json', 'utf8')).names.map((n) => n.name)

const routes = [
  'roots',
  'fingerprints',
  'journey',
  'names',
  'similar',
  'about',
  'search',
  ...surahs.flatMap((s) => [`surah/${s}`, `fingerprints/${s}`, `similar/${s}`]),
  ...roots.map((r) => `roots/${r}`),
  ...names.map((n) => `names/${n}`),
]

for (const route of routes) {
  const dir = join('dist', route)
  mkdirSync(dir, { recursive: true })
  copyFileSync(html, join(dir, 'index.html'))
}
copyFileSync(html, 'dist/404.html')
console.log(`routes: ${routes.length} pages + 404.html`)
