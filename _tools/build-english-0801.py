# -*- coding: utf-8 -*-
"""把桌面《英语课程8月1日讲稿.docx》转成站点讲稿 md（英语/8月1日讲稿.md）。
规则（贴合近期英语讲稿的笔记本流水风格 + 保留原课程结构）：
- 第X部分/附录 → ##；原则X讲座标题 → ###；线索/笔记/小结 → ####
- 线索清单、小结问题 → 紧凑无序列表；其余正文逐段保留（文字守恒）
- 不生成图片（docx 无内嵌图）；统一包一个 folio，交插件流动分页。
"""
import zipfile, re, os
from xml.etree import ElementTree as ET

DOCX = r"C:\Users\NewtN\Desktop\英语课程8月1日讲稿.docx"
OUT = r"C:\Users\NewtN\下载\Cahier-main\英语\8月1日讲稿.md"
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

z = zipfile.ZipFile(DOCX)
root = ET.fromstring(z.read("word/document.xml").decode("utf-8"))
paras = []
for p in root.iter(f"{W}p"):
    txt = "".join(t.text or "" for t in p.iter(f"{W}t"))
    if txt.strip():
        paras.append(txt.strip())

print("非空段落数：", len(paras))

PART_RE = re.compile(r"^(第[一二三四五六七八九十]+部分|附录)(?:　|\s)")
LECTURE_RE = re.compile(r"^原则[一二三四五六](?:　|\s)")
MARKERS = {"线索", "笔记", "小结"}

blocks = []
i = 0
while i < len(paras):
    t = paras[i]
    if i == 0 and t.endswith("课程笔记"):
        blocks.append(("p", t)); i += 1; continue
    if PART_RE.match(t):
        blocks.append(("h2", t)); i += 1; continue
    if LECTURE_RE.match(t):
        blocks.append(("h3", t)); i += 1; continue
    if t in MARKERS:
        blocks.append(("h4", t)); i += 1
        # 收集该小节正文：线索/小结的短行转列表，笔记转普通段，遇到下一个标记/标题停
        items = []
        while i < len(paras):
            nxt = paras[i]
            if nxt in MARKERS or PART_RE.match(nxt) or LECTURE_RE.match(nxt):
                break
            items.append(nxt); i += 1
        kind = "ul" if t in ("线索", "小结") else "p"
        blocks.append((kind, items))
        continue
    blocks.append(("p", [t])); i += 1

# 渲染 markdown
def esc(s):
    # 英文撇号、斜杠等原样保留；只转义可能误伤的星号（本文基本没有）
    return s

lines = []
for kind, payload in blocks:
    if kind == "p":
        for t in (payload if isinstance(payload, list) else [payload]):
            lines.append(esc(t)); lines.append("")
    elif kind in ("h2", "h3"):
        lines.append(("## " if kind == "h2" else "### ") + payload); lines.append("")
    elif kind == "h4":
        lines.append("#### " + payload); lines.append("")
    elif kind == "ul":
        for t in payload:
            lines.append("- " + t)
        lines.append("")

body = "\n".join(lines).rstrip() + "\n"

# 2026-11-11 起：课程讲稿不再写 description；5 个记忆点关键词由人工补 keywords（手册 §三十八）
fm = """---
doc_type: "lecture"
title: "8月1日讲稿"
course: "英语"
date: "2025-08-01"
cover: "./covers/english-960.webp"
---

<!--folio:第1页-->

<!--col:L-->

<!--col:M-->

"""

md = fm + body + "\n<!--col:R-->\n\n<!--/folio-->\n"
with open(OUT, "w", encoding="utf-8", newline="\n") as f:
    f.write(md)
print("已写出", OUT, len(md), "字符")
# 结构统计
import collections
print(collections.Counter(k for k, _ in blocks))
