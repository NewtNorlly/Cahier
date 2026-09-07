// dry-run：输出每篇 folio 序列与批注页码，确认映射
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const files = [
  '决策理论与方法/9月1日讲稿.md',
  '决策理论与方法/9月3日讲稿.md',
  '土地资源管理/8月31日讲稿.md',
  '土地资源管理/课程考核标准与作业一.md',
  '社会保障学/8月31日讲稿.md',
  '社会保障学/9月2日讲稿.md',
  '知识产权法基础理论/9月4日讲稿.md',
];
for (const rel of files) {
  const lines = fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\n');
  const folios = [];
  let cur = null;
  const notePages = [];
  let inNotes = false;
  lines.forEach((l, i) => {
    const fm = l.match(/^<!--folio:(.*?)-->/);
    if (fm) { cur = { label: fm[1], start: i+1, body: [] }; folios.push(cur); }
    if (/^##\s*批注与笔记/.test(l)) inNotes = true;
    if (inNotes) { const pm = l.match(/^###\s*第(\d+)页/); if (pm) notePages.push(+pm[1]); }
    if (cur && !/^<!--/.test(l)) cur.body.push(l);
  });
  const mainU = (lines.slice(0, lines.findIndex(l=>/^##\s*批注与笔记/.test(l))).join('\n').match(/<u>/g)||[]).length;
  console.log('\n== ' + rel);
  console.log('  folios(' + folios.length + '):', folios.map((f,i)=>`${i+1}:${f.label}`).join(' | '));
  console.log('  note pages:', notePages.join(','), '| main <u>:', mainU);
}
