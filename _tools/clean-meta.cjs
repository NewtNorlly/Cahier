/**
 * clean-meta.cjs — 全局机械清理 v2（安全规则，逐项可 diff 审查）
 * 处理对象：全部 16 篇 notes md
 * 规则：
 *  1. 删除「> [!abstract] 文献导读」块
 *  2. 修复 markdown 表格被 "##### |" 前缀破坏
 *  3. 清理 ```brain 代码块标记（保留列表内容），删除其后的孤立 "---" 行
 *  4. 全角拉丁字母/数字 → 半角（Ｒ→R、－→-、＆→&）
 *  5. URL 占位保护后：英文断词合并（仅正文文本行，跳过 frontmatter/HTML 标签行）、全角标点→半角（仅英文/数字语境）
 *  6. 修复 <u>/<mark> 跨界脚注号（<u>〔</u>2 〕 → 〔2〕）
 *  7. 正文脚注号 〔n〕/〔n 〕 → <sup class="fn-ref">〔n〕</sup>（脚注 div 内不处理）
 *  8. 删除 PDF 页脚残渣行（·361·〔90〕〔91〕〔92〕、〔81〕〔82〕〔83〕〔84〕）
 *  9. 中文-数字间空格、破折号规范化、中文语境半角冒号→全角
 * 10. 脚注块内 " ---" 残渣清理
 */
const fs = require('fs');
const path = require('path');

const ROOTS = ['中国法制史','决策理论与方法','土地资源管理','宪法','德语','文献笔记','民事诉讼法','知识产权法基础理论','社会保障学','脑图集'];
const ROOT = process.cwd();

function listMd() {
  const out = [];
  for (const r of ROOTS) {
    const dir = path.join(ROOT, r);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) if (f.endsWith('.md')) out.push(path.join(dir, f));
  }
  return out;
}

// 全角 → 半角 拉丁字母/数字/符号
const FULL2HALF = (() => {
  const m = {};
  for (let c = 0xff21; c <= 0xff3a; c++) m[String.fromCharCode(c)] = String.fromCharCode(c - 0xfee0);
  for (let c = 0xff41; c <= 0xff5a; c++) m[String.fromCharCode(c)] = String.fromCharCode(c - 0xfee0);
  for (let c = 0xff10; c <= 0xff19; c++) m[String.fromCharCode(c)] = String.fromCharCode(c - 0xfee0);
  m['　'] = ' ';
  m['－'] = '-';
  m['＆'] = '&';
  return m;
})();

function fixFullwidthLatin(s) {
  return s.replace(/[Ａ-Ｚａ-ｚ０-９　－＆]/g, (ch) => FULL2HALF[ch] ?? ch);
}

// 步骤 6：u/mark 跨界脚注号（注意捕获组顺序！闭合标签挪到注号前后，保持配对）
function fixCrossBoundaryFn(s) {
  return s
    .replace(/<(u|mark)>〔[^\S\r\n]*<\/\1>/g, '〔')                          // <u>〔</u> → 〔（开闭一起删）
    .replace(/〔([^\S\r\n]*\d+)[^\S\r\n]*<\/?(u|mark)>〕/g, '〔$1〕</$2>')  // 〔2</u>〕 → 〔2〕</u>
    .replace(/〔<\/?(u|mark)>([^\S\r\n]*\d+)[^\S\r\n]*〕/g, '</$1>〔$2〕')  // 〔</u>2 〕 → </u>〔2〕
    .replace(/<(u|mark)>([^\S\r\n]*〔\d+[^\S\r\n]*〕[^\S\r\n]*)<\/\1>/g, '$2'); // <u>〔2〕</u> 整包 → 〔2〕
}

// 步骤 7：正文脚注号 → sup（状态机：跳过 footnotes div；div 内仅去括号空格）
function toSupFnRef(s) {
  const lines = s.split('\n');
  let inFn = false;
  const out = [];
  for (const line of lines) {
    if (/<div class="folio-footnotes">/.test(line)) inFn = true;
    if (!inFn) {
      out.push(line.replace(/〔\s*(\d{1,3})\s*〕/g, '<sup class="fn-ref">〔$1〕</sup>'));
    } else {
      out.push(line.replace(/〔\s*(\d{1,3})\s*〕/g, '〔$1〕'));
    }
    if (/<\/div>/.test(line)) inFn = false;
  }
  return out.join('\n');
}

// 步骤 8：PDF 页脚残渣行
const PAGE_FOOT_NOISE = [
  /^·\d+·〔\d+〕(〔\d+〕)*\s*$/,
  /^〔\d+〕(〔\d+〕){1,}\s*$/,
  /^·\d+·\s*$/,
];

function cleanNoiseLines(s) {
  // 行级：删 PDF 页码残渣（·361·）、控制字符、三连破折号、行尾连续脚注号串
  const lines = s.split('\n').map((l) =>
    l
      .replace(/·(\d+)·/g, '')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .replace(/———/g, '——')
      .replace(/(?:<sup class="fn-ref">〔\d+〕<\/sup>){2,}\s*$/, '')
  );
  return lines.filter((l) => !PAGE_FOOT_NOISE.some((re) => re.test(l.trim()))).join('\n');
}

