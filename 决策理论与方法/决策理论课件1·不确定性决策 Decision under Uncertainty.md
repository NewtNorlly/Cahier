---
title: "决策理论课件1·不确定性决策 Decision under Uncertainty"
course: "决策理论与方法"
description: "石婧老师双语课件不确定性决策：确定/不确定/风险三类决策的界定、概率论与决策理论简史（Bernoulli、Von Neumann & Morgenstern、Savage、Simon、Allais、Kahneman、Thaler），以希尔顿机场选址为例讲解 Maximax、Maximin、Minimax Regret、Hurwicz α 系数与拉普拉斯等可能五条古典准则，以及数字时代的新特征与课堂练习。"
cover: "./covers/decision-theory-960.webp"
---

<!--folio:第1页-->

<!--col:L-->

<!--col:M-->
#### Decision Theory and method
石婧
华中科技大学公共管理学院
Shi.jing@hust.edu.cn

<!--col:R-->

<!--/folio-->

<!--folio:第2页-->

<!--col:L-->

<!--col:M-->
#### 结构化决策问题的类别
¡ Decisions under certainty
- are decisions made when one knows what the result of each act would be.
¡ Decisions under uncertainty
- are decisions made when one cannot assign a subjective probability to the possible results of any act.
¡ Decisions under risk
- are decisions made when one does not know the outcome of each act, yet can assign a subjective probability to the possible results of each act.

<!--col:R-->

<!--/folio-->

<!--folio:第3页-->

<!--col:L-->

<!--col:M-->
#### Important events and people
¡ Relevant to game
- In the 16-17 century, French palace has a gambling consultant who is the pioneer of probability theory and game theory
¡ Core concepts
- In 1738, Daniel Bernoulli proposed the concept of the utility and expected utility, used to explain gambling and insurance expectations

<!--col:R-->

<!--/folio-->

<!--folio:第4页-->

<!--col:L-->

<!--col:M-->
¡ Subject establishment
- After the 1920s, Decision theory separated from game theory
- 1944, Von Neumann（冯·诺依曼） and Oskar Morgenstern（摩根斯坦） proposed von Neumann-Morgenstern utility（效用值运算定理）
- 1950, L. J. Savage（萨维奇） established Bayesian decision theory

<!--col:R-->

<!--/folio-->

<!--folio:第5页-->

<!--col:L-->

<!--col:M-->
¡ Behavior decision theory——Nobel Prizes in Economic Sciences
- 1978, Herbert Simon
  - Propose items "Bounded rationality"（有限理性） and "satisficing"（满意策略）
- 1988, Maurice Allais
  - Allais Paradox: show defect of expected utility theory
- 2002, Daniel Kahneman
  - for having integrated insights from psychological research into economic science, especially concerning human judgment and decision-making under uncertainty

<!--col:R-->

<!--/folio-->

<!--folio:第6页-->

<!--col:L-->

<!--col:M-->
2017, Richard Thaler

主流经济学假设我们都有：
- 爱因斯坦一样的智商
- 计算机一样的记忆力
- 圣雄甘地一样的意志力

到最后，这种假设发展成了经济学家的信仰。

<!--col:R-->

<!--/folio-->

<!--folio:第7页-->

<!--col:L-->

<!--col:M-->

<!--col:R-->

<!--/folio-->

<!--folio:第8页-->

<!--col:L-->

<!--col:M-->
Decisions under certainty

<!--col:R-->

<!--/folio-->

<!--folio:第9页-->

<!--col:L-->

<!--col:M-->
#### Decision under uncertainty
¡ 演唱会时间：2013 年 03 月 30 日
¡ 演唱会场馆：武汉光谷体育馆
¡ 演唱会票价：280\380\480\680\880\1080 元

<!--col:R-->

<!--/folio-->

<!--folio:第10页-->

<!--col:L-->

<!--col:M-->
#### Decision under uncertainty
Ø Maximax（乐观）
Ø Maximin（悲观）
Ø Minimax regret（后悔值）
Ø Optimism-pessimism index（乐观系数）
Ø Insufficient reason（等可能）

<!--col:R-->

<!--/folio-->

<!--folio:第11页-->

<!--col:L-->

<!--col:M-->
#### A decision problem
¡ The city planned to find a place to build a new airport
¡ Possible addresses are A / B
¡ Hilton wants to expand and build a new hotel Nearby.

<!--col:R-->

<!--/folio-->

<!--folio:第12页-->

<!--col:L-->

<!--col:M-->
#### Obtaining necessary information
¡ Set up your target and evaluation criteria
- Maximize profits
¡ Statue of nature
- Airport at A or airport at B
¡ Find possible alternatives
- Hilton chooses a location at A；B；A and B；none
Construct a decision matrices!!!

