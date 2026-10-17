# -*- coding: utf-8 -*-
import fitz, os
files = [
    r'C:\Users\NewtN\Desktop\课程讲稿\英语\10月9日影音跟读.pdf',
    r'C:\Users\NewtN\Desktop\课程讲稿\英语\10月1日影音跟读.pdf',
]
for rel in files:
    doc = fitz.open(rel)
    p = doc[0]
    print('=====', os.path.basename(rel))
    for d in p.get_text('dict')['blocks']:
        for l in d.get('lines', []):
            for s in l['spans']:
                t = s['text'].strip()
                if not t:
                    continue
                if s['size'] > 13 or 'mp4' in t or 'srt' in t:
                    print('  size=%.1f font=%r flags=%d bold=%s :: %s' % (
                        s['size'], s['font'], s['flags'], bool(s['flags'] & 16), t[:60]))
    doc.close()
