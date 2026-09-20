# -*- coding: utf-8 -*-
"""
改进版：把德语讲稿密排文字断成自然段落。
增加更激进的断点：第X讲、单字序号小节、德语例句、词条、注意/讲解等。
"""
import re, io

PATH = r"C:\Users\NewtN\下载\Cahier-main\德语\9月19日讲稿.md"
with io.open(PATH, "r", encoding="utf-8") as f:
    text = f.read()

fm_match = re.match(r'^(---\n.*?\n---\n)', text, re.DOTALL)
frontmatter = fm_match.group(1) if fm_match else ""
body = text[len(frontmatter):] if fm_match else text

# 需要在其前面断段的模式（在文本中搜索并在匹配位置前插入 \n\n）
# 这些是"新话题开始"的标志
break_before_patterns = [
    # 第X讲
    r'第[一二三四五六七八九十\d]+讲',
    # 单字序号小节：一/二/三...后面紧跟非标点的中文字
    r'(?<![0-9])([一二三四五六七八九十])(?=[^\s0-9])(?![、．.])',
    # 德语例句开头（大写开头的德语词，后跟小写字母）
    r'(?<=[。！？\s])(Ich|Wir|Der|Die|Das|Ein|Eine|Mein|Meine|Dein|Deine|Ihr|Ihre|Unser|Unsere|Er|Sie|Es|Du|Ihr|Wer|Wie|Wo|Wann|Warum|Was|Welche|Kannst|Können|Möchten|Möchtest|Heißt|Guten|Gute|Tag|Hallo|Tschüs|Auf|Und|Nein|Ja|Es|Vorstellung|Entschuldigung|Verzeihung|Angenehm|Moment|Alles|Danke|Bitte|Schön|Gut|Sehr|Ganz|Nicht|Doch|Eben|Ach|Na|Oh|Heute|Morgen|Morgens|Abend|Nachts|Jetzt|Später|Dann|Endlich|Zuerst|Danach|Schließlich|Außerdem|Allerdings)\b',
    # 词条：der/die/das 空格 + 大写名词
    r'(?<=[。！？\s])(der|die|das|ein|eine|einen|einem|einer|des|dem|den)\s+[A-ZÄÖÜ]',
    # 注意/讲解/例句/词汇/语法/课文/对话/复习/总结/补充
    r'(?<=[。！？\s])(注意|讲解要点|讲解|例句|词条|词汇|语法|课文|对话|复习|总结|补充|还有|另外|好的|好了|然后|那我们|那么|所以|但是|因为|如果|虽然|不过|其实|当然|显然|总之|最后|首先|其次|再次|接着|现在|这里|下面|上面|前面|后面|一|二|三|四|五|六|七|八|九|十)，',
]

def insert_breaks(m_content):
    """在 M 栏文本中自然断点前插入 \n\n"""
    result = m_content

    # 先按句末标点切句
    # 在 。！？ 后确保有断句
    result = re.sub(r'([。！？])', r'\1\n', result)

    # 现在逐行处理：合并过短的行，在新话题前断段
    lines = result.split('\n')
    lines = [l.strip() for l in lines if l.strip()]

    paragraphs = []
    current = ""

    # 判断一行是否应该另起一段
    def is_new_para(line):
        # 第X讲
        if re.match(r'^第[一二三四五六七八九十\d]+讲', line):
            return True
        # 德语例句开头
        if re.match(r'^(Ich|Wir|Der|Die|Das|Ein|Eine|Mein|Meine|Dein|Deine|Ihr|Ihre|Unser|Unsere|Er|Sie|Es|Du|Wer|Wie|Wo|Wann|Warum|Was|Welche|Kannst|Können|Guten|Gute|Hallo|Tschüs|Auf|Und|Nein|Ja|Vorstellung|Entschuldigung|Verzeihung|Angenehm|Moment|Alles|Danke|Bitte|Schön|Gut|Sehr|Ganz|Nicht|Heute|Morgen|Morgens|Jetzt|Dann|Zuerst|Danach|Endlich|Außerdem|Allerdings|Heißt)\b', line):
            return True
        # 词条
        if re.match(r'^(der|die|das)\s+[A-ZÄÖÜ]', line):
            return True
        # 注意/讲解/例句/词汇/语法/课文/对话/复习/总结
        if re.match(r'^(注意|讲解|例句|词条|词汇|语法|课文|对话|复习|总结|补充|还有|另外|好的|好了|那我们|那么|所以|但是|因为|如果|虽然|不过|其实|当然|显然|总之|最后|首先|其次|再次|接着|现在|这里|下面|上面|前面|后面)', line):
            return True
        # 单字序号小节
        if re.match(r'^[一二三四五六七八九十][^\s0-9]', line) and len(line) > 2:
            return True
        return False

    for line in lines:
        if is_new_para(line) and current:
            paragraphs.append(current)
            current = line
        else:
            if current:
                current += line
            else:
                current = line

    if current:
        paragraphs.append(current)

    return '\n\n'.join(paragraphs)


# 按 folio 页切分
folio_pattern = re.compile(r'(<!--folio:[^>]+-->\s*\n)(.*?)(?=<!--folio:|<!--/folio-->|\Z)', re.DOTALL)

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

    new_m = insert_breaks(m_content)

    return header + l_marker + "\n" + m_marker + "\n" + new_m + "\n" + r_marker + "\n"

new_body = folio_pattern.sub(process_folio, body)
result = frontmatter + new_body

with io.open(PATH, "w", encoding="utf-8", newline="") as f:
    f.write(result)

print(f"Done. Original: {len(text)}, New: {len(result)}")
