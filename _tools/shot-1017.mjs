// 1017 批次截图：支持白昼/夜间、桌面 1536 / 移动 390，按 folio 序号截取。
// 用法:
//   node shot-1017.mjs light  <url> <outdir> <folioIndex1> [folioIndex2 ...]
//   node shot-1017.mjs night  <url> <outdir> <folioIndex1> [folioIndex2 ...]
//   node shot-1017.mjs mobile <url> <outpath>   (只截首屏视口)
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { join, dirname } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const mode = process.argv[2];
const url = process.argv[3];
const out = process.argv[4];
const folioIndexes = process.argv.slice(5).map(Number);
const MOBILE = mode === "mobile";
const WIDTH = MOBILE ? 390 : 1536;
const HEIGHT = MOBILE ? 844 : 1086;
const PORT = 9600 + Math.floor(Math.random() * 300);
const prof = join(process.env.TEMP, `cdp-shot1017-${Date.now()}`);
mkdirSync(MOBILE ? dirname(out) : out, { recursive: true });
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, "--no-first-run",
  "--no-default-browser-check", `--window-size=${WIDTH},${HEIGHT}`, "about:blank"], { stdio: "ignore" });
async function getJson(p) { for (let i = 0; i < 40; i++) { try { return await (await fetch(`http://127.0.0.1:${PORT}${p}`)).json(); } catch { await sleep(250); } } throw new Error("no cdp"); }
const ver = await getJson("/json/version");
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r, e) => { ws.onopen = r; ws.onerror = e; });
let id = 0; const pending = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
function send(method, params = {}, sessionId) { const mid = ++id; return new Promise(res => { pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params, sessionId })); }); }
const { result: tgt } = await send("Target.createTarget", { url: "about:blank" });
const sid = (await send("Target.attachToTarget", { targetId: tgt.targetId, flatten: true })).result.sessionId;
const S = (m, p = {}) => send(m, p, sid);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: MOBILE ? 2 : 1, mobile: MOBILE });
// 夜间模式：先在目标源落地一次再写 localStorage，再重新加载（about:blank 源下写入无效）
await S("Page.navigate", { url });
await S("Runtime.evaluate", { expression: "new Promise(r=>{if(document.readyState==='complete')setTimeout(r,200);else window.addEventListener('load',()=>setTimeout(r,400));})", awaitPromise: true });
if (mode === "night") {
  await S("Runtime.evaluate", { expression: "localStorage.setItem('cahier-theme','night')" });
  await S("Page.navigate", { url });
}
await S("Runtime.evaluate", { expression: "new Promise(r=>{if(document.readyState==='complete')setTimeout(r,500);else window.addEventListener('load',()=>setTimeout(r,1000));})", awaitPromise: true });
await S("Runtime.evaluate", { expression: "document.fonts?document.fonts.ready.then(()=>new Promise(r=>setTimeout(r,400))):new Promise(r=>setTimeout(r,400))", awaitPromise: true });
await S("Runtime.evaluate", { expression: `(async()=>{document.querySelectorAll('img').forEach(im=>{im.loading='eager';});const h=document.body.scrollHeight;for(let y=0;y<=h;y+=700){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,30));}await Promise.all([...document.querySelectorAll('img')].map(im=>im.complete?Promise.resolve():im.decode().catch(()=>{})));window.scrollTo(0,0);})()`, awaitPromise: true });
await sleep(500);

if (MOBILE) {
  const shot = await S("Page.captureScreenshot", { format: "webp", quality: 78 });
  writeFileSync(out, Buffer.from(shot.result.data, "base64"));
  console.log("saved", out);
} else {
  const rects = (await S("Runtime.evaluate", { expression: `[...document.querySelectorAll('.folio')].map(f=>{const r=f.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y+window.scrollY),w:Math.ceil(r.width),h:Math.ceil(r.height)};})`, returnByValue: true })).result.result.value;
  for (const idx of folioIndexes) {
    const r = rects[idx];
    if (!r) { console.log("skip missing folio", idx); continue; }
    const shot = await S("Page.captureScreenshot", { format: "webp", quality: 72, captureBeyondViewport: true, clip: { x: r.x, y: r.y, width: r.w, height: r.h, scale: 1 } });
    const p = join(out, `p${String(idx + 1).padStart(3, "0")}-${mode}.webp`);
    writeFileSync(p, Buffer.from(shot.result.data, "base64"));
    console.log(`saved ${p} (${r.w}x${r.h})`);
  }
}
ws.close(); chrome.kill(); process.exit(0);
