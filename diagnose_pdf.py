# -*- coding: utf-8 -*-
"""诊断PDF：检查注释、图片、表单、原始对象等"""
import pymupdf as fitz
import os

FILES = [
    (r"C:\Users\NewtN\Desktop\德语\9月4日讲稿.pdf", "德语"),
    (r"C:\Users\NewtN\Desktop\民事诉讼法\9月6日讲稿.pdf", "民事诉讼法"),
    (r"C:\Users\NewtN\Desktop\知识产权法基础理论\9月4日讲稿.pdf", "知识产权法基础理论"),
    (r"C:\Users\NewtN\Desktop\知识产权法基础理论\9月5日讲稿.pdf", "知识产权法基础理论"),
    (r"C:\Users\NewtN\Desktop\社会保障学\8月31日讲稿.pdf", "社会保障学"),
    (r"C:\Users\NewtN\Desktop\社会保障学\9月2日讲稿.pdf", "社会保障学"),
    (r"C:\Users\NewtN\Desktop\脑图集（放在教学讲稿模块，作为单独一个课程）\8月21日草稿.pdf", "脑图集"),
    (r"C:\Users\NewtN\Desktop\脑图集（放在教学讲稿模块，作为单独一个课程）\8月31日草稿.pdf", "脑图集"),
]

for path, course in FILES:
    print("=" * 70)
    print(f"文件: {course} - {os.path.basename(path)}")
    print(f"大小: {os.path.getsize(path):,} bytes")
    doc = fitz.open(path)
    print(f"页数: {len(doc)}")
    print(f"元数据: {doc.metadata}")

    # 检查是否有表单
    if doc.is_form_pdf:
        print("  ⚠ 包含表单字段")
        for field in doc.widgets():
            print(f"    表单字段: type={field.field_type_string}, name={field.field_name}, value={field.field_value}")

    total_annots = 0
    total_images = 0
    total_drawings = 0
    for pno in range(len(doc)):
        page = doc[pno]
        text = page.get_text("text").strip()

        # 注释
        annots = list(page.annots())
        total_annots += len(annots)

        # 图片
        images = page.get_images(full=True)
        total_images += len(images)

        # 矢量绘图（可能是手写划线直接画在内容流里）
        drawings = page.get_drawings()
        total_drawings += len(drawings)

        if pno == 0 or annots or len(images) > 2 or len(drawings) > 10:
            print(f"  第{pno+1}页: 文本长度={len(text)}, 注释={len(annots)}, 图片={len(images)}, 矢量绘图={len(drawings)}")
            if annots:
                for a in annots:
                    print(f"    注释: type={a.type}, rect={a.rect}, info={a.info}")
            if drawings and len(drawings) <= 20:
                for d in drawings[:5]:
                    print(f"    绘图: type={d.get('type')}, color={d.get('color')}, fill={d.get('fill')}, rect={d.get('rect')}, items_count={len(d.get('items', []))}")

    print(f"  合计: 注释={total_annots}, 图片={total_images}, 矢量绘图={total_drawings}")

    # 检查原始PDF对象中是否有 /Annot 类型
    annot_xrefs = []
    for xref in range(1, doc.xref_length()):
        try:
            obj_type = doc.xref_get_key(xref, "Type")
            if obj_type and "Annot" in str(obj_type):
                annot_xrefs.append(xref)
        except Exception:
            pass
    if annot_xrefs:
        print(f"  ⚠ 原始对象中发现 {len(annot_xrefs)} 个 Annot 类型对象: {annot_xrefs[:10]}")

    doc.close()
    print()
