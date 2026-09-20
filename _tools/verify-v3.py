# -*- coding: utf-8 -*-
"""新版课件分页验证：估算 vs 实测、页数/配对数/超高检查。"""
import json, re, os, statistics as st
TOOLS = r"C:\Users\NewtN\下载\Cahier-main\_tools"
deck_map = {"决策理论课件0": 0, "决策理论课件1": 1, "决策理论课件2": 2, "决策理论课件3": 3, "决策理论课件4": 4}
est = {i: {} for i in range(5)}
for line in open(os.path.join(TOOLS, "slidew-v3.txt"), encoding="utf-8"):
    m = re.search(r"SLIDEW (决策理论课件\d)[^#]*#(\d+) est=(\d+)", line)
    if m:
        est[deck_map[m.group(1)]].setdefault(int(m.group(2)), int(m.group(3)))

CAP = 972
total_pages = total_pairs = total_over = 0
all_resid = []
for di in range(5):
    data = json.load(open(os.path.join(TOOLS, "shots", f"deck{di}.json"), encoding="utf-8-sig"))
    cap = data["chrome"]["capacity"]
    pages = data["pages"]
    solo = sum(1 for p in pages if len(p["slides"]) == 1)
    pairs = len(pages) - solo
    over = []
    for p in pages:
        s = sum(c["outer"] for c in p["cards"])
        if s > cap + 2: over.append((p["page"], p["slides"], round(s)))
    # 卡片估算 vs 实测（卡片外高含 margin；估算 w 含卡片铬不含 margin，比较时加 18 给非末卡）
    for p in pages:
        cards = p["cards"]
        for k, c in enumerate(cards):
            e = est[di].get(c["slide"])
            margin = 18 if k < len(cards) - 1 else 0
            if e: all_resid.append(c["outer"] + margin - e)
    total_pages += len(pages); total_pairs += pairs; total_over += len(over)
    print(f"课件{di}: 页={len(pages)} 独占={solo} 配对={pairs} 超高={len(over)} 容量={round(cap)}")
    for o in over: print("   超高页:", o)
    # 列出所有独占页（便于核对是否不可避免）
    sol = [(p["slides"], round(sum(c["outer"] for c in p["cards"]))) for p in pages if len(p["slides"]) == 1]
    print("   独占页:", sol)
print(f"\n合计 页={total_pages} 配对={total_pairs} 超高页={total_over}")
print(f"单卡估算残差(实测+margin-估算): mean={st.mean(all_resid):.1f} sd={st.pstdev(all_resid):.1f} min={min(all_resid)} max={max(all_resid)}")
