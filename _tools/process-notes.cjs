// 处理讲稿文末「## 批注与笔记」块：清洗 OCR 噪声 -> 按 PDF 页码注入同序 folio 左栏；删空壳 folio
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

// 把一整页的原始批注文本拆成一条条
function splitItems(raw) {
  let t = raw;
  // 在每个条目前插入换行（兼容挤行）
  t = t.replace(/-\s*(?:\*\*下划线\*\*|\*\*手写标记\*\*|<u>红色下划线<\/u>|✍️)/g, m => '\n' + m.trim());
  return t.split('\n').map(s => s.trim()).filter(Boolean);
}

// 清洗单条，返回 {kind:'u'|'h', text} 或 null
function cleanItem(line) {
  let kind = /手写/.test(line) ? 'h' : 'u';
  let t = line;
  // 手写坐标噪声整段模式
  t = t.replace(/✍️\s*\[手写批注于第\d+页\]\s*位置约\([^)]*\)(?:-\([^)]*\))?(?:,附近文本：[^\-]*)?/g, '');
  t = t.replace(/\*\*手写标记\*\*：?\s*\[手写标记于\([^)]*\),?附近文本：[^\]]*\]/g, '');
  t = t.replace(/\[手写[^\]]*\]/g, '');
  // 下划线前缀
  t = t.replace(/^-\s*/, '');
  t = t.replace(/^\*\*下划线\*\*：?/, '');
  t = t.replace(/^<u>红色下划线<\/u>：?•?/, '');
  t = t.replace(/<\/?u>/g, '');
  t = t.replace(/^•\s*/, '');
  t = t.replace(/\s+/g, ' ').trim();
  if (!t) return null;
  if (t.length < 9) return null; // 过短碎片
  return { kind, text: t };
}

function process(rel, opts) {
  const fp = path.join(ROOT, rel);
  let lines = fs.readFileSync(fp, 'utf8').split('\n');
  const noteStart = lines.findIndex(l => /^##\s*批注与笔记/.test(l));
  if (noteStart < 0) { console.log('[skip] no block:', rel); return; }

  // 块到 <!--/folio--> 为止
  let blockEnd = lines.findIndex((l, i) => i >= noteStart && /^<!--\/folio-->/.test(l));
  if (blockEnd < 0) blockEnd = lines.length;
  const block = lines.slice(noteStart, blockEnd);

  // 中栏 u 标签数
  const mainU = (lines.slice(0, noteStart).join('\n').match(/<u>/g) || []).length;
  const dropUnderline = mainU >= (opts.mainUThreshold ?? 5);

  // 按 ### 第N页 分组
  const byPage = {};
  let curPage = 1;
  let buf = [];
  const flush = () => {
    if (!buf.length) return;
    const items = splitItems(buf.join('\n')).map(cleanItem).filter(Boolean);
    const seen = new Set();
    byPage[curPage] = items.filter(it => {
      if (dropUnderline && it.kind === 'u') return false; // 中栏已划线，转录冗余
      const key = it.text.slice(0, 24);
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
    buf = [];
  };
  for (const l of block) {
    const pm = l.match(/^###\s*第(\d+)页/);
    if (pm) { flush(); curPage = +pm[1]; continue; }
    if (/^##\s*批注与笔记/.test(l) || /^\*（本文件/.test(l) || /^（无批注）/.test(l)) continue;
    buf.push(l);
  }
  flush();

  // 删除批注块（保留 /folio）
  lines.splice(noteStart, blockEnd - noteStart);

  // 解析 folio 区间
  const folios = [];
  lines.forEach((l, i) => {
    const m = l.match(/^<!--folio:(.*?)-->/); if (m) folios.push({ label: m[1], start: i, end: -1 });
    if (/^<!--\/folio-->/.test(l) && folios.length) folios[folios.length - 1].end = i;
  });

  // 删纯空壳 folio（正文非注释文本 <=3 字 或 仅 待办事项/无待办）
  const removeIdx = [];
  folios.forEach((f, i) => {
    const body = lines.slice(f.start + 1, f.end).filter(l => l.trim() && !/^<!--/.test(l)).join('').replace(/\s/g, '');
    if (body.length <= 4 || /^(待办事项|无待办)+$/.test(body)) removeIdx.push(i);
  });
  // 从后往前删，避免位移
  removeIdx.slice().reverse().forEach(i => {
    const f = folios[i];
    lines.splice(f.start, f.end - f.start + 1 + 1, ); // 含其后空行由后续整理
    // 重新计算（简单起见：直接把该区间清空，最后压缩多余空行）
  });
  // 上面 splice 后 folios 失效，重新解析
  // 重新解析
  const folios2 = [];
  lines.forEach((l, i) => {
    const m = l.match(/^<!--folio:(.*?)-->/); if (m) folios2.push({ label: m[1], start: i, end: -1, colM: -1 });
    if (/^<!--\/folio-->/.test(l) && folios2.length) folios2[folios2.length - 1].end = i;
  });
  folios2.forEach(f => {
    for (let i = f.start; i <= f.end; i++) if (/^<!--col:M-->/.test(lines[i])) { f.colM = i; break; }
  });

  // 注入左栏（从后往前插，避免位移）
  const pageNums = Object.keys(byPage).map(Number).sort((a, b) => a - b);
  const injected = [];
  pageNums.slice().reverse().forEach(p => {
    const items = byPage[p];
    if (!items.length) return;
    const f = folios2[Math.min(p - 1, folios2.length - 1)];
    if (!f || f.colM < 0) return;
    const noteLines = ['<!--col:L-->', ''];
    for (const it of items) noteLines.push('- ' + it.text, '');
    noteLines.push('');
    lines.splice(f.colM, 0, ...noteLines);
    injected.push(`p${p}->folio"${f.label}"(${items.length}条)`);
  });

  // 压缩 3+ 连续空行为 2 空行；去除 folio 标签紧邻的多余空行
  const out = lines.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\n*$/, '\n');
  fs.writeFileSync(fp, out, 'utf8');
  console.log(`[ok] ${rel} | mainU=${mainU} dropU=${dropUnderline} | removed empty folios=${removeIdx.length} | injected: ${injected.reverse().join('; ') || '无（清洗后为空，块已删）'}`);
}

process('决策理论与方法/9月1日讲稿.md', {});
process('决策理论与方法/9月3日讲稿.md', {});
process('土地资源管理/8月31日讲稿.md', {});
process('土地资源管理/课程考核标准与作业一.md', { mainUThreshold: 999 });
process('社会保障学/8月31日讲稿.md', { mainUThreshold: 999 });
process('社会保障学/9月2日讲稿.md', { mainUThreshold: 999 });
process('知识产权法基础理论/9月4日讲稿.md', {});
console.log('done');
