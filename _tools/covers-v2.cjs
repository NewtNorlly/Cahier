/**
 * covers-v2.cjs — 10 组学院派清新封面重设计（反批量化：差异化配色/元素，少码字）
 * 每组：960×1280 竖版 → 480×640 → 960_thumb
 * 输出：各集合目录 covers/ 下 {slug}-960.webp / -480.webp / -960_thumb.webp
 */
const sharp = require('C:/Users/NewtN/下载/Cahier-main/site/node_modules/sharp');
const fs = require('fs');
const path = require('path');

const SPECS = [
  {
    slug: 'legal-history', dir: '中国法制史', no: 'Nº 01', kind: '教学讲稿',
    bg: '#f6f0e2', ink: '#3a3226', accent: '#b07b3f', sub: '#8a7a5c',
    title: ['中国法制史'], subtitle: 'CHINESE LEGAL HISTORY',
    deco: 'bronze',
  },
  {
    slug: 'decision-theory', dir: '决策理论与方法', no: 'Nº 02', kind: '教学讲稿',
    bg: '#e9eef4', ink: '#2c3e50', accent: '#5b7d9e', sub: '#7c8fa3',
    title: ['决策理论', '与方法'], subtitle: 'DECISION THEORY & METHOD',
    deco: 'tree',
  },
  {
    slug: 'land-resource', dir: '土地资源管理', no: 'Nº 03', kind: '教学讲稿',
    bg: '#e9efe4', ink: '#38512f', accent: '#6f8a5a', sub: '#85947a',
    title: ['土地资源', '管理'], subtitle: 'LAND RESOURCE MANAGEMENT',
    deco: 'contour',
  },
  {
    slug: 'constitution', dir: '宪法', no: 'Nº 04', kind: '教学讲稿',
    bg: '#faf7f0', ink: '#b03a2e', accent: '#c2655b', sub: '#9a8578',
    title: ['宪法'], subtitle: 'CONSTITUTION',
    deco: 'lines',
  },
  {
    slug: 'german', dir: '德语', no: 'Nº 05', kind: '教学讲稿',
    bg: '#f2ead8', ink: '#4a3b2a', accent: '#a8833f', sub: '#9c8d72',
    title: ['德语'], subtitle: 'DEUTSCH',
    deco: 'flag',
  },
  {
    slug: 'legal-zhishichanquan', dir: '文献笔记', no: 'Nº 06', kind: '文献笔记',
    bg: '#e6ecf0', ink: '#2f4a5e', accent: '#4f7590', sub: '#7d93a3',
    title: ['全球知识产权', '治理'], subtitle: '中国范式与中国路径',
    deco: 'globe',
  },
  {
    slug: 'civil-procedure', dir: '民事诉讼法', no: 'Nº 07', kind: '教学讲稿',
    bg: '#f7f3ec', ink: '#3d5a4a', accent: '#7b9c86', sub: '#97a89c',
    title: ['民事诉讼法'], subtitle: 'CIVIL PROCEDURE LAW',
    deco: 'scale',
  },
  {
    slug: 'ip-theory', dir: '知识产权法基础理论', no: 'Nº 08', kind: '教学讲稿',
    bg: '#efeaf3', ink: '#5a4a6a', accent: '#8f7aa5', sub: '#a393b3',
    title: ['知识产权法', '基础理论'], subtitle: 'INTELLECTUAL PROPERTY LAW',
    deco: 'lamp',
  },
  {
    slug: 'social-security', dir: '社会保障学', no: 'Nº 09', kind: '教学讲稿',
    bg: '#f7ede4', ink: '#8a5a33', accent: '#c08a5e', sub: '#b39a82',
    title: ['社会保障学'], subtitle: 'SOCIAL SECURITY',
    deco: 'umbrella',
  },
  {
    slug: 'brain-atlas', dir: '脑图集', no: 'Nº 10', kind: '课程草稿',
    bg: '#f6ebee', ink: '#8a4a5e', accent: '#c07a90', sub: '#b695a1',
    title: ['脑图集'], subtitle: 'BRAIN ATLAS',
    deco: 'wave',
  },
];

