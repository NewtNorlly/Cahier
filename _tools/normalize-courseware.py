# -*- coding: utf-8 -*-
"""
规范化 5 个决策理论课件 md（每张幻灯片 = 一个源 folio）：
1) 项目符号层级：¡/● = 一级（橙方块），紧随的 "-" = 二级（蓝箭头），输出为正确嵌套的 markdown 列表；
2) 把「标题样」的首行纯文本提升为 #### 标题（不改动图片/表格/公式/编号列表/已有标题）；
3) 其余内容（图片、表格、公式、正文）一字不动。
仅在 <!--col:M--> 列内处理；L/R 与 frontmatter 保持原样。带文字守恒校验。
"""
import os, re, shutil, sys

ROOT = r"C:\Users\NewtN\下载\Cahier-main\决策理论与方法"
FILES = [
    "决策理论课件0·导论 Introduction.md",
    "决策理论课件1·不确定性决策 Decision under Uncertainty.md",
    "决策理论课件2·风险决策 Decision under Risk.md",
    "决策理论课件3·行为决策分析 Behavioral Decision Analysis.md",
    "决策理论课件4·助推 Nudge.md",
]
BACKUP = r"C:\Users\NewtN\下载\Cahier-main\_tools\backup-courseware"
os.makedirs(BACKUP, exist_ok=True)

TOP_BULLET = re.compile(r"^[¡●◦▪■]\s*(.*)$")
DASH = re.compile(r"^(\s*)-\s+(.*)$")
NUM = re.compile(r"^\s*\d+\.\s+")
HEAD = re.compile(r"^#{1,6}\s+")
IMG = re.compile(r"^\s*!\[")
TABLE = re.compile(r"^\s*\|")
FORMULA = re.compile(r"^\s*\$\$")
HTML = re.compile(r"^\s*<")
QUOTE = re.compile(r"^\s*>")
SENT_END = re.compile(r"[。！？!?…\.：:；;]$")

def visual_len(s):
    n = 0
    for ch in s:
        n += 1 if ord(ch) > 0x2E00 else 0.56
    return n

def title_like(line):
    t = line.strip()
    if not t: return False
    if HEAD.match(t) or IMG.match(t) or TABLE.match(t) or FORMULA.match(t) or HTML.match(t) or QUOTE.match(t): return False
    if TOP_BULLET.match(t) or DASH.match(t) or NUM.match(t): return False
    if SENT_END.search(t): return False
    if visual_len(t) > 40: return False
    # 含明显正文连接词且较长的排除已由长度处理；标题允许冒号、括号
    return True

def transform_m(lines):
    """lines: M 列原始行（不含 col 标记）。返回新行列表。"""
    uses_top = any(TOP_BULLET.match(l) for l in lines)
    # 该幻灯片已有标题时，绝不把作者名等其它短行误提升为标题
    has_head = any(HEAD.match(l.strip()) for l in lines)
    out = []
    # 标题提升：仅当整页无标题时，把第一个、且在任何列表/图片/表格之前的标题样纯文本提升
    promoted = has_head
    seen_content = False
    for l in lines:
        raw = l
        stripped = l.strip()
        m_top = TOP_BULLET.match(l)
        m_dash = DASH.match(l)
        if m_top:
            out.append("- " + m_top.group(1).strip())
            seen_content = True
            continue
        if m_dash:
            indent = len(m_dash.group(1))
            body = m_dash.group(2)
            if uses_top:
                # 一级 ¡ 存在时，平级 "-" 一律是二级；已缩进的按深度
                depth = 2 if indent == 0 else min(4, indent + 2)
            else:
                depth = 0 if indent == 0 else indent
            out.append(" " * depth + "- " + body)
            seen_content = True
            continue
        # 标题提升仅针对第一段纯文本（在首个列表/图片等之前）
        if not promoted and not seen_content:
            if stripped == "":
                out.append(l)
                continue
            if title_like(l):
                out.append("#### " + stripped)
                promoted = True
                seen_content = True
                continue
            # 其它实质内容（图片/编号/表格/已有标题/长正文）→ 不再尝试提升
            if not HEAD.match(l):
                seen_content = True
        out.append(l)
    return out

COL_M = re.compile(r"^<!--col:M-->\s*$")
COL_OTHER = re.compile(r"^<!--col:[LR]-->\s*$")
FOLIO_CLOSE = re.compile(r"^<!--\s*/folio-->\s*$")

def process(text):
    lines = text.split("\n")
    n = len(lines)
    i = 0
    changed_folios = 0
    while i < n:
        if COL_M.match(lines[i]):
            start = i + 1
            j = start
            while j < n and not (COL_OTHER.match(lines[j]) or FOLIO_CLOSE.match(lines[j])):
                j += 1
            block = lines[start:j]
            newblock = transform_m(block)
            if newblock != block:
                changed_folios += 1
                lines[start:j] = newblock
                n = len(lines)
                j = start + len(newblock)
            i = j
        else:
            i += 1
    return "\n".join(lines), changed_folios

def text_tokens(t):
    # 仅保留中文、字母、数字，用于守恒（忽略项目符号/井号/空白的变化）
    return re.findall(r"[一-鿿A-Za-z0-9]", t)

for fn in FILES:
    p = os.path.join(ROOT, fn)
    raw = open(p, "r", encoding="utf-8").read()
    bom = raw.startswith("\ufeff")
    body = raw.lstrip("\ufeff")
    shutil.copy2(p, os.path.join(BACKUP, fn))
    new, nfol = process(body)
    before = text_tokens(body)
    after = text_tokens(new)
    # 去掉 ¡● 后比较（这两个符号是项目符号，不是内容）
    before2 = [c for c in before if c not in "¡●"]
    same = before2 == after
    out = ("\ufeff" if bom else "") + new
    open(p, "w", encoding="utf-8", newline="").write(out)
    print(f"{fn}: 改动幻灯片 {nfol} 个, 文字守恒={'OK' if same else 'FAIL!!!'} (前{len(before2)} 后{len(after)})")
    if not same:
        from collections import Counter
        cb, ca = Counter(before2), Counter(after)
        diff = (cb - ca) + (ca - cb)
        print("   差异:", list(diff.items())[:20])
print("done")
