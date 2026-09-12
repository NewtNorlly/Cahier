---
title: "决策理论课件2·风险决策 Decision under Risk"
course: "决策理论与方法"
description: "石婧老师双语课件风险型决策：期望货币值 EMV 的计算与适用条件、决策树（节点与回溯计算）、建厂与打入美国市场多级决策案例、圣彼得堡悖论与边际效用递减、效用函数构建、期望效用在火灾保险中的应用，以及车险费率厘定案例与阿莱悖论。"
cover: "./covers/decision-theory-960.webp"
---

<!--folio:第1页-->

<!--col:L-->

<!--col:M-->
#### Decision theory and method
石婧
华中科技大学公共管理学院
Shi.jing@hust.edu.cn

<!--col:R-->

<!--/folio-->

<!--folio:第2页-->

<!--col:L-->

<!--col:M-->
#### Outline
¡ Decision under risk analysis
- Expected value theory
¡ Decision tree
- Expected utility theory
- The limitation of expected value/utility theory

<!--col:R-->

<!--/folio-->

<!--folio:第3页-->

<!--col:L-->

<!--col:M-->
#### Expected value theory
¡ Expectation-maximization approach（最大期望值）
Calculate the expected value of each alternative and choose the maximal one

<!--col:R-->

<!--/folio-->

<!--folio:第4页-->

<!--col:L-->

<!--col:M-->
#### Hilton's decision

| 方案 \ 机场选址处 | A | B |
| --- | --- | --- |
| 在 A 处购买 | 13 | −12 |
| 在 B 处购买 | −8 | 11 |
| AB 都买下 | 5 | −1 |
| AB 都不买 | 0 | 0 |
| 状态发生的概率 | 0.4 | 0.6 |

<!--col:R-->

<!--/folio-->

<!--folio:第5页-->

<!--col:L-->

<!--col:M-->
#### Expectation-maximization approach
¡ Expected monetary value（EMV）
- The EMV of alternative $i$ should be:

$$
\text{EMV}_i = \sum_{j=1}^{n} R_{ij}\, p_j, \qquad i = 1,2,\cdots,m
$$

- $R_{ij}$ represents the outcome of alter. $i$ under state of nature $j$
- $p_j$ represents the probability of state of nature $j$

<!--col:R-->

<!--/folio-->

<!--folio:第6页-->

<!--col:L-->

<!--col:M-->

| 方案 \ 机场选址处 | A | B | EMV |
| --- | --- | --- | --- |
| 在 A 处购买 | 13 | −12 | −2 |
| 在 B 处购买 | −8 | 11 | 3.4 |
| AB 都买下 | 5 | −1 | 1.4 |
| AB 都不买 | 0 | 0 | 0 |
| 状态发生的概率 | 0.4 | 0.6 | |

$$
\text{EMV}_A = \sum_{j} r_{ij}p_j = 13 \times 0.4 + (-12)\times 0.6 = -2
$$

<!--col:R-->

<!--/folio-->

<!--folio:第7页-->

<!--col:L-->

<!--col:M-->
#### Application scenario of EMV
¡ Not for an one time decision
- EMV is an average value that the decision maker can get assume the decision-making problem is repeated
- Flip a coin, when you get a head you get 1 million and otherwise you lose 1 million, the EMV of this game is 0

<!--col:R-->

<!--/folio-->

<!--folio:第8页-->

<!--col:L-->

<!--col:M-->
#### Practice
alternative A is very risky

| Alternative \ State of nature | 1 | 2 | EMV |
| --- | --- | --- | --- |
| A | 15000 | −5000 | 5000 |
| B | 5000 | 4000 | 4500 |
| Prob. | 0.5 | 0.5 | |

<!--col:R-->

<!--/folio-->

<!--folio:第9页-->

<!--col:L-->

<!--col:M-->
#### Decision tree
¡ A method for representation of the decision problem.
- decision node（□）
- status node（○）
- result node（△）
- The branches
  - leaving each round node represent the different states of nature
  - leaving each square node represent the different decision alternatives.

<!--col:R-->

<!--/folio-->

<!--folio:第10页-->

<!--col:L-->

<!--col:M-->
- At the end of each limb of a tree are the payoffs attained from the series of branches making up that limb.

