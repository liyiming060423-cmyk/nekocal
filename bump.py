# にゃんカロ 版の数字をそろえて上げる（v9.8 から）
# つかいかた：このファイルと同じフォルダで  python bump.py 9.9
# 変えるところ：sw.js の VERSION、data.js の APP_VER、各 HTML の ?v=（css・js の読みこみ）
# v10.0 から：sw.js の APP_FILES（オフライン用に保存するファイルの一覧）も、フォルダの中身から自動で作りなおす
# v10.2：文字（.woff2）にも ?v= をつける（字を入れなおしたとき古い文字が残らないように）
# ※ mp3 には ?v= をつけない（版を上げるたびに大きな曲をダウンロードしなおさないように）
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
HTMLS = ['index.html', 'sagase.html', 'slot.html', 'dash.html', 'baseball.html', 'evgame.html', 'fonts.css']   # v10.4：evgame.html（イベントのミニゲーム）   # v10.2：fonts.css の中の文字ファイル（.woff2?v=）も


def edit(name, pattern, repl, need=True):
    p = HERE / name
    if not p.exists():
        if need:
            sys.exit(f'見つかりません：{name}')
        return 0
    text = p.read_text(encoding='utf-8')
    new, n = re.subn(pattern, repl, text)
    if need and n == 0:
        sys.exit(f'{name} に書きかえる場所が見つかりません（手で確かめてください）')
    if n:
        with open(p, 'w', encoding='utf-8', newline='') as f:   # 改行のしかたはそのまま
            f.write(new)
    return n


# オフライン用に保存しないもの（BGM は service worker を通さない。説明・道具・まとめファイルもいらない）
SKIP_EXT = {'.mp3', '.md', '.py', '.zip', '.txt'}
SKIP_PREFIX = ('_dev',)   # 開発用のファイル（_dev_○○.html）はアプリに入れない
SKIP_NAME = {'sw.js'}
GAME_PAGES = ['sagase.html', 'dash.html', 'slot.html', 'baseball.html', 'evgame.html']


def sw_list():
    files = sorted(p.name for p in HERE.iterdir() if p.is_file() and not p.name.startswith('.')
                   and p.suffix.lower() not in SKIP_EXT and p.name not in SKIP_NAME and not p.name.startswith(SKIP_PREFIX))
    out = ["  './',", "  './index.html',", "  './manifest.webmanifest',"]
    out += [f"  './{h}'," for h in GAME_PAGES if h in files]
    rest = [f for f in files if f not in ('index.html', 'manifest.webmanifest') and f not in GAME_PAGES]
    rest = [f for f in rest if not f.endswith('.html')] + [f for f in rest if f.endswith('.html')]
    for f in rest:
        out.append(f"  './{f}' + V," if f.endswith(('.js', '.css', '.woff2')) else f"  './{f}',")
    out[-1] = out[-1].rstrip(',')
    return out


def write_sw_list():
    p = HERE / 'sw.js'
    text = p.read_text(encoding='utf-8')
    m = re.search(r'// BEGIN APP_FILES\n.*?// END APP_FILES', text, flags=re.S)
    if not m:
        sys.exit('sw.js に「// BEGIN APP_FILES」「// END APP_FILES」が見つかりません')
    lines = sw_list()
    block = '// BEGIN APP_FILES\nconst APP_FILES = [\n' + '\n'.join(lines) + '\n];\n// END APP_FILES'
    with open(p, 'w', encoding='utf-8', newline='') as f:
        f.write(text[:m.start()] + block + text[m.end():])
    return len(lines)


def main():
    if len(sys.argv) != 2 or not re.fullmatch(r'\d+\.\d+', sys.argv[1]):
        sys.exit('つかいかた：python bump.py 9.9（数字.数字）')
    v = sys.argv[1]
    old = re.search(r"const APP_VER = '([^']+)'", (HERE / 'data.js').read_text(encoding='utf-8'))
    print(f'版：{old.group(1) if old else "?"} → {v}')
    print('  sw.js   VERSION', edit('sw.js', r"const VERSION = '[^']*'", f"const VERSION = '{v}'"), 'か所')
    print('  data.js APP_VER', edit('data.js', r"const APP_VER = '[^']*'", f"const APP_VER = '{v}'"), 'か所')
    for h in HTMLS:
        n = edit(h, r'(\.(?:css|js|woff2))\?v=\d+(?:\.\d+)*', rf'\g<1>?v={v}', need=False)
        if n:
            print(f'  {h} ?v=', n, 'か所')
    print('  sw.js   APP_FILES', write_sw_list(), 'ファイル')
    print('おわり。GitHub に全部アップロードしてください。')


if __name__ == '__main__':
    main()
