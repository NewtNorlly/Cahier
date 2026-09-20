# -*- coding: utf-8 -*-
"""扫描德语9/19讲稿中所有孤立残段碎片，含L/R栏和隐藏字符"""
import re, io

p = r'C:\Users\NewtN\下载\Cahier-main\德语\9月19日讲稿.md'
with io.open(p, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
print("\n=== Scanning all lines for suspicious short fragments ===")
for i, line in enumerate(lines, 1):
    stripped = line.strip()
    # Skip structural markers and empty lines
    if not stripped:
        continue
    if stripped.startswith('<!--'):
        # Check if there's content after the marker
        inner = stripped.replace('<!--', '').replace('-->', '').strip()
        if inner and len(inner) < 30:
            print(f"  Line {i}: MARKER CONTENT: [{stripped}]")
        continue
    # Short non-structural lines (< 10 chars) are suspicious
    if len(stripped) < 10:
        print(f"  Line {i}: SHORT: [{stripped}]")
    # Lines that are just a few latin letters
    if re.match(r'^[a-zA-Z]+$', stripped) and len(stripped) < 8:
        print(f"  Line {i}: LATIN FRAGMENT: [{stripped}]")

print("\n=== Checking L/R column contents ===")
# Find all folio blocks and check L/R content
content = ''.join(lines)
folios = re.finditer(r'(<!--folio:[^>]+-->)(.*?)(?=<!--folio:|<!--/folio-->|\Z)', content, re.DOTALL)
for m in folios:
    header = m.group(1)
    body = m.group(2)
    # Extract L and R column content
    l_match = re.search(r'<!--col:L-->(.*?)<!--col:M-->', body, re.DOTALL)
    r_match = re.search(r'<!--col:R-->(.*?)(?=<!--/folio-->|<!--folio:|\Z)', body, re.DOTALL)
    l_content = l_match.group(1).strip() if l_match else ""
    r_content = r_match.group(1).strip() if r_match else ""
    if l_content:
        print(f"  {header} L-column: [{l_content[:100]}]")
    if r_content:
        print(f"  {header} R-column: [{r_content[:100]}]")

print("\n=== Checking for hidden/zero-width characters ===")
hidden_chars = re.findall(r'[\u200b\u200c\u200d\ufeff\u00a0\u2028\u2029]', content)
print(f"  Hidden characters found: {len(hidden_chars)}")
if hidden_chars:
    # Show context
    for hc in set(hidden_chars):
        count = hidden_chars.count(hc)
        print(f"  U+{ord(hc):04X}: {count} occurrences")