要素标注：decision node（决策节点）、Alter. branch（方案分支）、status node（状态节点）、State of nature branch（自然状态分支）。

<!--col:R-->

<!--/folio-->

<!--folio:第11页-->

<!--col:L-->

<!--col:M-->
一棵通用决策树：Decision node（决策节点）引出 A1 / A2 / … / Am 方案分支，各方案分支末端是 Status node（状态节点），按概率 p 引出 S1,p1 / S2,p2 / … / Sn,pn 状态分支，末端为 Result node（结果节点），收益如 1000、4000、7000。

<!--col:R-->

<!--/folio-->

<!--folio:第12页-->

<!--col:L-->

<!--col:M-->
#### Hilton's decision

| 方案 \ 机场选址处 | A | B |
| --- | --- | --- |
| 在 A 处购买 | 13 | −12 |
| 在 B 处购买 | −8 | 11 |
| AB 都买下 | 5 | −1 |
| AB 都不买 | 0 | 0 |
| Probability | 0.4 | 0.6 |

<!--col:R-->

<!--/folio-->

<!--folio:第13页-->

<!--col:L-->

<!--col:M-->
Hilton 决策树回溯结果：四个方案 Not buying / A / B / A & B，各自状态分支 A 0.4、B 0.6，末端收益 13 / −12 / −8 / 11 / 5 / −1 / 0 / 0，各方案期望分别为 −2、3.4、1.4、0。

<!--col:R-->

<!--/folio-->

<!--folio:第14页-->

<!--col:L-->

<!--col:M-->
#### Multi-stage decision
¡ a decision contains two or more pending decision problems
- Contains multiple decision nodes

<!--col:R-->

<!--/folio-->

<!--folio:第15页-->

<!--col:L-->

<!--col:M-->
#### Factory decision（1）
¡ 为生产某产品，计划建厂。如果建大厂，需要投资 300 万元，如果建小厂，需要投资 160 万元，都是使用 10 年。每年的收益值如下表所示。
¡ 应选择哪个方案？

| 自然状态 | 概率 | 建大厂 | 建小厂 |
| --- | --- | --- | --- |
| 销路好 | 0.7 | 100 | 40 |
| 销路差 | 0.3 | −20 | 10 |

<!--col:R-->

<!--/folio-->

<!--folio:第16页-->

<!--col:L-->

<!--col:M-->

<!--col:R-->

<!--/folio-->

<!--folio:第17页-->

<!--col:L-->

<!--col:M-->
#### Factory decision（2）
¡ 若分前三年和后七年考虑：
- 前三年销路好的概率为 0.7
- 若前三年销路好，则后七年销路好的概率是 0.9
- 若前三年销路差，则后七年销路肯定差

| 自然状态 | 概率 | 建大厂 | 建小厂 |
| --- | --- | --- | --- |
| 销路好 | 0.7 | 100 | 40 |
| 销路差 | 0.3 | −20 | 10 |

<!--col:R-->

<!--/folio-->

<!--folio:第18页-->

<!--col:L-->

<!--col:M-->
建小厂、前三年销路好时后七年的期望收益计算：$(40 \times 0.9 + 10 \times 0.1) \times 7$；连同前三年及追加部分的整体回溯：$259 \times 0.7 + 70 \times 0.3 + 31 \times 3$。

<!--col:R-->

<!--/folio-->

<!--folio:第19页-->

<!--col:L-->

<!--col:M-->
#### Factory decision（3）
¡ 对建小厂方案进行改动
- 先建小厂，如销路好，三年后决策是否扩建，扩建需追加投资 140 万元，扩建后可使用七年，每年的收益与大厂相同
- 将该方案与建大厂的方案比较，优劣如何？

<!--col:R-->

<!--/folio-->

<!--folio:第20页-->

<!--col:L-->

<!--col:M-->
扩建分支回溯：追加投资 −140，收益 616，相关状态概率 0.1。

<!--col:R-->

<!--/folio-->

<!--folio:第21页-->

<!--col:L-->

