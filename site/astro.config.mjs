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
