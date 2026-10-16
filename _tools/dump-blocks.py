# -*- coding: utf-8 -*-
"""Dump blocks with y-coordinates to see paragraph vs heading grouping."""
import fitz, sys
path = sys.argv[1]
doc = fitz.open(path)
for pi, page in enumerate(doc):
    print(f"===== PAGE {pi+1} =====")
    d = page.get_text("dict")
    for b in d["blocks"]:
        if b.get("type") != 0:
            print(f"  IMG bbox={[round(x) for x in b['bbox']]}")
            continue
        x0,y0,x1,y1 = b["bbox"]
        for line in b["lines"]:
            spans = line["spans"]
            text = "".join(s["text"] for s in spans)
            if not text.strip():
                continue
            sizes = sorted(set(round(s["size"],1) for s in spans))
            print(f"  y{round(line['bbox'][1]):4d} x{round(line['bbox'][0]):4d} {sizes} | {text}")
doc.close()
