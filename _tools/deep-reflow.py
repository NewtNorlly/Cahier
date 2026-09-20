# -*- coding: utf-8 -*-
"""
深度重排：把德语讲稿 M 栏密排文字拆成短段落（目标 avg ≤60字，>320清零）。
策略：
1. 提取所有 M 栏内容，拼回连续文本
2. 在自然边界切分原子单元：
   - 德语例句（大写开头的德语句）
   - 词条（der/die/das + 名词）
   - 中文句末标点
3. 聚合成段：每个原子单元独立成段，短解释合并到下一句
4. 纯段落+空行，无任何 markdown 标记
"""
import re, io, os, sys

def deep_reflow(path):
    with io.open(path, 'r', encoding='utf-8-sig') as f:
        text = f.read()

    fm_match = re.match(r'^(---\n.*?\n---\n)', text, re.DOTALL)
    frontmatter = fm_match.group(1) if fm_match else ""
    body = text[len(frontmatter):] if fm_match else text

    folio_pattern = re.compile(r'(<!--folio:[^>]+-->\s*\n)(.*?)(?=<!--folio:|<!--/folio-->|\Z)', re.DOTALL)

    def reflow_m(m_content):
        # 去掉现有换行，拼成连续文本
        flat = re.sub(r'\s+', ' ', m_content.strip())
        if not flat:
            return ""

        # 切分原子单元
        # 先在句末标点后加断句标记
        flat = re.sub(r'([。！？!?])', r'\1\n', flat)

        # 在德语词条前断段：der/die/das + 空格 + 大写名词
        flat = re.sub(r'\s+((?:der|die|das|ein|eine|einen|einem|eigner|une|des|dem|den|les|le|la|un|une|du|de|la)\s+[A-ZÄÖÜ])', r'\n\1', flat)

        # 在德语例句前断段：大写德语词开头
        de_starters = r'(Ich|Wir|Der|Die|Das|Ein|Eine|Mein|Meine|Dein|Deine|Ihr|Ihre|Unser|Unsere|Er|Sie|Es|Du|Wer|Wie|Wo|Wann|Warum|Was|Welche|Kannst|Können|Guten|Gute|Hallo|Tschüs|Auf|Und|Nein|Ja|Vorstellung|Entschuldigung|Verzeihung|Angenehm|Moment|Alles|Danke|Bitte|Heißt|Heute|Morgen|Morgens|Jetzt|Dann|Zuerst|Danach|Endlich|Schön|Gut|Sehr|Ganz|Nicht|The|This|That|These|Those|It|He|She|We|You|They|Is|Are|Was|Were|Will|Would|Can|Could|Should|May|Might|Do|Does|Did)\b'
        flat = re.sub(r'\s+(' + de_starters + r')', r'\n\1', flat)

        # 在中文小节标题前断段
        flat = re.sub(r'\s+(第[一二三四五六七八九十\d]+[讲章节部分])', r'\n\1', flat)
        flat = re.sub(r'\s+([一二三四五六七八九十]+[、．.])', r'\n\1', flat)
        flat = re.sub(r'\s+(注意|讲解|例句|词条|词汇|语法|课文|对话|复习|总结|补充|谚语|原文|译文|逐词|逐句|句法|文化|金句|句型|复述|小结|练习|答案|分析|要点|提醒|强调|补充说明)', r'\n\1', flat)

        # 在编号项前断段
        flat = re.sub(r'\s+(\d+[.、)]\s*)', r'\n\1', flat)

        # 按换行切分
        lines = [l.strip() for l in flat.split('\n') if l.strip()]

        # 聚合成段：
        # - 德语词条/例句独立成段
        # - 中文解释句：如果太短（<30字）且下一句也是解释，合并
        # - 否则独立成段
        paragraphs = []
        current = ""

        for line in lines:
            # 判断是否是德语词条/例句
            is_de = bool(re.match(r'^(der|die|das|ein|eine|Ich|Wir|Der|Die|Das|Er|Sie|Es|Du|Wer|Wie|Wo|Was|Guten|Auf|Und|Nein|Ja|Bitte|Danke|Alles|The|This|That|It|He|She|We|You|They|Is|Are|Was)', line))

            if is_de:
                # 德语词条/例句独立成段
                if current:
                    paragraphs.append(current)
                    current = ""
                paragraphs.append(line)
            elif len(line) <= 50 and current and not re.match(r'^(der|die|das|Ich|Wir|Der|Die|Das|Er|Sie|Es)', current):
                # 短中文解释合并到当前段
                current += line
            else:
                if current:
                    paragraphs.append(current)
                current = line

        if current:
            paragraphs.append(current)

        # 清理：合并过短的段落（<5字）到上一段
        final = []
        for p in paragraphs:
            if len(p) < 8 and final:
                final[-1] += p
            else:
                final.append(p)

        return '\n\n'.join(final)

    def process_folio(match):
        header = match.group(1)
        body_content = match.group(2)
        col_match = re.match(
            r'(<!--col:L-->\s*\n)(.*?)(<!--col:M-->\s*\n)(.*?)(<!--col:R-->\s*\n)(.*?)$',
            body_content, re.DOTALL
        )
        if not col_match:
            return match.group(0)
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
            paras, avg, mx, over320 = deep_reflow(f)
            rel = os.path.basename(f)
            print(f"{rel:<50} {paras:>6} {avg:>6.0f} {mx:>6} {over320:>5}")
        except Exception as e:
            print(f"{os.path.basename(f):<50} ERROR: {e}")
