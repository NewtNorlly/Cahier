# -*- coding: utf-8 -*-
"""List candidate heading lines for decision & cjp PDFs with gap data."""
import sys, os, io
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_notes_1017 import get_lines

for label, path in [
    ("decision", r"决策理论与方法\10月13日讲稿.pdf"),
    ("cjp", r"近现代中日关系史\10月13日讲稿.pdf"),
]:
    BASE = r"C:\Users\NewtN\Desktop\课程讲稿"
    lines = get_lines(os.path.join(BASE, path))
    print(f"\n########## {label} ##########")
    for i, ln in enumerate(lines):
        nxt = lines[i+1] if i+1 < len(lines) else None
        prev = lines[i-1] if i > 0 else None
        if label == "cjp":
            xcond = ln["x"] <= 80
        else:
            xcond = ln["x"] <= 89
        if xcond and nxt and ((nxt["x"] >= 98 and label == "cjp") or (nxt["x"] >= 108 and label == "decision")):
            if prev and ln["page"] == prev["page"]:
                gap = ln["y"] - prev["y"]
            else:
                gap = 999
            print(f"p{ln['page']+1} gap={gap:4d} len={len(ln['text'].strip()):2d} | {ln['text'].strip()[:40]}")
