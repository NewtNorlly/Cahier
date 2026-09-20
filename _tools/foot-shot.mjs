// 截取站底水彩横带在白昼/夜间两种主题下的效果。
// 用法: node foot-shot.mjs <url> <outDir> [width]
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const url = process.argv[2];
const outDir = process.argv[3];
const WIDTH = Number(process.argv[4] || 1536);
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

mkdirSync(outDir, { recursive: true });

async function shoot(theme, file) {
  await S("Page.navigate", { url });
  await S("Runtime.evaluate", { expression: "new Promise(r=>{if(document.readyState==='complete')r();else window.addEventListener('load',()=>setTimeout(r,800));})", awaitPromise: true });
  if (theme === "night") {
    await S("Runtime.evaluate", { expression: `localStorage.setItem('cahier-theme','night');` });
    await S("Page.navigate", { url });
    await S("Runtime.evaluate", { expression: "new Promise(r=>window.addEventListener('load',()=>setTimeout(r,800)))", awaitPromise: true });
  }
  // 滚到底部 + 强制加载图片
  await S("Runtime.evaluate", { expression: `(async()=>{
    document.querySelectorAll('img').forEach(im=>{im.loading='eager';im.decoding='async';});
    window.scrollTo(0,document.body.scrollHeight);
    for(let y=document.body.scrollHeight;y>=0;y-=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,40));}
    window.scrollTo(0,document.body.scrollHeight);
    await Promise.all([...document.querySelectorAll('.foot-art')].map(im=>im.complete?Promise.resolve():im.decode().catch(()=>{})));
    await new Promise(r=>setTimeout(r,600));
  })()`, awaitPromise: true });
  const rect = (await S("Runtime.evaluate", { expression: `(function(){const f=document.querySelector('.site-footer');const r=f.getBoundingClientRect();return {top:Math.round(r.top+window.scrollY),h:Math.round(r.height)};})()`, returnByValue: true })).result.result.value;
  const { result } = await S("Page.captureScreenshot", {
    format: "png",
    clip: { x: 0, y: rect.top, width: WIDTH, height: Math.min(rect.h, 700), scale: 1 },
    captureBeyondViewport: true,
  });
  writeFileSync(join(outDir, file), Buffer.from(result.data, "base64"));
  console.log(file, rect);
}

await shoot("cobalt", "footer-day.png");
await shoot("night", "footer-night.png");
ws.close(); chrome.kill(); process.exit(0);
