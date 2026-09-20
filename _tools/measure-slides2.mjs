// 测量课件：每页幻灯片卡片真实外高、A4 页真实可用内容高度，输出 JSON。
// 用法: node measure-slides2.mjs <url>
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const url = process.argv[2];
const WIDTH = Number(process.argv[3] || 1536);
const PORT = 9333 + Math.floor(Math.random() * 400);
const prof = join(process.env.TEMP, `cdp-${Date.now()}`);
const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`,
  "--no-first-run", "--no-default-browser-check",
  `--window-size=${WIDTH},1000`, "about:blank",
], { stdio: "ignore" });

async function getJson(p) {
  for (let i = 0; i < 40; i++) {
    try { return await (await fetch(`http://127.0.0.1:${PORT}${p}`)).json(); }
    catch { await sleep(250); }
  }
  throw new Error("CDP not reachable");
}
const ver = await getJson("/json/version");
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r, e) => { ws.onopen = r; ws.onerror = e; });
let id = 0; const pending = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
function send(method, params = {}, sessionId) { const mid = ++id; return new Promise((res) => { pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params, sessionId })); }); }
const { result: tgt } = await send("Target.createTarget", { url: "about:blank" });
const sessionId = (await send("Target.attachToTarget", { targetId: tgt.targetId, flatten: true })).result.sessionId;
const S = (m, p = {}) => send(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: 1000, deviceScaleFactor: 1, mobile: false });
await S("Page.navigate", { url });
await S("Runtime.evaluate", { expression: "new Promise(r=>{if(document.readyState==='complete')r();else window.addEventListener('load',()=>setTimeout(r,1200));})", awaitPromise: true });
await sleep(1000);
await S("Runtime.evaluate", { expression: `(async()=>{
  document.querySelectorAll('img').forEach(im=>{im.loading='eager';im.decoding='async';if(im.dataset.src)im.src=im.dataset.src;});
  const h=document.body.scrollHeight;
  for(let y=0;y<=h;y+=700){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,50));}
  await Promise.all([...document.querySelectorAll('img')].map(im=>im.complete?Promise.resolve():im.decode().catch(()=>{})));
  window.scrollTo(0,0);
})()`, awaitPromise: true });
await sleep(1000);

const expr = `(function(){
  const first=document.querySelector('.folio');
  const cs=getComputedStyle(first);
  const pageno=first.querySelector('.folio__pageno');
  const pcs=getComputedStyle(pageno);
  const chrome={
    folioH:first.getBoundingClientRect().height,
    padT:parseFloat(cs.paddingTop), padB:parseFloat(cs.paddingBottom),
    pagenoH:pageno.getBoundingClientRect().height,
    pagenoPT:parseFloat(pcs.paddingTop)
  };
  chrome.capacity = chrome.folioH - chrome.padT - chrome.padB - chrome.pagenoH - chrome.pagenoPT;
  const folios=[...document.querySelectorAll('.folio')];
  const pages=folios.map((f,i)=>{
    const cards=[...f.querySelectorAll('.slide-block')].map(c=>{
      const st=getComputedStyle(c);
      return {slide:Number(c.getAttribute('data-slide')),
        outer:Math.round(c.getBoundingClientRect().height+parseFloat(st.marginBottom))};
    });
    return {page:i+1, slides:cards.map(c=>c.slide), cards};
  });
  return {chrome, pages};
})()`;
const val = (await S("Runtime.evaluate", { expression: expr, returnByValue: true })).result.result.value;
console.log(JSON.stringify(val));
ws.close(); chrome.kill(); process.exit(0);
