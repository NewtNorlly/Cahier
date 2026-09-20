# -*- coding: utf-8 -*-
"""最终全站密度统计"""
import re, io, os

ROOT = r"C:\Users\NewtN\下载\Cahier-main"
files = [
    r"德语\9月19日讲稿.md",
    r"德语\9月16日讲稿.md",
    r"德语\9月4日讲稿.md",
    r"法语\9月15日讲稿.md",
    r"法语\9月17日讲稿.md",
    r"法语\9月19日讲稿.md",
    r"英语\9月11日讲稿.md",
    r"英语\9月13日讲稿.md",
    r"英语\9月14日讲稿.md",
    r"英语\9月15日讲稿.md",
    r"英语\9月16日讲稿.md",
    r"英语\9月17日讲稿.md",
    r"英语\9月18日讲稿.md",
    r"英语\9月19日讲稿.md",
]

print(f"{'文件':<25} {'段数':>6} {'平均':>6} {'最长':>6} {'>320':>5}")
print("-" * 55)
total_paras = 0
total_over320 = 0
for f in files:
    path = os.path.join(ROOT, f)
    with io.open(path, 'r', encoding='utf-8-sig') as fh:
        text = fh.read()
    folios = re.finditer(r'(?s)<!--col:M-->(.*?)(?:<!--col:R-->|\Z)', text)
    all_paras = []
    for m in folios:
        m_c = m.group(1).strip()
        paras = [p.strip() for p in m_c.split('\n\n') if p.strip()]
        all_paras.extend(paras)
    lengths = [len(p) for p in all_paras]
    avg = sum(lengths) / len(lengths) if lengths else 0
    mx = max(lengths) if lengths else 0
    over320 = sum(1 for l in lengths if l > 320)
    total_paras += len(all_paras)
    total_over320 += over320
    name = os.path.basename(f).replace("讲稿.md", "")
    print(f"{name:<25} {len(all_paras):>6} {avg:>6.0f} {mx:>6} {over320:>5}")

print("-" * 55)
print(f"{'合计':<25} {total_paras:>6} {'':>6} {'':>6} {total_over320:>5}")
