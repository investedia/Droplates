#!/usr/bin/env python3
"""Adds stable editing IDs to template HTML (idempotent).

data-e="<page>-tN"   editable text (elements whose content is plain text only)
data-el="<page>-lN"  editable link (buttons / call-to-action anchors)
data-ei="<page>-iN"  replaceable image placeholder (.im)
data-s="<page>-sN"   section (direct children of <main>), with data-s-label and data-s-optional
Elements already bound to config.js (data-c) are left alone.
Run: python3 tools/annotate.py
"""
import re, os, html
from html.parser import HTMLParser

ROOT = os.path.join(os.environ.get('DROPLATES_SITE') or os.path.join(os.path.dirname(__file__), '..', '..', 'droplates-frontend'), 'products')
TEXT_TAGS = {'h1', 'h2', 'h3', 'h4', 'p', 'blockquote', 'figcaption', 'li', 'dd', 'dt', 'b', 'strong', 'small', 'summary', 'span', 'a', 'button'}
SKIP_CLASSES = {'skip', 'nav-toggle', 'logo', 'eye', 'line', 'n'}

class Node:
    def __init__(self, tag, attrs, start, end_start=None):
        self.tag, self.attrs, self.start, self.children, self.text, self.parent = tag, dict(attrs), start, [], '', None
        self.open_end = None; self.close_start = None

class P(HTMLParser):
    VOID = {'meta', 'link', 'img', 'br', 'input', 'hr', 'source'}
    def __init__(self, src):
        super().__init__(convert_charrefs=False); self.src = src; self.root = Node('root', [], 0); self.stack = [self.root]
        self.lines = [0]
        for m in re.finditer('\n', src): self.lines.append(m.end())
    def pos(self):
        l, c = self.getpos(); return self.lines[l - 1] + c
    def handle_starttag(self, tag, attrs):
        n = Node(tag, attrs, self.pos()); n.open_end = n.start + len(self.get_starttag_text())
        n.parent = self.stack[-1]; self.stack[-1].children.append(n)
        if tag not in self.VOID: self.stack.append(n)
    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                self.stack[i].close_start = self.pos(); del self.stack[i:]; return
    def handle_data(self, d): self.stack[-1].text += d

def walk(n):
    for c in n.children:
        yield c; yield from walk(c)

def classes(n): return set((n.attrs.get('class') or '').split())

def inside(n, pred):
    p = n.parent
    while p is not None:
        if pred(p): return True
        p = p.parent
    return False

