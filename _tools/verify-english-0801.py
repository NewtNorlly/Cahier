# -*- coding: utf-8 -*-
"""守恒与标点核查：8月1日讲稿 md vs docx 原文。"""
import zipfile, re
from xml.etree import ElementTree as ET

DOCX = r"C:\Users\NewtN\Desktop\英语课程8月1日讲稿.docx"
MD = r"C:\Users\NewtN\下载\Cahier-main\英语\8月1日讲稿.md"
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
z = zipfile.ZipFile(DOCX)
root = ET.fromstring(z.read("word/document.xml").decode("utf-8"))
src = [ "".join(t.text or "" for t in p.iter(f"{W}t")).strip()
        for p in root.iter(f"{W}p") ]
src = [t for t in src if t]

raw = open(MD, encoding="utf-8").read()
body = raw.split("---", 2)[2]
body = re.sub(r"<!--.*?-->", "", body, flags=re.S)
md_lines = []
for ln in body.splitlines():
    s = ln.strip()
    if not s: continue
    s = re.sub(r"^#{2,4}\s*", "", s)
    s = re.sub(r"^-\s*", "", s)
    md_lines.append(s)

print("docx 段落:", len(src), " md 行:", len(md_lines))
# 顺序比对
mi = 0
missing = []
for t in src:
    if mi < len(md_lines) and md_lines[mi] == t:
        mi += 1; continue
    if t in md_lines[mi:mi+5]:
        for _ in range(md_lines.index(t, mi, mi+5)-mi): missing.append(("extra?", md_lines[mi])); mi += 1
        mi += 1; continue
    missing.append(("MISSING", t))
print("顺序匹配到:", mi, "/", len(src))
for k, v in missing[:20]: print(k, repr(v[:80]))

# 标点扫描
issues = []
for n, ln in enumerate(md_lines, 1):
    if '"' in ln: issues.append((n, "直双引号", ln[:60]))
    # 中文紧跟半角括号
    if re.search(r"[一-鿿][()]", ln) or re.search(r"[()][一-鿿]", ln): issues.append((n, "半角括号夹中文", ln[:60]))
    # 中文句中半角逗号（英文行文除外：含较多 ASCII 字母的行不报）
    cjk = len(re.findall(r"[一-鿿]", ln)); lat = len(re.findall(r"[A-Za-z]", ln))
    if cjk > 10 and cjk > lat and re.search(r"[一-鿿],", ln): issues.append((n, "中文行半角逗号", ln[:60]))
print("标点疑点:", len(issues))
for it in issues[:20]: print(it)
