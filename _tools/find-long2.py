# -*- coding: utf-8 -*-
"""找出 >100 字的段落分布"""
import re, io, sys
def find_long(path, threshold=100):
    with io.open(path, 'r', encoding='utf-8-sig') as f:
        text = f.read()
    folios = re.finditer(r'(?s)<!--col:M-->(.*?)(?:<!--col:R-->|\Z)', text)
    n = 0
    for m in folios:
        m_c = m.group(1).strip()
        paras = [p.strip() for p in m_c.split('\n\n') if p.strip()]
        for p in paras:
            if len(p) > threshold:
                n += 1
                print(f"  [{n}] len={len(p)}: {p[:150]}")
    print(f"\nTotal >{threshold}: {n}")
if __name__ == "__main__":
    find_long(sys.argv[1], int(sys.argv[2]) if len(sys.argv)>2 else 100)
