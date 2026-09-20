# -*- coding: utf-8 -*-
"""
修复 v4 破坏的德语词间空格，然后干净断段。
策略：
1. 读取当前文件
2. 从 PDF 提取文本构建德语词表
3. 在连续字母串中，遇到已知德语词边界时插入空格
4. 然后按保守规则断段
"""
import re, io, os

PATH = r"C:\Users\NewtN\下载\Cahier-main\德语\9月19日讲稿.md"
PDF_TEXT = r"C:\Users\NewtN\下载\Cahier-main\_tools\german-pdf-text.txt"

# 从 PDF 文本提取所有德语词
with io.open(PDF_TEXT, "r", encoding="utf-8") as f:
    pdf_text = f.read()

# 提取德语词：连续的拉丁字母串（含变元音），长度>=2
german_words = set(re.findall(r'[a-zA-ZäöüÄÖÜß]+', pdf_text))
# 只保留德语词（含至少一个小写字母，排除纯缩写）
german_words = {w for w in german_words if len(w) >= 2 and any(c.islower() for c in w)}
print(f"Extracted {len(german_words)} German words from PDF")

# 按长度降序排列，优先匹配长词
sorted_words = sorted(german_words, key=len, reverse=True)

def restore_german_spaces(text):
    """在连续字母串中插入德语词间空格"""
    # 找到所有连续拉丁字母串
    result = []
    i = 0
    while i < len(text):
        if text[i].isascii() and text[i].isalpha():
            # 收集连续字母
            j = i
            while j < len(text) and text[j].isascii() and (text[j].isalpha() or text[j] in "äöüÄÖÜß"):
                j += 1
            chunk = text[i:j]

            # 如果 chunk 本身就是一个词，直接保留
            if chunk in german_words or chunk.lower() in {w.lower() for w in german_words}:
                result.append(chunk)
                i = j
                continue

            # 否则尝试切分
            # 从左到右贪心匹配
            restored = ""
            pos = 0
            remaining = chunk
            while remaining:
                matched = False
                for w in sorted_words:
                    if remaining.lower().startswith(w.lower()):
                        if restored:
                            restored += " "
                        restored += remaining[:len(w)]
                        remaining = remaining[len(w):]
                        matched = True
                        break
                if not matched:
                    # 无法匹配，逐字符推进
                    restored += remaining[0]
                    remaining = remaining[1:]
            result.append(restored)
            i = j
        else:
            result.append(text[i])
            i += 1
    return ''.join(result)


# 读取当前文件
with io.open(PATH, "r", encoding="utf-8") as f:
    text = f.read()

fm_match = re.match(r'^(---\n.*?\n---\n)', text, re.DOTALL)
frontmatter = fm_match.group(1) if fm_match else ""
body = text[len(frontmatter):] if fm_match else text

# 先恢复德语空格
body = restore_german_spaces(text)
body = body[len(frontmatter):] if fm_match else body

# 按 folio 页切分
folio_pattern = re.compile(r'(<!--folio:[^>]+-->\s*\n)(.*?)(?=<!--folio:|<!--/folio-->|\Z)', re.DOTALL)

def conservative_reflow(m_content):
    """保守断段"""
    # 去掉多余空行
    flat = re.sub(r'\n+', ' ', m_content).strip()

    # 在句末标点后加换行标记
    flat = re.sub(r'([。！？])', r'\1\n', flat)

    sentences = [s.strip() for s in flat.split('\n') if s.strip()]

    new_para_re = re.compile(
        r'^(第[一二三四五六七八九十\d]+讲'
        r'|(?:Ich|Wir|Der|Die|Das|Ein|Eine|Mein|Meine|Dein|Deine|Ihr|Ihre|Unser|Unsere|Er|Sie|Es|Du|Wer|Wie|Wo|Wann|Warum|Was|Welche|Kannst|Können|Guten|Gute|Hallo|Tschüs|Auf|Und|Nein|Ja|Vorstellung|Entschuldigung|Verzeihung|Angenehm|Moment|Alles|Danke|Bitte|Heißt|Heute|Morgen|Morgens|Jetzt|Dann|Zuerst|Danach|Endlich|Schön|Gut|Sehr|Ganz|Nicht)\b'
        r'|(?:der|die|das|ein|eine|einen|einem|einer) [A-ZÄÖÜ]'
        r'|注意|讲解|例句|词条|词汇|语法|课文|对话|复习|总结|补充|谚语)'
    )
    section_re = re.compile(r'^([一二三四五六七八九十])(?=[\u4e00-\u9fff])')

    paragraphs = []
    current = ""

    for sent in sentences:
        should_break = False
        if current:
            if new_para_re.match(sent):
                should_break = True
            elif section_re.match(sent):
                m = section_re.match(sent)
                next_char = sent[m.end():m.end()+1]
                if next_char not in '一二三四五六七八九十':
                    should_break = True
        if should_break:
            paragraphs.append(current)
            current = sent
        else:
            current += sent
    if current:
        paragraphs.append(current)
    return '\n\n'.join(paragraphs)


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
    new_m = conservative_reflow(m_content)
    return header + l_marker + "\n" + m_marker + "\n" + new_m + "\n" + r_marker + "\n"

new_body = folio_pattern.sub(process_folio, body)
result = frontmatter + new_body

with io.open(PATH, "w", encoding="utf-8", newline="") as f:
    f.write(result)

print(f"Done. Size: {len(result)}")
