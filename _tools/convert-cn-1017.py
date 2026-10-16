# -*- coding: utf-8 -*-
"""Convert the 7 Chinese-language lecture PDFs (2026-10-17 batch)."""
import os, re, sys, io
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fitz
from build_notes_1017 import (get_lines, join_text, is_pagenum, wrap_note,
                              gap_before, heading_text_ok, ends_sentence)

if not isinstance(sys.stdout, io.TextIOWrapper) or sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE = r"C:\Users\NewtN\Desktop\课程讲稿"
ROOT = r"C:\Users\NewtN\下载\Cahier-main"

CN_NUM = "一二三四五六七八九十"
RE_TOP = re.compile(r"^[" + CN_NUM + r"]+、")
RE_SUB = re.compile(r"^（[" + CN_NUM + r"]+）")
RE_PART = re.compile(r"^第[" + CN_NUM + r"]+部分")


def is_centered(x, page_w=413, tol=35):
    return abs(x - page_w / 2) < tol


def emit(out_rel, title, course, date, cover, desc, body, extra_fm=None):
    md = wrap_note(title, course, date, cover, desc, body, extra_fm)
    out = os.path.join(ROOT, out_rel)
    with io.open(out, "w", encoding="utf-8", newline="\n") as f:
        f.write(md)
    print("written:", out_rel, len(body), "chars")


# ================= Python =================

def convert_python():
    lines = get_lines(os.path.join(BASE, r"Python\10月5日讲稿.pdf"))
    body = []
    i = 0
    cur_code = []

    def flush_code():
        if cur_code:
            body.append("\n```\n" + "\n".join(cur_code) + "\n```\n")
            cur_code.clear()

    def add_para(t):
        body.append("\n" + t.strip() + "\n")

    while i < len(lines):
        ln = lines[i]
        t = ln["text"]
        size = ln["size"]
        # 18.5 doc title
        if size == 18.5:
            add_para("**" + t.strip() + "**")
            i += 1
            continue
        # 15.4 lecture title: two lines on same y
        if size == 15.4:
            same = [ln]
            while i + 1 < len(lines) and lines[i+1]["size"] == 15.4 and lines[i+1]["page"] == ln["page"] and abs(lines[i+1]["y"] - ln["y"]) <= 2:
                i += 1
                same.append(lines[i])
            text = "".join(x["text"] for x in same)
            body.append("\n## " + text.strip() + "\n")
            i += 1
            continue
        # 11.4 code lines (group consecutive; restore indent from x)
        if size == 11.4 and "TimesNewRoman" in ln["font"]:
            level = round((ln["x"] - 92) / 11.4)
            level = max(0, min(level, 6))
            cur_code.append("    " * level + t.rstrip())
            i += 1
            continue
        flush_code()
        # 13.3 section heading
        if size == 13.3:
            body.append("\n### " + t.strip() + "\n")
            i += 1
            continue
        # 12.3 body; subtitle 12.3 right after title is plain
        # paragraph: first line x>=92, continuation x<=72
        para = [t]
        i += 1
        while i < len(lines):
            nxt = lines[i]
            if nxt["size"] == 12.3 and nxt["x"] <= 74:
                para[-1] = join_text(para[-1], nxt["text"])
                i += 1
            else:
                break
        add_para("".join(para))
    flush_code()
    body_md = "\n".join(body)
    desc = ("Python 基础语法课堂笔记，一次课连讲七讲中的条件判断与运算，并穿插六节复习。"
            "复习转义字符（\\n、\\t、\\r、原始字符串 r）、布尔类型与为假的值、None 占位、"
            "ASCII/Unicode/UTF-8 编码与 encode/decode、比较运算符与身份运算符；"
            "正课讲条件判断三种结构（if、if-else、if-elif-else）与缩进语法，"
            "赋值、比较、算术、逻辑运算符，运算优先级（取反、算术、比较、not、and、or），"
            "and 与 or 的短路求值及数据类型兼容，配大量课堂代码与作业题示例。")
    emit(r"Python\10月5日讲稿.pdf".replace(".pdf", ".md"),
         "10月5日讲稿", "Python", "2026-10-05",
         "./covers/python-960.webp", desc, body_md)


# ================= 公共经济学 =================

