# -*- coding: utf-8 -*-
"""List heading-level lines of the English 1015 compiled PDF."""
import fitz
path = r"C:\Users\NewtN\Desktop\课程讲稿\英语\10月15日讲稿.pdf"
doc = fitz.open(path)
for i, page in enumerate(doc):
    d = page.get_text("dict")
    for b in d["blocks"]:
        if b.get("type") != 0:
            continue
        for line in b["lines"]:
            spans = line["spans"]
            text = "".join(s["text"] for s in spans).strip()
            if not text:
                continue
            size = max(s["size"] for s in spans)
            font = spans[0]["font"]
            if size >= 12.3 and ("SimHei" in font or "KaiTi" in font):
                # skip TOC dot leaders & page number-only lines handled later
                if text.isdigit():
                    continue
                print(f"p{i+1} | {size} | {font} | {text[:80]}")
doc.close()
