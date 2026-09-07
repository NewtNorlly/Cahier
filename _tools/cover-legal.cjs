// 法学文献定制封面：玉璧 · 展开书卷（会通中西的学院派意象），青瓷绿+暖金，不堆标题文字
const path = require('path');
const sharp = require('C:/Users/NewtN/下载/Cahier-main/site/node_modules/sharp');
const fs = require('fs');

const INK = '#3a4640';      // 墨青
const CELADON = '#6f9a8c';  // 青瓷绿
const GOLD = '#b89b6a';     // 暖金
const PALE = '#8fa89e';     // 淡青
const BG0 = '#f8f5ee', BG1 = '#eef2ec';

function svg() {
  // 玉璧外环等距 12 枚小金点
  const dots = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const x = 480 + Math.cos(a) * 250, y = 640 + Math.sin(a) * 250;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${i % 3 === 0 ? 5 : 3}" fill="${GOLD}" opacity="${i % 3 === 0 ? 0.9 : 0.55}"/>`;
  }).join('\n        ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="1280" viewBox="0 0 960 1280">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="75%">
      <stop offset="0" stop-color="${BG0}"/><stop offset="1" stop-color="${BG1}"/>
    </radialGradient>
  </defs>
  <rect width="960" height="1280" fill="url(#bg)"/>
  <!-- 双线外框 -->
  <rect x="48" y="48" width="864" height="1184" fill="none" stroke="${PALE}" stroke-width="1.2"/>
  <rect x="60" y="60" width="840" height="1160" fill="none" stroke="${GOLD}" stroke-width="0.8" opacity="0.6"/>

  <!-- 顶部系列标识 -->
  <text x="480" y="140" text-anchor="middle" font-family="Georgia,'Noto Serif SC',serif" font-size="22" fill="${PALE}" letter-spacing="10">CAHIER · 文 献 笔 记</text>
  <line x1="420" y1="166" x2="540" y2="166" stroke="${GOLD}" stroke-width="1.4"/>

  <!-- 玉璧（同心双环，象征会通圆满） -->
  <g>
    <circle cx="480" cy="640" r="250" fill="none" stroke="${CELADON}" stroke-width="2.2" opacity="0.85"/>
    <circle cx="480" cy="640" r="222" fill="none" stroke="${CELADON}" stroke-width="1" opacity="0.4"/>
    ${dots}
    <!-- 外环上四段断开的弧线，如玉璧纹饰 -->
    <circle cx="480" cy="640" r="250" fill="none" stroke="${INK}" stroke-width="3.4"
      stroke-dasharray="118 274" transform="rotate(-24 480 640)" opacity="0.5"/>
  </g>

  <!-- 中央展开的书卷（两页对称，中缝） -->
  <g fill="none" stroke-linecap="round">
    <path d="M480 556 L372 572 Q350 575 330 572 L330 712 Q352 708 372 710 L480 694 Z"
      fill="#fbf9f3" stroke="${INK}" stroke-width="2"/>
    <path d="M480 556 L588 572 Q610 575 630 572 L630 712 Q608 708 588 710 L480 694 Z"
      fill="#fbf9f3" stroke="${INK}" stroke-width="2"/>
    <line x1="480" y1="556" x2="480" y2="694" stroke="${GOLD}" stroke-width="2.4"/>
    <!-- 左页文字线（克制的横线，代表文本，不写字） -->
    <g stroke="${PALE}" stroke-width="1.6" opacity="0.8">
      <line x1="352" y1="600" x2="460" y2="586"/><line x1="352" y1="624" x2="460" y2="610"/>
      <line x1="352" y1="648" x2="460" y2="634"/><line x1="352" y1="672" x2="438" y2="660"/>
    </g>
    <!-- 右页文字线 -->
    <g stroke="${PALE}" stroke-width="1.6" opacity="0.8">
      <line x1="500" y1="586" x2="608" y2="600"/><line x1="500" y1="610" x2="608" y2="624"/>
      <line x1="500" y1="634" x2="608" y2="648"/><line x1="522" y1="660" x2="608" y2="672"/>
    </g>
  </g>

  <!-- 书卷下方一枚小印 -->
  <g>
    <rect x="455" y="772" width="50" height="50" rx="4" fill="none" stroke="#a8543f" stroke-width="2"/>
    <text x="480" y="807" text-anchor="middle" font-family="'Noto Serif SC',serif" font-size="26" fill="#a8543f">会通</text>
  </g>

  <!-- 底部标识 -->
  <text x="480" y="1118" text-anchor="middle" font-family="Georgia,serif" font-size="18" fill="${PALE}" letter-spacing="8">GLOBAL GOVERNANCE · CHINESE PARADIGM</text>
  <text x="120" y="1172" text-anchor="start" font-family="Georgia,serif" font-size="18" fill="${GOLD}" letter-spacing="2">Nº 06</text>
  <text x="840" y="1172" text-anchor="end" font-family="Georgia,serif" font-size="18" fill="${PALE}" letter-spacing="6">ARCHIVE · 2026</text>
</svg>`;
}

(async () => {
  const dir = path.join('文献笔记', 'covers');
  const buf = Buffer.from(svg());
  fs.writeFileSync(path.join('_tools', '_legal-cover.svg'), svg(), 'utf8');
  await sharp(buf).webp({ quality: 92 }).toFile(path.join(dir, 'legal-zhishichanquan-960.webp'));
  await sharp(buf).resize(480, 640).webp({ quality: 88 }).toFile(path.join(dir, 'legal-zhishichanquan-480.webp'));
  await sharp(buf).resize(288, 384).webp({ quality: 82 }).toFile(path.join(dir, 'legal-zhishichanquan-960_thumb.webp'));
  console.log('legal cover regenerated');
})();
