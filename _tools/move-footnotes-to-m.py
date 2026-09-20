# -*- coding: utf-8 -*-
"""
把《从血缘群到公民化》md 中错放在 col:R 之后的 folio-footnotes 块
迁移到 col:M 末尾（即 col:R 之前），并把脚注 <p> 改为 <p class="fn">。
文字一条不丢不改，只动位置和标签属性。
"""
import re, sys, io

PATH = r"C:\Users\NewtN\下载\Cahier-main\文献笔记\从血缘群到公民化：共和国时代安徽农村宗族变迁研究_王朔柏.md"

with io.open(PATH, "r", encoding="utf-8-sig") as f:
    text = f.read()

# 保留 BOM 与否：原文件用 utf-8-sig 读，写回时统一 utf-8（无 BOM），
# 但手册要求保留原 BOM。先检测原文件是否有 BOM。
with open(PATH, "rb") as f:
    raw = f.read()
has_bom = raw.startswith(b"\xef\xbb\xbf")

# 按 folio 页切分。每页结构：
#   <!--folio:第N页-->
#   <!--col:L-->
#   <!--col:M-->
#   ...M 内容...
#   <!--col:R-->
#   [可能的 folio-footnotes 块]
#   [可能的空行]
#   <!--folio:第N+1页--> 或 EOF
#
# 我们要做的：把 col:R 之后、下一个 folio 之前的 <div class="folio-footnotes">...</div>
# 整块搬到 col:R 之前（即 M 末尾），并把块内 <p> 改为 <p class="fn">。

# 正则：匹配 <!--col:R--> 之后到下一个 <!--folio 或文件末尾之间的内容
# 用 DOTALL 让 . 匹配换行
# 模式：<!--col:R-->\n(.*?)(?=<!--folio:|<!--/folio-->|\Z)
pattern = re.compile(
    r'<!--col:R-->\n(.*?)(?=<!--folio:|<!--/folio-->|\Z)',
    re.DOTALL
)

def transform_r_block(m):
    r_content = m.group(1)
    # 检查这个 R 区块里有没有 folio-footnotes
    fn_match = re.search(
        r'(\s*<div class="folio-footnotes">.*?</div>\s*\n?)',
        r_content, re.DOTALL
    )
    if not fn_match:
        # 没有脚注块，原样返回（R 栏留空）
        return '<!--col:R-->\n' + r_content

    footnote_block = fn_match.group(1)
    # 把块内的 <p> 改为 <p class="fn">，但不要重复加 class
    # 块内形如：<div class="folio-footnotes">\n<p>...</p>\n<p>...</p>\n</div>
    def fix_p(mm):
        inner = mm.group(1)
        # 把 <p> 替换为 <p class="fn">，但如果已经有 class 就不动
        inner = re.sub(r'<p>(?!\s*class=)', '<p class="fn">', inner)
        return '<div class="folio-footnotes">' + inner + '</div>'

    fixed_block = re.sub(
        r'<div class="folio-footnotes">(.*?)</div>',
        fix_p, footnote_block, flags=re.DOTALL
    )

    # 从 R 内容中移除脚注块
    remaining_r = r_content.replace(fn_match.group(1), '')
    # 清理多余空行
    remaining_r = remaining_r.strip('\n')

    # 组装：M 末尾追加脚注块，然后空的 col:R
    result = fixed_block.rstrip('\n') + '\n\n<!--col:R-->\n'
    if remaining_r:
        result += remaining_r + '\n'
    return result

new_text = pattern.sub(transform_r_block, text)

# 写回
out_path = PATH
if has_bom:
    with io.open(out_path, "w", encoding="utf-8-sig", newline="") as f:
        f.write(new_text)
else:
    with io.open(out_path, "w", encoding="utf-8", newline="") as f:
        f.write(new_text)

print("DONE. has_bom =", has_bom)
print("Original length:", len(text))
print("New length:", len(new_text))
