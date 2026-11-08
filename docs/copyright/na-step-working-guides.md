# NA Step Working Guides: source and extraction notes

*The Narcotics Anonymous Step Working Guides* — Copyright © 1998, World Service Office, Inc.
Reprinted by permission. All rights reserved. This is NA Fellowship-approved literature.

Used in Stillpoint by permission of NA World Services (verbal, per the project owner, 2026-11-07;
written confirmation pending — see [`CONTENT_SOURCES.md`](../../CONTENT_SOURCES.md#na-step-working-guides-used-by-permission)).
This text is **not** covered by the repository's MIT License. Stillpoint is not affiliated with,
and is not endorsed by, Narcotics Anonymous or NA World Services.

## How the content was produced

The source is a 96-page PDF supplied by the project owner (not committed). The scripts in
[`scripts/na-step-guides/`](../../scripts/na-step-guides/) turn it into
`src/data/na-step-guides/guide.json`:

1. `pdftohtml -xml -i` keeps each text line's position, font (bold headings, italic titles) and the
   Wingdings bullet that marks every question.
2. `parse.py` / `blocks.py` rebuild paragraphs from line spacing, join lines and page breaks, and
   keep `*italic*` book titles.
3. `build.py` applies the fixes below, then builds Preface + Steps One–Twelve with sections and
   numbered questions (`s4-q012` = Step Four, question 12). Question IDs key people's saved answers,
   so they must not change if the text is regenerated.

Wording is otherwise unchanged. Spot-checked against PDF pages 2, 4, 5, 9, 14, 17, 18, 45 and 77.

## Questions per step

| Step | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | Total |
| --- | -: | -: | -: | -: | -: | -: | -: | -: | -: | -: | -: | -: | -: |
| Questions | 68 | 47 | 39 | 82 | 28 | 22 | 21 | 17 | 28 | 52 | 28 | 26 | **458** |

## Cleanup applied

Layout glitches in the PDF:

- p. 14 — a narrative paragraph and the next question were printed as one bullet with no break
  ("…we can help it along.Have I ever believed…"); split into the paragraph and the question.
- p. 17 — "Finding ourselves able to act sanely, even once, … is evidence of sanity." carries a
  question bullet but is a statement; kept as narrative, not a question.
- p. 18 — the end of a question was printed as a bold heading: "What action am I taking that
  demonstrates my trust in the process of recovery and a" / **Power Greater Than Myself**. Rejoined
  as "…and a Power greater than myself?" (the PDF has no question mark).
- p. 5 and p. 89 — two I-voice questions printed without a bullet ("What is the specific way in which
  my addiction has been manifesting itself most recently?" and "Which spiritual principles have been
  connected to which steps, for me, …?") are treated as questions.

Glyph and OCR errors:

| Page | PDF text | Now | Reason |
| ---: | --- | --- | --- |
| 2 | fellowship<sub>1</sub>literature | fellowship—literature | subscript "1" glyph for a dash |
| 2 | Copyright ~ 1998 | Copyright © 1998 | "~" glyph for © |
| 4 | First Step1 by intuition | First Step, by intuition | "1" glyph for a comma (judgment call) |
| 4 | steps again1 thus | steps again, thus | "1" for a comma |
| 14 | ourselves-drugs1 power, sex, food-to fix | ourselves—drugs, power, sex, food—to fix | "1" for a comma; dashes |
| 23 | our partners1 but | our partners, but | "1" for a comma |
| 35 | our wrongs1 information | our wrongs—information | "1" for a dash (judgment call) |
| 43 | entirely ready1 we'll | entirely ready, we'll | "1" for a comma |
| 61 | Seventh Steps1 we'd | Seventh Steps, we'd | "1" for a comma |
| 74 | in the process1 we made | in the process, we made | "1" for a comma |
| 7 | belief Systems | belief systems | stray capital |
| 49 | humility is for ~s | humility is for us | OCR |
| 54, 83, 90 | m our lives / m order / m life | in … | OCR "m" for "in" |
| 61 | afready | already | OCR |
| 67 | causmg | causing | OCR |
| 38 | How and Wzy | How and Why | OCR |
| 63 | face-to4ace | face-to-face | OCR |
| 34, 57, 78, 79, 39 | we re / we ve / If were not | we're / we've / If we're not | dropped apostrophes |
| 39 | our Fifth Step He or she | our Fifth Step. He or she | dropped period |
| 45 | come into play If we lie | come into play. If we lie | dropped period |

Dashes: the PDF renders every em dash as a hyphen (`addiction-not`, `behaviors - perhaps`,
`newcomers --`). These became closed em dashes (—). Real compounds (self-will, face-to-face,
open-mindedness, long-term, so-and-so, and the like) keep their hyphens; `scripts/na-step-guides/build.py`
lists them. A few curly quotes were straightened to match the rest of the text. No stray page numbers
were present in the PDF text layer.
