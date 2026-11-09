import { useEffect } from 'react'
import { IconDownload, IconMushaf } from '../../components/icons'

/** The latest Android build, published by .github/workflows/android.yml under one fixed address. */
const APK = 'https://github.com/hamid-kano/quran-visual/releases/download/app-latest/ayat-maria.apk'
const RELEASE = 'https://github.com/hamid-kano/quran-visual/releases/tag/app-latest'

const FEATURES: [string, string][] = [
  ['المنصة كاملة في جيبك', 'المصحف والقراءة والمعجم والدراسات، تفتح فوراً وتعمل دون اتصال.'],
  [
    'التلاوة والشاشة مقفلة',
    'تستمر التلاوة آية بعد آية، وتتحكم بها من شاشة القفل والإشعارات وأزرار السماعات.',
  ],
  ['المصحف لا ينطفئ', 'تبقى الشاشة مضاءة ما دام المصحف مفتوحاً.'],
  [
    'تنقّل التطبيقات',
    'زر الرجوع يغلق القائمة المفتوحة أولاً ثم يرجع صفحة، والمشاركة من قائمة المشاركة في الهاتف.',
  ],
]

/** The Android app: what it adds, the download, and how to install it. */
export default function AppPage() {
  useEffect(() => {
    document.title = 'تطبيق أندرويد · آيات مرئية'
    return () => {
      document.title = 'آيات مرئية'
    }
  }, [])

  return (
    <div className="absolute inset-0 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex items-start gap-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl border border-gold/30 bg-night-deep text-gold">
            <IconMushaf className="size-9" />
          </span>
          <div>
            <h1 className="font-display text-4xl font-bold text-gold-soft">آيات مرئية لأندرويد</h1>
            <p className="mt-1 text-mist">
              <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-sm text-gold-soft">
                نسخة تجريبية
              </span>{' '}
              تُبنى من الكود نفسه مع كل تحديث للمنصة.
            </p>
          </div>
        </div>

        <a
          href={APK}
          className="tap mt-8 flex min-h-14 items-center justify-center gap-3 rounded-full bg-gold/25 px-6 text-lg font-semibold text-gold-soft hover:bg-gold/35 active:bg-gold/40"
        >
          <IconDownload className="size-6" />
          تحميل التطبيق (APK)
        </a>
        <p className="mt-2 text-center text-sm text-mist">
          لأندرويد ٧ فما بعده، والحجم نحو ١١ ميغابايت.{' '}
          <a href={RELEASE} className="text-gold-soft underline underline-offset-4">
            تفاصيل آخر بناء
          </a>
        </p>

        <ul className="mt-10 grid gap-3 sm:grid-cols-2">
          {FEATURES.map(([title, text]) => (
            <li key={title} className="rounded-xl border border-gold/15 bg-night-deep/50 p-4">
              <p className="font-semibold text-vellum">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-mist">{text}</p>
            </li>
          ))}
        </ul>

        <section aria-labelledby="install" className="mt-10">
          <h2 id="install" className="font-display text-2xl font-bold text-gold-soft">
            طريقة التثبيت
          </h2>
          <ol className="mt-3 list-decimal space-y-2 ps-6 leading-relaxed text-vellum marker:text-gold-soft">
            <li>افتح هذه الصفحة على الهاتف واضغط «تحميل التطبيق».</li>
            <li>افتح الملف بعد اكتمال التحميل.</li>
            <li>
              يطلب أندرويد مرة واحدة السماح بتثبيت التطبيقات من المتصفح، لأن التطبيق ليس من المتجر
              بعد: اسمح، ثم أكمل التثبيت.
            </li>
            <li>للتحديث لاحقاً: حمّل من الزر نفسه، فيُثبَّت فوق النسخة الموجودة.</li>
          </ol>
        </section>

        <p className="mt-10 rounded-xl border border-gold/15 p-4 text-sm leading-relaxed text-mist">
          النشر في متجر Google Play يأتي لاحقاً. أما نسخة iPhone فتحتاج إلى البناء على جهاز Mac،
          وتأتي لاحقاً كذلك. وإلى ذلك الحين يمكن استعمال المنصة من المتصفح على iPhone، وإضافتها إلى
          الشاشة الرئيسية من «مشاركة ← إضافة إلى الشاشة الرئيسية».
        </p>
      </div>
    </div>
  )
}