def convert_pubeco():
    lines = get_lines(os.path.join(BASE, r"公共经济学\10月16日讲稿.pdf"))
    body = []
    i = 0
    while i < len(lines):
        ln = lines[i]
        t = ln["text"]
        size = ln["size"]
        # page numbers
        if is_pagenum(ln):
            i += 1
            continue
        # 14.4 lecture title: two lines same y
        if size == 14.4:
            same = [ln]
            while i + 1 < len(lines) and lines[i+1]["size"] == 14.4 and lines[i+1]["page"] == ln["page"] and abs(lines[i+1]["y"] - ln["y"]) <= 2:
                i += 1
                same.append(lines[i])
            text = "".join(x["text"] for x in same)
            body.append("\n## " + text.strip() + "\n")
            i += 1
            continue
        # body 12.3
        stripped = t.strip()
        # heading: one-line, pattern, next line starts new paragraph at x>=95
        if re.match(RE_TOP, stripped) or re.match(RE_SUB, stripped):
            # check next line for continuation
            is_heading = True
            if i + 1 < len(lines):
                nxt = lines[i+1]
                if nxt["x"] <= 76:  # continuation => it's a paragraph
                    is_heading = False
            if is_heading:
                lvl = 3 if re.match(RE_TOP, stripped) else 4
                body.append("\n" + "#" * lvl + " " + stripped + "\n")
                i += 1
                continue
        # paragraph: first line x>=95, continuation x<=76
        para = [t]
        i += 1
        while i < len(lines):
            nxt = lines[i]
            if is_pagenum(nxt):
                i += 1
                continue
            if nxt["size"] != 12.3 or nxt["x"] > 76:
                break
            para[-1] = join_text(para[-1], nxt["text"])
            i += 1
        body.append("\n" + "".join(para).strip() + "\n")
    body_md = "\n".join(body)
    desc = ("公共经济学两讲三部分课堂笔记。第一讲复习企业是一组契约与现代企业制度权责利配置，"
            "讲国企老板缺位、信息不对称与监督困境、老板对员工的八种激励办法和牛肉面馆案例；"
            "补讲科斯、杨小凯企业理论；再讲为什么需要政府（界定产权、囚徒困境）、"
            "市场失灵（垄断、信息不对称、马太效应与三次分配、外部性）、政府失灵；"
            "第二章引入稀缺、价格、成本概念与价格管制。第二讲完整记录女生赴港追星、"
            "全家低保该不该取消的课堂辩论：正反立论、攻辩、自由辩论、总结陈词与老师点评，"
            "并延伸比例原则、渐退与取消、现实案例。第三讲价格、激励与公共经济学同政治学、"
            "伦理学的关系，含茅于轼廉租房建议、纽约房租管制、免费医疗需要与需求等案例。")
    emit(r"公共经济学\10月16日讲稿.md",
         "10月16日讲稿", "公共经济学", "2026-10-16",
         "./covers/public-economics-960.webp", desc, body_md)


# ================= 决策理论 =================

def decision_heading(lines, i):
    """### heading: continuation-x line (x<=89) followed by indented body,
    with large pre-gap (>=45) and heading-like text. Returns text or None."""
    n = len(lines)
    ln = lines[i]
    t = ln["text"].strip()
    if ln["x"] > 89 or i + 1 >= n:
        return None
    if lines[i + 1]["x"] < 108:
        return None
    if not heading_text_ok(t, 26):
        return None
    if gap_before(lines, i) < 45:
        return None
    return t


def convert_decision():
    lines = get_lines(os.path.join(BASE, r"决策理论与方法\10月13日讲稿.pdf"))
    body = []
    i = 1
    n = len(lines)
    body.append("\n**" + lines[0]["text"].strip() + "**\n")
    while i < n:
        ln = lines[i]
        t = ln["text"].strip()
        if re.match(RE_PART, t):
            body.append("\n## " + t + "\n")
            i += 1
            continue
        h = decision_heading(lines, i)
        if h:
            body.append("\n### " + h + "\n")
            i += 1
            continue
        # paragraph: gather
        para = [ln["text"]]
        j = i + 1
        while j < n:
            m = lines[j]
            mt = m["text"].strip()
            if re.match(RE_PART, mt) or decision_heading(lines, j):
                break
            if m["x"] >= 108:
                # indented line: new paragraph, unless cross-page continuation
                if m["page"] != lines[j - 1]["page"] and not ends_sentence(lines[j - 1]["text"]):
                    para[-1] = join_text(para[-1], m["text"])
                    j += 1
                    continue
                break
            else:
                para[-1] = join_text(para[-1], m["text"])
                j += 1
        body.append("\n" + "".join(para).strip() + "\n")
        i = j
    body_md = "\n".join(body)
    desc = ("决策理论与方法课堂笔记，分三部分。第一部分讲软科（上海）排名的来龙去脉："
            "985 工程与排名的战略背景、法国学者的批评、排名为何重要，六大指标（校友、"
            "教师、论文、被引、人均科研等）的计分与权重问题、折现口径、诺奖非英语国家"
            "漏算等指标缺陷，以及从中提炼的组织管理道理：评估为争夺资源服务。"
            "第二部分是决策树上机课，用 Excel 加 TreePlan 插件画决策树，讲软件安装、"
            "树形图画法、期望收益计算与作业提交要求。第三部分讲群决策理论："
            "中外国家决策体制、决策过程中的个体行为与非理性，含课堂讨论与复盘小结。")
    emit(r"决策理论与方法\10月13日讲稿.md",
         "10月13日讲稿", "决策理论与方法", "2026-10-13",
         "./covers/decision-theory-960.webp", desc, body_md,
         extra_fm=['lecturer: "石婧老师"'])


