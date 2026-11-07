# Part of the NA Step Working Guides extraction (see README.md). The scripts are MIT; the guide text they produce is not.
"""Stage 3: blocks.json -> na-step-guides.json (structured, cleaned) + fixes.log.

Cleanup only: extraction artifacts (glyph errors, OCR letter swaps, dash rendering, broken layout).
Wording is otherwise untouched. Every change is logged in fixes.log.
"""
import json, re
from collections import Counter

B = json.load(open('blocks.json'))
log = []

# ---------- 1. structural fixes (layout glitches in the PDF) ----------
def find(sub, kind=None):
    hits = [i for i, b in enumerate(B) if sub in b['text'] and (kind is None or b['kind'] == kind)]
    assert len(hits) == 1, (sub, hits)
    return hits[0]

# p.14: a narrative paragraph and the following question were printed as one bullet with no line break.
i = find('we can help it along.Have I ever believed')
para, q = B[i]['text'].split('help it along.', 1)
B[i] = dict(kind='para', text=para + 'help it along.', pages=B[i]['pages'])
B.insert(i + 1, dict(kind='bullet', text=q, pages=B[i]['pages']))
log.append('p.14 split run-together narrative + question ("...help it along.Have I ever believed...")')

# p.17: a narrative statement printed with a question bullet.
i = find('Finding ourselves able to act sanely, even once', 'bullet')
B[i]['kind'] = 'para'
log.append('p.17 "Finding ourselves able to act sanely..." is a statement printed with a bullet; kept as narrative, not a question')

# p.18: the end of a question was printed as a bold heading ("Power Greater Than Myself") and lost its "?".
i = find('What action am I taking that demonstrates my trust in the process of recovery and a', 'bullet')
assert B[i + 1]['text'] == 'Power Greater Than Myself' and B[i + 1]['kind'] == 'bold'
B[i]['text'] = B[i]['text'] + ' Power greater than myself?'
del B[i + 1]
log.append('p.18 rejoined question split by a stray bold line: "...in the process of recovery and a Power greater than myself?" (PDF: bold "Power Greater Than Myself", no "?")')

# Unbulleted questions (I-voice, end with "?") printed without the bullet.
for sub in ['What is the specific way in which my addiction has been manifesting itself most recently?',
            'Which spiritual principles have been connected to which steps, for me, and how have those contributed to my spiritual awakening?']:
    i = find(sub, 'para')
    B[i]['kind'] = 'bullet'
    log.append(f'p.{B[i]["pages"][0]} question printed without bullet treated as a question: "{sub[:60]}..."')

# ---------- 2. text fixes ----------
EXACT = [
    ('First Step1 by intuition', 'First Step, by intuition', 'glyph "1" for comma'),
    ('steps again1 thus', 'steps again, thus', 'glyph "1" for comma'),
    ('ourselves-drugs1 power, sex, food-to fix', 'ourselves—drugs, power, sex, food—to fix', 'glyph "1" for comma; dashes'),
    ('our partners1 but', 'our partners, but', 'glyph "1" for comma'),
    ('our wrongs1 information', 'our wrongs—information', 'glyph "1" for dash'),
    ('entirely ready1 we\'ll', 'entirely ready, we\'ll', 'glyph "1" for comma'),
    ('Seventh Steps1 we\'d', 'Seventh Steps, we\'d', 'glyph "1" for comma'),
    ('in the process1 we made', 'in the process, we made', 'glyph "1" for comma'),
    ('belief Systems', 'belief systems', 'stray capital'),
    ('humility is for ~s and', 'humility is for us and', 'OCR "~s" for "us"'),
    ('people m our lives', 'people in our lives', 'OCR "m" for "in"'),
    ('Anonymous m order', 'Anonymous in order', 'OCR "m" for "in"'),
    ('our purpose m life', 'our purpose in life', 'OCR "m" for "in"'),
    ('afready', 'already', 'OCR "f" for "l"'),
    ('causmg', 'causing', 'OCR "m" for "in"'),
    ('How and Wzy', 'How and Why', 'OCR "z" for "h"'),
    ('face-to4ace', 'face-to-face', 'OCR "4" for "-f"'),
    ('ways we ve created', 'ways we\'ve created', 'dropped apostrophe'),
    ('when we re ready', 'when we\'re ready', 'dropped apostrophe'),
    ('-we re feeling', '-we\'re feeling', 'dropped apostrophe'),
    ('when we re wrong', 'when we\'re wrong', 'dropped apostrophe'),
    ('If were not sure', 'If we\'re not sure', 'dropped apostrophe'),
    ('hear our Fifth Step He or she', 'hear our Fifth Step. He or she', 'dropped period'),
    ('come into play If we lie', 'come into play. If we lie', 'dropped period'),
    ('we\'re not-finished, that is', 'we\'re not—finished, that is', 'dash'),
    ('Copyright ~ 1998', 'Copyright © 1998', 'glyph "~" for ©'),
]
for old, new, why in EXACT:
    hits = [b for b in B if old in b['text']]
    assert len(hits) == 1, (old, len(hits))
    hits[0]['text'] = hits[0]['text'].replace(old, new)
    log.append(f'p.{hits[0]["pages"][0]} "{old}" -> "{new}" ({why})')

