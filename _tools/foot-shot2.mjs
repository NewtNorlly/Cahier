// 页脚截图：把页脚滚入活动视口后按视口坐标裁剪（规避超越视口图片不绘制）。
// 用法: node foot-shot2.mjs <url> <outPng> [width] [night]
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { join, dirname } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const [url, out, widthArg, night] = process.argv.slice(2);
const WIDTH = Number(widthArg || 1536), VH = Number(process.argv[5] || 1000);
const PORT = 9333 + Math.floor(Math.random() * 200);
const prof = join(process.env.TEMP, `cdp-${Date.now()}`);
const chrome = spawn(CHROME, ["--headless=new","--disable-gpu","--hide-scrollbars",`--remote-debugging-port=${PORT}`,`--user-data-dir=${prof}`,"--no-first-run","--no-default-browser-check",`--window-size=${WIDTH},${VH}`,"about:blank"],{stdio:"ignore"});
async function getJson(p){for(let i=0;i<40;i++){try{return await(await fetch(`http://127.0.0.1:${PORT}${p}`)).json();}catch{await sleep(250);}}throw new Error("x");}
const ver=await getJson("/json/version");const ws=new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r,e)=>{ws.onopen=r;ws.onerror=e;});
let id=0;const pending=new Map();
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}};
function send(method,params={},sid){const mid=++id;return new Promise(res=>{pending.set(mid,res);ws.send(JSON.stringify({id:mid,method,params,sessionId:sid}));});}
const {result:tgt}=await send("Target.createTarget",{url:"about:blank"});
const sessionId=(await send("Target.attachToTarget",{targetId:tgt.targetId,flatten:true})).result.sessionId;
const S=(m,p={})=>send(m,p,sessionId);
await S("Page.enable");await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride",{width:WIDTH,height:VH,deviceScaleFactor:1,mobile:false});
await S("Page.navigate",{url});
await S("Runtime.evaluate",{expression:"new Promise(r=>window.addEventListener('load',()=>setTimeout(r,600)))",awaitPromise:true});
if(night){await S("Runtime.evaluate",{expression:"localStorage.setItem('cahier-theme','night')"});await S("Page.navigate",{url});await S("Runtime.evaluate",{expression:"new Promise(r=>window.addEventListener('load',()=>setTimeout(r,600)))",awaitPromise:true});}
const rect=await S("Runtime.evaluate",{expression:`(async()=>{
 document.querySelectorAll('img').forEach(im=>{im.loading='eager';});
 const f=document.querySelector('.site-footer');const r=f.getBoundingClientRect();
 const targetY=Math.max(0,window.scrollY+r.top+ r.height/2 - innerHeight/2);
 window.scrollTo(0,targetY);
 for(let y=targetY;y<targetY+innerHeight+400;y+=200){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,30));}
 await Promise.all([...document.querySelectorAll('.foot-art')].map(im=>im.complete?Promise.resolve():im.decode().catch(()=>{})));
 const st=document.createElement('style');st.textContent='.foot-layer,.foot-leaf{animation:none!important;transform:none!important}';document.head.appendChild(st);
 window.scrollTo(0,targetY);await new Promise(r=>setTimeout(r,2500));
 const r2=f.getBoundingClientRect();
 return {top:Math.round(r2.top),h:Math.round(r2.height),scrollY:Math.round(window.scrollY)};
})()`,awaitPromise:true,returnByValue:true});
const v=rect.result.result.value;
const clipY=Math.max(0,v.top);
const shot=await S("Page.captureScreenshot",{format:"png",clip:{x:0,y:clipY,width:WIDTH,height:Math.min(v.h+4,320),scale:1}});
if(!shot.result||!shot.result.data){console.error("capture error",JSON.stringify(shot).slice(0,300));process.exit(1);}
const result=shot.result;
mkdirSync(dirname(out),{recursive:true});
writeFileSync(out,Buffer.from(result.data,"base64"));
console.log(out,v);
ws.close();chrome.kill();process.exit(0);
