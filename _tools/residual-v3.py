# -*- coding: utf-8 -*-
"""新版估算残差明细：定位仍偏差大的幻灯片。"""
import json, re, os, glob
TOOLS = r"C:\Users\NewtN\下载\Cahier-main\_tools"
ROOT = r"C:\Users\NewtN\下载\Cahier-main"
deck_map = {"决策理论课件0": 0, "决策理论课件1": 1, "决策理论课件2": 2, "决策理论课件3": 3, "决策理论课件4": 4}
est = {i: {} for i in range(5)}
for line in open(os.path.join(TOOLS, "slidew-v3.txt"), encoding="utf-8"):
    m = re.search(r"SLIDEW (决策理论课件\d)[^#]*#(\d+) est=(\d+)", line)
    if m:
        est[deck_map[m.group(1)]].setdefault(int(m.group(2)), int(m.group(3)))
mds = sorted(glob.glob(os.path.join(ROOT, "决策理论与方法", "决策理论课件*.md")))
folio_re = re.compile(r"<!--folio:第(\d+)页-->")
def body_of(md, n):
    t = open(md, encoding="utf-8").read()
    parts = folio_re.split(t)
    for i in range(1, len(parts), 2):
        if int(parts[i]) == n:
            return parts[i+1].split("<!--/folio-->")[0]
    return ""
rows = []
for di in range(5):
    data = json.load(open(os.path.join(TOOLS, "shots", f"deck{di}.json"), encoding="utf-8-sig"))
    for p in data["pages"]:
        cards = p["cards"]
        for k, c in enumerate(cards):
            n = c["slide"]; e = est[di].get(n)
            if not e: continue
            margin = 18 if k < len(cards)-1 else 0
            resid = c["outer"] + margin - e
            body = body_of(mds[di], n)
            body = re.sub(r"<!--[^>]*-->", "", body)
            nimg = body.count("!["); cjk = len(re.findall(r"[一-鿿]", body))
            head = " ".join(re.sub(r"!\[[^\]]*\]\([^)]*\)", "", body).split())[:50]
            rows.append((resid, di, n, e, c["outer"]+margin, nimg, cjk, head))
print("===== 估算偏低（实测>估算，超高风险）=====")
for r in sorted(rows, reverse=True)[:15]:
    print(f"课件{r[1]} #{r[2]} est={r[3]} act+mg={r[4]} 残差={r[0]:+d} 图={r[5]} 中字={r[6]} | {r[7]}")
print("\n===== 估算偏高（错失配对）====")
for r in sorted(rows)[:15]:
    print(f"课件{r[1]} #{r[2]} est={r[3]} act+mg={r[4]} 残差={r[0]:+d} 图={r[5]} 中字={r[6]} | {r[7]}")
