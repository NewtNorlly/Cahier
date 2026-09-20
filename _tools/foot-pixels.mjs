import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { join } from "node:path";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const url = process.argv[2];
const PORT = 9333 + Math.floor(Math.random() * 200);
const prof = join(process.env.TEMP, `cdp-${Date.now()}`);
const chrome = spawn(CHROME, ["--headless=new","--disable-gpu",`--remote-debugging-port=${PORT}`,`--user-data-dir=${prof}`,"--no-first-run","--no-default-browser-check","--window-size=1536,1000","about:blank"],{stdio:"ignore"});
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
await S("Page.navigate",{url});
await S("Runtime.evaluate",{expression:"new Promise(r=>window.addEventListener('load',()=>setTimeout(r,800)))",awaitPromise:true});
const out=await S("Runtime.evaluate",{expression:`(async function(){
 const res=[];
 for(const im of document.querySelectorAll('.foot-art')){
   await im.decode().catch(()=>{});
   const c=document.createElement('canvas');c.width=196;c.height=Math.round(im.naturalHeight*196/im.naturalWidth);
   const x=c.getContext('2d');x.drawImage(im,0,0,c.width,c.height);
   const band=(y0,y1)=>{let r=0,g=0,b=0,n=0;const d=x.getImageData(0,y0,c.width,y1-y0).data;for(let i=0;i<d.length;i+=4){r+=d[i];g+=d[i+1];b+=d[i+2];n++;}return [Math.round(r/n),Math.round(g/n),Math.round(b/n)];};
   res.push({src:im.currentSrc.split('/').pop(),top:band(2,Math.round(c.height*0.3)),mid:band(Math.round(c.height*0.4),Math.round(c.height*0.6)),bottom:band(Math.round(c.height*0.75),c.height-2)});
 }
 return res;
})()`,awaitPromise:true,returnByValue:true});
console.log(JSON.stringify(out.result.result.value,null,1));
ws.close();chrome.kill();process.exit(0);
