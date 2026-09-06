import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteDirectory = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const outputDirectory = path.join(siteDirectory, 'dist');
const repositoryBase = `/${process.env.SITE_BASE ?? ''}`.replace(/\/+/g, '/').replace(/\/+$/, '/');
const localOrigin = 'https://local.invalid';
const htmlFiles = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolutePath);
    if (entry.isFile() && entry.name.endsWith('.html')) htmlFiles.push(absolutePath);
  }
}

function pageUrlFor(filePath) {
  const relativePath = path.relative(outputDirectory, filePath).replace(/\\/g, '/');
  const pathname = relativePath === 'index.html'
    ? repositoryBase
    : `${repositoryBase}${relativePath.replace(/index\.html$/, '')}`;
  return new URL(pathname, localOrigin);
}

function decodeHtmlAttribute(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function localTargetExists(pathname) {
  if (!pathname.startsWith(repositoryBase)) return false;

  let relativePath;
  try {
    relativePath = decodeURIComponent(pathname.slice(repositoryBase.length));
  } catch {
    return false;
  }

  const parts = relativePath.split('/').filter(Boolean);
  const candidate = path.resolve(outputDirectory, ...parts);
  const relativeCheck = path.relative(outputDirectory, candidate);
  if (relativeCheck.startsWith('..') || path.isAbsolute(relativeCheck)) return false;

  const targets = pathname.endsWith('/') || parts.length === 0
    ? [path.join(candidate, 'index.html')]
    : [candidate, path.join(candidate, 'index.html')];

  for (const target of targets) {
    try {
      await access(target);
      return true;
    } catch {
      // Try the next representation of the same local URL.
    }
  }

  return false;
}

await walk(outputDirectory);

const brokenLinks = [];
const attributePattern = /\b(?:href|src)=(?:"([^"]+)"|'([^']+)')/gu;

for (const htmlFile of htmlFiles) {
  const html = (await readFile(htmlFile, 'utf8')).replace(/<script[\s\S]*?<\/script>/gi, '');
  const pageUrl = pageUrlFor(htmlFile);

  for (const match of html.matchAll(attributePattern)) {
    const rawValue = decodeHtmlAttribute(match[1] ?? match[2] ?? '').trim();
    if (!rawValue || rawValue.startsWith('#')) continue;
    if (/^(?:data:|mailto:|tel:|javascript:)/iu.test(rawValue)) continue;

    let targetUrl;
    try {
      targetUrl = new URL(rawValue, pageUrl);
    } catch {
      brokenLinks.push({ page: pageUrl.pathname, target: rawValue, reason: 'URL 无法解析' });
      continue;
    }

    if (targetUrl.origin !== localOrigin) continue;
    if (!(await localTargetExists(targetUrl.pathname))) {
      brokenLinks.push({ page: pageUrl.pathname, target: rawValue, reason: '本地产物不存在' });
    }
  }
}

if (brokenLinks.length > 0) {
  const details = brokenLinks
    .slice(0, 30)
    .map(({ page, target, reason }) => `- ${page} → ${target}（${reason}）`)
    .join('\n');
  throw new Error(`发现 ${brokenLinks.length} 个失效的站内资源或链接：\n${details}`);
}

console.log(`已检查 ${htmlFiles.length} 个 HTML 页面，站内链接与资源均可解析。`);
