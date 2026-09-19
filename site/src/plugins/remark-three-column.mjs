/**
 * remark-three-column
 * ────────────────────────────────────────────────────────────
 * 把「按 PDF 页组织、三栏（左批注 / 中原文 / 右批注）」的 Markdown
 * 转成结构化的 folio 容器，交给前端 CSS 排成 LaTeX 风格三栏。
 *
 * 源文件用 HTML 注释作为边界（注释本身会被移除）：
 *
 *   <!--folio:第 1 页-->
 *   <!--col:L-->
 *   （左栏：黑色引导问题 / 左侧笔记，Markdown）
 *   <!--col:M-->
 *   （中栏：文献原文，含 <mark> 高亮 / <u> 下划线 / 公式 / 图片）
 *   <!--col:R-->
 *   （右栏：红色手写批注的转录文本，Markdown）
 *   <!--/folio-->
 *
 * 一页之内可用「分带」让左右批注与中栏对应文本在同一垂直高度对齐：
 *
 *   <!--folio:第 2 页-->
 *   <!--col:L-->…第 1 带左注…<!--col:M-->…第 1 带原文…<!--col:R-->…
 *   <!--band-->
 *   <!--col:L-->…第 2 带左注…<!--col:M-->…第 2 带原文…<!--col:R-->…
 *   <!--/folio-->
 *
 * ── A4 纸感分页（出版社编书式收高 + 超高页优雅拆分）──────────
 * 源文档按 PDF 页硬切 `<!--folio-->`，会出现：
 *   · 末页只剩一两句（矮页 191–500px）；
 *   · 某些页一大坨（超高页），与健康页忽高忽矮。
 * 本插件在输出阶段做一次**只搬页界、不动一字**的重排：
 *   1. 把所有「带（band）」按原文顺序拍平，估算每带视觉重量
 *      （中栏正文字符 + 图片权重）；
 *   2. 以「原文档平均页密度」为目标重装页：任一页不超过目标 1.3 倍
 *      （超高页装不下就优雅翻页拆开），低于 0.55 倍视为矮页合并；
 *   3. 一带是三栏对齐最小单元，不在带内拆（保护 L/M/R 垂直对齐）；
 *   4. 重排后按新页序重新标注「跨页续段」（para-cont），并顺序重编页码。
 * 教学讲稿与文献笔记都过同一套；结构容错（新 folio 未闭合上一页）照常。
 * ────────────────────────────────────────────────────────────
 */

const FOLIO_OPEN = /^<!--\s*folio\s*[:：]\s*(.*?)\s*-->$/i;
const FOLIO_CLOSE = /^<!--\s*\/\s*folio\s*-->$/i;
const COL_SWITCH = /^<!--\s*col\s*[:：]\s*([LMRlmr])\s*-->$/i;
const BAND_BREAK = /^<!--\s*band\s*-->$/i;

function colClass(side) {
  const s = side.toUpperCase();
  if (s === 'L') return ['folio__col', 'folio__col--left'];
  if (s === 'R') return ['folio__col', 'folio__col--right'];
  return ['folio__col', 'folio__col--main'];
}

function makeCol(side, children) {
  return {
    type: 'folioCol',
    data: {
      hName: 'div',
      hProperties: { className: colClass(side), 'data-col': side.toUpperCase() },
    },
    children,
  };
}

function makeBand(buckets, bandIndex) {
  const cols = [];
  // 固定 L / M / R 顺序，缺省补空栏，保证中栏永远居中
  for (const side of ['L', 'M', 'R']) {
    cols.push(buckets.has(side) ? buckets.get(side) : makeCol(side, []));
  }
  return {
    type: 'folioBand',
    data: {
      hName: 'div',
      hProperties: { className: ['folio__band'], 'data-band': String(bandIndex) },
    },
    children: cols,
  };
}

