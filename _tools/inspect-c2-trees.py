# -*- coding: utf-8 -*-
"""渲染课件2源PDF第16/18/20页，查看决策树在源幻灯片中的真实样貌，并列出内嵌图。"""
import fitz, os

PDF = r"C:\Users\NewtN\Desktop\决策理论与方法\2-Decision under risk.pdf"
OUT = r"C:\Users\NewtN\下载\Cahier-main\_tools\shots\user-0920"
os.makedirs(OUT, exist_ok=True)
doc = fitz.open(PDF)
for pno in (15, 17, 19):  # 0-based -> 16/18/20
    page = doc[pno]
    print(f"--- PDF page {pno+1} size={page.rect} ---")
    imgs = page.get_images(full=True)
    for im in imgs:
        xref = im[0]
        d = doc.extract_image(xref)
        print("  img xref", xref, d["ext"], d["width"], "x", d["height"], len(d["image"]), "bytes", "smask=", im[1])
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
    fp = os.path.join(OUT, f"pdf-p{pno+1}.png")
    pix.save(fp)
    print("  saved", fp, pix.width, "x", pix.height)
    # 文本块（看连线标注是否是文字对象）
    txt = page.get_text("text")
    print("  text:", txt.replace("\n", " | ")[:400])
doc.close()
