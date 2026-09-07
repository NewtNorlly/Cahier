const fs=require('fs'),path=require('path');
const roots=['中国法制史','决策理论与方法','土地资源管理','宪法','德语','文献笔记','民事诉讼法','知识产权法基础理论','社会保障学','脑图集'];
let bad=[];
function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(e.name.endsWith('.md')){
  const lines=fs.readFileSync(p,'utf8').split(/\r?\n/);
  lines.forEach((ln,i)=>{
    // 一行内出现 >=2 个 "||" 且含 --- 分隔 => 压扁的表格
    const dbl=(ln.match(/\|\|/g)||[]).length;
    if(dbl>=2 && /-{3,}/.test(ln)) bad.push(p+':'+(i+1));
  });
}}}
roots.forEach(r=>{if(fs.existsSync(r))walk(r);});
console.log(bad.length?bad.join('\n'):'no flattened tables');
