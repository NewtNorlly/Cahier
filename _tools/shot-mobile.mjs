// 390px 移动端首屏截图（用法：node shot-mobile.mjs <url> <outpath>）
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const url = process.argv[2], out = process.argv[3];
const PORT = 9940 + Math.floor(Math.random() * 30);
const prof = join(process.env.TEMP, `cdp-${Date.now()}`);
mkdirSync(out.split(/[\\/]/).slice(0, -1).join("/"), { recursive: true });
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${prof}`, "--no-first-run", "--window-size=390,900", "about:blank"], { stdio: "ignore" });
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
await S("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await S("Page.navigate", { url });
await S("Runtime.evaluate", { expression: "new Promise(r=>{if(document.readyState==='complete')setTimeout(r,700);else window.addEventListener('load',()=>setTimeout(r,1200));})", awaitPromise: true });
await sleep(500);
const shot = await S("Page.captureScreenshot", { format: "webp", quality: 80 });
if (!shot.result) { console.error(JSON.stringify(shot).slice(0, 400)); process.exit(1); }
writeFileSync(out, Buffer.from(shot.result.data, "base64"));
console.log("saved", out);
chrome.kill(); process.exit(0);
