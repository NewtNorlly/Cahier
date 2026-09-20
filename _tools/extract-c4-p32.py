# -*- coding: utf-8 -*-
"""抽取 4-Nudge.pdf 第32页内嵌图，转成 webp 存入 figures/c4-p32-default-effect.webp。"""
import fitz, os

PDF = r"C:\Users\NewtN\Desktop\决策理论与方法\4-Nudge.pdf"
OUTDIR = r"C:\Users\NewtN\下载\Cahier-main\决策理论与方法\figures"
doc = fitz.open(PDF)
page = doc[31]
imgs = page.get_images(full=True)
print("images on p32:", imgs)
for i, img in enumerate(imgs):
    xref = img[0]
    pix = fitz.Pixmap(doc, xref)
    print(i, "colorspace", pix.colorspace, "alpha", pix.alpha, "w", pix.width, "h", pix.height)
    if pix.n - pix.alpha >= 4:
        pix = fitz.Pixmap(fitz.csRGB, pix)
    tmp = os.path.join(OUTDIR, "_c4-p32-raw.png")
    pix.save(tmp)
    print("saved", tmp, os.path.getsize(tmp))
doc.close()
