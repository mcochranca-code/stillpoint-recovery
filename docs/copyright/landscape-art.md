# Landscape and charm art: provenance

Stillpoint's page-header landscapes (Today, Library, Meditation) reuse the five background
illustrations already in the repository. No new art was added for the header band, and no
image is fetched from anywhere else.

| File | What it shows | Used for |
| --- | --- | --- |
| `public/assets/backgrounds/sunrise-hills.svg` | Sun over layered green hills | Christian (also the Today hero texture and the reflection card) |
| `public/assets/backgrounds/still-lake.svg` | Sun over a still lake and low hills | Buddhist, Jain |
| `public/assets/backgrounds/forest-path.svg` | A sandy path between trees | Hindu, Red Road · Native wellbriety |
| `public/assets/backgrounds/ocean-dusk.svg` | Low sun over the sea at dusk | Muslim |
| `public/assets/backgrounds/soft-bokeh.svg` | Soft, placeless circles of light | Spiritual but not religious, and anyone who has not chosen a tradition |

The mapping lives in `src/domain/landscape.ts` and follows the motif rationale in
`src/components/TraditionMotif.tsx` and `CONTENT_SOURCES.md` → "Visual motifs". With several
traditions, or "rotate through all", the band follows the tradition of today's reading.

## Where the files come from

- Added to the repository by the project owner (`mcochranca-code`) in commit `5a4db35`
  (2026-10-26, "feat: sync Stillpoint backup and regional map") as part of the Stillpoint asset
  pack (overview: `public/assets/reference/asset-pack-overview.png`). The same commit added the 12
  charm medallions in `public/assets/charms/`.
- Each is a small, hand-written vector file (plain gradients, circles and paths, under 1 KB). No
  embedded metadata, stock-library identifiers or third-party credits are present, and no outside
  source has been identified. They are treated as original project art.
- **License:** like other bundled media and brand assets, they are not granted under the MIT
  License (see README → License); they remain the project's own artwork. If any of them turns out
  to come from an outside source, record its source and license here and replace it if the
  license does not allow this use.

## Content rules the band follows

- Landscapes only: no crosses, crescents, Om, dharma wheels, Jain hands or other religious
  symbols. At night the sky shows a full moon, never a crescent, so no tradition's emblem is
  implied.
- Red Road · Native wellbriety gets a plain path through trees: no regalia, sacred objects,
  medicine wheels, feathers or nation-specific imagery, and no caption that implies speaking for
  any nation.
- Always `aria-hidden` with empty alt text; it carries no information. A scrim fades the art to
  98% canvas before the header text begins, and `src/styles/contrast.test.ts` checks every colour
  in every landscape, with every time-of-day tint, against each palette's header text colours
  (4.5:1). High-contrast mode hides the art entirely.

## Charms

The 12 milestone charms (`public/assets/charms/*.svg`, listed in `src/data/charms.ts`) share the
provenance above. Where this change shows them (the next charm in the Today hero, the "recently
earned" strip on Progress) it uses each charm's own artwork only and adds no Narcotics Anonymous or
Alcoholics Anonymous keytag colour coding, chip design or logo.
