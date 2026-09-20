// 抽样测量课件卡片内各类元素的真实渲染高度，用于校准估算器。
// 用法: node probe-slide-elements.mjs <url> [slideNumbers...]
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const url = process.argv[2];
const want = process.argv.slice(3).map(Number);
const WIDTH = 1536, PORT = 9455 + Math.floor(Math.random()*300);
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
await sleep(900);
const expr=`(function(){
 const out=[];
 document.querySelectorAll('.slide-block').forEach(card=>{
   const sn=Number(card.getAttribute('data-slide'));
   if (arguments[0] && arguments[0].length && !arguments[0].includes(sn)) return;
   const rec=(el)=>{const r=el.getBoundingClientRect();const cs=getComputedStyle(el);return {tag:el.tagName.toLowerCase(),cls:(el.className&&el.className.baseVal!==undefined?el.className.baseVal:el.className)||'',h:Math.round(r.height),w:Math.round(r.width),mt:parseFloat(cs.marginTop),mb:parseFloat(cs.marginBottom)};};
   const els=[...card.children].map(rec);
   const imgs=[...card.querySelectorAll('img')].map(im=>({src:(im.getAttribute('src')||'').split('/').pop(),h:Math.round(im.getBoundingClientRect().height),w:Math.round(im.getBoundingClientRect().width),nat:im.naturalWidth+'x'+im.naturalHeight}));
   out.push({slide:sn, cardH:Math.round(card.getBoundingClientRect().height), els, imgs});
 });
 return out;
})(${JSON.stringify(want)})`;
const val=(await S("Runtime.evaluate",{expression:expr,returnByValue:true})).result.result.value;
console.log(JSON.stringify(val,null,1));
ws.close();chrome.kill();process.exit(0);
