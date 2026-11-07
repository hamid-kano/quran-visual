import { useEffect } from 'react'
import { Link } from 'react-router'

const STUDIES: { to: string; title: string; science: string; text: string }[] = [
  {
    to: '/fawasil',
    title: 'الفواصل',
    science: 'علم الفواصل',
    text: 'الحرف الأخير من كل آية كما رُسم في المصحف: إيقاع كل سورة في شريط، ومواضع تغيّره.',
  },
  {
    to: '/waqf',
    title: 'الوقف والابتداء',
    science: 'علم الوقف والابتداء',
    text: 'علامات الوقف في مصحف المدينة: معانيها وأعدادها وتوزيعها، ومواضع الوقف اللازم والتعانق والسكت.',
  },
  {
    to: '/nida',
    title: 'النداء في القرآن',
    science: 'أساليب الخطاب',
    text: 'مواضع النداء مجموعة بحسب المنادى، كما كُتبت في المصحف، وتوزيعها على المكي والمدني.',
  },
  {
    to: '/anbiya',
    title: 'الأنبياء في القرآن',
    science: 'القصص القرآني',
    text: 'ذكر الأنبياء الخمسة والعشرين بأسمائهم في السور، بترتيب المصحف وبترتيب النزول.',
  },
  {
    to: '/khatma',
    title: 'خطة الختمة',
    science: 'تحزيب القرآن',
    text: 'قسمة صفحات مصحف المدينة على الأيام، مع ورد كل يوم من أول آية فيه إلى آخر آية.',
  },
]

export default function StudiesPage() {
  useEffect(() => {
    document.title = 'علوم القرآن · آيات مرئية'
    return () => {
      document.title = 'آيات مرئية'
    }
  }, [])
  return (
    <div className="absolute inset-0 overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 2xl:max-w-6xl">
        <h1 className="font-display text-4xl font-bold text-gold-soft">علوم القرآن</h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-mist">
          أبواب من علوم القرآن تُعرض من النص نفسه، بلا إضافة: كل ما فيها محسوب من نص المصحف الذي
          نشره مجمع الملك فهد ومن وسوم المدوّنة القرآنية العربية، والقواعد مشروحة في كل صفحة.
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {STUDIES.map((s) => (
            <li key={s.to}>
              <Link
                to={s.to}
                className="page block h-full rounded-md px-5 py-4 hover:ring-2 hover:ring-gold/50"
              >
                <span className="block text-sm text-ink-soft">{s.science}</span>
                <span className="block font-display text-2xl font-bold text-ink">{s.title}</span>
                <span className="mt-1 block leading-relaxed text-ink">{s.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
