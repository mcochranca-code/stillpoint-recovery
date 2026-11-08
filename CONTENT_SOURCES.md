# Daily reading sources and licenses

Stillpoint's daily readings (Today → *A reading for the journey*) come from the tradition or
traditions each person chooses in Settings → Daily readings, or in the optional onboarding step.
The choice is stored only in this browser (IndexedDB, `preferences.traditionPreference`).

**Rule for every entry:** Stillpoint quotes text word for word only when the translation is in the
public domain in the United States, and every entry records its source, citation, translation or
attribution, and license (`src/data/readings/*.ts`). Where the best-known English wording is still
under copyright, Stillpoint writes its own paraphrase or reflection and says so on screen.
`src/data/readings/readings.test.ts` enforces these rules.

> **Review needed.** None of this content has yet been reviewed by members of the communities it
> comes from. Before release, please ask faith leaders and community members from each tradition
> (Christian, Buddhist, Hindu, Muslim, Jain, Native/Red Road) to review their readings, citations,
> paraphrases and tone, and correct anything that is inaccurate or inappropriate.

Kinds of entry:

- **verbatim** — quoted exactly from the named public-domain translation (verse line breaks joined
  with spaces; OCR artefacts and footnote markers removed; `…` marks an omission).
- **paraphrase** — Stillpoint's own wording summarizing the cited passage. Not a quotation.
- **original** — an original Stillpoint reflection. Released under the project's MIT license.

| Tradition | Entries | Source | Translation / attribution | License basis | Checked against |
| --- | ---: | --- | --- | --- | --- |
| Christian | 15 verbatim | Holy Bible | King James Version (1611 Authorized Version) | Public domain in the US and most countries (Crown letters patent apply in the UK only) | Project Gutenberg eBook #10 |
| Buddhist | 10 verbatim | Dhammapada | F. Max Müller, *The Dhammapada*, Sacred Books of the East vol. 10 (1881) | Published 1881; public domain worldwide | Project Gutenberg eBook #2017 |
| Buddhist | 3 original | Themes taught by Pema Chödrön | Original Stillpoint reflections, labelled "Inspired by the teachings of Pema Chödrön. These are not their words." | Original, MIT. **No quotations** — her books are under copyright | — |
| Buddhist | 4 original | Themes taught by Thich Nhat Hanh | Original Stillpoint reflections, labelled as above | Original, MIT. **No quotations** — his books are under copyright | — |
| Hindu | 14 verbatim | Bhagavad Gita | Sir Edwin Arnold, *The Song Celestial* (1885) | Published 1885; public domain worldwide | Project Gutenberg eBook #2388 |
| Hindu | 5 paraphrase | Srimad Bhagavatam 1.2.6, 10.14.8, 11.7.37, 11.8.44, 11.9.1–2 | Original Stillpoint paraphrases with verse citations | Original, MIT (no verifiably public-domain English translation was available; verse numbers checked against vedabase.io, whose BBT translation was **not** used) | vedabase.io (citations only) |
| Muslim | 15 verbatim | The Quran | Marmaduke Pickthall, *The Meaning of the Glorious Koran* (1930) | Published 1930 → public domain in the US since 1 Jan 2026; translator died 1936 → public domain in life+70/80 countries | Wikisource transcription of the 1930 edition (each ayah compared) |
| Muslim | 6 paraphrase | Hadith: Forty Hadith of an-Nawawi nos. 1, 13, 16, 18, 19, 36 (with Bukhari / Muslim / Tirmidhi numbers) | Original Stillpoint paraphrases | Original, MIT. Modern English hadith translations were **not** used | — |
| Jain | 3 verbatim | Ācārāṅga Sūtra I.2.3.4, I.3.3.4, I.4.1.1 | Hermann Jacobi, *Gaina Sutras* Part I, Sacred Books of the East vol. 22 (1884) | Published 1884; public domain worldwide | Internet Archive scan `jainasutrasparti029233mbp` |
| Jain | 9 verbatim | Uttarādhyayana Sūtra I.29, IX.34–36, X.1–2, XXIX.17, 46, 49, 67, 70 | Hermann Jacobi, *Gaina Sutras* Part II, Sacred Books of the East vol. 45 (1895) | Published 1895; public domain worldwide | Internet Archive scan `dli.ernet.30488` (diacritics simplified, e.g. Kusa-grass) |
| Jain | 4 paraphrase | Tattvārtha Sūtra 1.1, 5.21, 7.11, 9.6 | Original Stillpoint paraphrases (numbering can differ between Śvetāmbara and Digambara editions) | Original, MIT | — |
| Red Road / Native wellbriety | 14 original | Values widely shared in Red Road and Wellbriety recovery, including the Seven Grandfather Teachings (Anishinaabe) as publicly shared | Original Stillpoint reflections | Original, MIT | — |
| Spiritual but not religious | 13 verbatim | Marcus Aurelius, *Meditations* IV.3, IV.49, V.1, VI.19, VII.7, VII.8, VII.59, VII.69, VIII.33, VIII.47, X.16, XII.17 | George Long, *The Thoughts of the Emperor Marcus Aurelius Antoninus* (1862) | Published 1862; public domain worldwide | Project Gutenberg eBook #15877 |
| Spiritual but not religious | 2 original | — | Original Stillpoint reflections | Original, MIT | — |

