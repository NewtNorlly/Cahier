# -*- coding: utf-8 -*-
"""Scan English PDF for tables/drawings and unusual fonts/sizes."""
import fitz, collections
path = r"C:\Users\NewtN\Desktop\课程讲稿\英语\10月15日讲稿.pdf"
doc = fitz.open(path)
fonts = collections.Counter()
sizes = collections.Counter()
draw_pages = set()
for i, page in enumerate(doc):
    if page.get_drawings():
        draw_pages.add(i+1)
    d = page.get_text("dict")
    for b in d["blocks"]:
        if b.get("type") != 0:
            continue
        for line in b["lines"]:
            for s in line["spans"]:
                t = s["text"].strip()
                if t:
                    fonts[s["font"]] += 1
                    sizes[round(s["size"],1)] += 1
print("FONTS:", fonts.most_common())
print("SIZES:", sizes.most_common())
print("PAGES WITH DRAWINGS:", sorted(draw_pages))
doc.close()