# ================= 土地资源管理 =================

def collect_para(lines, i, x0, n, stop_patterns):
    """Collect a paragraph whose first line x is x0.
    Continuation lines sit at x0-21 (±8) and share the same font size."""
    size0 = lines[i]["size"]
    para = [lines[i]["text"]]
    cont_x = x0 - 21
    j = i + 1
    while j < n:
        nxt = lines[j]
        nt = nxt["text"].strip()
        if any(p.search(nt) for p in stop_patterns):
            break
        if nxt["size"] >= 14.0:
            break
        if nxt["size"] == size0 and abs(nxt["x"] - cont_x) <= 8:
            para[-1] = join_text(para[-1], nxt["text"])
            j += 1
        else:
            break
    return "".join(para).strip(), j


RE_SUBITEM = re.compile(r"^（\d+）")
RE_ITEM = re.compile(r"^\d+\.\s")
SUB_LABEL = re.compile(r"^(?:判定标准|特殊情况|特殊规定|具体情况|重点|关键|补充|注意|区分|举例|结论|原因|要求|方法|概念)[:：]")


def collect_land_heading(lines, i, n):
    """Heading plus up to two wrapped continuation lines (x<=80).
    Stops at the next heading pattern."""
    ln = lines[i]
    parts = [ln["text"].strip()]
    j = i + 1
    while j < n and len(parts) < 3 and lines[j]["size"] == ln["size"] and lines[j]["x"] <= 80:
        nt = lines[j]["text"].strip()
        if re.match(r"^第[" + CN_NUM + r"]+讲", nt) or re.match(RE_TOP, nt) or re.match(RE_SUB, nt):
            break
        parts.append(nt)
        j += 1
    return "".join(parts), j


def collect_land_item(lines, i, n):
    """Collect a numbered item: main paragraph plus （1）/label sub-blocks."""
    ln = lines[i]
    m = re.match(r"^(\d+)\.\s*(.*)$", ln["text"].strip())
    num, rest = m.group(1), m.group(2)
    blocks = [{"zone": 103, "text": rest}]
    j = i + 1
    while j < n:
        nxt = lines[j]
        nt = nxt["text"].strip()
        if nxt["size"] >= 14.0:
            break
        if re.match(r"^第[" + CN_NUM + r"]+讲", nt) or re.match(RE_TOP, nt) or re.match(RE_SUB, nt):
            break
        if RE_ITEM.match(nt) and nxt["x"] >= 100:
            break
        if nxt["size"] != 12.0:
            break
        cur = blocks[-1]
        if nxt["x"] <= 80:
            # hanging-indent continuation
            cur["text"] = join_text(cur["text"], nxt["text"])
            j += 1
        elif nxt["x"] >= 120:
            if RE_SUBITEM.match(nt) or cur["zone"] != 127:
                blocks.append({"zone": 127, "text": nt})
            else:
                cur["text"] = join_text(cur["text"], nxt["text"])
            j += 1
        elif nxt["x"] >= 95:
            if RE_SUBITEM.match(nt) or SUB_LABEL.match(nt):
                blocks.append({"zone": 103, "text": nt})
            elif cur["zone"] == 127:
                blocks.append({"zone": 103, "text": nt})
            elif ends_sentence(cur["text"]):
                blocks.append({"zone": 103, "text": nt})
            else:
                # wrapped continuation of the main paragraph (no hanging indent)
                cur["text"] = join_text(cur["text"], nxt["text"])
            j += 1
        else:
            break
    block = "\n" + num + ". " + blocks[0]["text"].strip() + "\n"
    for b in blocks[1:]:
        block += "\n    " + b["text"].strip() + "\n"
    return block, j


