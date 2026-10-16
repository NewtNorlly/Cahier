// 1017 批次截图批量驱动：白昼/夜间桌面 + 移动首屏，直接调 shot-1017.mjs
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const BASE = "http://localhost:4399/notes";
const jobs = [
  { name: "python",   dir: "10月5日讲稿--2e7fd211",  pages: [0, 1, 4, 5, 19], night: [0, 4] },
  { name: "pubeco",   dir: "10月16日讲稿--e4c5daf7", pages: [0, 1, 2],        night: [0] },
  { name: "decision", dir: "10月13日讲稿--8c423dd7", pages: [0, 1, 2],        night: [0] },
  { name: "land9",    dir: "10月9日讲稿--900a6793",  pages: [0, 1, 7, 8],     night: [7] },
  { name: "land16",   dir: "10月16日讲稿--e151e5c9", pages: [0, 8],           night: [0] },
  { name: "ip",       dir: "10月16日讲稿--e12f1bed", pages: [0, 1, 2, 3, 4],  night: [0] },
  { name: "cjp",      dir: "10月13日讲稿--785bd266", pages: [0, 1, 2],        night: [0] },
  { name: "en1015",   dir: "10月15日讲稿--0640d22e", pages: [0, 1, 72],       night: [0, 72] },
  { name: "en1001",   dir: "10月1日影音跟读--320cce8a", pages: [0, 1, 2],     night: [0] },
  { name: "en1009",   dir: "10月9日影音跟读--32f575d2", pages: [0, 1, 2],     night: [0] }
];

function run(args) {
  return new Promise((resolve, reject) => {
    const p = spawn("node", ["_tools/shot-1017.mjs", ...args], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    p.stdout.on("data", d => { out += d; process.stdout.write(d); });
    p.stderr.on("data", d => { err += d; process.stderr.write(d); });
    p.on("exit", code => code === 0 ? resolve(out) : reject(new Error("exit " + code + ": " + err)));
  });
}

for (const j of jobs) {
  const url = `${BASE}/${encodeURI(j.dir)}/`;
  const outdir = `_tools/shots-1017/${j.name}`;
  console.log("=== light", j.name, "===");
  await run(["light", url, outdir, ...j.pages.map(String)]);
  await sleep(300);
  console.log("=== night", j.name, "===");
  await run(["night", url, outdir, ...j.night.map(String)]);
  await sleep(300);
  console.log("=== mobile", j.name, "===");
  await run(["mobile", url, `${outdir}/mobile-390.webp`]);
  await sleep(300);
}
console.log("ALL SHOTS DONE");
