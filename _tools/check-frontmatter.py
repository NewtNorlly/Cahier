# -*- coding: utf-8 -*-
import io, sys, subprocess
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
names = subprocess.run(['git','diff','--name-only','--','*.md'],
                       capture_output=True, text=True, encoding='utf-8').stdout.splitlines()
bad = []
for p in names:
    raw = open(p, 'rb').read()
    if raw.startswith(b'\xef\xbb\xbf'):
        raw = raw[3:]
    lines = raw.decode('utf-8').splitlines()
    if lines and lines[0].strip() == '---':
        end = next((i for i in range(1, len(lines)) if lines[i].strip() == '---'), len(lines))
        fm = '\n'.join(lines[1:end])
        if any(c in fm for c in '“”‘’'):
            bad.append(p)
for p in bad:
    print(p)
print('共', len(bad), '个文件frontmatter含弯引号')
