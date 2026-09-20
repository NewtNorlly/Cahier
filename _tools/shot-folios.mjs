// 逐张截取页面中每个 .folio（A4 纸页），存到指定目录。
// 用法: node shot-folios.mjs <url> <outdir> [maxPages]
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const url = process.argv[2];
const outdir = process.argv[3];
const maxPages = Number(process.argv[4] || 999);
const WIDTH = 1536, PORT = 9511 + Math.floor(Math.random()*300);
const prof = join(process.env.TEMP, `cdp-${Date.now()}`);
mkdirSync(outdir, { recursive: true });
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
await S("Emulation.setDeviceMetricsOverride",{width:WIDTH,height:1086,deviceScaleFactor:1,mobile:false});
await S("Page.navigate",{url});
await S("Runtime.evaluate",{expression:"new Promise(r=>{if(document.readyState==='complete')r();else window.addEventListener('load',()=>setTimeout(r,1200));})",awaitPromise:true});
await sleep(900);
await S("Runtime.evaluate",{expression:`(async()=>{document.querySelectorAll('img').forEach(im=>{im.loading='eager';});const h=document.body.scrollHeight;for(let y=0;y<=h;y+=700){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,40));}await Promise.all([...document.querySelectorAll('img')].map(im=>im.complete?Promise.resolve():im.decode().catch(()=>{})));window.scrollTo(0,0);})()`,awaitPromise:true});
await sleep(1000);
const rects=(await S("Runtime.evaluate",{expression:`[...document.querySelectorAll('.folio')].slice(0,${maxPages}).map(f=>{const r=f.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y+window.scrollY),w:Math.ceil(r.width),h:Math.ceil(r.height)};})`,returnByValue:true})).result.result.value;
for(let i=0;i<rects.length;i++){
  const r=rects[i];
  const shot=await S("Page.captureScreenshot",{format:"webp",quality:72,captureBeyondViewport:true,clip:{x:r.x,y:r.y,width:r.w,height:r.h,scale:1}});
  const buf=Buffer.from(shot.result.data,"base64");
  const { writeFileSync }=await import("node:fs");
  writeFileSync(join(outdir,`p${String(i+1).padStart(2,"0")}.webp`),buf);
  console.log(`p${i+1} ${r.w}x${r.h}`);
}
ws.close();chrome.kill();process.exit(0);
