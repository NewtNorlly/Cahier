# -*- coding: utf-8 -*-
"""Paragraph-level state machine: pair straight double quotes in CJK
paragraphs as Chinese curly quotes “”. Skips frontmatter, fenced code
blocks, inline code and non-CJK paragraphs."""
import os, re, sys

ROOT = r"C:\Users\NewtN\下载\Cahier-main"
CJK = re.compile(r"[一-鿿]")

FILES = [
    r"Python\10月5日讲稿.md",
    r"公共经济学\10月16日讲稿.md",
    r"决策理论与方法\10月13日讲稿.md",
    r"土地资源管理\10月9日讲稿.md",
    r"土地资源管理\10月16日讲稿.md",
    r"知识产权法基础理论\10月16日讲稿.md",
    r"近现代中日关系史\10月13日讲稿.md",
    r"英语\10月15日讲稿.md",
    r"英语\10月1日影音跟读.md",
    r"英语\10月9日影音跟读.md",
]


def convert_paragraph(text):
    """Alternate straight double quotes within a CJK paragraph."""
    if not CJK.search(text):
        return text, 0
    out = []
    state = 0  # 0 = open, 1 = close
    n = 0
    i = 0
    while i < len(text):
        ch = text[i]
        if ch == "`":
            # protect inline code span
            m = re.match(r"`[^`\n]*`", text[i:])
            if m:
                out.append(m.group(0))
                i += m.end()
                continue
        if ch == '"':
            out.append("“" if state == 0 else "”")
            state ^= 1
            n += 1
        else:
            out.append(ch)
        i += 1
    return "".join(out), n


def process(path):
    with open(path, "rb") as f:
        b = f.read()
    if b.startswith(b"\xef\xbb\xbf"):
        b = b[3:]
    text = b.decode("utf-8")
    lines = text.split("\n")
    # split frontmatter
    fm_end = None
    if lines and lines[0].strip() == "---":
        for k in range(1, len(lines)):
            if lines[k].strip() == "---":
                fm_end = k
                break
    out_lines = []
    in_fence = False
    converted = 0
    unbalanced = []
    if fm_end is not None:
        out_lines.extend(lines[:fm_end + 1])
        start = fm_end + 1
    else:
        start = 0
    # group body into paragraphs (blank-line separated)
    body = "\n".join(lines[start:])
    paras = re.split(r"(\n\s*\n)", body)
    new_paras = []
    fence_open = 0
    for para in paras:
        if re.fullmatch(r"\n\s*\n", para):
            new_paras.append(para)
            continue
        # if paragraph contains a fence line, pass through untouched
        if "```" in para:
            new_paras.append(para)
            continue
        if not para.strip():
            new_paras.append(para)
            continue
        converted_para, n = convert_paragraph(para)
        if n % 2 == 1:
            unbalanced.append(para[:50])
        converted += n
        new_paras.append(converted_para)
    new_body = "".join(new_paras)
    new_text = "\n".join(out_lines) + new_body if out_lines else new_body
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(new_text)
    print(f"{os.path.relpath(path, ROOT)}: converted {converted} quotes"
          + (f"  UNBALANCED: {unbalanced}" if unbalanced else ""))


for rel in FILES:
    process(os.path.join(ROOT, rel))