function deco(d, ink, accent) {
  switch (d) {
    case 'bronze': // 回纹条
      return `<g>
        <rect x="180" y="470" width="600" height="3" fill="${accent}"/>
        <rect x="180" y="800" width="600" height="3" fill="${accent}"/>
        <rect x="180" y="477" width="3" height="320" fill="${accent}" opacity="0.35"/>
        <rect x="777" y="477" width="3" height="320" fill="${accent}" opacity="0.35"/>
      </g>`;
    case 'tree': // 决策树节点
      return `<g stroke="${accent}" stroke-width="2.5" fill="none" opacity="0.75">
        <line x1="480" y1="560" x2="330" y2="700"/><line x1="480" y1="560" x2="630" y2="700"/>
        <line x1="330" y1="700" x2="250" y2="830"/><line x1="330" y1="700" x2="410" y2="830"/>
        <line x1="630" y1="700" x2="550" y2="830"/><line x1="630" y1="700" x2="710" y2="830"/>
        <circle cx="480" cy="545" r="16" fill="${ink}"/>
        <circle cx="330" cy="700" r="10" fill="${accent}"/>
        <circle cx="630" cy="700" r="10" fill="${accent}"/>
        <circle cx="250" cy="830" r="6" fill="${accent}"/><circle cx="410" cy="830" r="6" fill="${accent}"/>
        <circle cx="550" cy="830" r="6" fill="${accent}"/><circle cx="710" cy="830" r="6" fill="${accent}"/>
      </g>`;
    case 'contour': // 等高线
      return `<g stroke="${accent}" stroke-width="1.6" fill="none" opacity="0.7">
        <ellipse cx="480" cy="660" rx="150" ry="72"/><ellipse cx="480" cy="660" rx="225" ry="112"/>
        <ellipse cx="480" cy="660" rx="300" ry="152"/><ellipse cx="480" cy="660" rx="360" ry="192"/>
      </g>`;
    case 'lines': // 条文竖线
      return `<g stroke="${accent}" stroke-width="1.2" opacity="0.5">
        <line x1="220" y1="520" x2="220" y2="860"/>
        <line x1="255" y1="520" x2="255" y2="860"/>
        <line x1="290" y1="520" x2="290" y2="860"/>
        <line x1="325" y1="520" x2="325" y2="860"/>
        <line x1="690" y1="520" x2="690" y2="860"/>
      </g>`;
    case 'flag': // 三色细条
      return `<g>
        <rect x="360" y="560" width="240" height="10" fill="#2b2b2b"/>
        <rect x="360" y="570" width="240" height="10" fill="#d64541"/>
        <rect x="360" y="580" width="240" height="10" fill="#e6b422"/>
      </g>`;
    case 'globe': // 经线弧
      return `<g stroke="${accent}" stroke-width="1.8" fill="none" opacity="0.75">
        <ellipse cx="480" cy="660" rx="180" ry="180"/><ellipse cx="480" cy="660" rx="80" ry="180"/>
        <line x1="300" y1="660" x2="660" y2="660"/>
        <ellipse cx="480" cy="660" rx="180" ry="70" opacity="0.45"/>
      </g>`;
    case 'scale': // 天平
      return `<g stroke="${accent}" stroke-width="2.6" fill="none" opacity="0.8">
        <line x1="480" y1="560" x2="480" y2="820"/>
        <line x1="400" y1="610" x2="560" y2="610"/>
        <line x1="400" y1="610" x2="360" y2="660"/><line x1="400" y1="610" x2="440" y2="660"/>
        <line x1="560" y1="610" x2="520" y2="660"/><line x1="560" y1="610" x2="600" y2="660"/>
        <path d="M340 660 L380 660 L360 700 Z" fill="${ink}" stroke="none" opacity="0.55"/>
        <path d="M580 660 L620 660 L600 700 Z" fill="${ink}" stroke="none" opacity="0.55"/>
      </g>`;
    case 'lamp': // 灯泡 + 书
      return `<g>
        <circle cx="480" cy="620" r="52" fill="none" stroke="${accent}" stroke-width="2.4"/>
        <line x1="480" y1="672" x2="480" y2="700" stroke="${accent}" stroke-width="2.4"/>
        <line x1="455" y1="702" x2="505" y2="702" stroke="${accent}" stroke-width="2.4"/>
        <path d="M340 760 Q410 740 480 760 Q550 740 620 760" fill="none" stroke="${ink}" stroke-width="2" opacity="0.55"/>
      </g>`;
    case 'umbrella': // 伞
      return `<g stroke="${accent}" stroke-width="2.4" fill="none" opacity="0.8">
        <path d="M300 640 Q480 520 660 640 Z"/>
        <path d="M330 640 Q480 555 630 640" opacity="0.5"/>
        <line x1="480" y1="640" x2="480" y2="760"/>
        <path d="M440 760 Q480 780 520 760" />
      </g>`;
    case 'wave': // 脑波
      return `<g stroke="${accent}" stroke-width="2.4" fill="none" opacity="0.8">
        <path d="M240 660 Q300 600 360 660 T480 660 T600 660 T720 660"/>
        <path d="M240 720 Q300 660 360 720 T480 720 T600 720 T720 720" opacity="0.5"/>
      </g>`;
  }
}

