# Fonts

Self-hosted variable fonts, both under the SIL Open Font License 1.1 (license text beside each).
They are not covered by Stillpoint's MIT License. Provenance and the subsetting steps are recorded
in `CONTENT_SOURCES.md` → "Fonts".

- `fraunces-latin-var-normal.woff2` — Fraunces (opsz + wght axes, upright; italics are a synthesized oblique), © 2020 The Fraunces Project Authors. `OFL-Fraunces.txt`.
- `inter-latin-var-normal.woff2` — Inter (wght axis), © 2016 The Inter Project Authors. `OFL-Inter.txt`.

To rebuild a subset, run `pyftsubset <source>.woff2 --flavor=woff2 --unicodes="<range from src/styles/tokens.css>" --layout-features='kern,liga,lnum,onum,tnum,pnum,ccmp,locl,mark,mkmk'`.
