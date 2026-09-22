# -*- coding: utf-8 -*-
"""
超长段终结者（140 字怀疑线版，现行规则见《智能体操作手册》§2.6）。

- 怀疑线：一个代码行上的中文正文超过 140 个汉字（只数汉字，不含标点、空白、西文、标签）即判超长。
- 只在自然边界拆，断点优先级：句末标点（。！？!?，尾随引号/闭合标签留在句尾）
  → 中文逗号/分号/顿号（，；、）→ 英文 , ;（仅两侧均为西文）→ 连接词前（并且/但是/因为……）
  → 贪心打包；无任何自然断点的段落原样保留并由扫描器列报，绝不硬切。
- 逐字守恒：拆分只增段落边界，剥掉 HTML 标签与空白后逐字相等，守恒失败则该文件不写。
- folio 感知：M/L/R 三栏同等处理；frontmatter、<!--folio/col/band--> 标记、代码/公式块、
  表格、HTML 块、标题一律不拆；📌 式原文引用不在本站，列表条目逐行评估。
- 依赖同目录 seg140.py（唯一分段实现）。用法：
    python split-long-paras.py            # 全课程 dry-run 扫描
    python split-long-paras.py --write    # 实际改写
    python split-long-paras.py --write path/to.md ...
改写后请运行 normalize-encoding.py 归一 BOM/行尾。
"""
import io, os, re, sys, glob

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from seg140 import han_len, split_long

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COURSES = ['中国法制史','会计','公共经济学','决策理论与方法','土地资源管理','宪法','德语','批判性思维',
           '民事诉讼法','法语','知识产权法基础理论','社会保障学','网络工程师','网络技术','脑图集','英语']


def is_marker_line(l):
    return bool(re.fullmatch(r'\s*<!--.*?-->\s*', l))


def line_kind(l):
    s = l.strip()
    if re.match(r'^#{1,6}\s', s): return 'h'
    if re.match(r'^\s*(?:[-*+]|\d+[.)])\s', l): return 'l'
    if s.startswith('>'): return 'q'
    return 'p'


def split_quote_lines(lines):
    out = []
    for l in lines:
        m = re.match(r'^((?:>\s*)+)(.*)$', l)
        if not m:
            out.append(l); continue
        prefix, text = m.group(1), m.group(2)
        if han_len(text) <= 140:
            out.append(l.rstrip()); continue
        chunks = split_long(text)
        out.append(prefix.rstrip() + ' ' + chunks[0].strip())
        for c in chunks[1:]:
            out.append('')
            out.append(prefix.rstrip() + ' ' + c.strip())
    return out


def split_long_item(l):
    m = re.match(r'^(\s*)([-*+]|\d+[.)])(\s+)(.*)$', l)
    ind, mark, sp, txt = m.groups()
    chunks = split_long(txt)
    cont = ' ' * (len(ind) + len(mark) + len(sp))
    out = [f'{ind}{mark}{sp}{chunks[0].strip()}']
    for c in chunks[1:]:
        out.append('')
        out.append(cont + c.strip())
    return out


def split_mixed_block(lines):
    expanded = []
    for l in lines:
        if not l.strip():
            continue
        kind = line_kind(l)
        if kind == 'l' and han_len(l) > 140:
            expanded.extend(split_long_item(l))
        elif kind == 'p' and han_len(l.strip()) > 140:
            indent = re.match(r'^\s*', l).group(0)
            chunks = split_long(l.strip())
            for i, c in enumerate(chunks):
                expanded.append(indent + c.strip())
                if i < len(chunks) - 1:
                    expanded.append('')
        else:
            expanded.append(l.rstrip())
    out, prev_kind = [], None
    for l in expanded:
        if l == '':
            if out and out[-1] != '':
                out.append('')
            prev_kind = None
            continue
        k = line_kind(l)
        if out and out[-1] != '' and (prev_kind in ('h', 'p', 'q') or k in ('h', 'p', 'q')):
            out.append('')
        out.append(l)
        prev_kind = k
    return out


def split_list_lines(lines):
    out = []
    for l in lines:
        out.extend(split_long_item(l) if han_len(l) > 140 else [l.rstrip()])
    return out


