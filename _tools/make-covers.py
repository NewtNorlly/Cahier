# -*- coding: utf-8 -*-
"""
生成三张封面：
1. 文献笔记《从血缘群到公民化》— 960x1280 学院派文献封面
2. 网络工程师课程 — 960x640 安静学院风课程封面
3. 网络技术课程 — 960x640 安静学院风课程封面
"""
from PIL import Image, ImageDraw, ImageFont
import math, os

FONT_SERIF = r"C:\Windows\Fonts\NotoSerifSC-VF.ttf"
FONT_SANS = r"C:\Windows\Fonts\NotoSansSC-VF.ttf"
FONT_SIMSUN = r"C:\Windows\Fonts\simsun.ttc"

OUT_DIR = r"C:\Users\NewtN\下载\Cahier-main"

def draw_spaced_text(draw, x, y, text, font, fill, spacing=4, anchor="lt"):
    """画字间距拉开的文字，返回总宽度。anchor: lt(左顶) / mt(中顶) / lb / mb"""
    chars = list(text)
    widths = [draw.textlength(c, font=font) for c in chars]
    total = sum(widths) + spacing * (len(chars) - 1)
    if anchor in ("mt", "mb"):
        start_x = x - total / 2
    elif anchor in ("rt", "rb"):
        start_x = x - total
    else:
        start_x = x
    cx = start_x
    for c, w in zip(chars, widths):
        draw.text((cx, y), c, font=font, fill=fill)
        cx += w + spacing
    return total

def draw_double_border(draw, w, h, margin_outer, margin_inner, color, width=1):
    draw.rectangle([margin_outer, margin_outer, w - margin_outer, h - margin_outer],
                   outline=color, width=width)
    draw.rectangle([margin_inner, margin_inner, w - margin_inner, h - margin_inner],
                   outline=color, width=width)

