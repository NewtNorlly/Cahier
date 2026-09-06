# -*- coding: utf-8 -*-
import pymupdf as fitz

pdfs = [
    (r"C:\Users\NewtN\Desktop\中国法制史\9月5日讲稿.pdf", "中国法制史"),
    (r"C:\Users\NewtN\Desktop\决策理论与方法\9月1日讲稿.pdf", "决策理论与方法"),
    (r"C:\Users\NewtN\Desktop\决策理论与方法\9月3日讲稿.pdf", "决策理论与方法"),
    (r"C:\Users\NewtN\Desktop\土地资源管理\8月31日讲稿.pdf", "土地资源管理"),
    (r"C:\Users\NewtN\Desktop\土地资源管理\9月4日讲稿.pdf", "土地资源管理"),
    (r"C:\Users\NewtN\Desktop\土地资源管理\课程考核标准与作业一.pdf", "土地资源管理"),
    (r"C:\Users\NewtN\Desktop\宪法\9月6日讲稿.pdf", "宪法"),
]

for path, course in pdfs:
    doc = fitz.open(path)
    print(f"\n=== {course}/{doc.name} ({len(doc)} pages) ===")
    for i, page in enumerate(doc):
        drawings = page.get_drawings()
        annots = list(page.annots()) if page.annots() else []
        if drawings or annots:
            print(f"  Page {i+1}: {len(drawings)} drawings, {len(annots)} annots")
            for d in drawings[:8]:
                dtype = d.get("type")
                rect = d.get("rect")
                color = d.get("color")
                fill = d.get("fill")
                width = d.get("width")
                items = d.get("items", [])
                print(f"    type={dtype}, rect={rect}, color={color}, fill={fill}, width={width}, items={len(items)}")
                if items:
                    for item in items[:3]:
                        print(f"      item: {item}")
    doc.close()
