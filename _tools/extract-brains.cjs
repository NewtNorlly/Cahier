// 提取所有 md 中的 brain 源码块（##### `brain ... `），输出到 _tools/_brains.txt 供人工分级
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const files = [
  '土地资源管理/9月4日讲稿.md',
  '宪法/9月6日讲稿.md',
  '知识产权法基础理论/9月4日讲稿.md',
  '知识产权法基础理论/9月5日讲稿.md',
  '民事诉讼法/9月6日讲稿.md',
  '德语/9月4日讲稿.md',
];
let out = '';
for (const rel of files) {
  const lines = fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\n');
  let inBrain = false, depth = 0;
  out += `\n\n========== ${rel} ==========\n`;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^#{2,6}\s*`brain\b/.test(l)) { inBrain = true; out += `[brain start @line ${i+1}]\n`; continue; }
    if (inBrain) {
      if (/`\s*$/.test(l) && l.trim().startsWith('-')) { out += l.replace(/`\s*$/, '') + '\n'; inBrain = false; out += `[brain end @line ${i+1}]\n`; continue; }
      out += l + '\n';
    }
  }
  if (inBrain) out += '[brain UNCLOSED!]\n';
}
fs.writeFileSync(path.join(__dirname, '_brains.txt'), out, 'utf8');
console.log('written, chars:', out.length);
