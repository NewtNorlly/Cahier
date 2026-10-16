# -*- coding: utf-8 -*-
import sys, os, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_notes_1017 import get_lines

ls = get_lines(r"C:\Users\NewtN\Desktop\课程讲稿\英语\10月1日影音跟读.pdf")

en_num = re.compile(r"^(\d+)\s+(.*)$")
en, zh, other = [], [], []
for l in ls:
    t = l["text"].strip()
    if l["size"] >= 19.0 or "Pollykann" in t:
        other.append(l)
        continue
    if re.match(r"^\d+\s", t) and not re.search(r"[一-鿿]", t):
        en.append(l)
    elif l["size"] >= 10.0 and l["size"] <= 10.9:
        zh.append(l)
    elif l["size"] >= 11.0:
        en.append(("wrap", l))
    else:
        other.append(l)

print("EN numbered/wrapped count:", len(en), "ZH count:", len(zh))
nums = [int(re.match(r"^(\d+)", l["text"].strip()).group(1)) for l in en if not isinstance(l, tuple)]
print("EN number range:", min(nums), max(nums), "count numbered:", len(nums))
print("missing:", [n for n in range(1, 81) if n not in nums])

# Check zh fragments count per item boundary by visual scan
print("===== lines where ZH is not directly after EN number =====")
prev_en = None
zh_run = 0
seq = []
for l in ls:
    t = l["text"].strip()
    if l["size"] >= 19.0 or "Pollykann" in t:
        continue
    if re.match(r"^\d+\s", t) and not re.search(r"[一-鿿]", t):
        seq.append(("EN", int(re.match(r"^(\d+)", t).group(1))))
    elif l["size"] >= 11.0:
        seq.append(("EW", t[:20]))
    elif l["size"] >= 10.0 and l["size"] <= 10.9:
        seq.append(("ZH", t[:20]))
# print sequence around anomalies (ZH count != 1 between ENs)
from collections import Counter
zh_count = Counter()
cur = None
for kind, val in seq:
    if kind == "EN":
        cur = val
    elif kind == "ZH" and cur:
        zh_count[cur] += 1
print("items with ZH fragment count != 1:", {k: v for k, v in zh_count.items() if v != 1})
print("items with 0 ZH:", [n for n in range(1, 81) if zh_count[n] == 0])
