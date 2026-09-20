// 校准：读取每个块的 data-est（构建估算高度）与真实渲染外高（含纵向 margin），按标签汇总偏差
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { join } from "node:path";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const url = process.argv[2];
const WIDTH = Number(process.argv[3] || 1536);
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
await sleep(1200);
const expr=`(function(){
 const byTag={}; const rows=[];
 document.querySelectorAll('.folio__col--main').forEach(m=>{
   [...m.children].forEach(el=>{
     const est=el.getAttribute&&el.getAttribute('data-est');
     if(est==null) return;
     const cs=getComputedStyle(el);
     const real=el.getBoundingClientRect().height+parseFloat(cs.marginTop)+parseFloat(cs.marginBottom);
     const tag=el.tagName.toLowerCase();
     byTag[tag]=byTag[tag]||{n:0,est:0,real:0};
     byTag[tag].n++; byTag[tag].est+=+est; byTag[tag].real+=real;
     rows.push({tag,est:+est,real:Math.round(real)});
   });
 });
 return {byTag,rows};
})()`;
const v=(await S("Runtime.evaluate",{expression:expr,returnByValue:true})).result.result.value;
console.log("tag  n  sumEst  sumReal  real/est");
for(const [tag,d] of Object.entries(v.byTag).sort((a,b)=>b[1].est-a[1].est)){
  console.log(`${tag} ${d.n} ${Math.round(d.est)} ${Math.round(d.real)} ${(d.real/d.est).toFixed(3)}`);
}
const te=Object.values(v.byTag).reduce((s,d)=>s+d.est,0), tr=Object.values(v.byTag).reduce((s,d)=>s+d.real,0);
console.log(`TOTAL est=${Math.round(te)} real=${Math.round(tr)} real/est=${(tr/te).toFixed(3)}`);
// 偏差最大的块
console.log("--- 最高估的 12 块 (est-real) ---");
v.rows.filter(r=>r.est>40).sort((a,b)=>(b.est-b.real)-(a.est-a.real)).slice(0,12)
 .forEach(r=>console.log(`${r.tag} est=${r.est} real=${r.real} 高估${r.est-r.real}`));
ws.close();chrome.kill();process.exit(0);
