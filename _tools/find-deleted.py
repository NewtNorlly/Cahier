# -*- coding: utf-8 -*-
"""找 HEAD->新文本 中被删除（未在邻近增改中重现）的中文片段，长度>=3。"""
import subprocess, sys, io, re, difflib
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
CJK = re.compile(r'[一-鿿㐀-䶿]+')

def cjk_tokens(text):
    # 只保留中文字符串序列
    return CJK.findall(text)

import sys as s
files = sys.argv[1:]
for p in files:
    oldb = subprocess.run(['git','cat-file','blob',f'HEAD:{p}'], capture_output=True).stdout
    if oldb.startswith(b'\xef\xbb\xbf'): oldb = oldb[3:]
    old = oldb.decode('utf-8')
    newb = open(p,'rb').read()
    if newb.startswith(b'\xef\xbb\xbf'): newb = newb[3:]
    new = newb.decode('utf-8')
    # 去掉 markdown/HTML 符号后按字比较
    def chars(t):
        return [c for c in t if '一' <= c <= '鿿' or '㐀' <= c <= '䶿']
    a, b = chars(old), chars(new)
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag in ('delete', 'replace'):
            frag = ''.join(a[i1:i2])
            if len(frag) >= 3:
                ctx_new = ''.join(b[max(0,j1-10):j1+10])
                print(f"[{p}] 删/改片段: 「{frag}」 | 新文邻近: 「{ctx_new}」")
