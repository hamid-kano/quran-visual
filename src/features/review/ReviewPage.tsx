import { useEffect } from 'react'
import { Link } from 'react-router'
import { ReviewLink } from '../../components/ReviewLink'
import { CORRECTIONS } from '../../lib/topics'
import { toArabicDigits } from '../../lib/arabic'
import { ayahPath } from '../../lib/links'
import { UNCERTAIN } from '../../lib/review'

function Part({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10" aria-labelledby={`part-${n}`}>
      <h2 id={`part-${n}`} className="font-display text-2xl font-bold text-ink">
        {toArabicDigits(n)}. {title}
      </h2>
      <div className="mt-3 space-y-3 font-display text-[1.2rem] leading-[2] text-ink">
        {children}
      </div>
    </section>
  )
}

/** What is asked of the reviewer in a part, set apart from the explanation around it. */
function Ask({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded border border-[#d8c48e] bg-vellum-deep/50 px-4 py-2">
      <p className="text-sm font-semibold text-ink-soft">المطلوب</p>
      <div className="leading-[1.9]">{children}</div>
    </div>
  )
}

const a = 'text-[#7a5a12] underline underline-offset-4'

function Places({ list }: { list: [string, string][] }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1">
      {list.map(([label, to]) => (
        <li key={to}>
          <Link to={to} className={a}>
            {label}
          </Link>
        </li>
      ))}
    </ul>
  )
}

