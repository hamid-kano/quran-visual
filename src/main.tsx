import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
// Typography by role:
//   KFGQPC HAFS Uthmanic Script — the Quranic text only (public/fonts, the King Fahd
//                        Complex's own font for its own text encoding)
//   Amiri              — headings and long-form reading (classical Naskh, same design family)
//   IBM Plex Sans Arabic — interface, labels, numbers and data
import '@fontsource/amiri/400.css'
import '@fontsource/amiri/700.css'
import '@fontsource/ibm-plex-sans-arabic/400.css'
import '@fontsource/ibm-plex-sans-arabic/600.css'
import './styles.css'
import { Shell } from './components/Shell'
import { Loading } from './components/Status'
import { RouteError } from './components/RouteError'
import { reloadOnce } from './lib/reload'
import { registerServiceWorker } from './lib/appUpdate'
import { startNative } from './lib/native'

const GalaxyPage = lazy(() => import('./features/galaxy/GalaxyPage'))
const RootsPage = lazy(() => import('./features/roots/RootsPage'))
const AboutPage = lazy(() => import('./features/about/AboutPage'))
const FingerprintsPage = lazy(() => import('./features/fingerprints/FingerprintsPage'))
const JourneyPage = lazy(() => import('./features/journey/JourneyPage'))
const NamesPage = lazy(() => import('./features/names/NamesPage'))
const SimilarPage = lazy(() => import('./features/similar/SimilarPage'))
const SearchPage = lazy(() => import('./features/search/SearchPage'))
const TopicsPage = lazy(() => import('./features/topics/TopicsPage'))
const AyahPage = lazy(() => import('./features/ayah/AyahPage'))
const ReviewPage = lazy(() => import('./features/review/ReviewPage'))
const WordsPage = lazy(() => import('./features/words/WordsPage'))
const TopWordsPage = lazy(() => import('./features/words/TopWordsPage'))
const ReadPage = lazy(() => import('./features/read/ReadPage'))
const KhatmaPage = lazy(() => import('./features/read/KhatmaPage'))
const FawasilPage = lazy(() => import('./features/fawasil/FawasilPage'))
const WaqfPage = lazy(() => import('./features/waqf/WaqfPage'))
const NidaPage = lazy(() => import('./features/nida/NidaPage'))
const AnbiyaPage = lazy(() => import('./features/anbiya/AnbiyaPage'))
const StudiesPage = lazy(() => import('./features/studies/StudiesPage'))
const MushafPage = lazy(() => import('./features/mushaf/MushafPage'))

const page = (el: React.ReactNode) => <Suspense fallback={<Loading />}>{el}</Suspense>

const router = createBrowserRouter(
  [
    {
      element: <Shell />,
      children: [
        {
          // a page that fails keeps the site's header and menu around its error
          errorElement: <RouteError />,
          children: [
            { index: true, element: page(<GalaxyPage />) },
            { path: 'surah/:id', element: page(<GalaxyPage />) },
            { path: 'ayah/:surah/:ayah', element: page(<AyahPage />) },
            { path: 'roots', element: page(<RootsPage />) },
            { path: 'roots/:root', element: page(<RootsPage />) },
            { path: 'fingerprints', element: page(<FingerprintsPage />) },
            { path: 'fingerprints/:id', element: page(<FingerprintsPage />) },
            { path: 'journey', element: page(<JourneyPage />) },
            { path: 'names', element: page(<NamesPage />) },
            { path: 'names/:name', element: page(<NamesPage />) },
            { path: 'similar', element: page(<SimilarPage />) },
            { path: 'similar/:id', element: page(<SimilarPage />) },
            { path: 'search', element: page(<SearchPage />) },
            { path: 'topics', element: page(<TopicsPage />) },
            { path: 'topics/:id', element: page(<TopicsPage />) },
            { path: 'read', element: page(<ReadPage />) },
            { path: 'read/:id', element: page(<ReadPage />) },
            { path: 'khatma', element: page(<KhatmaPage />) },
            { path: 'mushaf', element: page(<MushafPage />) },
            { path: 'mushaf/:page', element: page(<MushafPage />) },
            { path: 'fawasil', element: page(<FawasilPage />) },
            { path: 'fawasil/:id', element: page(<FawasilPage />) },
            { path: 'waqf', element: page(<WaqfPage />) },
            { path: 'nida', element: page(<NidaPage />) },
            { path: 'anbiya', element: page(<AnbiyaPage />) },
            { path: 'studies', element: page(<StudiesPage />) },
            { path: 'words', element: page(<WordsPage />) },
            { path: 'words/top', element: page(<TopWordsPage />) },
            { path: 'words/:slug', element: page(<WordsPage />) },
            { path: 'about', element: page(<AboutPage />) },
            { path: 'review', element: page(<ReviewPage />) },
            { path: '*', element: page(<GalaxyPage />) },
          ],
        },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') },
)

// a lazily loaded page whose code was replaced by a newer deploy: load the new site once
window.addEventListener('vite:preloadError', (e) => {
  if (reloadOnce()) e.preventDefault()
})

registerServiceWorker()
startNative()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
