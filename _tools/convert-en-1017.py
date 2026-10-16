# -*- coding: utf-8 -*-
"""Convert the three English PDFs (2026-10-15 big compilation,
2026-10-01 and 2026-10-09 bilingual Pollykann scripts)."""
import os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_notes_1017 import get_lines, join_text, wrap_note

BASE = r"C:\Users\NewtN\Desktop\课程讲稿"
ROOT = r"C:\Users\NewtN\下载\Cahier-main"
COVER = "./covers/english-960.webp"

CJK_RE = re.compile(r"[一-鿿]")
RE_NUM = re.compile(r"^(\d+)\s+(.*)$")


def is_cjk(s):
    return bool(CJK_RE.search(s))


def emit(out_rel, title, date, desc, body_md):
    md = wrap_note(title, "英语", date, COVER, desc, body_md)
    path = os.path.join(ROOT, out_rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(md)
    print("written:", out_rel, len(md), "chars")


# ================= 10月15日 大汇编 =================

def convert_en1015():
    lines = get_lines(os.path.join(BASE, r"英语\10月15日讲稿.pdf"))
    body = []
    para = []

    def flush():
        if para:
            body.append("\n" + "".join(para).strip() + "\n")
            para.clear()

    def add_heading(level, text):
        flush()
        body.append("\n" + "#" * level + " " + text.strip() + "\n")

    for i, ln in enumerate(lines):
        pno, size, x, font = ln["page"], ln["size"], ln["x"], ln["font"]
        t = ln["text"].strip()

        # page 2 = TOC, skip entirely
        if pno == 1:
            continue
        # page numbers (10.7 TNR pure digits)
        if size <= 10.7 and re.fullmatch(r"\d{1,3}", t):
            continue

        # main title / subtitle (page 1)
        if size == 18.5:
            flush()
            body.append("\n**" + t + "**\n")
            continue
        if pno == 0 and size in (12.3, 10.7) and font.startswith("KaiTi"):
            flush()
            body.append("\n" + t + "\n")
            continue

        # headings
        if size == 16.4 and font.startswith("SimHei"):
            add_heading(2, t)
            continue
        if size == 13.8 and font.startswith("SimHei"):
            add_heading(3, t)
            continue
        if size == 12.3 and font.startswith("SimHei"):
            add_heading(4, t)
            continue

        # body / example lines: 12.3 non-SimHei or 11.4
        if size in (12.3, 11.4) or (size < 11.4 and size >= 10.7):
            if not para:
                para.append(ln["text"])
            elif x >= 90:
                # first-line indent: new paragraph unless cross-page continuation
                if pno != lines[i - 1]["page"] and not re.search(r"[。！？….”’\.!?]\s*$", "".join(para).strip()):
                    para[-1] = join_text(para[-1], ln["text"])
                else:
                    flush()
                    para.append(ln["text"])
            else:
                # x73: continuation unless the previous line ended a sentence
                cur = "".join(para).strip()
                if re.search(r"[。！？….”’\.!?]\s*$", cur):
                    flush()
                    para.append(ln["text"])
                else:
                    para[-1] = join_text(para[-1], ln["text"])
    flush()
    body_md = "\n".join(body)
    desc = ("英语课堂笔记整合讲义，由27份课堂笔记按主题汇编，共六篇27节。"
            "第一篇六级口语备考：考试机制、等级划分、三部分流程、自我介绍与问答、"
            "卡片陈述与小组讨论模板、万能句型、发音技巧（连读、失去爆破、词重音、"
            "句子重音）与优秀考生经验。第二篇听力跟读与发音规则：懂你英语学习方法、"
            "词汇记忆、听力口语突破营、长难句与发音规则。第三篇词汇记忆法：核心逻辑、"
            "词根词缀、谐音与形象联想分组词表、社会秩序文本精读。第四篇语法基础与复合句："
            "并列句、主语从句、同位语、定语、状语、从句翻译与简单句。第五篇写作满分句型："
            "评分原则、句子扩写改写、强调句、虚拟语气、倒装与长难句分析。第六篇外刊精读："
            "美国公交低使用率、上海地方美食、英国王室报道与中国白酒出海等四篇文章的逐句讲解。")
    emit(r"英语\10月15日讲稿.md", "10月15日讲稿", "2026-10-15", desc, body_md)


# ================= 10月1日 双语句库 =================

def convert_en1001():
    lines = get_lines(os.path.join(BASE, r"英语\10月1日影音跟读.pdf"))
    en = {}        # number -> English text
    zh = {}        # ordinal -> Chinese text
    cur_en = None
    zh_ord = 0
    for ln in lines:
        size, t = ln["size"], ln["text"].strip()
        if "Pollykann" in t or size >= 19.0:
            continue
        m = RE_NUM.match(t)
        if m and not is_cjk(t):
            cur_en = int(m.group(1))
            en[cur_en] = m.group(2).strip()
        elif size >= 10.0 and size <= 10.9:
            # Chinese line, in visual order
            zh_ord += 1
            zh[zh_ord] = t
        elif size >= 11.0 and cur_en is not None:
            # wrapped English line
            en[cur_en] = join_text(en[cur_en], t).strip()
    body = ["\n**17岁高中生关于英语的一些分享.mp4**\n"]
    for n in range(1, 81):
        e = en.get(n, "").strip()
        z = zh.get(n, "").strip()
        body.append("\n**" + str(n) + ". " + e + "**\n")
        body.append("\n" + z + "\n")
    desc = ("17岁高中生分享英语学习经验的视频双语句库（小鹦看看 Pollykann 台词本），"
            "共80条，英文原文配中文译文。内容包括：口音靠模仿、用配音练口语、"
            "五年没怎么学英语却保持英语能力的经历（德语是第一外语）、"
            "影子跟读与朗读练习、发音与口语表达建议，以及给英语学习者的鼓励和互动请求。")
    emit(r"英语\10月1日影音跟读.md", "10月1日影音跟读", "2026-10-01", desc, "\n".join(body))


# ================= 10月9日 SRT 双语 =================

def convert_en1009():
    lines = get_lines(os.path.join(BASE, r"英语\10月9日影音跟读.pdf"))
    items = {}
    cur = None
    for ln in lines:
        size, t = ln["size"], ln["text"].strip()
        if "Pollykann" in t or size >= 19.0:
            continue
        # numbered item line: starts with number + space (line contains CJK)
        m = re.match(r"^(\d+)\s+(.*)$", t)
        if m and size >= 11.5:
            rest = m.group(2)
            mm = CJK_RE.search(rest)
            cur = int(m.group(1))
            if mm:
                items[cur] = [rest[:mm.start()].strip(), rest[mm.start():].strip()]
            else:
                items[cur] = [rest.strip(), ""]
        elif size <= 11.0 and cur is not None:
            # Chinese-only wrapped line (10.6)
            items[cur][1] = (items[cur][1] + t).strip()
    body = ["\n**DH第1集第1部分.mp4_2026-10-04_141404_en_zh.srt**\n"]
    for n in sorted(items):
        e, z = items[n]
        body.append("\n**" + str(n) + ". " + e + "**\n")
        if z:
            body.append("\n" + z + "\n")
    desc = ("美剧《绝望主妇》（Desperate Housewives）第一集第一部分开场独白的双语字幕"
            "（小鹦看看 Pollykann 台词本），共25条，英文原文配中文译文。"
            "由玛丽·爱丽丝·杨以逝者视角讲述自己离世当天平静如常的早晨、"
            "取出左轮手枪、尸体被邻居胡佛太太发现的经过，以及胡佛太太借归还搅拌机上门的情节。")
    emit(r"英语\10月9日影音跟读.md", "10月9日影音跟读", "2026-10-09", desc, "\n".join(body))


if __name__ == "__main__":
    convert_en1015()
    convert_en1001()
    convert_en1009()
