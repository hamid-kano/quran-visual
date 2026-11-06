/**
 * The prophets and messengers named in the Quran (twenty-five, as they are commonly counted),
 * each by the lemma the Quranic Arabic Corpus gives the name. A mention is a word whose stem is
 * that name as a proper noun.
 */
export interface Prophet {
  name: string
  lemmas: string[]
  /** Places where the name means someone else, left out, with why. */
  except?: { places: [number, number][]; why: string }
  note?: string
}

export const PROPHETS: Prophet[] = [
  { name: 'آدم', lemmas: ['آدَم'] },
  { name: 'إدريس', lemmas: ['إِدْرِيس'] },
  { name: 'نوح', lemmas: ['نُوح'] },
  {
    name: 'هود',
    lemmas: ['هُود'],
    except: {
      places: [
        [2, 111],
        [2, 135],
        [2, 140],
      ],
      why: '«هُودًا» في هذه المواضع من البقرة بمعنى اليهود، لا اسم النبي.',
    },
  },
  { name: 'صالح', lemmas: ['صالِح'] },
  { name: 'إبراهيم', lemmas: ['إِبْراهِيم'] },
  { name: 'لوط', lemmas: ['لُوط'] },
  { name: 'إسماعيل', lemmas: ['إِسْماعِيل'] },
  { name: 'إسحاق', lemmas: ['إِسْحاق'] },
  { name: 'يعقوب', lemmas: ['يَعْقُوب'] },
  { name: 'يوسف', lemmas: ['يُوسُف'] },
  { name: 'أيوب', lemmas: ['أَيُّوب'] },
  { name: 'شعيب', lemmas: ['شُعَيْب'] },
  { name: 'موسى', lemmas: ['مُوسَى'] },
  { name: 'هارون', lemmas: ['هارُون'] },
  {
    name: 'ذو الكفل',
    lemmas: [],
    note: 'يُذكر بلقبه «ذَا ٱلۡكِفۡلِ»، ولا تسمه المدوّنة اسم علم، فتُعدّ مواضع هذا اللقب.',
  },
  { name: 'داود', lemmas: ['داوُد'] },
  { name: 'سليمان', lemmas: ['سُلَيْمان'] },
  { name: 'إلياس', lemmas: ['إِلْياس'], note: 'ومنه «إِلۡ يَاسِينَ» في الصافات ١٣٠.' },
  { name: 'اليسع', lemmas: ['الْيَسَع'] },
  {
    name: 'يونس',
    lemmas: ['يُونُس'],
    note: 'ويُذكر أيضاً بوصفه «ذَا ٱلنُّونِ» و«صَاحِبِ ٱلۡحُوتِ»، ولا يدخلان في هذا العدّ.',
  },
  { name: 'زكريا', lemmas: ['زَكَرِيّا'] },
  { name: 'يحيى', lemmas: ['يَحْيَى'] },
  {
    name: 'عيسى',
    lemmas: ['عِيسَى'],
    note: 'ويُذكر أيضاً بـ«ٱلۡمَسِيحُ» و«ٱبۡنُ مَرۡيَمَ»، ولا يدخلان في هذا العدّ.',
  },
  { name: 'محمد ﷺ', lemmas: ['مُحَمَّد', 'أَحْمَد'], note: 'ومنه «أَحۡمَدُ» في الصف ٦.' },
]
