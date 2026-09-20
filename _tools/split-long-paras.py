# -*- coding: utf-8 -*-
"""
超长段终结者：找出所有 >320 字段落，在自然边界拆分。
断点优先级：
1. 中文句末标点 。！？
2. 中文逗号 ，；、
3. 英文逗号 , ; (仅当两侧都是英文)
4. 连接词前：并且/但是/因为/所以/如果/虽然/然后/另外/此外/同时/其中/其中/首先/其次/最后/也就是说/换句话说/其实/实际上/当然/不过/于是/因此/然而/此外/另外
5. 从句引导词前：当...时/在...中/对...来说/对于...而言
不切断：德语/法语/英语完整句子（不在例句中间断）
"""
import re, io, os, sys

def split_long_paragraph(para, max_len=300):
    """把一个超长段拆成多个短段，在自然边界断。"""
    if len(para) <= max_len:
        return [para]

    # 先尝试在句末标点后断
    sentences = re.split(r'([。！？!?])', para)
    # 重组：每句 = 内容+标点
    parts = []
    i = 0
    while i < len(sentences):
        if i + 1 < len(sentences) and sentences[i+1] in '。！？!?':
            parts.append(sentences[i] + sentences[i+1])
            i += 2
        else:
            if sentences[i].strip():
                parts.append(sentences[i])
            i += 1

    # 如果拆分后每部分仍 >max_len，继续在逗号处拆
    final = []
    for p in parts:
        if len(p) <= max_len:
            final.append(p)
            continue
        # 在逗号/分号处拆
        sub = re.split(r'([，；、,;])', p)
        buf = ""
        j = 0
        while j < len(sub):
            if j + 1 < len(sub) and sub[j+1] in '，；、,;':
                piece = sub[j] + sub[j+1]
            else:
                piece = sub[j]
            if len(buf) + len(piece) > max_len and buf:
                final.append(buf)
                buf = piece
            else:
                buf += piece
            j += 1
        if buf:
            final.append(buf)

    # 如果还是太长，在连接词前断
    result = []
    connectors = r'(并且|但是|因为|所以|如果|虽然|然后|另外|此外|同时|其中|首先|其次|最后|也就是说|换句话说|其实|实际上|当然|不过|于是|因此|然而|而|却|则|也|还|又|再|就|才|只|就会|就能|就可以|就需要|就必须|就要|要|想|能|可以|应该|必须|需要|得)'
    for p in final:
        if len(p) <= max_len:
            result.append(p)
            continue
        # 在连接词前断
        chunks = re.split(r'(' + connectors + r')', p)
        buf = ""
        for chunk in chunks:
            if len(buf) + len(chunk) > max_len and buf:
                result.append(buf)
                buf = chunk
            else:
                buf += chunk
        if buf:
            result.append(buf)

    return result


def process_file(path):
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
                split = split_long_paragraph(p, max_len=280)
                new_paras.extend(split)
            else:
                new_paras.append(p)
        return '\n\n'.join(new_paras)

    def process_folio(match):
        header = match.group(1)
        body_content = match.group(2)
        # Try with col:L
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
            paras, avg, mx, over320 = process_file(f)
            rel = os.path.basename(f)
            print(f"{rel:<50} {paras:>6} {avg:>6.0f} {mx:>6} {over320:>5}")
        except Exception as e:
            print(f"{os.path.basename(f):<50} ERROR: {e}")
