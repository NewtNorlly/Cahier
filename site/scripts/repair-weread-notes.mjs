// 以 weread-export-tool/.cache/<bookId>.json（微信读书原始 API 缓存）为权威源，重建「微信读书」书摘：
//  1. 章节顺序 = chapterResp 章节 chapterIdx 升序；章内划线 = range 起点升序（即书中位置顺序）
//  2. 每条划线都带创建时间 ⏱（highlight.createTime，Asia/Shanghai）
//  3. 想法（review）按 range 模糊挂到同章节对应划线（精确>同终点>最大重叠），带 🕰；挂不上的收进「章节点评与书评」
//  4. 保留站点 frontmatter / 元数据 callout 的其余字段，仅同步数量、进度、时长、日期
//  5. 特殊：同一本书的多个导入副本合并为一本（按章节名并章、原文去重、合并想法）。
//     合并组在 MERGE_GROUPS 配置：order=模型合并顺序(首个为进度/时长元数据基准)，
//     shellId=提供 frontmatter/元数据壳的书，outFile=输出文件名(缺省=shellId 现有文件)，
//     removeIds=合并后要删除的副本 bookId。
// 用法：node scripts/repair-weread-notes.mjs --dry-run [--only=关键词] [--dump]
//      node scripts/repair-weread-notes.mjs --write
import { readdir, readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteDirectory = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const repositoryRoot = path.resolve(siteDirectory, '..');
const libraryDirectory = path.join(repositoryRoot, '微信读书');
const toolRoot = path.resolve(repositoryRoot, '..', 'obsidian-weread-plugin-main', 'weread-export-tool');
const cacheDirectory = path.join(toolRoot, '.cache');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const DUMP = args.includes('--dump');
const ONLY = (args.find((a) => a.startsWith('--only=')) ?? '').slice(7);

/* ------------------------------- 基础工具 ------------------------------- */

const norm = (s) => String(s ?? '').normalize('NFKC').replace(/\s+/g, '');
const clean = (s) => String(s ?? '').replace(/\r\n/g, '\n').trim();

const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai', hour12: false,
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
});
function formatDateTime(unixSeconds) {
  if (!unixSeconds) return undefined;
  const parts = Object.fromEntries(dateTimeFormatter.formatToParts(new Date(unixSeconds * 1000)).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}
const formatDate = (unixSeconds) => formatDateTime(unixSeconds)?.slice(0, 10);
function formatDuration(totalSeconds) {
  const sec = Number(totalSeconds) || 0;
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h > 0 && m > 0) return `${h}小时${m}分钟`;
  if (h > 0) return `${h}小时`;
  return `${m}分钟`;
}
const rangeOf = (r) => String(r ?? '').split('-').map((n) => Number(n) || 0);
// 公众号（MP_WXS）等无章节结构的书，划线没有 chapterUid，统一归入「正文」单章
const chapterUidOf = (v) => (Number.isFinite(Number(v)) ? Number(v) : -1);

function splitFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { fmText: '', body: text };
  return { fmText: m[1], body: m[2] };
}

/* --------------------------- 解析站点旧文件（保留壳） --------------------------- */

function parseSiteFile(text) {
  const { fmText, body } = splitFrontmatter(text.replace(/\r\n/g, '\n'));
  const lines = body.split('\n');
  const metaStart = lines.findIndex((l) => l.trim() === '# 元数据');
  const hlStart = lines.findIndex((l) => l.trim() === '# 高亮划线');
  const metaLines = metaStart >= 0 ? lines.slice(metaStart, hlStart >= 0 ? hlStart : lines.length) : [];
  return { fmText, metaLines };
}

/* --------------------------- 从缓存 JSON 构建模型 --------------------------- */

