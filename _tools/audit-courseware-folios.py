# -*- coding: utf-8 -*-
"""审计 5 个决策理论课件：找出 md 中空的 folio（中栏无实质内容），对照源 PDF 该页文本/图片情况。"""
import re, os, glob
import fitz

ROOT = r"C:\Users\NewtN\下载\Cahier-main"
PDFS = {
    0: r"C:\Users\NewtN\Desktop\决策理论与方法\0-Introduction.pdf",
    1: r"C:\Users\NewtN\Desktop\决策理论与方法\1-Decision under uncertainty.pdf",
    2: r"C:\Users\NewtN\Desktop\决策理论与方法\2-Decision under risk.pdf",
    3: r"C:\Users\NewtN\Desktop\决策理论与方法\3-Behavioral decision analysis.pdf",
    4: r"C:\Users\NewtN\Desktop\决策理论与方法\4-Nudge.pdf",
}
MDS = sorted(glob.glob(os.path.join(ROOT, "决策理论与方法", "决策理论课件*.md")))

folio_re = re.compile(r"<!--folio:第(\d+)页-->")

for idx, md in enumerate(MDS):
    text = open(md, encoding="utf-8").read()
    # split by folio open markers
    parts = folio_re.split(text)
    # parts: [pre, '1', body1, '2', body2, ...]
    folios = {}
    for i in range(1, len(parts), 2):
        folios[int(parts[i])] = parts[i + 1]
    doc = fitz.open(PDFS[idx])
    print(f"\n===== 课件{idx}: {os.path.basename(md)} | md folios={len(folios)} pdf pages={doc.page_count} =====")
    for n in sorted(folios):
        body = folios[n]
        # cut at /folio
        body = body.split("<!--/folio-->")[0]
        # remove col markers and whitespace
        stripped = re.sub(r"<!--col:[LRM]-->", "", body)
        stripped = re.sub(r"<!--band-->", "", stripped)
        has_img = "![" in stripped or "<img" in stripped
        content = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", stripped)
        content = re.sub(r"\s+", "", content)
        pdf = doc[n - 1] if n - 1 < doc.page_count else None
        if pdf is not None:
            t = pdf.get_text().strip()
            imgs = len(pdf.get_images())
        else:
            t, imgs = "<no pdf page>", -1
        if not content and not has_img:
            print(f"  [空 folio {n}] PDF: textlen={len(t)} imgs={imgs} | PDF文本: {t[:80]!r}")
        elif not content and has_img:
            print(f"  [仅图片 folio {n}] PDF: textlen={len(t)} imgs={imgs}")
    # pdf pages missing in md?
    missing = [p for p in range(1, doc.page_count + 1) if p not in folios]
    if missing:
        print(f"  !!! md 缺少 folio: {missing}")
    doc.close()
