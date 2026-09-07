// 统一 10 个集合目录下所有 .md 的行尾为 LF（修复历史脚本造成的 CRLF/LF 混合）
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIRS = [
  '中国法制史', '决策理论与方法', '土地资源管理', '宪法', '德语',
  '文献笔记', '民事诉讼法', '知识产权法基础理论', '社会保障学', '脑图集',
];

let changed = 0;
for (const dir of DIRS) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  const walk = (d) => {
    for (const name of fs.readdirSync(d)) {
      const f = path.join(d, name);
      const st = fs.statSync(f);
      if (st.isDirectory()) { walk(f); continue; }
      if (!name.endsWith('.md')) continue;
      const raw = fs.readFileSync(f, 'utf8');
      const norm = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      if (norm !== raw) { fs.writeFileSync(f, norm, 'utf8'); changed++; console.log('LF normalized:', path.relative(ROOT, f)); }
    }
  };
  walk(abs);
}
console.log('done, files changed:', changed);
