# -*- coding: utf-8 -*-
"""英语《9月21日讲稿》docx -> 三栏 folio md（单 folio、空 L/R，交插件流动分页）。

分类规则（只加 Markdown 标记，不改正文一字）：
- 段0 文档大标题 -> 加粗段
- 「一、…十五、…」词群标题 -> ###
- 「复盘一　…」~「复盘五　…」 -> ###
- 「词条　释义」（单个小写拉丁词 + 全角空格开头）-> ####
- 三处行内小标签（课堂延伸/课堂提醒/例句引导）-> 加粗段
- 其余 -> 普通段落
"""
import re
import zipfile
import xml.etree.ElementTree as ET

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
SRC = r"C:\Users\NewtN\Desktop\课程讲稿\英语\9月21日讲稿.docx"
OUT = r"C:\Users\NewtN\下载\Cahier-main\英语\9月21日讲稿.md"

def docx_paragraphs(path):
    z = zipfile.ZipFile(path)
    root = ET.fromstring(z.read('word/document.xml'))
    out = []
    for p in root.iter(W + 'p'):
        out.append(''.join((t.text or '') for t in p.iter(W + 't')))
    return [t for t in out if t.strip()]

GROUP_RE = re.compile(r'^[一二三四五六七八九十]+、')
REVIEW_RE = re.compile(r'^复盘[一二三四五]　')
ENTRY_RE = re.compile(r'^[a-z]+　')
BOLD_LABELS = {
    '课堂延伸：老师谈减肥与习惯（这一段不是词汇，是老师顺着 portable 讲的）',
    '课堂提醒（老师的原话，用来督促复盘）',
    '课上出现过的例句，抄一遍：',
}

def classify(paras):
    rows = []
    in_review = False  # 进入「复盘」段落后，word　钩子句不再是词条标题
    for i, t in enumerate(paras):
        if i == 0:
            kind = 'title'
        elif GROUP_RE.match(t):
            kind = 'h3'
        elif REVIEW_RE.match(t):
            kind = 'h3'
            in_review = True
        elif (not in_review) and ENTRY_RE.match(t):
            kind = 'h4'
        elif t in BOLD_LABELS:
            kind = 'bold'
        else:
            kind = 'p'
        rows.append((kind, t))
    return rows

def build(rows):
    body = []
    for kind, t in rows:
        if kind == 'title':
            body.append(f'**{t}**')
        elif kind == 'h3':
            body.append(f'### {t}')
        elif kind == 'h4':
            body.append(f'#### {t}')
        elif kind == 'bold':
            body.append(f'**{t}**')
        else:
            body.append(t)
        body.append('')  # 块间空行
    return '\n'.join(body).rstrip() + '\n'

FRONT = '''---
doc_type: "lecture"
title: "9月21日讲稿"
course: "英语"
date: "2026-09-21"
description: "刘老师疾病主题词汇联想记忆法课堂笔记。十五组词：诊断诊所（diagnose、clinic、consult）、慢性 chronic/chronicle、良性 benevolent/wholesome、恶意一家 malice/malicious/malignant、传染 contagious、急性致命 acute/fatal/severe、终点 terminal/terminator/terminate、毁灭阶梯 perish/destroy/destructive/devastate、治疗 remedy/therapy、手术与医生 surgery/surgical/surgeon/physician/doctor、药 medication/tablet/pill、便携 portable、营救治愈 rescue/cure、模糊 obscure/vague、安全连续 secure/security/consecutive；逐词记录谐音、拆词、画面联想、例句与老师随谈，末附五部分盘（三条记忆思路、近义等式、词根前缀、谐音速查、全词清单）与课内例句。"
cover: "./covers/english-960.webp"
---

<!--folio:第1页-->

<!--col:L-->

<!--col:M-->

'''

def main():
    paras = docx_paragraphs(SRC)
    rows = classify(paras)

    # 干跑报告
    from collections import Counter
    c = Counter(k for k, _ in rows)
    print('段落分类统计:', dict(c))
    print('---- h3/h4 清单 ----')
    for k, t in rows:
        if k in ('h3', 'h4'):
            print(k, t[:70])

    md_body = build(rows)
    md = FRONT + md_body + '\n<!--col:R-->\n\n<!--/folio-->\n'
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        f.write(md)

    # 守恒校验：剥掉 markdown 前缀后必须与 docx 段落逐行全等
    stripped = []
    for line in md_body.splitlines():
        if not line.strip():
            continue
        s = line
        for pre in ('### ', '#### '):
            if s.startswith(pre):
                s = s[len(pre):]
        if s.startswith('**') and s.endswith('**'):
            s = s[2:-2]
        stripped.append(s)
    assert len(stripped) == len(paras), f'行数不符 {len(stripped)} vs {len(paras)}'
    bad = [i for i, (a, b) in enumerate(zip(stripped, paras)) if a != b]
    if bad:
        for i in bad[:10]:
            print('MISMATCH', i, repr(stripped[i]), repr(paras[i]))
        raise SystemExit('守恒校验失败')
    print(f'守恒校验通过：{len(paras)} 段逐行全等')

if __name__ == '__main__':
    main()