// 步骤 5：英文断词合并 + 全角标点（仅正文文本行）
function fixLatinPunct(s) {
  // 1) 先修 URL 内部残渣（在占位保护前）：https: / / 、www．、．、 / 空格
  s = s.replace(/https?:\s*\/\s*\/\s*/g, (m) => m.replace(/\s+/g, ''));
  s = s.replace(/https?:\/\/[^\u4e00-\u9fff“”（）)\u3001，。；;\r\n]+/g, (m) =>
    m.replace(/www．/g, 'www.').replace(/\s*\/\s*/g, '/').replace(/．/g, '.'));
  // 2) 提取 URL 占位保护
  const urls = [];
  s = s.replace(/https?:\/\/[^\s）)\u3001，。；;]+/g, (m) => {
    urls.push(m);
    return `\u0001URL${urls.length - 1}\u0002`;
  });
  // 3) 英文语境全角标点 → 半角（字母/数字后）
  s = s
    .replace(/([A-Za-z0-9\?\)\]])，/g, '$1,')
    .replace(/([A-Za-z0-9\?\)\]])。/g, '$1.')
    .replace(/([A-Za-z0-9\?\)\]])：/g, '$1:')
    .replace(/([A-Za-z0-9\?\)\]])；/g, '$1;')
    .replace(/\)\s+，/g, '),')
    .replace(/(\d)．(\d)/g, '$1.$2')
    .replace(/([A-Za-z])．([A-Za-z])/g, '$1.$2')
    .replace(/([A-Za-z])．(\d)/g, '$1.$2')
    .replace(/(\d)．([A-Za-z])/g, '$1.$2')
    .replace(/([A-Za-z])．(?=[^A-Za-z\u4e00-\u9fff])/g, '$1.')
    .replace(/([A-Za-z])，(?![\u4e00-\u9fff])/g, '$1,')
    .replace(/([A-Za-z])。(?![\u4e00-\u9fff])/g, '$1.')
    // 英文逗号后补空格（Law,Vol → Law, Vol；IFAC-3,Advisory → IFAC-3, Advisory）
    .replace(/([A-Za-z]),([A-Z])/g, '$1, $2')
    .replace(/(\d),([A-Z])/g, '$1, $2')
    // 数字句点后接大写 → 句点后空格（p.21.WIPO → p.21. WIPO）
    .replace(/(\d)\.([A-Z])/g, '$1. $2')
    // 全角引号周边空格清理（中文语境）
    .replace(/([“”‘’])[^\S\r\n]+(?=[^“”‘’]|$)/g, '$1')
    // 并列引用（。” “）→ 拆成独立引用块
    .replace(/([。”！？…])[^\S\r\n]*([“‘“])/g, '$1\n\n$2')
    .replace(/(?<![-\s])[^\S\r\n]+([“”‘’])/g, '$1')
    // 恢复列表项/引用块引号前空格（-“ → - “、> “ → > “）
    .replace(/([-*>])([“”‘’])/g, '$1 $2')
    // 空格+斜杠 → 斜杠（E /CN.4 → E/CN.4）
    .replace(/(\S)\s+\//g, '$1/')
    // 数字句点后接 4 位年份 → 补空格（10.2001年 → 10. 2001年）
    .replace(/(\d)\.(\d{4}[\u4e00-\u9fff年])/g, '$1. $2');
  // 括号内空格（仅同行水平空白，防跨行拼接）
  s = s.replace(/\([^\S\r\n]+(\d)/g, '($1').replace(/(\d)[^\S\r\n]+\)/g, '$1)');
  s = s.replace(/\([^\S\r\n]+([A-Za-z])/g, '($1').replace(/([A-Za-z])[^\S\r\n]+\)/g, '$1)');
  // 4) 英文断词合并（按行，跳过 frontmatter 与 HTML 标签行）
  const lines = s.split('\n');
  let inFm = false;
  let fmCount = 0;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i];
    if (t.trim() === '---') { fmCount++; inFm = fmCount < 2; continue; }
    if (inFm) continue;
    if (/class="/.test(t)) continue;                 // HTML 属性行：class 名/文件名不能动
    if (/^\s*<\/?[a-zA-Z][^>]*>\s*$/.test(t)) continue; // 纯 HTML 标签行
    // 行内含 URL 占位符的也可安全合并（URL 已被保护）
    lines[i] = t
      .replace(/([a-z])-([a-z])/g, '$1$2')
      .replace(/([A-Z][a-z]+)-([a-z]+)/g, '$1$2')
      .replace(/([A-Z])-([a-z]+)/g, '$1$2')
      .replace(/([a-z])-([a-z]+)/g, '$1$2')
      // 英文连字符前空格（TRIPS -Natural → TRIPS-Natural；不动 " - "）
      .replace(/([A-Za-z]) -([A-Za-z])/g, '$1-$2')
      // 驼峰拆分（andContemporary → and Contemporary；保护 U.S. 等缩写与专名）
      .replace(/U\.S\./g, '\u0001US\u0002')
      .replace(/PhRMA/g, '\u0001PHRMA\u0002')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\u0001PHRMA\u0002/g, 'PhRMA')
      .replace(/\u0001US\u0002/g, 'U.S.')
      // 小写字母后接数字 → 补空格（Journal804 → Journal 804）
      .replace(/([a-z])(\d)/g, '$1 $2')
      // 撇号后大写 → 补空格（Users'Rights → Users' Rights）
      .replace(/'([A-Z])/g, "' $1")
      // 全角逗号/问号/右括号后的英文大写 → 补空格
      .replace(/\.，/g, '.,')
      .replace(/(\?)\s*，/g, '$1,')
      .replace(/\)([A-Z])/g, ') $1');
  }
  s = lines.join('\n');
  // 4b) 断词后再修一轮 URL 残渣（ht-tps: / / 等未进占位的 URL）
  s = s.replace(/https?:\s*\/\s*\/\s*/g, (m) => m.replace(/\s+/g, ''));
  s = s.replace(/(https?:\/\/[^\s，。；;）)】]+)/g, (m) => m.replace(/ /g, ''));
  // 5) 还原 URL
  s = s.replace(/\u0001URL(\d+)\u0002/g, (_, i) => urls[Number(i)]);
  return s;
}