function makePageno(label) {
  return {
    type: 'folioPageNo',
    data: {
      hName: 'p',
      hProperties: { className: ['folio__pageno'], 'aria-hidden': 'true' },
    },
    children: [{ type: 'text', value: label }],
  };
}

function makeFolio(label, bandBucketList) {
  const children = [];
  bandBucketList.forEach((buckets, index) => {
    children.push(makeBand(buckets, index + 1));
  });
  if (label && label.trim()) {
    children.push(makePageno(label.trim()));
  }
  return {
    type: 'folio',
    data: {
      hName: 'section',
      hProperties: {
        className: ['folio'],
        'data-page': label ? label.trim() : '',
      },
    },
    children,
  };
}

const BOUNDARY_RE = /(<!--\s*(?:folio\s*[:：][^>]*?|\/\s*folio|col\s*[:：]\s*[LMRlmr]|band)\s*-->)/;

// 句末/收束标点：以这些字符结尾说明段落完整；否则是被分页切开的续段
const END_PUNCT_RE = /[。！？!?…：；;”"’』）)】》\.．]\s*$/u;

function nodeText(node) {
  if (node.type === 'text') return node.value;
  if (Array.isArray(node.children)) {
    for (let i = node.children.length - 1; i >= 0; i -= 1) {
      const t = nodeText(node.children[i]);
      if (t) return t;
    }
  }
  return '';
}

// 取一栏正文的结尾文本（跳过脚注 div 等 html 节点）
function columnTailText(col) {
  if (!col?.children) return '';
  for (let i = col.children.length - 1; i >= 0; i -= 1) {
    const n = col.children[i];
    if (n.type === 'html') continue;
    const t = nodeText(n);
    if (t && t.trim()) return t.trim();
  }
  return '';
}

function isMainCol(node) {
  return Array.isArray(node?.data?.hProperties?.className)
    && node.data.hProperties.className.includes('folio__col--main');
}

/* ── 跨页续段标注（重排后统一执行）── */
function paraContinue(firstBand, prevTail) {
  if (!prevTail || END_PUNCT_RE.test(prevTail)) return;
  const main = firstBand?.children?.find(isMainCol);
  const firstP = main?.children?.find((n) => n.type === 'paragraph');
  if (!firstP) return;
  const prev = firstP.data?.hProperties?.className ?? [];
  const className = Array.isArray(prev) ? prev : [String(prev)];
  if (className.includes('para-cont')) return;
  firstP.data = {
    ...(firstP.data ?? {}),
    hProperties: {
      ...(firstP.data?.hProperties ?? {}),
      className: [...className, 'para-cont'],
    },
  };
}

// 清掉所有既有的 para-cont（重排后会重新计算）
function stripParaCont(folios) {
  for (const folio of folios) {
    for (const child of folio.children) {
      if (child.type !== 'folioBand') continue;
      for (const col of child.children) {
        for (const n of col.children ?? []) {
          if (n.type === 'paragraph' && Array.isArray(n.data?.hProperties?.className)
              && n.data.hProperties.className.includes('para-cont')) {
            n.data.hProperties.className = n.data.hProperties.className.filter((c) => c !== 'para-cont');
          }
        }
      }
    }
  }
}

function applyContinuation(folios) {
  let prevTail = '';
  for (const folio of folios) {
    const bands = folio.children.filter((c) => c.type === 'folioBand');
    paraContinue(bands[0], prevTail);
    const lastBand = bands[bands.length - 1];
    const lastMain = lastBand?.children?.find(isMainCol);
    prevTail = columnTailText(lastMain);
  }
}

/* ── A4 纸感分页：按带估算重量 ── */
function walk(node, fn) {
  fn(node);
  if (Array.isArray(node.children)) for (const c of node.children) walk(c, fn);
}

// 单个带（band）的视觉重量：中栏正文字符 + 图片权重
// （一张插图约等于半屏高，按 550 字符当量计入）
function bandWeight(bandNode) {
  let chars = 0;
  let images = 0;
  const main = (bandNode.children ?? []).find(isMainCol);
  if (!main) return 0;
  walk(main, (n) => {
    if (n.type === 'text') chars += n.value.replace(/\s/g, '').length;
    else if (n.type === 'image') images += 1;
    else if (n.type === 'html' && typeof n.value === 'string'
      && /<img|markdown-image|<figure/i.test(n.value)) images += 1;
  });
  return chars + images * 550;
}

/* ── A4 纸感分页：拍平 → 按带重装页 ──
   源文档按 PDF 页硬切，会出现矮页（一两句）与超高页（一大坨）。
   这里把所有「带」按原文顺序拍平，再以「平均页密度」为目标、
   每页不超过目标 1.3 倍、低于 0.55 倍视为矮页：
     · 贪心装带：下一带会撑过上限 → 优雅翻页（超高页自然被拆开）；
     · 末页矮页回并前一页（合并不撑爆时）。
   一带是三栏对齐的最小单元，不在带内拆（避免破坏 L/M/R 垂直对齐）；
   单带本身超高则保留为一页（可接受的优雅下限）。
   仅搬页界、不动一字；重排后统一重编页码与跨页续段。 */
function rebalanceFolios(folios) {
  if (folios.length <= 3) return folios;

  // 1. 拍平成有序带（保留原文阅读顺序）
  const bands = [];
  for (const f of folios) {
    for (const c of f.children) {
      if (c.type === 'folioBand') bands.push(c);
    }
  }
  if (bands.length <= 3) return folios;

  // 2. 目标页重 ≈ 原文档平均页密度（总量 ÷ 原页数）
  const weights = bands.map(bandWeight);
  const totalW = weights.reduce((a, b) => a + b, 0);
  const target = (totalW / folios.length) || 1;
  const MAX = target * 1.3;
  const MIN = target * 0.55;

  // 3. 贪心把带装进页：装到下一带会超 MAX 就翻页
  const pages = [];
  let cur = { bands: [], w: 0 };
  for (let i = 0; i < bands.length; i += 1) {
    if (cur.bands.length === 0) {
      cur.bands.push(bands[i]);
      cur.w += weights[i];
    } else if (cur.w + weights[i] <= MAX) {
      cur.bands.push(bands[i]);
      cur.w += weights[i];
    } else {
      pages.push(cur);
      cur = { bands: [bands[i]], w: weights[i] };
    }
  }
  if (cur.bands.length) pages.push(cur);

  // 4. 末页矮页：并回前一页（若合并不撑爆）
  while (pages.length >= 2) {
    const last = pages[pages.length - 1];
    const prev = pages[pages.length - 2];
    if (last.w < MIN && prev.w + last.w <= MAX) {
      prev.bands.push(...last.bands);
      prev.w += last.w;
      pages.pop();
    } else break;
  }
  // 全程只有一页（无可重排）→ 原样
  if (pages.length <= 1) return folios;

  // 5. 重建成 folio（顺序重编页码）
  return pages.map((p, gi) => {
    const label = `第${gi + 1}页`;
    return {
      type: 'folio',
      data: {
        hName: 'section',
        hProperties: { className: ['folio'], 'data-page': label },
      },
      children: [...p.bands, makePageno(label)],
    };
  });
}

function normalizeBoundaries(children) {
  // 把混在同一个 html 节点里的「边界注释 + 其他 HTML」拆成独立节点，
  // 保证 folio/col/band 边界一定能被状态机单独识别。
  const result = [];
  for (const node of children) {
    if (node.type === 'html' && typeof node.value === 'string' && BOUNDARY_RE.test(node.value)) {
      const pieces = node.value.split(BOUNDARY_RE).filter((s) => s.length > 0);
      for (const piece of pieces) {
        if (!piece.trim()) continue;
        result.push({ type: 'html', value: piece });
      }
    } else {
      result.push(node);
    }
  }
  return result;
}

export function remarkThreeColumn() {
  return (tree, file) => {
    tree.children = normalizeBoundaries(tree.children);

    const out = [];
    let inFolio = false;
    let folioLabel = '';
    let currentSide = null;
    let buckets = null; // Map L/M/R -> node[]（当前带）
    let bands = null; // 已闭合的带（Map 列表）
    let preFolio = []; // folio 开始前的游离节点

    const ensureCol = (side) => {
      if (!buckets.has(side)) buckets.set(side, makeCol(side, []));
      return buckets.get(side);
    };

    const pushCurrent = (node) => {
      if (inFolio) {
        // folio 已开始但还没选栏，默认进中栏
        if (!currentSide) currentSide = 'M';
        ensureCol(currentSide).children.push(node);
      } else {
        preFolio.push(node);
      }
    };

    const flushPre = () => {
      if (preFolio.length) {
        out.push(...preFolio);
        preFolio = [];
      }
    };

    // 闭合当前带：快照进 bands，并开出新的空带
    const closeBand = () => {
      bands.push(buckets);
      buckets = new Map();
      currentSide = null;
    };

    // 收口当前 folio：输出为一个 folio section
    const flushFolio = () => {
      closeBand();
      out.push(makeFolio(folioLabel, bands));
    };

    for (const node of tree.children) {
      if (node.type !== 'html' || typeof node.value !== 'string') {
        pushCurrent(node);
        continue;
      }
      const raw = node.value.trim();
      const open = raw.match(FOLIO_OPEN);
      const close = raw.match(FOLIO_CLOSE);
      const col = raw.match(COL_SWITCH);
      const band = raw.match(BAND_BREAK);

      if (open) {
        // ★容错：新 folio 开启而上一 folio 未闭合 → 先收口上一 folio，
        //   避免旧版「直接重置 buckets 静默丢弃前一页」的结构 bug。
        if (inFolio) flushFolio();
        flushPre();
        inFolio = true;
        folioLabel = open[1];
        buckets = new Map();
        bands = [];
        currentSide = null;
        continue;
      }
      if (col && inFolio) {
        currentSide = col[1].toUpperCase();
        ensureCol(currentSide);
        continue;
      }
      if (band && inFolio) {
        closeBand();
        continue;
      }
      if (close && inFolio) {
        flushFolio();
        inFolio = false;
        folioLabel = '';
        buckets = null;
        bands = null;
        currentSide = null;
        continue;
      }
      // 普通 html 节点
      pushCurrent(node);
    }

    // 文件末尾若未闭合，自动收口
    if (inFolio && buckets && bands) {
      flushFolio();
    }
    // 全文没有任何 folio 标记 → 自动包成单页三栏
    // （中栏 = 全部内容；左右便签纸为空但同样呈现，保证笔记栏连贯）
    if (!out.some((n) => n.type === 'folio') && preFolio.length) {
      const cols = new Map();
      cols.set('M', makeCol('M', preFolio));
      out.push(makeFolio('', [cols]));
      preFolio = [];
    }
    flushPre();

    /* ── 输出后处理：A4 纸感均衡分页（教学讲稿与文献笔记都过）── */
    const folios = out.filter((n) => n.type === 'folio');
    if (folios.length) {
      stripParaCont(folios);
      const finalFolios = rebalanceFolios(folios);
      applyContinuation(finalFolios);
      if (finalFolios !== folios) {
        // 合并后 folio 数量变少：把首个原 folio 的位置换成全部重排后的 folio，
        // 跳过其余原 folio，非 folio 节点（页首/页尾游离节点）保持原位。
        const rebuilt = [];
        let inserted = false;
        for (const node of out) {
          if (node.type === 'folio') {
            if (!inserted) {
              rebuilt.push(...finalFolios);
              inserted = true;
            }
          } else {
            rebuilt.push(node);
          }
        }
        out.length = 0;
        out.push(...rebuilt);
      }
    }

    tree.children = out;
    return tree;
  };
}

export default remarkThreeColumn;
