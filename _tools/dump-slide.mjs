import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMath from "remark-math";
import fs from "node:fs";

const md = fs.readFileSync(process.argv[2], "utf8");
const tree = unified().use(remarkParse).use(remarkMath).parse(md);
const want = Number(process.argv[3]);
let folio = 0;
let inFolio = false;
for (const node of tree.children) {
  if (node.type === "html" && /<!--\s*folio:第(\d+)页/.test(node.value)) {
    folio = Number(node.value.match(/folio:第(\d+)页/)[1]);
    inFolio = true;
    continue;
  }
  if (node.type === "html" && /<!--\/folio/.test(node.value)) { inFolio = false; continue; }
  if (folio !== want) continue;
  if (node.type === "html" && /<!--/.test(node.value)) continue;
  console.log(JSON.stringify(node, null, 1).slice(0, 2600));
  console.log("-----");
}
