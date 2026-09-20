# -*- coding: utf-8 -*-
"""把生图横带裁剪/缩放成定高横带，并做首尾 wrap-around 交叉淡入，导出可无缝平铺的 WebP。
用法: python make_strip.py <输入> <输出.webp> [anchor=center|bottom|top] [tile_h=480]
输出宽度固定 2200，交叉带 240，故平铺周期宽 = 1960。
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image

TILE_W = 2200
OVERLAP = 240
QUALITY = 84


def main():
    src = Path(sys.argv[1])
    dst = Path(sys.argv[2])
    anchor = sys.argv[3] if len(sys.argv) > 3 else "center"
    tile_h = int(sys.argv[4]) if len(sys.argv) > 4 else 480

    img = Image.open(src).convert("RGB")
    w, h = img.size
    # 先按目标宽缩放（横带通常够宽）；若缩放后高度不足，则改按高度缩放
    img2 = img.resize((TILE_W, round(h * TILE_W / w)), Image.LANCZOS)
    w2, h2 = img2.size
    if h2 < tile_h:
        img2 = img.resize((round(w * tile_h / h), tile_h), Image.LANCZOS)
        w2, h2 = img2.size
        if w2 < TILE_W:
            # 极端情况：宽不够则平铺补足
            canvas = Image.new("RGB", (TILE_W, tile_h))
            for x in range(0, TILE_W, w2):
                canvas.paste(img2.crop((0, 0, min(w2, TILE_W - x), tile_h)), (x, 0))
            img2 = canvas
            w2, h2 = TILE_W, tile_h
    # 竖向裁剪窗口
    if anchor == "bottom":
        y0 = max(0, h2 - tile_h)
    elif anchor == "top":
        y0 = 0
    else:
        y0 = max(0, (h2 - tile_h) // 2)
    band = img2.crop((0, y0, min(w2, TILE_W), y0 + tile_h))
    if band.width < TILE_W:
        band = band.resize((TILE_W, tile_h), Image.LANCZOS)

    arr = np.asarray(band).astype(np.float32)
    ov = OVERLAP
    W = TILE_W - ov
    left = arr[:, :ov].copy()
    right = arr[:, W:W + ov].copy()
    t = np.linspace(0, 1, ov, dtype=np.float32)[None, :, None]
    arr[:, :ov] = left * t + right * (1.0 - t)
    tile = arr[:, :W]
    out = Image.fromarray(np.clip(tile, 0, 255).astype(np.uint8))
    dst.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst, "WEBP", quality=QUALITY, method=6)
    print(f"{dst.name}  {out.size}  {dst.stat().st_size/1024:.1f} KB")


if __name__ == "__main__":
    main()
