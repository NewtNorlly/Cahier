# -*- coding: utf-8 -*-
"""对比每张幻灯片的构建估算高度与浏览器实测高度；按真实容量做最优两页配对模拟。"""
import json, re, os, glob

TOOLS = r"C:\Users\NewtN\下载\Cahier-main\_tools"

# 1) 读取实测
actual = {}   # deck -> {slide: outerH}
capacities = {}
for i in range(5):
    data = json.load(open(os.path.join(TOOLS, "shots", f"deck{i}.json"), encoding="utf-8-sig"))
    cap = data["chrome"]["capacity"]
    capacities[i] = cap
    d = {}
    for p in data["pages"]:
        for c in p["cards"]:
            d[c["slide"]] = c["outer"]
    actual[i] = d

# 2) 读取估算（每个 deck 每条目出现两次，取第一次）
est = {i: {} for i in range(5)}
deck_map = {"决策理论课件0": 0, "决策理论课件1": 1, "决策理论课件2": 2, "决策理论课件3": 3, "决策理论课件4": 4}
for line in open(os.path.join(TOOLS, "slidew-new.txt"), encoding="utf-8"):
    m = re.search(r"SLIDEW (决策理论课件\d)[^#]*#(\d+) est=(\d+)", line)
    if not m: continue
    di = deck_map[m.group(1)]
    n, e = int(m.group(2)), int(m.group(3))
    est[di].setdefault(n, e)

# 3) 对比
print("deck capacity(实测可排高度):", {k: round(v) for k, v in capacities.items()})
for di in range(5):
    pairs = [(n, est[di].get(n), actual[di].get(n)) for n in sorted(actual[di])]
    ratios = [a / e for _, e, a in pairs if e]
    over = [(n, e, a) for n, e, a in pairs if e and a > e + 12]
    print(f"\n课件{di}: 幻灯片 {len(pairs)} 张 | 实测/估算 比值 min {min(ratios):.2f} max {max(ratios):.2f} mean {sum(ratios)/len(ratios):.2f}")
    print("  估算偏低(>12px)的张数:", len(over))
    for n, e, a in over[:12]:
        print(f"    #{n}: est={e} actual={a} 差={a-e}")

# 4) 用真实高度做最优配对 DP（每页最多2张；封面 #1 独占）
def optimal_pages(heights, cap):
    # heights: dict slide->actual outer; 两张合页时额外卡间距已含在第一张 outer(marginBottom)
    n = max(heights)
    h = [heights.get(i) for i in range(1, n + 1)]
    INF = 10 ** 6
    dp = [INF] * (n + 1)
    take = [None] * (n + 1)
    dp[0] = 0
    for i in range(1, n + 1):
        if h[i - 1] is None:
            dp[i] = dp[i - 1]
            take[i] = ("skip",)
            continue
        if i == 1:
            dp[i] = 1; take[i] = ("solo",); continue
        # solo
        if h[i - 1] <= cap + 2 and dp[i - 1] + 1 < dp[i]:
            dp[i] = dp[i - 1] + 1; take[i] = ("solo",)
        # pair with previous (both non-empty)
        if i >= 2 and h[i - 2] is not None and h[i - 1] + h[i - 2] <= cap + 2 and dp[i - 2] + 1 < dp[i]:
            dp[i] = dp[i - 2] + 1; take[i] = ("pair",)
    # reconstruct
    layout = []
    i = n
    while i >= 1:
        t = take[i]
        if t[0] == "skip":
            i -= 1
        elif t[0] == "pair":
            layout.append((i - 1, i)); i -= 2
        else:
            layout.append((i,)); i -= 1
    layout.reverse()
    overpages = []
    for grp in layout:
        s = sum(h[k - 1] for k in grp if h[k - 1])
        if s > cap + 2: overpages.append((grp, s))
    return dp[n], layout, overpages

for di in range(5):
    cap = capacities[di]
    cnt, layout, overpages = optimal_pages(actual[di], cap)
    solo = sum(1 for g in layout if len(g) == 1)
    print(f"\n课件{di} 最优配对（实测容量 {round(cap)}）: 总页={cnt} 独占={solo} 配对={cnt-solo} 超高页={len(overpages)}")
    # 当前实际页面数
    cur = json.load(open(os.path.join(TOOLS, "shots", f"deck{di}.json"), encoding="utf-8-sig"))
    print("  当前构建总页 =", len(cur["pages"]))
