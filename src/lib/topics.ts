/**
 * Cleaning of topic labels from the Mushaf Al-Tajweed index (via the Qurany tool).
 * Only the writing is cleaned; no topic is renamed, merged or moved.
 */

/**
 * Spelling errors in the source, each corrected where it stands as a whole word or phrase.
 * Found by reading every label; anything doubtful is left as it is (see VERIFICATION.md).
 */
export const CORRECTIONS: [string, string][] = [
  // alif maqsura written as ya, or ya as alif maqsura
  ['تعالي', 'تعالى'],
  ['الحسني', 'الحسنى'],
  ['المأوي', 'المأوى'],
  ['والنجوي', 'والنجوى'],
  ['السّوآى', 'السوأى'],
  ['يوحي إليهم', 'يوحى إليهم'],
  ['فى', 'في'],
  ['وفى', 'وفي'],
  ['علي معصية', 'على معصية'],
  ['التى', 'التي'],
  ['هى', 'هي'],
  ['ذى', 'ذي'],
  ['المشى', 'المشي'],
  ['الكهرطيسى', 'الكهرطيسي'],
  // hamzat al-qat' missing
  ['الاحكام', 'الأحكام'],
  ['الاشهر', 'الأشهر'],
  ['الارض', 'الأرض'],
  ['الارقاء', 'الأرقاء'],
  ['الايامى', 'الأيامى'],
  ['الازواج', 'الأزواج'],
  ['والاولاد', 'والأولاد'],
  ['اساس', 'أساس'],
  ['ادائها', 'أدائها'],
  ['الاعراض', 'الإعراض'],
  // hamzat al-wasl written as qat'
  ['الإتحاد', 'الاتحاد'],
  ['وإتباع', 'واتباع'],
  ['وإستخدام', 'واستخدام'],
  ['وإستئصال', 'واستئصال'],
  ['بالإستعفاف', 'بالاستعفاف'],
  ['إنتفاء', 'انتفاء'],
  ['إنفراده', 'انفراده'],
  ['إنفجارات', 'انفجارات'],
  ['إكتناه', 'اكتناه'],
  ['الإعتداء', 'الاعتداء'],
  // missing or extra letters and spaces
  ['والإشاة', 'والإشارة'],
  ['أيدتهاالإكتشافات', 'أيدتها الاكتشافات'],
  ['أسماءالجنة', 'أسماء الجنة'],
  ['بالأمروالحكم', 'بالأمر والحكم'],
  ['السئية', 'السيئة'],
  ['الماضيين', 'الماضين'],
  ['الزارعة', 'الزراعة'],
  ['مافي', 'ما في'],
  ['ماهو', 'ما هو'],
  ['عُمران', 'عمران'],
]

export function cleanLabel(raw: string) {
  let s = raw
    .replace(/[\u200b-\u200f\ufeff]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  // brackets turned around when the right-to-left text was copied: «(عاد (قوم هود» → «عاد (قوم هود)»
  const flipped = s.match(/^\(\s*([^()]+?)\s*\(\s*([^()]+?)\s*$/)
  if (flipped) s = `${flipped[1]} (${flipped[2]})`
  s = s
    .replace(/\s*:\s*\(/g, ' (')
    .replace(/(\S)\(/g, '$1 (')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    // the conjunction و is written joined to the next word
    .replace(/(^| )و (?=[\u0621-\u064A])/g, '$1و')
  for (const [from, to] of CORRECTIONS)
    s = s.replace(new RegExp(`(^|[\\s(])${from}(?=$|[\\s)])`, 'g'), `$1${to}`)
  return s
}
