# -*- coding: utf-8 -*-
"""课件2 第16/18/20页决策树：直接渲染源PDF页面（白底、完整连线与标注），
自动裁去近白边，导出 q80 webp 替换此前误抽的黑底残图。"""
import fitz, os
from PIL import Image
import io

PDF = r"C:\Users\NewtN\Desktop\决策理论与方法\2-Decision under risk.pdf"
OUTDIR = r"C:\Users\NewtN\下载\Cahier-main\决策理论与方法\figures"
JOBS = {
    16: "c2-p16-factory-tree1.webp",
    18: "c2-p18-factory-tree2.webp",
    20: "c2-p20-factory-tree3.webp",
}
doc = fitz.open(PDF)
for pno, name in JOBS.items():
    page = doc[pno - 1]
    pix = page.get_pixmap(matrix=fitz.Matrix(3, 3))  # 2373x1335
    im = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
    w, h = im.size
    px = im.load()
    # 内容掩码：任一通道 < 235 视为墨迹（浅灰虚线/淡蓝三角也能兜住）
    minx, miny, maxx, maxy = w, h, 0, 0
    step = 2
    for y in range(0, h, step):
        for x in range(0, w, step):
            r, g, b = px[x, y]
            if min(r, g, b) < 235:
                if x < minx: minx = x
                if x > maxx: maxx = x
                if y < miny: miny = y
                if y > maxy: maxy = y
    m = 24
    minx, miny = max(0, minx - m), max(0, miny - m)
    maxx, maxy = min(w - 1, maxx + m), min(h - 1, maxy + m)
    crop = im.crop((minx, miny, maxx + 1, maxy + 1))
    # 限宽 1500，保持比例
    if crop.width > 1500:
        crop = crop.resize((1500, round(crop.height * 1500 / crop.width)), Image.LANCZOS)
    out = os.path.join(OUTDIR, name)
    crop.save(out, "WEBP", quality=80, method=6)
    print(name, crop.size, f"{os.path.getsize(out)/1024:.0f} KB",
          f"bbox=({minx},{miny})-({maxx},{maxy}) of {w}x{h}")
doc.close()
