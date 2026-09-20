// 课件视觉验收截图：强制加载全部图片后，截取封面 + 含横排图/表格的页 + 最高的若干页。
// 用法: node shot-slides.mjs <url> <outDir> [width] [maxShots]
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const url = process.argv[2];
const outDir = process.argv[3];
const WIDTH = Number(process.argv[4] || 1536);
const MAXSHOTS = Number(process.argv[5] || 12);
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
await S("Runtime.evaluate", { expression: `(async()=>{
  document.querySelectorAll('img').forEach(im=>{im.loading='eager';im.decoding='async';if(im.dataset.src)im.src=im.dataset.src;});
  const h=document.body.scrollHeight;
  for(let y=0;y<=h;y+=700){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,60));}
  await Promise.all([...document.querySelectorAll('img')].map(im=>im.complete?Promise.resolve():im.decode().catch(()=>{})));
  window.scrollTo(0,0);
})()`, awaitPromise: true });
await sleep(1000);

const expr = `(function(){
  const folios=[...document.querySelectorAll('.folio')];
  return folios.map((f,i)=>{
    const r=f.getBoundingClientRect();
    return {page:i+1, top:Math.round(r.top+window.scrollY), h:Math.round(r.height),
      fig:!!f.querySelector('.slide-figrow'), table:!!f.querySelector('table'),
      cover:!!f.querySelector('.slide-block--cover'), cards:f.querySelectorAll('.slide-block').length};
  });
})()`;
const pages = (await S("Runtime.evaluate", { expression: expr, returnByByValue: true, returnByValue: true })).result.result.value;
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "pages.json"), JSON.stringify(pages, null, 1));

// 选页：封面必选；含横排图/表格的页必选；其余按高度补到 MAXSHOTS
const pick = new Set();
pages.forEach((p) => { if (p.cover || p.fig || p.table) pick.add(p.page); });
const byTall = [...pages].sort((a, b) => b.h - a.h).map((p) => p.page);
for (const pn of byTall) { if (pick.size >= MAXSHOTS) break; pick.add(pn); }
const shotList = [...pick].sort((a, b) => a - b).slice(0, MAXSHOTS);

for (const pn of shotList) {
  const p = pages[pn - 1];
  const { result } = await S("Page.captureScreenshot", {
    format: "png",
    clip: { x: 0, y: p.top, width: WIDTH, height: Math.min(p.h, 1400), scale: 1 },
    captureBeyondViewport: true,
  });
  writeFileSync(join(outDir, `p${String(pn).padStart(2, "0")}.png`), Buffer.from(result.data, "base64"));
  console.log(`shot p${pn} h=${p.h} cards=${p.cards}${p.fig ? " fig" : ""}${p.table ? " table" : ""}${p.cover ? " cover" : ""}`);
}
console.log(`共 ${pages.length} 页，截取 ${shotList.length} 页 -> ${outDir}`);
ws.close(); chrome.kill(); process.exit(0);
