# -*- coding: utf-8 -*-
"""
Convert the 10 new lecture PDFs (2026-10-17 batch) into three-column note markdown.

Rules:
- 中栏 = PDF 原文全量转写，逐字守恒；左/右栏留空（用户自填）。
- 单 folio 输出，分页由插件自动处理。
- 代码块、标题、列表按 PDF 字号/坐标/编号识别。
"""
import os, re, sys, io
import fitz

if not isinstance(sys.stdout, io.TextIOWrapper) or sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE = r"C:\Users\NewtN\Desktop\课程讲稿"
ROOT = r"C:\Users\NewtN\下载\Cahier-main"

# ---------- low-level line extraction ----------

def get_lines(path):
    doc = fitz.open(path)
    out = []
    for pno, page in enumerate(doc):
        d = page.get_text("dict")
        for b in d["blocks"]:
            if b.get("type") != 0:
                continue
            for line in b["lines"]:
                spans = line["spans"]
                text = "".join(s["text"] for s in spans)
                if not text.strip():
                    continue
                size = max(s["size"] for s in spans)
                font = "|".join(sorted(set(s["font"] for s in spans)))
                x = round(line["bbox"][0])
                y = round(line["bbox"][1])
                out.append(dict(page=pno, y=y, x=x, size=round(size, 1),
                                font=font, text=text))
    doc.close()
    return out


def join_text(a, b):
    """Join two visual lines with smart spacing."""
    a = a.rstrip()
    b = b.lstrip()
    if not a:
        return b
    if not b:
        return a
    la, fb = a[-1], b[0]
    if re.match(r'[A-Za-z0-9)\]\}.,;:!?"\'’”]', la) and re.match(r'[A-Za-z0-9(\[\\]', fb):
        return a + " " + b
    return a + b


def is_pagenum(ln):
    return bool(re.fullmatch(r"\d{1,3}", ln["text"].strip())) and "TimesNewRoman" in ln["font"]


def gap_before(lines, i):
    """Vertical gap (points) between line i and previous; 999 across pages."""
    if i == 0:
        return 999
    ln, prev = lines[i], lines[i - 1]
    if ln["page"] != prev["page"]:
        return 999
    return ln["y"] - prev["y"]


def heading_text_ok(t, max_len=26):
    """Heading text filter: short, no sentence-ending punctuation."""
    t = t.strip()
    if not t or len(t) > max_len:
        return False
    if re.search(r"[。！？!?；]", t):
        return False
    return True


def ends_sentence(t):
    """Whether a paragraph line ends with sentence punctuation."""
    return bool(re.search(r"[。！？…」』”’)]\s*$", t.strip()))


# ---------- generic Chinese body assembler ----------

def assemble_body(lines, body_x, indent_x, heading_test,
                  gap_h2=None, h2_test=None, x_tol=3):
    """
    lines: body lines only (title lines already removed).
    Heading detection:
      - heading_test(line) => heading tuple (level, text)
      - otherwise paragraph first-line indent x>=indent_x; continuation x<=body_x.
    Returns list of (kind, text, level).
    """
    out = []
    para = []
    prev = None

    def flush():
        nonlocal para
        if para:
            out.append(("p", "".join(para), None))
            para = []

    for i, ln in enumerate(lines):
        txt = ln["text"]
        h = heading_test(ln, lines, i)
        if h:
            flush()
            level, htext = h
            out.append(("h", htext, level))
            prev = ln
            continue
        if ln["x"] >= indent_x - x_tol:
            # new paragraph first line
            if para:
                flush()
            para = [txt]
        else:
            # continuation
            if para:
                para[-1] = join_text(para[-1], txt)
            else:
                # continuation at page top (paragraph carried over page)
                para = [txt]
        prev = ln
    flush()
    return out


def items_to_md(items):
    md = []
    for kind, text, level in items:
        text = text.strip()
        if not text:
            continue
        if kind == "h":
            md.append("\n" + "#" * level + " " + text + "\n")
        else:
            md.append("\n" + text + "\n")
    return "\n".join(md)


# ---------- folio wrapping ----------

def wrap_note(title, course, date, cover, description, body_md, extra_fm=None):
    fm = ["---",
          'doc_type: "lecture"',
          f'title: "{title}"',
          f'course: "{course}"',
          f'date: "{date}"',
          f'description: "{description}"',
          f'cover: "{cover}"',
          ]
    if extra_fm:
        fm.extend(extra_fm)
    fm.append("---")
    fm.append("<!--folio:第1页-->")
    fm.append("")
    fm.append("<!--col:L-->")
    fm.append("")
    fm.append("<!--col:M-->")
    fm.append("")
    head = "\n".join(fm)
    body = body_md.strip("\n")
    return head + "\n\n" + body + "\n\n<!--col:R-->\n\n<!--/folio-->\n"