<!--col:R-->

<!--/folio-->

<!--folio:第13页-->

<!--col:L-->

<!--col:M-->
#### Matrice
决策矩阵（方案 × 自然状态，收益 $U_{ij}$）：

| 方案 \ 自然状态 | S1 | S2 | … | Sn |
| --- | --- | --- | --- | --- |
| A1 | U11 | U12 | … | U1n |
| A2 | U21 | U22 | … | U2n |
| … | … | … | … | … |
| Am | Um1 | Um2 | … | Umn |

<!--col:R-->

<!--/folio-->

<!--folio:第14页-->

<!--col:L-->

<!--col:M-->
#### Step 1. collect info.

| | A | B |
| --- | --- | --- |
| The price of the land | 18 | 12 |
| the profit if the airport is built in this place | 31 | 23 |
| The price when you sell the land if the airport is not located here | 6 | 4 |

<!--col:R-->

<!--/folio-->

<!--folio:第15页-->

<!--col:L-->

<!--col:M-->
#### Step 2. calculate the value

| 方案 \ 机场选址处 | A | B |
| --- | --- | --- |
| 在 A 处购买 | 13 | −12 |
| 在 B 处购买 | −8 | 11 |
| AB 都买下 | 5 | −1 |
| AB 都不买 | 0 | 0 |

<!--col:R-->

<!--/folio-->

<!--folio:第16页-->

<!--col:L-->

<!--col:M-->
#### Maximax
¡ Choose the alternative which has the highest best possible outcome among all alternatives

| 方案 \ 机场选址处 | A | B | 各行最大值 |
| --- | --- | --- | --- |
| 在 A 处购买 | 13 | −12 | 13 |
| 在 B 处购买 | −8 | 11 | 11 |
| AB 都买下 | 5 | −1 | 5 |
| AB 都不买 | 0 | 0 | 0 |

<!--col:R-->

<!--/folio-->

<!--folio:第17页-->

<!--col:L-->

<!--col:M-->
¡ It is in general "difficult to justify the maximax principle as rational principle of decision, reflecting, as it does, wishful thinking". (Rapoport 1989, p. 57)

<!--col:R-->

<!--/folio-->

<!--folio:第18页-->

<!--col:L-->

<!--col:M-->
¡ Drawback

| Alternative \ State of nature | 1 | 2 |
| --- | --- | --- |
| A | 30 | −10000 |
| B | 29 | 29 |

<!--col:R-->

<!--/folio-->

<!--folio:第19页-->

<!--col:L-->

<!--col:M-->
#### Maximin
¡ Choose the alternative that has the maximal security level. In other words, maximize the minimal outcome.
- The maximin principle was first proposed by von Neumann as a strategy against an intelligent opponent. Wald (1950) extended its use to games against nature.

<!--col:R-->

<!--/folio-->

<!--folio:第20页-->

<!--col:L-->

<!--col:M-->

| 方案 \ 机场选址处 | A | B | 各行最小值 |
| --- | --- | --- | --- |
| 在 A 处购买 | 13 | −12 | −12 |
| 在 B 处购买 | −8 | 11 | −8 |
| AB 都买下 | 5 | −1 | −1 |
| AB 都不买 | 0 | 0 | 0 |

<!--col:R-->

<!--/folio-->

<!--folio:第21页-->

<!--col:L-->

<!--col:M-->
¡ Drawback

| 方案 \ 自然状态 | 1 | 2 |
| --- | --- | --- |
| A | 10000 | 28 |
| B | 29 | 29 |

<!--col:R-->

<!--/folio-->

<!--folio:第22页-->

<!--col:L-->

<!--col:M-->
#### Minimax regret aka. 萨维奇准则
¡ Choose the alternative with the lowest maximal regret
- to minimize maximal regret
- introduced by Savage 萨维奇 (1951, p. 59).
¡ Build a regret matrix from original matrix, and choose the alternative with the minimal "maximal regret".

<!--col:R-->

<!--/folio-->

<!--folio:第23页-->

<!--col:L-->

<!--col:M-->
original matrix

| 方案 \ 机场选址处 | A | B |
| --- | --- | --- |
| 在 A 处购买 | 13 | −12 |
| 在 B 处购买 | −8 | 11 |
| AB 都买下 | 5 | −1 |
| AB 都不买 | 0 | 0 |

<!--col:R-->

<!--/folio-->

<!--folio:第24页-->

<!--col:L-->

<!--col:M-->
regret matrix

| 方案 \ 机场选址处 | A | B | 各行最大后悔 |
| --- | --- | --- | --- |
| 在 A 处购买 | 0 | 23 | 23 |
| 在 B 处购买 | 21 | 0 | 21 |
| AB 都买下 | 8 | 12 | 12 |
| AB 都不买 | 13 | 11 | 13 |

