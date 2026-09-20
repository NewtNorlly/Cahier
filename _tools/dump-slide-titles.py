# -*- coding: utf-8 -*-
"""导出 5 个课件每张幻灯片的标题（顶部最大/藏青文本）、对齐、字号、项目符号层级。"""
import os, json
import pymupdf as fitz

SRC = r"C:\Users\NewtN\Desktop\决策理论与方法"
FILES = [
    ("c0", "0-Introduction.pdf"),
    ("c1", "1-Decision under uncertainty.pdf"),
    ("c2", "2-Decision under risk.pdf"),
    ("c3", "3-Behavioral decision analysis.pdf"),
    ("c4", "4-Nudge.pdf"),
]

NAVY = (0.12, 0.22, 0.39)  # ~#1F3864

def color_name(rgb):
    if rgb is None: return "?"
    r, g, b = rgb
    if b > 0.45 and r < 0.4 and g < 0.45: return "navy"
    if r > 0.6 and g < 0.45 and b < 0.3: return "red/orange"
    if r < 0.3 and g < 0.3 and b < 0.3: return "black"
    return f"({r:.2f},{g:.2f},{b:.2f})"

for tag, fn in FILES:
    doc = fitz.open(os.path.join(SRC, fn))
    print(f"\n########## {tag} {fn} ({doc.page_count}p) ##########")
    for pno in range(doc.page_count):
        page = doc[pno]
        W, H = page.rect.width, page.rect.height
        d = page.get_text("dict")
        lines = []
        for b in d.get("blocks", []):
            if b.get("type", 0) != 0:
                continue
            for l in b.get("lines", []):
                txt = "".join(s["text"] for s in l["spans"]).strip()
                if not txt:
                    continue
                sizes = [s["size"] for s in l["spans"] if s["text"].strip()]
                colors = [s.get("color", 0) for s in l["spans"] if s["text"].strip()]
                sz = max(sizes) if sizes else 0
                c0 = colors[0] if colors else 0
                r = ((c0 >> 16) & 255) / 255.0
                g = ((c0 >> 8) & 255) / 255.0
                bl = (c0 & 255) / 255.0
                x0, y0, x1, y1 = l["bbox"]
                cx = (x0 + x1) / 2
                align = "C" if abs(cx - W / 2) < 40 else ("R" if x0 > W * 0.6 else "L")
                lines.append((round(y0, 1), round(x0, 1), sz, align, color_name((r, g, bl)), txt[:46]))
        lines.sort(key=lambda t: (t[0], t[1]))
        # 标题候选：y 在顶部 22% 内、字号 >= 24，或居中大字
        title = None
        for ln in lines:
            y, x, sz, al, cn, t = ln
            if y < H * 0.24 and sz >= 23.5:
                title = ln
                break
        if title is None and lines:
            # 居中且字号最大的
            cand = [ln for ln in lines if ln[3] == "C" and ln[2] >= 24]
            title = cand[0] if cand else None
        tstr = f"[{title[2]:.0f}/{title[3]}/{title[4]}] {title[5]}" if title else "（无标题）"
        print(f"P{pno+1:02d} {tstr}")
    doc.close()
