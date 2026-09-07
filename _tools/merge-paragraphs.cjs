/**
 * merge-paragraphs.cjs v2 — 修复 OCR 断行（半句段落合并），流式处理，保留标题/标签行
 * 规则：
 *  - 仅处理 folio 的 M 栏文本行
 *  - 文本块以「句末标点（。！？；：”’）》】』」…）」结尾 → 段落结束
 *  - 否则与下一个文本块（中间仅空行/无结构行）拼接，删除中间空行
 *  - 标题、列表、引用、HTML 标签行原样保留，并阻断合并
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGET = process.argv[2] || 'all';
const ROOTS = ['中国法制史','决策理论与方法','土地资源管理','宪法','德语','文献笔记','民事诉讼法','知识产权法基础理论','社会保障学','脑图集'];

function listMd() {
  const out = [];
  for (const r of ROOTS) {
    const dir = path.join(ROOT, r);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) if (f.endsWith('.md')) out.push(path.join(dir, f));
  }
  return out;
}

const END_PUNCT = /[。！？；：”’）》】』」…]/;

function visibleTail(s) {
  let t = s.trim();
  let prev;
  do {
    prev = t;
    t = t.replace(/(?:<\/?(?:u|mark|sup|em|strong|b|i)>)+$/, '')
         .replace(/<sup class="fn-ref">〔\d+〕<\/sup>$/, '')
         .replace(/<u>$/, '').replace(/<mark>$/, '');
  } while (t !== prev);
  return t;
}

function isTextLine(l) {
  const t = l.trim();
  if (!t) return false;
  if (t.startsWith('<!--')) return false;
  if (/^#{1,6}\s/.test(t)) return false;
  if (t.startsWith('>')) return false;
  if (/^[-*]\s+/.test(t)) return false;
  if (/^\d+[.、)]\s*/.test(t)) return false;
  if (/^<\/?[a-zA-Z][^>]*>?\s*$/.test(t)) return false;   // 纯标签行
  if (/^<div /.test(t)) return false;
  if (/^<span /.test(t)) return false;
  if (/^<p /.test(t)) return false;
  return true;
}

