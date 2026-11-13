/**
 * remark-spread-folio.mjs — 双纸（原文纸 / 笔记纸）康奈尔笔记本 + A4 翻页重排（remark 插件）
 *
 * 渲染形态（2026-10-26 起，三栏窄便签栏已废弃）：
 * - 每页为 .folio--spread，内叠两张同规格纸：原文纸（.folio__paper--main，
 *   中栏 M 原文全套排版）与笔记纸（.folio__paper--notes）；
 * - 笔记纸内容唯一来源 site/src/data/folio-notes.json（本地编辑即写盘 →
 *   构建期逐字烤入 .folio__edit → 云端只读呈现）；源 md 的 col:L / col:R
 *   标记仍被解析（铁律 12 判据载体、保持兼容），但不再渲染为预置笔记；
 * - 默认笔记纸叠在原文纸正后方，导航铅笔按钮触发后两纸左右摊开。
 *
 * 设计目标（2026-09 精修，沿用）：
 * - 严格保留 A4 纸页规格：桌面端每页固定 1536 × 1086（√2 竖纸），页码贴页底。
 * - 行文如翻书：原文按「原子块」自然流动，块与块连续向下排，一页排满才翻页，
 *   段落、列表、表格允许跨页续排；只在必要处分页。
 *
 * 高度模型按 1536px 纸宽、原文纸 768px、正文 0.9rem / 1.78 行距实测校准：
 *   每行 25.6px、每行约 47 个中文字；页内可排高度约 951px，留安全余量后 FIXED≈920px。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* ── 构建期笔记数据（本地笔记纸导出的快照，合并后随站点上线） ──
 * 文件 site/src/data/folio-notes.json 结构：
 *   { "<源md相对仓库根的路径>": { "<页码>": "该页笔记纯文本（含换行/空格）" } }
 * 笔记纸是 white-space:pre-wrap 的纯文本面，文本逐字写入编辑节点；
 * 云端因此也能呈现用户在本地写下的笔记（云端只读）。 */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const NOTES_DATA_FILE = path.join(REPO_ROOT, "site", "src", "data", "folio-notes.json");
let folioNotesCache;
function loadFolioNotes() {
  if (folioNotesCache !== undefined) return folioNotesCache;
  try {
    folioNotesCache = JSON.parse(fs.readFileSync(NOTES_DATA_FILE, "utf8"));
  } catch {
    folioNotesCache = {};
  }
  return folioNotesCache;
}
/* 源 md 的稳定键：相对仓库根、正斜杠 */
function sourceDocKey(file) {
  const abs = (file && file.history && file.history[0]) || (file && file.path) || "";
  if (!abs) return "";
  return path.relative(REPO_ROOT, path.resolve(abs)).replace(/\\/g, "/");
}
function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* 兼容开标记 <!--folio:..--> 与闭标记 <!--/folio-->（闭标记仅作结构占位，不承载内容） */
const MARKER_RE = /^\s*<!--\s*\/?\s*(folio|band|col)(?:\s*:\s*([^>]*?))?\s*-->\s*$/;

/* 本地图片真实尺寸缓存（构建期读取，保证图片页分页估算准确） */
let imgDims = new Map();
let keepIndexedPages = false;

/* 纯 JS 读取 WebP 尺寸（只读文件头 30 字节，避免引入原生依赖） */
function webpSize(buf) {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return null;
  const fmt = buf.toString("ascii", 12, 16);
  if (fmt === "VP8X") {
    return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
  }
  if (fmt === "VP8 ") {
    return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
  }
  if (fmt === "VP8L") {
    const b = buf.readUInt32LE(21);
    return { w: 1 + (b & 0x3fff), h: 1 + ((b >> 14) & 0x3fff) };
  }
  return null;
}

function collectImageUrls(folios) {
  const urls = new Set();
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if ((node.type === "image" || node.type === "imageReference") && node.url) urls.add(node.url);
    if (Array.isArray(node.children)) node.children.forEach(walk);
  };
  for (const folio of folios) {
    for (const band of folio.bands) {
      [...band.l, ...band.m, ...band.r].forEach(walk);
    }
  }
  return [...urls];
}

function resolveLocalImage(url, file) {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(url)) return null;
  const rel = decodeURIComponent(url.split("?")[0].split("#")[0]);
  const candidates = [];
  if (rel.startsWith("/media/")) {
    // remark-obsidian 转换后的站点绝对路径：site/public/media，其次仓库根
    const tail = rel.slice("/media/".length);
    candidates.push(path.resolve(process.cwd(), "public", "media", tail));
    candidates.push(path.resolve(process.cwd(), "..", tail));
  } else if (file && file.path) {
    candidates.push(path.resolve(path.dirname(file.path), rel));
  }
  return candidates;
}

function loadImageDims(folios, file) {
  const next = new Map();
  for (const url of collectImageUrls(folios)) {
    if (!/\.webp$/i.test(url)) continue;
    const candidates = resolveLocalImage(url, file) || [];
    for (const abs of candidates) {
      try {
        const fd = fs.openSync(abs, "r");
        const buf = Buffer.alloc(30);
        fs.readSync(fd, buf, 0, 30, 0);
        fs.closeSync(fd);
        const dims = webpSize(buf);
        if (dims) {
          next.set(url, dims);
          break;
        }
      } catch {
        /* 尝试下一个候选路径，仍失败则退回经验估算 */
      }
    }
  }
  return next;
}

/* 图片渲染高度：按真实宽高比换算到中栏（内容宽 678），含题注与外边距 */
function imageWeight(node, spacing = 52) {
  const alt = node.alt || "";
  const wm = alt.match(/\|\s*(\d{2,4})/);
  const specW = node.data?.hProperties?.width || (wm ? Number(wm[1]) : null);
  const nat = imgDims.get(node.url || "");
  const renderW = Math.min(specW || (nat ? nat.w : 320), 678);
  let renderH;
  if (nat && nat.w) {
    renderH = (renderW * nat.h) / nat.w;
  } else if (specW) {
    // 无元数据：窄头像近似方形，宽截图近似横版
    renderH = specW <= 400 ? renderW * 1.15 : renderW * 0.72;
  } else {
    renderH = Math.min(560, renderW * 1.15);
  }
  // 与正文配图的 CSS 高度上限一致。
  return Math.min(renderH, 760) + spacing;
}