<!--col:M-->
#### Practice: market decision
¡ 某国内公司考虑是否将一产品打入美国市场。
¡ 打入美国市场，可能有竞争产品介入，有竞争产品介入的概率为 0.7，没有竞争产品介入的概率为 0.3。
- 如果无竞争产品介入的话，该公司采取高、中、低三种价格策略的获利情况分别为：65 万元、45 万元、25 万元。
- 如果有竞争产品介入的话，该公司也可以采取高、中、低三种价格策略。

<!--col:R-->

<!--/folio-->

<!--folio:第22页-->

<!--col:L-->

<!--col:M-->
据情报可知：
- 如果本公司采取高价策略，竞争对手采取高、中、低三种策略的概率分别为 0.4、0.5、0.1。此时，本公司的获利情况为 15 万元、−5 万元和 −25 万元。
- 如果本公司采取中价策略，竞争对手采取高、中、低三种策略的概率分别为 0.1、0.6、0.3。此时，本公司的获利情况为 20 万元、5 万元和 10 万元。
- 如果本公司采取低价策略，竞争对手采取高、中、低三种策略的概率分别为 0.1、0.2、0.7。此时，本公司的获利情况为 15 万元、5 万元和 −5 万元。

<!--col:R-->

<!--/folio-->

<!--folio:第23页-->

<!--col:L-->

<!--col:M-->
打入美国市场决策树：不打入（收益 0）与打入两支；打入后分竞争对手跟进 0.7 / 不跟进 0.3。跟进时本公司高 / 中 / 低三策略，对手各以概率高 0.4 中 0.5 低 0.1、高 0.1 中 0.6 低 0.3、高 0.1 中 0.2 低 0.7 反应，末端收益分别为 15 / −5 / −25、20 / 5 / −10、15 / 5 / −5；不跟进时高 / 中 / 低收益为 65 / 45 / 25。

<!--col:R-->

<!--/folio-->

<!--folio:第24页-->

<!--col:L-->

<!--col:M-->
#### Expected utility theory
¡ 1. the limitation of EMV
¡ 2. concepts of utility
¡ 3. utility function
¡ 4. how to build utility function
¡ 5. application of EU in insurance

<!--col:R-->

<!--/folio-->

<!--folio:第25页-->

<!--col:L-->

<!--col:M-->
#### St. Petersburg game
¡ A game you need pay to play
¡ Rule: In each round, you can flip a coin until a tail come out. And you get the award
¡ Q: how much would you like to pay for ONE round?

报酬序列：$2^0 = 1$ 元、$2^1 = 2$ 元、$2^2 = 4$ 元……

<!--col:R-->

<!--/folio-->

<!--folio:第26页-->

<!--col:L-->

<!--col:M-->
#### What's a fair price?

$$
\text{EV} = \frac{1}{2}\times 1 + \frac{1}{4}\times 2 + \frac{1}{8}\times 4 + \frac{1}{16}\times 8 + \frac{1}{32}\times 16 + \cdots = \frac{1}{2}+\frac{1}{2}+\frac{1}{2}+\cdots = \infty
$$

¡ The expected winnings would be a fair price
- The chance of ending the game on the kth toss (i.e., the chance of getting $k-1$ heads in a row) is $1/2^k$
- If the game ends on the kth toss, the winnings would be $2^{k-1}$

So you should be willing to pay any price to play this game of chance

<!--col:R-->

<!--/folio-->

<!--folio:第27页-->

<!--col:L-->

<!--col:M-->
#### St. Petersburg paradox
¡ The paradox is that nobody's going to pay more than a few Yuan to play
¡ To see why, and for a good time, call http://www.mathematik.com/Petersburg/Petersburg.html click
¡ Explanations
- Small probability
  - Gains over $2^5 = 32$, Prob. = $1/2^6 = 0.0156$

<!--col:R-->

<!--/folio-->

<!--folio:第28页-->

<!--col:L-->

<!--col:M-->
#### Explanations (cont.)
¡ Bankrolls are actually finite, no one can pay you the large gain
- can't buy what's not sold
- $2^{29} = 536,870,912$
- When n can not be larger than 29, the EV you can get is only $\frac{1}{2}\times 29$

$$
2^0\times\frac{1}{2} + 2^1\times\frac{1}{4} + 2^2\times\frac{1}{8} + \cdots + 2^n\times\frac{1}{2^{n+1}} + \cdots = \infty
$$

<!--col:R-->

