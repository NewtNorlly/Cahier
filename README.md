<div align="center">

# 📓 Cahier · 我的康奈尔笔记本

*Cahier —— 法语里「笔记本」的意思*

<img alt="清新薄荷" src="https://img.shields.io/badge/Astro-静态站点-55C4A5?style=flat-square"> <img alt="三栏" src="https://img.shields.io/badge/版式-三栏康奈尔-8FBF9F?style=flat-square"> <img alt="纯白纸面" src="https://img.shields.io/badge/纸面-纯白安静-F6F3EC?style=flat-square">

</div>

> 一本活在网页上的活页笔记本：
> 左边是提问，中间是原文，右边是批注。
> 纯白的纸、连贯的便签、一一对应的笔记，
> 像真的摊开一本笔记本那样安静。

```text
┌─────────────┬───────────────────────┬─────────────┐
│             │                       │             │
│   提问 · 线索 │      原 文 纸          │   批 注      │
│  (左半幅)    │   尊重 PDF 视觉规范     │  (左半幅)    │
│             │                       │             │
│  笔记读到哪  │   正文就排到哪 ───────► │  批注跟到哪   │
│             │                       │             │
└─────────────┴───────────────────────┴─────────────┘
```

## ✨ 站里有什么

- **📚 文献笔记** —— 文献阅读笔记与书摘归档。中栏按学术论文 PDF 的视觉规范排版：大标题居中、作者右对齐、内容提要与关键词、`〔n〕` 六角脚注号右上标、页底悬挂脚注、英文书名斜体；左右两栏是连贯的便签纸，宽度正好是原文纸的一半，你读到哪、批到哪，笔记就跟到哪。
- **📝 教学讲稿** —— 法学、决策、土地、宪法、德语、社保……按学科分册。每份讲稿都有一张**亲手设计的学院派封面**，配色、纹样各不相同，拒绝批量生产的味道；脑图按语义多级缩进，复习时层级一眼看清。
- **🕹️ 游戏空间** —— 右上角手柄按钮，一个光圈转场进入「🦕 恐龙快跑（黄州）」，四种玩法，跑酷时顺手逛一遍黄州的地标。

## 🗂️ 项目结构

```text
site/                       Cahier Astro 站点（构建产物在 site/dist/）
  src/pages/                页面：首页 / 文献 / 讲稿
  src/styles/folio.css      三栏康奈尔文档体（纯白纸面 + 连贯便签纸）
  src/plugins/              内容管线（三栏包裹 / Obsidian 语法 / 跨页续段）
  src/layouts/              布局与游戏光圈转场
  public/game/              恐龙快跑（dino.js · index.html · dino.css · WebP）
  public/3d/                首页 3D 模型
  public/favicon.*          薄荷绿笔记本电脑站点图标
  public/CNAME              自定义域名（20061018.xyz）
恐龙快跑（黄州府）*.py        Python 版游戏源码
.github/workflows/          GitHub Actions 部署工作流（deploy.yml）
```

## 🧭 本地开发

```bash
cd site
pnpm install      # 首次运行安装依赖
pnpm dev          # 开发服务器 → http://localhost:4321
pnpm build        # 产出静态站点到 site/dist
```

> 没有 pnpm 时 `npm run dev` 也行；Windows 下也可以直接双击根目录的 `启动网站.cmd`。

构建管线会依次执行：`sync-assets`（同步根目录素材到 `public/media`）→ `astro check`（类型检查）→ `astro build` → 站内链接与资源完整性校验。

## 🦕 恐龙快跑（黄州）

右上角手柄按钮 → 全屏光圈转场打开游戏，顶部「回到书桌」收起。**电脑端键位：**

| 按键 | 作用 |
| --- | --- |
| `←` `→`（或 `A` `D`） | 左右移动 |
| `↑`（或 `W`） / `空格` | 向上跳 |
| `M` | 音乐开关 |
| `N`（或 `F`） | 飞行模式（**仅休闲模式**） |
| `Esc` | 暂停 / 继续 |

- **顶部左上控制条**：🎵 音乐开关、🪂 飞行模式（只在休闲模式出现）、⏸ 暂停，触屏设备另有虚拟摇杆。
- **四种玩法**：休闲（横版跑酷）／上手（空中迷宫）／入坑（平台跳跃）／专家（传送迷岛）。
- **轻快加载**：素材全部压缩为 WebP，进页时先把图片解码好，任意屏幕比例都等比铺满、不留黑边；BGM 默认静音，想听再按 `M`。

## ☁️ 部署

- 推送或合并到 `main` 后，`.github/workflows/deploy.yml` 自动构建并发布到 GitHub Pages。
- Pages 由 GitHub Actions 提供数据；旧的 `pages-build-deployment` 已停用，运行记录也已清理，不再与本站工作流冲突。
- 自定义域名：**20061018.xyz**（见 `site/public/CNAME`）。

---

## 🌙 结语

你们必须努力寻找自己的声音。因为你越迟开始寻找，找到的可能性就越小。

Boys, you must strive to find your own voice. Because the longer you wait to begin, the less likely you are to find it at all.

以上是1989年美国电影《死亡诗社》(Dead Poets Society)里的台词，由罗宾·威廉姆斯(Robin Williams)饰演的约翰·基廷(John Keating)老师在课堂上对学生所说。这句话是《死亡诗社》中最具代表性的经典台词之一，体现了电影的核心主题--自我发现与坚持本我。

Happy happy to lucky!

以上是柴小桑胡编的祝福语。

Dinosaur Dash (Huangzhou) is a parkour game project set in Huangzhou's historical and cultural context. It includes an HTML game introduction page and Python game source code, integrating Huangzhou's landmark architectural elements, allowing you to experience local cultural charm while enjoying parkour fun.