/* 一页中栏可排高度（估算 px）。
 * ★2026-10-29 按全站实测重新标定：833 → 920（页底留白优化，见手册 §三十二）。
 * 中栏真实可用高实测 998px（col.clientHeight − 上下 padding；再扣页码约 15px 得 983px），
 * 旧值 833 比可用高低 150px，导致每页系统性留白约 277px（27.8%）、用户投诉「页底空掉 1/4」。
 * 920 是「零超高」硬指标下的实测最优档：全站 105 路由 / 2952 页超高 0 页，
 * 平均留白降到 206px（20.6%）、中位 155px；940 已越界（2 页超高、最小 gap=−43），故取 920。
 * ★教训（勿重蹈）：2026-10-28 曾把 LECTURE_PARA_CPL 44→40 与 FIXED 833→940 一起改，
 * 结果每块估算高度普遍变大、页数从 147 涨到 160+、分页反而更差并已全部回退。
 * 调留白只动 FIXED 一个杠杆、且必须逐档跑「构建 + 全站量高」以零超高为唯一放行判据；
 * LECTURE_PARA_CPL 保持 44 不动（改它会牵动文献批注带拆分边界）。
 * 历史校准：9月17日讲稿 folio73 在 848 下曾超 2px（4 段中英混排按 44 字/行估成 1 行、实折 2 行）。 */
const FIXED = Number(process.env.LEC_FIXED) || 920;
/* 单个列表/表格拆分片段的目标高度，留出标题与续接余量。 */
const SPLIT_TARGET = Math.round(FIXED * 0.9);

function blockHasImage(node) {
  return !!(node && node.children && node.children.some(
    (c) => c.type === "image" || c.type === "imageReference" ||
      (c.type === "html" && /<img/i.test(c.value || "")),
  ));
}
function standaloneImage(node) {
  if (node?.type !== "paragraph") return undefined;
  const content = node.children.filter((child) => child.type !== "text" || child.value.trim());
  return content.length === 1 && content[0].type === "image" ? content[0] : undefined;
}

function u(node) {
  return node && typeof node === "object" ? node : undefined;
}

/* ── 标记解析 ─────────────────────────────────────────────── */

function parseFolios(tree) {
  const folios = [];
  let currentFolio = null;
  let currentBand = null;
  let currentCol = null;

  const ensureFolio = (label = "") => {
    if (!currentFolio) {
      currentFolio = { label, bands: [] };
      folios.push(currentFolio);
    }
    return currentFolio;
  };
  const ensureBand = () => {
    const folio = ensureFolio("");
    if (!currentBand) {
      currentBand = { l: [], m: [], r: [] };
      folio.bands.push(currentBand);
    }
    return currentBand;
  };

  for (const node of tree.children) {
    if (node.type === "html") {
      const match = MARKER_RE.exec(node.value || "");
      if (match) {
        const kind = match[1];
        const isClose = /^\s*<!--\s*\//.test(node.value || "");
        if (isClose) continue; // <!--/folio--> 等闭标记：无内容，忽略
        const label = (match[2] || "").trim();
        if (kind === "folio") {
          currentFolio = { label, bands: [] };
          folios.push(currentFolio);
          currentBand = null;
          currentCol = null;
        } else if (kind === "band") {
          currentFolio = ensureFolio("");
          currentBand = { l: [], m: [], r: [] };
          currentFolio.bands.push(currentBand);
          currentCol = null;
        } else if (kind === "col") {
          const band = ensureBand();
          currentCol =
            label === "L" ? band.l : label === "R" ? band.r : band.m;
        }
        continue;
      }
    }
    const band = ensureBand();
    (currentCol || band.m).push(node);
  }
  return folios;
}

/* ── 文本与高度估算（中栏实测口径） ─────────────────────────── */

function textOf(node) {
  if (!node) return "";
  if (typeof node.value === "string") return node.value;
  if (typeof node.alt === "string") return node.alt;
  if (Array.isArray(node.children)) return node.children.map(textOf).join("");
  return "";
}

const LINE = 25.6;            // 0.9rem × 1.78
const LECTURE_PARA_CPL = 44;  // 讲稿段落每行视觉字数（保持原校准口径，勿改）
const CJK_RE = /[㐀-䶿一-鿿豈-﫿＀-￯]/g;
/* 句读收尾判定：允许句末标点后紧跟脚注角标（源文形态 。<sup>〔n〕</sup>、
 * DOM 文本形态 。〔n〕 都算句读收尾），否则「页尾以角标结束」时下一页的
 * 新自然段会被误判为续段而取消缩进。 */
