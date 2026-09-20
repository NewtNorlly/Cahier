// CDP 无头浏览器工具：测量每个 .folio 的填充率/页码位置，并按页（或整页）截图。
// 用法:
//   node cdp-shot.mjs <url> <outDir> [width=1536] [mode=pages|full]
// 产出: measure.json + shot-*.png
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const url = process.argv[2];
const outDir = process.argv[3];
const WIDTH = Number(process.argv[4] || 1536);
const MODE = process.argv[5] || "pages";
if (!url || !outDir) { console.error("need url outDir"); process.exit(1); }
mkdirSync(outDir, { recursive: true });
const PORT = 9333 + Math.floor(Math.random() * 200);
const prof = join(process.env.TEMP, `cdp-${Date.now()}`);

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`,
  "--no-first-run", "--no-default-browser-check",
  `--window-size=${WIDTH},1000`, "about:blank",
], { stdio: "ignore" });

async function getJson(path) {
  for (let i = 0; i < 40; i++) {
    try { return await (await fetch(`http://127.0.0.1:${PORT}${path}`)).json(); }
    catch { await sleep(250); }
  }
  throw new Error("CDP not reachable");
}

const ver = await getJson("/json/version");
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r, e) => { ws.onopen = r; ws.onerror = e; });
let id = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
function send(method, params = {}, sessionId) {
  const mid = ++id;
  return new Promise((resolve) => {
    pending.set(mid, resolve);
    ws.send(JSON.stringify({ id: mid, method, params, sessionId }));
  });
}

// 浏览器级：创建页面对应 target
const { result: tgt } = await send("Target.createTarget", { url: "about:blank" });
const sessionId = (await send("Target.attachToTarget", { targetId: tgt.targetId, flatten: true })).result.sessionId;
const S = (method, params = {}) => send(method, params, sessionId);

await S("Page.enable");
await S("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: 1000, deviceScaleFactor: 1, mobile: false });
await S("Page.navigate", { url });
// 等加载 + 字体图片
await S("Runtime.enable");
await S("Runtime.evaluate", { expression: "new Promise(r=>{if(document.readyState==='complete')r();else window.addEventListener('load',()=>setTimeout(r,1200));})", awaitPromise: true });
await sleep(1800);

const measureExpr = `(function(){
  const folios=[...document.querySelectorAll('.folio')];
  const data=folios.map((f,i)=>{
    const r=f.getBoundingClientRect();
    const bands=[...f.querySelectorAll('.folio__band')];
    const pn=f.querySelector('.folio__pageno');
    // 内容真正用到的底边（取 band 底边最大值，相对 folio）
    let contentBottom=0;
    bands.forEach(b=>{const br=b.getBoundingClientRect(); contentBottom=Math.max(contentBottom, br.bottom-r.top);});
    const pnRect=pn?pn.getBoundingClientRect():null;
    const pnTop=pnRect?pnRect.top-r.top:null;
    const pnGap=pnRect?(r.height-(pnRect.bottom-r.top)):null;
    return {i:i+1, h:Math.round(r.height), contentBottom:Math.round(contentBottom),
      blank:Math.round(r.height-contentBottom), fill:+(contentBottom/r.height).toFixed(3),
      pnTop:pnTop==null?null:Math.round(pnTop), pnGap:pnGap==null?null:Math.round(pnGap),
      bands:bands.length,
      label:(pn?pn.textContent.trim():'')};
  });
  const doc=document.querySelector('.doc-body');
  const dr=doc?doc.getBoundingClientRect():null;
  return {url:location.pathname, viewport:window.innerWidth, folioCount:folios.length,
    paperW: dr?Math.round(dr.width):null, pages:data};
})()`;
const measured = (await S("Runtime.evaluate", { expression: measureExpr, returnByValue: true })).result.result.value;
writeFileSync(join(outDir, "measure.json"), JSON.stringify(measured, null, 2), "utf8");

// 汇总打印
const ps = measured.pages;
const lowFill = ps.filter(p => p.fill < 0.72);
console.log(`folio=${measured.folioCount} paperW=${measured.paperW} viewport=${measured.viewport}`);
console.log(`填充<0.72 的页数: ${lowFill.length}/${ps.length}`);
lowFill.slice(0, 40).forEach(p => console.log(`  P${p.i} fill=${p.fill} h=${p.h} content=${p.contentBottom} blank=${p.blank} pnGap=${p.pnGap} bands=${p.bands} ${p.label}`));
const pnBad = ps.filter(p => p.pnGap != null && p.pnGap > 40);
console.log(`页码未贴底(pnGap>40)的页数: ${pnBad.length}`);
pnBad.slice(0, 20).forEach(p => console.log(`  P${p.i} pnGap=${p.pnGap} h=${p.h} pnTop=${p.pnTop}`));

async function shoot(clip, name) {
  const { result } = await S("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { ...clip, scale: 1 } });
  writeFileSync(join(outDir, name), Buffer.from(result.data, "base64"));
}

if (MODE === "full") {
  const m = (await S("Page.getLayoutMetrics")).result.cssContentSize;
  // 分段截（避免超 16384 上限）
  const maxH = 8000;
  let n = 0;
  for (let y = 0; y < m.height; y += maxH) {
    n++;
    await shoot({ x: 0, y, width: Math.min(m.width, WIDTH), height: Math.min(maxH, m.height - y) }, `full-${n}.png`);
  }
  console.log("full shots:", n);
} else {
  // 逐页截图
  const folios = (await S("Runtime.evaluate", { expression: `[...document.querySelectorAll('.folio')].map(f=>{const r=f.getBoundingClientRect();return {x:r.left,y:r.top+window.scrollY,w:r.width,h:r.height};})`, returnByValue: true })).result.result.value;
  let n = 0;
  for (const f of folios) {
    n++;
    const pad = 6;
    await shoot({ x: 0, y: f.y - 30, width: WIDTH, height: f.h + 60 }, `p${String(n).padStart(2, "0")}.png`);
  }
  console.log("page shots:", n);
}

ws.close();
chrome.kill();
process.exit(0);
