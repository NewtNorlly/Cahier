// 批量量高：遍历 dist/notes 所有路由，桌面 1536 下报 folio 高度 >1086 的页
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { readdirSync } from "node:fs";
import { join } from "node:path";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const NOTES = "C:\\Users\\NewtN\\下载\\Cahier-main\\site\\dist\\notes";
const dirs = readdirSync(NOTES, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
console.log("note routes:", dirs.length);
const PORT = 9700 + Math.floor(Math.random() * 200);
const prof = join(process.env.TEMP, `cdp-batchmeasure-${Date.now()}`);
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", `--remote-debugging-port=${PORT}`, "--user-data-dir=" + prof, "--no-first-run", "--no-default-browser-check", "--window-size=1536,1000", "about:blank"], { stdio: "ignore" });
async function getJson(p){ for(let i=0;i<40;i++){ try{ return await (await fetch(`http://127.0.0.1:${PORT}${p}`)).json(); } catch { await sleep(250); } } throw new Error("no cdp"); }
const ver = await getJson("/json/version");
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r,e)=>{ ws.onopen=r; ws.onerror=e; });
let id=0; const pending=new Map();
ws.onmessage=(ev)=>{ const m=JSON.parse(ev.data); if(m.id && pending.has(m.id)){ pending.get(m.id)(m); pending.delete(m.id); } };
function send(method, params={}, sessionId){ const mid=++id; return new Promise(res=>{ pending.set(mid,res); ws.send(JSON.stringify({id:mid,method,params,sessionId})); }); }
const { result: tgt } = await send("Target.createTarget", { url:"about:blank" });
const sid = (await send("Target.attachToTarget", { targetId: tgt.targetId, flatten:true })).result.sessionId;
const S=(m,p={})=>send(m,p,sid);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width:1536, height:1000, deviceScaleFactor:1, mobile:false });
let overflows = [];
for (const dir of dirs) {
  const url = `http://localhost:4399/notes/${encodeURIComponent(dir)}/`;
  await S("Page.navigate", { url });
  await S("Runtime.evaluate", { expression: "new Promise(r=>{if(document.readyState==='complete')setTimeout(r,350);else window.addEventListener('load',()=>setTimeout(r,600));})", awaitPromise:true });
  const r = await S("Runtime.evaluate", { expression: `(()=>{const fs=[...document.querySelectorAll('.folio')];const bad=[];fs.forEach((f,i)=>{if(Math.round(f.getBoundingClientRect().height)>1086) bad.push({i:i+1,h:Math.round(f.getBoundingClientRect().height)});});return JSON.stringify({n:fs.length, bad});})()`, returnByValue:true });
  const v = JSON.parse(r.result.result.value);
  if (v.bad.length) overflows.push({ dir, ...v });
}
console.log("=== OVERFLOW PAGES ===");
console.log(JSON.stringify(overflows, null, 2));
console.log("total routes checked:", dirs.length);
await send("Target.closeTarget", { targetId: tgt.targetId });
chrome.kill(); process.exit(0);
