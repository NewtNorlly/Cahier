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
 * 每一带（band）都是独立的三栏网格行：带内三栏顶部对齐，
 * 因此批注会出现在其呼应原文「差不多的高度」，而不是一律堆在页首。
 * 不写 <!--band--> 时整页退化为单带（与旧版结构等价）。
 *
 * 输出 mdast（hast 阶段渲染为）：
 *   <section class="folio" data-page="第 1 页">
 *     <div class="folio__band" data-band="1">
 *       <div class="folio__col folio__col--L">…</div>
 *       <div class="folio__col folio__col--M">…</div>
 *       <div class="folio__col folio__col--R">…</div>
 *     </div>
 *     <p class="folio__pageno">第 1 页</p>
 *   </section>
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

function makeFolio(label, bandBucketList) {
  const children = [];
  bandBucketList.forEach((buckets, index) => {
    children.push(makeBand(buckets, index + 1));
  });
  if (label && label.trim()) {
    children.push({
      type: 'folioPageNo',
      data: {
        hName: 'p',
        hProperties: { className: ['folio__pageno'], 'aria-hidden': 'true' },
      },
      children: [{ type: 'text', value: label.trim() }],
    });
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

// 跨页续段：上一页中栏结尾无句末标点 → 本页首个中栏正文段不缩进
function markContinuation(bandList, prevTail) {
  if (!prevTail || END_PUNCT_RE.test(prevTail)) return;
  const firstBuckets = bandList[0];
  if (!firstBuckets) return;
  const main = firstBuckets.get('M');
  if (!main) return;
  const firstP = main.children.find((n) => n.type === 'paragraph');
  if (!firstP) return;
  const prev = firstP.data?.hProperties?.className ?? [];
  const className = Array.isArray(prev) ? prev : [String(prev)];
  firstP.data = {
    ...(firstP.data ?? {}),
    hProperties: {
      ...(firstP.data?.hProperties ?? {}),
      className: [...className, 'para-cont'],
    },
  };
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
  return (tree) => {
    tree.children = normalizeBoundaries(tree.children);
    const out = [];
    let inFolio = false;
    let folioLabel = '';
    let currentSide = null;
    let buckets = null; // Map L/M/R -> node[]（当前带）
    let bands = null; // 已闭合的带（Map 列表）
    let preFolio = []; // folio 开始前的游离节点
    let prevMainTail = ''; // 上一 folio 中栏正文结尾文本（判跨页续段）

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
        closeBand();
        markContinuation(bands, prevMainTail);
        out.push(makeFolio(folioLabel, bands));
        const lastMain = bands[bands.length - 1]?.get('M');
        prevMainTail = columnTailText(lastMain);
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
      closeBand();
      markContinuation(bands, prevMainTail);
      out.push(makeFolio(folioLabel, bands));
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

    tree.children = out;
    return tree;
  };
}

export default remarkThreeColumn;
