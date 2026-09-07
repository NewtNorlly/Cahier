/**
 * fn-break.cjs — 脚注合理分行
 * 在 div.folio-footnotes 内按句末标点断句，句间插入 <br class="fn-break">
 * 保护：al．/pp．/p．/No．/Vol．/Rev． 等缩写点
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGET = process.argv[2] || 'all';
const ROOTS = ['中国法制史','决策理论与方法','土地资源管理','宪法','德语','文献笔记','民事诉讼法','知识产权法基础理论','社会保障学','脑图集'];

function listMd() {
  const out = [];
  for (const r of ROOTS) {
    const dir = path.join(ROOT, r);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) if (f.endsWith('.md')) out.push(path.join(dir, f));
  }
  return out;
}

function breakFootnotes(s) {
  const lines = s.split('\n');
  let inFn = false;
  const out = [];
  for (const line of lines) {
    if (/<div class="folio-footnotes">/.test(line)) inFn = true;
    if (inFn && line.trim() && !/<span class="folio-footnotes__label">/.test(line)) {
      let t = line;
      // 0) 撤销旧断句（保证幂等，配合新保护重新断）
      t = t.replace(/<br class="fn-break">/g, '');
      // 1) 保护缩写点：al．(、pp．/p．/No．/Vol．/Rev． 后接数字、字母前点后大写（J．Transnat'l、C．Davis）
      const dots = [];
      t = t.replace(/((?:al|pp|p|no|No|vol|Vol|rev|Rev)．(?=\d|\(eds))|([A-Za-z])．(?=[A-Z])/g, (m) => {
        dots.push(m); return '\u0001DOT' + (dots.length - 1) + '\u0002';
      });
      // 2) 断句：句末标点后跟大写/数字/中文/括号 → 换行
      t = t.replace(/([。．])(?=\s*[A-Za-z（(〔0-9]|[\u4e00-\u9fff])/g, '$1\n');
      t = t.replace(/\u0001DOT(\d+)\u0002/g, (_, i) => dots[Number(i)]);
      // 3) \n → <br class="fn-break">
      t = t.replace(/\n/g, '<br class="fn-break">');
      out.push(t);
    } else {
      out.push(line);
    }
    if (/<\/div>/.test(line)) inFn = false;
  }
  return out.join('\n');
}

let n = 0;
for (const p of listMd()) {
  const r = path.relative(ROOT, p);
  if (TARGET !== 'all' && !r.includes(TARGET)) continue;
  const s = fs.readFileSync(p, 'utf8');
  const out = breakFootnotes(s);
  if (out !== s) { fs.writeFileSync(p, out, 'utf8'); console.log('fn-break:', r); n++; }
}
console.log('done, changed:', n);