# Curly quotes: the PDF is otherwise straight-quoted; normalize the handful of curly ones.
for b in B:
    t2 = b['text'].replace('\u2019', "'").replace('\u2018', "'").replace('\u201c', '"').replace('\u201d', '"')
    if t2 != b['text']:
        log.append(f'p.{b["pages"][0]} normalized curly quotes to straight')
        b['text'] = t2

# Dashes. The PDF renders em dashes as "-", " - ", "- ", " -" or "--". Real compounds are kept.
KEEP = set('''fellowship-approved mean-tempered self-will self-centered self-discipline co-workers ever-increasing face-to-face
follow-through half-life hand-in-hand hard-earned in-depth light-hearted long-awaited long-range long-standing long-term
much-shortened nerve-wracking never-ending off-again on-again off-course often-heard once-and-for-all one-night one-of-a-kind
one-sided open-minded open-mindedness past-due principle-centered re-feel re-focus so-and-so so-called still-suffering
still-using too-high up-and-down well-deserved'''.split())
dash_count = Counter()
def fix_dashes(t):
    # spaced / doubled / one-sided forms between words → closed em dash
    t2 = re.sub(r'(?<=\S) ?(?:--|-) ?(?=[\s"])|(?<=[\s"])(?:--|-) ?(?=\S)|(?<=\S)- (?=\S)', '\u2014', t)
    t2 = re.sub(r'\s*\u2014\s*', '\u2014', t2)
    def word(m):
        tok = m.group(0)
        if tok.lower() in KEEP or tok.lower().startswith('self-'):
            return tok
        dash_count[tok] += 1
        return tok.replace('-', '\u2014')
    t2 = re.sub(r'[A-Za-z]+(?:-[A-Za-z]+)+', word, t2)
    return t2
for b in B:
    before = b['text']
    b['text'] = fix_dashes(b['text'])
    if before.count('-') != b['text'].count('-'):
        pass
log.append(f'dashes: {sum(dash_count.values())} word-joined hyphens read as em dashes, plus spaced " - " / "--" forms; compounds kept: {sorted(KEEP)} and self-*')
log.append('word-joined hyphens converted: ' + ', '.join(sorted(dash_count)))

# Any leftover suspicious patterns
T = '\n'.join(b['text'] for b in B)
assert not re.search(r'[A-Za-z][0-9]|[0-9][A-Za-z]', T.replace('1980s', '').replace('WSC\'95', '')), re.findall(r'\S*[A-Za-z][0-9]\S*', T)
assert ' - ' not in T and '--' not in T, re.findall(r'.{20} - .{20}', T)

# ---------- 3. structure ----------
NUM = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve']
idx = 0
assert [b['text'] for b in B[:3]] == ['The', 'Narcotics Anonymous', 'Step Working Guide']
approved = B[3]['text']; copyright_line = B[4]['text'].strip('"')
assert B[5]['text'] == 'Preface'
i = 6
preface = []
while not B[i]['text'].startswith('Step One'):
    preface.append(B[i]); i += 1
assert preface[-1]['text'] == 'WSC Literature Committee'
signature = preface.pop()['text']
assert all(p['kind'] == 'para' for p in preface)

steps = []
cur = None
while i < len(B):
    b = B[i]
    if b['kind'] == 'title' and b['text'].startswith('Step '):
        n = NUM.index(b['text'][5:]) + 1
        quote = B[i + 1]
        assert quote['kind'] == 'bold', quote
        text = quote['text'].strip().strip('"').strip()
        cur = dict(number=n, id=f'step-{n}', title=b['text'], text=text, sections=[dict(id=f'step-{n}-intro', heading=None, blocks=[])], pages=[b['pages'][0]])
        steps.append(cur); qn = 0; i += 2; continue
    if b['kind'] == 'bold':
        slug = re.sub(r'[^a-z0-9]+', '-', b['text'].lower()).strip('-')
        sid = f'{cur["id"]}-{slug}'
        if any(s['id'] == sid for s in cur['sections']): sid += f'-{len(cur["sections"])}'
        cur['sections'].append(dict(id=sid, heading=b['text'], blocks=[]))
    elif b['kind'] == 'bullet':
        qn += 1
        cur['sections'][-1]['blocks'].append(dict(type='question', id=f's{cur["number"]}-q{qn:03d}', number=qn, text=b['text']))
    elif b['kind'] == 'para':
        cur['sections'][-1]['blocks'].append(dict(type='paragraph', text=b['text']))
    else:
        raise SystemExit(f'unexpected block {b}')
    cur['pages'].append(b['pages'][-1])
    i += 1

for s in steps:
    s['pageRange'] = [min(s['pages']), max(s['pages'])]; del s['pages']
    s['sections'] = [sec for sec in s['sections'] if sec['blocks'] or sec['heading']]

out = dict(
    title='The Narcotics Anonymous Step Working Guides',
    approved=approved,
    sourceCopyright=copyright_line,
    preface=dict(id='preface', title='Preface', paragraphs=[p['text'] for p in preface], signature=signature),
    steps=steps,
)
json.dump(out, open('na-step-guides.json', 'w'), ensure_ascii=False, indent=1)
open('fixes.log', 'w').write('\n'.join(log) + '\n')
counts = {s['number']: sum(1 for sec in s['sections'] for bl in sec['blocks'] if bl['type'] == 'question') for s in steps}
print('steps', len(steps), 'questions', counts, 'total', sum(counts.values()))
print('sections', {s['number']: len(s['sections']) for s in steps})
print(approved, '|', copyright_line)
