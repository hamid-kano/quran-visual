/**
 * Where notes from reviewers go. The site is static, so a note is not stored here: each link opens
 * a ready message (an email, or a GitHub issue form) that already names the place it is about.
 */
export const REVIEW = {
  repo: 'hamid-kano/quran-visual',
  /** Set at build time (VITE_REVIEW_EMAIL); without it only the GitHub route is offered. The
   *  loose type lets the build scripts and tests, which have no Vite types, import this file. */
  email:
    (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_REVIEW_EMAIL?.trim() ||
    null,
}

/** The kinds of note a reviewer can pick in the issue form, in its order. */
export const NOTE_KINDS = [
  'النص القرآني أو عرضه',
  'التحليل الصرفي أو الجذر',
  'الموضوعات',
  'الأعلام',
  'الأعداد والإحصاءات',
  'المتشابهات',
  'ترتيب النزول أو مكانه',
  'صياغة الشرح',
  'أخرى',
] as const

export interface Place {
  /** What the note is about, as the reader sees it: «سورة البقرة، الآية ٢٥٥». */
  subject: string
  url: string
}

export const issueUrl = ({ subject, url }: Place, repo = REVIEW.repo) =>
  `https://github.com/${repo}/issues/new?` +
  new URLSearchParams({
    template: 'review.yml',
    title: `ملاحظة: ${subject}`,
    location: url,
  }).toString()

export function mailUrl({ subject, url }: Place, email: string) {
  const body = [
    `الموضع: ${subject}`,
    `الرابط: ${url}`,
    '',
    `نوع الملاحظة (${NOTE_KINDS.join('، ')}):`,
    '',
    'الملاحظة:',
    '',
    'المرجع أو الدليل، إن وُجد:',
    '',
  ].join('\n')
  // encodeURIComponent, not URLSearchParams: mail apps read "+" literally, not as a space
  return `mailto:${email}?subject=${encodeURIComponent(`ملاحظة: ${subject}`)}&body=${encodeURIComponent(body)}`
}

/** Topic labels left as they are in the source (ids checked by tests/review.test.ts). */
export const UNCERTAIN: [string, number][] = [
  ['التشييع للأخبار الكاذبة', 481],
  ['قتال من ألقى سلاح', 800],
  ['شعوبا والقبائل', 417],
]