def transform_body(body):
    lines = body.split('\n')
    items, buf, in_fence = [], [], False

    def flush():
        if buf:
            items.append(('block', list(buf))); buf.clear()

    for l in lines:
        s = l.strip()
        if s.startswith('```'):
            buf.append(l); in_fence = not in_fence; continue
        if in_fence:
            buf.append(l); continue
        if is_marker_line(l):
            flush(); items.append(('marker', l)); continue
        if s == '':
            flush(); items.append(('blank', '')); continue
        buf.append(l)
    flush()

    out_items = []
    for kind, payload in items:
        if kind != 'block':
            out_items.append((kind, payload)); continue
        blines = payload
        if any(l.strip().startswith('```') for l in blines):
            out_items.append(('block', blines)); continue
        nonempty = [l for l in blines if l.strip()]
        if any('$$' in l for l in blines):
            out_items.append(('block', blines)); continue
        if all(l.strip().startswith('|') for l in nonempty):
            out_items.append(('block', blines)); continue
        if all(l.strip().startswith('#') for l in nonempty):
            out_items.append(('block', blines)); continue
        if all(re.fullmatch(r'\s*<[^>]+>(?:[^<]*</[a-zA-Z]+>)?\s*', l) or
               re.fullmatch(r'\s*(?:<[^>]+>)+', l) for l in nonempty):
            out_items.append(('block', blines)); continue
        if all(l.strip().startswith('>') for l in nonempty):
            out_items.append(('block', split_quote_lines(blines))); continue
        if all(re.match(r'\s*(?:[-*+]|\d+[.)])\s', l) for l in nonempty):
            out_items.append(('block', split_list_lines(blines))); continue
        out_items.append(('block', split_mixed_block(blines)))

    out = []
    for kind, payload in out_items:
        if kind == 'marker':
            if out and out[-1] != '':
                out.append('')
            out.append(payload); out.append('')
        elif kind == 'blank':
            if out and out[-1] != '':
                out.append('')
        else:
            if out and out[-1] != '':
                out.append('')
            out.extend(payload)
    final = []
    for l in out:
        if l == '' and final and final[-1] == '':
            continue
        final.append(l)
    return '\n'.join(final).strip('\n') + '\n'


def residual_scan(text):
    bad, in_fence = 0, False
    for blk in re.split(r'\n\s*\n', text):
        lines = blk.split('\n')
        for l in lines:
            if l.strip().startswith('```'): in_fence = not in_fence
        if in_fence: continue
        if not blk.strip(): continue
        nonempty = [l for l in lines if l.strip()]
        first = nonempty[0].strip()
        if first.startswith(('<!--', '|')): continue
        if all(l.strip().startswith('#') for l in nonempty):
            for l in nonempty:
                if han_len(l) > 140: bad += 1
            continue
        if '$$' in blk: continue
        if all(re.fullmatch(r'\s*<[^>]+>(?:[^<]*</[a-zA-Z]+>)?\s*', l) or
               re.fullmatch(r'\s*(?:<[^>]+>)+', l) for l in nonempty):
            continue
        if all(l.strip().startswith('>') for l in nonempty):
            for l in nonempty:
                m = re.match(r'^(?:>\s*)+(.*)$', l)
                if m and han_len(m.group(1)) > 140: bad += 1
            continue
        plain_buf = ''
        for l in nonempty:
            if line_kind(l) == 'p':
                plain_buf += l.strip()
            else:
                if plain_buf and han_len(plain_buf) > 140: bad += 1
                plain_buf = ''
                if han_len(l) > 140: bad += 1
        if plain_buf and han_len(plain_buf) > 140: bad += 1
    return bad


def norm(t):
    t = re.sub(r'<!--.*?-->', '', t, flags=re.S)
    t = re.sub(r'<[^>]+>', '', t)
    return re.sub(r'\s+', '', t)


def targets(argv):
    files = [a for a in argv if not a.startswith('--')]
    if files:
        return files
    out = []
    for course in COURSES:
        out += glob.glob(os.path.join(ROOT, course, '**', '*.md'), recursive=True)
    return out


def main():
    argv = sys.argv[1:]
    write = '--write' in argv
    changed = residuals = failed = 0
    for md in targets(argv):
        raw = io.open(md, encoding='utf-8-sig').read()
        mfm = re.match(r'^(---\r?\n.*?\r?\n---\r?\n?)', raw, re.S)
        fm = mfm.group(1) if mfm else ''
        if re.search(r'draft:\s*true', fm):
            continue
        dtm = re.search(r'doc_type:\s*["\']?([^"\'\n]+)', fm)
        dt = dtm.group(1).strip() if dtm else ''
        rel = os.path.relpath(md, ROOT)
        if '课件' in rel or re.search(r'slide|courseware|deck', dt):
            continue
        body = raw[len(fm):]
        new_body = transform_body(body)
        if norm(new_body) != norm(body):
            print('!!! 守恒失败，跳过:', rel); failed += 1; continue
        bad = residual_scan(new_body)
        if bad:
            print('!!! 拆后仍超长 %d 处:' % bad, rel); residuals += bad; continue
        if new_body.strip() != body.strip():
            changed += 1
            if write:
                with io.open(md, 'w', encoding='utf-8', newline='\n') as f:
                    f.write(fm.rstrip('\n') + '\n' + new_body)
    print(f'课程讲稿 140 通查：改动 {changed} 文件，残留超长 {residuals}，守恒失败 {failed}，WRITE={write}')


if __name__ == '__main__':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    main()
