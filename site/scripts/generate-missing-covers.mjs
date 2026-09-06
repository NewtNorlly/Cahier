import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const siteDirectory = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const repositoryRoot = path.resolve(siteDirectory, "..");
const sourceArtwork = path.join(siteDirectory, "assets", "cover-system", "editorial-collage.webp");
const manifestPath = path.join(siteDirectory, "assets", "cover-system", "generated-cover-manifest.json");

const width = 960;
const height = 640;
const smallWidth = 480;
const smallHeight = 320;
const concurrency = 4;
const previewMode = process.argv.includes("--preview");
const previewDirectory = path.join(siteDirectory, "assets", "cover-system", "previews");

const skippedDirectories = new Set([
  ".git",
  ".github",
  ".makemd",
  ".obsidian",
  ".space",
  ".trash",
  "AI 指令",
  "node_modules",
  "site",
  "文本附件",
]);

const palettes = {
  technology: {
    label: "科技 · 未来",
    paper: "#e9efe9",
    ink: "#17282c",
    soft: "#547072",
    accent: "#c64b2f",
    second: "#247c82",
  },
  language: {
    label: "语言 · 教育",
    paper: "#f0ead8",
    ink: "#2c2921",
    soft: "#6f6756",
    accent: "#a43b28",
    second: "#487b68",
  },
  mind: {
    label: "心理 · 生活",
    paper: "#f2e5dc",
    ink: "#30242a",
    soft: "#765d68",
    accent: "#b44f3d",
    second: "#79668c",
  },
  culture: {
    label: "文学 · 影像",
    paper: "#eee8d9",
    ink: "#282622",
    soft: "#706754",
    accent: "#a23b29",
    second: "#3e6170",
  },
  nature: {
    label: "自然 · 行旅",
    paper: "#e9e9d8",
    ink: "#26312b",
    soft: "#627064",
    accent: "#bd5b32",
    second: "#47736d",
  },
  history: {
    label: "历史 · 地缘",
    paper: "#efe3ca",
    ink: "#2b241b",
    soft: "#756650",
    accent: "#a63d29",
    second: "#385a6a",
  },
  society: {
    label: "社会 · 观察",
    paper: "#eee5d6",
    ink: "#29241f",
    soft: "#6f6257",
    accent: "#aa402d",
    second: "#5c6b57",
  },
  general: {
    label: "公共文本档案",
    paper: "#f1e8d7",
    ink: "#29251f",
    soft: "#756c5d",
    accent: "#a43b28",
    second: "#465f69",
  },
};

const categoryRules = [
  ["technology", /\b(?:AI|Agent|API|Claude|Code|DeepSeek|MiniMax|OpenClaw|OpenHanako|Python|Skill|LV6)\b|人工智能|算法|芯片|代码|编程|计算机|互联网|科技|硬盘|储存/i],
  ["language", /语言|汉字|汉语|口音|英语|法语|外语|词汇|阅读速度|演讲|发言|千字文|教育|考试|题库/],
  ["mind", /心理|焦虑|迷茫|睡眠|熬夜|疲劳|爱情|真爱|共情|性压抑|性幻想|成长|人生|生活|幸福|友谊|认知|意识|努力|记性|脑科学|主角/],
  ["culture", /电影|影后|奥斯卡|宫崎骏|动漫|文学|小说|名著|诗|词|鲁迅|哈利|赫敏|罗恩|川端|伊豆|雪国|红与黑|孩子王|审美|摇滚|电音|流行乐|文艺|艺术|作品|追星/],
  ["nature", /雪山|湖|秦岭|地理|行旅|旅行|沙漠|海鲜|太空|宇宙|鱼进化|近视|草原|悬崖|自然|核禁区/],
  ["history", /历史|王朝|商周|春秋|战国|东汉|秦国|魏国|五代十国|清朝|元清|罗马|日本|伊朗|俄罗斯|非洲|欧洲|大洋洲|琉球|尼泊尔|斯拉夫|王室|女王|首相|政变|战争|国军|共产党|毛泽东|井冈山|蒙古|犹太|塔利班|波斯|光绪|维新|将军|官僚|民族|帝国|王洪文|扬州十日|加里波第|撒切尔/],
  ["society", /社会|中国|美国|中美|韩国|台湾|年轻人|女性|男性|华人|留学生|媒体|价值观|贫困|生育|剥削|国家|政治|文化|知识分子|城市|教育|家庭|父亲|女儿|大学生|网红/],
];

