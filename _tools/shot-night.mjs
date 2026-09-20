// 夜间模式下截取课件第一页（验证空白便签竖线夜间色与卡片配色）
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const url = process.argv[2];
const out = process.argv[3] || "shots/night-courseware.webp";
const WIDTH = 1536, PORT = 9700 + Math.floor(Math.random() * 200);
const prof = join(process.env.TEMP, `cdp-${Date.now()}`);
mkdirSync(out.split(/[\\/]/).slice(0, -1).join("/"), { recursive: true });
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, "--no-first-run",
  "--no-default-browser-check", `--window-size=${WIDTH},1000`, "about:blank"], { stdio: "ignore" });
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
await S("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: 1000, deviceScaleFactor: 1, mobile: false });
await S("Page.navigate", { url });
await S("Runtime.evaluate", { expression: "new Promise(r=>{if(document.readyState==='complete')r();else window.addEventListener('load',()=>setTimeout(r,800));})", awaitPromise: true });
await S("Runtime.evaluate", { expression: "localStorage.setItem('cahier-theme','night')" });
await S("Page.navigate", { url });
await S("Runtime.evaluate", { expression: "new Promise(r=>window.addEventListener('load',()=>setTimeout(r,1200)))", awaitPromise: true });
await sleep(700);
await S("Runtime.evaluate", { expression: "window.scrollTo(0,0)" });
await sleep(200);
const folio = (await S("Runtime.evaluate", { expression: `(()=>{const f=document.querySelector('.folio');const r=f.getBoundingClientRect();return JSON.stringify({x:r.x,y:r.y,w:r.width,h:r.height});})()`, returnByValue: true })).result.result.value;
const r = JSON.parse(folio); console.log("RECT", folio);
const shot = await S("Page.captureScreenshot", { format: "webp", quality: 80, clip: { x: r.x, y: r.y, width: r.w, height: r.h, scale: 1 }, captureBeyondViewport: true });
if (!shot.result) { console.error(JSON.stringify(shot).slice(0, 500)); process.exit(1); }
writeFileSync(out, Buffer.from(shot.result.data, "base64"));
console.log("saved", out, Math.round(r.width), Math.round(r.height));
chrome.kill();
process.exit(0);


