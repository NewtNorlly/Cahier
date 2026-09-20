# -*- coding: utf-8 -*-
"""找出 >320 的段落内容"""
import re, io, sys

def find_long(path, threshold=320):
    with io.open(path, 'r', encoding='utf-8-sig') as f:
        text = f.read()
    folios = re.finditer(r'(?s)<!--col:M-->(.*?)(?:<!--col:R-->|\Z)', text)
    n = 0
    for m in folios:
        m_c = m.group(1).strip()
        paras = [p.strip() for p in m_c.split('\n\n') if p.strip()]
        for i, p in enumerate(paras):
            if len(p) > threshold:
                n += 1
                print(f"  [{n}] len={len(p)}: {p[:200]}...")
                print()
    print(f"Total: {n} paragraphs >{threshold}")

if __name__ == "__main__":
    for f in sys.argv[1:]:
        print(f"=== {f} ===")
        find_long(f)
