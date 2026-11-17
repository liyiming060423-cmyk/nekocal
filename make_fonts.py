# にゃんカロ 文字ファイル（zmg-500/700/900.woff2）を作りなおす道具（v10.2）
# アプリの文に新しい漢字を足したときに使う（足さなくても動く。入っていない字は iPhone ではヒラギノ丸ゴで出る）
#
# じゅんび（1回だけ）：
#   pip install fonttools brotli
#   Zen Maru Gothic の TTF（Medium・Bold・Black）を どこかのフォルダに置く
#   （https://github.com/google/fonts/tree/main/ofl/zenmarugothic からダウンロードできる）
# つかいかた：このファイルと同じフォルダで
#   python make_fonts.py <TTF を置いたフォルダ>
# そのあと python bump.py X.Y で版を上げる（文字ファイルにも ?v= がつく）
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SKIP = {'leaflet.js', 'leaflet.css', 'sagase.css'}
RANGES = [(0x20, 0x7F), (0xA0, 0x100), (0x2010, 0x2028), (0x2030, 0x2040), (0x2190, 0x2194), (0x2460, 0x2474),
          (0x25A0, 0x25D0), (0x2605, 0x2607), (0x2661, 0x2667), (0x266A, 0x266C), (0x3000, 0x3100), (0xFF01, 0xFF5F)]
WEIGHTS = {'Medium': '500', 'Bold': '700', 'Black': '900'}


def main():
    if len(sys.argv) != 2:
        sys.exit('つかいかた：python make_fonts.py <TTF のフォルダ>')
    ttf_dir = Path(sys.argv[1])
    chars = set()
    for p in HERE.iterdir():   # アプリの文（HTML・JS・CSS）にある字は全部入れる
        if p.suffix in ('.html', '.js', '.css', '.webmanifest') and p.name not in SKIP:
            chars |= set(p.read_text(encoding='utf-8'))
    for a, b in RANGES:          # ひらがな・カタカナ・英数字・記号は全部
        chars |= {chr(c) for c in range(a, b)}
    chars = {c for c in chars if c not in '\r\n\t'}
    text = HERE / '_chars.tmp'
    text.write_text(''.join(sorted(chars)), encoding='utf-8')
    try:
        for name, w in WEIGHTS.items():
            src = ttf_dir / f'ZenMaruGothic-{name}.ttf'
            if not src.exists():
                sys.exit(f'見つかりません：{src}')
            out = HERE / f'zmg-{w}.woff2'
            subprocess.run([sys.executable, '-m', 'fontTools.subset', str(src), f'--text-file={text}', '--flavor=woff2',
                            "--layout-features=*", '--no-hinting', '--desubroutinize', f'--output-file={out}'], check=True)
            print(f'  {out.name}  {out.stat().st_size // 1024} KB')
    finally:
        text.unlink(missing_ok=True)
    print('おわり。python bump.py X.Y で版を上げてください。')


if __name__ == '__main__':
    main()