function toPosix(value) {
  return value.replace(/\\/g, "/").normalize("NFC");
}

function hashHex(value) {
  return createHash("sha256").update(value.normalize("NFC")).digest("hex");
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function yamlString(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

function parseFrontmatter(raw) {
  const bom = raw.startsWith("\uFEFF") ? "\uFEFF" : "";
  const text = bom ? raw.slice(1) : raw;
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?=\r?\n|$)/);

  return {
    bom,
    text,
    newline,
    match,
    frontmatter: match?.[1] ?? "",
  };
}

function isDraft(frontmatter) {
  return /^draft:[ \t]*(?:true|'true'|"true")[ \t]*$/im.test(frontmatter);
}

function getYamlScalar(frontmatter, key) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = frontmatter.match(new RegExp(`^${escapedKey}:[ \\t]*(.+?)[ \\t]*$`, "im"));
  if (!match) return undefined;
  return match[1].trim().replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, (_, double, single) => double ?? single);
}

function hasCover(frontmatter) {
  const lines = frontmatter.split(/\r?\n/);
  const coverIndex = lines.findIndex((line) => /^cover:[ \t]*/i.test(line));
  if (coverIndex < 0) return false;

  const inlineValue = lines[coverIndex].replace(/^cover:[ \t]*/i, "").trim();
  if (inlineValue && inlineValue !== "null" && inlineValue !== "~") return true;

  for (let index = coverIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() && !/^[ \t]/.test(line)) break;
    if (/^[ \t]+image:[ \t]*\S+/i.test(line)) return true;
  }

  return false;
}

function replaceOrInsertCover(raw, coverBlock) {
  const parsed = parseFrontmatter(raw);
  const { bom, text, newline, match } = parsed;

  if (!match) {
    return `${bom}---${newline}${coverBlock.join(newline)}${newline}---${newline}${newline}${text}`;
  }

  const lines = parsed.frontmatter.split(/\r?\n/);
  const coverIndex = lines.findIndex((line) => /^cover:[ \t]*/i.test(line));

  if (coverIndex >= 0) {
    let endIndex = coverIndex + 1;
    while (endIndex < lines.length && (!lines[endIndex].trim() || /^[ \t]/.test(lines[endIndex]))) {
      endIndex += 1;
    }
    lines.splice(coverIndex, endIndex - coverIndex, ...coverBlock);
  } else {
    lines.unshift(...coverBlock);
  }

  const rebuiltFrontmatter = lines.join(newline);
  const rebuiltText = `${text.slice(0, match.index)}---${newline}${rebuiltFrontmatter}${newline}---${text.slice(match.index + match[0].length)}`;
  return `${bom}${rebuiltText}`;
}

function classify(title, collection) {
  const searchable = `${title} ${collection}`;
  return categoryRules.find(([, expression]) => expression.test(searchable))?.[0] ?? "general";
}

function cleanTitle(title, collection) {
  let result = title
    .replace(/^\s*[【\[].*?[】\]]\s*/, "")
    .replace(/\s*[【\[].*?[】\]]\s*$/, "")
    .replace(/[（(]\s*附(?:录)?[\s\S]*?[）)]\s*$/, "")
    .replace(/[＿_]{2,}/g, "：")
    .replace(/\s+/g, " ")
    .trim();

  const collectionPrefix = `${collection}：`;
  if (result.startsWith(collectionPrefix)) result = result.slice(collectionPrefix.length).trim();
  return result || title;
}

function characterWidth(character) {
  if (/\s/.test(character)) return 0.35;
  if (/^[\u0000-\u00ff]$/.test(character)) return 0.56;
  return 1;
}

