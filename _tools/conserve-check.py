# -*- coding: utf-8 -*-
"""汉字/字母数字守恒检查：HEAD vs 工作区，只统计 CJK 表意文字与字母数字。"""
import subprocess, sys, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
CJK = re.compile(r'[一-鿿㐀-䶿]')
ALNUM = re.compile(r'[A-Za-z0-9]')

def counts(text):
    return len(CJK.findall(text)), len(ALNUM.findall(text))

names = subprocess.run(['git','diff','--name-only','--','*.md'],
                       capture_output=True, text=True, encoding='utf-8').stdout.splitlines()
flag = 0
for p in names:
    oldb = subprocess.run(['git','cat-file','blob',f'HEAD:{p}'],
                          capture_output=True).stdout
    if oldb.startswith(b'\xef\xbb\xbf'): oldb = oldb[3:]
    old = oldb.decode('utf-8')
    newb = open(p,'rb').read()
    if newb.startswith(b'\xef\xbb\xbf'): newb = newb[3:]
    new = newb.decode('utf-8')
    oc, oa = counts(old); nc, na = counts(new)
    dc, da = nc-oc, na-oa
    mark = ''
    if abs(dc) > 15 or abs(da) > 15:
        mark = '  <<<< 检查'; flag += 1
    print(f"{p}: 汉字 {oc}->{nc} ({dc:+d})  字母数字 {oa}->{na} ({da:+d}){mark}")
print('需人工核查文件数:', flag)
