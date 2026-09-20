# -*- coding: utf-8 -*-
"""
v2 深度重排：更激进地拆分。
1. 每个中文句末标点后断段
2. 每个词条（der/die/das + 名词）独立成行，即使粘连
3. 每个德语例句独立成行
4. 短中文解释（<40字）独立成行
5. 长中文段落按句拆成单句段
"""
import re, io, os, sys

def deep_reflow_v2(path):
    with io.open(path, 'r', encoding='utf-8-sig') as f:
        text = f.read()

    fm_match = re.match(r'^(---\n.*?\n---\n)', text, re.DOTALL)
    frontmatter = fm_match.group(1) if fm_match else ""
    body = text[len(frontmatter):] if fm_match else text

    folio_pattern = re.compile(r'(<!--folio:[^>]+-->\s*\n)(.*?)(?=<!--folio:|<!--/folio-->|\Z)', re.DOTALL)

    def reflow_m(m_content):
        flat = re.sub(r'\s+', ' ', m_content.strip())
        if not flat:
            return ""

        # Strip markdown headers and bullets
        flat = re.sub(r'^#{1,6}\s*', '', flat, flags=re.MULTILINE)
        flat = re.sub(r'^[-*]\s+', '', flat, flags=re.MULTILINE)

        # Step 1: 在句末标点后断句（中文句号+英文句号）
        flat = re.sub(r'([。！？!?])', r'\1\n', flat)
        # English sentence boundary: . followed by space and capital
        flat = re.sub(r'(\.\s+)([A-Z])', r'\1\n\2', flat)

        # Step 2: 在词条前断段（即使粘连，无空格也要断）
        # 模式：中文后紧跟 der/die/das + 大写名词
        flat = re.sub(r'([\u4e00-\u9fff）)：:，,；;])(\s*)(der|die|das|ein|eine|einen|einem|eigner|une|des|dem|den|les|le|la|un|une|du|de)\s+([A-ZÄÖÜ])', r'\1\n\3 \4', flat)

        # Step 3: 在德语例句前断段（即使粘连）
        de_starters = r'(Ich|Wir|Der|Die|Das|Ein|Eine|Mein|Meine|Dein|Deine|Ihr|Ihre|Unser|Unsere|Er|Sie|Es|Du|Wer|Wie|Wo|Wann|Warum|Was|Welche|Kannst|Können|Guten|Gute|Hallo|Tschüs|Auf|Und|Nein|Ja|Vorstellung|Entschuldigung|Verzeihung|Angenehm|Moment|Alles|Danke|Bitte|Heißt|Heute|Morgen|Morgens|Jetzt|Dann|Zuerst|Danach|Endlich|Schön|Gut|Sehr|Ganz|Nicht|The|This|That|These|Those|It|He|She|We|You|They|Is|Are|Was|Were|Will|Would|Can|Could|Should|May|Might|Do|Does|Did)\b'
        flat = re.sub(r'([\u4e00-\u9fff）)：:，,；;])(\s*)(' + de_starters + r')', r'\1\n\3', flat)

        # Step 4: 在小节标题前断段（即使粘连）
        flat = re.sub(r'([\u4e00-\u9fff）)：:])(第[一二三四五六七八九十\d]+[讲章节部分])', r'\1\n\2', flat)
        flat = re.sub(r'([\u4e00-\u9fff）)：:])([一二三四五六七八九十]+[、．.])', r'\1\n\2', flat)
        flat = re.sub(r'([\u4e00-\u9fff）)：:])(注意|讲解|例句|词条|词汇|语法|课文|对话|复习|总结|补充|谚语|原文|译文|逐词|逐句|句法|文化|金句|句型|复述|小结|练习|答案|分析|要点|提醒|强调)', r'\1\n\2', flat)

        # Step 5: 在编号项前断段（即使粘连）
        flat = re.sub(r'([\u4e00-\u9fff）)：:])(\d+[.、)]\s*)', r'\1\n\2', flat)

        # 按换行切分
        lines = [l.strip() for l in flat.split('\n') if l.strip()]

        # 每个 line 就是一个段落
        # 但要合并过短的碎片（<10字）到相邻段
        paragraphs = []
        for line in lines:
            if len(line) < 10 and paragraphs:
                paragraphs[-1] += line
            else:
                paragraphs.append(line)

        return '\n\n'.join(paragraphs)

    def process_folio(match):
        header = match.group(1)
        body_content = match.group(2)
        # Try with col:L first
        col_match = re.match(
            r'(<!--col:L-->\s*\n)(.*?)(<!--col:M-->\s*\n)(.*?)(<!--col:R-->\s*\n)(.*?)$',
            body_content, re.DOTALL
        )
        if not col_match:
            # Try without col:L, with col:R
            col_match = re.match(
                r'(<!--col:M-->\s*\n)(.*?)(<!--col:R-->\s*\n)(.*?)$',
                body_content, re.DOTALL
            )
            if not col_match:
                # Try without both col:L and col:R (M to end)
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
        new_m = reflow_m(m_content)
        return header + l_marker + "\n" + m_marker + "\n" + new_m + "\n" + r_marker + "\n"

    new_body = folio_pattern.sub(process_folio, body)
    result = frontmatter + new_body

    with io.open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(result)

    # 统计
    folios = re.finditer(r'(?s)<!--col:M-->(.*?)<!--col:R-->', result)
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
            paras, avg, mx, over320 = deep_reflow_v2(f)
            rel = os.path.basename(f)
            print(f"{rel:<50} {paras:>6} {avg:>6.0f} {mx:>6} {over320:>5}")
        except Exception as e:
            print(f"{os.path.basename(f):<50} ERROR: {e}")
