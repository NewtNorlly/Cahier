const fs=require('fs'),path=require('path');
const roots=['中国法制史','决策理论与方法','土地资源管理','宪法','德语','文献笔记','民事诉讼法','知识产权法基础理论','社会保障学','脑图集'];
let hits=[];
function stripInline(s){ // 去掉合法的 **bold** *em* `code` 后再数剩余 *
  return s.replace(/`[^`]*`/g,'').replace(/\*\*[^*]+\*\*/g,'').replace(/(?<!\*)\*[^*]+\*(?!\*)/g,'');
}
function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(e.name.endsWith('.md')){
  fs.readFileSync(p,'utf8').split(/\r?\n/).forEach((ln,i)=>{
    if(/^\s*[-*]\s/.test(ln))return;           // 列表
    if(/^\s*<!--/.test(ln))return;
    const rest=stripInline(ln);
    const stars=(rest.match(/\*/g)||[]).length;
    if(stars%2===1) hits.push(`${p}:${i+1}: ${ln.trim().slice(0,60)}`);
  });
}}}
roots.forEach(r=>{if(fs.existsSync(r))walk(r);});
console.log(hits.length?hits.join('\n'):'no odd asterisks');
