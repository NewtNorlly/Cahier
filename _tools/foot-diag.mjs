import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { join } from "node:path";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const url = process.argv[2];
const PORT = 9333 + Math.floor(Math.random() * 200);
const prof = join(process.env.TEMP, `cdp-${Date.now()}`);
const chrome = spawn(CHROME, ["--headless=new","--disable-gpu","--hide-scrollbars",`--remote-debugging-port=${PORT}`,`--user-data-dir=${prof}`,"--no-first-run","--no-default-browser-check","--window-size=1536,1000","about:blank"],{stdio:"ignore"});
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
await S("Emulation.setDeviceMetricsOverride",{width:1536,height:1000,deviceScaleFactor:1,mobile:false});
await S("Page.navigate",{url});
await S("Runtime.evaluate",{expression:"new Promise(r=>window.addEventListener('load',()=>setTimeout(r,1000)))",awaitPromise:true});
await S("Runtime.evaluate",{expression:`(async()=>{document.querySelectorAll('img').forEach(im=>im.loading='eager');window.scrollTo(0,document.body.scrollHeight);await Promise.all([...document.querySelectorAll('.foot-art')].map(im=>im.complete?Promise.resolve():im.decode().catch(e=>String(e))));await new Promise(r=>setTimeout(r,800));})()`,awaitPromise:true});
const out=await S("Runtime.evaluate",{expression:`(function(){
 const scene=document.querySelector('.foot-scene');const footer=document.querySelector('.site-footer');
 const imgs=[...document.querySelectorAll('.foot-art')].map(im=>{const cs=getComputedStyle(im);const r=im.getBoundingClientRect();return {src:im.currentSrc.split('/').pop(),complete:im.complete,nw:im.naturalWidth,nh:im.naturalHeight,opacity:cs.opacity,vis:cs.visibility,w:Math.round(r.width),h:Math.round(r.height),top:Math.round(r.top+scrollY)};});
 const layers=[...document.querySelectorAll('.foot-layer')].map(l=>{const cs=getComputedStyle(l);const r=l.getBoundingClientRect();return {cls:l.className,z:cs.zIndex,op:cs.opacity,w:Math.round(r.width),h:Math.round(r.height),top:Math.round(r.top+scrollY),overflow:cs.overflow};});
 const sr=scene?scene.getBoundingClientRect():null;const fr=footer?footer.getBoundingClientRect():null;
 return {imgs,layers,scene:sr&&{h:Math.round(sr.height),top:Math.round(sr.top+scrollY)},footer:fr&&{h:Math.round(fr.height),top:Math.round(fr.top+scrollY)}};
})()`,returnByValue:true});
console.log(JSON.stringify(out.result.result.value,null,1));
ws.close();chrome.kill();process.exit(0);
