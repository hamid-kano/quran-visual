import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { loadSurahs } from '../../data/load'
import { useAsync } from '../../data/useAsync'
import type { Surah } from '../../data/schemas'
import { ErrorNote, Loading } from '../../components/Status'
import { AYAH, countOf, formatNumber, revelationLabel, toArabicDigits } from '../../lib/arabic'
import { MECCAN, MEDINAN } from '../galaxy/colors'

const W = 1000
const PAD = { top: 24, right: 16, bottom: 28, left: 44 }
const TOP_H = 250
const GAP = 34
const BOT_H = 130
const H = PAD.top + TOP_H + GAP + BOT_H + PAD.bottom
const WINDOW = 9

const avg = (s: Surah) => s.words / s.ayahs

function niceMax(v: number) {
  const step = 10 ** Math.floor(Math.log10(v))
  return Math.ceil(v / step) * step
}

function Chart({ list, onPick }: { list: Surah[]; onPick: (s: Surah) => void }) {
  const [hover, setHover] = useState<number | null>(null)
  const innerW = W - PAD.left - PAD.right
  const step = innerW / list.length
  // order 1 sits at the right edge: time flows right-to-left, like the page
  const xOf = (i: number) => W - PAD.right - step * (i + 0.5)
  const maxAvg = niceMax(Math.max(...list.map(avg)))
  const maxAyahs = niceMax(Math.max(...list.map((s) => s.ayahs)))
  const yAvg = (v: number) => PAD.top + TOP_H - (v / maxAvg) * TOP_H
  const botTop = PAD.top + TOP_H + GAP
  const yAyahs = (v: number) => botTop + BOT_H - (v / maxAyahs) * BOT_H

  const smooth = useMemo(
    () =>
      list.map((_, i) => {
        const from = Math.max(0, i - (WINDOW >> 1))
        const slice = list.slice(from, Math.min(list.length, i + (WINDOW >> 1) + 1))
        return slice.reduce((n, s) => n + s.words, 0) / slice.reduce((n, s) => n + s.ayahs, 0)
      }),
    [list],
  )
  const firstMedinan = list.findIndex((s) => s.revelation === 'medinan')
  const h = hover !== null ? list[hover] : undefined

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full select-none"
        role="img"
        aria-label="متوسط طول الآية وعدد الآيات لكل سورة بحسب ترتيب النزول"
        onPointerLeave={() => setHover(null)}
      >
        {/* gridlines + y labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={yAvg(maxAvg * t)}
              y2={yAvg(maxAvg * t)}
              stroke="#a9b8cf"
              strokeOpacity={0.12}
            />
            <text
              x={PAD.left - 8}
              y={yAvg(maxAvg * t) + 4}
              textAnchor="end"
              fontSize={12}
              fill="#a9b8cf"
            >
              {toArabicDigits(Math.round(maxAvg * t))}
            </text>
          </g>
        ))}
        {[0, 0.5, 1].map((t) => (
          <g key={`b${t}`}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={yAyahs(maxAyahs * t)}
              y2={yAyahs(maxAyahs * t)}
              stroke="#a9b8cf"
              strokeOpacity={0.12}
            />
            <text
              x={PAD.left - 8}
              y={yAyahs(maxAyahs * t) + 4}
              textAnchor="end"
              fontSize={12}
              fill="#a9b8cf"
            >
              {toArabicDigits(Math.round(maxAyahs * t))}
            </text>
          </g>
        ))}
        <text
          x={W - PAD.right}
          y={PAD.top - 8}
          textAnchor="start"
          fontSize={13}
          fill="#e9e1cc"
          direction="rtl"
        >
          متوسط عدد الكلمات في الآية
        </text>
        <text
          x={W - PAD.right}
          y={botTop - 8}
          textAnchor="start"
          fontSize={13}
          fill="#e9e1cc"
          direction="rtl"
        >
          عدد الآيات
        </text>

        {/* the first Medinan surah in revelation order */}
        {firstMedinan > 0 && (
          <g>
            <line
              x1={xOf(firstMedinan) + step / 2}
              x2={xOf(firstMedinan) + step / 2}
              y1={PAD.top}
              y2={botTop + BOT_H}
              stroke="#e6cf8f"
              strokeOpacity={0.45}
              strokeDasharray="3 4"
            />
            <text
              x={xOf(firstMedinan) + step / 2 - 6}
              y={PAD.top + 14}
              fontSize={12}
              fill="#e6cf8f"
              textAnchor="start"
              direction="rtl"
            >
              أول سورة مدنية في الترتيب
            </text>
          </g>
        )}

        {/* smoothed line */}
        <polyline
          fill="none"
          stroke="#e6cf8f"
          strokeWidth={2.2}
          strokeLinejoin="round"
          points={smooth.map((v, i) => `${xOf(i)},${yAvg(v)}`).join(' ')}
        />

        {list.map((s, i) => {
          const color = s.revelation === 'meccan' ? MECCAN : MEDINAN
          const on = hover === i
          return (
            <g key={s.id}>
              <circle
                cx={xOf(i)}
                cy={yAvg(avg(s))}
                r={on ? 6 : 3.6}
                fill={color}
                fillOpacity={on ? 1 : 0.85}
              />
              <rect
                x={xOf(i) - step * 0.36}
                width={step * 0.72}
                y={yAyahs(s.ayahs)}
                height={botTop + BOT_H - yAyahs(s.ayahs)}
                fill={color}
                fillOpacity={on ? 1 : 0.7}
                rx={1}
              />
              {/* full-height hit column */}
              <rect
                x={xOf(i) - step / 2}
                width={step}
                y={PAD.top}
                height={botTop + BOT_H - PAD.top}
                fill="transparent"
                onPointerEnter={() => setHover(i)}
                onClick={() => onPick(s)}
                style={{ cursor: 'pointer' }}
              />
            </g>
          )
        })}

        <text
          x={W - PAD.right}
          y={H - 6}
          textAnchor="start"
          fontSize={12}
          fill="#a9b8cf"
          direction="rtl"
        >
          أول ما نزل
        </text>
        <text x={PAD.left} y={H - 6} textAnchor="end" fontSize={12} fill="#a9b8cf" direction="rtl">
          آخر ما نزل
        </text>
      </svg>

      <div
        className="pointer-events-none mt-3 min-h-[4.5rem] rounded-xl border border-gold/20 bg-night-deep/70 px-4 py-3"
        aria-live="polite"
      >
        {h ? (
          <p className="text-vellum">
            <span className="font-display text-2xl text-gold-soft">سورة {h.name}</span>
            <span className="mx-3 text-mist">
              {revelationLabel(h.revelation)}، ترتيبها في النزول {toArabicDigits(h.order)}
            </span>
            <br />
            <span className="text-mist">
              {countOf(h.ayahs, AYAH)}، ومتوسط طول الآية{' '}
              {formatNumber(Math.round(avg(h) * 10) / 10)} من الكلمات
            </span>
          </p>
        ) : (
          <p className="text-mist">مرّر على المخطط لعرض بيانات كل سورة، وانقر لفتحها في المجرّة.</p>
        )}
      </div>
    </div>
  )
}

