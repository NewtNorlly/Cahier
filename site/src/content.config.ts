import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const booleanish = z
  .union([z.boolean(), z.string()])
  .transform((value) => value === true || (typeof value === 'string' && value.toLowerCase() === 'true'));

const dateish = z.union([z.string(), z.date()]);

const coverObject = z
  .object({
    image: z.string(),
    actualRatio: z.string().optional(),
    pixelWidth: z.coerce.number().optional(),
    pixelHeight: z.coerce.number().optional(),
    displayWidth: z.coerce.number().optional(),
    displayHeight: z.coerce.number().optional(),
    positionX: z.coerce.number().optional(),
    positionY: z.coerce.number().optional(),
  })
  .catchall(z.unknown());

const notes = defineCollection({
  loader: glob({
    base: new URL('../../', import.meta.url),
    pattern: [
      '**/*.md',
      '!README.md',
      '!智能体操作手册.md',
      '!site/**',
      '!.github/**',
      '!.git/**',
      '!.obsidian/**',
      '!.makemd/**',
      '!.space/**',
      '!.trash/**',
      '!**/node_modules/**',
      '!AI 指令/**',
      '!**/文本附件/**/*.md',
      '!_pdf-staging/**',
    ],
    deferRender: true,
  }),
  schema: z
    .object({
      title: z.string().nullish(),
      description: z.string().nullish(),
      summary: z.string().nullish(),
      cover: z.union([z.string(), coverObject]).nullish(),
      draft: booleanish.default(false),
      网址: z.string().nullish(),
      url: z.string().nullish(),
      sourceUrl: z.string().nullish(),
      doc_type: z.string().nullish(),
      bookId: z.union([z.string(), z.number()]).nullish(),
      reviewCount: z.coerce.number().nullish(),
      noteCount: z.coerce.number().nullish(),
      bookmarkCount: z.coerce.number().nullish(),
      author: z.string().nullish(),
      translator: z.string().nullish(),
      category: z.string().nullish(),
      publisher: z.string().nullish(),
      publishTime: dateish.nullish(),
      rating: z.string().nullish(),
      progress: z.union([z.string(), z.number()]).nullish(),
      readingTime: z.string().nullish(),
      readingDate: dateish.nullish(),
      finishedDate: dateish.nullish(),
      isbn: z.union([z.string(), z.number()]).nullish(),
      lastReadDate: dateish.nullish(),
      aliases: z.array(z.string()).nullish(),
    })
    .catchall(z.unknown()),
});

export const collections = { notes };