export default function ReviewPage() {
  useEffect(() => {
    document.title = 'مراجعة أهل الاختصاص · آيات مرئية'
    return () => {
      document.title = 'آيات مرئية'
    }
  }, [])

  return (
    <div className="absolute inset-0 overflow-y-auto px-3 py-6 sm:py-10">
      <article className="page mx-auto max-w-[44rem] rounded-md px-6 py-10 sm:px-12">
        <h1 className="font-display text-4xl font-bold text-ink">مراجعة أهل الاختصاص</h1>
        <p className="mt-4 font-display text-[1.25rem] leading-[2] text-ink-soft">
          تعرض هذه المنصة ما يمكن قياسه في نص القرآن الكريم، مما نُقل من مصادر موثّقة أو حُسب منها.
          وقبل إطلاقها العام نعرضها على أهل الاختصاص في علوم القرآن والعربية، ليُنظر في سلامة ما
          تنقله وما تعرضه. وتبيّن هذه الصفحة ما نرجو مراجعته، مرتّباً من الأهم.
        </p>

        <section className="mt-8" aria-labelledby="how">
          <h2 id="how" className="font-display text-2xl font-bold text-ink">
            كيف تُرسل الملاحظة
          </h2>
          <p className="mt-3 font-display text-[1.2rem] leading-[2] text-ink">
            في أسفل كل صفحة آية، وكل سورة وجذر وموضوع وعلم، زرّ «ملاحظة على هذا الموضع». يفتح رسالة
            جاهزة فيها اسم الموضع ورابطه، فيكفي أن تُكتب الملاحظة، ومرجعها إن وُجد. وللملاحظات
            العامة الزر الذي في آخر هذه الصفحة.
          </p>
        </section>

        <Part n={1} title="النص القرآني وعرضه">
          <p>
            النص هو ملف مجمع الملك فهد لطباعة المصحف الشريف (رواية حفص، الإصدار ١٨) بحروفه، ويُعرض
            بخط المجمع نفسه. ولا يُحذف منه إلا رقم الآية الملحق بآخرها. وقورن بمصدر ثانٍ فاختلفت
            أربع آيات، والمعتمد فيها ملف المجمع.
          </p>
          <Ask>
            النظر في سلامة العرض: الضبط وعلامات الوقف والبسملة، ولا سيما في المواضع الأربعة:
            <Places
              list={[
                ['البقرة ٧٢', ayahPath(2, 72)],
                ['هود ٤١', ayahPath(11, 41)],
                ['الصافات ١٦٤', ayahPath(37, 164)],
                ['فصلت ٤٧', ayahPath(41, 47)],
              ]}
            />
          </Ask>
        </Part>

        <Part n={2} title="التحليل الصرفي">
          <p>
            جذر كل كلمة ومدخلها ووصفها الصرفي من المدوّنة القرآنية العربية (جامعة ليدز)، والمصطلحات
            العربية ترجمة المنصة لوسوم المدوّنة. تظهر حين تُختار أي كلمة في نص سورة أو آية.
          </p>
          <Ask>
            مراجعة الأوصاف العربية في عيّنة، منها مواضع صُحّح وصفها أثناء الإعداد: الفعل الرباعي «
            <span className="font-quran">ٱطۡمَأَنَّ</span>»، واسم الفعل «
            <span className="font-quran">هَلُمَّ</span>»، وجمع «
            <span className="font-quran">أُوْلَٰٓئِكَ</span>».
            <Places
              list={[
                ['الفاتحة ٢', ayahPath(1, 2)],
                ['البقرة ٥', ayahPath(2, 5)],
                ['البقرة ٢٥٥', ayahPath(2, 255)],
                ['الأنعام ١٥٠', ayahPath(6, 150)],
                ['الحج ١١', ayahPath(22, 11)],
                ['الإخلاص ١', ayahPath(112, 1)],
              ]}
            />
          </Ask>
        </Part>

        <Part n={3} title="خريطة الموضوعات">
          <p>
            الموضوعات من الفهرس الموضوعي لمصحف التجويد (د. محمد حبش، دار المعرفة)، كما نقلته أداة
            «قرآني» في جامعة ليدز. وتصنيف الآيات فيه اجتهاد مؤلّفه، والمنصة تنقله ولا تعدّله.
          </p>
          <Ask>
            <p>ثلاثة أمور تحتاج قراراً:</p>
            <ol className="space-y-2 ps-6 [list-style-type:arabic-indic]">
              <li>
                قسم{' '}
                <Link to="/topics/928" className={a}>
                  العلوم والفنون
                </Link>{' '}
                يربط آياتٍ بمفاهيم علمية حديثة، ويُعرض الآن مع تنبيه أنه اجتهاد لا تتبنّاه المنصة.
                أيُبقى كذلك أم يُحذف؟
              </li>
              <li>
                عناوين لم نتيقّن من المقصود بها فتُركت كما وردت. ما الصواب في كتابتها؟
                <Places list={UNCERTAIN.map(([l, id]) => [`«${l}»`, `/topics/${id}`])} />
              </li>
              <li>إقرار التصحيحات الإملائية التالية في عناوين الفهرس، ولم يُغيَّر بها معنى.</li>
            </ol>
          </Ask>
          <details className="rounded border border-[#e0cf9f] px-4 py-2">
            <summary className="cursor-pointer text-base text-ink-soft">
              التصحيحات الإملائية ({toArabicDigits(CORRECTIONS.length)})
            </summary>
            <table className="mt-2 w-full text-base">
              <thead>
                <tr className="text-right text-sm text-ink-soft">
                  <th className="py-1 font-semibold">في المصدر</th>
                  <th className="py-1 font-semibold">بعد التصحيح</th>
                </tr>
              </thead>
              <tbody>
                {CORRECTIONS.map(([from, to]) => (
                  <tr key={from} className="border-t border-[#efe3bf]">
                    <td className="py-1">{from}</td>
                    <td className="py-1">{to}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </Part>

        <Part n={4} title="الأعلام">
          <p>الأعلام وتصنيفها من المدوّنة القرآنية العربية، وفيها ما قد يُختلف في عدّه علماً.</p>
          <Ask>
            النظر في قائمة{' '}
            <Link to="/names" className={a}>
              الأعلام
            </Link>
            ، ومنها مثلاً «جَنَّة» و«مُسْلِم»: أتُعرض أعلاماً، أم يُنبَّه على أنها تصنيف المدوّنة؟
          </Ask>
        </Part>

        <Part n={5} title="ترتيب النزول ومكانه">
          <p>
            ترتيب النزول وكون السورة مكية أو مدنية من بيانات مشروع «تنزيل»، وفي سور بعينها خلاف
            معروف بين العلماء.
          </p>
          <Ask>
            أيصح عرض ترتيب واحد كما في{' '}
            <Link to="/journey" className={a}>
              رحلة النزول
            </Link>
            ، وكيف يُصاغ التنبيه على الخلاف؟
          </Ask>
        </Part>

        <Part n={6} title="المقاييس المحسوبة">
          <p>
            <Link to="/" className={a}>
              مجرّة السور
            </Link>{' '}
            و
            <Link to="/roots" className={a}>
              شبكة الجذور
            </Link>{' '}
            و
            <Link to="/similar" className={a}>
              المتشابهات اللفظية
            </Link>{' '}
            مقاييس لفظية تُحسب من النص. صحة الحساب مختبرة، أما القرب بين السور أو الجذور فلا يُستنبط
            منه معنى.
          </p>
          <Ask>
            النظر في صياغة الشروح المرافقة لها، حتى لا يُفهم منها تفسير أو حكم لم يُقصد. وطريقة
            الحساب مفصّلة في{' '}
            <Link to="/about" className={a}>
              صفحة المنهج
            </Link>
            .
          </Ask>
        </Part>

        <section className="mt-10" aria-labelledby="after">
          <h2 id="after" className="font-display text-2xl font-bold text-ink">
            بعد المراجعة
          </h2>
          <p className="mt-3 font-display text-[1.2rem] leading-[2] text-ink">
            تُدرس كل ملاحظة، وما يُعتمد منها يُصحَّح ويُسجَّل في{' '}
            <a
              href="https://github.com/hamid-kano/quran-visual/blob/main/VERIFICATION.md"
              className={a}
            >
              ملف التحقق
            </a>{' '}
            مع مرجعه. جزاكم الله خيراً.
          </p>
        </section>

        <ReviewLink subject="الموقع كله" />
      </article>
    </div>
  )
}
