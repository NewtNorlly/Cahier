# -*- coding: utf-8 -*-
import sys, os, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_notes_1017 import get_lines

ls = get_lines(r"C:\Users\NewtN\Desktop\课程讲稿\英语\10月15日讲稿.pdf")
# skip TOC page 1
ls = [l for l in ls if l["page"] != 1]

# Cases: x73 line ending with sentence punctuation followed by another x73 line
print("===== x73 sentence-end followed by x73 (same page) =====")
cnt = 0
for i in range(1, len(ls)):
    a, b = ls[i - 1], ls[i]
    if a["x"] == 73 and b["x"] == 73 and a["page"] == b["page"]:
        if re.search(r"[。！？….”’\.!?]\s*$", a["text"].strip()) and not b["font"].startswith("SimHei"):
            cnt += 1
            if cnt <= 25:
                print(f"p{a['page']+1} {a['size']} | {a['text'].strip()[-30:]}  >>>  {b['text'].strip()[:40]}")
print("total:", cnt)
