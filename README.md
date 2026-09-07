# Cahier — 钴蓝学术档案站

文献笔记与教学讲稿的个人学术档案站（Astro 静态站点），内嵌「恐龙快跑（黄州）」游戏空间。

## 站点题记

## 你们必须努力寻找自己的声音。因为你越迟开始寻找，找到的可能性就越小。

## Boys, you must strive to find your own voice. Because the longer you wait to begin, the less likely you are to find it at all.

### 以上是 1989 年美国电影《死亡诗社》(Dead Poets Society)里的台词，由罗宾・威廉姆斯 (Robin Williams) 饰演的约翰・基廷 (John Keating) 老师在课堂上对学生所说。这句话是《死亡诗社》中最具代表性的经典台词之一，体现了电影的核心主题 —— 自我发现与坚持本我。

## Happy happy to lucky!

### 以上是 柴小桑 胡编的祝福语。

Dinosaur Dash (Huangzhou) is a parkour game project set in Huangzhou's historical and cultural context. It includes an HTML game introduction page and Python game source code, integrating Huangzhou's landmark architectural elements, allowing you to experience local cultural charm while enjoying parkour fun.

---

## 项目结构

```
site/                     Cahier Astro 站点（构建产物在 site/dist/）
  src/pages/              页面：首页 / 学科集合 / 笔记 / 专题
  src/content.config.ts   内容集合定义（notes / lectures）
  public/game/            恐龙快跑游戏（index.html + dino.js + dino.css）
  public/favicon.*        站点图标（笔记本电脑 Logo）
  public/CNAME            自定义域名（20061018.xyz）
game/ images/ bgm/        恐龙快跑素材（根目录保留副本）
恐龙快跑（黄州府）*.py     Python 版游戏源码
.github/workflows/        GitHub Actions 部署工作流（deploy.yml）
```

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

- **工作流**：`.github/workflows/deploy.yml` — 推送 / 合并到 `main` 后自动构建 Astro 站点并发布到 GitHub Pages。
- **Pages 数据源**：GitHub Actions（不是「从分支部署」——旧版 `pages-build-deployment` 已停用，避免与本站工作流冲突）。
- **自定义域名**：`20061018.xyz`（配置见 `site/public/CNAME`）。

## 恐龙快跑游戏

- **入口**：站点右上角手柄按钮 → 全屏光圈转场打开 `game/index.html`（顶部返回「回到书桌」）。
- **顶部左上控制条**：`音乐开关`（全局）、`飞行模式`（仅休闲模式显示）、`暂停`。
- **四种玩法**：休闲（横版跑酷）/ 上手（空中迷宫）/ 入坑（平台跳跃）/ 专家（传送迷岛）。
