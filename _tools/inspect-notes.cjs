// 提取各讲稿「## 批注与笔记」块，输出结构供清洗映射
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
  const start = lines.findIndex(l => /^##\s*批注与笔记/.test(l));
  console.log('\n\n========== ' + rel + ' (block @' + (start+1) + ', total ' + lines.length + ') ==========');
  if (start < 0) { console.log('NO BLOCK'); continue; }
  console.log(lines.slice(start, start + 40).join('\n'));
}
