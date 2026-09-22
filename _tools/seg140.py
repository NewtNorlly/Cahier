# -*- coding: utf-8 -*-
"""140 字怀疑线：共享分段器（只在自然边界拆，join 守恒，HTML 标签安全）。
标签安全策略：切点落在未闭合的行内标签内时，自动在切点闭合、下一段原样重开
（视觉高亮连续），可见文本逐字守恒。"""
import re

HAN_RE = re.compile(r'[㐀-䶿一-鿿豈-﫿]')

def han_len(s: str) -> int:
    return len(HAN_RE.findall(s))

_FINAL = '。！？!?'
_CLOSERS = '”’」』）)】》'
_TAGCLOSE_RE = re.compile(r'(?:</[a-zA-Z][^>]*>)*')
_PAUSE = '，；、'
_CONNECTORS = r'并且|但是|因为|所以|如果|虽然|然后|另外|此外|同时|首先|其次|最后|也就是说|换句话说|其实|实际上|当然|不过|于是|因此|然而'
_INLINE_TAGS = {'span', 'b', 'strong', 'em', 'i', 'u', 'mark', 'a', 'sub', 'sup', 'font', 'label', 'code'}
_TAG_RE = re.compile(r'<(/?)([a-zA-Z][a-zA-Z0-9]*)((?:[^>"\']|"[^"]*"|\'[^\']*\')*)>')

def open_stack(t: str):
    """返回 (未闭合行内标签栈 [(tag, 完整开标签)], 末尾是否有半个标签)。"""
    stack = []
    for m in _TAG_RE.finditer(t):
        closing, tag, attrs = m.group(1), m.group(2).lower(), m.group(3)
        if tag not in _INLINE_TAGS:
            continue
        if closing:
            if stack and stack[-1][0] == tag:
                stack.pop()
        elif not attrs.rstrip().endswith('/'):
            stack.append((tag, m.group(0)))
    half = bool(re.search(r'<[^>]*$', t))
    return stack, half

def _final_parts(para: str):
    parts, buf, i = [], '', 0
    while i < len(para):
        ch = para[i]
        buf += ch
        if ch in _FINAL:
            j = i + 1
            while j < len(para) and para[j] in _CLOSERS:
                buf += para[j]; j += 1
            m = _TAGCLOSE_RE.match(para, j)
            if m:
                buf += m.group(0); j = m.end()
            parts.append(buf); buf = ''
            i = j
        else:
            i += 1
    if buf:
        parts.append(buf)
    return parts

def _latin_context(text: str, idx: int) -> bool:
    return bool(re.match(r'[A-Za-z]', text[max(0, idx-1):idx])) and bool(re.match(r'[A-Za-z]', text[idx+1:idx+2]))

def _tag_safe_to_cut(buf: str) -> bool:
    """细切切点不得落在标签 markup 内部；未闭合行内标签允许切（由 _pack 闭合重开）。"""
    return not open_stack(buf)[1]

def _split_by(part: str, chars: str, latin_safe: bool, limit: int):
    toks = re.split(r'([' + re.escape(chars) + r'])', part)
    pieces, buf, i = [], '', 0
    while i < len(toks):
        if i + 1 < len(toks) and toks[i+1] in chars:
            piece = toks[i] + toks[i+1]; i += 2
        else:
            piece = toks[i]; i += 1
        cut = bool(buf) and han_len(buf + piece) > limit and _tag_safe_to_cut(buf)
        if cut and latin_safe and piece.strip() in (',', ';'):
            cut = _latin_context(buf + piece, len(buf + piece.rstrip()) - 1)
        if cut:
            pieces.append(buf); buf = piece
        else:
            buf += piece
    if buf:
        pieces.append(buf)
    return pieces

def _split_connectors(part: str, limit: int):
    toks = re.split(r'(' + _CONNECTORS + r')', part)
    pieces, buf = [], ''
    for k, tok in enumerate(toks):
        nxt = toks[k+1] if k+1 < len(toks) else ''
        if (buf and tok and re.fullmatch(_CONNECTORS, tok) and _tag_safe_to_cut(buf)
                and han_len(buf) > limit * 0.55
                and han_len(buf) + han_len(tok) + han_len(nxt) > limit):
            pieces.append(buf); buf = tok
        else:
            buf += tok
    if buf:
        pieces.append(buf)
    return pieces

def _cut(buf: str):
    """在 buf 末尾切点处理未闭合标签：返回 (闭合后的段尾, 下一段开头重开标签)。"""
    stack, half = open_stack(buf)
    if half or not stack:
        return buf, ''
    closes = ''.join('</%s>' % t for t, _ in reversed(stack))
    opens = ''.join(full for _, full in stack)
    return buf + closes, opens

def _pack(parts, limit: int):
    chunks, buf = [], ''
    for p in parts:
        if buf and han_len(buf) + han_len(p) > limit:
            tail, reopen = _cut(buf)
            if reopen == '' and not open_stack(buf)[1]:
                chunks.append(tail); buf = ''
            elif reopen:
                chunks.append(tail); buf = reopen
        buf += p
        if han_len(buf) > limit:
            tail, reopen = _cut(buf)
            if tail != buf or reopen:
                chunks.append(tail); buf = reopen
    if buf:
        chunks.append(buf)
    return chunks

def split_long(para: str, limit: int = 140):
    """>140 汉字段落按自然边界拆分；可见文本 ''.join 守恒（跨标签切点会复制标签）。
    无任何自然断点时返回的单块可能仍 >140，由调用方列报。"""
    if han_len(para) <= limit:
        return [para]
    parts = []
    for sent in _final_parts(para):
        if han_len(sent) <= limit:
            parts.append(sent)
            continue
        subs = _split_by(sent, _PAUSE + (',;'), True, limit)
        for s in subs:
            if han_len(s) <= limit:
                parts.append(s)
            else:
                parts.extend(_split_connectors(s, limit))
    merged = _pack(parts, limit)
    # 守恒校验：剥掉 HTML 标签与空白后逐字相等
    norm = lambda x: re.sub(r'\s+', '', re.sub(r'<[^>]+>', '', x))
    assert norm(''.join(merged)) == norm(para), 'split conservation broken'
    return merged
