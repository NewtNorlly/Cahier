// 用旧版 crystal Logo 生成新的 favicon.png（256x256），钴蓝主题渐变底
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const siteDirectory = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3B82F6"/>
      <stop offset="1" stop-color="#1E3A5F"/>
    </linearGradient>
  </defs>
  <rect width="24" height="24" rx="5.2" fill="url(#g)"/>
  <g fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 4.6 L5.2 8 l6.8 3.4 L18.8 8 z"/>
    <path d="M5.2 12.4 l6.8 3.4 6.8 -3.4"/>
    <path d="M5.2 16.2 l6.8 3.4 6.8 -3.4"/>
  </g>
</svg>`;

await sharp(Buffer.from(svg), { density: 300 })
  .resize(256, 256)
  .png()
  .toFile(path.join(siteDirectory, 'public', 'favicon.png'));

console.log('favicon.png 已生成（256x256）');
