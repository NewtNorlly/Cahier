// 只测量不逐页截图：每个 .folio 的填充率、页码贴底情况；支持指定视口宽（测移动端）。
// 用法: node measure-fill.mjs <url> [width=1536]
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
  throw new Error("CDP unreachable");
}
const ver = await getJson("/json/version");
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r, e) => { ws.onopen = r; ws.onerror = e; });
let id = 0; const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
function send(method, params = {}, sid) { const mid = ++id; return new Promise((res) => { pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params, sessionId: sid })); }); }
const { result: tgt } = await send("Target.createTarget", { url: "about:blank" });
const sessionId = (await send("Target.attachToTarget", { targetId: tgt.targetId, flatten: true })).result.sessionId;
const S = (m, p = {}) => send(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: 1000, deviceScaleFactor: 1, mobile: false });
await S("Page.navigate", { url });
await S("Runtime.evaluate", {
  expression: "new Promise(r=>{if(document.readyState==='complete')setTimeout(r,400);else window.addEventListener('load',()=>setTimeout(r,1200));})",
  awaitPromise: true,
});
await S("Runtime.evaluate", { expression: `(async()=>{
  document.querySelectorAll('img').forEach(im=>{im.loading='eager';});
  for(let y=0;y<document.body.scrollHeight;y+=700){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,30));}
  await Promise.all([...document.querySelectorAll('img')].map(im=>im.complete?Promise.resolve():im.decode().catch(()=>{})));
  window.scrollTo(0,0);
})()`, awaitPromise: true });
await sleep(500);

const expr = `(function(){
  const fs=[...document.querySelectorAll('.folio')];
  const pages=fs.map((f,i)=>{
    const r=f.getBoundingClientRect();
    let cb=0;
    f.querySelectorAll('.folio__band').forEach(b=>{const br=b.getBoundingClientRect();cb=Math.max(cb,br.bottom-r.top);});
    const pn=f.querySelector('.folio__pageno');
    const pr=pn?pn.getBoundingClientRect():null;
    return {i:i+1,h:Math.round(r.height),cb:Math.round(cb),
      fill:+(cb/r.height).toFixed(3),
      pnTop:pr?Math.round(pr.top-r.top):null,
      pnGap:pr?Math.round(r.height-(pr.bottom-r.top)):null};
  });
  return {count:fs.length,viewport:innerWidth,pages};
})()`;
const v = (await S("Runtime.evaluate", { expression: expr, returnByValue: true })).result.result.value;
const ps = v.pages;
const fills = ps.map(p => p.fill).sort((a, b) => a - b);
const median = fills[Math.floor(fills.length / 2)];
const avg = fills.reduce((a, b) => a + b, 0) / fills.length;
const last = ps[ps.length - 1];
console.log(`viewport=${v.viewport} folio=${v.count} fill avg=${avg.toFixed(3)} median=${median} min=${fills[0]} 末页fill=${last.fill}(P${last.i})`);
const low = ps.filter(p => p.fill < 0.72 && p.i !== ps.length);
console.log(`非末页且 fill<0.72: ${low.length}`);
low.forEach(p => console.log(`  P${p.i} fill=${p.fill} h=${p.h} cb=${p.cb} blank=${p.h - p.cb} pnGap=${p.pnGap}`));
const over = ps.filter(p => p.h > 1090);
console.log(`桌面超高页(h>1090): ${over.length}`);
over.slice(0, 15).forEach(p => console.log(`  P${p.i} h=${p.h} cb=${p.cb}`));
const pnBad = ps.filter(p => p.pnGap != null && p.pnGap > 40);
console.log(`页码未贴底(pnGap>40): ${pnBad.length}`);
pnBad.slice(0, 15).forEach(p => console.log(`  P${p.i} pnGap=${p.pnGap} pnTop=${p.pnTop} h=${p.h}`));
ws.close(); chrome.kill(); process.exit(0);