const SENTENCE_END_RE = /[。！？!?.…：:；;”’"』）)](?:<\/sup\s*>|〔\s*\d+\s*〕)*\s*$/;

function visualLength(text) {
  const matched = text.match(CJK_RE);
  const cjk = matched ? matched.length : 0;
  return cjk + (text.length - cjk) * 0.56;
}

function textLines(text, charsPerLine) {
  const len = visualLength(text);
  return Math.max(0, Math.ceil(len / charsPerLine));
}

/* ── 列表：深度展平 ──
 * 讲稿中常见「一个顶层 li 套着整棵嵌套词汇表」的写法，必须把所有层级的
 * listItem 展平成带 depth 的行，跨页时才能逐行切分并重建嵌套结构。 */
function flattenList(node) {
  const rows = [];
  const olCounter = new Map(); // 各深度 ol 序号（近似：同深度连续计数）
  const walk = (list, depth) => {
    for (const child of list.children || []) {
      if (child.type !== "listItem") continue;
      const own = (child.children || []).filter((c) => c.type !== "list");
      const nested = (child.children || []).filter((c) => c.type === "list");
      let olIndex = 0;
      if (list.ordered) {
        olIndex = (olCounter.get(depth) || 0) + 1;
        olCounter.set(depth, olIndex);
      }
      rows.push({ depth, ordered: !!list.ordered, own, item: child, olIndex });
      for (const sub of nested) walk(sub, depth + 1);
    }
  };
  walk(node, 0);
  return rows;
}

/* 单个叶子列表项（已剔除嵌套列表）的高度；缩进每深一级每行少容 2 视觉字 */
function leafWeight(row) {
  const cpl = Math.max(30, 42 - row.depth * 2);
  let lines = 0;
  let blocks = 0;
  for (const c of row.own) {
    if (c.type === "list") continue;
    lines += Math.max(1, textLines(textOf(c), cpl));
    blocks += 1;
  }
  if (!blocks) lines = Math.max(lines, 1);
  return lines * LINE + 4 + (blocks > 1 ? (blocks - 1) * 8 : 0);
}

function listWeight(node) {
  const rows = flattenList(node);
  let wrappers = 1;
  let prevDepth = -1;
  for (const r of rows) {
    if (r.depth > prevDepth) wrappers += 1;
    prevDepth = r.depth;
  }
  return rows.reduce((s, r) => s + leafWeight(r), 0) + wrappers * 16 + 6;
}

/* 由展平行重建一棵（可能嵌套的）列表；topStart 为顶层 ol 起始编号 */
function rebuildList(node, rows, topStart) {
  const root = { ...node, children: [] };
  const stack = [{ depth: -1, list: root, lastLi: null }];
  for (const row of rows) {
    while (stack.length > 1 && stack[stack.length - 1].depth >= row.depth) stack.pop();
    let level = stack.find((s) => s.depth === row.depth);
    if (!level) {
      if (row.depth === 0) {
        level = { depth: 0, list: root, lastLi: null };
      } else {
        const list = { type: "list", ordered: row.ordered, spread: false, children: [] };
        if (row.ordered) list.start = row.olIndex || 1;
        level = { depth: row.depth, list, lastLi: null };
        const parent = stack[stack.length - 1];
        if (parent && parent.lastLi) parent.lastLi.children.push(list);
      }
      stack.push(level);
    }
    const li = { ...row.item, children: [...row.own] };
    level.list.children.push(li);
    level.lastLi = li;
  }
  if (node.ordered) root.start = topStart;
  return root;
}

/* ── 表格：按真实列宽逐格估行（表格 0.86rem / 1.6 行距，行高 22px） ──
 * auto 布局下表头/释义类长文列会拿到更宽的列宽：逐行最长格按宽列估，
 * 其余格按均分窄列估；实测单行 38、双行 60、三行 82。 */
const TABLE_LINE = 22;
function tableCpl(ncols) {
  const narrow = Math.max(5, Math.floor(((678 / Math.max(1, ncols) - 18) / 13.8) * 1.05));
  const wideShare = Math.max(0.42, 0.9 / Math.max(1, ncols));
  const wide = Math.max(7, Math.floor(((678 * wideShare - 18) / 13.8) * 1.05));
  return { narrow, wide };
}

function tableRowWeight(row, cpl) {
  const cells = (row.children || []);
  const { narrow, wide } = cpl;
  let longest = -1;
  let longestLen = -1;
  cells.forEach((cell, i) => {
    const len = visualLength(textOf(cell));
    if (len > longestLen) { longestLen = len; longest = i; }
  });
  let lines = 1;
  cells.forEach((cell, i) => {
    const cap = i === longest ? wide : narrow;
    const text = textOf(cell);
    const cellLines = keepIndexedPages ? textLines(text, cap) : text
      .split(/<br\s*\/?\s*>/i)
      .reduce((total, line) => total + Math.max(1, textLines(line, cap)), 0);
    lines = Math.max(lines, cellLines);
  });
  return lines * TABLE_LINE + 16;
}

function tableWeight(node) {
  const rows = node.children || [];
  const ncols = rows.reduce((m, r) => Math.max(m, (r.children || []).length), 1);
  const cpl = tableCpl(ncols);
  return rows.reduce((sum, row) => sum + tableRowWeight(row, cpl), 0) + 30;
}

function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
}

