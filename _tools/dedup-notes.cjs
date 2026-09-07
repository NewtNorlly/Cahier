// 对每个 col:L 块内的列表项做归并：若条目 A 文本是 B 的前缀（A 更短/无句末标点），删除 A，保留最完整者
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const DIRS = ['中国法制史','决策理论与方法','土地资源管理','宪法','德语','文献笔记','民事诉讼法','知识产权法基础理论','社会保障学','脑图集'];
const END = /[。！？；：…）)】」』.!?;:]$/;
function norm(s){ return s.replace(/\s+/g,''); }
let total = 0;
for (const dir of DIRS) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  for (const name of fs.readdirSync(abs)) {
    if (!name.endsWith('.md')) continue;
    const fp = path.join(abs, name);
    const lines = fs.readFileSync(fp,'utf8').split('\n');
    let inL = false, removed = 0;
    // 收集每个 L 块区间
    const blocks = [];
    let bstart=-1;
    lines.forEach((l,i)=>{
      if (/^<!--col:L-->/.test(l)) { bstart=i; }
      else if (/^<!--col:[MR]-->/.test(l) || /^<!--\/folio-->/.test(l)) { if (bstart>=0){blocks.push([bstart,i]);bstart=-1;} }
    });
    if (bstart>=0) blocks.push([bstart, lines.length]);
    // 从后往前处理每个块
    blocks.slice().reverse().forEach(([s,e])=>{
      const items=[];
      for (let i=s+1;i<e;i++){ const m=lines[i].match(/^- (.*)$/); if(m) items.push({i, t:norm(m[1]), raw:lines[i]}); }
      const drop=new Set();
      for (const a of items) for (const b of items) {
        if (a.i===b.i) continue;
        if (b.t.startsWith(a.t) && b.t.length>a.t.length) { drop.add(a.i); } // a 是 b 前缀
        else if (a.t.startsWith(b.t) && a.t.length>b.t.length && !END.test(a.t.slice(-1))) {
          // a 以 b 开头但 a 自身被截断无标点，而 b 完整 -> 不处理（保留更长 a，drop b）
          if (END.test(b.t.slice(-1))) {} else drop.add(b.i);
        }
      }
      // 删除被 drop 的行及其后空行
      const idxs=[...drop].sort((x,y)=>y-x);
      for (const i of idxs){ lines.splice(i,1); removed++; }
    });
    if (removed){ fs.writeFileSync(fp, lines.join('\n'),'utf8'); total+=removed; console.log('dedup', removed, path.relative(ROOT,fp)); }
  }
}
console.log('total removed:', total);
