# -*- coding: utf-8 -*-
"""
网络两门课程封面重做：细线描插画风格，与文献封面成套。
出 960×1280（竖版）与 480（合集卡）两规格 webp。
"""
from PIL import Image, ImageDraw, ImageFont
import math, os

FONT_SERIF = r"C:\Windows\Fonts\NotoSerifSC-VF.ttf"
FONT_SANS = r"C:\Windows\Fonts\NotoSansSC-VF.ttf"
ROOT = r"C:\Users\NewtN\下载\Cahier-main"

def draw_spaced(draw, x, y, text, font, fill, spacing=4, anchor="lt"):
    chars = list(text)
    widths = [draw.textlength(c, font=font) for c in chars]
    total = sum(widths) + spacing * (len(chars) - 1)
    if anchor == "mt":
        sx = x - total / 2
    elif anchor == "rt":
        sx = x - total
    else:
        sx = x
    cx = sx
    for c, w in zip(chars, widths):
        draw.text((cx, y), c, font=font, fill=fill)
        cx += w + spacing

def thin_cover(w, h, bg, border_c, text_c, soft_c, accent_c, gold_c,
               title, eng_title, motif_func, seal_char=None, num_label=None):
    img = Image.new("RGB", (w, h), bg)
    draw = ImageDraw.Draw(img)
    # Double border
    m1, m2 = int(w*0.045), int(w*0.055)
    draw.rectangle([m1, m1, w-m1, h-m1], outline=border_c, width=1)
    draw.rectangle([m2, m2, w-m2, h-m2], outline=border_c, width=1)
    # Top label
    f_top = ImageFont.truetype(FONT_SERIF, int(h*0.022))
    draw_spaced(draw, w//2, int(h*0.07), "CAHIER · 教学讲稿", f_top, soft_c, spacing=int(h*0.008), anchor="mt")
    draw.line([(w//2-int(w*0.05), int(h*0.095)), (w//2+int(w*0.05), int(h*0.095))], fill=gold_c, width=1)
    # Motif
    motif_func(draw, w, h, border_c, soft_c, accent_c, gold_c)
    # Title
    f_title = ImageFont.truetype(FONT_SERIF, int(h*0.11))
    tw = draw.textlength(title, font=f_title)
    draw.text((w//2 - tw/2, int(h*0.62)), title, font=f_title, fill=text_c)
    # English subtitle
    f_eng = ImageFont.truetype(FONT_SANS, int(h*0.028))
    draw_spaced(draw, w//2, int(h*0.74), eng_title, f_eng, soft_c, spacing=int(h*0.006), anchor="mt")
    # Bottom
    f_bot = ImageFont.truetype(FONT_SANS, int(h*0.025))
    if num_label:
        draw.text((int(w*0.08), int(h*0.88)), num_label, font=f_bot, fill=gold_c)
    draw_spaced(draw, w//2, int(h*0.88), "ARCHIVE · 2026", f_bot, soft_c, spacing=int(h*0.004), anchor="mt")
    # Seal
    if seal_char:
        s = int(h*0.05)
        sx, sy = w//2 - s//2, int(h*0.55)
        draw.rectangle([sx, sy, sx+s, sy+s], outline=(164,59,40), width=2)
        f_seal = ImageFont.truetype(FONT_SERIF, int(h*0.038))
        sw = draw.textlength(seal_char, font=f_seal)
        draw.text((sx+s/2-sw/2, sy+s*0.12), seal_char, font=f_seal, fill=(164,59,40))
    return img

# Motif 1: Network engineer - star topology with central switch
def motif_network_engineer(draw, w, h, border_c, soft_c, accent_c, gold_c):
    cx, cy = w//2, int(h*0.38)
    R = int(w*0.14)
    # Central switch box
    bw, bh = int(w*0.06), int(w*0.04)
    draw.rectangle([cx-bw, cy-bh, cx+bw, cy+bh], outline=accent_c, width=2)
    # 8 nodes around
    for i in range(8):
        angle = -math.pi/2 + i*(2*math.pi/8)
        nx = cx + R*math.cos(angle)
        ny = cy + R*math.sin(angle)
        # Connection line
        draw.line([(cx, cy), (nx, ny)], fill=soft_c, width=1)
        # Node circle
        r = int(w*0.012)
        draw.ellipse([nx-r, ny-r, nx+r, ny+r], outline=accent_c, width=2)
    # Small dots on connections
    for i in range(8):
        angle = -math.pi/2 + i*(2*math.pi/8)
        for t in [0.4, 0.7]:
            px = cx + R*t*math.cos(angle)
            py = cy + R*t*math.sin(angle)
            draw.ellipse([px-2, py-2, px+2, py+2], fill=gold_c)

# Motif 2: Network tech - layered grid with router
def motif_network_tech(draw, w, h, border_c, soft_c, accent_c, gold_c):
    cx, cy = w//2, int(h*0.38)
    # 3 horizontal lines (layers)
    for dy in [-int(w*0.06), 0, int(w*0.06)]:
        draw.line([(cx-int(w*0.16), cy+dy), (cx+int(w*0.16), cy+dy)], fill=border_c, width=1)
    # Vertical connections
    for dx in [-int(w*0.1), 0, int(w*0.1)]:
        draw.line([(cx+dx, cy-int(w*0.06)), (cx+dx, cy+int(w*0.06))], fill=soft_c, width=1)
    # Nodes at intersections
    for dx in [-int(w*0.1), 0, int(w*0.1)]:
        for dy in [-int(w*0.06), 0, int(w*0.06)]:
            r = int(w*0.01)
            is_center = (dx == 0 and dy == 0)
            fill = accent_c if is_center else soft_c
            draw.ellipse([cx+dx-r, cy+dy-r, cx+dx+r, cy+dy+r], fill=fill)
    # Signal wave on top
    for i in range(3):
        r = int(w*0.03) + i*int(w*0.02)
        draw.arc([cx-r, cy-int(w*0.12)-r, cx+r, cy-int(w*0.12)+r], 200, 340, fill=gold_c, width=1)

def make_covers():
    # Network engineer
    bg = (235, 238, 242)
    border_c = (185, 195, 205)
    text_c = (70, 85, 105)
    soft_c = (130, 145, 160)
    accent_c = (60, 90, 120)
    gold_c = (150, 130, 95)

    for size, suffix in [(960, ""), (480, "-480")]:
        h = int(size * 4 / 3) if size == 960 else int(size * 2 / 3)
        if size == 480:
            h = 320
        img = thin_cover(size, h, bg, border_c, text_c, soft_c, accent_c, gold_c,
                        "网络工程师", "NETWORK ENGINEER", motif_network_engineer,
                        seal_char="网", num_label="Nº 14")
        out = os.path.join(ROOT, "网络工程师", "covers", f"network-engineer-960{suffix}.webp")
        img.save(out, "WEBP", quality=85, method=6)
        print(f"Saved: {out} ({os.path.getsize(out)} bytes)")

    # Network tech
    bg2 = (233, 236, 238)
    border_c2 = (180, 190, 195)
    text_c2 = (65, 80, 95)
    soft_c2 = (125, 140, 150)
    accent_c2 = (55, 100, 110)
    gold_c2 = (145, 125, 90)

    for size, suffix in [(960, ""), (480, "-480")]:
        h = int(size * 4 / 3) if size == 960 else int(size * 2 / 3)
        if size == 480:
            h = 320
        img = thin_cover(size, h, bg2, border_c2, text_c2, soft_c2, accent_c2, gold_c2,
                        "网络技术", "NETWORK TECHNOLOGY", motif_network_tech,
                        seal_char="技", num_label="Nº 15")
        out = os.path.join(ROOT, "网络技术", "covers", f"network-tech-960{suffix}.webp")
        img.save(out, "WEBP", quality=85, method=6)
        print(f"Saved: {out} ({os.path.getsize(out)} bytes)")

if __name__ == "__main__":
    make_covers()
