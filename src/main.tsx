import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import '@fontsource/amiri-quran/400.css'
// Typography by role:
//   Amiri Quran        — the Quranic text only
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

const page = (el: React.ReactNode) => <Suspense fallback={<Loading />}>{el}</Suspense>

const router = createBrowserRouter(
  [
    {
      element: <Shell />,
      children: [
        { index: true, element: page(<GalaxyPage />) },
        { path: 'surah/:id', element: page(<GalaxyPage />) },
        { path: 'roots', element: page(<RootsPage />) },
        { path: 'roots/:root', element: page(<RootsPage />) },
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
