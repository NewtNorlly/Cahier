import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { visit } from 'unist-util-visit';

const siteRoot = path.resolve(process.cwd());
const repositoryRoot = path.resolve(siteRoot, '..');
const imageExtensions = new Set(['.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp']);
const ignoredDirectories = new Set([
  '.git',
  '.github',
  '.makemd',
  '.obsidian',
  '.space',
  '.trash',
  'AI 指令',
  'node_modules',
  'site',
]);
const calloutLabels = {
  abstract: '摘要',
  attention: '注意',
  bug: '问题',
  caution: '注意',
  danger: '危险',
  example: '示例',
  failure: '失败',
  faq: '问题',
  info: '信息',
  note: '笔记',
  question: '问题',
  quote: '引用',
  success: '完成',
  summary: '摘要',
  tip: '提示',
  todo: '待办',
  warning: '警告',
};

let assetIndex;
let markdownIndex;

function normalizeRepoPath(value) {
  const normalized = path.posix.normalize(String(value).replace(/\\/g, '/').replace(/^\.\//, ''));
  if (!normalized || normalized === '.' || normalized === '..') return undefined;
  if (normalized.startsWith('../') || path.posix.isAbsolute(normalized)) return undefined;
  return normalized.normalize('NFC');
}

function absoluteToRepoPath(absolutePath) {
  const relativePath = path.relative(repositoryRoot, absolutePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) return undefined;
  return normalizeRepoPath(relativePath);
}

function sourceFilePath(file) {
  const candidates = [file?.path, ...(file?.history ?? [])].filter(Boolean);

  for (const candidate of candidates) {
    const absoluteCandidates = path.isAbsolute(candidate)
      ? [path.resolve(candidate)]
      : [path.resolve(siteRoot, candidate), path.resolve(repositoryRoot, candidate)];

    for (const absolutePath of absoluteCandidates) {
      const repoPath = absoluteToRepoPath(absolutePath);
      if (repoPath?.toLowerCase().endsWith('.md')) return repoPath;
    }
  }

  return undefined;
}

function addToIndex(index, key, repoPath) {
  const normalizedKey = key.normalize('NFC').toLocaleLowerCase('zh-CN');
  const matches = index.get(normalizedKey) ?? [];
  matches.push(repoPath);
  index.set(normalizedKey, matches);
}

function buildIndexes() {
  if (assetIndex && markdownIndex) return;

  assetIndex = new Map();
  markdownIndex = new Map();

  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const absolutePath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || ignoredDirectories.has(entry.name)) continue;
        walk(absolutePath);
        continue;
      }

      if (!entry.isFile()) continue;
      const repoPath = absoluteToRepoPath(absolutePath);
      if (!repoPath) continue;
      const extension = path.extname(entry.name).toLowerCase();

      if (imageExtensions.has(extension)) {
        addToIndex(assetIndex, entry.name, repoPath);
      } else if (extension === '.md') {
        addToIndex(markdownIndex, entry.name, repoPath);
        addToIndex(markdownIndex, path.basename(entry.name, extension), repoPath);
      }
    }
  }

  walk(repositoryRoot);
}

function existingCandidate(candidate) {
  const repoPath = normalizeRepoPath(candidate);
  if (!repoPath) return undefined;
  const absolutePath = path.resolve(repositoryRoot, ...repoPath.split('/'));
  return existsSync(absolutePath) ? repoPath : undefined;
}