function processFile(p) {
  const s = fs.readFileSync(p, 'utf8');
  const lines = s.split('\n');
  const res = [];
  let inFolio = false, inM = false, inFn = false;
  let pending = null;   // 未以句末标点结尾、等待与下一文本块拼接的文本
  let ended = null;     // 已结束、等待输出的文本
  let skipBlank = false; // pending 未结束时吞掉空行
  let quotePending = null; // 引用块内断行合并（> 行）
  let carryQuote = null;   // 跨 folio 未结束的引用（页尾断行）

  const flushAll = () => {
    if (pending !== null) { res.push(pending); pending = null; }
    if (ended !== null) { res.push(ended); ended = null; }
    if (quotePending !== null) {
      if (!END_PUNCT.test(quotePending.slice(-1)) && inFolio) { carryQuote = quotePending; }
      else res.push(quotePending);
      quotePending = null;
    }
    skipBlank = false;
  };

  // 拼接规则：英文断词（fundamen- + tal → fundamental）、英文词间补空格（of + its → of its）
  const join = (a, b) => {
    if (/[A-Za-z]-$/.test(a) && /^[a-z]/.test(b)) return a.slice(0, -1) + b;
    if (/[A-Za-z0-9]$/.test(a) && /^[A-Za-z0-9]/.test(b)) return a + ' ' + b;
    return a + b;
  };

  const onQuoteLine = (line) => {
    // 引用块内文本行断行合并：> 内容1\n> 内容2（未以句末标点结尾则拼接）
    const t = line.trim().replace(/^>\s*/, '');
    if (/^\[!/.test(t) || /^\*（/.test(t) || /^_/.test(t) && t.endsWith('_')) {
      if (quotePending !== null) { res.push(quotePending); quotePending = null; }
      res.push(line);
      return;
    }
    if (quotePending !== null && !END_PUNCT.test(quotePending.slice(-1))) {
      quotePending = join(quotePending, t);
    } else {
      if (quotePending !== null) { res.push(quotePending); quotePending = null; }
      quotePending = '> ' + t;
    }
  };

  const onTextLine = (line) => {
    const t = line.trim();
    if (pending !== null) {
      pending = join(pending, t);
    } else if (ended !== null) {
      res.push(ended);
      if (res[res.length - 1] !== '') res.push(''); // 段间补空行
      ended = null;
      pending = t;
    } else {
      pending = t;
    }
    // 判断是否结束
    if (END_PUNCT.test(visibleTail(pending).slice(-1))) {
      ended = pending;
      pending = null;
    }
  };

  const onBlankLine = () => {
    if (pending !== null) {
      // 段落未结束：吞掉空行，等待下一文本块拼接
      skipBlank = true;
      return;
    }
    if (quotePending !== null && !END_PUNCT.test(quotePending.slice(-1))) {
      // 引用块断行跨空行：吞空行，等待下一行拼接
      return;
    }
    if (ended !== null) { res.push(ended); ended = null; }
    if (quotePending !== null) { res.push(quotePending); quotePending = null; }
    res.push('');
  };

  const onStructLine = (line) => {
    const had = pending !== null || ended !== null || quotePending !== null;
    flushAll();
    if (had && res.length && res[res.length - 1] !== '') res.push(''); // 结构行前补空行
    res.push(line);
  };

  for (const line of lines) {
    const t = line.trim();
    if (/^<!--\s*\/\s*folio\s*-->$/i.test(t)) { flushAll(); inFolio = false; inM = false; inFn = false; res.push(line); continue; }
    if (/^<!--\s*folio\s*[:：]/i.test(t)) { flushAll(); inFolio = true; inM = false; inFn = false; res.push(line); continue; }
    if (/^<!--\s*col\s*[:：]\s*([LMRlmr])\s*-->$/i.test(t)) {
      flushAll();
      const m = t.match(/^<!--\s*col\s*[:：]\s*([LMRlmr])\s*-->$/i);
      inM = m[1].toUpperCase() === 'M';
      res.push(line); continue;
    }
    if (/<div class="folio-footnotes">/.test(line)) inFn = true;

    if (inFolio && inM && !inFn) {
      if (carryQuote !== null) {
        // 跨页引用续行：空行保留（carryQuote 不输出），首个文本行（裸文本或 > 行）并入
        if (t === '') { onBlankLine(); continue; }
        if (t.startsWith('>')) { quotePending = carryQuote; carryQuote = null; onQuoteLine(line); }
        else if (isTextLine(line)) { quotePending = carryQuote; carryQuote = null; onQuoteLine('> ' + t); }
        else { res.push(carryQuote); carryQuote = null; onStructLine(line); }
        continue;
      }
      if (t === '') onBlankLine();
      else if (isTextLine(line)) {
        // 引用块断行续行可能丢失 > 前缀（裸文本）：并入未结束的引用块
        if (quotePending !== null && !END_PUNCT.test(quotePending.slice(-1))) onQuoteLine('> ' + t);
        else onTextLine(line);
      }
      else if (t.startsWith('>')) onQuoteLine(line);
      else onStructLine(line);
    } else {
      flushAll();
      res.push(line);
    }

    if (/<\/div>/.test(line)) inFn = false;
  }
  flushAll();
  if (carryQuote !== null) { res.push(carryQuote); carryQuote = null; } // 文件尾未闭合引用兜底输出

  // 清理连续 3+ 空行
  let out = res.join('\n');
  out = out.replace(/\n{3,}/g, '\n\n');
  // 行内英文断词兜底（merge 拼接出的 fundamen-tal 等；跳过含 http 的 URL 行、含 class 的 HTML 行、frontmatter 字段行）
  out = out.split('\n').map((l) => (l.includes('http') || l.includes('class="') || /^[a-z_]+:\s*["\[]/.test(l) ? l : l.replace(/([a-z])-([a-z])/g, '$1$2'))).join('\n');
  if (out !== s) fs.writeFileSync(p, out, 'utf8');
  return out !== s;
}

let n = 0;
for (const p of listMd()) {
  const r = path.relative(ROOT, p);
  if (TARGET !== 'all' && !r.includes(TARGET)) continue;
  if (processFile(p)) { console.log('merged:', r); n++; }
}
console.log('done, changed:', n);
