# -*- coding: utf-8 -*-
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_notes_1017 import get_lines

ls = get_lines(r"C:\Users\NewtN\Desktop\课程讲稿\英语\10月15日讲稿.pdf")

print("===== 12.3 SimHei|TNR-Bold samples =====")
n = 0
for l in ls:
    if l["size"] == 12.3 and l["font"] == "SimHei|TimesNewRomanPS-BoldMT" and n < 15:
        print(f"p{l['page']+1} x{l['x']} y{l['y']} | {l['text'][:55]}")
        n += 1

print("===== 12.3 SimHei pure samples =====")
n = 0
for l in ls:
    if l["size"] == 12.3 and l["font"] == "SimHei" and n < 15:
        print(f"p{l['page']+1} x{l['x']} y{l['y']} | {l['text'][:55]}")
        n += 1

print("===== 11.4 SimSun|TNR samples =====")
n = 0
for l in ls:
    if l["size"] == 11.4 and l["font"] == "SimSun|TimesNewRomanPSMT" and n < 12:
        print(f"p{l['page']+1} x{l['x']} y{l['y']} | {l['text'][:55]}")
        n += 1

print("===== 11.4 SimSun pure =====")
n = 0
for l in ls:
    if l["size"] == 11.4 and l["font"] == "SimSun" and n < 12:
        print(f"p{l['page']+1} x{l['x']} y{l['y']} | {l['text'][:55]}")
        n += 1
