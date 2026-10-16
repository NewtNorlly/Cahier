// 找到包含指定文本的 folio 序号（1-based）。
// 用法: node find-folio-1017.mjs <url> <keyword1> [keyword2 ...]
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { join } from "node:path";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const url = process.argv[2];
const words = process.argv.slice(3);
const WIDTH = 1536, PORT = 9400 + Math.floor(Math.random() * 300);
const prof = join(process.env.TEMP, `cdp-find-${Date.now()}`);
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${prof}`, "--no-first-run", `--window-size=${WIDTH},1000`, "about:blank"], { stdio: "ignore" });
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
await S("Runtime.evaluate", { expression: "new Promise(r=>{if(document.readyState==='complete')setTimeout(r,500);else window.addEventListener('load',()=>setTimeout(r,900));})", awaitPromise: true });
const expr = `(()=>{const fs=[...document.querySelectorAll('.folio')];const out={total:fs.length};${words.map((w, i) => `out[${JSON.stringify(w)}]=fs.map((f,j)=>f.innerText.includes(${JSON.stringify(w)})?j+1:0).filter(x=>x)`).join(';')};return JSON.stringify(out);})()`;
const r = await S("Runtime.evaluate", { expression: expr, returnByValue: true });
console.log(r.result.result.value);
chrome.kill(); process.exit(0);