function buildModel(cache) {
  const chapterRaw = cache.chapterResp?.data;
  const chapterList = Array.isArray(chapterRaw) ? chapterRaw[0]?.updated ?? [] : chapterRaw?.updated ?? [];
  const chapterMap = new Map();
  for (const ch of chapterList) chapterMap.set(Number(ch.chapterUid), { title: ch.title, idx: ch.chapterIdx });

  const highlights = (cache.highlightResp?.updated ?? []).map((h) => ({
    chapterUid: chapterUidOf(h.chapterUid),
    rangeStart: rangeOf(h.range)[0],
    rangeEnd: rangeOf(h.range)[1],
    text: clean(h.markText),
    time: formatDateTime(h.createTime),
    reviews: [],
  }));

  const standalone = [];
  for (const item of cache.reviewResp?.reviews ?? []) {
    const r = item.review ?? item;
    const review = {
      chapterUid: chapterUidOf(r.chapterUid),
      rangeStart: rangeOf(r.range)[0],
      rangeEnd: rangeOf(r.range)[1],
      content: clean(r.content || r.abstract || ''),
      time: formatDateTime(r.createTime),
      type: r.type,
      chapterName: r.chapterName,
    };
    if (!review.content) continue;
    if (!r.range) { standalone.push(review); continue; }
    // 模糊挂到同章节最匹配的划线
    const candidates = highlights.filter((h) => h.chapterUid === review.chapterUid);
    let best; let bestScore = 0;
    for (const h of candidates) {
      let score = 0;
      if (h.rangeStart === review.rangeStart && h.rangeEnd === review.rangeEnd) score = 100;
      else if (h.rangeEnd === review.rangeEnd) score = 80;
      else {
        const overlap = Math.min(h.rangeEnd, review.rangeEnd) - Math.max(h.rangeStart, review.rangeStart);
        if (overlap > 0) score = overlap;
      }
      if (score > bestScore) { bestScore = score; best = h; }
    }
    if (best && bestScore > 0) best.reviews.push(review);
    else standalone.push(review);
  }

  // 按章节聚合
  const chapterOrder = [];
  const byUid = new Map();
  for (const h of highlights) {
    if (!byUid.has(h.chapterUid)) {
      const meta = chapterMap.get(h.chapterUid);
      const chapter = {
        uid: h.chapterUid,
        name: meta?.title || (h.chapterUid === -1 ? '正文' : `章节 ${h.chapterUid}`),
        idx: meta?.idx ?? Number.MAX_SAFE_INTEGER,
        entries: [],
      };
      byUid.set(h.chapterUid, chapter);
      chapterOrder.push(chapter);
    }
    byUid.get(h.chapterUid).entries.push(h);
  }
  // 只含想法、没有划线的章节也补出来
  chapterOrder.sort((a, b) => a.idx - b.idx);
  for (const chapter of chapterOrder) {
    chapter.entries.sort((a, b) => a.rangeStart - b.rangeStart);
    for (const h of chapter.entries) h.reviews.sort((a, b) => String(a.time).localeCompare(String(b.time)));
  }
  standalone.sort((a, b) => String(a.time).localeCompare(String(b.time)));

  const book = cache.progress?.book ?? {};
  const meta = {
    lastReadDate: formatDate(book.updateTime),
    readingDate: formatDate(book.startReadingTime),
    finishedDate: formatDate(book.finishTime),
    progress: book.progress != null ? `${book.progress}%` : undefined,
    readingTime: book.readingTime != null ? formatDuration(book.readingTime) : undefined,
  };
  return { chapters: chapterOrder, standalone, meta };
}

/* ------------------------------- 渲染 ------------------------------- */

function quoteBlock(marker, content) {
  const lines = clean(content).split('\n');
  return lines.map((line, idx) => (idx === 0 ? `> ${marker} ${line}` : `>    ${line}`)).join('\n');
}

function updateFrontmatter(fmText, patch) {
  return fmText.split('\n').map((raw) => {
    const m = raw.match(/^([A-Za-z_][\w]*):(.*)$/);
    if (!m || !(m[1] in patch)) return raw;
    const value = patch[m[1]];
    if (value === undefined || value === null || value === '') return raw;
    if (typeof value === 'number') return `${m[1]}: ${value}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${m[1]}: ${value}`;
    return `${m[1]}: ${JSON.stringify(value)}`;
  }).join('\n');
}

function updateMetaRows(metaLines, patch) {
  const rows = [
    ['阅读进度', patch.progress],
    ['阅读时长', patch.readingTime],
    ['最后阅读', patch.lastReadDate],
    ['开始阅读', patch.readingDate],
  ];
  return metaLines.map((line) => {
    for (const [label, value] of rows) {
      if (value && line.startsWith(`> - ${label}：`)) return `> - ${label}：${value}`;
    }
    return line;
  });
}

