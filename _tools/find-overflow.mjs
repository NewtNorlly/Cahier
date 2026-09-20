// 找移动端横向溢出元素
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { join } from "node:path";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const url = process.argv[2];
const PORT = 9850 + Math.floor(Math.random() * 100);
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
const v = (await S("Runtime.evaluate", { expression: `(()=>{
  const out=[];
  document.querySelectorAll('*').forEach(el=>{const r=el.getBoundingClientRect();
    if(r.right>396||r.left<-6){const cs=getComputedStyle(el);
      out.push((el.className&&el.className.baseVal!==undefined?el.className.baseVal:el.className||el.tagName)+' L'+Math.round(r.left)+' R'+Math.round(r.right)+' w'+Math.round(r.width)+' '+cs.display+' gridCol='+cs.gridColumn);}});
  return JSON.stringify({innerW:innerWidth, bodyScroll:document.body.scrollWidth, docScroll:document.documentElement.scrollWidth, bad:out.slice(0,15)},null,1);
})()`, returnByValue: true })).result.result.value;
console.log(v);
chrome.kill(); process.exit(0);
