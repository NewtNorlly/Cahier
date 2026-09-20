# -*- coding: utf-8 -*-
# 用已定稿的无缝 PNG（3920 宽 = 2×1960 周期）左半周期重编码为小体积 WebP。
from pathlib import Path
from PIL import Image

Q = 76
here = Path(__file__).parent
for name in ("far", "mid", "near"):
    im = Image.open(here / f"{name}-seam.png").convert("RGB")
    tile = im.crop((0, 0, 1960, im.height))
    for dst in (
        here.parent.parent / "site" / "public" / "footer" / f"{name}.webp",
        here.parent.parent / "site" / "dist" / "footer" / f"{name}.webp",
    ):
        dst.parent.mkdir(parents=True, exist_ok=True)
        tile.save(dst, "WEBP", quality=Q, method=6)
        print(dst, f"{dst.stat().st_size/1024:.1f} KB", tile.size)