def convert_land(path, out_rel, title, date, desc, has_lecture_title):
    lines = get_lines(path)
    body = []
    i = 0
    n = len(lines)
    while i < n:
        ln = lines[i]
        t = ln["text"].strip()
        size = ln["size"]
        if size == 15.9 or (not has_lecture_title and i == 0):
            body.append("\n**" + t + "**\n")
            i += 1
            continue
        # subtitle line "内容：..." right after title
        if i == 1 and t.startswith("内容："):
            body.append("\n" + t + "\n")
            i += 1
            continue
        # 14.1 lecture title
        if size >= 14.0 and size <= 14.2 and re.match(r"^第[" + CN_NUM + r"]+讲", t):
            body.append("\n## " + t + "\n")
            i += 1
            continue
        # top heading 一、 / sub heading （一）, with wrapped lines
        if re.match(RE_TOP, t):
            ht, j = collect_land_heading(lines, i, n)
            body.append("\n### " + ht + "\n")
            i = j
            continue
        if re.match(RE_SUB, t):
            ht, j = collect_land_heading(lines, i, n)
            body.append("\n#### " + ht + "\n")
            i = j
            continue
        # numbered item 1. 2. ...
        if RE_ITEM.match(t) and ln["x"] >= 95:
            block, j = collect_land_item(lines, i, n)
            body.append(block)
            i = j
            continue
        # plain paragraph (includes 11.1pt 注意 blocks)
        text, j = collect_para(lines, i, ln["x"], n,
                               [re.compile(r"^第[" + CN_NUM + r"]+讲"), RE_TOP, RE_SUB, RE_ITEM])
        body.append("\n" + text.strip() + "\n")
        i = j
    return "\n".join(body)


def convert_land9():
    desc = ("不动产估价课堂笔记，讲不动产价格的概念、特征、影响因素与价格类型。"
            "开场交代课程进度（两周后进入估价实践）；回顾不动产概念（不可移动性、"
            "耐久性、独一无二、供给有限），明确不动产是实物、权益、区位三者的结合，"
            "讲土地组成二元性、绝对地租与绝对位置相对位置；讲价格的三个含义、"
            "价格形成的三个条件，与一般商品价格对比的差异，不动产价格五大特征；"
            "影响因素按一般因素、区域因素、个别因素三类划分，以及供给、需求与价格的关系；"
            "最后按不同维度划分不动产价格主要类型（出让、转让、基准、评估、市场价格等）。")
    body = convert_land(os.path.join(BASE, r"土地资源管理\10月9日讲稿.pdf"),
                        r"土地资源管理\10月9日讲稿.md", "10月9日讲稿",
                        "2026-10-09", desc, False)
    emit(r"土地资源管理\10月9日讲稿.md",
         "10月9日讲稿", "土地资源管理", "2026-10-09",
         "./covers/land-resource-960.webp", desc, body)


def convert_land16():
    desc = ("不动产估价课堂笔记，共四讲。第一讲不动产价格概念与特征：不动产定义、"
            "基本特征、实物权益区位三要素、土地组成二元性、分类，价格三含义、"
            "形成三条件、五大特征、影响因素三类划分、享乐价格法（特征价格法）、"
            "供给需求与价格主要类型。第二讲不动产估价基本原理：估价定义、分类、"
            "原则、必要性。第三讲五大估价方法：市场比较法、收益还原法、成本分析法、"
            "假设开发法、基准地价修正法，逐一讲适用条件与公式。第四讲土地政策参与"
            "宏观调控：三种调控手段、土地闸门与货币闸门、土地供应政策、存在问题与"
            "研究方向、课程实践安排与土地资源管理产业化。")
    body = convert_land(os.path.join(BASE, r"土地资源管理\10月16日讲稿.pdf"),
                        r"土地资源管理\10月16日讲稿.md", "10月16日讲稿",
                        "2026-10-16", desc, True)
    emit(r"土地资源管理\10月16日讲稿.md",
         "10月16日讲稿", "土地资源管理", "2026-10-16",
         "./covers/land-resource-960.webp", desc, body)


# ================= 知识产权 =================