<!--/folio-->

<!--folio:第29页-->

<!--col:L-->

<!--col:M-->
#### Daniel Bernoulli's explanation
¡ Law of diminishing marginal utility
- Compare \$10 for a child versus Bill Gates
¡ Use utilities in decision matrix instead of object payoffs

（主观价值 Subjective value 与客观价值 Objective value 的关系曲线：边际效用递减）

<!--col:R-->

<!--/folio-->

<!--folio:第30页-->

<!--col:L-->

<!--col:M-->
#### Definition of utility
¡ Utility refers to the degree of satisfaction
- Reflect the attitude of decision makers toward profit, loss and risk
- Have both objectivity and subjectivity

<!--col:R-->

<!--/folio-->

<!--folio:第31页-->

<!--col:L-->

<!--col:M-->
#### Objectivity of utility
¡ Based on the objective status of decision maker
- The same thing for different decision-makers has different utility value because of the different status
¡ 一个面包对某饥肠辘辘者来说有救人一命的效用，而对于一位刚刚饱餐离座的人来说可能是负担。
¡ 同样 1000 元人民币，对于一贫如洗者与某腰缠万贯者的效用值也具有显著差别。

<!--col:R-->

<!--/folio-->

<!--folio:第32页-->

<!--col:L-->

<!--col:M-->
#### Subjectivity of utility
¡ Utility value is the spiritual value of decision makers, depending on the values and attitudes to risk.
- Gambling
- Stock market

<!--col:R-->

<!--/folio-->

<!--folio:第33页-->

<!--col:L-->

<!--col:M-->
¡ 假设你初到深圳闯荡，赤手空拳，身无分文，刚到深圳就中了个奖，要求你必须二选一
- （A）确定的获得 1000 元人民币；
- （B）抛硬币，抛到正面朝上，你能得到 2000 元。抛到反面朝上，什么也得不到。
¡ 你会选择哪一项？

<!--col:R-->

<!--/folio-->

<!--folio:第34页-->

<!--col:L-->

<!--col:M-->
#### Classification
¡ Risk neutral
¡ Risk aversion
¡ Risk prefer

效用曲线以货币金额 X 为横轴、U(x) 为纵轴：风险厌恶 a（凹）、风险中性 b（直线）、风险偏好 c（凸）。

<!--col:R-->

<!--/folio-->

<!--folio:第35页-->

<!--col:L-->

<!--col:M-->
#### Utility function
（1）效用是决策者从自身的立场出发，对损益值的一种度量。效用 = $U$（收益值）。
（2）如果收益值 $A \ge B$，则 $U(A) \ge U(B)$。
（3）如果两个事物（损益值或事态体）对于决策者来说是可以分辨优劣的，那么就认为较优的那个事物的效用高于另一个事物的效用。效用有传递性：$U(A) > U(B)$，$U(B) > U(C)$ 则 $U(A) > U(C)$。
（4）如果决策者不能分辨两个事物的优劣，则称两事物等效用。如果 $U(A) = U(B)$，$U(B) = U(C)$，则 $U(A) = U(C)$。

<!--col:R-->

<!--/folio-->

<!--folio:第36页-->

<!--col:L-->

<!--col:M-->
#### How to build a utility function
¡ 函数曲线拟合法
- 风险厌恶型：$U_R(x) = \dfrac{1 - e^{-x}}{1 - e^{-1}}$（其中 $e \approx 2.71828$）
- 对数型：$u(x) = \ln(a + bx) + c$

<!--col:R-->

<!--/folio-->

<!--folio:第37页-->

<!--col:L-->

<!--col:M-->
#### Application of EU in insurance
¡ 某企业想为厂房（价值为 A）申报火灾保险，假设发生火灾的概率为 $P_f$
- 如果投保，要支付保险金 i 元
  - 明年如果发生火灾的话，所有损失都将全部得到赔偿；
- 如果不投保的话，一旦发生火灾，则损失 B 元（$B \le A$）
¡ 如果按照 EMV 准则，发生火灾的概率 $P_f$ 为多少时，企业才会投保？

<!--col:R-->

<!--/folio-->

<!--folio:第38页-->

<!--col:L-->

