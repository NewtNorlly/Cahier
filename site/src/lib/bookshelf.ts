import { getCatalog } from './catalog';
import type { Note } from './catalog';

/**
 * 文献笔记 · 数据层
 *
 * 「文献笔记」只包含 collectionName === '文献笔记' 的条目，
 * 按 frontmatter.category 字段（如 "03法学"）归入中国学科门类。
 *
 * 展示层规则（不修改任何原始 md）：
 * 1. 从 category 字段提取学科门类名（"03法学" → "法学"）；
 * 2. 缺 category 的条目按标题关键词兜底归类；
 * 3. 所有条目按标题拼音排序。
 */

/** 未标注分类且兜底规则也未命中的条目统一归入「未分类」 */
export const UNCATEGORIZED = '未分类';

/**
 * 中国学科门类展示顺序（01–12），「未分类」固定在最后。
 * 「全部」由前端独立按钮承载，不在此列表中。
 */
export const BOOKSHELF_CATEGORY_ORDER = [
  '哲学',
  '经济学',
  '法学',
  '教育学',
  '文学',
  '历史学',
  '理学',
  '工学',
  '农学',
  '医学',
  '管理学',
  '艺术学',
  UNCATEGORIZED,
];

/**
 * 从 frontmatter.category 字段提取学科门类名。
 * 支持 "03法学" / "03-法学" / "法学" 等格式，统一返回纯门类名。
 */
export function extractDiscipline(category: string | undefined): string | undefined {
  if (!category) return undefined;
  const trimmed = category.trim();
  if (!trimmed) return undefined;
  // 去掉前导数字编号（如 "03"、"3"）及分隔符
  const stripped = trimmed.replace(/^\d{1,2}\s*[-–—.、]?\s*/, '');
  return stripped || undefined;
}

/**
 * 缺分类条目的兜底归类规则（按标题包含关键词匹配，自上而下先命中先生效）。
 * 仅作用于展示层，绝不回写源文件。
 */
const FALLBACK_RULES: Array<[RegExp, string]> = [
  [/法|宪法|民法|刑法|诉讼|知识产权|行政法|国际法/, '法学'],
  [/经济|金融|财政|贸易|投资|市场/, '经济学'],
  [/哲学|伦理|逻辑|形而上学/, '哲学'],
  [/教育|教学|课程|学习|心理/, '教育学'],
  [/文学|小说|诗|散文|语言|文字/, '文学'],
  [/历史|史|考古|文明/, '历史学'],
  [/数学|物理|化学|生物|科学/, '理学'],
  [/工程|计算机|软件|算法|数据结构|技术/, '工学'],
  [/农|林|渔|畜牧|生态/, '农学'],
  [/医|药|护理|临床|健康/, '医学'],
  [/管理|行政|公共|企业|人力资源/, '管理学'],
  [/艺术|音乐|美术|设计|戏剧|电影/, '艺术学'],
];

export interface BookshelfCategory {
  name: string;
  noteCount: number;
  notes: Note[];
}

export interface BookshelfData {
  categories: BookshelfCategory[];
  allBooks: Note[];
  totalBooks: number;
}

const collator = new Intl.Collator('zh-CN-u-co-pinyin', {
  numeric: true,
  sensitivity: 'base',
});

/** 按标题拼音排序 */
export function compareByTitle(left: Note, right: Note): number {
  return collator.compare(left.title, right.title);
}

/** 取文献的学科门类（优先 frontmatter.category，兜底关键词，最后「未分类」） */
export function bookParentCategory(note: Note): string {
  const raw = (note.entry.data as Record<string, unknown>)?.category;
  const category = typeof raw === 'string' ? raw : undefined;
  const discipline = extractDiscipline(category);
  if (discipline) return discipline;

  const title = note.title ?? '';
  for (const [pattern, cat] of FALLBACK_RULES) {
    if (pattern.test(title)) return cat;
  }
  return UNCATEGORIZED;
}

export async function getBookshelf(): Promise<BookshelfData> {
  const catalog = await getCatalog();

  const books = catalog.notes.filter(
    (note) => note.collectionName === '文献笔记' && !note.draft,
  );

  const grouped = new Map<string, Note[]>();
  for (const note of books) {
    const category = bookParentCategory(note);
    const list = grouped.get(category) ?? [];
    list.push(note);
    grouped.set(category, list);
  }

  // 每个分类内部：按标题拼音排序
  for (const list of grouped.values()) list.sort(compareByTitle);

  const categories: BookshelfCategory[] = [];
  const added = new Set<string>();

  /* Cahier 固定展示全部 12 个学科门类（即使暂无文献），保持 13 类架构完整 */
  for (const name of BOOKSHELF_CATEGORY_ORDER) {
    if (name === UNCATEGORIZED) continue;
    const list = grouped.get(name) ?? [];
    categories.push({ name, noteCount: list.length, notes: list });
    added.add(name);
  }
  /* 未分类仅在有内容时显示 */
  const uncategorized = grouped.get(UNCATEGORIZED);
  if (uncategorized && uncategorized.length > 0) {
    categories.push({ name: UNCATEGORIZED, noteCount: uncategorized.length, notes: uncategorized });
    added.add(UNCATEGORIZED);
  }
  for (const [name, list] of grouped) {
    if (!added.has(name)) {
      categories.push({ name, noteCount: list.length, notes: list });
      added.add(name);
    }
  }

  // 「全部」视图：按标题拼音排序
  const allBooks = [...books].sort(compareByTitle);

  return { categories, allBooks, totalBooks: books.length };
}
