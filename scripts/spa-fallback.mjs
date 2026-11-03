// GitHub Pages has no SPA rewrites: serving index.html as 404.html lets deep links work.
import { copyFileSync } from 'node:fs'
copyFileSync('dist/index.html', 'dist/404.html')
