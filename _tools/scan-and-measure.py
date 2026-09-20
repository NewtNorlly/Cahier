# -*- coding: utf-8 -*-
"""
1. 清除德语9/19讲稿开头的 BOM
2. 全站扫描所有 md 的 L/R 栏有无残段碎片
3. 测量德语9/19讲稿当前段落密度
"""
import re, io, os, glob

ROOT = r'C:\Users\NewtN\下载\Cahier-main'

# 1. 清除德语文件 BOM
p = os.path.join(ROOT, '德语', '9月19日讲稿.md')
with io.open(p, 'r', encoding='utf-8-sig') as f:
    c = f.read()
with io.open(p, 'w', encoding='utf-8', newline='') as f:
    f.write(c)
print(f"Cleared BOM from 9月19日讲稿.md. First 50 chars: {repr(c[:50])}")

# 2. 全站扫描 L/R 栏碎片
print("\n=== Scanning all md files for L/R column fragments ===")
md_files = glob.glob(os.path.join(ROOT, '**', '*.md'), recursive=True)
# Exclude node_modules, .git, _tools
md_files = [f for f in md_files if 'node_modules' not in f and '.git' not in f and '_tools' not in f]

fragments_found = 0
for mf in md_files:
    with io.open(mf, 'r', encoding='utf-8-sig') as f:
        content = f.read()
    # Find L/R column content
    for col_name in ['L', 'R']:
        pattern = rf'<!--col:{col_name}-->(.*?)(?:<!--col:M-->|<!--/folio-->)'
        matches = re.finditer(pattern, content, re.DOTALL)
        for m in matches:
            col_content = m.group(1).strip()
            if col_content and len(col_content) < 200:
                rel = os.path.relpath(mf, ROOT)
                print(f"  {rel}: {col_name}-column fragment: [{col_content[:100]}]")
                fragments_found += 1
            elif col_content:
                rel = os.path.relpath(mf, ROOT)
                print(f"  {rel}: {col_name}-column content ({len(col_content)} chars)")
                fragments_found += 1

print(f"\nTotal L/R fragments found: {fragments_found}")

# 3. 测量德语9/19讲稿段落密度
print("\n=== Paragraph density metrics ===")
with io.open(p, 'r', encoding='utf-8') as f:
    c = f.read()

# Extract M content from all folio pages
folios = re.finditer(r'(?s)<!--col:M-->(.*?)<!--col:R-->', c)
all_paras = []
for m in folios:
    m_content = m.group(1).strip()
    paras = [p.strip() for p in m_content.split('\n\n') if p.strip()]
    all_paras.extend(paras)

if all_paras:
    lengths = [len(p) for p in all_paras]
    avg = sum(lengths) / len(lengths)
    mx = max(lengths)
    over320 = sum(1 for l in lengths if l > 320)
    print(f"  Total paragraphs: {len(all_paras)}")
    print(f"  Average length: {avg:.0f} chars")
    print(f"  Max length: {mx} chars")
    print(f"  Paragraphs >320 chars: {over320}")
    # Show the longest 5
    sorted_paras = sorted(enumerate(all_paras), key=lambda x: len(x[1]), reverse=True)
    print(f"\n  Top 5 longest paragraphs:")
    for idx, (pi, p) in enumerate(sorted_paras[:5]):
        print(f"    #{pi+1} ({len(p)} chars): {p[:80]}...")
