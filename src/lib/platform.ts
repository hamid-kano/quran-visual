/** The public website, whatever copy of the site is running (the app included). */
export const SITE_URL = 'https://hamid-kano.github.io/quran-visual'

/** This copy is the mobile app's (built with `vite build --mode app`), not the website. */
export const IS_APP = import.meta.env.MODE === 'app'
