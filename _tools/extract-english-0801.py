# -*- coding: utf-8 -*-
"""提取桌面 英语课程8月1日讲稿.docx 的全部段落/表格文本与内嵌图片清单。"""
import zipfile, re, os, sys
from xml.etree import ElementTree as ET

DOCX = r"C:\Users\NewtN\Desktop\英语课程8月1日讲稿.docx"
OUTMEDIA = r"C:\Users\NewtN\下载\Cahier-main\_tools\shots\user-0920\docx-media"
os.makedirs(OUTMEDIA, exist_ok=True)

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
z = zipfile.ZipFile(DOCX)
names = z.namelist()
media = [n for n in names if n.startswith("word/media/")]
print("== media files ==")
for n in media:
    data = z.read(n)
    fn = os.path.join(OUTMEDIA, os.path.basename(n))
    with open(fn, "wb") as f:
        f.write(data)
    print(" ", n, len(data))

xml = z.read("word/document.xml").decode("utf-8")
root = ET.fromstring(xml)
body = root.find(f"{W}body")

def para_text(p):
    parts = []
    for t in p.iter(f"{W}t"):
        parts.append(t.text or "")
    # 检测绘图
    has_img = next(p.iter("{http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing}*"), None) is not None
    drawings = list(p.iter("{http://schemas.openxmlformats.org/drawingml/2006/main}blip"))
    return "".join(parts), bool(drawings)

print("\n== document flow ==")
idx = 0
for el in body:
    tag = el.tag.replace(W, "")
    if tag == "p":
        txt, img = para_text(el)
        # 样式
        pstyle = el.find(f"{W}pPr/{W}pStyle")
        style = pstyle.get(f"{W}val") if pstyle is not None else ""
        numpr = el.find(f"{W}pPr/{W}numPr")
        num = f" [num:{numpr.find(f'{W}numId').get(f'{W}val')}]" if numpr is not None else ""
        if txt.strip() or img:
            print(f"{idx:03d} P{('['+style+']') if style else ''}{num}{' [IMG]' if img else ''}: {txt}")
            idx += 1
    elif tag == "tbl":
        print(f"{idx:03d} TABLE:")
        for row in el.iter(f"{W}tr"):
            cells = []
            for tc in row.iter(f"{W}tc"):
                cells.append("".join(t.text or "" for t in tc.iter(f"{W}t")))
            print("    | " + " | ".join(cells))
        idx += 1