function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

function svg(s) {
  const titleLines = s.title
    .map((ln, i) => `<text x="480" y="${668 + i * 108}" text-anchor="middle" font-family="'Noto Serif SC','SimSun','Songti SC',serif" font-size="88" font-weight="700" fill="${s.ink}" letter-spacing="${ln.length > 4 ? 6 : 16}">${esc(ln)}</text>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="1280" viewBox="0 0 960 1280">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${s.bg}"/><stop offset="1" stop-color="${s.bg}" stop-opacity="0.82"/>
    </linearGradient>
  </defs>
  <rect width="960" height="1280" fill="url(#bg)"/>
  <!-- 外框 -->
  <rect x="46" y="46" width="868" height="1188" fill="none" stroke="${s.sub}" stroke-width="1.4" opacity="0.5"/>
  <!-- 顶部：CAHIER · 类别 -->
  <text x="480" y="128" text-anchor="middle" font-family="Georgia,serif" font-size="21" fill="${s.sub}" letter-spacing="8">CAHIER · ${s.kind}</text>
  <!-- 装饰 -->
  ${deco(s.deco, s.ink, s.accent)}
  <!-- 标题 -->
  ${titleLines}
  <!-- 副题 -->
  <text x="480" y="${678 + s.title.length * 108}" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="20" fill="${s.sub}" letter-spacing="4">${esc(s.subtitle)}</text>
  <!-- 底部 -->
  <text x="480" y="1150" text-anchor="middle" font-family="Georgia,serif" font-size="17" fill="${s.sub}" letter-spacing="6">ARCHIVE · 2026</text>
  <text x="120" y="1150" text-anchor="start" font-family="Georgia,serif" font-size="17" fill="${s.sub}" letter-spacing="2">${s.no}</text>
  </svg>`;
}

(async () => {
  let n = 0;
  for (const s of SPECS) {
    const buf = Buffer.from(svg(s));
    const dir = path.join(s.dir, 'covers');
    await sharp(buf).webp({ quality: 92 }).toFile(path.join(dir, `${s.slug}-960.webp`));
    await sharp(buf).resize(480, 640).webp({ quality: 88 }).toFile(path.join(dir, `${s.slug}-480.webp`));
    await sharp(buf).resize(288, 384).webp({ quality: 82 }).toFile(path.join(dir, `${s.slug}-960_thumb.webp`));
    n++;
    console.log('cover:', s.slug);
  }
  console.log('done, covers:', n);
})();
