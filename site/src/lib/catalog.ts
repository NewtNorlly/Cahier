import { existsSync } from 'node:fs';
import path from 'node:path';

import { getCollection, type CollectionEntry } from 'astro:content';

import { getCollectionConfig, type CollectionKind } from '../config/collections';
import { mediaUrl, stableId } from './url';

const siteRoot = path.resolve(process.cwd());
const repositoryRoot = path.resolve(siteRoot, '..');
const collator = new Intl.Collator('zh-CN-u-co-pinyin', {
  numeric: true,
  sensitivity: 'base',
});

export interface Cover {
  src: string;
  srcSet?: string;
  thumbnailSrc?: string;
  alt: string;
  positionX?: number;
  positionY?: number;
  ratio?: string;
  width?: number;
  height?: number;
}

export interface TopicRef {
  id: string;
  name: string;
}

export interface WereadMetadata {
  bookId?: string;
  author?: string;
  progress?: string;
  readingTime?: string;
  readingDate?: string;
  finishedDate?: string;
  lastReadDate?: string;
  isbn?: string;
  reviewCount?: number;
  noteCount?: number;
  bookmarkCount?: number;
  translator?: string;
  category?: string;
  publisher?: string;
  publishTime?: string;
  rating?: string;
}

export interface Note {
  id: string;
  title: string;
  collectionId: string;
  collectionName: string;
  topics: TopicRef[];
  description?: string;
  excerpt?: string;
  cover?: Cover;
  sourceUrl?: string;
  kind: 'article' | 'book' | 'stats';
  draft: boolean;
  author?: string;
  weread?: WereadMetadata;
  entry: CollectionEntry<'notes'>;
  sourcePath: string;
}

export interface CollectionSummary {
  id: string;
  name: string;
  description?: string;
  kind: CollectionKind;
  noteCount: number;
  topicCount: number;
  cover?: Cover;
  notes: Note[];
}

export interface TopicSummary {
  id: string;
  name: string;
  collectionId: string;
  collectionName: string;
  noteCount: number;
  cover?: Cover;
  notes: Note[];
  path: string[];
  parentId?: string;
}

export interface Catalog {
  collections: CollectionSummary[];
  topics: TopicSummary[];
  notes: Note[];
  collectionCount: number;
  publishedNoteCount: number;
}

type RawData = CollectionEntry<'notes'>['data'] & Record<string, unknown>;

let catalogPromise: Promise<Catalog> | undefined;

function toPosix(value: string): string {
  return value.replace(/\\/g, '/').normalize('NFC');
}

