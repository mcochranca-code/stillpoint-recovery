# Part of the NA Step Working Guides extraction (see README.md). The scripts are MIT; the guide text they produce is not.
"""Stage 2: lines.json -> blocks.json (paragraphs, bullets, bold headings) with line joins."""
import json, re
from collections import Counter

L = json.load(open('lines.json'))
FULL = 560  # a line at least this wide is a wrapped line, not a paragraph's last line

blocks = []
for ln in L:
    kind = 'title' if ln['font'] in (0, 6, 9, 2) else ('bold' if ln['bold'] else ('bullet' if ln['bullet'] else 'para'))
    prev = blocks[-1] if blocks else None
    cont = False
    if prev and not ln['bullet'] and kind != 'title' and prev['kind'] != 'title':
        same_style = (kind == 'bold') == (prev['kind'] == 'bold')
        if ln['page'] == prev['pages'][-1]:
            cont = same_style and ln['top'] - prev['lastTop'] <= 23
        else:
            # page break: continue only if previous line ran full width (wrapped)
            cont = same_style and prev['lastWidth'] >= FULL and kind != 'bold'
    if cont:
        prev['lines'].append(ln['text'])
        prev['lastTop'] = ln['top']; prev['lastWidth'] = ln['width']
        if ln['page'] != prev['pages'][-1]: prev['pages'].append(ln['page'])
    else:
        blocks.append(dict(kind=kind, lines=[ln['text']], pages=[ln['page']], lastTop=ln['top'], lastWidth=ln['width'], font=ln['font']))

# word frequency for de-hyphenation decisions
alltext = ' '.join(' '.join(b['lines']) for b in blocks)
words = Counter(w.lower() for w in re.findall(r"[A-Za-z']+", alltext))

joins = []
def join(lines):
    out = ''
    for i, raw in enumerate(lines):
        s = raw
        if not out:
            out = s.strip(' ') if i == 0 else s
            out = out.rstrip(' ') if False else out
            continue
        prev = out.rstrip(' ')
        nxt = s.lstrip(' ')
        m = re.search(r"([A-Za-z]+)-$", prev)
        if m and out.endswith('-'):
            # hyphen exactly at line end (no trailing space): word break or compound?
            first = m.group(1); second = re.match(r"[A-Za-z]+", nxt)
            second = second.group(0) if second else ''
            merged = (first + second).lower()
            if words.get(merged, 0) > 0 and (first + '-' + second).lower() not in alltext.lower():
                joins.append(f'{first}-|{second} -> {first}{second}')
                out = prev[:-1] + nxt
            else:
                joins.append(f'{first}-|{second} -> {first}-{second}')
                out = prev + nxt
        else:
            out = prev + ' ' + nxt
    return re.sub(r'\s+', ' ', out).strip()

for b in blocks:
    b['text'] = join(b['lines'])
    # italic markers: merge adjacent '**'
    t = b['text']
    t = re.sub(r'\u0001(\s*)', lambda m: m.group(1) + '\u0001', t); t = re.sub(r'(\s*)\u0002', lambda m: '\u0002' + m.group(1), t)
    t = t.replace('\u0002\u0001', '').replace('\u0002 \u0001', ' ')
    b['text'] = t.replace('\u0001', '*').replace('\u0002', '*').strip()
json.dump([dict(kind=b['kind'], text=b['text'], pages=b['pages']) for b in blocks], open('blocks.json', 'w'), ensure_ascii=False, indent=1)
print(len(blocks), Counter(b['kind'] for b in blocks))
print('\n'.join(joins))
