# -*- coding: utf-8 -*-
"""把所有已修改 md 的 frontmatter 整块还原为 HEAD 版本（正文保留）。"""
import subprocess, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def split_fm(text):
    lines = text.split('\n')
    if lines and lines[0].strip() == '---':
        for i in range(1, len(lines)):
            if lines[i].strip() == '---':
                return lines[:i+1], lines[i+1:]
    return None, None

names = subprocess.run(['git','diff','--name-only','--','*.md'],
                       capture_output=True, text=True, encoding='utf-8').stdout.splitlines()
for p in names:
    oldb = subprocess.run(['git','cat-file','blob',f'HEAD:{p}'],
                          capture_output=True).stdout
    if oldb.startswith(b'\xef\xbb\xbf'):
        oldb = oldb[3:]
    old = oldb.decode('utf-8')
    raw = open(p, 'rb').read()
    bom = b'\xef\xbb\xbf' if raw.startswith(b'\xef\xbb\xbf') else b''
    cur = raw[3:].decode('utf-8') if bom else raw.decode('utf-8')
    crlf = '\r\n' in cur
    old_fm, _ = split_fm(old.replace('\r\n','\n'))
    cur_fm, body = split_fm(cur.replace('\r\n','\n'))
    if old_fm is None or cur_fm is None:
        print('NO-FM', p); continue
    if old_fm != cur_fm:
        new_text = '\n'.join(old_fm + body)
        if crlf:
            new_text = new_text.replace('\n','\r\n')
        open(p,'wb').write(bom + new_text.encode('utf-8'))
        print('RESTORED', p)
