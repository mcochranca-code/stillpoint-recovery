import type { ReadingEntry, RecoveryTheme } from '../../domain/types';

const PICKTHALL = 'Marmaduke Pickthall, The Meaning of the Glorious Koran (1930)';
const PICKTHALL_LICENSE = 'First published 1930 (London and New York), so public domain in the United States since 1 January 2026; translator died 1936, so public domain in life+70 and life+80 countries. Text checked against the Wikisource transcription of the 1930 edition.';

function quran(surahAyah: string, surahName: string, text: string, recoveryTheme: RecoveryTheme, reflectionPrompt: string): ReadingEntry {
  return {
    id: `quran-${surahAyah.replace(/[^0-9]+/g, '-')}`, tradition: 'muslim', kind: 'verbatim', source: 'The Quran',
    citation: `Quran ${surahAyah} (Surah ${surahName})`, translation: PICKTHALL, license: 'public-domain', licenseNote: PICKTHALL_LICENSE,
    text, recoveryTheme, reflectionPrompt,
  };
}

/** Hadith are given as original paraphrases with their collection and number, not as quoted translations. */
function hadith(id: string, citation: string, text: string, recoveryTheme: RecoveryTheme, reflectionPrompt: string): ReadingEntry {
  return {
    id: `hadith-${id}`, tradition: 'muslim', kind: 'paraphrase', source: 'Hadith', citation,
    translation: 'Original paraphrase by Stillpoint of the cited hadith; not a quotation from any published translation.',
    license: 'original-mit', licenseNote: 'Original Stillpoint wording, released under the project’s MIT license. The Arabic source is ancient and public domain.',
    text, recoveryTheme, reflectionPrompt,
  };
}

export const muslimReadings: ReadingEntry[] = [
  quran('94:5–6', 'Solace', 'But lo! with hardship goeth ease, Lo! with hardship goeth ease;', 'patience',
    'The promise is repeated twice. What small ease has already come alongside today’s hardship?'),
  quran('2:286', 'The Cow', 'Allah tasketh not a soul beyond its scope. … Our Lord! Condemn us not if we forget, or miss the mark!', 'shame',
    'If today you forget or miss the mark, how could you answer yourself with the same mercy this prayer asks for?'),
  quran('39:53', 'The Troops', 'Say: O My slaves who have been prodigal to their own hurt! Despair not of the mercy of Allah, Who forgiveth all sins. Lo! He is the Forgiving, the Merciful.', 'shame',
    'Is there a part of your past that makes you feel beyond mercy? What would it mean to not despair of it today?'),
  quran('2:153', 'The Cow', 'O ye who believe! Seek help in steadfastness and prayer. Lo! Allah is with the steadfast.', 'patience',
    'Where could steadfastness and prayer carry you through the next hard hour?'),
  quran('65:2–3', 'Divorce', 'And whosoever keepeth his duty to Allah, Allah will appoint a way out for him, And will provide for him from (a quarter) whence he hath no expectation. And whosoever putteth his trust in Allah, He will suffice him.', 'surrender',
    'What are you trying to solve alone that you could hand over in trust today?'),
  quran('5:90', 'The Table Spread', 'O ye who believe! Strong drink and games of chance and idols and divining arrows are only an infamy of Satan\'s handiwork. Leave it aside in order that ye may succeed.', 'craving',
    'Leaving something aside is a step toward success, not a loss. What are you leaving aside today, and what are you making room for?'),
  quran('3:134', 'The Family of \'Imran', 'Those who spend (of that which Allah hath given them) in ease and in adversity, those who control their wrath and are forgiving toward mankind; Allah loveth the good;', 'service',
    'Who could you be generous or forgiving toward today, even while things are hard?'),
  quran('103:1–3', 'The Declining Day', 'By the declining day, Lo! man is in a state of loss, Save those who believe and do good works, and exhort one another to truth and exhort one another to endurance.', 'community',
    'Who reminds you of the truth and helps you endure? How could you do the same for someone else this week?'),
  quran('93:3–5', 'The Morning Hours', 'Thy Lord hath not forsaken thee nor doth He hate thee, And verily the latter portion will be better for thee than the former, And verily thy Lord will give unto thee so that thou wilt be content.', 'shame',
    'What would change today if you believed the later part of your life can be better than the earlier part?'),
  quran('76:8–9', 'Time', 'And feed with food the needy wretch, the orphan and the prisoner, for love of Him, (Saying): We feed you, for the sake of Allah only. We wish for no reward nor thanks from you;', 'service',
    'What quiet act of service could you do today without needing anyone to notice?'),
  quran('4:28', 'Women', 'Allah would make the burden light for you, for man was created weak.', 'surrender',
    'Weakness is part of being human. Where could you let your burden be made lighter today?'),
  quran('49:13', 'The Private Apartments', 'O mankind! Lo! We have created you male and female, and have made you nations and tribes that ye may know one another. Lo! the noblest of you, in the sight of Allah, is the best in conduct.', 'community',
    'Who in your recovery community is very different from you? What could you learn from knowing them better?'),
  quran('2:152', 'The Cow', 'Therefore remember Me, I will remember you. Give thanks to Me, and reject not Me.', 'gratitude',
    'Pause and name three things to be thankful for right now.'),
  quran('2:186', 'The Cow', 'And when My servants question thee concerning Me, then surely I am nigh. I answer the prayer of the suppliant when he crieth unto Me.', 'surrender',
    'If help is near, what would you ask for today?'),
  quran('4:110', 'Women', 'Yet whoso doeth evil or wrongeth his own soul, then seeketh pardon of Allah, will find Allah Forgiving, Merciful.', 'shame',
    'Is there a wrong you have done to yourself that you could bring for pardon today?'),
  hadith('nawawi-1', 'Forty Hadith of an-Nawawi, no. 1 (Sahih al-Bukhari 1; Sahih Muslim 1907)',
    'Deeds are judged by the intentions behind them, and each person receives what they truly intended.', 'surrender',
    'What is your intention for today, underneath all the tasks?'),
  hadith('nawawi-13', 'Forty Hadith of an-Nawawi, no. 13 (Sahih al-Bukhari 13; Sahih Muslim 45)',
    'None of you truly believes until you love for your brother what you love for yourself.', 'community',
    'What do you hope for in your own recovery that you could also wish, and work, for someone else?'),
  hadith('nawawi-16', 'Forty Hadith of an-Nawawi, no. 16 (Sahih al-Bukhari 6116)',
    'A man asked the Prophet for advice. He told him not to become angry, and when the man asked again and again, he gave the same answer each time.', 'craving',
    'Anger can open the door to old habits. What helps you cool down before you act?'),
  hadith('nawawi-18', 'Forty Hadith of an-Nawawi, no. 18 (Jami at-Tirmidhi 1987)',
    'Be mindful of God wherever you are. Follow a bad deed with a good one, and the good will wipe it out. And treat people with good character.', 'shame',
    'If yesterday went wrong, what good deed could follow it today?'),
  hadith('nawawi-19', 'Forty Hadith of an-Nawawi, no. 19 (Jami at-Tirmidhi 2516)',
    'Know that help comes with patience, relief comes with distress, and with hardship comes ease.', 'patience',
    'Where have you seen relief arrive after a hard stretch before? Let that memory steady you today.'),
  hadith('nawawi-36', 'Forty Hadith of an-Nawawi, no. 36 (Sahih Muslim 2699)',
    'Whoever relieves a believer of a hardship, God will relieve them of a hardship. God keeps helping a servant as long as that servant keeps helping others.', 'service',
    'Who could you help carry something today?'),
];