function renderSiteMarkdown(site, model) {
  const highlightCount = model.chapters.reduce((n, c) => n + c.entries.length, 0);
  const attachedReviews = model.chapters.reduce(
    (n, c) => n + c.entries.reduce((m, e) => m + e.reviews.length, 0), 0,
  );
  const reviewCount = attachedReviews + model.standalone.length;

  const patch = {
    noteCount: highlightCount,
    reviewCount,
    lastReadDate: model.meta.lastReadDate,
    readingDate: model.meta.readingDate,
    finishedDate: model.meta.finishedDate,
    progress: model.meta.progress,
    readingTime: model.meta.readingTime,
  };
  const fmText = updateFrontmatter(site.fmText, patch);
  const metaLines = updateMetaRows(site.metaLines, patch);

  let withTime = 0;
  const out = ['---', fmText.replace(/^---\r?\n/, '').replace(/\r?\n---$/, ''), '---', ''];
  out.push(...metaLines);
  if (metaLines.length && metaLines[metaLines.length - 1].trim() !== '') out.push('');

  out.push('# 高亮划线', '');
  if (highlightCount === 0) out.push('> 这本书目前没有个人划线。', '');
  for (const chapter of model.chapters) {
    out.push(`## ${chapter.name}`, '');
    for (const entry of chapter.entries) {
      out.push(quoteBlock('📌', entry.text));
      if (entry.time) { out.push(`> ⏱ ${entry.time}`); withTime += 1; }
      for (const review of entry.reviews) {
        out.push(quoteBlock('💭', review.content));
        if (review.time) out.push(`> 🕰 ${review.time}`);
      }
      out.push('');
    }
  }

  if (model.standalone.length) {
    out.push('# 章节点评与书评', '');
    for (const review of model.standalone) {
      const heading = review.type === 6 ? '本书评论' : '读书笔记';
      out.push(`## ${heading}`, '', clean(review.content), '');
      if (review.time) out.push(`> 记录于 ${review.time}`, '');
    }
  }

  const markdown = out.join('\n').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  return { markdown, highlightCount, reviewCount, withTime };
}

/* ----------------------------- 白鹿原三合一 ----------------------------- */

const CN_DIGIT = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
function chineseChapterNumber(name) {
  const m = name.match(/第([一二三四五六七八九十百千零两\d]+)[章节回卷]/);
  if (!m) return Number.POSITIVE_INFINITY;
  const s = m[1];
  if (/^\d+$/.test(s)) return Number(s);
  let n = 0;
  if (s.includes('百')) {
    const [a, b] = s.split('百');
    n += (CN_DIGIT[a] ?? 1) * 100;
    const rest = b ?? '';
    if (rest.includes('十')) {
      const [c, d] = rest.split('十');
      n += (c ? CN_DIGIT[c] : 1) * 10 + (CN_DIGIT[d] ?? 0);
    } else n += CN_DIGIT[rest] ?? 0;
  } else if (s.includes('十')) {
    const [a, b] = s.split('十');
    n += (a ? CN_DIGIT[a] : 1) * 10 + (CN_DIGIT[b] ?? 0);
  } else {
    n = [...s].reduce((acc, ch) => acc * 10 + (CN_DIGIT[ch] ?? 0), 0);
  }
  return n;
}
function chapterOrderKey(name) {
  return /第[一二三四五六七八九十百千零两\d]+[章节回卷]/.test(name) ? chineseChapterNumber(name) : -1;
}

