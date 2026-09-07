// 扫描所有集合 md 中不规范的 $$ 块公式：同行紧贴文字、或 $$$$ 相连
const fs = require('fs');
const path = require('path');
const roots = ['中国法制史','决策理论与方法','土地资源管理','宪法','德语','文献笔记','民事诉讼法','知识产权法基础理论','社会保障学','脑图集'];
let problems = 0;
for (const root of roots) {
  const dir = path.join(root);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.md')) continue;
    const fp = path.join(dir, f);
    const lines = fs.readFileSync(fp, 'utf8').split(/\r?\n/);
    lines.forEach((ln, i) => {
      // 一行内出现 $$ ... $$ 且后面/前面紧贴中文（非纯公式独占）
      const m = ln.match(/\$\$/g);
      if (!m) return;
      const count = m.length;
      const trimmed = ln.trim();
      if (count >= 2) {
        // 同行开闭：若 $$ 前后还有中文/字母文字则为紧贴
        const before = trimmed.slice(0, trimmed.indexOf('$$'));
        const lastClose = trimmed.lastIndexOf('$$');
        const tail = trimmed.slice(lastClose + 2);
        if (before.trim() || tail.trim()) {
          console.log(`[inline-block] ${root}/${f}:${i+1}: ${trimmed.slice(0,70)}`);
          problems++;
        }
        if (count >= 4) { console.log(`[quad-$] ${root}/${f}:${i+1}`); problems++; }
      } else if (count === 1) {
        // 单个 $$ 行：若同行还夹着非空白中文文字（不是纯 $$ 或 $$公式开头）
        const rest = trimmed.replace('$$','').trim();
        // 允许 "$$\\begin..." 这种公式起始独占行
        if (/[一-龥]/.test(rest) && !/^\\/.test(rest)) {
          console.log(`[mixed-line] ${root}/${f}:${i+1}: ${trimmed.slice(0,70)}`);
          problems++;
        }
      }
    });
  }
}
console.log('total problems:', problems);
