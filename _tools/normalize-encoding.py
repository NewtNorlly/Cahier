# -*- coding: utf-8 -*-
"""把所有已修改 md 的 BOM / 行尾归一化回 HEAD 版本，只保留真实文字改动。"""
import subprocess, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def head_blob(path):
    return subprocess.run(["git", "cat-file", "blob", f"HEAD:{path}"],
                          capture_output=True, check=True).stdout

def detect(b):
    bom = b.startswith(b"\xef\xbb\xbf")
    body = b[3:] if bom else b
    crlf = body.count(b"\r\n")
    lone_lf = body.count(b"\n") - crlf
    cr = body.count(b"\r") - crlf
    if crlf and not lone_lf and not cr:
        eol = b"\r\n"
    elif lone_lf and not crlf:
        eol = b"\n"
    elif not crlf and not lone_lf:
        eol = b"\n"
    else:
        eol = "mixed"
    return bom, eol, crlf, lone_lf, cr

names = subprocess.run(["git","diff","--name-only","--","*.md"],
                       capture_output=True, check=True, text=True, encoding="utf-8").stdout.splitlines()

for p in names:
    old = head_blob(p)
    with open(p, "rb") as f:
        new = f.read()
    ob, oe, oc, ol, ocr = detect(old)
    nb, ne, nc, nl, ncr = detect(new)
    if ne == "mixed":
        print(f"SKIP(mixed new) {p}")
        continue
    body = new[3:] if nb else new
    text_lf = body.replace(b"\r\n", b"\n").replace(b"\r", b"\n")
    target_eol = oe if oe != "mixed" else b"\n"
    out = text_lf.replace(b"\n", target_eol)
    if ob:
        out = b"\xef\xbb\xbf" + out
    if out != new:
        with open(p, "wb") as f:
            f.write(out)
        print(f"NORM {p}: BOM {nb}->{ob} EOL {ne!r}->{target_eol!r}")
    else:
        print(f"ok   {p}")