<!--col:R-->

<!--/folio-->

<!--folio:第25页-->

<!--col:L-->

<!--col:M-->
#### Optimism-pessimism index aka. 赫维茨准则
¡ The decision-maker is required to choose an index $\alpha$ between 0 and 1, that reflects his degree of optimism or pessimism.
- The α-index of A is calculated according to the formula:

$$
\alpha \times \min(A) + (1-\alpha)\times \max(A)
$$

- A trade-off way between pessimism and optimism
- It is often called the Hurwicz α index, since it was proposed in a paper by Hurwicz（赫维茨） in 1951

<!--col:R-->

<!--/folio-->

<!--folio:第26页-->

<!--col:L-->

<!--col:M-->
$\alpha = 0.5$，各方案折中值：

| 方案 \ 机场选址处 | A | B | 折中值 |
| --- | --- | --- | --- |
| 在 A 处购买 | 13 | −12 | 0.5 |
| 在 B 处购买 | −8 | 11 | 1.5 |
| AB 都买下 | 5 | −1 | 2 |
| AB 都不买 | 0 | 0 | 0 |

<!--col:R-->

<!--/folio-->

<!--folio:第27页-->

<!--col:L-->

<!--col:M-->
#### Insufficient reason
¡ Transform the decision problem from uncertainty to risk
- This principle states that if there is no reason to believe that one event is more likely to occur than another, then the events should be assigned equal probabilities.
- First formulated by Jacques Bernoulli (1654–1705).

<!--col:R-->

<!--/folio-->

<!--folio:第28页-->

<!--col:L-->

<!--col:M-->
#### 四条古典准则，四种性格

| 准则 | 核心逻辑 | 一句话口诀 |
| --- | --- | --- |
| 乐观法（大中取大 Maximax） | 比较各方案的最好结果，从中再选最优 | 只盯着最好的可能 |
| 悲观法（小中取大 Maximin） | 比较各方案的最差结果，从中再选最优 | 先问最坏能有多坏 |
| 折中法（赫维茨准则） | 用乐观系数 α 加权最好与最差结果 | 既不全信，也不全疑 |
| 最小后悔值（萨维奇准则） | 比较各方案的"事后后悔值"，选最大后悔最小的 | 选错了也最不难过的 |

折中法的计算式：

$$
\text{行动价值} = \alpha \times (\text{最好结果的收益}) + (1-\alpha)\times(\text{最差结果的损失})
$$

另有等可能法（拉普拉斯准则）：假设各状态概率相等。信息过载时代你无法对所有信息一视同仁，它最先失效——后文详述。

<!--col:R-->

<!--/folio-->

<!--folio:第29页-->

<!--col:L-->

<!--col:M-->
#### 数字时代人人都是不确定型决策者
数字时代不确定型决策的新特征：

- 信息过载：每天面对的信息量远超处理能力，无法逐一核实，必须"赌"着筛选。
- 真伪难辨：大量谣言，阴谋论，AIGC 的视频图片。
- 选项爆炸：商品、路线可选项空前丰富，而评价信号本身还可能被操纵。

<!--col:R-->

<!--/folio-->

<!--folio:第30页-->

<!--col:L-->

<!--col:M-->
#### 场景一 · 信息获取与真相判断
多个版本摆在你面前，"真相"是哪种状态？

情境设定：一条突发新闻，微博、抖音、朋友圈出现多个相互矛盾的版本。

| 决策方法 | 用户行为表现 | 例子 |
| --- | --- | --- |
| 乐观法 | 直接采信最符合自己预期的版本 | 官方通报太保守了，我相信那个'内部人士'的爆料 |
| 悲观法 | 默认所有未经核实的信息都不可信 | 让子弹飞一会儿，官方没确认前什么都不信 |
| 折中法 | 部分采信，给每个版本标注可信度等级 | 这个有视频佐证，可信度 60%；那个只是聊天记录，可信度 20% |
| 最小后悔值 | 选择"即便错了代价也最小"的信息策略 | 我不转发，只围观。万一反转了，至少我没参与传谣 |

算法茧房让乐观法更危险——你看到的"最好情况"，往往是算法推给你的同温层回声。

信息过载让等可能法失效——你无法真的对所有信息一视同仁地处理。

情绪极化让折中法最难执行——平台的设计就是让你选边站，而非理性权衡。

<!--col:R-->

<!--/folio-->

<!--folio:第31页-->

<!--col:L-->

<!--col:M-->
#### 场景二 · 购物选择
付款之前，商品的真实质量永远未知。

