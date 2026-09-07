# 📓 Cahier · 我的康奈尔笔记本

> 一本活在网页上的活页笔记本：
> 左边是提问，中间是原文，右边是批注。
> 纯白的纸、连贯的便签、一一对应的笔记，
> 像真的摊开一本笔记本那样安静。

Cahier（法语：*笔记本*）是一个个人学术档案站。文献笔记与教学讲稿被整理成**三栏康奈尔版式**——左栏的引导问题、中栏的原文、右栏的手写批注，页页都是纯白纸面 + 一条连贯的便签纸，笔记的位置永远和原文对得上。站里还藏着一个「🦕 恐龙快跑（黄州）」游戏空间，跑酷之余顺便逛逛黄州的地标。

---

## ✨ 站里有什么

- **📚 文献笔记**：文献阅读笔记与书摘归档，中栏是尊重原文 PDF 视觉规范的正文排版，脚注右上标、文献 APA 格式，左右栏便签与你读到哪、批到哪一一对应。
- **📝 教学讲稿**：法学、决策、土地、德语……按学科分册，每份讲稿有自己的学院派封面——不同配色、不同纹样，绝无批量生产的味道。
- **🕹️ 游戏空间**：右上角手柄按钮进入「恐龙快跑（黄州）」，四种玩法，跑酷时还能看到黄州的地标建筑。

## 🗂️ 项目结构

```
site/                     Cahier Astro 站点（构建产物在 site/dist/）
  src/pages/              页面：首页 / 笔记 / 讲稿
  src/styles/folio.css    三栏康奈尔文档体（纯白纸面 + 连贯便签纸）
  src/plugins/            内容管线插件（三栏包裹、Obsidian 语法、脚注分行）
  public/game/            恐龙快跑游戏（dino.js + index.html + dino.css + WebP 素材）
  public/favicon.*        站点图标（薄荷绿笔记本电脑 Logo）
  public/CNAME            自定义域名（20061018.xyz）
恐龙快跑（黄州府）*.py     Python 版游戏源码
.github/workflows/        GitHub Actions 部署工作流（deploy.yml）
```

> 🎨 游戏素材已统一收进 `site/public/game/`（WebP 压缩，轻装上阵）；根目录不再保留冗余副本。

## 🚀 本地开发

```bash
cd site
pnpm install      # 首次运行
pnpm dev          # 开发服务器 → http://localhost:4321
```

> 没有 pnpm？直接 `npm run dev` 也行（依赖同样来自 `site/node_modules`）。
> Windows 下还可以直接双击根目录的 `启动网站.cmd`。

## 🔨 构建与校验

```bash
cd site
pnpm build
```

构建脚本依次执行：`sync-assets`（同步根目录素材到 `public/media`）→ `astro check`（类型检查）→ `astro build`（产出 `site/dist`）→ 站内链接与资源完整性校验。

## ☁️ 部署

- **工作流**：`.github/workflows/deploy.yml` — 推送 / 合并到 `main` 后自动构建并发布到 GitHub Pages。
- **Pages 数据源**：GitHub Actions（旧的 `pages-build-deployment` 已停用、运行记录已清理，不再与本站工作流打架）。
- **自定义域名**：`20061018.xyz`（配置见 `site/public/CNAME`）。

## 🦕 游戏：恐龙快跑（黄州）

- **入口**：站点右上角手柄按钮 → 全屏光圈转场打开 `game/index.html`（顶部「回到书桌」返回）。
- **顶部左上控制条**：`🎵 音乐开关`（全局）、`🪂 飞行模式`（仅休闲模式显示）、`⏸ 暂停`。
- **四种玩法**：休闲（横版跑酷）/ 上手（空中迷宫）/ 入坑（平台跳跃）/ 专家（传送迷岛）。
- **素材**：全部为压缩 WebP，加载轻快；BGM 默认静音，想听就点左上角音乐开关。

---

## 🌙 结语

你们必须努力寻找自己的声音。因为你越迟开始寻找，找到的可能性就越小。

Boys, you must strive to find your own voice. Because the longer you wait to begin, the less likely you are to find it at all.

以上是1989年美国电影《死亡诗社》(Dead Poets Society)里的台词，由罗宾·威廉姆斯(Robin Williams)饰演的约翰·基廷(John Keating)老师在课堂上对学生所说。这句话是《死亡诗社》中最具代表性的经典台词之一，体现了电影的核心主题--自我发现与坚持本我。

Happy happy to lucky!

以上是柴小桑胡编的祝福语。

Dinosaur Dash (Huangzhou) is a parkour game project set in Huangzhou's historical and cultural context. It includes an HTML game introduction page and Python game source code, integrating Huangzhou's landmark architectural elements, allowing you to experience local cultural charm while enjoying parkour fun.
