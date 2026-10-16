# -*- coding: utf-8 -*-
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_notes_1017 import get_lines

ls = get_lines(r"C:\Users\NewtN\Desktop\课程讲稿\英语\10月15日讲稿.pdf")

print("===== consecutive 12.3 SimHei* lines =====")
for i in range(1, len(ls)):
    a, b = ls[i - 1], ls[i]
    if a["size"] == 12.3 and a["font"].startswith("SimHei") and b["size"] == 12.3 and b["font"].startswith("SimHei") and a["page"] == b["page"]:
        print(f"p{a['page']+1} y{a['y']} | {a['text']}  >>>  {b['text']}")

print("===== p142 context (TNR word lines) =====")
for l in ls:
    if l["page"] == 141:
        print(f"x{l['x']} {l['size']} {l['font'][:20]} | {l['text'][:60]}")
