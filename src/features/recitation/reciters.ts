/**
 * Reciters and their recordings on EveryAyah (https://everyayah.com), which publishes one
 * file per ayah. Every folder is taken from EveryAyah's own register of recitations
 * (everyayah.com/data/recitations.js): all its recitations of Hafs from Asim, the reading of
 * the text shown here. Its Warsh recitations and its translations are left out, since they
 * would not match the text on the page. Where EveryAyah keeps a reciter at more than one
 * quality, the best is used and the other is tried if a file fails to play.
 * The audio is streamed from EveryAyah and is not stored in this project.
 */
export interface Reciter {
  id: string
  name: string
  /** Named only where EveryAyah names it: a mujawwad recitation, or the teaching mushaf. */
  style?: 'مجوّد' | 'المعلّم'
  folder: string
  /** The same recitation at another quality on EveryAyah, tried when a file fails. */
  alt?: string
}

/** The full label: the reciter, and the kind of recitation where it is not the usual murattal. */
export const reciterLabel = (r: Reciter) => (r.style ? `${r.name} (${r.style})` : r.name)

export const RECITERS: Reciter[] = [
  { id: 'alafasy', name: 'مشاري راشد العفاسي', folder: 'Alafasy_128kbps', alt: 'Alafasy_64kbps' },
  { id: 'husary', name: 'محمود خليل الحصري', folder: 'Husary_128kbps', alt: 'Husary_64kbps' },
  {
    id: 'abdulbasit',
    name: 'عبد الباسط عبد الصمد',
    folder: 'Abdul_Basit_Murattal_192kbps',
    alt: 'Abdul_Basit_Murattal_64kbps',
  },
  { id: 'minshawi', name: 'محمد صدّيق المنشاوي', folder: 'Minshawy_Murattal_128kbps' },
  {
    id: 'husary-mujawwad',
    name: 'محمود خليل الحصري',
    style: 'مجوّد',
    folder: 'Husary_128kbps_Mujawwad',
    alt: 'Husary_Mujawwad_64kbps',
  },
  {
    id: 'husary-muallim',
    name: 'محمود خليل الحصري',
    style: 'المعلّم',
    folder: 'Husary_Muallim_128kbps',
  },
  {
    id: 'abdulbasit-mujawwad',
    name: 'عبد الباسط عبد الصمد',
    style: 'مجوّد',
    folder: 'Abdul_Basit_Mujawwad_128kbps',
  },
  {
    id: 'minshawi-mujawwad',
    name: 'محمد صدّيق المنشاوي',
    style: 'مجوّد',
    folder: 'Minshawy_Mujawwad_192kbps',
    alt: 'Minshawy_Mujawwad_64kbps',
  },
  {
    id: 'shatri',
    name: 'أبو بكر الشاطري',
    folder: 'Abu_Bakr_Ash-Shaatree_128kbps',
    alt: 'Abu_Bakr_Ash-Shaatree_64kbps',
  },
  {
    id: 'ajamy',
    name: 'أحمد بن علي العجمي',
    folder: 'ahmed_ibn_ali_al_ajamy_128kbps',
    alt: 'Ahmed_ibn_Ali_al-Ajamy_128kbps_ketaballah.net',
  },
  { id: 'neana', name: 'أحمد نعينع', folder: 'Ahmed_Neana_128kbps' },
  {
    id: 'akhdar',
    name: 'إبراهيم الأخضر',
    folder: 'Ibrahim_Akhdar_64kbps',
    alt: 'Ibrahim_Akhdar_32kbps',
  },
  { id: 'alaqimy', name: 'أكرم العلاقمي', folder: 'Akram_AlAlaqimy_128kbps' },
  { id: 'sowaid', name: 'أيمن رشدي سويد', folder: 'Ayman_Sowaid_64kbps' },
  {
    id: 'qahtani',
    name: 'خالد عبد الله القحطاني',
    folder: 'Khaalid_Abdullaah_al-Qahtaanee_192kbps',
  },
  { id: 'tunaiji', name: 'خليفة الطنيجي', folder: 'khalefa_al_tunaiji_64kbps' },
  { id: 'ghamdi', name: 'سعد الغامدي', folder: 'Ghamadi_40kbps' },
  {
    id: 'shuraym',
    name: 'سعود الشريم',
    folder: 'Saood_ash-Shuraym_128kbps',
    alt: 'Saood_ash-Shuraym_64kbps',
  },
  { id: 'sahl', name: 'سهل ياسين', folder: 'Sahl_Yassin_128kbps' },
  { id: 'parhizgar', name: 'شهريار پرهيزگار', folder: 'Parhizgar_48kbps' },
  { id: 'budair', name: 'صلاح البدير', folder: 'Salah_Al_Budair_128kbps' },
  { id: 'bukhatir', name: 'صلاح بو خاطر', folder: 'Salaah_AbdulRahman_Bukhatir_128kbps' },
  {
    id: 'basfar',
    name: 'عبد الله بصفر',
    folder: 'Abdullah_Basfar_192kbps',
    alt: 'Abdullah_Basfar_64kbps',
  },
  { id: 'juhany', name: 'عبد الله عوّاد الجهني', folder: 'Abdullaah_3awwaad_Al-Juhaynee_128kbps' },
  { id: 'matrood', name: 'عبد الله المطرود', folder: 'Abdullah_Matroud_128kbps' },
  {
    id: 'sudais',
    name: 'عبد الرحمن السديس',
    folder: 'Abdurrahmaan_As-Sudais_192kbps',
    alt: 'Abdurrahmaan_As-Sudais_64kbps',
  },
  { id: 'qasim', name: 'عبد المحسن القاسم', folder: 'Muhsin_Al_Qasim_192kbps' },
  { id: 'alili', name: 'عزيز عليلي', folder: 'aziz_alili_128kbps' },
  { id: 'jaber', name: 'علي جابر', folder: 'Ali_Jaber_64kbps' },
  { id: 'suesy', name: 'علي حجاج السويسي', folder: 'Ali_Hajjaj_AlSuesy_128kbps' },
  {
    id: 'hudhaify',
    name: 'علي بن عبد الرحمن الحذيفي',
    folder: 'Hudhaify_128kbps',
    alt: 'Hudhaify_64kbps',
  },
  { id: 'abbad', name: 'فارس عباد', folder: 'Fares_Abbad_64kbps' },
  { id: 'mansoori', name: 'كريم منصوري', folder: 'Karim_Mansoori_40kbps' },
  {
    id: 'muaiqly',
    name: 'ماهر المعيقلي',
    folder: 'MaherAlMuaiqly128kbps',
    alt: 'Maher_AlMuaiqly_64kbps',
  },
  {
    id: 'ayyoub',
    name: 'محمد أيوب',
    folder: 'Muhammad_Ayyoub_128kbps',
    alt: 'Muhammad_Ayyoub_64kbps',
  },
  {
    id: 'jibreel',
    name: 'محمد جبريل',
    folder: 'Muhammad_Jibreel_128kbps',
    alt: 'Muhammad_Jibreel_64kbps',
  },
  { id: 'abdulkareem', name: 'محمد عبد الكريم', folder: 'Muhammad_AbdulKareem_128kbps' },
  {
    id: 'tablawi',
    name: 'محمد محمود الطبلاوي',
    folder: 'Mohammad_al_Tablaway_128kbps',
    alt: 'Mohammad_al_Tablaway_64kbps',
  },
  { id: 'banna', name: 'محمود علي البنا', folder: 'mahmoud_ali_al_banna_32kbps' },
  { id: 'mustafa-ismail', name: 'مصطفى إسماعيل', folder: 'Mustafa_Ismail_48kbps' },
  { id: 'qatami', name: 'ناصر القطامي', folder: 'Nasser_Alqatami_128kbps' },
  { id: 'rifai', name: 'هاني الرفاعي', folder: 'Hani_Rifai_192kbps', alt: 'Hani_Rifai_64kbps' },
  { id: 'dussary', name: 'ياسر الدوسري', folder: 'Yasser_Ad-Dussary_128kbps' },
  { id: 'salamah', name: 'ياسر سلامة', folder: 'Yaser_Salamah_128kbps' },
]

