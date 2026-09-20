# -*- coding: utf-8 -*-
"""把横带横向重复 N 次导出 PNG，肉眼检查首尾衔接是否无缝。
用法: python seamcheck.py <输入> <输出.png> [N=2]"""
import sys
from pathlib import Path
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
n = int(sys.argv[3]) if len(sys.argv) > 3 else 2
im = Image.open(src).convert("RGB")
w, h = im.size
canvas = Image.new("RGB", (w * n, h))
for i in range(n):
    canvas.paste(im, (i * w, 0))
# 在接缝处画细竖线辅助观察（每隔 w）
from PIL import ImageDraw
d = ImageDraw.Draw(canvas)
for i in range(1, n):
    x = i * w
    d.line([(x, 0), (x, h - 1)], fill=(255, 0, 0), width=2)
Path(dst).parent.mkdir(parents=True, exist_ok=True)
canvas.save(dst)
print(dst, canvas.size)
