// 首页/合集页桌面整页截图（白昼/夜间）
// 用法: node shot-home-1017.mjs <light|night> <url> <outpath>
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { join, dirname } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const mode = process.argv[2], url = process.argv[3], out = process.argv[4];
const WIDTH = 1536, PORT = 9200 + Math.floor(Math.random() * 200);
const prof = join(process.env.TEMP, `cdp-home-${Date.now()}`);
mkdirSync(dirname(out), { recursive: true });
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, "--no-first-run",
  `--window-size=${WIDTH},2400`, "about:blank"], { stdio: "ignore" });
async function getJson(p) { for (let i = 0; i < 40; i++) { try { return await (await fetch(`http://127.0.0.1:${PORT}${p}`)).json(); } catch { await sleep(250); } } throw new Error("no cdp"); }
const ver = await getJson("/json/version"); const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r, e) => { ws.onopen = r; ws.onerror = e; });
let id = 0; const pending = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
function send(method, params = {}, sessionId) { const mid = ++id; return new Promise(res => { pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params, sessionId })); }); }
const { result: tgt } = await send("Target.createTarget", { url: "about:blank" });
const sid = (await send("Target.attachToTarget", { targetId: tgt.targetId, flatten: true })).result.sessionId;
const S = (m, p = {}) => send(m, p, sid);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: 1200, deviceScaleFactor: 1, mobile: false });
// 夜间：先在无 hash 同源页落地、写 localStorage，再整页 reload（hash 跳转不触发 load），最后设 hash
const base = url.split("#")[0];
await S("Page.navigate", { url: base });
await S("Runtime.evaluate", { expression: "new Promise(r=>{if(document.readyState==='complete')setTimeout(r,200);else window.addEventListener('load',()=>setTimeout(r,400));})", awaitPromise: true });
if (mode === "night") {
  await S("Runtime.evaluate", { expression: "localStorage.setItem('cahier-theme','night')" });
  await S("Page.reload");
  await S("Runtime.evaluate", { expression: "new Promise(r=>window.addEventListener('load',()=>setTimeout(r,800)))", awaitPromise: true });
}
if (url.includes("#")) {
  await S("Runtime.evaluate", { expression: `location.hash=${JSON.stringify(url.slice(url.indexOf("#")))}` });
  await sleep(800);
}
await S("Runtime.evaluate", { expression: "document.fonts?document.fonts.ready.then(()=>new Promise(r=>setTimeout(r,500))):new Promise(r=>setTimeout(r,500))", awaitPromise: true });
await S("Runtime.evaluate", { expression: `(async()=>{document.querySelectorAll('img').forEach(im=>{im.loading='eager';});const h=document.body.scrollHeight;for(let y=0;y<=h;y+=700){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,30));}await Promise.all([...document.querySelectorAll('img')].map(im=>im.complete?Promise.resolve():im.decode().catch(()=>{})));window.scrollTo(0,0);})()`, awaitPromise: true });
await sleep(500);
const met = (await S("Runtime.evaluate", { expression: `(()=>{const d=document.documentElement;return JSON.stringify({w:d.scrollWidth,h:d.scrollHeight});})()`, returnByValue: true }));
const m = met && met.result && met.result.result ? JSON.parse(met.result.result.value) : { w: WIDTH, h: 2400 };
const cw = Math.min(m.w, WIDTH), ch = Math.min(m.h, 3600);
const shot = await S("Page.captureScreenshot", { format: "webp", quality: 70, captureBeyondViewport: true, clip: { x: 0, y: 0, width: cw, height: ch, scale: 1 } });
writeFileSync(out, Buffer.from(shot.result.data, "base64"));
console.log("saved", out, cw, ch);
chrome.kill(); process.exit(0);
