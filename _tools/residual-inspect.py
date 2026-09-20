# -*- coding: utf-8 -*-
"""列出估算偏差最大的幻灯片（双向），并按是否含图、是否中文长文分类，定位噪声来源。"""
import json, re, os
TOOLS = r"C:\Users\NewtN\下载\Cahier-main\_tools"
ROOT = r"C:\Users\NewtN\下载\Cahier-main"
actual = {}
for i in range(5):
    data = json.load(open(os.path.join(TOOLS, "shots", f"deck{i}.json"), encoding="utf-8-sig"))
    d = {}
    for p in data["pages"]:
        for c in p["cards"]:
            d[c["slide"]] = c["outer"]
    actual[i] = d
deck_map = {"决策理论课件0": 0, "决策理论课件1": 1, "决策理论课件2": 2, "决策理论课件3": 3, "决策理论课件4": 4}
est = {i: {} for i in range(5)}
for line in open(os.path.join(TOOLS, "slidew-new.txt"), encoding="utf-8"):
    m = re.search(r"SLIDEW (决策理论课件\d)[^#]*#(\d+) est=(\d+)", line)
    if m:
        est[deck_map[m.group(1)]].setdefault(int(m.group(2)), int(m.group(3)))

import glob
mds = sorted(glob.glob(os.path.join(ROOT, "决策理论与方法", "决策理论课件*.md")))
folio_re = re.compile(r"<!--folio:第(\d+)页-->")
def slide_body(md, n):
    t = open(md, encoding="utf-8").read()
    parts = folio_re.split(t)
    for i in range(1, len(parts), 2):
        if int(parts[i]) == n:
            body = parts[i+1].split("<!--/folio-->")[0]
            body = re.sub(r"<!--col:[LRM]-->", "", body)
            return body
    return ""

rows = []
for di in range(5):
    for n in sorted(actual[di]):
        e = est[di].get(n)
        if not e: continue
        a = actual[di][n]
        body = slide_body(mds[di], n)
        nimg = body.count("![")
        cjk = len(re.findall(r"[一-鿿]", body))
        tables = body.count("| ---")
        head = " ".join(re.sub(r"!\[[^\]]*\]\([^)]*\)", "", body).split())[:60]
        rows.append((a-e, di, n, e, a, nimg, cjk, tables, head))

print("===== 估算偏高最多（est >> actual，导致该配对的没配对）=====")
for r in sorted(rows, reverse=True)[:18]:
    print(f"课件{r[1]} #{r[2]} est={r[3]} act={r[4]} 差={r[0]:+d} 图={r[5]} 中字={r[6]} 表={r[7]} | {r[8]}")
print("\n===== 估算偏低最多（actual >> est，超高风险）=====")
for r in sorted(rows)[:18]:
    print(f"课件{r[1]} #{r[2]} est={r[3]} act={r[4]} 差={r[0]:+d} 图={r[5]} 中字={r[6]} 表={r[7]} | {r[8]}")
