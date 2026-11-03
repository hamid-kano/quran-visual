/** Basmala as written at the head of al-Fatiha (its first ayah). */
export const BASMALA = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ'

/** Every surah opens with the basmala except al-Tawba; in al-Fatiha it is the first ayah itself. */
export const showsBasmalaHeader = (surah: number) => surah !== 1 && surah !== 9
