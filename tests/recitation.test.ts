import { describe, expect, it } from 'vitest'
import {
  RECITERS,
  altUrl,
  ayahUrl,
  basmalaUrl,
  firstStep,
  nextStep,
  recitesBasmala,
  type Step,
} from '../src/features/recitation/reciters.ts'

/** Every file a recitation plays, in order. */
function sequence(surah: number, from: number, last: number, repeat: number) {
  const out: string[] = []
  for (let s: Step | null = firstStep(surah, from, repeat); s; s = nextStep(s, last, repeat))
    out.push(s.basmala ? 'basmala' : String(s.ayah))
  return out
}

describe('order of recitation', () => {
  it('recites the basmala before a surah, then every ayah once', () => {
    expect(sequence(112, 1, 4, 1)).toEqual(['basmala', '1', '2', '3', '4'])
  })
  it('has no separate basmala in al-Fatiha (it is ayah 1) or before al-Tawba', () => {
    expect(sequence(1, 1, 7, 1)).toEqual(['1', '2', '3', '4', '5', '6', '7'])
    expect(sequence(9, 1, 3, 1)).toEqual(['1', '2', '3'])
    expect(recitesBasmala(1)).toBe(false)
    expect(recitesBasmala(9)).toBe(false)
    expect(recitesBasmala(2)).toBe(true)
  })
  it('starts from a chosen ayah without the basmala', () => {
    expect(sequence(2, 284, 286, 1)).toEqual(['284', '285', '286'])
  })
  it('repeats each ayah, but not the basmala', () => {
    expect(sequence(108, 1, 3, 3)).toEqual(['basmala', '1', '1', '1', '2', '2', '2', '3', '3', '3'])
  })
})

describe('recordings', () => {
  it('names each file by surah and ayah', () => {
    const r = RECITERS[0]!
    expect(ayahUrl(r, 2, 255)).toBe(`https://everyayah.com/data/${r.folder}/002255.mp3`)
    expect(basmalaUrl(r)).toBe(`https://everyayah.com/data/${r.folder}/001001.mp3`)
  })
  it("lists each reciter once, every folder from EveryAyah's register of Hafs recitations", () => {
    expect(new Set(RECITERS.map((r) => r.id)).size).toBe(RECITERS.length)
    expect(new Set(RECITERS.map((r) => r.folder)).size).toBe(RECITERS.length)
    // the first four keep their place (and the saved choice of earlier visitors)
    expect(RECITERS.slice(0, 4).map((r) => r.id)).toEqual([
      'alafasy',
      'husary',
      'abdulbasit',
      'minshawi',
    ])
    for (const r of RECITERS) {
      expect(EVERYAYAH_HAFS, r.folder).toContain(r.folder)
      if (r.alt) expect(EVERYAYAH_HAFS, r.alt).toContain(r.alt)
    }
    // every reciter in the register is offered (QuranExplorer's AbdulSamad repeats Abdul Basit)
    const used = new Set(RECITERS.flatMap((r) => [r.folder, r.alt]))
    const left = EVERYAYAH_HAFS.filter((f) => !used.has(f))
    // what is left is only lower qualities of reciters already offered
    expect(left.sort()).toEqual(
      [
        'AbdulSamad_64kbps_QuranExplorer.Com',
        'Abdullah_Basfar_32kbps',
        'Ahmed_ibn_Ali_al-Ajamy_64kbps_QuranExplorer.Com',
        'Hudhaify_32kbps',
        'Menshawi_16kbps',
        'Menshawi_32kbps',
        'Muhammad_Ayyoub_32kbps',
      ].sort(),
    )
  })
  it('tries the other quality of the same recording when a file fails', () => {
    const r = RECITERS.find((x) => x.id === 'sudais')!
    expect(altUrl(r, ayahUrl(r, 2, 255))).toBe(
      'https://everyayah.com/data/Abdurrahmaan_As-Sudais_64kbps/002255.mp3',
    )
    expect(altUrl(r, ayahUrl(r, 2, 255, r.alt))).toBeNull()
    expect(
      altUrl(
        RECITERS.find((x) => x.id === 'ghamdi')!,
        'x',
      ),
    ).toBeNull()
  })
})