function cleanRepoPath(value: string): string | undefined {
  const normalized = path.posix.normalize(toPosix(value).replace(/^\.\//, ''));
  if (!normalized || normalized === '.' || normalized === '..') return undefined;
  if (normalized.startsWith('../') || path.posix.isAbsolute(normalized)) return undefined;
  return normalized;
}

function getSourcePath(entry: CollectionEntry<'notes'>): string {
  if (entry.filePath) {
    const absolutePath = path.isAbsolute(entry.filePath)
      ? entry.filePath
      : path.resolve(siteRoot, entry.filePath);
    const relativePath = cleanRepoPath(path.relative(repositoryRoot, absolutePath));
    if (relativePath) return relativePath;
  }

  const fallback = cleanRepoPath(entry.id);
  if (!fallback) return `${entry.id}.md`;
  return fallback.toLowerCase().endsWith('.md') ? fallback : `${fallback}.md`;
}

function fileTitle(sourcePath: string): string {
  return path.posix.basename(sourcePath, path.posix.extname(sourcePath)).trim();
}

function stringValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const result = value.trim();
    return result || undefined;
  }
  if (typeof value === 'number') return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function validHttpUrl(value: unknown): string | undefined {
  const candidate = stringValue(value);
  if (!candidate) return undefined;

  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}

function resolveAssetPath(sourcePath: string, assetPath: string): string | undefined {
  const cleanAssetPath = cleanRepoPath(assetPath);
  if (!cleanAssetPath) return undefined;

  const candidates = [
    cleanRepoPath(path.posix.join(path.posix.dirname(sourcePath), cleanAssetPath)),
    cleanAssetPath,
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    const absolutePath = path.resolve(repositoryRoot, ...candidate.split('/'));
    const relativeCheck = path.relative(repositoryRoot, absolutePath);
    if (!relativeCheck.startsWith('..') && !path.isAbsolute(relativeCheck) && existsSync(absolutePath)) {
      return candidate;
    }
  }

  return undefined;
}

function localCoverMedia(localPath: string): Pick<Cover, 'src' | 'srcSet' | 'thumbnailSrc'> {
  const src = mediaUrl(localPath);
  const ext = localPath.match(/\.\w+$/)?.[0] ?? '';
  const thumbPath = localPath.replace(new RegExp(ext.replace('.','\\.')+'$'), `_thumb${ext}`);
  const thumbAbs = path.resolve(repositoryRoot, ...thumbPath.split('/'));
  const thumbnailSrc = existsSync(thumbAbs) ? mediaUrl(thumbPath) : undefined;

  if (!/-960\.webp$/i.test(localPath)) return { src, thumbnailSrc };

  const smallPath = localPath.replace(/-960\.webp$/i, '-480.webp');
  const smallAbsolutePath = path.resolve(repositoryRoot, ...smallPath.split('/'));
  if (!existsSync(smallAbsolutePath)) return { src, thumbnailSrc };

  return {
    src,
    srcSet: `${mediaUrl(smallPath)} 480w, ${src} 960w`,
    thumbnailSrc,
  };
}

/** 远程封面统一升级为 https：微信读书图床（qlogo.cn / weread 等）均支持 https，
 *  避免在 https 页面因混合内容被拦截。仅用于封面，不影响原文外链。 */
function secureCoverUrl(url: string | undefined): string | undefined {
  return url?.startsWith('http://') ? `https://${url.slice('http://'.length)}` : url;
}

function getCover(data: RawData, title: string, sourcePath: string): Cover | undefined {
  const rawCover = data.cover;
  if (!rawCover) return undefined;

  if (typeof rawCover === 'string') {
    const remoteCover = secureCoverUrl(validHttpUrl(rawCover));
    if (remoteCover) return { src: remoteCover, alt: `${title}封面` };

    const localPath = resolveAssetPath(sourcePath, rawCover);
    return localPath ? { ...localCoverMedia(localPath), alt: `${title}封面` } : undefined;
  }

  if (typeof rawCover !== 'object' || !('image' in rawCover)) return undefined;

  const coverData = rawCover as Record<string, unknown>;
  const image = stringValue(coverData.image);
  if (!image) return undefined;

  const remoteCover = secureCoverUrl(validHttpUrl(image));
  const localPath = remoteCover ? undefined : resolveAssetPath(sourcePath, image);
  const localMedia = localPath ? localCoverMedia(localPath) : undefined;
  const src = remoteCover ?? localMedia?.src;
  if (!src) return undefined;

  return {
    src,
    srcSet: localMedia?.srcSet,
    alt: `${title}封面`,
    positionX: numberValue(coverData.positionX),
    positionY: numberValue(coverData.positionY),
    ratio: stringValue(coverData.actualRatio),
    width: numberValue(coverData.pixelWidth),
    height: numberValue(coverData.pixelHeight),
  };
}

function trimExcerpt(value: string): string | undefined {
  const clean = value
    .replace(/<!--.*?-->/gs, ' ')
    .replace(/<center>\s*=+\s*<\/center>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[\[[^\]]+\]\]/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, '$2$1')
    .replace(/^\s{0,3}(?:#{1,6}|>|[-*+]\s+)\s*/gm, '')
    .replace(/\^[A-Za-z0-9-]+\s*$/gm, '')
    .replace(/[*_~`=]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean) return undefined;
  return Array.from(clean).slice(0, 170).join('') + (Array.from(clean).length > 170 ? '…' : '');
}

function getDescription(data: RawData, body: string | undefined): string | undefined {
  const explicit = stringValue(data.description) ?? stringValue(data.summary);
  if (explicit) return trimExcerpt(explicit);
  if (!body) return undefined;

  const wereadIntroduction = body.match(/^\s*>?\s*-?\s*简介[：:]\s*(.+)$/m)?.[1];
  return trimExcerpt(wereadIntroduction ?? body);
}

function getSourceUrl(data: RawData, body: string | undefined): string | undefined {
  const frontmatterUrl = validHttpUrl(data.sourceUrl) ?? validHttpUrl(data.网址) ?? validHttpUrl(data.url);
  if (frontmatterUrl) return frontmatterUrl;

  const bodyUrl = body?.match(/^\s*网址[：:]\s*(https?:\/\/\S+)/m)?.[1];
  return validHttpUrl(bodyUrl);
}

function getWereadMetadata(data: RawData): WereadMetadata | undefined {
  if (data.doc_type !== 'weread-highlights-reviews') return undefined;

  return {
    bookId: stringValue(data.bookId),
    author: stringValue(data.author),
    progress: stringValue(data.progress),
    readingTime: stringValue(data.readingTime),
    readingDate: stringValue(data.readingDate),
    finishedDate: stringValue(data.finishedDate),
    lastReadDate: stringValue(data.lastReadDate),
    isbn: stringValue(data.isbn),
    reviewCount: numberValue(data.reviewCount),
    noteCount: numberValue(data.noteCount),
    bookmarkCount: numberValue(data.bookmarkCount),
    translator: stringValue(data.translator),
    category: stringValue(data.category),
    publisher: stringValue(data.publisher),
    publishTime: stringValue(data.publishTime),
    rating: stringValue(data.rating),
  };
}

function getTopicRefs(collectionName: string, topicNames: string[]): TopicRef[] {
  return topicNames.map((name, index) => ({
    id: stableId(name, `${collectionName}/${topicNames.slice(0, index + 1).join('/')}`),
    name,
  }));
}

function compareNotes(left: Note, right: Note): number {
  return collator.compare(left.title, right.title);
}

async function buildCatalog(): Promise<Catalog> {
  const entries = await getCollection('notes');
  const allNotes = entries.map((entry): Note => {
    const sourcePath = getSourcePath(entry);
    const pathParts = sourcePath.split('/');
    const collectionName = pathParts[0] || '未分类';
    const collectionId = stableId(collectionName, collectionName);
    const title = stringValue(entry.data.title) ?? fileTitle(sourcePath);
    const topicNames = pathParts.slice(1, -1).filter((part) => part !== '文本附件');
    const description = getDescription(entry.data, entry.body);
    const weread = getWereadMetadata(entry.data);
    const isReadingStats = entry.data.doc_type === 'weread-reading-stats';

    return {
      id: stableId(title, sourcePath),
      title,
      collectionId,
      collectionName,
      topics: getTopicRefs(collectionName, topicNames),
      description,
      excerpt: description,
      cover: getCover(entry.data, title, sourcePath),
      sourceUrl: getSourceUrl(entry.data, entry.body),
      kind: weread ? 'book' : isReadingStats ? 'stats' : 'article',
      draft: entry.data.draft,
      author: weread?.author ?? stringValue(entry.data.author),
      weread,
      entry,
      sourcePath,
    };
  });

  const publishedNoteCount = allNotes.filter((note) => !note.draft).length;
  const notes = (import.meta.env.PROD ? allNotes.filter((note) => !note.draft) : allNotes).sort(compareNotes);
  const collectionMap = new Map<string, CollectionSummary>();
  const topicMap = new Map<string, TopicSummary>();

  for (const note of notes) {
    let collection = collectionMap.get(note.collectionId);
    if (!collection) {
      const config = getCollectionConfig(note.collectionName);
      collection = {
        id: note.collectionId,
        name: note.collectionName,
        description: config.description,
        kind: config.kind,
        noteCount: 0,
        topicCount: 0,
        notes: [],
      };
      collectionMap.set(note.collectionId, collection);
    }

    collection.notes.push(note);
    collection.noteCount += 1;
    collection.cover ??= note.cover;

    note.topics.forEach((topicRef, index) => {
      let topic = topicMap.get(topicRef.id);
      if (!topic) {
        topic = {
          id: topicRef.id,
          name: topicRef.name,
          collectionId: note.collectionId,
          collectionName: note.collectionName,
          noteCount: 0,
          notes: [],
          path: note.topics.slice(0, index + 1).map((item) => item.name),
          parentId: index > 0 ? note.topics[index - 1]?.id : undefined,
        };
        topicMap.set(topicRef.id, topic);
      }

      topic.notes.push(note);
      topic.noteCount += 1;
      topic.cover ??= note.cover;
    });
  }

  for (const collection of collectionMap.values()) {
    collection.topicCount = Array.from(topicMap.values()).filter(
      (topic) => topic.collectionId === collection.id,
    ).length;
    collection.notes.sort(compareNotes);
  }

  for (const topic of topicMap.values()) topic.notes.sort(compareNotes);

  const collections = Array.from(collectionMap.values()).sort((left, right) => {
    if (left.kind === 'library' && right.kind !== 'library') return 1;
    if (left.kind !== 'library' && right.kind === 'library') return -1;
    return collator.compare(left.name, right.name);
  });
  const topics = Array.from(topicMap.values()).sort((left, right) => {
    const collectionOrder = collator.compare(left.collectionName, right.collectionName);
    return collectionOrder || collator.compare(left.path.join('/'), right.path.join('/'));
  });

  return {
    collections,
    topics,
    notes,
    collectionCount: collections.length,
    publishedNoteCount,
  };
}

export async function getCatalog(): Promise<Catalog> {
  catalogPromise ??= buildCatalog();
  return catalogPromise;
}

export async function getAllNotes(): Promise<Note[]> {
  return (await getCatalog()).notes;
}

export async function getCollectionById(id: string): Promise<CollectionSummary | undefined> {
  return (await getCatalog()).collections.find((collection) => collection.id === id);
}

export async function getTopicById(id: string): Promise<TopicSummary | undefined> {
  return (await getCatalog()).topics.find((topic) => topic.id === id);
}

export async function getNoteById(id: string): Promise<Note | undefined> {
  return (await getCatalog()).notes.find((note) => note.id === id);
}
