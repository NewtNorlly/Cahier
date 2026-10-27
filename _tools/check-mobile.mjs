// 移动端 390px 检查：无横向滚动、空白便签栏隐藏、课件卡正常
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { join } from "node:path";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const url = process.argv[2];
const PORT = 9800 + Math.floor(Math.random() * 100);
const prof = join(process.env.TEMP, `cdp-${Date.now()}`);
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
await S("Emulation.setDeviceMetricsOverride", { width: 390, height: 900, deviceScaleFactor: 2, mobile: true });
await S("Page.navigate", { url });
await S("Runtime.evaluate", { expression: "new Promise(r=>{if(document.readyState==='complete')setTimeout(r,500);else window.addEventListener('load',()=>setTimeout(r,1000));})", awaitPromise: true });
// 等 web 字体（KaTeX/思源宋体）全部就绪再量，避免回退字体度量造成的瞬时假溢出
await S("Runtime.evaluate", { expression: "document.fonts?document.fonts.ready.then(()=>new Promise(r=>setTimeout(r,500))):new Promise(r=>setTimeout(r,500))", awaitPromise: true });
// 移动端 390px 检查：无横向滚动；双纸结构（§二十四）下笔记纸默认隐藏、开启后排在原文纸下方；
// 本地编辑区在窄屏为流式高度（min-height 60vh、overflow visible），不得裁切/横溢。
const measure = async () => (await S("Runtime.evaluate", { expression: `JSON.stringify({
  scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth,
  folios: document.querySelectorAll('.folio').length,
  notesDisplay: getComputedStyle(document.querySelector('.folio__paper--notes')).display,
  editH: Math.round(document.querySelector('.folio__edit')?.getBoundingClientRect().height || 0),
  editOverflow: getComputedStyle(document.querySelector('.folio__edit')).overflowY,
  editMinH: Math.round(document.querySelector('.folio__edit')?.getBoundingClientRect().height || 0),
  cardW: Math.round(document.querySelector('.slide-block')?.getBoundingClientRect().width || 0)
})`, returnByValue: true })).result.result.value;
const closed = JSON.parse(await measure());
// 开启笔记纸再量一次
await S("Runtime.evaluate", { expression: "document.getElementById('notesToggle').click(); true" });
await S("Runtime.evaluate", { expression: "new Promise(r=>setTimeout(r,750))" });
const open = JSON.parse(await measure());
console.log(url.split("/").slice(-2, -1)[0], JSON.stringify({ closed, open }));
chrome.kill(); process.exit(0);
