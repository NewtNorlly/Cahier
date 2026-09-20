# -*- coding: utf-8 -*-
"""
第三遍：专门在词条/例句/小节标题处强制断段。
处理模式：
- "der/die/das + 大写名词 + 中文解释" → 在词条前断段
- "德语例句.中文翻译" → 在例句前断段
- "X词汇Vokabeln" / "X语法Grammatik" → 在Vokabeln前断段
- "一/二/三 + 中文" → 在序号后断段
"""
import re, io

PATH = r"C:\Users\NewtN\下载\Cahier-main\德语\9月19日讲稿.md"
with io.open(PATH, "r", encoding="utf-8") as f:
    text = f.read()

fm_match = re.match(r'^(---\n.*?\n---\n)', text, re.DOTALL)
frontmatter = fm_match.group(1) if fm_match else ""
body = text[len(frontmatter):] if fm_match else text

folio_pattern = re.compile(r'(<!--folio:[^>]+-->\s*\n)(.*?)(?=<!--folio:|<!--/folio-->|\Z)', re.DOTALL)

def deep_break(m_content):
    """在 M 栏段落内部进一步断段"""
    # 先按现有 \n\n 分段
    paras = m_content.split('\n\n')
    new_paras = []

    for para in paras:
        para = para.strip()
        if not para:
            continue

        # 在这个段落内找断点
        # 1. 在 "der/die/das + 大写名词" 前断段（但不在行首）
        # 模式：中文文字后紧跟 der/die/das + 空格 + 大写字母
        parts = re.split(r'(?<=[\u4e00-\u9fff）)。！？])\s*(?=(?:der|die|das)\s+[A-ZÄÖÜ])', para)
        if len(parts) > 1:
            for p in parts:
                p = p.strip()
                if p:
                    new_paras.append(p)
            continue

        # 2. 在德语例句前断段：中文后紧跟 Ich/Wir/Der/Die/Das/Wie/Wo/Auf/Guten 等
        de_starters = r'(?:Ich|Wir|Der|Die|Das|Ein|Eine|Mein|Meine|Dein|Deine|Ihr|Ihre|Er|Sie|Es|Du|Wer|Wie|Wo|Wann|Warum|Was|Welche|Kannst|Können|Guten|Gute|Hallo|Tschüs|Auf|Und|Nein|Ja|Vorstellung|Entschuldigung|Verzeihung|Angenehm|Moment|Alles|Danke|Bitte|Heißt|Heißt)'
        parts = re.split(r'(?<=[\u4e00-\u9fff）)。！？])\s*(?=' + de_starters + r'\b)', para)
        if len(parts) > 1:
            for p in parts:
                p = p.strip()
                if p:
                    new_paras.append(p)
            continue

        # 3. 在中文小节序号后断段：如 "一德语的词类" → "一" 后断
        parts = re.split(r'(?<=[\u4e00-\u9fff）)。！？])\s*(?=[一二三四五六七八九十][\u4e00-\u9fff])', para)
        if len(parts) > 1:
            for p in parts:
                p = p.strip()
                if p:
                    new_paras.append(p)
            continue

        # 4. 在 Vokabeln / Grammatik / Text 前断段
        parts = re.split(r'(?<=[\u4e00-\u9fff）)。！？])\s*(?=(?:Vokabeln|Grammatik|Text|Dialog))', para)
        if len(parts) > 1:
            for p in parts:
                p = p.strip()
                if p:
                    new_paras.append(p)
            continue

        new_paras.append(para)

    return '\n\n'.join(new_paras)


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

    new_m = deep_break(m_content)
    return header + l_marker + "\n" + m_marker + "\n" + new_m + "\n" + r_marker + "\n"

new_body = folio_pattern.sub(process_folio, body)
result = frontmatter + new_body

with io.open(PATH, "w", encoding="utf-8", newline="") as f:
    f.write(result)

print(f"Done. Original: {len(text)}, New: {len(result)}")