<!--col:M-->
保险决策树：分投保 / 不投保两支，各再分发生火灾 $P_f$ / 不发生火灾 $1 - P_f$。投保时两端收益均为 $A - i$；不投保时发生火灾收益 $A - B$、不发生火灾收益 $A$。按 EMV 比较：投保期望为 $A - i$，不投保期望为 $(A - B)P_f + A(1 - P_f)$。

<!--col:R-->

<!--/folio-->

<!--folio:第39页-->

<!--col:L-->

<!--col:M-->
¡ According to EV：

$$
A - i \ge (A - i)P_f + (A - B)(1 - P_f) \;\Longrightarrow\; P_f \ge \frac{i}{B}
$$

- 根据保额 5000 元的财产，保费为 5 元计算，$P_f$ 应该大于 1/1000，才值得去保险。
- 但据有关的估计，实际发生火灾的概率为 1/5000，远小于火灾发生概率的阈值，但大部分人会选择买这个火险，为什么？

<!--col:R-->

<!--/folio-->

<!--folio:第40页-->

<!--col:L-->

<!--col:M-->
¡ According to EU：

$$
u(A-i)(1-P_f) + u(A-i)P_f \ge u(A-B)(1-P_f) + u(A)P_f
$$

整理得：

$$
\frac{u(A-i) - u(A-B)}{u(A) - u(A-B)} \ge P_f
$$

<!--col:R-->

<!--/folio-->

<!--folio:第41页-->

<!--col:L-->

<!--col:M-->
#### Insurance Co.'s profits
¡ 假设飞机失事的概率是 1/250000，事故后保险公司赔付 200 万元。问如何设定保险费，使得保险公司正好收支平衡？
¡ 中国人寿保险公司投保额为 200 万元的保险费为 40 元。问如果一个人买了该保险，保险公司的收益为多少？

<!--col:R-->

<!--/folio-->

<!--folio:第42页-->

<!--col:L-->

<!--col:M-->
#### 01 · 问题导入
同样的车损险，保费为什么差一倍？

- ≈ 6000 元/年：投保人甲 · 22 岁新手司机；市区通勤，日均行驶约 40 公里；上一个保单年度出险 2 次；豪华进口车，零整比高、维修贵。
- ≈ 3000 元/年：投保人乙 · 42 岁，15 年驾龄；郊区用车，年里程不足 1 万公里；连续三年无出险记录；普通家用车，维修成本低。

这个差异不是随意定的——四步拆解：① 纯保费公式（频率 × 强度）；② 风险因子（谁在推高成本）；③ 计算演示（系数如何相乘）；④ 风险决策（综改与逆向选择）。

<!--col:R-->

<!--/folio-->

<!--folio:第43页-->

<!--col:L-->

<!--col:M-->
#### 02 · 核心概念
纯保费怎么算：出险频率 × 案均赔款

纯保费 = 出险频率 × 案均赔款
- 出险频率——一辆车一年内发生索赔的期望次数。示意：8%，即每百车一年发生 8 次索赔。
- 案均赔款——每一次索赔的平均赔付金额。示意：7500 元。
- 代入：$8\% \times 7500$ 元 = 600 元/车年，即该车组的纯保费。

为什么用 GLM？单因素分组解决不了因子之间的相关性——年轻司机往往同时住在市区、出险记录也更多，风险会被重复计算。广义线性模型（GLM）把所有因子放进同一个模型，估计每个因子水平的相对系数；在对数链接下，把各系数相乘，就得到某个细分组的纯保费。

纯保费只覆盖"赔出去的钱"，实际收取的毛保费还要加上费用、税金与利润附加。但厘定费率的第一步，永远是先把纯保费算准。（本页数据为教学示意）

<!--col:R-->

<!--/folio-->

<!--folio:第44页-->

<!--col:L-->

<!--col:M-->
#### 03 · 方法演示
四类风险因子，各自推高哪一块成本

| 风险因子 | 高风险组 | 低风险组 | 差异主要来自 |
| --- | --- | --- | --- |
| 年龄与驾龄 | 25 岁以下新手 | 35–50 岁老司机 | 出险频率相差 1–2 倍 |
| 行驶区域 | 大城市拥堵区 | 郊区、农村 | 频率与案均赔款均有差异 |
| 历史出险记录 | 上年出险 2 次 | 连续 3 年无出险 | NCD 无赔款优待系数 |
| 车型 | 豪华进口车 | 普通家用车 | 零整比决定维修成本 |