function mergeModels(models, metas) {
  const order = [];
  const byName = new Map();
  models.forEach((model) => {
    for (const chapter of model.chapters) {
      if (!byName.has(chapter.name)) {
        const merged = { name: chapter.name, entries: [] };
        byName.set(chapter.name, merged);
        order.push(merged);
      }
      byName.get(chapter.name).entries.push(...chapter.entries.map((e) => ({ ...e, reviews: [...e.reviews] })));
    }
  });
  order.sort((a, b) => chapterOrderKey(a.name) - chapterOrderKey(b.name));

  let removed = 0;
  for (const chapter of order) {
    const kept = [];
    for (const entry of chapter.entries) {
      const key = norm(entry.text);
      const dup = kept.find((k) => {
        const kk = norm(k.text);
        if (kk === key) return true;
        return Math.min(kk.length, key.length) >= 10 && (kk.includes(key) || key.includes(kk));
      });
      if (!dup) { kept.push(entry); continue; }
      removed += 1;
      if (entry.text.length > dup.text.length) dup.text = entry.text;
      const have = new Set(dup.reviews.map((r) => norm(r.content)));
      for (const r of entry.reviews) if (!have.has(norm(r.content))) dup.reviews.push(r);
      // 保留更早的创建时间
      if (entry.time && (!dup.time || entry.time < dup.time)) dup.time = entry.time;
    }
    kept.sort((a, b) => String(a.time ?? '').localeCompare(String(b.time ?? '')));
    for (const h of kept) h.reviews.sort((a, b) => String(a.time).localeCompare(String(b.time)));
    chapter.entries = kept;
  }

  const standalone = [];
  const seenReview = new Set();
  for (const model of models) for (const r of model.standalone) {
    const k = norm(r.content);
    if (!seenReview.has(k)) { seenReview.add(k); standalone.push(r); }
  }
  standalone.sort((a, b) => String(a.time).localeCompare(String(b.time)));

  const lastReadDate = metas.map((m) => m.lastReadDate).filter(Boolean).sort().at(-1);
  const readingDate = metas.map((m) => m.readingDate).filter(Boolean).sort()[0];
  const meta = { ...metas[0], lastReadDate, readingDate };
  return { chapters: order, standalone, meta, removed };
}

/* -------------------------------- 主流程 -------------------------------- */

const bookIdOf = (text) => text.match(/^bookId:\s*['"]?([^'"\r\n]+)['"]?\s*$/m)?.[1]?.trim();

