# -*- coding: utf-8 -*-
"""修复 v5 产生的标记和残词空格"""
import re, io

PATH = r"C:\Users\NewtN\下载\Cahier-main\德语\9月19日讲稿.md"
with io.open(PATH, "r", encoding="utf-8") as f:
    text = f.read()

# 1. 修复 folio/col 标记
text = text.replace("<!--fo lio", "<!--folio")
text = text.replace("-->/fo lio-->", "-->/folio-->")
text = text.replace("<!--col:", "<!--col:")

# 2. 修复已知的残词拆分（大写字母+小写+空格+小写）
# 模式：大写字母开头的词被拆分，如 Präpo sition
# 我们用 PDF 词表反向修复：如果某个"词+空格+词"的组合拼起来是一个已知词，就合并
# 先做手动修复已知问题
fixes = {
    "Präpo sition": "Präposition",
    "fo lio": "folio",
    "Präp osition": "Präposition",
    "Artik el": "Artikel",
    "Sub stantiv": "Substantiv",
    "Adjek tiv": "Adjektiv",
    "Numer ale": "Numerale",
    "Pronom en": "Pronomen",
    "Ad verb": "Adverb",
    "Konjunk tion": "Konjunktion",
    "Interjek tion": "Interjektion",
    "Voka beln": "Vokabeln",
    "Gram matik": "Grammatik",
}
for wrong, right in fixes.items():
    text = text.replace(wrong, right)

# 3. 通用修复：大写词被拆成 大写+小写 + 空格 + 小写
# 如 "Präpo sition" 模式：([A-ZÄÖÜ][a-zäöüß]+)\s+([a-zäöüß]+)
# 但只修复当合并后是已知德语词时
# 先加载 PDF 词表
with io.open(r"C:\Users\NewtN\下载\Cahier-main\_tools\german-pdf-text.txt", "r", encoding="utf-8") as f:
    pdf_text = f.read()
german_words = set(re.findall(r'[a-zA-ZäöüÄÖÜß]+', pdf_text))

def fix_split_word(m):
    combined = m.group(1) + m.group(2)
    if combined in german_words or combined.lower() in {w.lower() for w in german_words}:
        return combined
    return m.group(0)

# 修复：大写词+空格+小写词 → 如果合并是已知词
text = re.sub(r'([A-ZÄÖÜ][a-zäöüß]+)\s+([a-zäöüß]{2,})', fix_split_word, text)

# 4. 清理多余空行（保留 folio 标记间的结构）
# 在 M 栏内，把 3+ 连续空行压缩为 2
text = re.sub(r'\n{4,}', '\n\n\n', text)

with io.open(PATH, "w", encoding="utf-8", newline="") as f:
    f.write(text)

print(f"Fixed. Size: {len(text)}")
