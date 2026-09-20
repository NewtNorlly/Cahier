# -*- coding: utf-8 -*-
"""针对性拆分词条列表：德语动词变位/英语单词表"""
import re, io, os, sys

def split_vocab_lists(path):
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
            if len(p) > 320:
                # German verb conjugation: break at each pronoun (ich/du/er/sie/es/wir/ihr/sie/Sie)
                if re.search(r'\b(ich|du|er|sie|es|wir|ihr|Sie)\s+\w+', p):
                    # Split at each verb conjugation pattern
                    parts = re.split(r'((?:ich|du|er|sie|es|wir|ihr|Sie)\s+\w+)', p)
                    buf = ""
                    for part in parts:
                        if re.match(r'(?:ich|du|er|sie|es|wir|ihr|Sie)\s+\w+', part):
                            if buf:
                                new_paras.append(buf)
                            buf = part
                        else:
                            buf += part
                    if buf:
                        new_paras.append(buf)
                # English vocab: break at each English word + Chinese meaning pair
                elif re.search(r'[a-zA-Z]\s+[\u4e00-\u9fff]', p):
                    # Split at: English word followed by Chinese, then next English word
                    # Pattern: English word + Chinese + English word
                    parts = re.split(r'([a-zA-Z][a-zA-Z\s\-]*[\u4e00-\u9fff][\u4e00-\u9fff]*)', p)
                    buf = ""
                    for part in parts:
                        if re.match(r'[a-zA-Z]', part) and len(part) > 3:
                            if buf:
                                new_paras.append(buf)
                            buf = part
                        else:
                            buf += part
                    if buf:
                        new_paras.append(buf)
                else:
                    new_paras.append(p)
            else:
                new_paras.append(p)
        return '\n\n'.join(new_paras)

    def process_folio(match):
        header = match.group(1)
        body_content = match.group(2)
        col_match = re.match(
            r'(<!--col:L-->\s*\n)(.*?)(<!--col:M-->\s*\n)(.*?)(<!--col:R-->\s*\n)(.*?)$',
            body_content, re.DOTALL
        )
        if not col_match:
            col_match = re.match(
                r'(<!--col:M-->\s*\n)(.*?)(<!--col:R-->\s*\n)(.*?)$',
                body_content, re.DOTALL
            )
            if not col_match:
                col_match = re.match(
                    r'(<!--col:M-->\s*\n)(.*?)$',
                    body_content, re.DOTALL
                )
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

    # 统计
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
    print(f"{'File':<50} {'Paras':>6} {'Avg':>6} {'Max':>6} {'>320':>5}")
    print("-" * 80)
    for f in files:
        try:
            paras, avg, mx, over320 = split_vocab_lists(f)
            rel = os.path.basename(f)
            print(f"{rel:<50} {paras:>6} {avg:>6.0f} {mx:>6} {over320:>5}")
        except Exception as e:
            print(f"{os.path.basename(f):<50} ERROR: {e}")
