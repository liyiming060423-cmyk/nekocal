# にゃんカロ 版の数字をそろえて上げる（v9.8 から）
# つかいかた：このファイルと同じフォルダで  python bump.py 9.9
# 変えるところ：sw.js の VERSION、data.js の APP_VER、各 HTML の ?v=（css・js の読みこみ）
# ※ mp3 には ?v= をつけない（版を上げるたびに大きな曲をダウンロードしなおさないように）
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
HTMLS = ['index.html', 'sagase.html', 'slot.html', 'dash.html', 'baseball.html']


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


def main():
    if len(sys.argv) != 2 or not re.fullmatch(r'\d+\.\d+', sys.argv[1]):
        sys.exit('つかいかた：python bump.py 9.9（数字.数字）')
    v = sys.argv[1]
    old = re.search(r"const APP_VER = '([^']+)'", (HERE / 'data.js').read_text(encoding='utf-8'))
    print(f'版：{old.group(1) if old else "?"} → {v}')
    print('  sw.js   VERSION', edit('sw.js', r"const VERSION = '[^']*'", f"const VERSION = '{v}'"), 'か所')
    print('  data.js APP_VER', edit('data.js', r"const APP_VER = '[^']*'", f"const APP_VER = '{v}'"), 'か所')
    for h in HTMLS:
        n = edit(h, r'(\.(?:css|js))\?v=\d+(?:\.\d+)*', rf'\g<1>?v={v}', need=False)
        if n:
            print(f'  {h} ?v=', n, 'か所')
    print('おわり。GitHub に全部アップロードしてください。')


if __name__ == '__main__':
    main()
