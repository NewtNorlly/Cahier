# -*- coding: utf-8 -*-
"""Conservation audit: PDF text (content lines only) vs generated md body.
Counts CJK ideographs and letters/digits only."""
import os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_notes_1017 import get_lines

CJK = re.compile(r"[一-鿿㐀-䶿]")
ALNUM = re.compile(r"[A-Za-z0-9]")

BASE = r"C:\Users\NewtN\Desktop\课程讲稿"
ROOT = r"C:\Users\NewtN\下载\Cahier-main"


def counts(text):
    return len(CJK.findall(text)), len(ALNUM.findall(text))


def md_body(path):
    with open(path, "rb") as f:
        b = f.read()
    if b.startswith(b"\xef\xbb\xbf"):
        b = b[3:]
    t = b.decode("utf-8")
    # strip frontmatter
    t = re.sub(r"^---.*?---\s*", "", t, count=1, flags=re.S)
    # strip folio/col comments
    t = re.sub(r"<!--.*?-->", "", t, flags=re.S)
    # strip markdown syntax
    t = t.replace("```", "")
    t = t.replace("**", "")
    t = re.sub(r"^#{1,6}\s*", "", t, flags=re.M)
    return t


def pdf_text(rel, skip_pages=(), skip_watermark=False, skip_num_fonts=None):
    lines = get_lines(os.path.join(BASE, rel))
    out = []
    for ln in lines:
        if ln["page"] in skip_pages:
            continue
        t = ln["text"].strip()
        if skip_watermark and "Pollykann" in t:
            continue
        if skip_num_fonts:
            fonts = ln["font"]
            if re.fullmatch(r"\d{1,3}", t) and any(f in fonts for f in skip_num_fonts):
                continue
        out.append(t)
    return "".join(out)


CASES = [
    (r"Python\10月5日讲稿.pdf", r"Python\10月5日讲稿.md", {}, {}),
    (r"公共经济学\10月16日讲稿.pdf", r"公共经济学\10月16日讲稿.md",
     {"skip_num_fonts": ["TimesNewRomanPSMT"]}, {}),
    (r"决策理论与方法\10月13日讲稿.pdf", r"决策理论与方法\10月13日讲稿.md", {}, {}),
    (r"土地资源管理\10月9日讲稿.pdf", r"土地资源管理\10月9日讲稿.md", {}, {}),
    (r"土地资源管理\10月16日讲稿.pdf", r"土地资源管理\10月16日讲稿.md", {}, {}),
    (r"知识产权法基础理伦\10月16日讲稿.pdf", r"知识产权法基础理论\10月16日讲稿.md", {}, {}),
    (r"近现代中日关系史\10月13日讲稿.pdf", r"近现代中日关系史\10月13日讲稿.md", {}, {}),
    (r"英语\10月15日讲稿.pdf", r"英语\10月15日讲稿.md",
     {"skip_pages": (1,), "skip_num_fonts": ["TimesNewRomanPSMT"]}, {}),
    (r"英语\10月1日影音跟读.pdf", r"英语\10月1日影音跟读.md",
     {"skip_watermark": True}, {}),
    (r"英语\10月9日影音跟读.pdf", r"英语\10月9日影音跟读.md",
     {"skip_watermark": True}, {}),
]

for rel, md_rel, pdf_kw, _ in CASES:
    pt = pdf_text(rel, **pdf_kw)
    mt = md_body(os.path.join(ROOT, md_rel))
    pc, pa = counts(pt)
    mc, ma = counts(mt)
    print(f"{md_rel}: PDF CJK={pc} ALNUM={pa} | MD CJK={mc} ALNUM={ma} | "
          f"diff CJK={mc-pc:+d} ALNUM={ma-pa:+d}")