function decodePath(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function resolveAsset(target, sourcePath) {
  const cleanTarget = decodePath(target.trim()).replace(/^\/+/, '');
  const sourceDirectory = sourcePath ? path.posix.dirname(sourcePath) : undefined;
  const candidates = [
    sourceDirectory ? path.posix.join(sourceDirectory, cleanTarget) : undefined,
    sourceDirectory ? path.posix.join(sourceDirectory, '文本附件', cleanTarget) : undefined,
    cleanTarget,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const existing = existingCandidate(candidate);
    if (existing && imageExtensions.has(path.posix.extname(existing).toLowerCase())) return existing;
  }

  buildIndexes();
  const basename = path.posix.basename(cleanTarget).normalize('NFC').toLocaleLowerCase('zh-CN');
  const globalMatches = assetIndex.get(basename) ?? [];
  return globalMatches.length === 1 ? globalMatches[0] : undefined;
}

function resolveMarkdown(target, sourcePath) {
  const withoutAnchor = decodePath(target.trim()).split('#', 1)[0].replace(/^\/+/, '');
  const markdownTarget = withoutAnchor.toLowerCase().endsWith('.md')
    ? withoutAnchor
    : `${withoutAnchor}.md`;
  const sourceDirectory = sourcePath ? path.posix.dirname(sourcePath) : undefined;
  const candidates = [
    sourceDirectory ? path.posix.join(sourceDirectory, markdownTarget) : undefined,
    markdownTarget,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const existing = existingCandidate(candidate);
    if (existing?.toLowerCase().endsWith('.md')) return existing;
  }

  buildIndexes();
  const directKey = path.posix.basename(markdownTarget).normalize('NFC').toLocaleLowerCase('zh-CN');
  const stemKey = path.posix.basename(markdownTarget, '.md').normalize('NFC').toLocaleLowerCase('zh-CN');
  const globalMatches = markdownIndex.get(directKey) ?? markdownIndex.get(stemKey) ?? [];
  return globalMatches.length === 1 ? globalMatches[0] : undefined;
}

function encodeRepoPath(value) {
  return value.split('/').filter(Boolean).map(encodeURIComponent).join('/');
}

function baseUrl(base, pathname) {
  const normalizedBase = `/${base || ''}`.replace(/\/+/g, '/').replace(/\/+$/, '');
  return `${normalizedBase}/${pathname.replace(/^\/+/, '')}`.replace(/\/{2,}/g, '/');
}

function normalizeLabel(value) {
  const normalized = value
    .normalize('NFKC')
    .replace(/\p{Cf}/gu, '')
    .toLocaleLowerCase('zh-CN')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return Array.from(normalized || 'item').slice(0, 64).join('');
}

function fnv1a(value) {
  let hash = 0x811c9dc5;
  for (const character of value.normalize('NFC')) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function noteId(sourcePath) {
  const title = path.posix.basename(sourcePath, path.posix.extname(sourcePath));
  return `${normalizeLabel(title)}--${fnv1a(sourcePath)}`;
}

function markdownImage(repoPath, alt, base) {
  return {
    type: 'image',
    url: baseUrl(base, `media/${encodeRepoPath(repoPath)}`),
    alt,
    data: {
      hProperties: {
        className: ['markdown-image'],
        loading: 'lazy',
        decoding: 'async',
      },
    },
  };
}

function splitWikiTarget(rawValue) {
  const separator = rawValue.indexOf('|');
  if (separator === -1) return { target: rawValue.trim(), label: undefined };
  return {
    target: rawValue.slice(0, separator).trim(),
    label: rawValue.slice(separator + 1).trim() || undefined,
  };
}

function transformWikiText(value, sourcePath, base) {
  const withoutBlockId = value.replace(/\s+\^[A-Za-z0-9-]+\s*$/u, '');
  const matcher = /(!?)\[\[([^\]]+)\]\]/gu;
  const result = [];
  let lastIndex = 0;
  let match;

  while ((match = matcher.exec(withoutBlockId))) {
    if (match.index > lastIndex) {
      result.push({ type: 'text', value: withoutBlockId.slice(lastIndex, match.index) });
    }

    const isImage = match[1] === '!';
    const { target, label } = splitWikiTarget(match[2]);

    if (isImage) {
      const assetPath = resolveAsset(target, sourcePath);
      result.push(
        assetPath
          ? markdownImage(assetPath, label ?? path.posix.basename(target), base)
          : { type: 'text', value: `[图片未收录：${label ?? path.posix.basename(target)}]` },
      );
    } else {
      const [targetPath, anchor] = target.split('#', 2);
      const markdownPath = resolveMarkdown(targetPath, sourcePath);
      const linkLabel = label ?? path.posix.basename(targetPath, path.posix.extname(targetPath));

      if (markdownPath) {
        const anchorSuffix = anchor ? `#${encodeURIComponent(anchor)}` : '';
        result.push({
          type: 'link',
          url: `${baseUrl(base, `notes/${encodeURIComponent(noteId(markdownPath))}/`)}${anchorSuffix}`,
          children: [{ type: 'text', value: linkLabel }],
        });
      } else {
        result.push({ type: 'text', value: linkLabel });
      }
    }

    lastIndex = matcher.lastIndex;
  }

  if (lastIndex < withoutBlockId.length) {
    result.push({ type: 'text', value: withoutBlockId.slice(lastIndex) });
  }

  return result.length === 1 && result[0].type === 'text' && result[0].value === value
    ? undefined
    : result;
}

function transformCallouts(tree) {
  visit(tree, 'blockquote', (node) => {
    const firstParagraph = node.children?.[0];
    const firstText = firstParagraph?.type === 'paragraph' ? firstParagraph.children?.[0] : undefined;
    if (firstText?.type !== 'text') return;

    const match = firstText.value.match(/^\[!([a-z\d_-]+)\]([+-])?\s*(.*)$/iu);
    if (!match) return;

    const type = match[1].toLocaleLowerCase('en-US');
    const title = match[3].trim() || calloutLabels[type] || type;
    firstParagraph.children.splice(0, 1, {
      type: 'strong',
      children: [{ type: 'text', value: title }],
      data: { hProperties: { className: ['callout-title'] } },
    });
    node.data = {
      ...(node.data ?? {}),
      hName: 'aside',
      hProperties: {
        className: ['callout', `callout-${type}`],
        'data-callout': type,
      },
    };
  });
}

function transformSeparators(tree) {
  visit(tree, (node, index, parent) => {
    if (index === undefined || !parent?.children) return;

    if (node.type === 'html' && /^<center>\s*=+\s*<\/center>\s*$/iu.test(node.value)) {
      parent.children[index] = { type: 'thematicBreak' };
      return;
    }

    if (node.type !== 'paragraph') return;
    const rawValue = node.children
      ?.map((child) => (child.type === 'text' || child.type === 'html' ? child.value : ''))
      .join('');
    if (/^<center>\s*=+\s*<\/center>\s*$/iu.test(rawValue ?? '')) {
      parent.children[index] = { type: 'thematicBreak' };
    }
  });
}

function normalizeHeadingLevels(tree) {
  visit(tree, 'heading', (node) => {
    // The article template owns the single page-level heading.
    if (node.depth === 1) node.depth = 2;
  });
}

function transformTextNodes(tree, sourcePath, base) {
  const targets = [];
  visit(tree, 'text', (node, index, parent) => {
    if (index === undefined || !parent?.children || parent.type === 'link') return;
    targets.push({ node, index, parent });
  });

  for (const { node, index, parent } of targets.reverse()) {
    const replacement = transformWikiText(node.value, sourcePath, base);
    if (replacement) parent.children.splice(index, 1, ...replacement);
  }
}

function transformImages(tree, sourcePath, base) {
  visit(tree, 'image', (node) => {
    const widthMatch = node.alt?.match(/^(.*?)\|(\d{2,4})$/u);
    if (widthMatch) node.alt = widthMatch[1].trim();

    const properties = {
      ...(node.data?.hProperties ?? {}),
      className: ['markdown-image'],
      loading: 'lazy',
      decoding: 'async',
    };
    if (widthMatch) properties.width = Math.min(1200, Math.max(40, Number(widthMatch[2])));

    node.data = { ...(node.data ?? {}), hProperties: properties };
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/iu.test(node.url)) return;

    const assetPath = resolveAsset(node.url, sourcePath);
    if (assetPath) node.url = baseUrl(base, `media/${encodeRepoPath(assetPath)}`);
  });
}

function transformMarkdownLinks(tree, sourcePath, base) {
  visit(tree, 'link', (node) => {
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/iu.test(node.url)) return;
    const [targetPath, anchor] = node.url.split('#', 2);
    if (!targetPath.toLowerCase().endsWith('.md')) return;

    const markdownPath = resolveMarkdown(targetPath, sourcePath);
    if (!markdownPath) return;
    node.url = `${baseUrl(base, `notes/${encodeURIComponent(noteId(markdownPath))}/`)}${
      anchor ? `#${encodeURIComponent(anchor)}` : ''
    }`;
  });
}

export function remarkObsidian(options = {}) {
  const base = options.base ?? '';

  return (tree, file) => {
    const sourcePath = sourceFilePath(file);
    normalizeHeadingLevels(tree);
    transformSeparators(tree);
    transformCallouts(tree);
    transformTextNodes(tree, sourcePath, base);
    transformImages(tree, sourcePath, base);
    transformMarkdownLinks(tree, sourcePath, base);
  };
}

export default remarkObsidian;
