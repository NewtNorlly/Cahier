# -*- coding: utf-8 -*-
"""Strict sequence audit: compare full CJK+alnum character sequence
between PDF content and md body (ordering + duplication detection)."""
import os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_notes_1017 import get_lines

KEEP = re.compile(r"[一-鿿㐀-䶿A-Za-z0-9]")
BASE = r"C:\Users\NewtN\Desktop\课程讲稿"
ROOT = r"C:\Users\NewtN\下载\Cahier-main"


def seq(text):
    return "".join(KEEP.findall(text))


def md_body(path):
    with open(path, "rb") as f:
        b = f.read()
    if b.startswith(b"\xef\xbb\xbf"):
        b = b[3:]
    t = b.decode("utf-8")
    t = re.sub(r"^---.*?---\s*", "", t, count=1, flags=re.S)
    t = re.sub(r"<!--.*?-->", "", t, flags=re.S)
    # 原始 HTML 语义类标签（如 <p class="doc-file-title">）；要求标签名后紧跟空白/>，
    # 避免误吞代码里的比较运算符（如 a<b:、1 < a < 5）
    t = re.sub(r"</?[a-zA-Z][a-zA-Z0-9]*(?=[\s/>])[^>]*>", "", t)
    t = t.replace("```", "")
    t = t.replace("**", "")
    t = re.sub(r"^#{1,6}\s*", "", t, flags=re.M)
    return t


def pdf_text(rel, skip_pages=(), skip_watermark=False, skip_num_fonts=()):
    lines = get_lines(os.path.join(BASE, rel))
    out = []
    for ln in lines:
        if ln["page"] in skip_pages:
            continue
        t = ln["text"].strip()
        if skip_watermark and "Pollykann" in t:
            continue
        if re.fullmatch(r"\d{1,3}", t) and any(f in ln["font"] for f in skip_num_fonts):
            continue
        out.append(t)
    return "".join(out)


CASES = [
    (r"Python\10月5日讲稿.pdf", r"Python\10月5日讲稿.md", {}),
    (r"公共经济学\10月16日讲稿.pdf", r"公共经济学\10月16日讲稿.md",
     {"skip_num_fonts": ("TimesNewRomanPSMT",)}),
    (r"决策理论与方法\10月13日讲稿.pdf", r"决策理论与方法\10月13日讲稿.md", {}),
    (r"土地资源管理\10月9日讲稿.pdf", r"土地资源管理\10月9日讲稿.md", {}),
    (r"土地资源管理\10月16日讲稿.pdf", r"土地资源管理\10月16日讲稿.md", {}),
    (r"知识产权法基础理伦\10月16日讲稿.pdf", r"知识产权法基础理论\10月16日讲稿.md", {}),
    (r"近现代中日关系史\10月13日讲稿.pdf", r"近现代中日关系史\10月13日讲稿.md", {}),
    (r"英语\10月15日讲稿.pdf", r"英语\10月15日讲稿.md",
     {"skip_pages": (1,), "skip_num_fonts": ("TimesNewRomanPSMT",)}),
    (r"英语\10月1日影音跟读.pdf", r"英语\10月1日影音跟读.md",
     {"skip_watermark": True}),
    (r"英语\10月9日影音跟读.pdf", r"英语\10月9日影音跟读.md",
     {"skip_watermark": True}),
]

all_ok = True
for rel, md_rel, kw in CASES:
    a = seq(pdf_text(rel, **kw))
    b = seq(md_body(os.path.join(ROOT, md_rel)))
    if a == b:
        print(f"OK   {md_rel}  (len={len(a)})")
    else:
        all_ok = False
        print(f"DIFF {md_rel}  pdf={len(a)} md={len(b)}")
        # find first divergence
        k = 0
        while k < min(len(a), len(b)) and a[k] == b[k]:
            k += 1
        lo = max(0, k - 30)
        print(f"  first divergence at {k}:")
        print(f"  PDF: ...{a[lo:k+30]}")
        print(f"  MD : ...{b[lo:k+30]}")
print("ALL SEQUENCE MATCH" if all_ok else "MISMATCH FOUND")
