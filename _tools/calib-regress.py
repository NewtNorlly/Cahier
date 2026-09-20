# -*- coding: utf-8 -*-
"""每张幻灯片：实测外高 vs 构建估算，做线性回归与残差分析，给出校准参数。"""
import json, re, os
import statistics as st

TOOLS = r"C:\Users\NewtN\下载\Cahier-main\_tools"
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

xs, ys = [], []
for di in range(5):
    for n in sorted(actual[di]):
        e = est[di].get(n)
        if e:
            xs.append(e); ys.append(actual[di][n])

# 最小二乘 y = a*x + b
mx = sum(xs)/len(xs); my = sum(ys)/len(ys)
a = sum((x-mx)*(y-my) for x,y in zip(xs,ys)) / sum((x-mx)**2 for x in xs)
b = my - a*mx
resid = [y - (a*x+b) for x,y in zip(xs,ys)]
print(f"样本={len(xs)} 回归: actual = {a:.4f}*est + {b:.1f}")
print(f"残差 mean={st.mean(resid):.1f} sd={st.pstdev(resid):.1f} max={max(resid):.1f} p95={sorted(resid)[int(0.95*len(resid))]:.1f}")
# 直接比例（过原点）
a0 = sum(x*y for x,y in zip(xs,ys))/sum(x*x for x in xs)
resid0 = [y-a0*x for x,y in zip(xs,ys)]
print(f"过原点: actual = {a0:.4f}*est ; 残差 sd={st.pstdev(resid0):.1f} max={max(resid0):.1f} p95={sorted(resid0)[int(0.95*len(resid0))]:.1f}")

# 用回归预测（+2σ 保守）做 DP，再用实测复核
def predict(e): return a*e+b
SAFETY = 2*st.pstdev(resid)
def dp(weights, T):
    n=len(weights); INF=10**9
    dp=[INF]*(n+1); take=[None]*(n+1); dp[0]=0
    for i in range(1,n+1):
        if weights[i-1] is None:
            dp[i]=dp[i-1]; take[i]=("skip",); continue
        if i==1:
            dp[i]=1; take[i]=("solo",); continue
        wi=predict(weights[i-1])+SAFETY
        if wi<=T+2 and dp[i-1]+1<dp[i]: dp[i]=dp[i-1]+1; take[i]=("solo",)
        if i>=2 and weights[i-2] is not None:
            # 两张：各自预测，加一次卡间距 18
            wp=predict(weights[i-2])+predict(weights[i-1])+18+2*SAFETY
            if wp<=T+2 and dp[i-2]+1<dp[i]: dp[i]=dp[i-2]+1; take[i]=("pair",)
        if take[i] is None: dp[i]=dp[i-1]+1; take[i]=("solo",)
    groups=[]; i=n
    while i>=1:
        t=take[i]
        if t[0]=="skip": i-=1
        elif t[0]=="pair": groups.append((i-1,i)); i-=2
        else: groups.append((i,)); i-=1
    groups.reverse(); return groups

CAP=972
tot=0; over=0; worst=0
for di in range(5):
    n=max(actual[di])
    we=[est[di].get(i) for i in range(1,n+1)]
    wa=[actual[di].get(i) for i in range(1,n+1)]
    g=dp(we,CAP)
    o=0
    for grp in g:
        s=sum(wa[x-1] for x in grp if wa[x-1])
        worst=max(worst,s)
        if s>CAP+2: o+=1
    over+=o; tot+=len(g)
    print(f"课件{di}: 页={len(g)} 超高={o}")
print(f"总页={tot} 超高={over} 实测最高={worst} (当前122页, 实测最优108页)")
