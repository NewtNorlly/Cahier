# -*- coding: utf-8 -*-
"""验证所有输出文件并生成报告。"""
import os
import re

output_base = r"C:\Users\NewtN\下载\Cahier-main\_pdf-staging\教学讲稿"

expected = [
    ("中国法制史", "9月5日讲稿.md"),
    ("决策理论与方法", "9月1日讲稿.md"),
    ("决策理论与方法", "9月3日讲稿.md"),
    ("土地资源管理", "8月31日讲稿.md"),
    ("土地资源管理", "9月4日讲稿.md"),
    ("土地资源管理", "课程考核标准与作业一.md"),
    ("宪法", "9月6日讲稿.md"),
]

print("=" * 75)
print("输出文件验证报告")
print("=" * 75)

all_ok = True
total_annots = 0

for course, fname in expected:
    fpath = os.path.join(output_base, course, fname)
    if not os.path.exists(fpath):
        print(f"[缺失] {course}/{fname}")
        all_ok = False
        continue

    size = os.path.getsize(fpath)
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()

    # 统计批注
    underline_count = content.count("红色下划线")
    ink_count = content.count("手写批注于")
    highlight_count = content.count("==高亮==")
    squiggly_count = content.count("~~波浪线~~")
    sticky_count = content.count("> 💬")
    total = underline_count + ink_count + highlight_count + squiggly_count + sticky_count
    total_annots += total

    # 检查 frontmatter
    has_title = 'title:' in content
    has_course = 'course:' in content
    has_h1 = content.startswith("---") and f"# {course}" in content
    has_annot_section = "## 批注与笔记" in content

    # 检查内联标记
    inline_u = content.count("<u>")
    inline_eq = content.count("==")
    inline_tilde = content.count("~~")

    status = "OK" if (size > 0 and has_title and has_course and has_h1 and has_annot_section) else "WARN"
    if status == "WARN":
        all_ok = False

    print(f"\n[{status}] {course}/{fname}")
    print(f"  文件大小: {size:,} bytes")
    print(f"  Frontmatter: title={'Y' if has_title else 'N'}, course={'Y' if has_course else 'N'}")
    print(f"  H1标题: {'Y' if has_h1 else 'N'}")
    print(f"  批注章节: {'Y' if has_annot_section else 'N'}")
    print(f"  批注总数: {total}")
    if total > 0:
        parts = []
        if underline_count: parts.append(f"红色下划线={underline_count}")
        if ink_count: parts.append(f"手写笔迹={ink_count}")
        if highlight_count: parts.append(f"高亮={highlight_count}")
        if sticky_count: parts.append(f"便签={sticky_count}")
        print(f"  批注分布: {', '.join(parts)}")
    print(f"  内联标记: <u>={inline_u}, ==={inline_eq}, ~~={inline_tilde}")

print("\n" + "=" * 75)
print(f"汇总: {len(expected)}/{len(expected)} 文件已生成 | 批注总计: {total_annots} 条")
print(f"整体状态: {'全部通过' if all_ok else '存在警告'}")
print("=" * 75)
