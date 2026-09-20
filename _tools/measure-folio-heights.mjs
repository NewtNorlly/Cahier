// 逐页报告 folio 真实高度与卡片总高，找出超过 A4(1086) 的页。
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { join } from "node:path";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const url = process.argv[2];
const WIDTH = 1536, PORT = 9600 + Math.floor(Math.random()*200);
const prof = join(process.env.TEMP, `cdp-${Date.now()}`);
const chrome = spawn(CHROME, ["--headless=new","--disable-gpu","--hide-scrollbars",
  `--remote-debugging-port=${PORT}`,`--user-data-dir=${prof}`,"--no-first-run",
  "--no-default-browser-check",`--window-size=${WIDTH},1000`,"about:blank"], { stdio: "ignore" });
async function getJson(p){for(let i=0;i<40;i++){try{return await(await fetch(`http://127.0.0.1:${PORT}${p}`)).json();}catch{await sleep(250);}}throw new Error("no cdp");}
const ver=await getJson("/json/version"); const ws=new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r,e)=>{ws.onopen=r;ws.onerror=e;});
let id=0;const pending=new Map();
ws.onmessage=(ev)=>{const m=JSON.parse(ev.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}};
function send(method,params={},sessionId){const mid=++id;return new Promise(res=>{pending.set(mid,res);ws.send(JSON.stringify({id:mid,method,params,sessionId}));});}
const {result:tgt}=await send("Target.createTarget",{url:"about:blank"});
const sessionId=(await send("Target.attachToTarget",{targetId:tgt.targetId,flatten:true})).result.sessionId;
const S=(m,p={})=>send(m,p,sessionId);
await S("Page.enable");await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride",{width:WIDTH,height:1000,deviceScaleFactor:1,mobile:false});
await S("Page.navigate",{url});
await S("Runtime.evaluate",{expression:"new Promise(r=>{if(document.readyState==='complete')r();else window.addEventListener('load',()=>setTimeout(r,1200));})",awaitPromise:true});
await sleep(900);
await S("Runtime.evaluate",{expression:`(async()=>{document.querySelectorAll('img').forEach(im=>{im.loading='eager';});const h=document.body.scrollHeight;for(let y=0;y<=h;y+=700){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,40));}await Promise.all([...document.querySelectorAll('img')].map(im=>im.complete?Promise.resolve():im.decode().catch(()=>{})));window.scrollTo(0,0);})()`,awaitPromise:true});
await sleep(1000);
const expr=`(function(){
 return [...document.querySelectorAll('.folio')].map((f,i)=>{
   const cards=[...f.querySelectorAll('.slide-block')];
   let cardSum=0; cards.forEach(c=>{const st=getComputedStyle(c);cardSum+=Math.round(c.getBoundingClientRect().height+parseFloat(st.marginBottom));});
   return {page:i+1, slides:cards.map(c=>Number(c.getAttribute('data-slide'))), folioH:Math.round(f.getBoundingClientRect().height), cardSum};
 });
})()`;
const val=(await S("Runtime.evaluate",{expression:expr,returnByValue:true})).result.result.value;
for(const v of val) console.log(`p${v.page} slides=[${v.slides}] folioH=${v.folioH} cardSum=${v.cardSum}${v.folioH>1086?'  <<< 超高':''}`);
ws.close();chrome.kill();process.exit(0);
