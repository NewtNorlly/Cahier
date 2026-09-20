# -*- coding: utf-8 -*-
"""
合并 v3 产生的过度碎片，然后用保守规则重新断段。
策略：
1. 把 M 栏所有碎片用空行拼接成临时文本
2. 在句末标点后断句
3. 聚合成段：直到遇到明确的新话题标志才断段
"""
import re, io

PATH = r"C:\Users\NewtN\下载\Cahier-main\德语\9月19日讲稿.md"
with io.open(PATH, "r", encoding="utf-8") as f:
    text = f.read()

fm_match = re.match(r'^(---\n.*?\n---\n)', text, re.DOTALL)
frontmatter = fm_match.group(1) if fm_match else ""
body = text[len(frontmatter):] if fm_match else text

folio_pattern = re.compile(r'(<!--folio:[^>]+-->\s*\n)(.*?)(?=<!--folio:|<!--/folio-->|\Z)', re.DOTALL)

def conservative_reflow(m_content):
    """先合并所有碎片成连续文本，再保守断段"""
    # 去掉所有现有换行，合并成一整段
    flat = re.sub(r'\s+', '', m_content)
    # 但保留必要的空格（德语单词之间）
    # 德语单词由空格分隔，中文不需要空格
    # 先恢复德语单词间空格：在大写字母前是小写字母/空格的地方加空格
    # 实际上我们直接在 句末标点 后断句

    # 在 。！？ 后加换行标记
    flat = re.sub(r'([。！？])', r'\1\n', flat)

    # 按换行切句
    sentences = [s.strip() for s in flat.split('\n') if s.strip()]

    # 聚合成段：
    # 新段落开始的标志（保守版）：
    # 1. "第X讲" 开头
    # 2. 德语大写例句开头（Ich/Wir/Der/Die/Das/Wie/Wo/Auf/Guten/Und/Nein/Ja/Es/Er/Sie 等）
    # 3. 词条 der/die/das + 大写名词
    # 4. "注意" "讲解" "例句" "词汇" "语法" "课文" "对话" "复习" "总结"
    # 5. 中文单字序号 + 中文字（但要排除"第一""第二"这种序数词）

    new_para_re = re.compile(
        r'^(第[一二三四五六七八九十\d]+讲'
        r'|(?:Ich|Wir|Der|Die|Das|Ein|Eine|Mein|Meine|Dein|Deine|Ihr|Ihre|Unser|Unsere|Er|Sie|Es|Du|Wer|Wie|Wo|Wann|Warum|Was|Welche|Kannst|Können|Guten|Gute|Hallo|Tschüs|Auf|Und|Nein|Ja|Vorstellung|Entschuldigung|Verzeihung|Angenehm|Moment|Alles|Danke|Bitte|Heißt|Heute|Morgen|Morgens|Jetzt|Dann|Zuerst|Danach|Endlich|Schön|Gut|Sehr|Ganz|Nicht)\b'
        r'|(?:der|die|das|ein|eine|einen|einem|einer)\s+[A-ZÄÖÜ]'
        r'|注意|讲解要点|讲解|例句|词条|词汇Vokabeln|语法Grammatik|课文Text|对话Dialog|复习|总结|补充|谚语)'
    )

    # 真正的小节序号：单字 + 后面紧跟非数字、非"第X"的内容
    # 排除"第一""第二"等
    section_re = re.compile(r'^([一二三四五六七八九十])(?=[\u4e00-\u9fff])')

    paragraphs = []
    current = ""

    for sent in sentences:
        should_break = False
        if current:
            if new_para_re.match(sent):
                should_break = True
            elif section_re.match(sent):
                # 检查不是"第一""第二"等
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

print(f"Done. Original: {len(text)}, New: {len(result)}")
