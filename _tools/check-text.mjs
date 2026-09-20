// 文字守恒校验：渲染后中栏正文的中文字符多重集合，应覆盖源 md（去掉 folio 标记/批注栏）。
// 用法: node check-text.mjs <url> <sourceMdPath>
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const [url, srcPath] = process.argv.slice(2);
const PORT = 9333 + Math.floor(Math.random() * 200);
const prof = join(process.env.TEMP, `cdp-${Date.now()}`);
const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`,
  "--no-first-run", "--no-default-browser-check",
  "--window-size=1536,1000", "about:blank",
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
await S("Emulation.setDeviceMetricsOverride", { width: 1536, height: 1000, deviceScaleFactor: 1, mobile: false });
await S("Page.navigate", { url });
await S("Runtime.evaluate", {
  expression: "new Promise(r=>{if(document.readyState==='complete')setTimeout(r,400);else window.addEventListener('load',()=>setTimeout(r,1200));})",
  awaitPromise: true,
});
const rendered = (await S("Runtime.evaluate", {
  expression: `[...document.querySelectorAll('.folio__col--main')].map(e=>e.innerText).join('\\n')`,
  returnByValue: true,
})).result.result.value;

// 源 md：只取 <!--col:M--> 中栏（无标注时全文），去掉 folio/band/col 标记与 markdown 语法符号
let raw = readFileSync(srcPath, "utf8");
const lines = raw.split(/\r?\n/);
let inM = null; const kept = [];
for (const ln0 of lines) {
  const m = /^\s*<!--\s*(\/?)\s*(folio|band|col)(?:\s*:\s*([^>]*?))?\s*-->\s*$/.exec(ln0);
  if (m) {
    if (m[2] === "col") { inM = m[1] ? null : ((m[3] || "").trim() === "M" || (m[3] || "").trim() === ""); }
    continue;
  }
  if (inM === false) continue;
  kept.push(ln0);
}
let src = kept.join("\n");
src = src.replace(/[*_`~#>[\]()!|-]/g, "").replace(/!\[.*?\]\(.*?\)/g, "");

const cjk = (s) => (s.match(/[㐀-䶿一-鿿豈-﫿]/g) || []);
const a = cjk(src), b = cjk(rendered);
const ca = new Map(), cb = new Map();
a.forEach((c) => ca.set(c, (ca.get(c) || 0) + 1));
b.forEach((c) => cb.set(c, (cb.get(c) || 0) + 1));
let missing = 0; const missChars = {};
for (const [c, n] of ca) { const d = n - (cb.get(c) || 0); if (d > 0) { missing += d; missChars[c] = d; } }
console.log(`源中栏中文字 ${a.length}，渲染中文字 ${b.length}，缺字 ${missing}（${(missing / a.length * 100).toFixed(3)}%）`);
const top = Object.entries(missChars).sort((x, y) => y[1] - x[1]).slice(0, 20);
if (top.length) console.log("缺字样例:", top.map(([c, n]) => `${c}×${n}`).join(" "));
ws.close(); chrome.kill(); process.exit(0);
