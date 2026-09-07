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
 * 输出 mdast（hast 阶段渲染为）：
 *   <section class="folio" data-page="第 1 页">
 *     <p class="folio__pageno">第 1 页</p>
 *     <div class="folio__col folio__col--L">…</div>
 *     <div class="folio__col folio__col--M">…</div>
 *     <div class="folio__col folio__col--R">…</div>
 *   </section>
 * ────────────────────────────────────────────────────────────
 */

const FOLIO_OPEN = /^<!--\s*folio\s*[:：]\s*(.*?)\s*-->$/i;
const FOLIO_CLOSE = /^<!--\s*\/\s*folio\s*-->$/i;
const COL_SWITCH = /^<!--\s*col\s*[:：]\s*([LMRlmr])\s*-->$/i;

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

function makeFolio(label, cols) {
  const children = [];
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
  // 固定 L / M / R 顺序，缺省补空栏，保证中栏永远居中
  for (const side of ['L', 'M', 'R']) {
    children.push(cols.has(side) ? cols.get(side) : makeCol(side, []));
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

const BOUNDARY_RE = /(<!--\s*(?:folio\s*[:：][^>]*?|\/\s*folio|col\s*[:：]\s*[LMRlmr])\s*-->)/;

function normalizeBoundaries(children) {
  // 把混在同一个 html 节点里的「边界注释 + 其他 HTML」拆成独立节点，
  // 保证 folio/col 边界一定能被状态机单独识别。
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
    let buckets = null; // Map L/M/R -> node[]
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

    for (const node of tree.children) {
      if (node.type !== 'html' || typeof node.value !== 'string') {
        pushCurrent(node);
        continue;
      }
      const raw = node.value.trim();
      const open = raw.match(FOLIO_OPEN);
      const close = raw.match(FOLIO_CLOSE);
      const col = raw.match(COL_SWITCH);

      if (open) {
        flushPre();
        inFolio = true;
        folioLabel = open[1];
        buckets = new Map();
        currentSide = null;
        continue;
      }
      if (col && inFolio) {
        currentSide = col[1].toUpperCase();
        ensureCol(currentSide);
        continue;
      }
      if (close && inFolio) {
        out.push(makeFolio(folioLabel, buckets));
        inFolio = false;
        folioLabel = '';
        buckets = null;
        currentSide = null;
        continue;
      }
      // 普通 html 节点
      pushCurrent(node);
    }

    // 文件末尾若未闭合，自动收口
    if (inFolio && buckets) {
      const cols = new Map(buckets);
      out.push(makeFolio(folioLabel, cols));
    }
    // 全文没有任何 folio 标记 → 自动包成单页三栏
    // （中栏 = 全部内容；左右便签纸为空但同样呈现，保证笔记栏连贯）
    if (!out.some((n) => n.type === 'folio') && preFolio.length) {
      const cols = new Map();
      cols.set('M', makeCol('M', preFolio));
      out.push(makeFolio('', cols));
      preFolio = [];
    }
    flushPre();

    tree.children = out;
    return tree;
  };
}

export default remarkThreeColumn;