function wrapTitle(title, maxUnits = 13.5, maxLines = 3) {
  const originalCharacters = Array.from(title);
  const capacity = maxUnits * maxLines;
  const characters = [];
  let totalUnits = 0;

  for (const character of originalCharacters) {
    const units = characterWidth(character);
    if (totalUnits + units > capacity - 1.1) break;
    characters.push(character);
    totalUnits += units;
  }

  if (characters.length < originalCharacters.length) {
    characters.push("…");
    totalUnits += 1;
  }

  const lineCount = Math.min(maxLines, Math.max(1, Math.ceil(totalUnits / maxUnits)));
  const lines = [];
  let start = 0;
  let remainingUnits = totalUnits;

  for (let lineIndex = 0; lineIndex < lineCount - 1; lineIndex += 1) {
    const remainingLines = lineCount - lineIndex;
    const targetUnits = remainingUnits / remainingLines;
    let end = start;
    let lineUnits = 0;

    while (end < characters.length - (remainingLines - 1)) {
      const nextUnits = characterWidth(characters[end]);
      if (lineUnits > 0 && lineUnits + nextUnits > targetUnits && lineUnits >= targetUnits * 0.88) break;
      lineUnits += nextUnits;
      end += 1;
    }

    while (end < characters.length && /^[，。！？、：；）》】”’…,.!?;:)]$/.test(characters[end])) {
      lineUnits += characterWidth(characters[end]);
      end += 1;
    }
    if (end - start > 1 && /^[（《【“‘([]$/.test(characters[end - 1])) {
      lineUnits -= characterWidth(characters[end - 1]);
      end -= 1;
    }
    lines.push(characters.slice(start, end).join("").trim());
    start = end;
    remainingUnits -= lineUnits;
  }

  lines.push(characters.slice(start).join("").trim());

  return lines.filter(Boolean);
}

function shortLabel(value, limit) {
  const characters = Array.from(value.trim());
  return characters.length > limit ? `${characters.slice(0, limit - 1).join("")}…` : value.trim();
}

function firstGlyph(value) {
  return Array.from(value).find((character) => /[\p{L}\p{N}]/u.test(character)) ?? "文";
}

function motifSvg(category, random, palette) {
  const elements = [];
  const stroke = palette.second;
  const accent = palette.accent;

  if (category === "technology") {
    for (let row = 0; row < 5; row += 1) {
      for (let column = 0; column < 7; column += 1) {
        const x = 610 + column * 42 + Math.round(random() * 8);
        const y = 95 + row * 42 + Math.round(random() * 8);
        elements.push(`<circle cx="${x}" cy="${y}" r="${3 + Math.round(random() * 4)}" fill="${stroke}" opacity=".55"/>`);
        if (column < 6 && random() > 0.32) elements.push(`<path d="M${x + 8} ${y}H${x + 34}" stroke="${stroke}" stroke-width="2" opacity=".35"/>`);
      }
    }
    elements.push(`<path d="M690 90V315H880" fill="none" stroke="${accent}" stroke-width="8" opacity=".62"/>`);
  } else if (category === "history") {
    for (let index = 0; index < 5; index += 1) {
      const radius = 65 + index * 32;
      elements.push(`<circle cx="755" cy="235" r="${radius}" fill="none" stroke="${index % 2 ? stroke : accent}" stroke-width="${index === 0 ? 8 : 2}" stroke-dasharray="${index % 2 ? "10 12" : "none"}" opacity="${0.22 + index * 0.05}"/>`);
    }
    elements.push(`<path d="M590 475C670 385 746 430 900 330" fill="none" stroke="${palette.ink}" stroke-width="3" opacity=".38"/>`);
  } else if (category === "mind") {
    for (let index = 0; index < 8; index += 1) {
      const offset = index * 18;
      elements.push(`<path d="M${630 + offset} ${130 + offset}C${820 - offset} ${70 + offset},${900 - offset} ${310 - offset},${690 + offset} ${390 - offset}" fill="none" stroke="${index % 3 === 0 ? accent : stroke}" stroke-width="${index % 3 === 0 ? 6 : 2}" opacity=".38"/>`);
    }
  } else if (category === "language") {
    for (let index = 0; index < 7; index += 1) {
      const x = 610 + (index % 3) * 95;
      const y = 105 + Math.floor(index / 3) * 105;
      elements.push(`<rect x="${x}" y="${y}" width="${58 + Math.round(random() * 25)}" height="${58 + Math.round(random() * 25)}" fill="none" stroke="${index % 2 ? stroke : accent}" stroke-width="${index % 2 ? 2 : 7}" opacity=".42"/>`);
    }
    elements.push(`<path d="M610 450H910M610 475H830M610 500H875" stroke="${palette.ink}" stroke-width="3" opacity=".32"/>`);
  } else if (category === "culture") {
    elements.push(`<rect x="600" y="90" width="310" height="385" fill="none" stroke="${stroke}" stroke-width="4" opacity=".38"/>`);
    for (let index = 0; index < 6; index += 1) {
      elements.push(`<rect x="615" y="${110 + index * 58}" width="24" height="35" fill="${index % 2 ? accent : stroke}" opacity=".5"/>`);
      elements.push(`<rect x="870" y="${110 + index * 58}" width="24" height="35" fill="${index % 2 ? stroke : accent}" opacity=".5"/>`);
    }
    elements.push(`<circle cx="755" cy="285" r="92" fill="none" stroke="${accent}" stroke-width="12" opacity=".34"/>`);
  } else if (category === "nature") {
    for (let index = 0; index < 7; index += 1) {
      const y = 160 + index * 46;
      const bend = Math.round(random() * 90);
      elements.push(`<path d="M570 ${y}C650 ${y - 70 + bend},735 ${y + 45 - bend},920 ${y - 10}" fill="none" stroke="${index % 3 === 0 ? accent : stroke}" stroke-width="${index % 3 === 0 ? 7 : 2}" opacity=".4"/>`);
    }
    elements.push(`<circle cx="815" cy="140" r="48" fill="${accent}" opacity=".35"/>`);
  } else if (category === "society") {
    const nodes = Array.from({ length: 11 }, () => ({
      x: 590 + Math.round(random() * 310),
      y: 100 + Math.round(random() * 390),
    }));
    nodes.forEach((node, index) => {
      const other = nodes[(index + 3) % nodes.length];
      elements.push(`<path d="M${node.x} ${node.y}L${other.x} ${other.y}" stroke="${stroke}" stroke-width="2" opacity=".22"/>`);
      elements.push(`<circle cx="${node.x}" cy="${node.y}" r="${index % 4 === 0 ? 16 : 7}" fill="${index % 4 === 0 ? accent : stroke}" opacity=".56"/>`);
    });
  } else {
    for (let index = 0; index < 9; index += 1) {
      const x = 585 + Math.round(random() * 290);
      const y = 90 + Math.round(random() * 390);
      const size = 25 + Math.round(random() * 80);
      elements.push(index % 2
        ? `<circle cx="${x}" cy="${y}" r="${Math.round(size / 2)}" fill="none" stroke="${index % 3 ? stroke : accent}" stroke-width="${2 + (index % 3) * 2}" opacity=".4"/>`
        : `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${index % 3 ? stroke : accent}" opacity=".26"/>`);
    }
  }

  return elements.join("");
}

// 封面标题区域：textX = panelX + 46，可用宽度 = panelWidth - 46 - 44 = 544px
// font-size 50px + letter-spacing 1px ≈ 51px/字，故最大单行约 10.67 个 CJK 字宽
// 取 9.6 留出呼吸空间，确保中文标题不溢出
const COVER_TITLE_MAX_UNITS = 9.6;

function coverSvg({ title, collection, category, seed }) {
  const palette = palettes[category];
  const random = seededRandom(seed ^ 0x9e3779b9);
  const displayTitle = cleanTitle(title, collection);
  const titleLines = wrapTitle(displayTitle, COVER_TITLE_MAX_UNITS);
  const titleSize = 50;
  const lineHeight = Math.round(titleSize * 1.34);
  const panelOnLeft = random() > 0.5;
  const panelX = panelOnLeft ? 48 : 278;
  const panelWidth = 634;
  const textX = panelX + 46;
  const titleStartY = 218;
  const archiveNumber = String(seed % 1000).padStart(3, "0");
  const motif = motifSvg(category, random, palette);
  const glyph = escapeXml(firstGlyph(displayTitle));
  const escapedCollection = escapeXml(shortLabel(collection, 18));
  const escapedCategory = escapeXml(palette.label);
  const lineText = titleLines
    .map((line, index) => `<text x="${textX}" y="${titleStartY + index * lineHeight}" class="title">${escapeXml(line)}</text>`)
    .join("");

  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <style>
        .sans { font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif; }
        .serif { font-family: "Noto Serif SC", "Songti SC", "SimSun", serif; }
        .title { font-family: "Noto Serif SC", "Songti SC", "SimSun", serif; font-size: ${titleSize}px; font-weight: 700; fill: ${palette.ink}; letter-spacing: 1px; }
      </style>
      <rect width="960" height="640" fill="${palette.paper}" opacity=".18"/>
      ${motif}
      <text x="${panelOnLeft ? 815 : 48}" y="565" class="serif" font-size="238" font-weight="700" fill="${palette.second}" opacity=".08">${glyph}</text>
      <rect x="${panelX}" y="70" width="${panelWidth}" height="500" rx="4" fill="${palette.paper}" opacity=".9"/>
      <rect x="${panelX}" y="70" width="12" height="500" fill="${palette.accent}"/>
      <path d="M${textX} 153H${panelX + panelWidth - 44}" stroke="${palette.ink}" stroke-width="2" opacity=".7"/>
      <text x="${textX}" y="126" class="sans" font-size="20" font-weight="700" fill="${palette.accent}" letter-spacing="2">${escapedCollection}</text>
      ${lineText}
      <text x="${textX}" y="522" class="sans" font-size="18" font-weight="600" fill="${palette.soft}" letter-spacing="1.5">${escapedCategory}</text>
      <text x="${panelX + panelWidth - 44}" y="522" class="sans" text-anchor="end" font-size="18" fill="${palette.soft}" letter-spacing="2">ARCHIVE ${archiveNumber}</text>
      <circle cx="${panelX + panelWidth - 56}" cy="112" r="18" fill="none" stroke="${palette.accent}" stroke-width="3"/>
      <circle cx="${panelX + panelWidth - 56}" cy="112" r="5" fill="${palette.accent}"/>
    </svg>
  `);
}

async function walkMarkdown(directory) {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (entry.name.startsWith(".") || skippedDirectories.has(entry.name)) continue;
      files.push(...await walkMarkdown(fullPath));
      continue;
    }

    if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".md") files.push(fullPath);
  }

  return files;
}

async function createCover(note) {
  const random = seededRandom(note.seed);
  const sourceMetadata = await sharp(sourceArtwork).metadata();
  const cropWidth = Math.min(sourceMetadata.width ?? 1536, 1248);
  const cropHeight = Math.round(cropWidth * 2 / 3);
  const maxLeft = Math.max(0, (sourceMetadata.width ?? cropWidth) - cropWidth);
  const maxTop = Math.max(0, (sourceMetadata.height ?? cropHeight) - cropHeight);
  const left = Math.round(random() * maxLeft);
  const top = Math.round(random() * maxTop);

  const output960 = previewMode
    ? path.join(previewDirectory, `${note.category}-${note.seedHex.slice(0, 12)}.webp`)
    : note.output960;
  const output480 = note.output480;

  await mkdir(path.dirname(output960), { recursive: true });

  const outputInfo = await sharp(sourceArtwork)
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .flip(random() > 0.76)
    .flop(random() > 0.5)
    .resize(width, height, { fit: "cover" })
    .modulate({ brightness: 0.92 + random() * 0.12, saturation: 0.72 + random() * 0.38 })
    .composite([{ input: coverSvg(note), blend: "over" }])
    .webp({ quality: 72, effort: 6, smartSubsample: true })
    .toFile(output960);

  if (previewMode) {
    return {
      markdown: note.relativePath,
      title: note.title,
      collection: note.collection,
      topic: note.topic || null,
      category: note.category,
      seed: note.seedHex.slice(0, 12),
      cover960: toPosix(path.relative(repositoryRoot, output960)),
      cover480: null,
      bytes960: outputInfo.size,
      bytes480: 0,
    };
  }

  const smallInfo = await sharp(output960)
    .resize(smallWidth, smallHeight, { fit: "cover", withoutEnlargement: true })
    .webp({ quality: 68, effort: 6, smartSubsample: true })
    .toFile(output480);

  const coverBlock = [
    "cover:",
    `  image: ${yamlString(`文本附件/${path.basename(note.output960)}`)}`,
    "  actualRatio: '3:2'",
    `  pixelWidth: ${width}`,
    `  pixelHeight: ${height}`,
    "  displayWidth: 100",
    "  displayHeight: 320",
    "  positionX: 50",
    "  positionY: 50",
  ];
  const updatedMarkdown = replaceOrInsertCover(note.raw, coverBlock);
  await writeFile(note.markdownPath, updatedMarkdown, "utf8");

  return {
    markdown: note.relativePath,
    title: note.title,
    collection: note.collection,
    topic: note.topic || null,
    category: note.category,
    seed: note.seedHex.slice(0, 12),
    cover960: toPosix(path.relative(repositoryRoot, output960)),
    cover480: toPosix(path.relative(repositoryRoot, output480)),
    bytes960: outputInfo.size,
    bytes480: smallInfo.size,
  };
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function run() {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= items.length) return;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

async function main() {
  await stat(sourceArtwork);
  const markdownFiles = await walkMarkdown(repositoryRoot);
  const notes = [];

  for (const markdownPath of markdownFiles) {
    const relativePath = toPosix(path.relative(repositoryRoot, markdownPath));
    if (relativePath === "README.md" || relativePath === "智能体操作手册.md" || relativePath === "微信读书/微信读书Gallery.md") continue;

    const raw = await readFile(markdownPath, "utf8");
    const parsed = parseFrontmatter(raw);
    if (isDraft(parsed.frontmatter) || hasCover(parsed.frontmatter)) continue;

    const pathParts = relativePath.split("/");
    const collection = pathParts[0] || "未分类";
    const topic = pathParts.slice(1, -1).join(" / ");
    const title = getYamlScalar(parsed.frontmatter, "title")
      ?? path.basename(markdownPath, path.extname(markdownPath)).trim();
    const seedHex = hashHex(relativePath);
    const seed = Number.parseInt(seedHex.slice(0, 8), 16) >>> 0;
    const baseName = `generated-cover-${seedHex.slice(0, 12)}`;
    const attachmentDirectory = path.join(path.dirname(markdownPath), "文本附件");

    notes.push({
      markdownPath,
      relativePath,
      raw,
      title,
      collection,
      topic,
      category: classify(title, collection),
      seed,
      seedHex,
      attachmentDirectory,
      output960: path.join(attachmentDirectory, `${baseName}-960.webp`),
      output480: path.join(attachmentDirectory, `${baseName}-480.webp`),
    });
  }

  notes.sort((left, right) => left.relativePath.localeCompare(right.relativePath, "zh-CN"));

  if (!notes.length) {
    console.log("没有发现缺封面的已发布 Markdown。");
    return;
  }

  const previewCategories = ["technology", "history", "mind", "culture", "language", "nature"];
  const workNotes = previewMode
    ? previewCategories.map((category) => notes.find((note) => note.category === category)).filter(Boolean)
    : notes;

  console.log(previewMode
    ? `开始生成 ${workNotes.length} 张风格预览（不会修改 Markdown）……`
    : `开始生成 ${workNotes.length} 篇缺失封面（${width}px + ${smallWidth}px WebP）……`);
  const records = await mapLimit(workNotes, concurrency, async (note, index) => {
    const record = await createCover(note);
    if ((index + 1) % 10 === 0 || index + 1 === workNotes.length) {
      console.log(`已完成 ${index + 1}/${workNotes.length}`);
    }
    return record;
  });

  let previousRecords = [];
  try {
    const previousManifest = JSON.parse(await readFile(manifestPath, "utf8"));
    previousRecords = Array.isArray(previousManifest.records) ? previousManifest.records : [];
  } catch {
    // 首次生成时不存在旧清单。
  }
  const recordMap = new Map(previousRecords.map((record) => [record.markdown, record]));
  for (const record of records) recordMap.set(record.markdown, record);
  const allRecords = Array.from(recordMap.values()).sort((left, right) =>
    left.markdown.localeCompare(right.markdown, "zh-CN"));
  const totalBytes = allRecords.reduce((sum, record) => sum + record.bytes960 + record.bytes480, 0);
  if (previewMode) {
    console.log(`预览完成：${records.length} 张，目录 ${toPosix(path.relative(repositoryRoot, previewDirectory))}。`);
    return;
  }

  await writeFile(
    manifestPath,
    `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      generator: "site/scripts/generate-missing-covers.mjs",
      sourceArtwork: "site/assets/cover-system/editorial-collage.webp",
      sourcePrompt: "Contemporary Chinese editorial collage on warm fibrous paper, with ink, torn paper, printmaking grain, archival marks and restrained vermilion; no text, logos, people or watermark.",
      strategy: "One AI-generated source artwork plus deterministic title-, collection-, topic- and hash-driven local compositions.",
      count: allRecords.length,
      dimensions: {
        full: `${width}x${height}`,
        small: `${smallWidth}x${smallHeight}`,
      },
      totalBytes,
      records: allRecords,
    }, null, 2)}\n`,
    "utf8",
  );

  console.log(`完成：${records.length} 篇，图片合计 ${(totalBytes / 1024 / 1024).toFixed(2)} MiB。`);
  console.log(`清单：${toPosix(path.relative(repositoryRoot, manifestPath))}`);
}

await main();
