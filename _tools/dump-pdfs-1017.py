# -*- coding: utf-8 -*-
"""Dump text of the 10 new lecture PDFs for inspection (2026-10-17 batch)."""
import os, fitz, json

BASE = r"C:\Users\NewtN\Desktop\课程讲稿"
OUT = r"C:\Users\NewtN\下载\Cahier-main\_pdf-staging\dump-1017"
os.makedirs(OUT, exist_ok=True)

pdfs = [
    r"Python\10月5日讲稿.pdf",
    r"公共经济学\10月16日讲稿.pdf",
    r"决策理论与方法\10月13日讲稿.pdf",
    r"土地资源管理\10月9日讲稿.pdf",
    r"土地资源管理\10月16日讲稿.pdf",
    r"知识产权法基础理伦\10月16日讲稿.pdf",
    r"英语\10月15日讲稿.pdf",
    r"英语\10月1日影音跟读.pdf",
    r"英语\10月9日影音跟读.pdf",
    r"近现代中日关系史\10月13日讲稿.pdf",
]

summary = []
for rel in pdfs:
    path = os.path.join(BASE, rel)
    doc = fitz.open(path)
    safe = rel.replace("\\", "__").replace(".pdf", "")
    total_chars = 0
    lines_out = []
    for i, page in enumerate(doc):
        lines_out.append(f"\n========== PAGE {i+1} ==========\n")
        d = page.get_text("dict")
        # sort by block then line
        for b in d["blocks"]:
            if b.get("type") != 0:
                lines_out.append(f"[[IMAGE BLOCK bbox={b['bbox']} w={b.get('width')} h={b.get('height')}]]")
                continue
            for line in b["lines"]:
                spans = line["spans"]
                text = "".join(s["text"] for s in spans)
                if text.strip() == "":
                    continue
                sizes = sorted(set(round(s["size"], 1) for s in spans))
                font = spans[0]["font"]
                flags = spans[0]["flags"]
                total_chars += len(text)
                lines_out.append(f"[{sizes}|{font}|f{flags}] {text}")
    with open(os.path.join(OUT, safe + ".txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines_out))
    n_img = sum(1 for p in doc for b in p.get_text("dict")["blocks"] if b.get("type") != 0)
    summary.append((rel, len(doc), total_chars, n_img))
    doc.close()

for s in summary:
    print(s)
