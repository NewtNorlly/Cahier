# -*- coding: utf-8 -*-
"""用估算值模拟不同安全系数/阈值下的 DP 配对，再用实测高度复核是否超高，选零超高且页数最少的参数。"""
import json, re, os

TOOLS = r"C:\Users\NewtN\下载\Cahier-main\_tools"
actual, est = {}, {}
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

def dp(weights_est, k, T):
    n = len(weights_est)
    INF = 10**9
    dp = [INF]*(n+1); take=[None]*(n+1); dp[0]=0
    for i in range(1, n+1):
        if weights_est[i-1] is None:
            dp[i]=dp[i-1]; take[i]=("skip",); continue
        if i == 1:
            dp[i]=1; take[i]=("solo",); continue
        wi = weights_est[i-1]*k
        if wi <= T+2 and dp[i-1]+1 < dp[i]:
            dp[i]=dp[i-1]+1; take[i]=("solo",)
        if i >= 2 and weights_est[i-2] is not None:
            wp = (weights_est[i-2]+weights_est[i-1])*k
            if wp <= T+2 and dp[i-2]+1 < dp[i]:
                dp[i]=dp[i-2]+1; take[i]=("pair",)
        if take[i] is None:  # 超重单张：强制独占
            dp[i]=dp[i-1]+1; take[i]=("solo",)
    groups=[]; i=n
    while i>=1:
        t=take[i]
        if t[0]=="skip": i-=1
        elif t[0]=="pair": groups.append((i-1,i)); i-=2
        else: groups.append((i,)); i-=1
    groups.reverse()
    return groups

CAP = 972
for k in (1.06, 1.08, 1.10, 1.12, 1.14):
    for T in (CAP, CAP-12, CAP-24):
        total_pages=0; total_over=0; worst=0; detail=[]
        for di in range(5):
            n = max(actual[di])
            we = [est[di].get(i) for i in range(1, n+1)]
            wa = [actual[di].get(i) for i in range(1, n+1)]
            groups = dp(we, k, T)
            over=0
            for g in groups:
                s = sum(wa[x-1] for x in g if wa[x-1])
                worst = max(worst, s)
                if s > CAP+2: over+=1
            total_pages += len(groups); total_over += over
            detail.append(len(groups))
        print(f"k={k} T={T}: 总页={total_pages} 超高页={total_over} 各册={detail} 实测最高页={worst}")
