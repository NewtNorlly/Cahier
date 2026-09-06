import { copyFile, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteDirectory = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const repositoryRoot = path.resolve(siteDirectory, '..');
const mediaDirectory = path.resolve(siteDirectory, 'public', 'media');
const allowedExtensions = new Set(['.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp']);
const skippedDirectories = new Set([
  '.git',
  '.github',
  '.makemd',
  '.obsidian',
  '.space',
  '.trash',
  'AI 指令',
  'node_modules',
  'site',
  '_pdf-staging',
  'game',
  'images',
  'bgm',
]);

if (!mediaDirectory.startsWith(`${path.resolve(siteDirectory, 'public')}${path.sep}`)) {
  throw new Error(`拒绝清理意外目录：${mediaDirectory}`);
}

await rm(mediaDirectory, { recursive: true, force: true });
await mkdir(mediaDirectory, { recursive: true });

const copied = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;

    const sourcePath = path.join(directory, entry.name);
    const relativePath = path.relative(repositoryRoot, sourcePath);

    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || skippedDirectories.has(entry.name)) continue;
      await walk(sourcePath);
      continue;
    }

    if (!entry.isFile() || !allowedExtensions.has(path.extname(entry.name).toLowerCase())) {
      continue;
    }

    const destinationPath = path.join(mediaDirectory, relativePath);
    await mkdir(path.dirname(destinationPath), { recursive: true });
    await copyFile(sourcePath, destinationPath);

    const fileStat = await stat(sourcePath);
    copied.push({
      path: relativePath.replace(/\\/g, '/'),
      bytes: fileStat.size,
    });
  }
}

await walk(repositoryRoot);
copied.sort((left, right) => left.path.localeCompare(right.path, 'zh-CN'));

await writeFile(
  path.join(mediaDirectory, '_manifest.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), files: copied }, null, 2)}\n`,
  'utf8',
);

const totalBytes = copied.reduce((sum, file) => sum + file.bytes, 0);
console.log(`已同步 ${copied.length} 个图片资源（${(totalBytes / 1024 / 1024).toFixed(2)} MiB）。`);
