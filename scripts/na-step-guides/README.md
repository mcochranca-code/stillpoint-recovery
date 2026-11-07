# NA Step Working Guides extraction

Regenerates `src/data/na-step-guides/guide.json` from the owner-supplied PDF, which is **not**
committed. The guide text is © 1998 World Service Office, Inc., used by permission and excluded from
the MIT License (see `CONTENT_SOURCES.md`).

```sh
mkdir -p /tmp/na && cd /tmp/na
pdftohtml -xml -i -q -nodrm /path/to/na-step-working-guide.pdf guide   # writes guide.xml
python3 /path/to/repo/scripts/na-step-guides/parse.py    # guide.xml  -> lines.json
python3 /path/to/repo/scripts/na-step-guides/blocks.py   # lines.json -> blocks.json
python3 /path/to/repo/scripts/na-step-guides/build.py    # blocks.json -> na-step-guides.json + fixes.log
cp na-step-guides.json /path/to/repo/src/data/na-step-guides/guide.json
```

`build.py` asserts each targeted fix matches exactly once, so a different PDF fails loudly instead of
silently changing the text. Question IDs (`s4-q012`) key people's saved answers; keep them stable.
See `docs/copyright/na-step-working-guides.md` for every change made to the extracted text.