# ============================================================
# 1. 文献笔记封面：从血缘群到公民化
# ============================================================
def make_literature_cover():
    W, H = 960, 1280
    bg = (238, 240, 234)        # 浅米灰绿
    border_c = (190, 195, 180)  # 灰绿边框
    text_c = (90, 105, 90)       # 灰绿正文
    soft_c = (140, 150, 135)     # 浅灰绿
    gold_c = (184, 149, 106)     # 赭金
    red_c = (164, 59, 40)        # 印章红
    ink_c = (60, 75, 65)         # 墨绿

    img = Image.new("RGB", (W, H), bg)
    draw = ImageDraw.Draw(img)

    # 双线边框
    draw_double_border(draw, W, H, 44, 58, border_c, 1)

    # 顶部标题
    f_top = ImageFont.truetype(FONT_SERIF, 26)
    draw_spaced_text(draw, W // 2, 92, "CAHIER · 文献笔记", f_top, soft_c, spacing=6, anchor="mt")

    # 短金线
    draw.line([(W//2 - 50, 135), (W//2 + 50, 135)], fill=gold_c, width=2)

    # 中心图案：宗族网络——一个大圆环上分布节点，节点间连线
    cx, cy = W // 2, 560
    R = 130  # 大圆半径
    # 大圆环
    draw.ellipse([cx - R, cy - R, cx + R, cy + R], outline=soft_c, width=2)
    # 内圆
    draw.ellipse([cx - R*0.65, cy - R*0.65, cx + R*0.65, cy + R*0.65],
                 outline=border_c, width=1)

    # 节点（大圆上 8 个点）
    nodes = []
    for i in range(8):
        angle = -math.pi/2 + i * (2*math.pi/8)
        nx = cx + R * math.cos(angle)
        ny = cy + R * math.sin(angle)
        nodes.append((nx, ny))
        # 节点小圆
        r = 5 if i % 2 == 0 else 3.5
        draw.ellipse([nx-r, ny-r, nx+r, ny+r], fill=gold_c if i % 2 == 0 else soft_c)

    # 节点间连线（稀疏，不画全连接）
    for i in range(8):
        if i % 2 == 0:
            j = (i + 1) % 8
            draw.line([nodes[i], nodes[j]], fill=soft_c, width=1)
        if i == 0:
            # 中心到顶节点
            draw.line([(cx, cy), nodes[0]], fill=soft_c, width=1)

    # 中心节点
    draw.ellipse([cx-8, cy-8, cx+8, cy+8], fill=red_c)

    # 下方红线连接到印章
    draw.line([(cx, cy + R + 10), (cx, cy + R + 40)], fill=soft_c, width=1)

    # 红色印章（正方形边框 + "宗"字）
    seal_size = 52
    seal_x = cx - seal_size // 2
    seal_y = cy + R + 50
    draw.rectangle([seal_x, seal_y, seal_x + seal_size, seal_y + seal_size],
                   outline=red_c, width=2)
    f_seal = ImageFont.truetype(FONT_SERIF, 34)
    # 居中画"宗"
    sw = draw.textlength("宗", font=f_seal)
    draw.text((seal_x + seal_size/2 - sw/2, seal_y + 8), "宗", font=f_seal, fill=red_c)

    # 英文副标题
    f_eng = ImageFont.truetype(FONT_SANS, 19)
    draw_spaced_text(draw, W // 2, 1050, "FROM KINSHIP TO CITIZENSHIP",
                     f_eng, soft_c, spacing=3, anchor="mt")

    # 底部
    f_bottom = ImageFont.truetype(FONT_SANS, 18)
    draw.text((80, H - 90), "Nº 08", font=f_bottom, fill=gold_c)
    draw_spaced_text(draw, W - 80, H - 90, "ARCHIVE · 2004",
                     f_bottom, soft_c, spacing=2, anchor="rt")

    out = os.path.join(OUT_DIR, "文献笔记", "figures", "xuanyuanxue-gongminhua-960.webp")
    img.save(out, "WEBP", quality=85, method=6)
    print(f"Saved: {out} ({os.path.getsize(out)} bytes)")
    return out

# ============================================================
# 2. 网络工程师课程封面
# ============================================================
def make_network_engineer_cover():
    W, H = 960, 640
    bg = (235, 238, 242)         # 冷调浅灰蓝
    border_c = (185, 195, 205)
    text_c = (70, 85, 105)
    soft_c = (130, 145, 160)
    accent_c = (60, 90, 120)     # 深蓝灰
    gold_c = (150, 130, 95)

    img = Image.new("RGB", (W, H), bg)
    draw = ImageDraw.Draw(img)

    # 双线边框
    draw_double_border(draw, W, H, 36, 48, border_c, 1)

    # 顶部
    f_top = ImageFont.truetype(FONT_SERIF, 22)
    draw_spaced_text(draw, W // 2, 70, "CAHIER · 教学讲稿", f_top, soft_c, spacing=5, anchor="mt")

    # 中心图案：网络节点图（3个节点连成菱形）
    cx, cy = W // 2, 280
    # 节点位置
    top_n = (cx, cy - 50)
    left_n = (cx - 70, cy + 20)
    right_n = (cx + 70, cy + 20)
    bot_n = (cx, cy + 70)
    nodes = [top_n, left_n, right_n, bot_n]

    # 连线
    draw.line([top_n, left_n], fill=soft_c, width=1)
    draw.line([top_n, right_n], fill=soft_c, width=1)
    draw.line([left_n, bot_n], fill=soft_c, width=1)
    draw.line([right_n, bot_n], fill=soft_c, width=1)
    draw.line([left_n, right_n], fill=border_c, width=1)

    # 节点
    for i, (nx, ny) in enumerate(nodes):
        r = 8 if i == 0 else 6
        draw.ellipse([nx-r, ny-r, nx+r, ny+r], fill=accent_c if i == 0 else soft_c)
        if i == 0:
            draw.ellipse([nx-3, ny-3, nx+3, ny+3], fill=bg)

    # 标题"网络工程师"
    f_title = ImageFont.truetype(FONT_SERIF, 64)
    title = "网络工程师"
    tw = draw.textlength(title, font=f_title)
    draw.text((W//2 - tw/2, 340), title, font=f_title, fill=text_c)

    # 英文
    f_eng = ImageFont.truetype(FONT_SANS, 20)
    draw_spaced_text(draw, W // 2, 440, "NETWORK ENGINEER",
                     f_eng, soft_c, spacing=3, anchor="mt")

    # 底部
    f_bottom = ImageFont.truetype(FONT_SANS, 17)
    draw.text((70, H - 75), "Nº 14", font=f_bottom, fill=gold_c)
    draw_spaced_text(draw, W // 2, H - 75, "ARCHIVE · 2026",
                     f_bottom, soft_c, spacing=2, anchor="mt")

    out = os.path.join(OUT_DIR, "网络工程师", "covers", "network-engineer-960.webp")
    img.save(out, "WEBP", quality=85, method=6)
    print(f"Saved: {out} ({os.path.getsize(out)} bytes)")
    return out

# ============================================================
# 3. 网络技术课程封面
# ============================================================
def make_network_tech_cover():
    W, H = 960, 640
    bg = (233, 236, 238)         # 微冷浅灰
    border_c = (180, 190, 195)
    text_c = (65, 80, 95)
    soft_c = (125, 140, 150)
    accent_c = (55, 100, 110)    # 青蓝灰
    gold_c = (145, 125, 90)

    img = Image.new("RGB", (W, H), bg)
    draw = ImageDraw.Draw(img)

    draw_double_border(draw, W, H, 36, 48, border_c, 1)

    f_top = ImageFont.truetype(FONT_SERIF, 22)
    draw_spaced_text(draw, W // 2, 70, "CAHIER · 教学讲稿", f_top, soft_c, spacing=5, anchor="mt")

    # 中心图案：分层网络——水平线+节点
    cx, cy = W // 2, 270
    # 三条水平线
    for i, dy in enumerate([-40, 0, 40]):
        draw.line([(cx - 90, cy + dy), (cx + 90, cy + dy)], fill=border_c, width=1)

    # 垂直线交叉
    for i, dx in enumerate([-60, 0, 60]):
        draw.line([(cx + dx, cy - 40), (cx + dx, cy + 40)], fill=soft_c, width=1)

    # 交点上的节点
    for dx in [-60, 0, 60]:
        for dy in [-40, 0, 40]:
            r = 5 if dx != 0 or dy != 0 else 7
            fill = accent_c if (dx == 0 and dy == 0) else soft_c
            draw.ellipse([cx+dx-r, cy+dy-r, cx+dx+r, cy+dy+r], fill=fill)

    # 标题
    f_title = ImageFont.truetype(FONT_SERIF, 64)
    title = "网络技术"
    tw = draw.textlength(title, font=f_title)
    draw.text((W//2 - tw/2, 340), title, font=f_title, fill=text_c)

    f_eng = ImageFont.truetype(FONT_SANS, 20)
    draw_spaced_text(draw, W // 2, 440, "NETWORK TECHNOLOGY",
                     f_eng, soft_c, spacing=3, anchor="mt")

    f_bottom = ImageFont.truetype(FONT_SANS, 17)
    draw.text((70, H - 75), "Nº 15", font=f_bottom, fill=gold_c)
    draw_spaced_text(draw, W // 2, H - 75, "ARCHIVE · 2026",
                     f_bottom, soft_c, spacing=2, anchor="mt")

    out = os.path.join(OUT_DIR, "网络技术", "covers", "network-tech-960.webp")
    img.save(out, "WEBP", quality=85, method=6)
    print(f"Saved: {out} ({os.path.getsize(out)} bytes)")
    return out

if __name__ == "__main__":
    make_literature_cover()
    # make_network_engineer_cover()
    # make_network_tech_cover()
    print("Literature cover regenerated.")
