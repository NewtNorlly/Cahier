# -*- coding: utf-8 -*-
"""提取德语9月19日PDF全文"""
import fitz, io, sys

pdf_path = r"C:\Users\NewtN\Desktop\德语\9月19日讲稿.pdf"
doc = fitz.open(pdf_path)
print(f"Total pages: {len(doc)}")
for i, page in enumerate(doc):
    text = page.get_text()
    print(f"\n{'='*60}")
    print(f"=== PAGE {i+1} ===")
    print(f"{'='*60}")
    print(text)
doc.close()
