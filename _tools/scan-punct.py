# -*- coding: utf-8 -*-
"""Scan each PDF for straight quotes / half-width punctuation in CJK context."""
import os, re, fitz
BASE = r"C:\Users\NewtN\Desktop\课程讲稿"
pdfs = [
    r"Python\10月5日讲稿.pdf",
    r"公共经济学\10月16日讲稿.pdf",
    r"决策理论与方法\10月13日讲稿.pdf",
    r"土地资源管理\10月9日讲稿.pdf",
    r"土地资源管理\10月16日讲稿.pdf",
    r"知识产权法基础理伦\10月16日讲稿.pdf",
    r"英语\10月15日讲稿.pdf",
    r"英语\10月1日影音跟读.pdf",
    r"英语\10月9日影音跟读.pdf",
    r"近现代中日关系史\10月13日讲稿.pdf",
]
for rel in pdfs:
    doc = fitz.open(os.path.join(BASE, rel))
    dq = sq = hq = hqhalf = 0
    samples = []
    for page in doc:
        t = page.get_text()
        dq += t.count('"')
        sq += t.count("'")
        for line in t.split('\n'):
            if re.search(r'[一-鿿].*[?！,.;:][\s]*$', line) and re.search(r'[一-鿿]', line):
                pass
            if '"' in line and re.search(r'[一-鿿]', line) and len(samples) < 5:
                samples.append(line.strip()[:60])
    print(f"{rel}: 直双引号 {dq}  直单引号 {sq}")
    for s in samples:
        print("   ", s)
    doc.close()