/**
 * EveryAyah's register of recitations (everyayah.com/data/recitations.js, read 2026-11-08),
 * its recitations of Hafs only: the Warsh recitations and the translations are not listed.
 */
const EVERYAYAH_HAFS = [
  'Abdul_Basit_Murattal_64kbps',
  'Abdul_Basit_Murattal_192kbps',
  'Abdul_Basit_Mujawwad_128kbps',
  'Abdullah_Basfar_32kbps',
  'Abdullah_Basfar_64kbps',
  'Abdullah_Basfar_192kbps',
  'Abdurrahmaan_As-Sudais_64kbps',
  'Abdurrahmaan_As-Sudais_192kbps',
  'AbdulSamad_64kbps_QuranExplorer.Com',
  'Abu_Bakr_Ash-Shaatree_64kbps',
  'Abu_Bakr_Ash-Shaatree_128kbps',
  'Ahmed_ibn_Ali_al-Ajamy_64kbps_QuranExplorer.Com',
  'Ahmed_ibn_Ali_al-Ajamy_128kbps_ketaballah.net',
  'Alafasy_64kbps',
  'Alafasy_128kbps',
  'Ghamadi_40kbps',
  'Hani_Rifai_64kbps',
  'Hani_Rifai_192kbps',
  'Husary_64kbps',
  'Husary_128kbps',
  'Husary_Mujawwad_64kbps',
  'Husary_128kbps_Mujawwad',
  'Hudhaify_32kbps',
  'Hudhaify_64kbps',
  'Hudhaify_128kbps',
  'Ibrahim_Akhdar_32kbps',
  'Ibrahim_Akhdar_64kbps',
  'Maher_AlMuaiqly_64kbps',
  'MaherAlMuaiqly128kbps',
  'Menshawi_16kbps',
  'Menshawi_32kbps',
  'Minshawy_Mujawwad_64kbps',
  'Minshawy_Mujawwad_192kbps',
  'Minshawy_Murattal_128kbps',
  'Mohammad_al_Tablaway_64kbps',
  'Mohammad_al_Tablaway_128kbps',
  'Muhammad_Ayyoub_128kbps',
  'Muhammad_Ayyoub_64kbps',
  'Muhammad_Ayyoub_32kbps',
  'Muhammad_Jibreel_64kbps',
  'Muhammad_Jibreel_128kbps',
  'Mustafa_Ismail_48kbps',
  'Saood_ash-Shuraym_64kbps',
  'Saood_ash-Shuraym_128kbps',
  'Parhizgar_48kbps',
  'Salaah_AbdulRahman_Bukhatir_128kbps',
  'Muhsin_Al_Qasim_192kbps',
  'Abdullaah_3awwaad_Al-Juhaynee_128kbps',
  'Salah_Al_Budair_128kbps',
  'Abdullah_Matroud_128kbps',
  'Ahmed_Neana_128kbps',
  'Muhammad_AbdulKareem_128kbps',
  'khalefa_al_tunaiji_64kbps',
  'mahmoud_ali_al_banna_32kbps',
  'Karim_Mansoori_40kbps',
  'Husary_Muallim_128kbps',
  'Khaalid_Abdullaah_al-Qahtaanee_192kbps',
  'Yasser_Ad-Dussary_128kbps',
  'Nasser_Alqatami_128kbps',
  'Ali_Hajjaj_AlSuesy_128kbps',
  'Sahl_Yassin_128kbps',
  'ahmed_ibn_ali_al_ajamy_128kbps',
  'aziz_alili_128kbps',
  'Yaser_Salamah_128kbps',
  'Akram_AlAlaqimy_128kbps',
  'Ali_Jaber_64kbps',
  'Fares_Abbad_64kbps',
  'Ayman_Sowaid_64kbps',
]
