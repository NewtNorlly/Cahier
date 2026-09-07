// dry-run：按 folio 切分，收集每页「新增」fn-ref 注号，与该页 footnotes 块按 fn-break 切出的条目数比对
const fs = require('fs');
const path = require('path');
const fp = path.resolve(__dirname, '..', '文献笔记/全球知识产权治理博弈的深层话语构造：中国范式和中国路径_邵科.md');
const lines = fs.readFileSync(fp,'utf8').split('\n');
let folio = -1; const folios = [];
let cur = null;
lines.forEach((l,i)=>{
  if (/^<!--folio:/.test(l)) { cur = {start:i, body:[], notes:null}; folios.push(cur); }
  if (cur) cur.body.push(l);
});
let globalSeen = new Set();
folios.forEach((f,idx)=>{
  const text = f.body.join('\n');
  // 正文（排除 footnotes 块）里的 fn-ref
  const mainText = text.replace(/<div class="folio-footnotes">[\s\S]*?<\/div>/g,'');
  const refs = [...mainText.matchAll(/fn-ref">〔(\d+)〕/g)].map(m=>+m[1]);
  const newRefs = [...new Set(refs)].filter(n=>!globalSeen.has(n)).sort((a,b)=>a-b);
  newRefs.forEach(n=>globalSeen.add(n));
  // footnotes 块
  const m = text.match(/<div class="folio-footnotes">([\s\S]*?)<\/div>/);
  let items = 0, hasLabel=false;
  if (m) {
    let inner = m[1].replace(/<span class="folio-footnotes__label">.*?<\/span>/g,'');
    hasLabel = /folio-footnotes__label/.test(m[1]);
    const parts = inner.split(/<br class="fn-break">/).map(s=>s.trim()).filter(Boolean);
    items = parts.length;
  }
  const flag = (m && items!==newRefs.length) ? '  <<< MISMATCH' : '';
  console.log(`folio${idx+1}: newRefs=[${newRefs.join(',')}] count=${newRefs.length} | fnItems=${items} label=${hasLabel}${flag}`);
});
