<div align="center">

# 📓 Cahier · 我的康奈尔笔记本

*Cahier —— 法语里「笔记本」的意思*

<img alt="清新薄荷" src="https://img.shields.io/badge/Astro-静态站点-55C4A5?style=flat-square"> <img alt="三栏" src="https://img.shields.io/badge/版式-三栏康奈尔-8FBF9F?style=flat-square"> <img alt="昼夜" src="https://img.shields.io/badge/主题-白昼/暗夜-5B8DEF?style=flat-square"> <img alt="纯白纸面" src="https://img.shields.io/badge/纸面-纯白安静-F6F3EC?style=flat-square">

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
- **🌗 昼夜书桌** —— 右上角一颗小按钮，一圈「圆形破口」从按钮晕开，整座笔记本就在**白昼钴蓝**与**暗夜墨蓝**之间温柔换色，夜里读纸也不刺眼；文献笔记首页还有一张可以拖着环绕、慢慢自转的 3D 天蓝书桌陪着你。

## 🗂️ 项目结构

```text
site/                       Cahier Astro 站点（构建产物在 site/dist/）
  src/pages/                页面：首页 / 文献 / 讲稿
  src/styles/folio.css      三栏康奈尔文档体（纯白纸面 + 连贯便签纸 + 夜读纸）
  src/styles/global.css     设计令牌：白昼钴蓝 / 暗夜墨蓝两套主题变量
  src/plugins/              内容管线（三栏包裹 / Obsidian 语法 / 跨页续段）
  src/layouts/              布局、昼夜切换按钮与圆形破口转场
  scripts/3d/desk-viewer.mjs  3D 书桌查看器源码（OrbitControls 环绕）
  public/3d/                3D 书桌 desk.glb / desk.js / desk.html
  public/favicon.*          笔记本电脑造型的站点图标
  public/CNAME              自定义域名（20061018.xyz）
_tools/                      3D 模型转换等一次性工程脚本（desk_build.py）
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

## 🌗 白昼与暗夜，一张会换色的书桌

右上角那颗按钮就是昼夜开关：点一下，一圈圆形破口从按钮中心缓缓扩散，钴蓝白昼收成深夜墨蓝，再点又亮回来。

- **白昼（钴蓝）**：纯白纸面、安静学院风，适合白天长时间阅读；
- **暗夜（墨蓝）**：不用纯黑、不偏靛紫，纸面是柔和的深夜蓝、文字是护眼柔白，连脚注、三线表、左右便签都一并转成夜读配色；
- 选择会被记住，刷新也不白闪；文献笔记首页的 **3D 书桌**会跟着主题一起换灯光——白天明媚天青，夜里沉静清晰，按住拖动可以 360° 环绕看，松手后它又会慢慢自转。

> 3D 书桌由本地 `Desk.skp` 经 `_tools/desk_build.py` 转成轻量 glb（约 1.6MB），桌面从原本的巧克力棕、深蓝重新调成了天蓝与天青。

## ☁️ 部署

- 推送或合并到 `main` 后，`.github/workflows/deploy.yml` 自动构建并发布到 GitHub Pages。
- Pages 由 GitHub Actions 提供数据；旧的 `pages-build-deployment` 工作流及其运行记录已彻底清理，不再与本站工作流冲突。
- 站点为纯静态资源，3D 模型懒加载、图片走 WebP，首屏保持轻量。
- 自定义域名：**20061018.xyz**（见 `site/public/CNAME`）。

---

## 🌙 结语

你们必须努力寻找自己的声音。因为你越迟开始寻找，找到的可能性就越小。

Boys, you must strive to find your own voice. Because the longer you wait to begin, the less likely you are to find it at all.

以上是1989年美国电影《死亡诗社》(Dead Poets Society)里的台词，由罗宾·威廉姆斯(Robin Williams)饰演的约翰·基廷(John Keating)老师在课堂上对学生所说。这句话是《死亡诗社》中最具代表性的经典台词之一，体现了电影的核心主题--自我发现与坚持本我。

Happy happy to lucky!

以上是柴小桑胡编的祝福语。

Dinosaur Dash (Huangzhou) is a parkour game project set in Huangzhou's historical and cultural context. It includes an HTML game introduction page and Python game source code, integrating Huangzhou's landmark architectural elements, allowing you to experience local cultural charm while enjoying parkour fun.
