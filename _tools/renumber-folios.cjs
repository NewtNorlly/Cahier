// 统一所有讲稿/文献 md 的 folio 标签为「第N页」，按文件内出现顺序连续编号
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const DIRS = ['中国法制史','决策理论与方法','土地资源管理','宪法','德语','文献笔记','民事诉讼法','知识产权法基础理论','社会保障学','脑图集'];
for (const dir of DIRS) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  for (const name of fs.readdirSync(abs)) {
    if (!name.endsWith('.md')) continue;
    const fp = path.join(abs, name);
    const lines = fs.readFileSync(fp,'utf8').split('\n');
    let n = 0, changed = 0;
    const out = lines.map(l => {
      if (/^<!--folio:.*?-->\s*$/.test(l)) {
        n++;
        const nl = `<!--folio:第${n}页-->`;
        if (nl !== l.trim()) changed++;
        return nl;
      }
      return l;
    });
    if (changed) { fs.writeFileSync(fp, out.join('\n'),'utf8'); console.log(`renumber ${changed}:`, path.relative(ROOT,fp), `(${n} folios)`); }
    else console.log('already ok:', path.relative(ROOT,fp), `(${n})`);
  }
}
