# -*- coding: utf-8 -*-
"""
通用康奈尔笔记重排脚本：
对指定 md 文件，把 M 栏中密排的单段文字按自然断点断成多段。
不删空格、不改文字，只在段间加空行。
断点：小节标题、例句开头、词条开头、注意/讲解等。
"""
import re, io, sys

def reflow_file(path):
    with io.open(path, "r", encoding="utf-8") as f:
        text = f.read()

    fm_match = re.match(r'^(---\n.*?\n---\n)', text, re.DOTALL)
    frontmatter = fm_match.group(1) if fm_match else ""
    body = text[len(frontmatter):] if fm_match else text

    folio_pattern = re.compile(r'(<!--folio:[^>]+-->\s*\n)(.*?)(?=<!--folio:|<!--/folio-->|\Z)', re.DOTALL)

    def reflow_m(m_content):
        # 按现有 \n\n 分段
        paras = [p.strip() for p in m_content.split('\n\n') if p.strip()]
        if len(paras) <= 1:
            # 只有一段，尝试断段
            if not m_content.strip():
                return ""
            # 在句末标点后切句
            flat = m_content.strip()
            flat = re.sub(r'([。！？!?])', r'\1\n', flat)
            sentences = [s.strip() for s in flat.split('\n') if s.strip()]
            if len(sentences) <= 1:
                return m_content.strip()

            # 新段落标志
            new_para_re = re.compile(
                r'^(第[一二三四五六七八九十\d]+[讲章节部分]'
                r'|(?:Ich|Wir|Der|Die|Das|Ein|Eine|Mein|Meine|Dein|Deine|Ihr|Ihre|Unser|Unsere|Er|Sie|Es|Du|Wer|Wie|Wo|Wann|Warum|Was|Welche|Kannst|Können|Guten|Gute|Hallo|Tschüs|Auf|Und|Nein|Ja|Vorstellung|Entschuldigung|Verzeihung|Angenehm|Moment|Alles|Danke|Bitte|Heißt|Heute|Morgen|Morgens|Jetzt|Dann|Zuerst|Danach|Endlich|Schön|Gut|Sehr|Ganz|Nicht|The|A|An|This|That|These|Those|It|He|She|We|You|They|Is|Are|Was|Were|Will|Would|Can|Could|Should|May|Might|Do|Does|Did)\b'
                r'|(?:der|die|das|ein|eine|einen|einem|eigner|une|des|dem|den|les|le|la|un|une|des|du|de|la|les)\s+[A-ZÀÂÄÇÉÈÊËÎÏÔÙÛÜŸ]'
                r'|注意|讲解|例句|词条|词汇|语法|课文|对话|复习|总结|补充|谚语|原文|译文|逐词|逐句|句法|文化|金句|句型|复述|小结|练习|答案|分析|要点|提醒|强调|补充说明)'
            )
            section_re = re.compile(r'^([一二三四五六七八九十]+[、．.])')

            paragraphs = []
            current = ""
            for sent in sentences:
                should_break = False
                if current:
                    if new_para_re.match(sent):
                        should_break = True
                    elif section_re.match(sent):
                        should_break = True
                    elif re.match(r'^\d+[.、)]', sent):
                        should_break = True
                if should_break:
                    paragraphs.append(current)
                    current = sent
                else:
                    current += sent
            if current:
                paragraphs.append(current)
            return '\n\n'.join(paragraphs)
        else:
            # 已有多段，保持不变
            return '\n\n'.join(paras)

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

    with io.open(path, "w", encoding="utf-8", newline="") as f:
        f.write(result)
    return len(result)


if __name__ == "__main__":
    files = sys.argv[1:]
    for f in files:
        try:
            new_len = reflow_file(f)
            print(f"OK: {f} -> {new_len} chars")
        except Exception as e:
            print(f"ERR: {f} -> {e}")
