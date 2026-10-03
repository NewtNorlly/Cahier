import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';

import { remarkObsidian } from './src/plugins/remark-obsidian.mjs';
import { remarkThreeColumn } from './src/plugins/remark-three-column.mjs';

const siteUrl = process.env.SITE_URL ?? 'https://cahier.example.com';
const siteBase = process.env.SITE_BASE ?? '/';

export default defineConfig({
  site: siteUrl,
  base: siteBase,
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  integrations: [sitemap()],
  markdown: {
    // 关闭 Shiki/Prism 语法高亮：代码块不使用 github-dark 深色主题，
    // 改由 folio.css 呈现「米白纸 + 黑色思源宋体」的学院派代码块
    syntaxHighlight: false,
    processor: unified({
      remarkPlugins: [
        remarkMath,
        [remarkObsidian, { base: siteBase }],
        remarkThreeColumn,
      ],
      rehypePlugins: [
        rehypeSlug,
        rehypeKatex,
        [rehypeAutolinkHeadings, { behavior: 'append' }],
      ],
    }),
  },
});