export default function JourneyPage() {
  const state = useAsync(loadSurahs, 'surahs')
  const navigate = useNavigate()
  const list = useMemo(
    () =>
      state.status === 'ready' ? [...state.data.surahs].sort((a, b) => a.order - b.order) : [],
    [state],
  )
  if (state.status === 'loading') return <Loading />
  if (state.status === 'error') return <ErrorNote error={state.error} />

  return (
    <div className="absolute inset-0 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-4xl font-bold text-gold-soft">رحلة النزول</h1>
        <p className="mt-3 max-w-3xl text-[1.05rem] leading-relaxed text-mist">
          السور مرتّبة بحسب نزولها من اليمين إلى اليسار. النقاط متوسط طول الآية في كل سورة، والخط
          متوسط متحرك لكل تسع سور متتالية، والأعمدة عدد الآيات.
        </p>
        <div className="mt-3 flex gap-5 text-sm text-mist">
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: MECCAN }} /> مكية
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: MEDINAN }} /> مدنية
          </span>
        </div>

        <p className="mt-4 text-sm text-mist sm:hidden">اسحب المخطط أفقياً لرؤيته كاملاً.</p>
        <div className="-mx-4 mt-6 overflow-x-auto px-4">
          <div className="min-w-[640px]">
            <Chart list={list} onPick={(s) => navigate(`/surah/${s.id}`)} />
          </div>
        </div>

        <p className="mt-6 max-w-3xl text-sm leading-relaxed text-mist">
          ترتيب النزول ومكان النزول هنا وفق بيانات مشروع تنزيل، وفي مواضع منهما خلاف معروف بين
          العلماء.{' '}
          <Link to="/about" className="text-gold-soft underline underline-offset-4">
            المنهج والمصادر
          </Link>
        </p>

        <details className="mt-6 rounded-xl border border-gold/20 px-4 py-3 text-vellum">
          <summary className="cursor-pointer text-mist">عرض البيانات في جدول</summary>
          <table className="mt-3 w-full text-sm">
            <thead className="text-mist">
              <tr>
                <th className="py-1 text-right font-medium">ترتيب النزول</th>
                <th className="py-1 text-right font-medium">السورة</th>
                <th className="py-1 text-right font-medium">النزول</th>
                <th className="py-1 text-right font-medium">الآيات</th>
                <th className="py-1 text-right font-medium">متوسط الآية</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id} className="border-t border-gold/10">
                  <td className="py-1">{toArabicDigits(s.order)}</td>
                  <td className="py-1">
                    <Link to={`/surah/${s.id}`} className="hover:text-gold-soft">
                      {s.name}
                    </Link>
                  </td>
                  <td className="py-1">{revelationLabel(s.revelation)}</td>
                  <td className="py-1">{formatNumber(s.ayahs)}</td>
                  <td className="py-1">{formatNumber(Math.round(avg(s) * 10) / 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>
    </div>
  )
}