async function main() {
  const cacheById = new Map();
  for (const name of await readdir(cacheDirectory)) {
    if (!name.endsWith('.json')) continue;
    const id = name.replace(/\.json$/, '');
    cacheById.set(id, JSON.parse(await readFile(path.join(cacheDirectory, name), 'utf8')));
  }

  const libraryFiles = (await readdir(libraryDirectory)).filter((n) => n.endsWith('.md'));
  const siteByBookId = new Map();
  for (const name of libraryFiles) {
    const file = path.join(libraryDirectory, name);
    const text = await readFile(file, 'utf8');
    const id = bookIdOf(text);
    if (id) siteByBookId.set(id, { file, text });
  }

  const report = { rebuilt: 0, skippedEmpty: 0, noCache: 0, totalHighlights: 0, totalWithTime: 0, totalReviews: 0, samples: [], merges: [] };

  // 合并组：同一本书的多个副本（官方本 / 个人导入 CB_ 本）合并为一本
  const MERGE_GROUPS = [
    {
      label: '白鹿原',
      order: ['34631906', 'CB_EML06j060GAO6ya6wwFVNA5U', 'CB_6fC4CQ4DK4tT75j75AGX15Uq'],
      shellId: '34631906',
      removeIds: ['CB_EML06j060GAO6ya6wwFVNA5U', 'CB_6fC4CQ4DK4tT75j75AGX15Uq'],
    },
    {
      label: '巨婴国',
      order: ['CB_CJ462w60NAIe6yC6wwGxj1Pw', 'CB_ABS3OI3Lb9dG6y66ww2Jq8Lk', 'CB_BAv5Rp5P29dG6y66wwCjB036'],
      shellId: 'CB_CJ462w60NAIe6yC6wwGxj1Pw',
      outFile: '巨婴国 (武志红) (Z-Library).md',
      removeIds: ['CB_CJ462w60NAIe6yC6wwGxj1Pw', 'CB_ABS3OI3Lb9dG6y66ww2Jq8Lk', 'CB_BAv5Rp5P29dG6y66wwCjB036'],
    },
    {
      label: '研究生论文写作与时间管理',
      order: ['CB_3TmBTGBVhB5k76075A7Gi2mb', '3004247422'],
      shellId: '3004247422',
      removeIds: ['CB_3TmBTGBVhB5k76075A7Gi2mb'],
    },
    {
      label: '社会学与生活',
      order: ['CB_9eI8qk8qv9N46yQ6wwEHX8WT', 'CB_0tf9kp9mZ9N46yQ6ww2SA2kb'],
      shellId: 'CB_9eI8qk8qv9N46yQ6wwEHX8WT',
      removeIds: ['CB_0tf9kp9mZ9N46yQ6ww2SA2kb'],
    },
  ];
  const mergeIdSet = new Set(MERGE_GROUPS.flatMap((g) => g.order));

  for (const [id, siteEntry] of siteByBookId) {
    if (mergeIdSet.has(id)) continue; // 合并组最后统一处理
    const cache = cacheById.get(id);
    if (!cache) { report.noCache += 1; continue; }
    if (ONLY && !siteEntry.file.includes(ONLY) && !id.includes(ONLY)) continue;

    const model = buildModel(cache);
    const hl = model.chapters.reduce((n, c) => n + c.entries.length, 0);
    if (hl === 0 && model.standalone.length === 0) { report.skippedEmpty += 1; continue; }

    const site = parseSiteFile(siteEntry.text);
    const rendered = renderSiteMarkdown(site, model);
    report.totalHighlights += rendered.highlightCount;
    report.totalWithTime += rendered.withTime;
    report.totalReviews += rendered.reviewCount;
    report.rebuilt += 1;
    if (report.samples.length < 3 || ONLY) {
      report.samples.push({ name: path.basename(siteEntry.file), highlights: rendered.highlightCount, withTime: rendered.withTime, reviews: rendered.reviewCount });
    }
    if (DUMP && (!ONLY || siteEntry.file.includes(ONLY) || id.includes(ONLY))) {
      process.stdout.write(`\n===== DUMP ${path.basename(siteEntry.file)} =====\n${rendered.markdown}\n`);
    }
    if (!DRY_RUN) await writeFile(siteEntry.file, rendered.markdown, 'utf8');
  }

  // ---- 重名书多副本合并 ----
  for (const group of MERGE_GROUPS) {
    if (ONLY && !group.label.includes(ONLY) && !group.order.some((id) => id.includes(ONLY))) continue;
    const missing = group.order.filter((id) => !cacheById.has(id));
    if (missing.length) throw new Error(`合并组「${group.label}」缺少缓存: ${missing.join(', ')}`);
    const shellEntry = siteByBookId.get(group.shellId);
    if (!shellEntry) throw new Error(`合并组「${group.label}」找不到壳文件 bookId=${group.shellId}`);

    const models = group.order.map((id) => buildModel(cacheById.get(id)));
    const merged = mergeModels(models, models.map((m) => m.meta));
    const rendered = renderSiteMarkdown(parseSiteFile(shellEntry.text), merged);
    if (DUMP) process.stdout.write(`\n===== DUMP ${group.label}(合并) =====\n${rendered.markdown}\n`);
    report.merges.push({
      label: group.label,
      chapters: merged.chapters.map((c) => `${c.name}(${c.entries.length})`),
      highlights: rendered.highlightCount,
      withTime: rendered.withTime,
      removedDuplicates: merged.removed,
      reviews: rendered.reviewCount,
      lastReadDate: merged.meta.lastReadDate,
      readingDate: merged.meta.readingDate,
      finishedDate: merged.meta.finishedDate,
      progress: merged.meta.progress,
      readingTime: merged.meta.readingTime,
      outFile: group.outFile ?? path.basename(shellEntry.file),
    });
    if (!DRY_RUN) {
      const outPath = group.outFile ? path.join(libraryDirectory, group.outFile) : shellEntry.file;
      await writeFile(outPath, rendered.markdown, 'utf8');
      for (const id of group.removeIds) {
        const victim = siteByBookId.get(id)?.file;
        // 若待删文件正好等于输出路径（如巨婴国把干净名让给合并结果），跳过删除
        if (victim && path.resolve(victim) !== path.resolve(outPath)) await unlink(victim);
      }
    }
  }

  console.log(JSON.stringify(report, null, 2));
  if (DRY_RUN) console.log('（dry-run，未写盘）');
}

main().catch((err) => { console.error(err); process.exit(1); });
