// 逐页导出中栏直接子块：tag / data-est / 真实外高（含 margin）/ 文本头；用于定位分页留白
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { join } from "node:path";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const url = process.argv[2];
const WIDTH = Number(process.argv[3] || 1536);
const pagesWanted = (process.argv[4] || "").split(",").map(Number);
const PORT = 9333 + Math.floor(Math.random() * 200);
const prof = join(process.env.TEMP, `cdp-${Date.now()}`);
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, "--no-first-run",
  `--window-size=${WIDTH},1000`, "about:blank"], { stdio: "ignore" });
async function gj(p){for(let i=0;i<40;i++){try{return await(await fetch(`http://127.0.0.1:${PORT}${p}`)).json();}catch{await sleep(250);}}throw new Error("no cdp");}
const ver=await gj("/json/version");const ws=new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r,e)=>{ws.onopen=r;ws.onerror=e;});
let id=0;const pend=new Map();
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}};
function send(method,params={},sid){const mid=++id;return new Promise(res=>{pend.set(mid,res);ws.send(JSON.stringify({id:mid,method,params,sessionId:sid}));});}
const {result:t}=await send("Target.createTarget",{url:"about:blank"});
const sid=(await send("Target.attachToTarget",{targetId:t.targetId,flatten:true})).result.sessionId;
const S=(m,p={})=>send(m,p,sid);
await S("Page.enable");await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride",{width:WIDTH,height:1000,deviceScaleFactor:1,mobile:false});
await S("Page.navigate",{url});
await S("Runtime.evaluate",{expression:"new Promise(r=>{if(document.readyState==='complete')setTimeout(r,400);else window.addEventListener('load',()=>setTimeout(r,1000));})",awaitPromise:true});
await sleep(1000);
const expr=`(function(){
 const fs=[...document.querySelectorAll('.folio')];
 return fs.map((f,idx)=>{
   const fr=f.getBoundingClientRect(); let cb=0;
   f.querySelectorAll('.folio__band').forEach(b=>{const br=b.getBoundingClientRect();cb=Math.max(cb,br.bottom-fr.top);});
   const mains=[...f.querySelectorAll('.folio__col--main')];
   const blocks=mains.flatMap(m=>[...m.children]).map(el=>{
     const cs=getComputedStyle(el);
     const real=Math.round(el.getBoundingClientRect().height+parseFloat(cs.marginTop)+parseFloat(cs.marginBottom));
     // 统计顶层 li 数 / 总 li 数
     let tli='', d0='';
     if(/^(ol|ul)$/.test(el.tagName.toLowerCase())){
       d0=' d0li='+el.children.length;
       tli=' totLi='+el.querySelectorAll('li').length;
     }
     return {s:el.tagName.toLowerCase()+'.'+(typeof el.className==='string'?el.className:''),
       est:el.getAttribute('data-est')||'-', real, li:d0+tli,
       t:(el.textContent||'').replace(/\\s+/g,' ').trim().slice(0,30)};
   });
   return {i:idx+1,h:Math.round(fr.height),cb:Math.round(cb),blank:Math.round(fr.height-cb),
     bands:mains.length,blocks};
 });
})()`;
const v=(await S("Runtime.evaluate",{expression:expr,returnByValue:true})).result.result.value;
v.forEach(p=>{
 if(!pagesWanted.length||pagesWanted.includes(p.i)){
  console.log(`\\n== P${p.i} h=${p.h} cb=${p.cb} blank=${p.blank} bands=${p.bands} ==`);
  p.blocks.forEach((b,k)=>console.log(`  ${k+1}. ${b.s} est=${b.est} real=${b.real}${b.li} “${b.t}”`));
 }
});
ws.close();chrome.kill();process.exit(0);
