// 诊断：对每个低填充页，报告上一页最后一个块、本页第一个块的标签/类/高度/文本片段
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { join } from "node:path";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const url = process.argv[2];
const WIDTH = Number(process.argv[3] || 1536);
const PORT = 9333 + Math.floor(Math.random() * 200);
const prof = join(process.env.TEMP, `cdp-${Date.now()}`);
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, "--no-first-run",
  `--window-size=${WIDTH},1000`, "about:blank"], { stdio: "ignore" });
async function gj(p){for(let i=0;i<40;i++){try{return await(await fetch(`http://127.0.0.1:${PORT}${p}`)).json();}catch{await sleep(250);}}throw new Error("no cdp");}
const ver = await gj("/json/version"); const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r,e)=>{ws.onopen=r;ws.onerror=e;});
let id=0; const pend=new Map();
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}};
function send(method,params={},sid){const mid=++id;return new Promise(res=>{pend.set(mid,res);ws.send(JSON.stringify({id:mid,method,params,sessionId:sid}));});}
const {result:t}=await send("Target.createTarget",{url:"about:blank"});
const sid=(await send("Target.attachToTarget",{targetId:t.targetId,flatten:true})).result.sessionId;
const S=(m,p={})=>send(m,p,sid);
await S("Page.enable");await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride",{width:WIDTH,height:1000,deviceScaleFactor:1,mobile:false});
await S("Page.navigate",{url});
await S("Runtime.evaluate",{expression:"new Promise(r=>{if(document.readyState==='complete')setTimeout(r,400);else window.addEventListener('load',()=>setTimeout(r,1000));})",awaitPromise:true});
await sleep(1200);
const expr=`(function(){
 const fs=[...document.querySelectorAll('.folio')];
 function info(el){ if(!el) return null; const r=el.getBoundingClientRect();
   return {tag:el.tagName.toLowerCase(), cls:el.className&&el.className.baseVal!==undefined?el.className.baseVal:(el.className||''),
     h:Math.round(r.height), txt:(el.textContent||'').replace(/\\s+/g,' ').trim().slice(0,46)}; }
 return fs.map((f,i)=>{
   const fr=f.getBoundingClientRect(); let cb=0;
   f.querySelectorAll('.folio__band').forEach(b=>{const br=b.getBoundingClientRect();cb=Math.max(cb,br.bottom-fr.top);});
   const fill=cb/fr.height;
   const mains=[...f.querySelectorAll('.folio__col--main')];
   const kids=mains.flatMap(m=>[...m.children]);
   const first=kids[0], last=kids[kids.length-1];
   const pf=fs[i-1]; let prevLast=null;
   if(pf){const pm=[...pf.querySelectorAll('.folio__col--main')].flatMap(m=>[...m.children]);prevLast=info(pm[pm.length-1]);}
   return {i:i+1,fill:+fill.toFixed(3),blank:Math.round(fr.height-cb),first:info(first),prevLast,n:kids.length};
 });
})()`;
const v=(await S("Runtime.evaluate",{expression:expr,returnByValue:true})).result.result.value;
v.forEach(p=>{
 if(p.fill<0.72 && p.i!==v.length){
  console.log(`P${p.i} fill=${p.fill} blank=${p.blank} kids=${p.n}`);
  console.log(`   prevLast:`, p.prevLast?`${p.prevLast.tag}.${p.prevLast.cls} h=${p.prevLast.h} “${p.prevLast.txt}”`:'-');
  console.log(`   first   :`, p.first?`${p.first.tag}.${p.first.cls} h=${p.first.h} “${p.first.txt}”`:'-');
 }
});
ws.close();chrome.kill();process.exit(0);
