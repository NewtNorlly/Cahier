# -*- coding: utf-8 -*-
"""分析 5 个决策理论课件 PDF：页数、尺寸、每页字体大小分布；并渲染缩略图。"""
import os, sys
import pymupdf as fitz

SRC = r"C:\Users\NewtN\Desktop\决策理论与方法"
OUT = r"C:\Users\NewtN\下载\Cahier-main\_tools\pdf-preview"
os.makedirs(OUT, exist_ok=True)

files = [
    "0-Introduction.pdf",
    "1-Decision under uncertainty.pdf",
    "2-Decision under risk.pdf",
    "3-Behavioral decision analysis.pdf",
    "4-Nudge.pdf",
]

for fn in files:
    doc = fitz.open(os.path.join(SRC, fn))
    p0 = doc[0]
    w, h = p0.rect.width, p0.rect.height
    orient = "横版" if w > h else "竖版"
    print(f"\n=== {fn} | {doc.page_count} 页 | {w:.0f}x{h:.0f}pt ({orient}, 比例 {max(w,h)/min(w,h):.3f}) ===")
    # 字体大小采样（前3页和中间页）
    for pno in range(min(doc.page_count, 4)):
        page = doc[pno]
        d = page.get_text("dict")
        sizes = []
        for b in d.get("blocks", []):
            for l in b.get("lines", []):
                for s in l.get("spans", []):
                    t = s["text"].strip()
                    if t:
                        sizes.append(round(s["size"], 1))
        if sizes:
            from collections import Counter
            c = Counter(sizes)
            common = c.most_common(5)
            print(f"  P{pno+1}: 字号分布(常见) {common}")
    # 渲染全部页为拼图缩略图（每页一张小图，2xN 拼接太复杂，逐页存）
    tag = fn.split("-")[0]
    for pno in range(doc.page_count):
        page = doc[pno]
        pix = page.get_pixmap(matrix=fitz.Matrix(1.1, 1.1))
        pix.save(os.path.join(OUT, f"c{tag}-p{pno+1:02d}.png"))
    doc.close()

print("\n渲染完成 ->", OUT)
