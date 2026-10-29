#!/usr/bin/env python3
# Cahier 本地编辑服务器
#   - 静态托管 site/dist（和原来的 python -m http.server 一样）
#   - 额外接收 POST /__cahier_notes，把笔记纸的实时编辑原子写回
#     site/src/data/folio-notes.json（git 跟踪的源数据，上线 build 后随站发布）
# 只绑 127.0.0.1，不对外。云端是纯静态站，没有这个接口，笔记只读。
import json
import os
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(HERE, "dist")
NOTES_FILE = os.path.join(HERE, "src", "data", "folio-notes.json")
LOCK = threading.Lock()


def load_notes():
    try:
        with open(NOTES_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def save_notes(data):
    tmp = NOTES_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    os.replace(tmp, NOTES_FILE)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST, **kwargs)

    def do_POST(self):
        if urlparse(self.path).path != "/__cahier_notes":
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length).decode("utf-8"))
            source = body.get("source", "")
            pages = body.get("pages", {}) or {}
            if source:
                with LOCK:
                    notes = load_notes()
                    notes[source] = {
                        str(k): ("" if v is None else str(v)) for k, v in pages.items()
                    }
                    save_notes(notes)
            self.send_response(204)
            self.send_header("Content-Length", "0")
            self.end_headers()
        except Exception:
            self.send_error(400)

    def log_message(self, *args):
        pass  # 静音，避免刷窗口


if __name__ == "__main__":
    port = 8765
    print("Cahier local edit server: http://127.0.0.1:%d/" % port)
    print("notes -> %s" % NOTES_FILE)
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