// 步骤 9：中文-数字空格、破折号、中文冒号（全部仅同行水平空白，防跨行拼接）
const HB = '[^\\S\\r\\n]+';  // 水平空白（空格/制表，不含换行）
const HB0 = '[^\\S\\r\\n]*';
function fixCnDigitSpacing(s) {
  return s
    .replace(new RegExp('([\\u4e00-\\u9fff])' + HB + '(\\d)(?!\\s*[.、)])', 'g'), '$1$2')
    .replace(new RegExp('(\\d)' + HB + '([\\u4e00-\\u9fff])', 'g'), '$1$2')
    // 其他数字范围 → 一字线（先跑，日期规则随后兜底复原）
    .replace(new RegExp('(\\d)' + HB0 + '[-—–]' + HB0 + '(\\d)', 'g'), '$1—$2')
    // 日期（YYYY-MM-DD 或 YYYY-M-D）→ 半角连字符（含一字线/短横线变体）
    .replace(new RegExp('(\\d{4})' + HB0 + '[-—–]' + HB0 + '(\\d{1,2})' + HB0 + '[-—–]' + HB0 + '(\\d{1,2})', 'g'), '$1-$2-$3')
    .replace(new RegExp('([\\u4e00-\\u9fff])' + HB0 + '-' + HB0 + '([\\u4e00-\\u9fff])', 'g'), '$1—$2')
    // 中文语境半角冒号 → 全角（后非 / 或数字）
    .replace(/([\u4e00-\u9fff]):(?!\/\/)/g, '$1：')
    // 全角冒号后空格（中文语境；不跨行）
    .replace(/(：(?!\r?\n))[^\S\r\n]+/g, '$1')
    // 中文语境半角分号 → 全角
    .replace(/([\u4e00-\u9fff])\s*;/g, '$1；');
}

// 步骤 10：脚注块内 " ---" 残渣
function fixFnTail(s) {
  return s.replace(/ ---\s*$/gm, '');
}

function cleanFile(p) {
  let s = fs.readFileSync(p, 'utf8');
  // 1) 文献导读 abstract 块（多行 > 引用块，含 [!abstract] 文献导读）
  s = s.replace(/>\s*\[!abstract\]\s*文献导读\s*\n(?:>\s*.*\n?)+/, '');
  // 2) 表格 ##### | 前缀
  s = s.replace(/^#{1,6}\s*\|/gm, '|');
  // 3) ```brain 代码块：删除标记行；删除闭合行；删除紧跟的独立 --- 行
  s = s.replace(/^#{1,6}\s*`{3}brain\s*$/gm, '');
  s = s.replace(/`{3}\s*$/gm, '');
  s = s.replace(/\n---\s*\n(?=## )/g, '\n');
  // 4) 全角拉丁
  s = fixFullwidthLatin(s);
  // 6) 跨界脚注号
  s = fixCrossBoundaryFn(s);
  // 5) 英文标点/断词
  s = fixLatinPunct(s);
  // 7) 脚注号上标（正文）
  s = toSupFnRef(s);
  // 8) 页脚残渣
  s = cleanNoiseLines(s);
  // 9) 中文数字空格
  s = fixCnDigitSpacing(s);
  // 10) 脚注块尾 ---
  s = fixFnTail(s);
  // 清除连续 3+ 空行
  s = s.replace(/\n{4,}/g, '\n\n\n');
  fs.writeFileSync(p, s, 'utf8');
}

for (const p of listMd()) {
  cleanFile(p);
  console.log('cleaned:', path.relative(ROOT, p));
}
console.log('done');