/* 原始 HTML 块（讲稿中的语义类、脚注、图片等）高度估算 */
function htmlWeight(node) {
  const raw = node.value || "";
  if (/<img/i.test(raw)) {
    const widthMatch = raw.match(/(?:width\s*=\s*["']?|\|)(\d{2,4})/i);
    const w = widthMatch ? Number(widthMatch[1]) : 320;
    return Math.min(560, w * 1.15) + 70; // 图片 + 题注 + 外边距
  }
  const text = stripHtml(raw);
  const blockCount = (raw.match(/<(p|li|tr|h[1-6]|div|section|figure|br)[ >]/gi) || []).length;

  if (/folio-footnotes/.test(raw)) {
    // 脚注 0.74rem / 1.66：每条注释独立占行（短条目也占一行，CDP 标定）。
    // 含中文行实高约 24px、纯英文行约 20px；条间 margin 约 4px；块固定开销约 45px。
    // 不能把整段文本连续算行（会低估大量短注），也不能对英文条目套用中文行高。
    let content = 0;
    let n = 0;
    const itemRe = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
    let m;
    while ((m = itemRe.exec(raw))) {
      n += 1;
      const t = stripHtml(m[1]);
      const lines = Math.max(1, textLines(t, 56));
      content += lines * (new RegExp(CJK_RE.source).test(t) ? 24 : 20);
    }
    return 45 + content + n * 4;
  }
  if (/doc-abstract/.test(raw)) {
    return 24 + textLines(text, 52) * 20 + blockCount * 6;
  }
  if (/doc-editornote/.test(raw)) {
    return 18 + textLines(text, 52) * 20.5 + blockCount * 6;
  }
  if (/doc-lede/.test(raw)) {
    return 18 + textLines(text, 48) * 22.4 + blockCount * 8;
  }
  /* ★2026-10-29 单行语义行（章节小标/目录/CIP/题辞）精准行高。
   * 旧通用口径（正文行高 25.6 + 30 固定开销）把每行估成 56–81px，而实测这些行
   * 只有 21–28px——高估 2–3 倍的「幻影预算」吃掉页容量，迫使 CIP/目录/章首页
   * 提前翻页、留下半页空白（用户报的「离奇分页」真凶之一，实测 p12/p13 留白 581/623px）。
   * 逐 <p> 计行（合并文本会漏算折行），行高取 24、固定开销 6，略偏保守不误报超高。 */
  if (/doc-(section|toc|cip|epigraph)/.test(raw)) {
    let lines = 0;
    let matched = 0;
    const pRe = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
    let m2;
    while ((m2 = pRe.exec(raw))) {
      matched += 1;
      lines += Math.max(1, textLines(stripHtml(m2[1]), 40));
    }
    if (!matched) lines = Math.max(1, textLines(text, 40));
    return lines * 24 + 6;
  }
  // 通用：按正文口径估行，块标签补间距
  return 16 + textLines(text, 47) * LINE + blockCount * 14;
}

/* 中栏原子块高度（估算 px） */
function blockWeight(node) {
  const n = u(node);
  if (!n) return 0;
  switch (n.type) {
    case "paragraph": {
      const image = standaloneImage(n);
      if (!keepIndexedPages && image) return imageWeight(image, 32);
      // 图片段落（markdown-image）按图片估
      if (n.children && n.children.some((c) => c.type === "image" || c.type === "html" && /<img/i.test(c.value || ""))) {
        let w = 70;
        for (const c of n.children) w += blockWeight(c);
        return w;
      }
      // 中英混排受西文词边界与两端对齐影响，每行实容约 40 视觉字（CDP 逐块标定，见 LECTURE_PARA_CPL）
      return textLines(textOf(n), LECTURE_PARA_CPL) * LINE + 11; // 折叠后段距约 10.4px
    }
    case "heading": {
      const lines = Math.max(1, textLines(textOf(n), 40));
      if (n.depth <= 2) return 34 + lines * 27;
      if (n.depth === 3) return 28 + lines * 25;
      if (n.depth === 4) return 20 + lines * 22;
      return 16 + lines * 21;
    }
    case "list":
      return listWeight(n);
    case "table":
      return tableWeight(n);
    case "blockquote":
      // 0.84em / 1.7：每行约 20.6px、每行约 56 视觉字
      return textLines(textOf(n), 56) * 20.6 + 16;
    case "code":
      // 代码块 1em 宋体 / line-height 1.75：每行实测约 25.2px；
      // 固定项 = 上下边框 2 + 上下内边距约 21.6 + 单侧外边距约 12（略取保守，宁松勿超高）
      return 38 + (n.value || "").split("\n").length * 25.5;
    case "math": // remarkMath 显示公式（实测块高 92–99 + 上下边距）
      return 118;
    case "inlineMath":
      return textLines(textOf(n), 47) * LINE;
    case "image":
    case "imageReference":
      return imageWeight(n);
    case "html":
      return htmlWeight(n);
    case "thematicBreak":
      return 26;
    case "definition":
    case "footnoteDefinition":
      return 0;
    default:
      return textLines(textOf(n), 47) * LINE + 18;
  }
}

/* 左右批注栏高度（0.86rem / 1.78，栏宽约为中栏一半） */
function sideWeight(nodes) {
  let w = 0;
  for (const node of nodes) {
    const n = u(node);
    if (!n) continue;
    if (n.type === "paragraph") w += textLines(textOf(n), 27) * 22 + 8;
    else if (n.type === "list") w += textLines(textOf(n), 26) * 22 + 14;
    else if (n.type === "blockquote") w += textLines(textOf(n), 26) * 22 + 16;
    else if (n.type === "html") w += 12 + textLines(stripHtml(n.value || ""), 26) * 22;
    else w += textLines(textOf(n), 26) * 22 + 10;
  }
  return w;
}

/* ── 原子块拆分（长列表 / 长表格跨页续排） ──────────────────── */

function cloneWithChildren(node, children) {
  return { ...node, children };
}

/* 把（可能嵌套的）ul/ol 按叶子条目高度切成若干完整列表；有序列表续接编号。
 * firstBudget/restBudget 分别控制第一片（用于填满页尾余量）与后续片的目标高度。 */
function splitListTo(node, firstBudget, restBudget) {
  const rows = flattenList(node);
  const pieces = [];
  let current = [];
  let currentW = 24;
  let prevDepth = -1;
  let topOffset = 0;

  const flush = () => {
    if (!current.length) return;
    pieces.push(rebuildList(node, current, (node.start ?? 1) + topOffset));
    topOffset += current.filter((r) => r.depth === 0).length;
    current = [];
    currentW = 24;
    prevDepth = -1;
  };

  for (const row of rows) {
    let w = leafWeight(row);
    if (row.depth > prevDepth) w += 16; // 新打开一层嵌套列表的外边距
    const budget = pieces.length === 0 ? firstBudget : restBudget;
    if (current.length && currentW + w > budget) flush();
    current.push(row);
    currentW += w;
    prevDepth = row.depth;
  }
  flush();
  return pieces.length ? pieces : [node];
}

function splitList(node, target = SPLIT_TARGET) {
  if (listWeight(node) <= FIXED) return [node];
  return splitListTo(node, target, target);
}

/* 把表格按行切成若干表格，续表重复表头；firstBudget/restBudget 控制首片/续片目标高度。 */
function splitTableTo(node, firstBudget, restBudget) {
  const rows = node.children || [];
  const ncols = rows.reduce((m, r) => Math.max(m, (r.children || []).length), 1);
  const cpl = tableCpl(ncols);
  const head = rows[0] || null;
  const body = head ? rows.slice(1) : rows;
  const headW = head ? tableRowWeight(head, cpl) : 0;
  const pieces = [];
  let current = head ? [head] : [];
  let currentW = 30 + headW;

  const flush = () => {
    if (current.length) pieces.push(cloneWithChildren(node, current));
    current = head ? [head] : [];
    currentW = 30 + headW;
  };

  for (const row of body) {
    const w = tableRowWeight(row, cpl);
    const budget = pieces.length === 0 ? firstBudget : restBudget;
    if (current.length > (head ? 1 : 0) && currentW + w > budget) flush();
    current.push(row);
    currentW += w;
  }
  if (current.length > (head ? 1 : 0) || !pieces.length) flush();
  return pieces.length ? pieces : [node];
}

/* ── 行内感知的段落切分（保留加粗/斜体/链接/行内公式/上标等格式） ──
 * 把段落的行内树展平成一串「叶子」：普通文本叶子可从中切断，链接/图片/
 * 行内代码/行内公式等作为不可切原子整体挪动；strong/em 等包裹层在重建时克隆。 */
function flattenInline(nodes, wrap = [], out = []) {
  for (const n of nodes || []) {
    switch (n.type) {
      case "text":
        out.push({ value: n.value, wrap: wrap.slice(), atom: null });
        break;
      case "link":
      case "image":
      case "imageReference":
      case "inlineCode":
      case "inlineMath":
      case "html":
        out.push({ value: textOf(n), wrap: wrap.slice(), atom: n });
        break;
      default:
        if (Array.isArray(n.children) && n.children.length) {
          flattenInline(n.children, [...wrap, n], out);
        } else {
          const v = textOf(n);
          if (v) out.push({ value: v, wrap: wrap.slice(), atom: n });
        }
    }
  }
  return out;
}

function leavesText(leaves) {
  return leaves.map((l) => l.value).join("");
}

/* 按视觉长度切一段纯文本，返回 [前段, 后段] */
function splitTextByVisual(text, need) {
  if (need <= 0) return ["", text];
  let acc = 0;
  for (let i = 0; i < text.length; i += 1) {
    acc += /[㐀-䶿一-鿿豈-﫿＀-￯]/.test(text[i]) ? 1 : 0.56;
    if (acc >= need) return [text.slice(0, i + 1), text.slice(i + 1)];
  }
  return [text, ""];
}

/* 把叶子序列在视觉长度 target 处分成左右两段；普通文本叶可从中切断 */
function divideLeaves(leaves, target) {
  const left = [];
  const right = [];
  let acc = 0;
  let done = false;
  for (const leaf of leaves) {
    if (done) { right.push(leaf); continue; }
    const len = visualLength(leaf.value);
    if (leaf.atom) {
      if (acc === 0 || acc + len <= target) {
        left.push(leaf);
        acc += len;
      } else {
        right.push(leaf);
        done = true;
      }
    } else if (acc + len <= target) {
      left.push(leaf);
      acc += len;
    } else {
      const [lv, rv] = splitTextByVisual(leaf.value, target - acc);
      if (lv) left.push({ ...leaf, value: lv });
      if (rv) right.push({ ...leaf, value: rv });
      done = true;
    }
  }
  return { left, right };
}

/* 由叶子序列重建行内节点（克隆 strong/em 等包裹层，原子整体还原） */
function buildInline(leaves) {
  const out = [];
  const stack = []; // { node, arr }
  for (const leaf of leaves) {
    let common = 0;
    while (common < stack.length && common < leaf.wrap.length &&
      stack[common].node === leaf.wrap[common]) common += 1;
    while (stack.length > common) stack.pop();
    for (let k = common; k < leaf.wrap.length; k += 1) {
      const clone = { ...leaf.wrap[k], children: [] };
      (stack.length ? stack[stack.length - 1].arr : out).push(clone);
      stack.push({ node: leaf.wrap[k], arr: clone.children });
    }
    const arr = stack.length ? stack[stack.length - 1].arr : out;
    arr.push(leaf.atom ? { ...leaf.atom } : { type: "text", value: leaf.value });
  }
  return out;
}

/* 文本中最后一个句读位置（视觉长度，含其后的引号/括号收尾符） */
function lastSentencePos(text) {
  const re = /[。！？!?…]+[”’"』）)]*/g;
  let m;
  let last = 0;
  while ((m = re.exec(text))) last = m.index + m[0].length;
  return last ? visualLength(text.slice(0, last)) : 0;
}

/* 页内余量（px）换算为段落可容视觉字数 */
function paragraphCapChars(budget) {
  // 与 blockWeight 段落每行 LECTURE_PARA_CPL 视觉字的口径一致
  return Math.max(1, Math.floor((budget - 11) / LINE)) * LECTURE_PARA_CPL;
}

/* 行内感知的段落切分（保留加粗/斜体/链接/行内公式/上标等格式） ──
 * ★2026-10-29 续段观感修正（用户报「自然段分页后变两段、角标孤悬页首」）：
 * 1) 续片（pieces[k>0]）直接打上 para-cont 标记——同一自然段被跨页切断的后续片段，
 *    必须无首行缩进、无段首间距，视觉与上页尾连成同一段（旧实现只在 markContinuation
 *    里按「上一页尾文本是否句读」猜，且把类名写进 mdast 不识别的 properties 字段，
 *    实测 45 个续段页 0 个生效，续段全部带 2em 缩进+段距，看着像两段）；
 * 2) 脚注角标 <sup class="fn-ref">〔n〕 是「原子」，切断点若落在它前面，它会被整体
 *    推到下一页、孤悬在新页段首（实测全站 38 页如此）。切分后把右片开头的脚注角标
 *    收回左片尾部——角标逻辑上属于前文，不跨页。 */
const FN_SUP_RE = /^<sup\b[^>]*fn-ref/;
const FN_SUP_CLOSE_RE = /^<\/sup\s*>/i;
const isFnSupLeaf = (lf) => !!(lf && lf.atom && lf.atom.type === "html" && FN_SUP_RE.test(lf.atom.value || ""));

/* micromark 把行内 <sup class="fn-ref">〔n〕</sup> 拆成「开标签 html / 数字 text /
 * 闭标签 html」三个节点；若按原样切分，切点会落在开标签与数字之间，把标签撕裂
 * 跨页（上页尾留孤立开标签、下页首数字变普通文本+孤立闭标签——用户所见「注释角标
 * 孤悬页首」的真凶）。这里把三节点合并为一个不可切原子（一个完整 html 节点）。 */
function mergeFnSups(leaves) {
  const out = [];
  for (let i = 0; i < leaves.length; i += 1) {
    const a = leaves[i];
    const b = leaves[i + 1];
    const c = leaves[i + 2];
    if (a && a.atom && a.atom.type === "html" && FN_SUP_RE.test(a.atom.value || "") &&
        b && !b.atom && c && c.atom && c.atom.type === "html" && FN_SUP_CLOSE_RE.test(c.atom.value || "")) {
      const raw = (a.atom.value || "") + (b.value || "") + (c.atom.value || "");
      out.push({ value: b.value || "", wrap: b.wrap.slice(), atom: { type: "html", value: raw } });
      i += 2;
      continue;
    }
    out.push(a);
  }
  return out;
}

function splitParagraphPieces(node, firstBudget, restBudget) {
  let rest = mergeFnSups(flattenInline(node.children || []));
  const pieces = [];
  let budget = firstBudget;
  let guard = 0;
  while (rest.length && guard < 64) {
    guard += 1;
    const cap = paragraphCapChars(budget);
    if (visualLength(leavesText(rest)) <= cap) { pieces.push(rest); break; }
    let { left, right } = divideLeaves(rest, cap);
    const leftText = leavesText(left);
    if (!SENTENCE_END_RE.test(leftText)) {
      const pos = lastSentencePos(leftText);
      if (pos > 0 && pos >= cap * 0.6) ({ left, right } = divideLeaves(rest, pos));
    }
    // 脚注角标不跨页：右片若以「空白文本叶 + 角标原子」开头（源文档里 。与〔n〕
    // 之间的软换行会形成空白叶，卡住角标回收），先把空白收进左片，再把角标
    // 收回左片尾（可连续多个）。空白与角标都逐字守恒，仅改变切点。
    while (left.length && right.length) {
      if (isFnSupLeaf(right[0])) { left.push(right.shift()); continue; }
      if (!right[0].atom && !(right[0].value || "").trim()) { left.push(right.shift()); continue; }
      break;
    }
    if (!left.length) { // 首原子比整行还宽：整体带走，避免死循环
      left = rest.slice(0, 1);
      right = rest.slice(1);
    }
    pieces.push(left);
    rest = right;
    budget = restBudget;
  }
  return pieces
    .filter((lf) => leavesText(lf).trim() || lf.some((l) => l.atom))
    .map((lf, k) => {
      const piece = cloneWithChildren(node, buildInline(lf));
      if (k > 0) {
        // 续片：无首行缩进、无段首间距（与上页尾同属一个自然段）；
        // 保留源段落原有语义类（如 doc-lede），仅追加 para-cont
        const prevHp = (piece.data && piece.data.hProperties) || {};
        const prevCls = Array.isArray(prevHp.className) ? prevHp.className
          : (typeof prevHp.className === "string" ? prevHp.className.split(/\s+/).filter(Boolean) : []);
        piece.data = {
          ...(piece.data || {}),
          hProperties: { ...prevHp, className: [...prevCls.filter((c) => c !== "para-cont"), "para-cont"] },
        };
      }
      return piece;
    });
}

/* 超长段落（整块高于一页）的兜底切分 */
function splitParagraph(node, target = SPLIT_TARGET) {
  if (blockWeight(node) <= FIXED) return [node];
  const pieces = splitParagraphPieces(node, target, target);
  return pieces.length > 1 ? pieces : [node];
}

/* 把一个中栏原子块拆成若干不超过目标高度的块 */
function splitBlock(node) {
  const w = blockWeight(node);
  if (w <= FIXED) return [node];
  if (node.type === "list") return splitList(node);
  if (node.type === "paragraph") return splitParagraph(node);
  return [node]; // 图片、公式、HTML 脚注等不可拆，独占一页
}

/* 讲稿里的列表本质是「编号的散文要点」：markdown 空行不会断开列表，于是一个
 * <ol> 里常含若干条、每条又是一整段长文；列表只能在条目之间切，条目内部无法续页，
 * 整块翻页就留下大片空白。这里把中栏列表逐条展平成「带序号/圆点的普通段落」，
 * 层级用左缩进表达，随后交段落切分自然跨页，行文如笔记本逐行向下。
 * 原文纸的列表在分页前按条目展开。 */
function flattenListToBlocks(node) {
  if (!node || node.type !== "list") return null;
  const rows = flattenList(node);
  if (!rows.length) return null;
  const out = [];
  rows.forEach((row) => {
    const own = row.own || [];
    if (!own.length) return;
    const blocks = own.map((c) => ({ ...c }));
    const depthCls = row.depth > 0 ? [`list-flat-d${Math.min(row.depth, 4)}`] : [];
    const tag = (b, extra = []) => {
      b.data = b.data || {};
      const prev = b.data.hProperties?.className || [];
      b.data.hProperties = { ...(b.data.hProperties || {}), className: [...prev, ...extra, ...depthCls] };
    };
    const first = blocks[0];
    if (row.ordered) {
      const num = row.depth === 0 ? (node.start || 1) + (row.olIndex - 1) : (row.olIndex || 1);
      const marker = { type: "text", value: `${num}. ` };
      if (first.type === "paragraph") first.children = [marker, ...(first.children || [])];
      else blocks.unshift({ type: "paragraph", children: [marker] });
      blocks.forEach((b) => tag(b));
    } else {
      if (first.type === "paragraph") tag(first, ["list-flat-item"]);
      blocks.forEach((b) => tag(b));
    }
    out.push(...blocks);
  });
  return out;
}

/* 边界切分：当前页只剩 budget 时，把一个放不下的块「前段填满本页、后段翻页」。
 * 返回 ≥2 片（第 0 片用于填满本页），无法有意义切分（图片/公式/标题/过短余量）时返回 null。 */
function splitBlockAt(node, budget) {
  const n = u(node);
  if (!n) return null;
  if (n.type === "paragraph") {
    if (blockHasImage(n)) return null;
    const pieces = splitParagraphPieces(n, budget, SPLIT_TARGET);
    return pieces.length >= 2 && leavesText(flattenInline(pieces[0].children)).trim() ? pieces : null;
  }
  if (n.type === "list") {
    const pieces = splitListTo(n, budget, SPLIT_TARGET);
    return pieces.length >= 2 ? pieces : null;
  }
  return null;
}

/* ── 流动分页 ─────────────────────────────────────────────── */

/* 收集原文流：全部中栏 M 原子块（段落/列表/表格/图片/公式），文档顺序，可跨页续切。
 * 源 md 的 L/R 侧栏（col:L/col:R）只是铁律 12 判据的载体与解析兼容层，
 * 不再渲染为预置笔记——笔记纸内容唯一来源是 site/src/data/folio-notes.json。 */
function mainStreamFromBands(bands) {
  const mainStream = [];
  for (const band of bands) {
    for (const node of band.m) {
      // 讲稿列表逐条展平为带序号/圆点的普通段落，使行文可逐行自然续页
      const expanded = (node.type === "list" && flattenListToBlocks(node)) || [node];
      for (const base of expanded) {
        for (const piece of splitBlock(base)) {
          mainStream.push(piece);
        }
      }
    }
  }
  return mainStream;
}

function buildMainStream(folios) {
  const mainStream = [];
  for (const folio of folios) {
    mainStream.push(...mainStreamFromBands(folio.bands));
  }
  return mainStream;
}

/* 原文纸：逐行流动排满，一页排满才翻页（讲稿同款），段落自然跨页。
 * 返回 pages 及其 start（每页开始处的原文累计高度），供笔记纸对齐。 */
function flowPackMain(mainStream) {
  const pages = [];
  let chunk = { nodes: [], w: 0, start: 0 };
  let cumStart = 0;
  const newChunk = () => {
    if (!chunk.nodes.length) return; // 跳过空页
    chunk.start = cumStart;
    cumStart += chunk.w;
    pages.push(chunk);
    chunk = { nodes: [], w: 0, start: 0 };
  };

  // 防孤标题：标题后连两行正文都放不下时，标题才整体移到下页（避免页底孤零零一个标题）。
  // 原值 150 过于保守，会把其实还能排两三行的小节标题也翻页，凭空留出 1/4 页空白。
  const HEADING_KEEP = 60;
  const FILL_MIN = 48;      // 页尾余量≥约两行即续切填满，行文如翻书、自然段可在页底自然续到下页

  // markdown 标题与文献笔记的小节标题 <p class="doc-section"> 同样防孤行
  const isHeadingLike = (node) => node.type === "heading" ||
    (node.type === "html" && /class="doc-section"/.test(node.value || ""));

  const pageEmpty = () => !chunk.nodes.length;
  const pushBlock = (node, w) => { chunk.nodes.push(node); chunk.w += w; };

  // 把一个原子块放进当前页；放不下时优先「填满本页 + 续到下页」
  const place = (node) => {
    const w = blockWeight(node);
    if (node.type === "table" && w > FIXED) {
      const remaining = FIXED - chunk.w;
      const partial = !keepIndexedPages && !pageEmpty() && remaining >= 220
        ? splitTableTo(node, remaining, SPLIT_TARGET)
        : [];
      const first = partial[0];
      const pieces = first?.children.length >= 3 && blockWeight(first) <= remaining
        ? partial
        : splitTableTo(node, SPLIT_TARGET, SPLIT_TARGET);
      // 只有超出整页的长表才按行拆分。续页带表头，每页放一段。
      if (pieces.length > 1) {
        pieces.forEach((piece, index) => {
          if (index) newChunk();
          if (!pageEmpty() && chunk.w + blockWeight(piece) > FIXED) newChunk();
          pushBlock(piece, blockWeight(piece));
        });
        return;
      }
    }
    if (pageEmpty()) { pushBlock(node, w); return; }
    if (chunk.w + w <= FIXED) {
      // 标题孤行控制：标题后若几乎放不下正文，标题整体移到下页
      if (isHeadingLike(node) && FIXED - (chunk.w + w) < HEADING_KEEP) {
        newChunk();
        pushBlock(node, blockWeight(node));
        return;
      }
      pushBlock(node, w);
      return;
    }
    // 当前页放不下
    if (isHeadingLike(node)) { newChunk(); pushBlock(node, w); return; }
    const remaining = FIXED - chunk.w;
    if (remaining >= FILL_MIN) {
      const pieces = splitBlockAt(node, remaining);
      if (pieces && pieces.length >= 2) {
        const wa = blockWeight(pieces[0]);
        // 大片余白允许就近按句切分。两片都至少两行，避免制造孤行。
        const fillsPage = wa >= remaining - LINE * 1.2;
        const fillsLargeGap = !keepIndexedPages && remaining >= 350 &&
          node.type === "paragraph" && wa <= remaining && wa >= remaining * 0.72 &&
          blockWeight(pieces[1]) >= LINE * 2;
        if (fillsPage || fillsLargeGap) {
          pushBlock(pieces[0], wa);
          newChunk();
          for (let k = 1; k < pieces.length; k += 1) place(pieces[k]);
          return;
        }
      }
    }
    newChunk();
    pushBlock(node, w);
  };

  /* ── 图文粘连（用户：「漫画说明放在漫画底下」）──
   * 图片块与其紧随的 fig-caption 说明块在源 md 里是两个独立块，分页器会把说明
   * 挤到下一页（且图片估算里预留了「幻影题注」空间，进一步把真题注推走）。
   * 这里把「图片 + 紧随 fig-caption」打包成不可分原子组：放得下就同页，
   * 放不下整组一起翻页，说明永远紧贴图片下方，绝不分离到两页。 */
  const isImgBlock = (n) => blockHasImage(n) || (n.type === "html" && /<img/i.test(n.value || ""));
  const isFigCaption = (n) => n.type === "html" && /fig-caption/.test(n.value || "");
  const isTableLead = (node) => node?.type === "paragraph" && /[：:]$/u.test(textOf(node).trim());
  const groups = [];
  const imageLead = (node) => isHeadingLike(node) || (node?.type === "paragraph" &&
    /(?:下图|如图|[：:]$)/u.test(textOf(node).trim()));
  for (let gi = 0; gi < mainStream.length; gi += 1) {
    const n = mainStream[gi];
    const next = mainStream[gi + 1];
    const table = mainStream[gi + 2];
    if (isHeadingLike(n) && isTableLead(next) && table?.type === "table" &&
        blockWeight(n) + blockWeight(next) + blockWeight(table) <= FIXED) {
      groups.push([n, next, table]);
      gi += 2;
    } else if (isTableLead(n) && next?.type === "table" && blockWeight(n) + blockWeight(next) <= FIXED) {
      groups.push([n, next]);
      gi += 1;
    } else if (!keepIndexedPages && imageLead(n) && standaloneImage(next)) {
      const group = [n, next];
      if (isFigCaption(table)) group.push(table);
      if (group.reduce((sum, block) => sum + blockWeight(block), 0) <= FIXED) {
        groups.push(group);
        gi += group.length - 1;
      } else {
        groups.push([n]);
      }
    } else if (isImgBlock(n) && next && isFigCaption(next)) {
      groups.push([n, mainStream[gi + 1]]);
      gi += 1;
    } else {
      groups.push([n]);
    }
  }
  const groupWeight = (group) => group.reduce((sum, node) => sum + blockWeight(node), 0);
  const placeGroup = (group) => {
    const gw = groupWeight(group);
    if (!keepIndexedPages && !pageEmpty() && chunk.w + gw > FIXED) {
      const image = group.map(standaloneImage).find(Boolean);
      const reduction = chunk.w + gw - FIXED;
      if (image && imgDims.has(image.url)) {
        const height = imageWeight(image, 0);
        // 页底稍差一点空间时，等比缩图以保留图文关系和读图尺寸。
        if (reduction <= height * 0.16 && height - reduction >= 240) {
          const width = Math.floor((height - reduction) * imgDims.get(image.url).w / imgDims.get(image.url).h);
          image.data = { ...image.data, hProperties: { ...image.data?.hProperties, width } };
          group.forEach((node) => pushBlock(node, blockWeight(node)));
          return;
        }
      }
    }
    if (group.length === 1) { place(group[0]); return; }
    if (!pageEmpty() && chunk.w + gw > FIXED) newChunk();
    group.forEach((n) => pushBlock(n, blockWeight(n)));
  };

  for (const group of groups) placeGroup(group);
  if (!pageEmpty()) newChunk();
  if (!keepIndexedPages && pages.length > 1) {
    const tail = pages.at(-1);
    const previous = pages.at(-2);
    // 一两行的尾页优先并回前页，或与前页末尾的若干自然段平衡。
    if (tail.w <= 105 && tail.nodes.every(node => node.type === "paragraph" && !blockHasImage(node))) {
      if (previous.w + tail.w <= FIXED + 30) {
        previous.nodes.push(...tail.nodes);
        pages.pop();
      } else {
        const groupByEnd = new Map(groups.map((group) => [group.at(-1), group]));
        let cut = previous.nodes.length;
        let moved = 0;
        while (cut > 1 && moved < 220) {
          const group = groupByEnd.get(previous.nodes[cut - 1]) ?? [previous.nodes[cut - 1]];
          if (cut <= group.length) break;
          cut -= group.length;
          moved += groupWeight(group);
        }
        if (moved >= 220 && previous.w - moved >= 380 && !isHeadingLike(previous.nodes[cut - 1])) {
          tail.nodes.unshift(...previous.nodes.splice(cut));
        }
      }
    }
  }
  return pages;
}

/* 原文纸分页：逐行流动排满，一页排满才翻页。
 * 每页笔记纸不再由源 md 侧栏预填（2026-10-26 起预置笔记已清空），
 * 笔记文本在渲染时由 folio-notes.json 逐页注入（见主转换函数）。 */
function packPages(mainStream) {
  const mainPages = flowPackMain(mainStream);
  return mainPages.map((p) => ({ m: p.nodes }));
}

/* ── mdast 组装（remark 阶段以 html 节点包裹原始 mdast 内容） ──── */

function htmlNode(value) {
  return { type: "html", value };
}

function annotateEst(nodes) {
  if (!process.env.LEC_DEBUG) return nodes;
  return nodes.map((node) => {
    if (!node || typeof node !== "object" || !node.type) return node;
    const w = blockWeight(node);
    node.data = node.data || {};
    node.data.hProperties = { ...(node.data.hProperties || {}), "data-est": Math.round(w) };
    return node;
  });
}

/* 普通讲稿/文献页：左右双纸「原文纸 / 笔记纸」布局。
 * - 原文纸（main）：中栏 M 原文，沿用 .folio__col--main 全套排版；
 * - 笔记纸（notes）：内容唯一来源是 site/src/data/folio-notes.json（构建期逐字烤入），
 *   md 侧栏（col:L/col:R）不再渲染为预置笔记（2026-10-26 起，笔记纸改本地可编辑 + 云端只读）；
 * 默认笔记纸叠在原文纸正后方（CSS 绝对定位），导航铅笔按钮触发 body 类后两纸左右摊开。 */
function makeSpreadFolio(label, page, index, noteText) {
  return [
    htmlNode(`<section class="folio folio--spread" data-page="${index + 1}">`),
    htmlNode(`<div class="folio__paper folio__paper--main">`),
    htmlNode(`<div class="folio__col folio__col--main">`),
    ...annotateEst(page.m),
    htmlNode(`</div>`),
    htmlNode(
      `<div class="folio__pageno"><span>${label || `第 ${index + 1} 页`}</span></div>`,
    ),
    htmlNode(`</div>`),
    htmlNode(`<div class="folio__paper folio__paper--notes">`),
    htmlNode(`<div class="folio__col folio__col--notes">`),
    // 构建期笔记文本逐字写入（换行/空格由 pre-wrap 原样呈现）；本地仍可继续编辑
    htmlNode(`<div class="folio__edit" contenteditable="false" data-page="${index + 1}" aria-label="笔记纸（本地可编辑）">${escapeHtml(noteText || "")}</div>`),
    htmlNode(`</div>`),
    htmlNode(`</div>`),
    htmlNode(`</section>`),
  ];
}

export function remarkSpreadFolio() {
  return (tree, file) => {
    const folios = parseFolios(tree);
    if (!folios.length) return;

    imgDims = loadImageDims(folios, file);

    const docNotes = loadFolioNotes()[sourceDocKey(file)] || {};
    // 已有笔记按页码索引，保留对应文档的分页口径。
    keepIndexedPages = Object.values(docNotes).some((text) => text.trim());
    const pages = packPages(buildMainStream(folios));
    const children = [];
    pages.forEach((page, i) => {
      children.push(
        ...makeSpreadFolio(`第 ${i + 1} 页`, page, i, docNotes[String(i + 1)] || ""),
      );
    });
    // 注入源 md 相对路径，供本地编辑服务把笔记回写进 folio-notes.json 的对应键
    if (sourceDocKey(file)) {
      children.unshift(htmlNode(`<div hidden data-cahier-source="${escapeHtml(sourceDocKey(file))}"></div>`));
    }
    tree.children = children;
  };
}

export default remarkSpreadFolio;