export const AUDIO_BASE = 'https://everyayah.com/data/'

const pad = (n: number) => String(n).padStart(3, '0')

/** EveryAyah names each file by surah and ayah: 002255.mp3 is al-Baqara 255. */
export const ayahUrl = (r: Reciter, surah: number, ayah: number, folder = r.folder) =>
  `${AUDIO_BASE}${folder}/${pad(surah)}${pad(ayah)}.mp3`

/** The same file in the reciter's other folder, if it has one and `url` is not already it. */
export function altUrl(r: Reciter, url: string): string | null {
  if (!r.alt || !url.startsWith(`${AUDIO_BASE}${r.folder}/`)) return null
  return `${AUDIO_BASE}${r.alt}/${url.slice(AUDIO_BASE.length + r.folder.length + 1)}`
}

/**
 * The basmala before a surah is al-Fatiha's first ayah, recited by the same reciter.
 * It is not recited before al-Tawba, and in al-Fatiha it is the first ayah itself.
 */
export const basmalaUrl = (r: Reciter) => ayahUrl(r, 1, 1)
export const recitesBasmala = (surah: number) => surah !== 1 && surah !== 9

/** One step of a recitation: the basmala, or an ayah with the repeats left after it. */
export interface Step {
  basmala: boolean
  ayah: number
  /** Further times this ayah will be recited after the current one. */
  repeatsLeft: number
}

/** First step when starting at `from`: the basmala only when starting at the surah's start. */
export function firstStep(surah: number, from: number, repeat: number): Step {
  if (from === 1 && recitesBasmala(surah))
    return { basmala: true, ayah: 1, repeatsLeft: repeat - 1 }
  return { basmala: false, ayah: from, repeatsLeft: repeat - 1 }
}

/** The step after `s`, or null at the end of the surah (or of the chosen range). */
export function nextStep(s: Step, last: number, repeat: number): Step | null {
  if (s.basmala) return { basmala: false, ayah: s.ayah, repeatsLeft: s.repeatsLeft }
  if (s.repeatsLeft > 0) return { ...s, repeatsLeft: s.repeatsLeft - 1 }
  if (s.ayah >= last) return null
  return { basmala: false, ayah: s.ayah + 1, repeatsLeft: repeat - 1 }
}
