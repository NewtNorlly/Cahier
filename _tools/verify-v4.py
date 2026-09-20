# -*- coding: utf-8 -*-
"""v4 终验：配对统计、零超高、页级估算偏差（安全裕度）、单卡残差。"""
import json, re, os, statistics as st
TOOLS = r"C:\Users\NewtN\下载\Cahier-main\_tools"
deck_map = {"决策理论课件0": 0, "决策理论课件1": 1, "决策理论课件2": 2, "决策理论课件3": 3, "决策理论课件4": 4}
est = {i: {} for i in range(5)}
for line in open(os.path.join(TOOLS, "slidew-v4.txt"), encoding="utf-8"):
    m = re.search(r"SLIDEW .*课件(\d)[^#]*#(\d+) est=(\d+)", line)
    if m:
        est[int(m.group(1))].setdefault(int(m.group(2)), int(m.group(3)))

CAP = 972
tot_pages = tot_pairs = tot_over = 0
page_resid = []   # 实测页高 - 估算页高（正值=估算偏低，超高风险）
card_resid = []
for di in range(5):
    data = json.load(open(os.path.join(TOOLS, "shots", f"deck{di}.json"), encoding="utf-8-sig"))
    cap = data["chrome"]["capacity"]
    pages = data["pages"]
    solo = sum(1 for p in pages if len(p["slides"]) == 1)
    pairs = len(pages) - solo
    over, maxfill = [], 0
    for p in pages:
        actual = sum(c["outer"] for c in p["cards"])
        # 估算页高：卡片估算和 + 间距（配对时 18）
        ep = sum(est[di].get(c["slide"], c["outer"]) for c in p["cards"])
        if len(p["cards"]) == 2: ep += 18
        page_resid.append(actual - ep)
        for k, c in enumerate(p["cards"]):
            mg = 18 if k < len(p["cards"]) - 1 else 0
            if est[di].get(c["slide"]): card_resid.append(c["outer"] + mg - est[di][c["slide"]])
        maxfill = max(maxfill, actual)
        if actual > cap + 2: over.append((p["page"], p["slides"], round(actual)))
    tot_pages += len(pages); tot_pairs += pairs; tot_over += len(over)
    sol = [(p["slides"], round(sum(c["outer"] for c in p["cards"]))) for p in pages if len(p["slides"]) == 1]
    print(f"课件{di}: 页={len(pages)} 独占={solo} 配对={pairs} 超高={len(over)} 最高页={maxfill}")
    if over: print("   超高:", over)
    print("   独占:", sol)
print(f"\n合计 页={tot_pages} 配对={tot_pairs} 超高页={tot_over}")
print(f"页级残差(实测-估算): mean={st.mean(page_resid):.1f} sd={st.pstdev(page_resid):.1f} max={max(page_resid):.0f} min={min(page_resid):.0f}")
print(f"卡级残差: mean={st.mean(card_resid):.1f} sd={st.pstdev(card_resid):.1f} max={max(card_resid):.0f} min={min(card_resid):.0f}")
