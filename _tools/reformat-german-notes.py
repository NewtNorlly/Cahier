# -*- coding: utf-8 -*-
"""
把德语9月19日讲稿的密排 M 栏文字智能断段为自然段落。
规则：
- 保留 folio/col 结构
- 每页 M 栏内，按自然语义断点分成多个 <p> 段落
- 断点：新德语例句开头、注意/讲解要点、词条开头、序号小节、话题转换
- L/R 空标记
- 不删改任何文字
"""
import re, io

PATH = r"C:\Users\NewtN\下载\Cahier-main\德语\9月19日讲稿.md"
with io.open(PATH, "r", encoding="utf-8") as f:
    text = f.read()

# 把文件按 folio 页拆分
# 结构：frontmatter + 多个 folio 块
# 我们逐页处理 M 栏内容

# 先把 frontmatter 摘出来
fm_match = re.match(r'^(---\n.*?\n---\n)', text, re.DOTALL)
frontmatter = fm_match.group(1) if fm_match else ""
body = text[len(frontmatter):] if fm_match else text

# 按 folio 页切分
folio_pattern = re.compile(r'(<!--folio:[^>]+-->\s*\n)(.*?)(?=<!--folio:|<!--/folio-->|\Z)', re.DOTALL)

def split_into_paragraphs(m_content):
    """把一页 M 栏的密排文字断成自然段落。"""
    # 先去掉首尾空白
    m_content = m_content.strip()
    if not m_content:
        return ""

    # 按句号/问号/感叹号切句，但保留标点
    # 先按中文句末标点切分
    # 我们在句末标点后断句，然后把句子聚合成段

    # 用正则把文本分成句子（保留标点）
    sentences = re.split(r'(?<=[。！？])', m_content)
    sentences = [s.strip() for s in sentences if s.strip()]

    if not sentences:
        return m_content

    # 段落聚合规则：
    # 新段落开头标志：
    # 1. 以德语大写开头的例句（Mein/Ich/Der/Die/Das/Wir/Er/Wie/Guten/Auf/Und/Nein/Ja/Es/Wo/Wann/Warum/Kannst/Heute/Morgen/Tag/Hallo/Tschüs/Vorstellung/Entschuldigung/Verzeihung/Angenehm/Moment/Alles/Danke/Bitte/Auf 等）
    # 2. "注意" 开头
    # 3. "讲解" 开头
    # 4. 词条（der/die/das + 空格 + 名词）
    # 5. 中文序号 一/二/三/四/五/六/七/八/九/十 + 非digit
    # 6. "第X讲" 开头
    # 7. "例句" 开头

    new_para_starters = [
        r'^(Ich|Wir|Der|Die|Das|Ein|Eine|Mein|Meine|Dein|Deine|Ihr|Ihre|Unser|Unsere)',
        r'^(Wie|Wo|Wann|Warum|Wer|Was|Welche|Kannst|Können|Möchten|Möchtest|Heißt|Heißt)',
        r'^(Guten|Gute|Tag|Hallo|Tschüs|Auf|Und|Nein|Ja|Es|Vorstellung|Entschuldigung|Verzeihung|Angenehm|Moment|Alles|Danke|Bitte|Schön|Gut|Sehr|Ganz|Nicht|Doch|Eben|Ach|Na|Oh)',
        r'^(Heute|Morgen|Morgens|Abend|Nachts|Jetzt|Später|Dann|Endlich|Zuerst|Danach|Schließlich|Außerdem|Allerdings)',
        r'^(der |die |das |ein |eine |einen |einem |einer |des |dem |den |zu |aus |nach |in |an |mit |von |bei |seit |auf |für |ohne |um |gegen |über |unter |vor |zwischen )',
        r'^(注意|讲解|例句|词条|词汇|语法|课文|对话|复习|总结|补充|还有|另外|好的|好了|然后|那我们|那么|所以|但是|因为|如果|虽然|不过|其实|当然|显然|总之|最后|首先|其次|再次|接着|现在|这里|下面|上面|前面|后面)',
        r'^[一二三四五六七八九十]+[、．.]',
        r'^第[一二三四五六七八九十\d]+[讲章节部分]',
        r'^[（(]?[一二三四五六七八九十\d]+[）)]',
    ]
    pattern = re.compile('|'.join(new_para_starters))

    paragraphs = []
    current_para = sentences[0]

    for sent in sentences[1:]:
        # 检查这句话是否应该另起一段
        if pattern.match(sent):
            paragraphs.append(current_para)
            current_para = sent
        else:
            current_para += sent

    paragraphs.append(current_para)

    # 用空行连接段落
    return '\n\n'.join(paragraphs)


# 处理每个 folio 块
def process_folio(match):
    header = match.group(1)
    body_content = match.group(2)

    # 在 body_content 中找 col:L, col:M, col:R
    # 结构：<!--col:L-->\n[L内容]\n<!--col:M-->\n[M内容]\n<!--col:R-->\n[R内容]
    col_match = re.match(
        r'(<!--col:L-->\s*\n)(.*?)(<!--col:M-->\s*\n)(.*?)(<!--col:R-->\s*\n)(.*?)$',
        body_content, re.DOTALL
    )
    if not col_match:
        return match.group(0)

    l_marker = col_match.group(1)
    l_content = col_match.group(2).strip()
    m_marker = col_match.group(3)
    m_content = col_match.group(4)
    r_marker = col_match.group(5)
    r_content = col_match.group(6).strip()

    # L/R 留空（铁律12：无个人笔记就空标记）
    # M 栏断段
    new_m = split_into_paragraphs(m_content)

    # 重建：col:L 空, col:M 断段后内容, col:R 空
    result = header + l_marker + "\n" + m_marker + "\n" + new_m + "\n" + r_marker + "\n"
    return result

new_body = folio_pattern.sub(process_folio, body)

# 组合
result = frontmatter + new_body

# 写回
with io.open(PATH, "w", encoding="utf-8", newline="") as f:
    f.write(result)

print(f"Done. Original: {len(text)}, New: {len(result)}")
