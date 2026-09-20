// 测量课件每个 .slide-block 的真实渲染高度与每页配对情况，用于校准 SLIDE_FIXED。
// 用法: node measure-slides.mjs <url>
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const url = process.argv[2];
const WIDTH = Number(process.argv[3] || 1536);
const PORT = 9333 + Math.floor(Math.random() * 200);
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
await sleep(1200);
// 强制所有图片立即加载（无头不触发懒加载），再逐屏滚动触发解码，最后回到顶部
await S("Runtime.evaluate", { expression: `(async()=>{
  document.querySelectorAll('img').forEach(im=>{im.loading='eager';im.decoding='async';if(im.dataset.src)im.src=im.dataset.src;});
  const h=document.body.scrollHeight;
  for(let y=0;y<=h;y+=700){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,60));}
  await Promise.all([...document.querySelectorAll('img')].map(im=>im.complete?Promise.resolve():im.decode().catch(()=>{})));
  window.scrollTo(0,0);
})()`, awaitPromise: true });
await sleep(1200);

const expr = `(function(){
  const folios=[...document.querySelectorAll('.folio')];
  const pages=folios.map((f,i)=>{
    const cards=[...f.querySelectorAll('.slide-block')].map(c=>{
      const cs=getComputedStyle(c);
      return {slide:c.getAttribute('data-slide'),
        h:Math.round(c.getBoundingClientRect().height),
        outer:Math.round(c.getBoundingClientRect().height+parseFloat(cs.marginBottom))};
    });
    const r=f.getBoundingClientRect();
    return {page:i+1, n:cards.length, folioH:Math.round(r.height),
      cards:cards.map(c=>c.outer), sum:cards.reduce((a,b)=>a+b.outer,0),
      slides:cards.map(c=>c.slide)};
  });
  return {count:folios.length, pages};
})()`;
const val = (await S("Runtime.evaluate", { expression: expr, returnByValue: true })).result.result.value;
let solo=0, pair=0, overflow=0;
val.pages.forEach(p=>{
  if(p.n===1)solo++; else if(p.n>=2)pair++;
  if(p.folioH>1095)overflow++;
  console.log(`P${String(p.page).padStart(2)} n=${p.n} folioH=${p.folioH} sum=${p.sum} slides=[${p.slides.join(',')}] cards=[${p.cards.join(',')}]`);
});
console.log(`\n总页=${val.count} 独占=${solo} 配对=${pair} 超高(>1095)=${overflow}`);
ws.close(); chrome.kill(); process.exit(0);
