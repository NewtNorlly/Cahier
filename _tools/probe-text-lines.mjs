// 采集所有课件卡片内 li / 段落的 CJK、Latin 字数与渲染高度（行高28.1），用于回归字容。
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { join } from "node:path";
import { appendFileSync } from "node:fs";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const urls = process.argv.slice(2);
const WIDTH = 1536;
const prof = join(process.env.TEMP, `cdp-${Date.now()}`);
const chrome = spawn(CHROME, ["--headless=new","--disable-gpu","--hide-scrollbars",
  `--remote-debugging-port=9731`,`--user-data-dir=${prof}`,"--no-first-run",
  "--no-default-browser-check",`--window-size=${WIDTH},1000`,"about:blank"], { stdio: "ignore" });
async function getJson(p){for(let i=0;i<40;i++){try{return await(await fetch(`http://127.0.0.1:9731${p}`)).json();}catch{await sleep(250);}}throw new Error("no cdp");}
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
const expr=`(function(){
 function count(t){let cjk=0,lat=0;for(const ch of t){if(/\\s/.test(ch))continue;if(/[\\u3400-\\u9fff\\uf900-\\ufaff]/.test(ch))cjk++;else lat++;}return [cjk,lat];}
 const rows=[];
 const grab=(els,kind)=>els.forEach(el=>{
   // 只取直接文本，不含子列表（li 内可能嵌套 ul）
   let t=''; el.childNodes.forEach(n=>{if(n.nodeType===3)t+=n.textContent; if(n.nodeType===1&&n.tagName!=='UL'&&n.tagName!=='OL'&&!n.querySelector('ul,ol'))t+=n.textContent;});
   const [cjk,lat]=count(t);
   const h=Math.round(el.getBoundingClientRect().height*10)/10;
   const depth=(function(){let d=0,p=el.parentElement;while(p&&!p.classList.contains('slide-block')){if(p.tagName==='UL'||p.tagName==='OL')d++;p=p.parentElement;}return d;})();
   rows.push({kind,depth,cjk,lat,h});
 });
 document.querySelectorAll('.slide-block').forEach(c=>{
   grab([...c.querySelectorAll('li')].filter(li=>!li.querySelector('img,table')),'li');
   grab([...c.querySelectorAll(':scope > p, :scope > h1,:scope > h2,:scope > h3,:scope > h4')].filter(p=>!p.querySelector('img,table')),'p');
 });
 return rows;
})()`;
for(const url of urls){
  await S("Page.navigate",{url});
  await S("Runtime.evaluate",{expression:"new Promise(r=>{if(document.readyState==='complete')r();else window.addEventListener('load',()=>setTimeout(r,1000));})",awaitPromise:true});
  await sleep(800);
  const val=(await S("Runtime.evaluate",{expression:expr,returnByValue:true})).result.result.value;
  val.forEach(v=>console.log([v.kind,v.depth,v.cjk,v.lat,v.h].join('\t')));
}
ws.close();chrome.kill();process.exit(0);
