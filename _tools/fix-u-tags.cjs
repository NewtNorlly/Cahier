// 修复 md 中被切碎的 <u></u> 下划线标签
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const DIRS = ['中国法制史','决策理论与方法','土地资源管理','宪法','德语','文献笔记','民事诉讼法','知识产权法基础理论','社会保障学','脑图集'];
let files = 0;
for (const dir of DIRS) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  for (const name of fs.readdirSync(abs)) {
    if (!name.endsWith('.md')) continue;
    const fp = path.join(abs, name);
    let t = fs.readFileSync(fp, 'utf8');
    const orig = t;
    // 1) 相邻闭合-开启直接合并（可重复到稳定）
    for (let k=0;k<5;k++) t = t.replace(/<\/u>\s*<u>/g, '');
    // 2) 序号/箭头夹在两段划线之间 -> 纳入划线
    t = t.replace(/<\/u>(\s*(?:[0-9０-９]+[.、、]|→|•)[^<]*?)<u>/g, '$1');
    for (let k=0;k<3;k++) t = t.replace(/<\/u>\s*<u>/g, '');
    // 3) 纯项目符号划线去除
    t = t.replace(/<u>\s*[•·]\s*<\/u>/g, '');
    // 4) <u> 后多余前导空白
    t = t.replace(/<u>\s+/g, '<u>');
    // 5) 空 u
    t = t.replace(/<u><\/u>/g, '');
    if (t !== orig) { fs.writeFileSync(fp, t, 'utf8'); files++; console.log('fixed u:', path.relative(ROOT,fp)); }
  }
}
console.log('files:', files);
