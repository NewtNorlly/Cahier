# -*- coding: utf-8 -*-
"""用实测高度做最优 DP（容量972，封面独占），与当前构建结果对比，列出仍可避免的独占。"""
import json, os
TOOLS = r"C:\Users\NewtN\下载\Cahier-main\_tools"
tot_opt = tot_cur = 0
for di in range(5):
    data = json.load(open(os.path.join(TOOLS, "shots", f"deck{di}.json"), encoding="utf-8-sig"))
    cap = data["chrome"]["capacity"]
    h = {}
    cur_pages = []
    for p in data["pages"]:
        cur_pages.append(p["slides"])
        for c in p["cards"]:
            h[c["slide"]] = c["outer"]
    # 卡片 outer 已含非末卡 18 margin；配对页实际总高 = 两卡 outer 直接相加（首卡含18）
    n = max(h)
    cover = 1 if 1 in h else 0
    rest = [i for i in range(1, n + 1) if i in h and i != 1]
    INF = 10**9
    dp = [0] + [INF] * len(rest)
    take = [1] * (len(rest) + 1)
    for k in range(1, len(rest) + 1):
        dp[k] = dp[k - 1] + 1; take[k] = 1
        if k >= 2 and h[rest[k - 2]] + h[rest[k - 1]] <= cap + 2 and dp[k - 2] + 1 < dp[k]:
            dp[k] = dp[k - 2] + 1; take[k] = 2
    groups = []
    k = len(rest)
    while k >= 1:
        if take[k] == 2: groups.append((rest[k - 2], rest[k - 1])); k -= 2
        else: groups.append((rest[k - 1],)); k -= 1
    groups.reverse()
    opt = cover + len(groups)
    cur = len(data["pages"])
    tot_opt += opt; tot_cur += cur
    cur_set = {tuple(sorted(s)) for s in cur_pages}
    opt_set = {tuple(sorted(g)) for g in groups}
    if cover: opt_set.add((1,))
    gain = [g for g in groups if len(g) == 2 and tuple(sorted(g)) not in cur_set]
    print(f"课件{di}: 当前 {cur} 页 / 实测最优 {opt} 页；当前未实现的可行配对: {gain}")
print(f"合计 当前 {tot_cur} / 最优 {tot_opt}")