def annotate(path, page):
    src = open(path).read()
    p = P(src); p.feed(src)
    inserts = []  # (pos, text)
    main = next((n for n in walk(p.root) if n.tag == 'main'), None)
    counters = {'t': 0, 'l': 0, 'i': 0, 's': 0}
    for kind, attr in (('t', 'data-e'), ('l', 'data-el'), ('i', 'data-ei'), ('s', 'data-s')):  # continue numbering so existing IDs never change
        nums = [int(n) for n in re.findall(attr + r'="' + re.escape(page) + '-' + kind + r'(\d+)"', src)]
        counters[kind] = max(nums) if nums else 0
    start_sections = counters['s']
    def add(n, attr):
        inserts.append((n.open_end - (2 if src[n.open_end - 2] == '/' else 1), ' ' + attr))
    LABELS = {'logos': 'Customer logos', 'split': 'Code and live feed', 'bento': 'Features grid', 'stats': 'Stats', 'ctab': 'Call to action',
              'plans': 'Pricing plans', 'faq': 'FAQ', 'quotes': 'Testimonials', 'row2': 'Feature row', 'team': 'Team', 'tl': 'Timeline',
              'chips': 'Projects', 'grid': 'Projects', 'duo': 'Image pair', 'wide': 'Wide image', 'prose': 'Story', 'next': 'Next project',
              'skills': 'Skills', 'about': 'About', 'contact': 'Contact', 'case-hero': 'Project intro', 'ph': 'Page intro', 'hero': 'Hero'}
    STANDALONE = {'logos', 'split', 'stats', 'ctab', 'quotes', 'plans', 'hero', 'ph', 'row2', 'team', 'tl', 'about', 'skills', 'contact',
                  'case-hero', 'wide', 'duo', 'prose', 'next', 'sec', 'band'}
    def label_of(sec):
        for c in sorted(classes(sec)):
            if c in LABELS and c not in ('hero', 'ph', 'case-hero', 'about', 'contact'): return LABELS[c]
        for d in walk(sec):
            if classes(d) & {'lab', 'eb', 'over'} and d.text.strip(): return d.text.strip()
        for d in walk(sec):
            if d.tag in ('h1', 'h2', 'h3') and d.text.strip(): return d.text.strip()
        for c in sorted(classes(sec)):
            if c in LABELS: return LABELS[c]
        return 'Section'
    if main:
        groups = []
        for sec in [x for x in main.children if 'data-s' not in x.attrs]:
            cl = classes(sec); role = sec.attrs.get('role')
            joins = groups and (role in ('tabpanel', 'tablist') or not cl or
                                (groups[-1]['lead'] in ('sh', 'chips') and not (cl & STANDALONE) and 'sh' not in cl))
            if joins: groups[-1]['els'].append(sec); continue
            lead = 'sh' if 'sh' in cl else 'chips' if 'chips' in cl else 'x'
            groups.append({'lead': lead, 'els': [sec]})
        for i, g in enumerate(groups):
            sid = f'{page}-s{start_sections + i + 1}'
            label = label_of(g['els'][0])
            if label == 'Section' and len(g['els']) > 1: label = label_of(g['els'][1])
            label = html.escape(re.sub(r'\s+', ' ', label)[:40], quote=True)
            optional = 'true' if (start_sections + i) > 0 and not any(d.attrs.get('id') == 'cf' for e in g['els'] for d in walk(e)) else 'false'
            for e in g['els']: add(e, f'data-s="{sid}" data-s-label="{label}" data-s-optional="{optional}"')
            counters['s'] += 1
    for n in walk(p.root):
        if not main or not inside(n, lambda x: x is main): continue
        if 'data-c' in n.attrs or 'data-c-href' in n.attrs or classes(n) & SKIP_CLASSES: continue
        if any(a in n.attrs for a in ('data-e', 'data-el', 'data-ei', 'data-k', 'data-list', 'data-show')) or n.tag == 'template': continue
        if inside(n, lambda x: x.tag == 'template' or 'data-list' in x.attrs or 'data-show' in x.attrs): continue
        if inside(n, lambda x: 'data-c' in x.attrs): continue
        if n.tag in ('form', 'label', 'select', 'option', 'textarea', 'input') or inside(n, lambda x: x.tag in ('form', 'button', 'select', 'label')): continue
        cl = classes(n)
        if 'im' in cl:
            counters['i'] += 1; add(n, f'data-ei="{page}-i{counters["i"]}"'); continue
        if n.tag == 'a' and (cl & {'b', 'btn', 'b1', 'fill'}) and not n.children:
            counters['l'] += 1; add(n, f'data-el="{page}-l{counters["l"]}"')
        if n.tag in TEXT_TAGS and not n.children and n.text.strip() and n.close_start:
            if 'Replace' in n.text: continue
            counters['t'] += 1; add(n, f'data-e="{page}-t{counters["t"]}"')
    for pos, text in sorted(inserts, reverse=True):
        src = src[:pos] + text + src[pos:]
    open(path, 'w').write(src)
    return sum(counters.values())

for t in sorted(os.listdir(ROOT)):
    d = os.path.join(ROOT, t)
    if not os.path.isdir(d): continue
    for f in sorted(os.listdir(d)):
        if f.endswith('.html'):
            n = annotate(os.path.join(d, f), f[:-5])
            print(f'{t}/{f}: {n} ids')
