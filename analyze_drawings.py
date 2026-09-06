# -*- coding: utf-8 -*-
"""深入分析矢量绘图：颜色分布、类型、形状特征"""
import pymupdf as fitz
import os
from collections import Counter

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

def color_key(c):
    if c is None:
        return "None"
    return f"({c[0]:.3f},{c[1]:.3f},{c[2]:.3f})"

for path, course in FILES:
    print("=" * 70)
    print(f"{course} - {os.path.basename(path)}")
    doc = fitz.open(path)

    all_colors_fill = Counter()
    all_colors_stroke = Counter()
    all_types = Counter()
    non_white_non_black = []  # (page, drawing)

    for pno in range(len(doc)):
        page = doc[pno]
        drawings = page.get_drawings()
        for d in drawings:
            dtype = d.get("type", "?")
            fill = d.get("fill")
            color = d.get("color")
            all_types[dtype] += 1
            if fill:
                all_colors_fill[color_key(fill)] += 1
            if color:
                all_colors_stroke[color_key(color)] += 1

            # 收集非白非黑的绘图
            is_bg = (fill and fill[0] > 0.95 and fill[1] > 0.95 and fill[2] > 0.95)
            is_black = (fill and fill[0] < 0.05 and fill[1] < 0.05 and fill[2] < 0.05)
            if fill and not is_bg and not is_black:
                non_white_non_black.append((pno + 1, d))
            if color and not (color[0] > 0.95 and color[1] > 0.95 and color[2] > 0.95) and not (color[0] < 0.05 and color[1] < 0.05 and color[2] < 0.05):
                non_white_non_black.append((pno + 1, d))

    print(f"  绘图类型: {dict(all_types)}")
    print(f"  填充颜色: {dict(all_colors_fill)}")
    print(f"  描边颜色: {dict(all_colors_stroke)}")
    print(f"  非白非黑绘图数: {len(non_white_non_black)}")

    # 详细展示非白非黑绘图（前15个）
    for i, (pg, d) in enumerate(non_white_non_black[:15]):
        rect = d.get("rect")
        fill = d.get("fill")
        color = d.get("color")
        items = d.get("items", [])
        width = rect.width if rect else 0
        height = rect.height if rect else 0
        print(f"    第{pg}页 #{i}: fill={color_key(fill)}, stroke={color_key(color)}, "
              f"rect=({rect.x0:.1f},{rect.y0:.1f},{rect.x1:.1f},{rect.y1:.1f}) "
              f"w={width:.1f} h={height:.1f} items={len(items)}")
        # 展示items类型
        item_types = Counter(it[0] for it in items)
        print(f"      items类型: {dict(item_types)}")

    doc.close()
    print()