Total: 117 readings (Christian 15, Buddhist 17, Hindu 19, Muslim 21, Jain 16, Red Road 14,
Spiritual but not religious 15).

## Further reading (titles only)

Shown with the "inspired by" reflections. Stillpoint links to no store and quotes none of these.

- Pema Chödrön: *When Things Fall Apart*; *The Places That Scare You*; *Taking the Leap*; *Start Where You Are*.
- Thich Nhat Hanh: *The Miracle of Mindfulness*; *Peace Is Every Step*; *The Heart of Understanding*; *Interbeing*; *No Mud, No Lotus*.
- White Bison: *The Red Road to Wellbriety: In the Native American Way* (2002).

## Red Road / Native wellbriety: how these were written

- Every entry is an original Stillpoint reflection. None claims to speak for a nation, an elder or
  a ceremony, and none describes ceremonies or uses sacred objects, songs or images.
- Every Red Road reading shows this note on screen: *"Teachings differ from nation to nation. These
  are original reflections written by Stillpoint, not teachings of any nation, elder or ceremony.
  For Native-led recovery, look to White Bison and the Wellbriety Movement, and to the elders and
  programs of your own community."*
- The motif for this tradition is a road toward hills, not a medicine wheel or other sacred symbol.

## Visual motifs

Each tradition's small illustration (`src/components/TraditionMotif.tsx`) is an inline SVG
landscape taken from an image in that tradition's own readings — morning light (Lamentations 3:23),
a water-pot filling drop by drop (Dhammapada 122), a leaf with water poured out (Gita 9.26), the
declining day (Quran 103), a dew-drop on a blade of grass (Uttarādhyayana X.2), a road toward the
hills, a promontory in the waves (Meditations IV.49). No crosses, crescents, Om, dharma wheels,
Jain hands or other sacred symbols are used as decoration.

## Existing content (unchanged)

- The 90 original *Stillpoint reflections* (`src/data/reflections.ts`) are original text by the
  project and remain the separate "Today's Stillpoint reflection" card.
- The Christian readings reuse the KJV entries in `src/data/scripture.ts` (IDs unchanged, so saved
  favorites carry over); five KJV passages were added (Lamentations 3:22–23, Matthew 11:28,
  2 Corinthians 12:9, Galatians 6:2, James 5:16).

## NA Step Working Guides (used by permission)

Library → *NA Step Working Guides* (`src/data/na-step-guides/guide.json`, read by
`src/features/na-step-guides/`).

| | |
| --- | --- |
| Work | *The Narcotics Anonymous Step Working Guides* (Preface and Steps One–Twelve: 458 questions) |
| Copyright | Copyright © 1998, World Service Office, Inc. Reprinted by permission. All rights reserved. |
| Status | This is NA Fellowship-approved literature. |
| License basis | **Not MIT-licensed and not public domain.** Used by permission of NA World Services (NAWS). Permission was given verbally to the project owner on 2026-11-07, per the owner; **written confirmation is pending**. Record the written permission here (date, scope, contact) when it arrives. |
| Affiliation | Stillpoint is not affiliated with, and is not endorsed by, Narcotics Anonymous or NA World Services. |
| Source file | A 96-page PDF supplied by the project owner. The PDF is **not** committed. |
| Wording | Verbatim. Only extraction artefacts were cleaned (glyph errors, OCR letter swaps, em dashes rendered as hyphens, three layout glitches); every change is listed in [`docs/copyright/na-step-working-guides.md`](docs/copyright/na-step-working-guides.md). `src/data/na-step-guides/content.test.ts` checks the structure and question counts. |

The required credit is shown on the reader's title screen, in every chapter, on the Library card,
and in Settings → About. Answers people write stay in their own browser and are never sent anywhere.

If the written permission is not granted, or its scope differs (for example, no in-app answer
boxes, or no offline copy), remove or change this feature before release.

