// 用法: node replace-fn.cjs <folio序号(1-based)> <新脚注html文件>
// 替换法学文献 md 中指定 folio 内的 <div class="folio-footnotes">...</div>
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const MD = path.join(ROOT, '文献笔记/全球知识产权治理博弈的深层话语构造：中国范式和中国路径_邵科.md');
const targetFolio = +process.argv[2];
const newHtml = fs.readFileSync(path.resolve(process.argv[3]), 'utf8').trim();
let lines = fs.readFileSync(MD, 'utf8').split('\n');
// 找 folio 区间
let fIdx = 0, fStart = -1, fEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (/^<!--folio:/.test(lines[i])) { fIdx++; if (fIdx === targetFolio) fStart = i; }
  if (fStart >= 0 && /^<!--\/folio-->/.test(lines[i])) { fEnd = i; break; }
}
if (fStart < 0) { console.error('folio not found'); process.exit(1); }
let dStart = -1, dEnd = -1;
for (let i = fStart; i < fEnd; i++) {
  if (/^<div class="folio-footnotes">/.test(lines[i])) dStart = i;
  if (dStart >= 0 && /^<\/div>/.test(lines[i])) { dEnd = i; break; }
}
if (dStart < 0) { console.error('footnotes div not found in folio', targetFolio); process.exit(1); }
const newLines = newHtml.split('\n');
lines.splice(dStart, dEnd - dStart + 1, ...newLines);
fs.writeFileSync(MD, lines.join('\n'), 'utf8');
console.log(`replaced folio${targetFolio} footnotes: old lines ${dStart+1}-${dEnd+1} -> ${newLines.length} lines`);
