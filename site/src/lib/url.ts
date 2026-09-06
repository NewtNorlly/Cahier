const configuredBase = import.meta.env.BASE_URL || '/';
const base = `/${configuredBase}`.replace(/\/+/g, '/').replace(/\/+$/, '/');

function isExternal(value: string): boolean {
  return /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value);
}

export function encodePath(value: string): string {
  return value
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

export function withBase(pathname = ''): string {
  if (isExternal(pathname)) return pathname;

  const cleanPath = pathname.replace(/\\/g, '/').replace(/^\/+/, '');
  return `${base}${cleanPath}`.replace(/\/{2,}/g, '/');
}

export function mediaUrl(repoRelativePath: string): string {
  return withBase(`media/${encodePath(repoRelativePath)}`);
}

export function collectionUrl(id: string): string {
  return withBase(`collections/${encodeURIComponent(id)}/`);
}

export function topicUrl(id: string): string {
  return withBase(`topics/${encodeURIComponent(id)}/`);
}

export function noteUrl(id: string): string {
  return withBase(`notes/${encodeURIComponent(id)}/`);
}

export function normalizeLabel(value: string): string {
  const normalized = value
    .normalize('NFKC')
    .replace(/\p{Cf}/gu, '')
    .toLocaleLowerCase('zh-CN')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '');

  return Array.from(normalized || 'item').slice(0, 64).join('');
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;

  for (const character of value.normalize('NFC')) {
    const codePoint = character.codePointAt(0) ?? 0;
    hash ^= codePoint;
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function stableId(label: string, sourcePath: string): string {
  return `${normalizeLabel(label)}--${fnv1a(sourcePath.replace(/\\/g, '/'))}`;
}
