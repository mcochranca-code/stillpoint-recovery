# Part of the NA Step Working Guides extraction (see README.md). The scripts are MIT; the guide text they produce is not.
"""Parse pdftohtml -xml output of the NA Step Working Guides into raw blocks (stage 1).

Output: raw_blocks.json — a list of {page, kind: bullet|bold|para|title|step, text, lastWidth, firstTop}
Text keeps *italic* markers. No dash/hyphen cleanup here except line-joins.
"""
import json, re, html, sys
from collections import Counter

xml = open('guide.xml', encoding='utf-8').read()
pages = re.findall(r'<page number="(\d+)"[^>]*>(.*?)</page>', xml, re.S)
TEXT = re.compile(r'<text top="(\d+)" left="(\d+)" width="(\d+)" height="(\d+)" font="(\d+)">(.*?)</text>', re.S)

lines = []  # (page, top, items)
for num, body in pages:
    items = []
    for m in TEXT.finditer(body):
        top, left, width, height, font, inner = m.groups()
        items.append(dict(top=int(top), left=int(left), width=int(width), font=int(font), inner=inner))
    items.sort(key=lambda i: (i['top'], i['left']))
    grouped = []
    for it in items:
        if grouped and (abs(grouped[-1][0] - it['top']) <= 3 or it['font'] == 5):
            grouped[-1][1].append(it)
        else:
            grouped.append([it['top'], [it]])
    for top, its in grouped:
        its.sort(key=lambda i: i['left'])
        lines.append((int(num), top, its))


def render(inner):
    # convert <i> to *, drop <b>, unescape
    s = inner.replace('<i>', '\u0001').replace('</i>', '\u0002')
    s = re.sub(r'</?b>', '', s)
    s = re.sub(r'<[^>]+>', '', s)
    s = html.unescape(s)
    return s


out = []
for page, top, its in lines:
    bullet = any(i['font'] == 7 for i in its)
    text_items = [i for i in its if i['font'] not in (7, 8)]
    glitch = [i for i in text_items if i['font'] == 5]
    text = ''
    for i in text_items:
        r = render(i['inner'])
        if i['font'] == 5:
            r = '\u2014' if r.strip() == '1' else r  # subscript-1 glitch → em dash
            text = text.rstrip()
        text += r
    if not text.strip():
        if bullet:
            out.append(dict(page=page, top=top, bullet=True, bold=False, text='', left=0, width=0, font=7))
        continue
    nonspace = [i for i in text_items if render(i['inner']).strip()]
    bold = all(('<b>' in i['inner']) or i['font'] in (0, 1, 2, 6, 9) for i in nonspace)
    font = max((i['font'] for i in nonspace), key=lambda f: {0: 9, 9: 8, 6: 7, 2: 6, 1: 5}.get(f, 0))
    left = min(i['left'] for i in nonspace)
    right = max(i['left'] + i['width'] for i in nonspace)
    out.append(dict(page=page, top=top, bullet=bullet, bold=bold, text=text, left=left, width=right - left, font=font))

# merge bullet-only marker lines with the following text line at same top
merged = []
for ln in out:
    if merged and merged[-1]['text'] == '' and merged[-1]['bullet'] and merged[-1]['page'] == ln['page'] and abs(merged[-1]['top'] - ln['top']) <= 4:
        ln['bullet'] = True
        merged[-1] = ln
    else:
        merged.append(ln)

json.dump(merged, open('lines.json', 'w'), ensure_ascii=False, indent=0)
print(len(merged), 'lines')
print(Counter(l['left'] for l in merged).most_common(12))
print(Counter(round(l['width'] / 10) * 10 for l in merged if not l['bold']).most_common(30))
