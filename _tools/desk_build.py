# -*- coding: utf-8 -*-
import sys, io, os, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from openskp import SkpFile
from openskp.export import glb
import trimesh, numpy as np

src = r"C:\Users\NewtN\下载\Desk.skp"
raw = r"C:\Users\NewtN\下载\Cahier-main\_tools\desk-raw.glb"
dst = r"C:\Users\NewtN\下载\Cahier-main\site\public\3d\desk.glb"

# 1) 先导出未经改色的原始 glb
skp = SkpFile.open(src)
skp.parse()
glb.export(skp, raw)

# 原始 RGB -> 明媚目标色（天蓝/天青）；金属与白/米白保持原色
RECOLOR = {
    (0,102,153):  ( 72, 176, 228),  # Layer0 深蓝主体 -> 饱和天蓝（主桌面，要比浅背景更跳）
    (91,91,91):   (132, 146, 160),  # 深灰塑料 -> 雾灰蓝
    (142,108,78): (126, 206, 238),  # 榉木巧克力 -> 清亮天青
    (9,73,119):   ( 52, 150, 214),  # RAL5005 深蓝 -> 明快湖蓝
}

def orig_rgb_from_name(name):
    # mesh_N_ROOT__Component_29_Layer0_<R>_<G>_<B...>
    nums = re.findall(r'_(\d+)', name)
    nums = [int(x) for x in nums]
    # 找 'Layer0' 之后的连续三段
    key = name.split('Layer0')[-1]
    trip = re.findall(r'\d+', key)
    trip = [int(x) for x in trip][:3]
    if len(trip) >= 3:
        return tuple(trip[:3])
    return None

scene = trimesh.load(raw)
report = []
for name, g in scene.geometry.items():
    orig = orig_rgb_from_name(name)
    target = RECOLOR.get(orig, orig)
    if target is None:
        report.append((name, None, "keep(no-color)")); continue
    fc = np.tile(np.array([target[0], target[1], target[2], 255], dtype=np.uint8),
                 (len(g.faces), 1))
    g.visual = trimesh.visual.ColorVisuals(mesh=g, face_colors=fc)
    report.append((name[:46], orig, target))

os.makedirs(os.path.dirname(dst), exist_ok=True)
scene.export(dst)
for r in report: print("  ", r)
print("exported desk.glb:", os.path.getsize(dst), "bytes")

# 回读校验最终面色
chk = trimesh.load(dst)
print("=== verify final face colors ===")
for name, g in chk.geometry.items():
    try:
        c = np.asarray(g.visual.face_colors[0])
        print("  ", name[:46], tuple(int(x) for x in c), "faces=", len(g.faces))
    except Exception as e:
        print("  ", name[:46], "no face color", e)
