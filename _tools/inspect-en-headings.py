# -*- coding: utf-8 -*-
import sys, os, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_notes_1017 import get_lines

ls = get_lines(r"C:\Users\NewtN\Desktop\课程讲稿\英语\10月15日讲稿.pdf")

# x distribution of 12.3 SimHei* (headings)
print("===== 12.3 SimHei* x distribution =====")
from collections import Counter
cc = Counter()
for l in ls:
    if l["size"] == 12.3 and l["font"].startswith("SimHei"):
        cc[l["x"]] += 1
print(dict(cc))

print("===== 12.3 SimHei* at x!=73 =====")
for l in ls:
    if l["size"] == 12.3 and l["font"].startswith("SimHei") and l["x"] != 73:
        print(f"p{l['page']+1} x{l['x']} y{l['y']} | {l['font']} | {l['text'][:60]}")

print("===== 12.3 TNR pure =====")
for l in ls:
    if l["size"] == 12.3 and l["font"] == "TimesNewRomanPSMT":
        print(f"p{l['page']+1} x{l['x']} y{l['y']} | {l['text'][:80]}")

print("===== long SimHei headings (>28 chars) =====")
for l in ls:
    if l["size"] == 12.3 and l["font"].startswith("SimHei") and len(l["text"]) > 28:
        print(f"p{l['page']+1} x{l['x']} y{l['y']} len{len(l['text'])} | {l['text'][:60]}")

print("===== 13.8/16.4 headings =====")
for l in ls:
    if l["size"] in (13.8, 16.4, 18.5):
        print(f"p{l['page']+1} {l['size']} x{l['x']} | {l['text'][:50]}")

print("===== KaiTi lines =====")
for l in ls:
    if l["font"].startswith("KaiTi"):
        print(f"p{l['page']+1} {l['size']} x{l['x']} y{l['y']} | {l['text'][:70]}")
