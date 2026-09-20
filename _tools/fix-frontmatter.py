# -*- coding: utf-8 -*-
import io

p = r'C:\Users\NewtN\下载\Cahier-main\德语\9月19日讲稿.md'
with io.open(p, 'r', encoding='utf-8') as f:
    c = f.read()

# The file has literal backslash-r-backslash-n inserted by PowerShell
# Fix: replace the literal sequence with actual newlines
bad = 'webp"\\r\\n---\\r\\n'
good = 'webp"\n---\n'
if bad in c:
    c = c.replace(bad, good)
    print("Replaced literal backslash-r-n")
else:
    print("Pattern not found, checking...")
    # Show what's around line 7
    lines = c.split('\n')
    for i in range(min(12, len(lines))):
        print(f"{i+1}: [{lines[i]}]")

with io.open(p, 'w', encoding='utf-8', newline='') as f:
    f.write(c)

# Verify
print("\n--- After fix ---")
lines = c.split('\n')
for i in range(min(12, len(lines))):
    print(f"{i+1}: {lines[i]}")