情境设定：直播间下单一款网红产品，评价两极分化，信号还可能被刷单操纵。

| 决策方法 | 用户行为表现 | 例子 |
| --- | --- | --- |
| 乐观法 | 只看最佳结果，冲动下单 | 万一是真好用呢？首发限量，错过就没了 |
| 悲观法 | 锁定最差结果可承受才行动 | 只买销量最高的经典款，只走有运费险和七天无理由的渠道 |
| 折中法 | 给好评率、价格、测评加权打分 | 好评率 92%，三个测评博主两个推荐，这个值得赌 |
| 最小后悔值 | 选择"买错了也不心疼"的方案 | 先买小规格试用装，踩雷损失最小 |

支付矩阵被平台改写——运费险、先用后付把最差结果的损失压到接近零，悲观法的门槛被人为降低，反而刺激下单。

乐观法被话术工业化——"全网最低价""最后 100 单"，在刻意屏蔽你对悲观状态的感知。

后悔值被社交放大——一次冲动消费可能变成朋友圈里的"翻车现场"，最小后悔准则的权重在上升。

<!--col:R-->

<!--/folio-->

<!--folio:第32页-->

<!--col:L-->

<!--col:M-->
#### 场景三 · 求职与职业发展
斜杠模式，本质是折中法的普及化。

情境设定：主业稳定，但看到自媒体、电商、接单平台上的副业机会。

| 决策方法 | 用户行为表现 | 例子 |
| --- | --- | --- |
| 乐观法 | all-in 新机会 | 辞职做全职博主，赌风口 |
| 悲观法 | 死守确定性 | 副业都是幸存者偏差，保住编制要紧 |
| 折中法 | 主业保底 + 副业试探 | 每天两小时做账号，跑通变现模型前不辞职 |
| 最小后悔值 | 选"两头都不至于太后悔"的路径 | 先请长假试三个月，不行还能回去 |

平台经济大幅降低了折中法的执行成本——过去"试探一个新方向"往往需要辞职，如今只需要一部手机。

<!--col:R-->

<!--/folio-->

<!--folio:第33页-->

<!--col:L-->

<!--col:M-->
#### 数字时代没有淘汰古典准则，而是改写了它们的适用条件
01 概率可以"后验获取"：搜索、事实核查、AI 助手、实时数据，让不确定型决策随时可能转化为风险型决策。新的决策问题变成：花多少成本获取概率信息才值得？

02 算法在替你选择准则：推荐系统默认把你推向乐观法（同温层回声），消费话术也在放大乐观预期——你以为自己在自主决策，实际准则可能已被平台预先选定。

03 后悔成本不对称，且被永久化：截图、存档、传播，让一次错误转发或冲动消费的后悔值远超过去。这让最小后悔准则的解释力空前增强——"让子弹飞一会儿"正是它的民间表达。

<!--col:R-->

<!--/folio-->

<!--folio:第34页-->

<!--col:L-->

<!--col:M-->
#### "决策自检清单"
- 我此刻在用哪条准则？是我自己的选择，还是平台替我选的？
- 最差结果是什么，我能否承受？（悲观法自检）
- 我看到的"最好情况"，有没有被算法过滤过？（乐观法自检）
- 值不值得先花成本获取概率，再做决定？（不确定性转化自检）
- 如果错了，后悔值能否承受、会不会被永久记录？（最小后悔自检）

不确定无法消除，但准则可以选择。

<!--col:R-->

<!--/folio-->

<!--folio:第35页-->

<!--col:L-->

<!--col:M-->
#### Practice 1

| Alternative \ State of nature | 1 | 2 | 3 |
| --- | --- | --- | --- |
| A | 140 | 120 | 80 |
| B | 200 | 150 | 40 |
| C | 340 | 140 | −20 |

¡ Maximax, Maximin, Minimax regret

<!--col:R-->

<!--/folio-->

<!--folio:第36页-->

<!--col:L-->

<!--col:M-->
Regret matrix

| 方案 \ 自然状态 | 1 | 2 | 3 | 各行最大后悔 |
| --- | --- | --- | --- | --- |
| A | 200 | 30 | 0 | 200 |
| B | 140 | 0 | 40 | 140 |
| C | 0 | 10 | 100 | 100 |

<!--col:R-->

<!--/folio-->

<!--folio:第37页-->

<!--col:L-->

<!--col:M-->
Insufficient reason（等可能法，三状态各 1/3）：

| 方案 \ 自然状态 | 1 | 2 | 3 | 期望值 |
| --- | --- | --- | --- | --- |
| A | 140 | 120 | 80 | 113.3 |
| B | 200 | 150 | 40 | 130 |
| C | 340 | 140 | −20 | 153.3 |

<!--col:R-->

<!--/folio-->