def convert_ip():
    lines = get_lines(os.path.join(BASE, r"知识产权法基础理伦\10月16日讲稿.pdf"))
    body = []
    i = 0
    n = len(lines)
    while i < n:
        ln = lines[i]
        t = ln["text"].strip()
        if ln["size"] == 15.0:
            body.append("\n**" + t + "**\n")
            i += 1
            continue
        if ln["size"] == 12.9:
            body.append("\n### " + t + "\n")
            i += 1
            continue
        # body 12.0: first line x>=100, continuation x<=80
        para = [ln["text"]]
        i += 1
        while i < n:
            nxt = lines[i]
            if nxt["size"] != 12.0:
                break
            if nxt["x"] <= 80:
                para[-1] = join_text(para[-1], nxt["text"])
                i += 1
            else:
                break
        body.append("\n" + "".join(para).strip() + "\n")
    body_md = "\n".join(body)
    desc = ("知识产权法基础理论论文精读与结构分析课课堂笔记，由陈老师带领逐段研读一篇"
            "关于知识产权法法理基础的学术论文。先讲英美知识产权法两个法理基础："
            "洛克财产权论与功利主义，引林肯名言“专利制度就是给天才之火浇上利益之油”；"
            "再做段落结构分析，划分意群、辨析总起句与总分关系，李奇月同学提出不同分段"
            "意见并展开批判性思维讨论；随后逐段梳理论文论证脉络：洛克劳动财产权学说的"
            "内容、先决条件与现代困境，功利主义的逻辑与制度设计，两种理论在知识产权"
            "正当性证明中的分工与张力；最后落到论文写作与论证方法，以及课堂要求的"
            "“四个一”作业。")
    emit(r"知识产权法基础理论\10月16日讲稿.md",
         "10月16日讲稿", "知识产权法基础理论", "2026-10-16",
         "./covers/ip-theory-960.webp", desc, body_md)


# ================= 中日关系 =================

def cjp_heading(lines, i):
    """Return heading level (2/3) and text, or None.
    h2: pre-gap >=45 or cross-page; h3: pre-gap 27-44."""
    n = len(lines)
    ln = lines[i]
    if ln["x"] > 80 or i + 1 >= n:
        return None
    if lines[i + 1]["x"] < 98:
        return None
    t = ln["text"].strip()
    if not heading_text_ok(t, 22):
        return None
    g = gap_before(lines, i)
    if g >= 45:
        return (2, t)
    if g >= 27:
        return (3, t)
    return None


def convert_cjp():
    lines = get_lines(os.path.join(BASE, r"近现代中日关系史\10月13日讲稿.pdf"))
    body = []
    n = len(lines)
    body.append("\n**" + lines[0]["text"].strip() + "**\n")
    i = 1
    while i < n:
        h = cjp_heading(lines, i)
        if h:
            lvl, t = h
            body.append("\n" + "#" * lvl + " " + t + "\n")
            i += 1
            continue
        ln = lines[i]
        para = [ln["text"]]
        j = i + 1
        while j < n:
            if cjp_heading(lines, j):
                break
            m = lines[j]
            if m["x"] >= 98:
                # indented line: new paragraph unless cross-page continuation
                if m["page"] != lines[j - 1]["page"] and not ends_sentence(lines[j - 1]["text"]):
                    para[-1] = join_text(para[-1], m["text"])
                    j += 1
                    continue
                break
            para[-1] = join_text(para[-1], m["text"])
            j += 1
        body.append("\n" + "".join(para).strip() + "\n")
        i = j
    body_md = "\n".join(body)
    desc = ("一战后中日关系史课堂笔记。以五四运动与巴黎和会为起点，讲五四运动起因、"
            "经过与民族主义觉醒，中国以14万劳工参战、知识界（梁启超、张君劢、梁士诒）"
            "推动，威尔逊主义与列宁主义的影响；中国对战后和平的乐观与弱国外交的教训，"
            "巴黎和会山东问题交涉失败、公理战胜牌坊的由来；华盛顿会议与九国公约、"
            "山东问题的解决；二十年代中国社会变化、南方革命政府与北伐，日本东方会议、"
            "田中奏折与新侵华策略；南京国民政府与日本通过谈判建立正式外交关系的过程，"
            "以及相关人物与条约的史实梳理。")
    emit(r"近现代中日关系史\10月13日讲稿.md",
         "10月13日讲稿", "近现代中日关系史", "2026-10-13",
         "./covers/modern-china-japan-960.webp", desc, body_md)


if __name__ == "__main__":
    convert_python()
    convert_pubeco()
    convert_decision()
    convert_land9()
    convert_land16()
    convert_ip()
    convert_cjp()
