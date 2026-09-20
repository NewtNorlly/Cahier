# -*- coding: utf-8 -*-
"""英语翻译笔记专用拆分：英文例句独立、中文词汇点独立"""
import re, io, os, sys

def split_english_notes(path):
    with io.open(path, 'r', encoding='utf-8-sig') as f:
        text = f.read()
    fm_match = re.match(r'^(---\n.*?\n---\n)', text, re.DOTALL)
    frontmatter = fm_match.group(1) if fm_match else ""
    body = text[len(frontmatter):] if fm_match else text
    folio_pattern = re.compile(r'(<!--folio:[^>]+-->\s*\n)(.*?)(?=<!--folio:|<!--/folio-->|\Z)', re.DOTALL)

    def split_m(m_content):
        paras = [p.strip() for p in m_content.split('\n\n') if p.strip()]
        new_paras = []
        for p in paras:
            if len(p) <= 120:
                new_paras.append(p)
                continue
            # 1. 先在英文句号后断（. + 空格 + 大写）
            parts = re.split(r'(\.\s+[A-Z])', p)
            # 重组
            chunks = []
            for i in range(0, len(parts), 2):
                if i + 1 < len(parts):
                    chunks.append(parts[i] + parts[i+1][0])
                else:
                    chunks.append(parts[i])
            # 2. 在中文逗号/分号后断
            final = []
            for c in chunks:
                if len(c) <= 120:
                    final.append(c)
                    continue
                sub = re.split(r'([，；、,;])', c)
                buf = ""
                for j in range(0, len(sub), 2):
                    piece = sub[j] + (sub[j+1] if j+1 < len(sub) else "")
                    if len(buf) + len(piece) > 120 and buf:
                        final.append(buf)
                        buf = piece
                    else:
                        buf += piece
                if buf:
                    final.append(buf)
            # 3. 合并过短碎片
            merged = []
            for f in final:
                if len(f) < 10 and merged:
                    merged[-1] += f
                else:
                    merged.append(f)
            new_paras.extend(merged)
        return '\n\n'.join(new_paras)

    def process_folio(match):
        header = match.group(1)
        body_content = match.group(2)
        col_match = re.match(r'(<!--col:L-->\s*\n)(.*?)(<!--col:M-->\s*\n)(.*?)(<!--col:R-->\s*\n)(.*?)$', body_content, re.DOTALL)
        if not col_match:
            col_match = re.match(r'(<!--col:M-->\s*\n)(.*?)(<!--col:R-->\s*\n)(.*?)$', body_content, re.DOTALL)
            if not col_match:
                col_match = re.match(r'(<!--col:M-->\s*\n)(.*?)$', body_content, re.DOTALL)
                if not col_match:
                    return match.group(0)
                l_marker = ""
                m_marker = col_match.group(1)
                m_content = col_match.group(2)
                r_marker = "<!--col:R-->\n"
            else:
                l_marker = ""
                m_marker = col_match.group(1)
                m_content = col_match.group(2)
                r_marker = col_match.group(3)
        else:
            l_marker = col_match.group(1)
            m_marker = col_match.group(3)
            m_content = col_match.group(4)
            r_marker = col_match.group(5)
        new_m = split_m(m_content)
        return header + l_marker + "\n" + m_marker + "\n" + new_m + "\n" + r_marker + "\n"

    new_body = folio_pattern.sub(process_folio, body)
    result = frontmatter + new_body
    with io.open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(result)
    folios = re.finditer(r'(?s)<!--col:M-->(.*?)(?:<!--col:R-->|\Z)', result)
    all_paras = []
    for m in folios:
        m_c = m.group(1).strip()
        paras = [p.strip() for p in m_c.split('\n\n') if p.strip()]
        all_paras.extend(paras)
    lengths = [len(p) for p in all_paras]
    avg = sum(lengths) / len(lengths) if lengths else 0
    mx = max(lengths) if lengths else 0
    over320 = sum(1 for l in lengths if l > 320)
    return len(all_paras), avg, mx, over320

if __name__ == "__main__":
    files = sys.argv[1:]
    print(f"{'File':<40} {'Paras':>6} {'Avg':>6} {'Max':>6} {'>320':>5}")
    print("-" * 70)
    for f in files:
        paras, avg, mx, over320 = split_english_notes(f)
        print(f"{os.path.basename(f):<40} {paras:>6} {avg:>6.0f} {mx:>6} {over320:>5}")
