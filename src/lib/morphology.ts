/**
 * Arabic descriptions of the Quranic Arabic Corpus morphology tags.
 * Terms follow the corpus's own Arabic glossary of grammatical terms.
 */
import type { Segment } from '../data/schemas'

const NOUN_KINDS: [string, string][] = [
  ['PN', 'اسم علم'],
  ['ADJ', 'صفة'],
  ['DEM', 'اسم إشارة'],
  ['REL', 'اسم موصول'],
  ['T', 'ظرف زمان'],
  ['LOC', 'ظرف مكان'],
  ['VN', 'مصدر'],
  ['ACT_PCPL', 'اسم فاعل'],
  ['PASS_PCPL', 'اسم مفعول'],
  ['NV', 'اسم فعل'],
  ['INTG', 'اسم استفهام'],
  ['COND', 'اسم شرط'],
]

const PARTICLES: [string, string][] = [
  ['DET', 'أداة تعريف'],
  ['CONJ', 'حرف عطف'],
  ['REM', 'حرف استئناف'],
  ['CIRC', 'واو الحال'],
  ['COM', 'واو المعية'],
  ['NEG', 'حرف نفي'],
  ['PRO', 'حرف نهي'],
  ['EMPH', 'لام التوكيد'],
  ['PRP', 'لام التعليل'],
  ['IMPV', 'لام الأمر'],
  ['COND', 'أداة شرط'],
  ['INTG', 'حرف استفهام'],
  ['SUB', 'حرف مصدري'],
  ['RES', 'أداة حصر'],
  ['CERT', 'حرف تحقيق'],
  ['VOC', 'حرف نداء'],
  ['RSLT', 'حرف واقع في جواب الشرط'],
  ['SUP', 'حرف زائد'],
  ['PREV', 'حرف كافّ'],
  ['FUT', 'حرف استقبال'],
  ['RET', 'حرف إضراب'],
  ['EXP', 'أداة استثناء'],
  ['CAUS', 'حرف سببية'],
  ['EXL', 'حرف تفصيل'],
  ['AMD', 'حرف استدراك'],
  ['ANS', 'حرف جواب'],
  ['INC', 'حرف ابتداء'],
  ['INT', 'حرف تفسير'],
  ['EXH', 'حرف تحضيض'],
  ['SUR', 'حرف فجاءة'],
  ['AVR', 'حرف ردع'],
  ['INL', 'حروف مقطّعة'],
  ['ATT', 'حرف تنبيه'],
  ['ADDR', 'حرف خطاب'],
  ['DIST', 'لام البعد'],
  ['EQ', 'حرف تسوية'],
  ['ACC', 'حرف نصب'],
  ['P', 'حرف جر'],
]

const CASE: Record<string, string> = { NOM: 'مرفوع', ACC: 'منصوب', GEN: 'مجرور' }
const MOOD: Record<string, string> = { IND: 'مرفوع', SUBJ: 'منصوب', JUS: 'مجزوم' }
const ASPECT: Record<string, string> = { PERF: 'ماضٍ', IMPF: 'مضارع', IMPV: 'أمر' }
const FORMS = [
  '',
  'فَعَلَ',
  'فَعَّلَ',
  'فاعَلَ',
  'أَفْعَلَ',
  'تَفَعَّلَ',
  'تَفاعَلَ',
  'انْفَعَلَ',
  'افْتَعَلَ',
  'افْعَلَّ',
  'اسْتَفْعَلَ',
  'افْعالَّ',
  'افْعَوْعَلَ',
]
const FAMILY: Record<string, string> = {
  إِنّ: 'من أخوات إنّ',
  كَان: 'من أخوات كان',
  كَاد: 'من أفعال المقاربة',
}

const PERSON: Record<string, string> = { '1': 'للمتكلم', '2': 'للمخاطب', '3': 'للغائب' }
const NUMBER: Record<string, string> = { S: 'مفرد', D: 'مثنى', P: 'جمع' }
const GENDER: Record<string, string> = { M: 'مذكر', F: 'مؤنث' }

/** "3MP" → "للغائب، جمع، مذكر"; "MS" → "مفرد، مذكر"; "F" → "مؤنث". */
function personNumberGender(tag: string): string | null {
  const m = /^([123])?([MF])?([SDP])?$/.exec(tag)
  if (!m || (!m[1] && !m[2] && !m[3])) return null
  return [m[1] && PERSON[m[1]], m[3] && NUMBER[m[3]], m[2] && GENDER[m[2]]]
    .filter(Boolean)
    .join('، ')
}

export interface SegmentInfo {
  form: string
  label: string
  details: string[]
}

export interface WordInfo {
  root: string | null
  lemma: string | null
  segments: SegmentInfo[]
}

function describeSegment([form, tag, raw]: Segment): SegmentInfo {
  const f = raw.split('|').filter(Boolean)
  const has = (x: string) => f.includes(x)
  const details: string[] = []
  let label: string

  if (tag === 'V') {
    const aspect = f.find((x) => ASPECT[x])
    label = `فعل ${aspect ? ASPECT[aspect] : ''}`.trim()
    if (has('PASS')) details.push('مبني للمجهول')
    const mood = f.find((x) => x.startsWith('MOOD:'))?.slice(5)
    if (mood && MOOD[mood]) details.push(MOOD[mood])
    const vf = Number(f.find((x) => x.startsWith('VF:'))?.slice(3))
    if (vf && FORMS[vf]) details.push(`على وزن ${FORMS[vf]}`)
  } else if (tag === 'N') {
    if (has('PRON')) label = has('SUFF') ? 'ضمير متصل' : 'ضمير'
    else label = NOUN_KINDS.find(([k]) => has(k))?.[1] ?? 'اسم'
    const c = f.find((x) => CASE[x])
    if (c) details.push(CASE[c]!)
    if (has('INDEF')) details.push('نكرة')
  } else {
    label = PARTICLES.find(([k]) => has(k))?.[1] ?? 'حرف'
  }

  const fam = f.find((x) => x.startsWith('FAM:'))?.slice(4)
  if (fam && FAMILY[fam]) details.push(FAMILY[fam])
  for (const x of f) {
    if (tag === 'P') break
    const png = personNumberGender(x)
    if (png && !(tag === 'N' && x === 'P')) details.push(png)
  }
  return { form, label, details }
}

export function describeWord(segments: Segment[]): WordInfo {
  let root: string | null = null
  let lemma: string | null = null
  for (const [, , raw] of segments)
    for (const x of raw.split('|')) {
      if (!root && x.startsWith('ROOT:')) root = x.slice(5)
      if (!lemma && x.startsWith('LEM:') && !raw.includes('PREF') && !raw.includes('SUFF'))
        lemma = x.slice(4)
    }
  if (!lemma)
    for (const [, , raw] of segments) {
      const l = raw.split('|').find((x) => x.startsWith('LEM:'))
      if (l && raw.includes('ROOT:')) lemma = l.slice(4)
    }
  return { root, lemma, segments: segments.map(describeSegment) }
}
