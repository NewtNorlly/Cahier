# -*- coding: utf-8 -*-
"""把两份英语「影音跟读」里 **N. 英文** 加粗句改为 Markdown 有序列表（中栏插件会展平为
常规字重的 "N. 英文" 段落，西文走 Times New Roman），中文译文作为同一条目内的续段。
仅改动编号英文句与其紧随的中文译文，frontmatter / 标题 / 三栏标记保持不变。
用法: python fix-en-followup-1017.py <file.md>
"""
import io, re, sys

NUM_RE = re.compile(r"^\*\*(\d+)\.\s+(.*?)\*\*$")

def main(path):
    with io.open(path, encoding="utf-8") as f:
        lines = f.read().split("\n")
    out = []
    i = 0
    n = len(lines)
    while i < n:
        line = lines[i]
        m = NUM_RE.match(line)
        if not m:
            out.append(line)
            i += 1
            continue
        num = int(m.group(1))
        en = m.group(2).strip()
        indent = len(f"{num}. ")
        # 收集该编号后到下一条编号句 / 栏目标记之间的所有中文段（跳过空行）
        i += 1
        zh_blocks = []
        cur = []
        while i < n:
            l = lines[i]
            if NUM_RE.match(l):
                break
            if l.startswith("<!--"):
                break
            if l.strip() == "":
                if cur:
                    zh_blocks.append(cur)
                    cur = []
                i += 1
                continue
            cur.append(l)
            i += 1
        if cur:
            zh_blocks.append(cur)
        # 英文句：列表项
        out.append(f"{num}. {en}")
        # 中文译文：同条目内的续段，缩进对齐 marker
        for blk in zh_blocks:
            out.append("")
            for cl in blk:
                out.append(" " * indent + cl)
        out.append("")  # 条目之间留空行（loose list）
    # 规整连续空行（最多保留 1 个空行）
    cleaned = []
    prev_blank = False
    for l in out:
        is_blank = (l.strip() == "")
        if is_blank and prev_blank:
            continue
        cleaned.append(l)
        prev_blank = is_blank
    text = "\n".join(cleaned)
    with io.open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    print(f"fixed: {path}")

if __name__ == "__main__":
    for p in sys.argv[1:]:
        main(p)
