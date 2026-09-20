# -*- coding: utf-8 -*-
"""验证脚注归位：
1. 统计 folio-footnotes 块数量
2. 统计 <p class="fn"> 数量（应=46条编号脚注+1条作者星号脚注=47）
3. 检查每个 <!--col:R--> 之后到下一个 <!--folio 之间是否有 〔n〕 脚注文字残留
4. 检查所有 〔n〕 脚注文字是否都在 M 栏（即 col:M 与 col:R 之间）
"""
import re, io

PATH = r"C:\Users\NewtN\下载\Cahier-main\文献笔记\从血缘群到公民化：共和国时代安徽农村宗族变迁研究_王朔柏.md"
with io.open(PATH, "r", encoding="utf-8") as f:
    text = f.read()

# 1. 统计 folio-footnotes 块
fn_blocks = re.findall(r'<div class="folio-footnotes">', text)
print(f"folio-footnotes 块数量: {len(fn_blocks)}")

# 2. 统计 <p class="fn"> 数量
fn_items = re.findall(r'<p class="fn">', text)
print(f'<p class="fn"> 条目数量: {len(fn_items)}')

# 3. 检查 R 栏残留：找每个 <!--col:R--> 到下一个 <!--folio 或 EOF 之间的内容
# 模式：<!--col:R-->\n(.*?)(?=<!--folio:|<!--/folio-->|\Z)
r_blocks = re.findall(r'<!--col:R-->\n(.*?)(?=<!--folio:|<!--/folio-->|\Z)', text, re.DOTALL)
print(f"\nR 栏区块数量: {len(r_blocks)}")
residual = 0
for i, rb in enumerate(r_blocks):
    # 检查是否有 〔数字〕 脚注文字
    if re.search(r'〔\d+〕', rb):
        residual += 1
        print(f"  [警告] R栏区块 {i+1} 含脚注文字: {rb[:100]}")
    # 检查是否有 folio-footnotes
    if 'folio-footnotes' in rb:
        residual += 1
        print(f"  [警告] R栏区块 {i+1} 含 folio-footnotes 块!")
    # 检查是否有实质内容（非空、非注释）
    stripped = rb.strip()
    if stripped and not stripped.startswith('<!--'):
        print(f"  [信息] R栏区块 {i+1} 有内容: {stripped[:80]}")

print(f"\nR 栏脚注残留数: {residual}")

# 4. 列出所有脚注编号
fn_numbers = re.findall(r'<p class="fn">([^<]*?〔(\d+)〕)', text)
print(f"\n编号脚注列表:")
for full, num in fn_numbers:
    print(f"  〔{num}〕: {full[:60]}...")

# 5. 检查作者星号脚注
star = re.findall(r'<p class="fn">(\*　[^<]+)', text)
print(f"\n作者星号脚注: {len(star)} 条")
if star:
    print(f"  {star[0][:80]}...")

# 6. 统计正文上标引用
refs = re.findall(r'<sup class="fn-ref">〔(\d+)〕</sup>', text)
print(f"\n正文上标引用数量: {len(refs)}")
print(f"引用编号: {refs}")
