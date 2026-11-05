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
import '@fontsource/ibm-plex-sans-arabic/500.css'
import '@fontsource/ibm-plex-sans-arabic/600.css'
import './styles.css'
import { Shell } from './components/Shell'
import { Loading } from './components/Status'

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

const page = (el: React.ReactNode) => <Suspense fallback={<Loading />}>{el}</Suspense>

const router = createBrowserRouter(
  [
    {
      element: <Shell />,
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
        { path: 'about', element: page(<AboutPage />) },
        { path: '*', element: page(<GalaxyPage />) },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') },
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