注意差异的来源不同：年龄主要影响出险频率，车型主要影响案均赔款。因此精算师通常对频率和强度分别建模，再相乘合成纯保费，而不是混在一起估一个总数。分组与差异方向为教学示意，量级依据行业经验。

<!--col:R-->

<!--/folio-->

<!--folio:第45页-->

<!--col:L-->

<!--col:M-->
#### 04 · 数值演示（示意数据）
从基准纯保费出发，系数如何一步步相乘。

高风险 · 甲：600 元基准纯保费 × 1.6（年轻新手）× 1.3（市区通勤）× 1.5（上年出险 2 次）× 1.4（车型零整比高）= 2621 元（甲的纯保费）。

低风险 · 乙：600 元基准纯保费 × 0.8（中年老司机）× 0.9（郊区用车）× 0.7（三年无出险）× 0.9（普通家用车）= 272 元（乙的纯保费）。

毛保费 = 纯保费 + 费用与利润附加（元/年，示意）。两组各加约 2500 元的费用与利润附加后，毛保费约为甲 5100 元、乙 2800 元。纯保费相差 9.6 倍，毛保费只差约 1.8 倍：固定费用摊薄了差距，监管对自主定价系数设的上下限也会进一步压缩极端差异。

<!--col:R-->

<!--/folio-->

<!--folio:第46页-->

<!--col:L-->

<!--col:M-->
#### 05 · 监管背景与风险决策
综改放权之后，定价精度成了核心竞争力。2020 年车险综合改革后，商业车险自主定价系数的浮动范围逐步放宽，2023 年起扩大至 0.5–1.5。同样的风险，不同公司可以给出明显不同的报价。

放权带来真实的风险决策：定得准，好客户留得住、高风险客户被识别出来；定不准，就会滑入逆向选择循环——这不仅是市场份额问题，还会演变为承保风险整体恶化的偿付能力问题。

逆向选择循环：模型落后的代价——① 定价模型落后，好客户识别不准；② 低风险客户被对手低价吸走；③ 留存客户风险偏高，赔付率恶化；④ 被迫整体提价，更多好客户流失（恶性循环）。

风险决策点：定价模型不只是技术资产——它决定了公司最终承保的是一个什么样的风险池。系数浮动范围依据车险综合改革公开文件及 2023 年监管部门通知，为公开信息。

<!--col:R-->

<!--/folio-->

<!--folio:第47页-->

<!--col:L-->

<!--col:M-->
#### 06 · 小结
三个判断：

01 纯保费 = 频率 × 强度。任何费率差异，都能拆回这两个量去追问来源——是更常出事，还是一出事就赔得多。
02 系数是估出来的，不是定的。GLM 用历史理赔数据给每个因子水平定价——数据质量和模型水平，最终决定费率质量。
03 定价即竞争。综改放权后，定价精度直接决定风险池质量——逆向选择会惩罚模型落后的公司。

保险精算风险决策案例 · 车险费率厘定 · 数据均为教学示意。

<!--col:R-->

<!--/folio-->

<!--folio:第48页-->

<!--col:L-->

<!--col:M-->
#### Allais Paradox
¡ France Economist, 1988 Nobel Laureate

方案 A：100% 肯定能赢得 100 万元。
方案 B：10% 的概率赢得 150 万元；89% 的概率赢得 100 万元；1% 的概率没有盈亏。

$$
u(100) > 0.1\,u(150) + 0.89\,u(100) + 0.01\,u(0)
$$

方案 A'：11% 肯定能赢得 100 万元；89% 概率没有盈亏。
方案 B'：10% 的概率赢得 150 万元；90% 的概率没有盈亏。

$$
0.1\,u(150) + 0.9\,u(0) > 0.11\,u(100) + 0.89\,u(0)
$$

化简得：

$$
0.11\,u(100) > 0.1\,u(150) + 0.01\,u(0)
$$

与第一组选择矛盾：

$$
0.11\,u(100) < 0.1\,u(150) + 0.01\,u(0)
$$

<!--col:R-->

<!--/folio-->
