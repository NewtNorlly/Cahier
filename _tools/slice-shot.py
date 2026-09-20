# -*- coding: utf-8 -*-
"""把长截图纵向切成 ≤3000px 的小段并缩到宽 1000，便于查看。
用法: python slice-shot.py <img> [seg_h=2600] [out_w=1000]"""
import sys
from PIL import Image
import os

src = sys.argv[1]
seg_h = int(sys.argv[2]) if len(sys.argv) > 2 else 2600
out_w = int(sys.argv[3]) if len(sys.argv) > 3 else 1000

im = Image.open(src).convert("RGB")
w, h = im.size
base = os.path.splitext(os.path.basename(src))[0]
d = os.path.dirname(src)
n = 0
y = 0
while y < h:
    n += 1
    box = (0, y, w, min(y + seg_h, h))
    crop = im.crop(box)
    scale = out_w / w
    crop = crop.resize((out_w, max(1, round(crop.height * scale))), Image.LANCZOS)
    out = os.path.join(d, f"{base}-s{n}.jpg")
    crop.save(out, quality=82)
    print(out, crop.size)
    y += seg_h
print("total", n)
