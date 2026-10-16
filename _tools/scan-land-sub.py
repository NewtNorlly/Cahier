# -*- coding: utf-8 -*-
"""Find x103/x127 lines that are neither numbered items nor （N） sub-items,
to discover label sub-blocks in the land PDFs."""
import sys, os, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_notes_1017 import get_lines
CN_NUM = "一二三四五六七八九十"
RE_TOP = re.compile(r"^[" + CN_NUM + r"]+、")
RE_SUB = re.compile(r"^（[" + CN_NUM + r"]+）")

for rel in [r"土地资源管理\10月9日讲稿.pdf", r"土地资源管理\10月16日讲稿.pdf"]:
    BASE = r"C:\Users\NewtN\Desktop\课程讲稿"
    lines = get_lines(os.path.join(BASE, rel))
    print("####", rel)
    prev_was_127 = False
    for i, ln in enumerate(lines):
        if ln["x"] in (103, 100, 127) and ln["size"] == 12.0:
            t = ln["text"].strip()
            if re.match(r"^\d+\.\s", t) or re.match(r"^（\d+）", t) or re.match(RE_TOP, t) or re.match(RE_SUB, t):
                continue
            # first line-ish (x>=100)
            if ln["x"] >= 100 and i > 0 and lines[i-1]["x"] < 90:
                # preceded by x79 continuation => likely a new sub-block after a hang
                pass
            print(f"  p{ln['page']+1} x{ln['x']} y{ln['y']} | {t[:40]}")
