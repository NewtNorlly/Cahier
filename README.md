# Cahier · 我的康奈尔笔记本

> 一本写在网页上的活页笔记本：左边是提问，中间是原文，右边是手写批注。
> 文献笔记与教学讲稿，安安静静地排成横线本的样子。

Cahier（法语，意为"笔记本"）是一个个人学术档案站。它把文献笔记与教学讲稿整理成**康奈尔笔记本**式的三栏版面——左栏的引导问题、中栏的原文、右栏的批注，每一页都像从笔记本上撕下来的一样。站里还藏着一个"恐龙快跑（黄州）"游戏空间，跑酷之余能顺便逛逛黄州的地标。

---

## 站里有什么

- **文献笔记**：文献阅读笔记与书摘归档，中栏是原文，左右栏是你的问题与批注。
- **教学讲稿**：法学、决策、土地、德语……按学科分册，每份讲稿有自己的清新封面。
- **游戏空间**：右上角手柄按钮进入"恐龙快跑（黄州）"，四种玩法，跑酷时还能看到黄州的地标建筑。

## 项目结构

```
site/                     Cahier Astro 站点（构建产物在 site/dist/）
  src/pages/              页面：首页 / 笔记 / 讲稿
  src/styles/folio.css    康奈尔横线本三栏文档体
  public/game/            恐龙快跑游戏（dino.js + index.html + dino.css + webp 素材）
  public/favicon.*        站点图标（薄荷绿笔记本电脑 Logo）
  public/CNAME            自定义域名（20061018.xyz）
恐龙快跑（黄州府）*.py     Python 版游戏源码
.github/workflows/        GitHub Actions 部署工作流（deploy.yml）
```

> 游戏素材已统一收进 `site/public/game/`（WebP 压缩，加载飞快）；根目录不再保留冗余素材副本。

## 本地开发

```bash
cd site
pnpm install      # 首次运行
pnpm dev          # 开发服务器 → http://localhost:4321
```

> pnpm 不可用时可直接用 `npm run dev`（依赖同样由 `site/node_modules` 提供）。
> Windows 下也可以直接双击根目录的 `启动网站.cmd`。

## 构建与校验

```bash
cd site
pnpm build
```

构建脚本依次执行：`sync-assets`（同步根目录图片素材到 `public/media`）→ `astro check`（类型检查）→ `astro build`（产出 `site/dist`）→ 站内链接与资源完整性校验。

## 部署

- **工作流**：`.github/workflows/deploy.yml` — 推送 / 合并到 `main` 后自动构建并发布到 GitHub Pages。
- **Pages 数据源**：GitHub Actions（旧版 `pages-build-deployment` 已停用并清理历史记录，不再与本站工作流冲突）。
- **自定义域名**：`20061018.xyz`（配置见 `site/public/CNAME`）。

## 游戏：恐龙快跑（黄州）

- **入口**：站点右上角手柄按钮 → 全屏光圈转场打开 `game/index.html`（顶部返回「回到书桌」）。
- **顶部左上控制条**：`音乐开关`（全局）、`飞行模式`（仅休闲模式显示）、`暂停`。
- **四种玩法**：休闲（横版跑酷）/ 上手（空中迷宫）/ 入坑（平台跳跃）/ 专家（传送迷岛）。
- **素材**：全部为压缩 WebP，加载轻快；BGM 默认关闭，需要时点左上角音乐开关。

---

## 结语

你们必须努力寻找自己的声音。因为你越迟开始寻找，找到的可能性就越小。

Boys, you must strive to find your own voice. Because the longer you wait to begin, the less likely you are to find it at all.

以上是1989年美国电影《死亡诗社》(Dead Poets Society)里的台词，由罗宾·威廉姆斯(Robin Williams)饰演的约翰·基廷(John Keating)老师在课堂上对学生所说。这句话是《死亡诗社》中最具代表性的经典台词之一，体现了电影的核心主题--自我发现与坚持本我。

Happy happy to lucky!

以上是柴小桑胡编的祝福语。

Dinosaur Dash (Huangzhou) is a parkour game project set in Huangzhou's historical and cultural context. It includes an HTML game introduction page and Python game source code, integrating Huangzhou's landmark architectural elements, allowing you to experience local cultural charm while enjoying parkour fun.
