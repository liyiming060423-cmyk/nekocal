"""にゃんカロ の確認テスト（playwright）。v10.1 の t101.py をもとに v10.2 で リポジトリに入れた。

つかいかた（このファイルと同じフォルダで）：
  pip install playwright && python -m playwright install chromium
  python test_nyankalo.py                      … 全部（chromium）
  python test_nyankalo.py home,a11y            … 一部だけ
  python test_nyankalo.py --shots shots        … スクショを shots/ に保存（なしなら保存しない）
  python test_nyankalo.py --browser webkit     … Safari と同じエンジン（python -m playwright install webkit が必要）
  python test_nyankalo.py --app <フォルダ>      … ほかのフォルダのアプリを調べる
グループ：home tabs tour gacha level coin daily first battle slot sagase font a11y manifest memo migrate achieve stone meal-delete event（v10.3 で memo〜meal-delete、v10.4 で event を追加）
※ bump.py は .py をアプリのファイル一覧に入れないので、このファイルを置いたままでよい
"""
import sys, os, re, json, asyncio, functools, http.server, socketserver, threading, traceback, argparse, tempfile
from pathlib import Path
from playwright.async_api import async_playwright

ap = argparse.ArgumentParser()
ap.add_argument('only', nargs='?', default='')
ap.add_argument('--app', default=str(Path(__file__).resolve().parent))
ap.add_argument('--shots', default='')
ap.add_argument('--browser', default='chromium', choices=['chromium', 'webkit'])
ARGS = ap.parse_args()
SRC, BROWSER = ARGS.app, ARGS.browser
OUT = ARGS.shots or tempfile.mkdtemp(prefix='nyankalo-shots-')
os.makedirs(OUT, exist_ok=True)
ONLY = ARGS.only.split(',') if ARGS.only else None
APP_NEWS = re.search(r"const APP_NEWS = '([^']+)'", Path(SRC, 'data.js').read_text(encoding='utf-8')).group(1)
APP_VER = re.search(r"const APP_VER = '([^']+)'", Path(SRC, 'data.js').read_text(encoding='utf-8')).group(1)

class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2'}
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), functools.partial(H, directory=SRC)); PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
DEV = {'ip13': (390, 664), 'se': (375, 553)}
T0 = '2026-11-17T13:00:00+09:00'
NOW_MS = 1794891600000  # 2026-11-17 13:00 JST

def base(**kw):
    s = {"v": 1, "user": {"name": "テストユーザー", "sex": "male", "age": 20, "height": 170, "weight": 60, "goal": "keep", "delta": 300},
         "cat": {"name": "もち", "breed": "tabby", "idx": 10, "dead": None, "level": 3, "exp": 20, "stats": {"pow": 30, "spd": 25, "sta": 22},
                 "equip": {"head": "band_none", "top": "tee_orange", "hand": "gloves_brown", "suit": "suit_none"}},
         "stamina": 80, "coins": 1850, "stones": 0, "pity": 0, "guide": {"tour": True, "hits": [], "got": [], "done": True},
         "items": {"drink": 0, "protein": 0, "goldbag": 0}, "protein": False, "goldbag": 0, "mood": 60,
         "owned": ["band_none", "tee_orange", "gloves_brown", "suit_none"], "start": "2026-11-10", "last": "2026-11-17", "days": {}, "history": [],
         "settled": "2026-11-16", "streak": {"n": 2, "pass": ""}, "resultQ": [], "login": {"last": "2026-11-17", "streak": 1},
         "claimed": {"date": "2026-11-17", "ids": []},
         "settings": {"sound": False, "bgm": False, "vibrate": False, "notify": False, "lang": "ja", "remind": []},
         "onboarded": True, "lastBackup": NOW_MS, "backupNag": NOW_MS, "news": APP_NEWS, "lvRw": 0}
    for k, v in kw.items():
        if '.' in k: a, b = k.split('.'); s[a][b] = v
        elif v is None: s.pop(k, None)
        else: s[k] = v
    return s

FAILS, LOG = [], []
def check(cond, msg):
    (LOG if cond else FAILS).append(msg)
    if not cond: print('  FAIL', msg)

async def page(b, dev, st, t=T0, motion='no-preference', run=True, path='index.html', touch=True):
    w, h = DEV[dev]
    opt = dict(viewport={'width': w, 'height': h}, device_scale_factor=2, has_touch=touch,
               service_workers='block', locale='ja-JP', timezone_id='Asia/Tokyo', reduced_motion=motion)
    if BROWSER == 'chromium': opt['is_mobile'] = touch
    ctx = await b.new_context(**opt)
    pg = await ctx.new_page()
    pg.ext = []
    pg.on('request', lambda r: pg.ext.append(r.url) if not r.url.startswith(f'http://127.0.0.1:{PORT}') and not r.url.startswith('data:') else None)
    await pg.clock.install(time=t)
    if run: await pg.clock.resume()
    if st is not None:
        await pg.add_init_script("if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('nyankalo-v1', %s); }" % json.dumps(json.dumps(st)))
    pg.errs = []
    pg.on('pageerror', lambda e: pg.errs.append(str(e)))
    pg.on('response', lambda r: pg.errs.append(f'404 {r.url}') if r.status == 404 and not r.url.endswith('favicon.ico') else None)
    pg.on('console', lambda m: pg.errs.append('console: ' + m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text and 'status of 404' not in m.text else None)
    await pg.goto(f'http://127.0.0.1:{PORT}/{path}'); await pg.wait_for_timeout(700)
    return ctx, pg

async def start(pg):
    await pg.click('#title'); await pg.wait_for_timeout(1500)

async def shot(pg, name): await pg.screenshot(path=f'{OUT}/{name}.png')

MEASURE = """()=>{const r=q=>{const e=document.querySelector(q);if(!e)return null;const b=e.getBoundingClientRect();return {l:b.left,t:b.top,r:b.right,b:b.bottom,w:b.width,h:b.height}};
 const nm=document.querySelector('.nc-name'), ev=document.querySelector('#eventBanner .ev-txt'), bn=document.querySelector('#eventBanner');   // v10.4：イベントのバナーは .ev-txt ではなく 絵
 return {vh:innerHeight, docH:document.documentElement.scrollHeight, tabbar:r('.tabbar'), bottom:r('.h-bottom'), left:r('.h-left'), right:r('.h-right'), bubble:r('#bubble'), cat:r('#catWrap'), stage:r('.h-stage'),
  nameCut: nm.scrollWidth>nm.clientWidth+1, nameW: nm.clientWidth, evOver: ev ? (ev.getBoundingClientRect().right > bn.getBoundingClientRect().right-3 || ev.scrollWidth>ev.clientWidth+1) : bn.querySelector('img').getBoundingClientRect().right > bn.getBoundingClientRect().right+1, evTxt: ev ? ev.innerText : bn.getAttribute('aria-label').replace(/\\n/g,'/'),
  quick:r('.h-quick'), modal:!document.getElementById('modal').hidden}}"""

async def t_home(b):
    banners = {
        'guide': dict(guide={"tour": True, "hits": [], "got": [], "done": False}),
        'bag': {},
        'hosp': {'cat.hospital': {"from": "2026-11-16", "until": "2026-11-19", "reason": "boom", "good": 1}},
        'close': dict(settled='2026-11-15', closeAsk='2026-11-16'),
    }
    for dev in DEV:
        for bk, ov in banners.items():
            for coins in (850, 1850, 12850):
                st = base(coins=coins, **{k: v for k, v in ov.items() if '.' not in k})
                for k, v in ov.items():
                    if '.' in k: a, c = k.split('.'); st[a][c] = v
                t = '2026-11-17T11:00:00+09:00' if bk == 'close' else T0
                ctx, pg = await page(b, dev, st, t)
                await start(pg)
                m = await pg.evaluate(MEASURE)
                tag = f'{dev}/{bk}/{coins}'
                check(not m['modal'], f'{tag} モーダルが出ていない')
                check(not m['evOver'], f'{tag} バナーの字が入る（{m["evTxt"]}）')
                check(coins >= 10000 or not m['nameCut'], f'{tag} 名前が切れない（幅{m["nameW"]}）')
                check(m['nameW'] >= 60, f'{tag} 名前欄の幅 {m["nameW"]}px ≥ 60')
                check(m['bottom']['b'] <= m['tabbar']['t'] + 10, f'{tag} 下のカードが底栏にかくれない（{m["bottom"]["b"]:.0f} / {m["tabbar"]["t"]:.0f}）')
                check(m['docH'] <= m['vh'] + 1, f'{tag} スクロールなしで1画面（{m["docH"]}/{m["vh"]}）')
                check(m['left']['t'] >= m['stage']['t'] - 1, f'{tag} 左の列が舞台の中（{m["left"]["t"]:.0f}≥{m["stage"]["t"]:.0f}）')
                bub, lf = m['bubble'], m['left']
                ov_px = max(0, min(bub['r'], lf['r']) - max(bub['l'], lf['l'])) * max(0, min(bub['b'], lf['b']) - max(bub['t'], lf['t']))
                check(ov_px < 120, f'{tag} 吹き出しと左の列が重ならない（{ov_px:.0f}px²）')
                check(not pg.errs, f'{tag} エラーなし {pg.errs[:2]}')
                if coins == 1850 or (bk == 'bag' and coins == 12850): await shot(pg, f'home-{dev}-{bk}-{coins}')
                await ctx.close()

async def t_tabs(b):
    for dev in DEV:
        ctx, pg = await page(b, dev, base(owned=["band_none", "tee_orange", "gloves_brown", "suit_none", "crown", "ribbon", "suit_frog"], **{}))
        await start(pg)
        for tab in ['shop', 'train', 'history', 'cat']:
            await pg.click(f'.tabbar [data-tab="{tab}"]'); await pg.wait_for_timeout(400)
            vis = await pg.evaluate(f"!document.getElementById('tab-{tab}').hidden && document.querySelector('.tabbar [data-tab=\"{tab}\"]').getAttribute('aria-current')==='page'")
            check(vis, f'{dev} タブ {tab} がひらく')
            await shot(pg, f'tab-{dev}-{tab}')
        segs = await pg.evaluate("[...document.querySelectorAll('#trainSeg button')].map(b=>b.textContent).join('/')")
        check(segs == 'ジム/ミニゲーム', f'{dev} あそぶの中は ジム/ミニゲーム（{segs}）')
        await pg.click('#catSeg [data-v="wear"]'); await pg.wait_for_timeout(400); await shot(pg, f'tab-{dev}-cat-wear')
        await pg.click('#catBody [data-wear="crown"]'); await pg.wait_for_timeout(300)
        eq = await pg.evaluate("JSON.parse(localStorage.getItem('nyankalo-v1')).cat.equip.head")
        check(eq == 'crown', f'{dev} ねこ→きせかえ で着がえられる')
        await pg.click('.tabbar [data-tab="home"]'); await pg.wait_for_timeout(300)
        await pg.click('#btnSettings'); await pg.wait_for_timeout(400)
        check(await pg.evaluate("!document.getElementById('tab-settings').hidden"), f'{dev} ⚙ で せってい')
        await shot(pg, f'tab-{dev}-settings')
        await pg.click('#setBack'); await pg.wait_for_timeout(300)
        check(await pg.evaluate("!document.getElementById('tab-home').hidden"), f'{dev} ‹ ホームへ でもどる')
        await pg.click('#bodyPill'); await pg.wait_for_timeout(300)
        check(await pg.evaluate("!document.getElementById('tab-cat').hidden && UI.catTab==='status'"), f'{dev} 体型カード → ねこ/ステータス')
        await pg.click('.tabbar [data-tab="home"]'); await pg.wait_for_timeout(300)
        await pg.click('#kcalCard'); await pg.wait_for_timeout(300)
        check(await pg.evaluate("!document.getElementById('tab-history').hidden"), f'{dev} カロリーカード → きろく')
        check(not pg.errs, f'{dev} タブ エラーなし {pg.errs[:2]}')
        await ctx.close()

async def t_tour(b):
    for dev in DEV:
        ctx, pg = await page(b, dev, base(guide={"tour": False, "hits": [], "got": [], "done": False}))
        await start(pg); await pg.wait_for_timeout(600)
        n = await pg.evaluate("TOUR.length")
        for i in range(n):
            hole = await pg.evaluate("(()=>{const h=document.querySelector('.tour-hole').getBoundingClientRect(), x=document.querySelector('.tour-box').getBoundingClientRect();return {w:h.width,h:h.height,t:h.top,b:h.bottom,bt:x.top,bb:x.bottom,vh:innerHeight}})()")
            check(hole['w'] > 20 and hole['h'] > 20, f'{dev} 案内 {i+1} 照らす所がある')
            check(hole['bt'] >= 0 and hole['bb'] <= hole['vh'] + 1, f'{dev} 案内 {i+1} 説明が画面の中')
            check(hole['bb'] <= hole['t'] + 2 or hole['bt'] >= hole['b'] - 2, f'{dev} 案内 {i+1} 説明が照らす所にかぶらない')
            if i in (2, 4, 5): await shot(pg, f'tour-{dev}-{i+1}')
            await pg.click('#tourNext'); await pg.wait_for_timeout(350)
        check(not pg.errs, f'{dev} 案内 エラーなし {pg.errs[:2]}')
        await ctx.close()

async def t_gacha(b):
    # Math.random を決めて SR / R / N を出す（1つめの乱数でレア度、2つめで中身）
    for dev, rar, seq in [('ip13', 'SR', [0.01, 0.1]), ('ip13', 'R', [0.2, 0.0]), ('se', 'N', [0.3, 0.0]), ('se', 'SR', [0.01, 0.5])]:
        ctx, pg = await page(b, dev, base(coins=2000))
        await start(pg)
        await pg.evaluate("UI.shopTab='gacha';UI.gachaMode='normal';setTab('shop')"); await pg.wait_for_timeout(400)   # v10.4：右下のボタンは イベントへ。いつもの福袋は ショップ → ガチャ →「いつもの福袋」
        await pg.click('.bag-hit.b2'); await pg.wait_for_timeout(600)
        await pg.evaluate("seq => { let i = 0; const r = Math.random; Math.random = () => i < seq.length ? seq[i++] : r(); }", seq)
        await pg.click('#gYes'); await pg.wait_for_timeout(250)
        saved = await pg.evaluate("JSON.parse(localStorage.getItem('nyankalo-v1')).coins")
        check(saved == 1500, f'{dev}/{rar} 演出の前に保存（コイン {saved}）')
        await shot(pg, f'gacha-{dev}-{rar}-shake')
        await pg.wait_for_timeout(600); await shot(pg, f'gacha-{dev}-{rar}-glow')
        await pg.wait_for_timeout(700)
        r = await pg.evaluate("(()=>{const g=document.querySelector('.g-res');return g?{cls:g.className,cat:!!g.querySelector('.g-cat'),conf:!!g.querySelector('.confetti'),txt:document.getElementById('modalBody').innerText.slice(0,80)}:null})()")
        check(r is not None and rar in r['cls'], f'{dev}/{rar} 結果が出る（{r and r["txt"]!r}）')
        if r: check(r['conf'] == (rar == 'SR'), f'{dev}/{rar} 紙ふぶきは SR だけ')
        btn = await pg.evaluate("(()=>{const b=document.getElementById('againG').getBoundingClientRect();return b.bottom<=innerHeight})()")
        check(btn, f'{dev}/{rar} 福袋の結果のボタンが スクロールなしで見える')
        await shot(pg, f'gacha-{dev}-{rar}-result')
        if r and r['cat']:
            await pg.click('#equipNow'); await pg.wait_for_timeout(300)
        check(not pg.errs, f'{dev}/{rar} エラーなし {pg.errs[:2]}')
        await ctx.close()
    # 演出の途中で閉じても なくならない
    ctx, pg = await page(b, 'ip13', base(coins=2000))
    await start(pg); await pg.evaluate("UI.shopTab='gacha';UI.gachaMode='normal';setTab('shop')"); await pg.wait_for_timeout(300); await pg.click('.bag-hit.b0'); await pg.wait_for_timeout(500)
    await pg.click('#gYes'); await pg.wait_for_timeout(300); await pg.click('#modalClose'); await pg.wait_for_timeout(300)
    st = await pg.evaluate("(()=>{const s=JSON.parse(localStorage.getItem('nyankalo-v1'));return {c:s.coins,o:s.owned.length,i:Object.values(s.items).reduce((a,b)=>a+b,0),toast:document.getElementById('toast').innerText}})()")
    check(st['c'] == 1500 and (st['o'] > 4 or st['i'] > 0), f'途中で閉じても結果は残る（{st}）')
    await ctx.close()

async def t_level(b):
    for dev in DEV:
        # Lv4 であと少し → ジムで Lv5（節目）
        ctx, pg = await page(b, dev, base(coins=850, **{}) | {"cat": base()["cat"] | {"level": 4, "exp": 245}})
        await start(pg)
        await pg.click('.tabbar [data-tab="train"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-train="weight"]'); await pg.wait_for_timeout(1300)
        m = await pg.evaluate("(()=>({open:!document.getElementById('modal').hidden, txt:document.getElementById('modalBody').innerText}))()")
        check(m['open'] and 'レベルアップ' in m['txt'] and 'ドリンク ×2' in m['txt'], f'{dev} Lv5 で レベルアップ画面とごほうび（{m["txt"][:60]!r}）')
        btn = await pg.evaluate("(()=>{const b=document.getElementById('lvGo').getBoundingClientRect();return b.bottom<=innerHeight})()")
        check(btn, f'{dev} レベル画面のボタンが スクロールなしで見える')
        await shot(pg, f'level-{dev}-up5')
        await pg.wait_for_timeout(2800)
        s = await pg.evaluate("(()=>{const s=JSON.parse(localStorage.getItem('nyankalo-v1'));return {c:s.coins,d:s.items.drink,lv:s.cat.level,rw:s.lvRw,shown:document.querySelector('#trainBalance .coin-num').textContent}})()")
        check(s == {'c': 850 + 0 + 50 + 100, 'd': 2, 'lv': 5, 'rw': 5, 'shown': '1,000'}, f'{dev} Lv5 のコイン・ドリンク・表示（{s}）')
        await pg.click('#lvGo'); await pg.wait_for_timeout(400)
        check(not pg.errs, f'{dev} レベル エラーなし {pg.errs[:2]}')
        await ctx.close()
    # 前の版のデータ（Lv12・news なし・lvRw なし）→ お知らせ → ごほうびのまとめ（Lv5・Lv10）
    st = base(news=None, lvRw=None, coins=850); st['cat']['level'] = 12
    ctx, pg = await page(b, 'ip13', st)
    await start(pg); await pg.wait_for_timeout(400)
    t = await pg.evaluate("document.getElementById('modalBody').innerText")
    check('メニューが かわったよ' in t, 'v10.0 のデータ → メニューのお知らせ')
    await shot(pg, 'old-ip13-news')
    await pg.click('#nwOk'); await pg.wait_for_timeout(900)
    t = await pg.evaluate("document.getElementById('modalBody').innerText")
    check('レベルのごほうび' in t and 'Lv.5' in t and 'Lv.10' in t, f'v10.0 のデータ → Lv5・Lv10 のごほうびをまとめて（{t[:50]!r}）')
    await shot(pg, 'old-ip13-catchup')
    await pg.wait_for_timeout(1600); await pg.click('#lvGo'); await pg.wait_for_timeout(1200)
    s = await pg.evaluate("(()=>{const s=JSON.parse(localStorage.getItem('nyankalo-v1'));return {c:s.coins,i:s.items,rw:s.lvRw,news:s.news,shown:document.querySelector('#pillCoins .coin-num').textContent,modal:!document.getElementById('modal').hidden}})()")
    check(s['c'] == 850 + 300 and s['i']['drink'] == 2 and s['i']['protein'] == 2 and s['rw'] == 10 and s['news'] == APP_NEWS and s['shown'] == '1,150' and not s['modal'], f'補発の中身（{s}）')
    await pg.reload(); await pg.wait_for_timeout(600); await start(pg); await pg.wait_for_timeout(800)
    check(await pg.evaluate("document.getElementById('modal').hidden"), 'もう一度開いても 2回目は出ない')
    check(not pg.errs, f'旧データ エラーなし {pg.errs[:2]}')
    await ctx.close()

async def t_coin(b):
    for dev, motion in [('ip13', 'no-preference'), ('se', 'reduce')]:
        ctx, pg = await page(b, dev, base(coins=850, login={"last": "2026-11-16", "streak": 1}), motion=motion)
        await start(pg)
        await pg.click('#btnLogin'); await pg.wait_for_timeout(400)
        await pg.click('#loginClaim'); await pg.wait_for_timeout(250)
        mid = await pg.evaluate("document.querySelector('#pillCoins .coin-num').textContent")
        if motion != 'reduce':
            await shot(pg, f'coin-{dev}-fly'); check(mid == '850', f'{dev} 飛んでいるあいだは前の数字（{mid}）')
        await pg.wait_for_timeout(1800)
        end = await pg.evaluate("document.querySelector('#pillCoins .coin-num').textContent")
        check(end == '940', f'{dev}/{motion} 着いたら 940（{end}）')
        # ミッション（モーダルの中で受けとる）
        await pg.evaluate("S.days[todayStr()] = Object.assign(day(), {trains: 1}); save(); renderAll();")
        await pg.click('#btnMission'); await pg.wait_for_timeout(300)
        await pg.click('[data-m="train1"]'); await pg.wait_for_timeout(200)
        if motion != 'reduce': await shot(pg, f'coin-{dev}-mission')
        await pg.wait_for_timeout(1700); await pg.click('#modalClose'); await pg.wait_for_timeout(1200)
        end = await pg.evaluate("document.querySelector('#pillCoins .coin-num').textContent")
        check(end == '990', f'{dev}/{motion} ミッションで 990（{end}）')
        check(not pg.errs, f'{dev}/{motion} コイン エラーなし {pg.errs[:2]}')
        await ctx.close()

async def t_daily(b):
    # 11:00：きのうを しめる画面
    st = base(settled='2026-11-15')
    st['days'] = {'2026-11-16': {"meals": [{"id": "a", "slot": "noon", "name": "カレーライス", "kcal": 750, "photo": None, "time": "12:00"}], "steps": 0, "stepUnits": 0, "trains": 0, "minis": 0, "miniRewards": 0, "mealRewards": 1, "photoBonus": 0, "slotNet": 0}}
    ctx, pg = await page(b, 'se', st, '2026-11-17T11:00:00+09:00')
    await start(pg); await pg.wait_for_timeout(500)
    t = await pg.evaluate("document.getElementById('modalBody').innerText")
    check('きのうの記録をしめる' in t, '11:00 に きのうをしめる画面')
    await shot(pg, 'daily-se-close')
    await pg.click('#clGo'); await pg.wait_for_timeout(1300)
    t = await pg.evaluate("document.getElementById('modalBody').innerText")
    check('きのうの結果' in t, 'これでしめる → きのうの結果')
    await shot(pg, 'daily-se-result')
    await pg.wait_for_timeout(1500); await pg.click('#resOk'); await pg.wait_for_timeout(1200)
    s = await pg.evaluate("(()=>{const s=JSON.parse(localStorage.getItem('nyankalo-v1'));return {c:s.coins, shown:document.querySelector('#pillCoins .coin-num').textContent}})()")
    check(s['shown'] == f"{s['c']:,}", f'結果のコインが残高に入る（{s}）')
    check(not pg.errs, f'しめる エラーなし {pg.errs[:2]}')
    await ctx.close()
    # 開いたまま 0 時をこえる
    ctx, pg = await page(b, 'ip13', base(), '2026-11-17T23:59:30+09:00')
    await start(pg)
    await pg.clock.fast_forward(90000); await pg.wait_for_timeout(800)
    s = await pg.evaluate("({last:S.last, chip:document.getElementById('dayChip').textContent})")
    check(s['last'] == '2026-11-18' and s['chip'] == '9日目', f'0時をこえて描きなおし（{s}）')
    check(not pg.errs, f'0時 エラーなし {pg.errs[:2]}')
    await ctx.close()

async def t_first(b):
    # はじめての人（データなし）：お知らせは出ない・設定 → 案内
    ctx, pg = await page(b, 'se', None)
    await start(pg); await pg.wait_for_timeout(300)
    await pg.fill('#wName', 'かいり'); await pg.click('#wNext1'); await pg.wait_for_timeout(200)
    await pg.click('#wNext2'); await pg.wait_for_timeout(300); await pg.click('#pSave'); await pg.wait_for_timeout(1400)
    s = await pg.evaluate("({tour:!!document.getElementById('tour'), news:S.news, modal:!document.getElementById('modal').hidden})")
    check(s['tour'] and s['news'] == APP_NEWS and not s['modal'], f'はじめての人：お知らせなしで案内へ（{s}）')
    check(not pg.errs, f'はじめて エラーなし {pg.errs[:2]}')
    await ctx.close()


# ===================== v10.2 =====================
async def t_battle(b):
    ctx, pg = await page(b, 'ip13', base())
    await start(pg)
    v = await pg.evaluate("[bHp(20), bHp(60), bHp(150), +bPowMul(20).toFixed(2), +bPowMul(60).toFixed(2), +bPowMul(150).toFixed(2)]")
    check(v == [110, 170, 221, 1.5, 2.5, 3.36], f'対戦：HP と ダメージ倍率の曲線（{v}）')
    d = await pg.evaluate("""(()=>{let hp=0,mul=0,up=true,pH=0,pM=0;for(let x=20;x<=60;x++){hp=Math.max(hp,Math.abs(bHp(x)/(80+1.5*x)-1));mul=Math.max(mul,Math.abs(bPowMul(x)/(1+x/40)-1));}
      for(let x=0;x<=300;x+=5){const h=bHp(x),m=bPowMul(x);if(h<pH||m<pM)up=false;pH=h;pM=m;}return {hp,mul,up}})()""")
    check(d['hp'] <= 0.06 and d['mul'] <= 0.06, f'対戦：能力 20〜60 は前とほぼ同じ（ずれ HP {d["hp"]:.1%}・倍率 {d["mul"]:.1%} ≤ 6%）')
    check(d['up'], '対戦：能力が上がると HP・倍率は下がらない')
    sim = await pg.evaluate("""(()=>{const P=(p,s,t)=>({cat:'a',name:'a',breed:'tabby',pow:p,spd:s,sta:t});
      const fight=(x,y)=>{const a=bFighter(x,true),o=bFighter(y,false);for(let r=0;r<BATTLE.rounds;r++){bDeal(a);bDeal(o);bResolve(a,bAiPick(a,o),o,bAiPick(o,a));if(a.hp<=0||o.hp<=0)break;}
        const ra=a.hp/a.maxHp,ro=o.hp/o.maxHp;return ra>ro?1:ra<ro?0:0.5};
      const rate=(x,y,n=3000)=>{let w=0;for(let i=0;i<n;i++)w+=fight(x,y);return w/n};
      return {even:rate(P(40,40,40),P(40,40,40)), hi:rate(P(100,100,100),P(150,150,150)), mid:rate(P(40,40,40),P(60,60,60))}})()""")
    check(0.45 <= sim['even'] <= 0.55, f'対戦：同じ能力どうしは 五分（{sim["even"]:.0%}）')
    check(sim['hi'] >= 0.28, f'対戦：能力100 が 150 に勝てる見こみ（{sim["hi"]:.0%} ≥ 28%、前は約23%）')
    check(0.22 <= sim['mid'] <= 0.40, f'対戦：40 対 60 の手ごたえは前とほぼ同じ（{sim["mid"]:.0%}、前は約27%）')
    check(not pg.errs, f'対戦 エラーなし {pg.errs[:2]}')
    await ctx.close()

async def t_slot(b):
    for dev in DEV:
        ctx, pg = await page(b, dev, None, path='slot.html')
        t = await pg.evaluate("document.getElementById('oddsNote').innerText")
        smalls = await pg.evaluate("[...document.querySelectorAll('.pay-item small')].map(e=>e.textContent)")
        check('1/36' in t and '約15%' in t, f'{dev} スロット：そろう確率と返還率（{t!r}）')
        check(smalls == ['1/216'] * 6, f'{dev} スロット：絵柄ごとの確率（{smalls}）')
        ov = await pg.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
        check(ov, f'{dev} スロット：横にはみ出さない')
        await pg.evaluate("document.querySelector('.payouts').scrollIntoView()"); await shot(pg, f'slot-{dev}-odds')
        # 120Hz・60Hz・30Hz で 同じ時間に回るコマ数が同じ（前は 120Hz で2倍速）
        n = await pg.evaluate("""(()=>{window.requestAnimationFrame=()=>0;const r=reels[0];const run=hz=>{r.spinning=true;r.stopping=false;r.y=0;r.last=0;r.orderIndex=0;let c=0,t=1000,p=r.orderIndex;
          const dt=1000/hz;for(let i=0;i<=Math.round(1300/dt);i++){r.animate(t);if(r.orderIndex!==p){c++;p=r.orderIndex}t+=dt}r.spinning=false;return c};return [run(120),run(60),run(30)]})()""")
        check(max(n) - min(n) <= 1 and 5 <= n[1] <= 7, f'{dev} スロット：画面の速さで回る速さが変わらない（1.3秒で {n} コマ）')
        check(not pg.errs, f'{dev} スロット エラーなし {pg.errs[:2]}')
        await ctx.close()

async def t_sagase(b):
    ctx, pg = await page(b, 'ip13', None, path='sagase.html')
    r = await pg.evaluate("""(()=>{window.requestAnimationFrame=()=>0;startGame('normal');const c=catEntities[0];
      const mv=dt=>{c.x=logicalWidth/2;c.y=logicalHeight/2;const x0=c.x;lastFrame=1000;animate(1000+dt);return Math.abs(c.x-x0)};
      return {vx:Math.abs(c.vx), m120:mv(1000/120), m60:mv(1000/60), m1s:mv(1000)}})()""")
    check(abs(r['m60'] - r['vx']) < 1e-6 and abs(r['m120'] - r['vx'] / 2) < 1e-6, f'さがせ：120Hz では1フレームで半分だけ動く（{r}）')
    check(abs(r['m1s'] - r['vx'] * 3) < 1e-6, 'さがせ：長く止まっていても 3フレーム分までしか動かない')
    check(not pg.errs, f'さがせ エラーなし {pg.errs[:2]}')
    await ctx.close()

async def t_font(b):
    from fontTools.ttLib import TTFont
    cmap = TTFont(str(Path(SRC, 'zmg-700.woff2'))).getBestCmap()
    for dev in DEV:
        ctx, pg = await page(b, dev, base())
        await start(pg); await pg.wait_for_timeout(500)
        texts = []
        for tab in ['home', 'shop', 'train', 'history', 'cat']:
            await pg.click(f'.tabbar [data-tab="{tab}"]'); await pg.wait_for_timeout(250)
            texts.append(await pg.evaluate("document.body.innerText"))
        await pg.click('#catSeg [data-v="memo"]'); await pg.wait_for_timeout(250); texts.append(await pg.evaluate("document.body.innerText"))
        await pg.click('.tabbar [data-tab="home"]'); await pg.click('#btnMission'); await pg.click('[data-mt="ever"]'); await pg.wait_for_timeout(250)
        texts.append(await pg.evaluate("document.body.innerText")); await pg.click('#modalClose'); await pg.wait_for_timeout(300)
        texts.append(await pg.evaluate("Object.values(MEMO).map(m=>m.t+m.s.join('')).join('')+ACHIEVE.map(a=>a.name+a.goals.map((_,i)=>achRwText(a,i)).join('')).join('')"))
        await pg.click('.tabbar [data-tab="home"]'); await pg.click('#btnSettings'); await pg.wait_for_timeout(300)
        texts.append(await pg.evaluate("document.body.innerText"))
        ok = await pg.evaluate("document.fonts.ready.then(()=>['500','700','900'].map(w=>document.fonts.check(w+' 16px \"Zen Maru Gothic\"','あ')))")
        loaded = await pg.evaluate("[...document.fonts].filter(f=>f.family.replace(/[\"']/g,'')==='Zen Maru Gothic'&&f.status==='loaded').length")
        miss = sorted({c for c in ''.join(texts) if ord(c) > 0x7f and ord(c) not in cmap and not (0x1F000 <= ord(c) or 0x2600 <= ord(c) <= 0x27BF or 0xFE00 <= ord(c) <= 0xFE0F or 0x2190 <= ord(c) <= 0x25FF or c in '＄－～')})
        check(all(ok) and loaded >= 1, f'{dev} 文字：Zen Maru Gothic を自分のサイトから読みこむ（{ok}・{loaded}こ）')
        check(not miss, f'{dev} 文字：画面の字が文字ファイルに入っている（ない字：{"".join(miss)[:40]}）')
        g = [u for u in pg.ext if 'fonts.g' in u]
        check(not g, f'{dev} 文字：Google Fonts に つながない（{g[:1]}）')
        check(not pg.errs, f'{dev} 文字 エラーなし {pg.errs[:2]}')
        await ctx.close()
    for path in ['sagase.html', 'baseball.html']:
        ctx, pg = await page(b, 'ip13', None, path=path)
        await pg.wait_for_timeout(500)
        ok = await pg.evaluate("document.fonts.ready.then(()=>document.fonts.check('900 16px \"Zen Maru Gothic\"','あ'))")
        check(ok and not [u for u in pg.ext if 'fonts.g' in u], f'{path} 文字：自分のサイトの文字')
        await ctx.close()

A11Y = """()=>({app:document.getElementById('app').inert, bar:document.querySelector('.tabbar').inert,
  inModal:!!document.activeElement.closest('#modal,#tour'), id:document.activeElement.id, tag:document.activeElement.tagName,
  modal:!document.getElementById('modal').hidden, tour:!!document.getElementById('tour')})"""

async def t_a11y(b):
    for touch in (False, True):
        tag = 'キーボード' if not touch else 'タッチ'
        ctx, pg = await page(b, 'ip13', base(), touch=touch)
        await start(pg)
        await pg.focus('#btnMission'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(300)
        s = await pg.evaluate(A11Y)
        check(s['modal'] and s['app'] and s['bar'], f'{tag} ダイアログ：うしろは inert（{s}）')
        check(s['inModal'], f'{tag} ダイアログ：開いたらフォーカスは中（{s["tag"]}#{s["id"]}）')
        out = 0
        for i in range(14):
            await pg.keyboard.press('Shift+Tab' if i % 5 == 4 else 'Tab')
            if not (await pg.evaluate(A11Y))['inModal']: out += 1
        check(out == 0, f'{tag} ダイアログ：Tab は中だけを回る（外に出た {out} 回）')
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
        s = await pg.evaluate(A11Y)
        check(not s['modal'] and not s['app'] and not s['bar'] and s['id'] == 'btnMission', f'{tag} ダイアログ：閉じたら元のボタンへ（{s}）')
        # 中身の入れかえ（つづけて開く）でも、最後は元のボタンへ
        await pg.focus('#btnLogin'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(300)
        await pg.evaluate("openModal('<h2 id=\"modalTitle\">2まいめ</h2><button class=\"btn\" id=\"x2\">OK</button>')"); await pg.wait_for_timeout(100)
        await pg.click('#modalClose'); await pg.wait_for_timeout(400)
        s = await pg.evaluate(A11Y)
        check(s['id'] == 'btnLogin' and not s['app'], f'{tag} ダイアログ：つづけて開いても 元のボタンへ（{s["id"]}）')
        check(not pg.errs, f'{tag} ダイアログ エラーなし {pg.errs[:2]}')
        await ctx.close()
    # ホームの案内
    ctx, pg = await page(b, 'se', base(guide={"tour": False, "hits": [], "got": [], "done": False}), touch=False)
    await start(pg); await pg.wait_for_timeout(700)
    s = await pg.evaluate(A11Y)
    check(s['tour'] and s['app'] and s['bar'] and s['id'] == 'tourNext', f'案内：うしろは inert・フォーカスは「つぎへ」（{s}）')
    out = 0
    for i in range(8):
        await pg.keyboard.press('Tab')
        if not (await pg.evaluate(A11Y))['inModal']: out += 1
    check(out == 0, f'案内：Tab は案内の中だけ（外に出た {out} 回）')
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
    s = await pg.evaluate(A11Y)
    check(not s['tour'] and not s['app'] and not s['bar'], f'案内：Esc で終わって inert がとれる（{s}）')
    check(await pg.evaluate("JSON.parse(localStorage.getItem('nyankalo-v1')).guide.tour === true"), '案内：Esc でも見たことになる')
    check(not pg.errs, f'案内 エラーなし {pg.errs[:2]}')
    await ctx.close()

async def t_manifest(b):
    m = json.loads(Path(SRC, 'manifest.webmanifest').read_text(encoding='utf-8'))
    check(m.get('id') == './' and 'games' in m.get('categories', []), f'manifest：id・categories（{m.get("id")} {m.get("categories")}）')
    sc = m.get('shortcuts') or [{}]
    check(sc[0].get('name') == 'ごはんを記録' and sc[0].get('url') == './?go=camera', f'manifest：ショートカット（{sc[0]}）')
    for dev in DEV:
        ctx, pg = await page(b, dev, base(), path='index.html?go=camera')
        url = await pg.evaluate("location.search")
        check(url == '', f'{dev} ?go=camera：アドレスから消す（読みこみなおしで くり返さない）（{url!r}）')
        await start(pg); await pg.wait_for_timeout(300)
        t = await pg.evaluate("document.getElementById('modal').hidden ? '' : document.getElementById('modalBody').innerText")
        check('ごはんを記録' in t, f'{dev} ?go=camera：タイトルのあと 記録の画面（{t[:20]!r}）')
        await shot(pg, f'go-camera-{dev}')
        check(not pg.errs, f'{dev} ?go=camera エラーなし {pg.errs[:2]}')
        await ctx.close()
    # 前の版から来た人（お知らせあり）でも、記録の画面が先・お知らせは閉じたあと
    ctx, pg = await page(b, 'ip13', base(news='10.0'), path='index.html?go=camera')
    await start(pg); await pg.wait_for_timeout(300)
    await pg.click('#modalClose'); await pg.wait_for_timeout(900)
    t = await pg.evaluate("document.getElementById('modalBody').innerText")
    check('メニューが かわったよ' in t, '?go=camera：閉じたあと いつものお知らせ')
    await ctx.close()


# ===================== v10.3 =====================
import base64, io
def png_bytes():
    from PIL import Image
    b = io.BytesIO(); Image.new('RGB', (64, 64), (230, 140, 60)).save(b, 'PNG'); return b.getvalue()
SAVED = "JSON.parse(localStorage.getItem('nyankalo-v1'))"
def meal(i, slot='noon', time='12:00', **kw):
    return {"id": i, "slot": slot, "name": "カレーライス", "kcal": 750, "photo": None, "time": time, **kw}
def dayrec(meals=(), **kw):
    d = {"meals": list(meals), "steps": 0, "stepUnits": 0, "trains": 0, "minis": 0, "miniRewards": 0, "mealRewards": 0, "photoBonus": 0, "slotNet": 0}
    d.update(kw); return d
TALLY0 = {"meals": 0, "photos": 0, "steps": 0, "treasures": 0, "trains": 0, "minis": 0, "wins": 0, "bestStreak": 0}
def b103(**kw):
    # v10.3 のデータ（tally あり＝ 前の版からの作りなおしをしない）
    s = base(tally=dict(TALLY0), ach={}, titles=[], title='', memo=[], memoNew=0)
    for k, v in kw.items():
        if k == 'tally': s['tally'].update(v)
        elif '.' in k: a, c = k.split('.'); s[a][c] = v
        else: s[k] = v
    return s

async def record(pg, name='おにぎり', kcal=180, photo=False):
    await pg.click('#btnCamera'); await pg.wait_for_timeout(300)
    if photo:
        await pg.set_input_files('#photoInput', files=[{'name': 'a.png', 'mimeType': 'image/png', 'buffer': png_bytes()}]); await pg.wait_for_timeout(500)
    await pg.fill('#capName', name); await pg.fill('#capKcal', str(kcal)); await pg.click('#capSave'); await pg.wait_for_timeout(400)

async def t_memo(b):
    for dev in DEV:
        ctx, pg = await page(b, dev, b103())
        await start(pg)
        await record(pg)
        await pg.wait_for_timeout(3200)
        s = await pg.evaluate(f"(()=>{{const s={SAVED};return {{m:s.memo.map(x=>x.k+':'+x.d), n:s.memoNew, dot:!document.getElementById('dotCat').hidden, toast:document.getElementById('toast').innerText}}}})()")
        check(s['m'] == ['meal1:2026-11-17'] and s['n'] == 1 and s['dot'], f'{dev} おもいで：はじめてのごはん → ねこに赤い点（{s}）')
        check('おもいで' in s['toast'], f'{dev} おもいで：トーストで知らせる（{s["toast"]!r}）')
        await record(pg, 'みそしる', 40); await pg.wait_for_timeout(200)
        check(await pg.evaluate(f"{SAVED}.memo.length") == 1, f'{dev} おもいで：同じものは1回だけ')
        # ほかの おもいで（レベル・さんぽ・SR・連続記録・退院・図鑑）
        await pg.evaluate("""(()=>{S.cat.level=4;S.cat.exp=expNeed(4)-1;addExp(5);
          const d=day();normSteps(d);d.stepsGps=1200;applySteps(d);
          S.streak.n=6;S.days['2026-11-16']={meals:[{id:'y',slot:'noon',name:'うどん',kcal:300,photo:null,time:'12:00'}],steps:0,stepUnits:0,trains:0,minis:0,miniRewards:0,mealRewards:1,photoBonus:0,slotNet:0};S.settled='2026-11-15';settleDue(true);
          S.cat.hospital={from:'2026-11-14',until:'2026-11-17',reason:'skel',good:0};checkDischarge();
          save();})()""")
        await pg.wait_for_timeout(900)
        if (await pg.evaluate("!document.getElementById('modal').hidden")):
            for _ in range(4):
                for sel in ['#lvGo', '#resOk', '#lvOk']:
                    if await pg.evaluate(f"!!document.querySelector('{sel}')"): await pg.click(sel); await pg.wait_for_timeout(700)
        ks = await pg.evaluate(f"{SAVED}.memo.map(x=>x.k+(x.v?x.v:'')+':'+x.d)")
        for want in ['lv5:2026-11-17', 'walk1k:2026-11-17', 'streak7:2026-11-16', 'leave:2026-11-17']:
            check(want in ks, f'{dev} おもいで：{want}（{ks}）')
        # SR（福袋）と 図鑑 25
        await pg.evaluate("S.coins=2000;S.owned=S.owned.concat(zukanKeys().filter(k=>WEAR[k].rar!=='SR').slice(0,24));save();renderAll()")
        await pg.click('.tabbar [data-tab="shop"]'); await pg.wait_for_timeout(300); await pg.click('[data-v="gacha"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-gmode="normal"]'); await pg.wait_for_timeout(300)   # v10.4：いつもの福袋
        await pg.click('.bag-hit.b1'); await pg.wait_for_timeout(500)
        await pg.evaluate("seq => { let i = 0; const r = Math.random; Math.random = () => i < seq.length ? seq[i++] : r(); }", [0.01, 0.1])
        await pg.click('#gYes'); await pg.wait_for_timeout(1800); await pg.click('#modalClose'); await pg.wait_for_timeout(400)
        ks = await pg.evaluate(f"{SAVED}.memo.map(x=>x.k)")
        check('sr1' in ks and 'zukan25' in ks, f'{dev} おもいで：はじめての SR・図鑑25（{ks}）')
        # ねこ → おもいで
        await pg.click('.tabbar [data-tab="cat"]'); await pg.wait_for_timeout(300)
        await pg.click('#catSeg [data-v="memo"]'); await pg.wait_for_timeout(500)
        r = await pg.evaluate(f"(()=>({{cards:document.querySelectorAll('.memo-card').length, n:{SAVED}.memoNew, dot:!document.getElementById('dotCat').hidden, over:document.documentElement.scrollWidth>innerWidth+1, first:document.querySelector('.memo-card').innerText}}))()")
        check(r['cards'] == 7 and r['n'] == 0 and not r['dot'] and not r['over'], f'{dev} おもいで：7まい・見たら赤い点が消える・はみ出さない（{r}）')
        check(r['first'].startswith('2026/11/17'), f'{dev} おもいで：新しい順（{r["first"][:30]!r}）')
        await shot(pg, f'memo-{dev}-list')
        await pg.click('.memo-card'); await pg.wait_for_timeout(400)
        t = await pg.evaluate("document.getElementById('modalBody').innerText")
        check('とじる' in t and 'Lv.' in t, f'{dev} おもいで：タップで大きく（{t[:40]!r}）')
        await shot(pg, f'memo-{dev}-big')
        await pg.click('#mmOk'); await pg.wait_for_timeout(300)
        check(not pg.errs, f'{dev} おもいで エラーなし {pg.errs[:2]}')
        await ctx.close()
    # まだない
    ctx, pg = await page(b, 'se', b103())
    await start(pg); await pg.click('.tabbar [data-tab="cat"]'); await pg.click('#catSeg [data-v="memo"]'); await pg.wait_for_timeout(300)
    check(await pg.evaluate("!!document.querySelector('.memo-empty')"), 'おもいで：ないときの説明')
    await shot(pg, 'memo-se-empty'); await ctx.close()

async def t_migrate(b):
    # v10.2 のデータ（tally・memo・ach なし、news 10.1）
    st = base(news='10.1', tally=None, coins=850, owned=["band_none", "tee_orange", "gloves_brown", "suit_none", "crown", "ribbon"], lvRw=10)
    st['cat']['level'] = 12; st['streak'] = {"n": 8, "pass": ""}
    st['days'] = {'2026-11-12': dayrec([meal('a'), meal('b', 'night', '19:00', photo='data:image/jpeg;base64,AA')], photoBonus=1, trains=2, minis=1),
                  '2026-11-13': dayrec([meal('c')], steps=1500, stepUnits=1, treasures=2, minis=3),
                  '2026-11-16': dayrec([meal('d')], steps=800, trains=1)}
    st['history'] = [{"date": "2026-11-05", "intake": 1800, "target": 2000, "diff": -200, "change": 0, "idx": 0}]
    st['battle'] = {"log": [{"opp": "x", "win": True, "delta": 10, "practice": False, "at": 1794632400000}, {"opp": "y", "win": True, "practice": True, "at": 1794718800000}]}
    ctx, pg = await page(b, 'ip13', st)
    await start(pg); await pg.wait_for_timeout(500)
    t = await pg.evaluate("document.getElementById('modalBody').innerText")
    check('あたらしくなったよ' in t and 'おもいで' in t and 'ダイヤ' in t and 'メニューが' not in t, f'移行：10.1 の人には v10.3 のお知らせだけ（{t[:40]!r}）')
    await shot(pg, 'migrate-ip13-news')
    await pg.click('#nwOk'); await pg.wait_for_timeout(600)
    s = await pg.evaluate(f"(()=>{{const s={SAVED};return {{t:s.tally, m:s.memo.map(x=>x.k+(x.v?x.v:'')+':'+x.d).sort(), news:s.news, ach:s.ach}}}})()")
    check(s['t'] == {"meals": 4, "photos": 1, "steps": 2300, "treasures": 2, "trains": 3, "minis": 4, "wins": 1, "bestStreak": 8}, f'移行：数（tally）を記録から作る（{s["t"]}）')
    want = sorted(['meal1:2026-11-05', 'walk1k:2026-11-13', 'treasure1:2026-11-13', 'lv5:null', 'lv10:null', 'sr1:null', 'streak7:null', 'win1:2026-11-14'])
    check(s['m'] == want, f'移行：おもいで（{s["m"]}）')
    check(s['news'] == APP_NEWS and s['ach'] == {}, f'移行：news・ach（{s["news"]} {s["ach"]}）')
    await pg.click('.tabbar [data-tab="cat"]'); await pg.click('#catSeg [data-v="memo"]'); await pg.wait_for_timeout(400)
    r = await pg.evaluate("({sec:[...document.querySelectorAll('.section-title')].map(e=>e.textContent), cards:document.querySelectorAll('.memo-card').length, dot:!document.getElementById('dotCat').hidden})")
    check('これまでの思い出' in r['sec'] and r['cards'] == 8, f'移行：「これまでの思い出」がある（{r}）')
    await shot(pg, 'migrate-ip13-memo')
    await pg.reload(); await pg.wait_for_timeout(500); await start(pg); await pg.wait_for_timeout(400)
    n = await pg.evaluate(f"{SAVED}.memo.length")
    check(n == 8 and await pg.evaluate("document.getElementById('modal').hidden"), f'移行：2回目は作りなおさない・お知らせも出ない（{n}）')
    check(not pg.errs, f'移行 エラーなし {pg.errs[:2]}')
    await ctx.close()
    # v10.0 のデータ（news なし）：メニューのお知らせ＋ v10.3
    ctx, pg = await page(b, 'se', base(news=None))
    await start(pg); await pg.wait_for_timeout(400)
    t = await pg.evaluate("document.getElementById('modalBody').innerText")
    check('メニューが かわったよ' in t and 'おもいで' in t, f'移行：10.0 の人には メニュー＋v10.3（{t[:30]!r}）')
    btn = await pg.evaluate("document.getElementById('nwOk').getBoundingClientRect().bottom <= innerHeight")
    check(btn, '移行：SE でも OK ボタンが見える')
    await shot(pg, 'migrate-se-news')
    await ctx.close()
    # バックアップ（v10.2 の形）から復元しても作りなおす
    ctx, pg = await page(b, 'ip13', b103())
    await start(pg)
    old = base(tally=None, coins=777); old['days'] = {'2026-11-12': dayrec([meal('a')], trains=5)}
    ok = await pg.evaluate("""o => { localStorage.setItem('nyankalo-v1', JSON.stringify(o)); return true; }""", old)
    await pg.reload(); await pg.wait_for_timeout(500)
    s = await pg.evaluate(f"{SAVED}.tally")
    check(s['meals'] == 1 and s['trains'] == 5, f'移行：復元したデータも 数を作る（{s}）')
    await ctx.close()

async def t_achieve(b):
    for dev in DEV:
        ctx, pg = await page(b, dev, b103(tally={"meals": 30, "steps": 13100, "trains": 29}, stones=0))
        await start(pg)
        check(await pg.evaluate("!document.getElementById('dotMission').hidden"), f'{dev} 実績：受けとれると 📋 に赤い点')
        await pg.click('#btnMission'); await pg.wait_for_timeout(300)
        await pg.click('[data-mt="ever"]'); await pg.wait_for_timeout(300)
        r = await pg.evaluate("({n:document.querySelectorAll('.ach').length, first:document.querySelector('.ach').innerText, over:document.querySelector('.sheet').scrollWidth>document.querySelector('.sheet').clientWidth+1})")
        check(r['n'] == 9 and not r['over'], f'{dev} 実績：9つ・はみ出さない（{r["n"]}）')
        check('ごはん' in r['first'] or 'さんぽ' in r['first'], f'{dev} 実績：受けとれるものが上（{r["first"][:20]!r}）')
        await shot(pg, f'achieve-{dev}-ever')
        c0 = await pg.evaluate("S.coins")
        await pg.click('[data-a="meals"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-a="walk"]'); await pg.wait_for_timeout(300)
        s = await pg.evaluate(f"(()=>{{const s={SAVED};return {{c:s.coins-{c0}, st:s.stones, ach:s.ach}}}})()")
        check(s == {'c': 300, 'st': 10, 'ach': {'meals': 1, 'walk': 1}}, f'{dev} 実績：ごはん30・さんぽ10km（{s}）')
        t = await pg.evaluate("document.querySelector('[data-a=\"meals\"]').closest('.ach').innerText")
        check('30 / 100' in t and 'ごはん日記Tシャツ' in t, f'{dev} 実績：つぎの段階（{t!r}）')
        check(await pg.evaluate("document.querySelector('[data-a=\"trains\"]').disabled"), f'{dev} 実績：とどいていないと押せない')
        await shot(pg, f'achieve-{dev}-claimed')
        # ジム1回で 30 → 受けとれる
        await pg.click('#modalClose'); await pg.wait_for_timeout(1500)
        await pg.click('.tabbar [data-tab="train"]'); await pg.click('[data-train="bag"]'); await pg.wait_for_timeout(500)
        check(await pg.evaluate(f"{SAVED}.tally.trains") == 30, f'{dev} 実績：ジムで数がふえる')
        await pg.evaluate("S.tally.meals=100; save(); renderAll()")
        await pg.click('.tabbar [data-tab="home"]'); await pg.click('#btnMission'); await pg.wait_for_timeout(300)
        check(await pg.evaluate("UI.misTab === 'ever'"), f'{dev} 実績：さっきのタブを覚えている')
        await pg.click('[data-a="trains"]'); await pg.click('[data-a="meals"]'); await pg.wait_for_timeout(300)
        s = await pg.evaluate(f"(()=>{{const s={SAVED};return {{p:s.items.protein, o:s.owned.includes('tee_diary')}}}})()")
        check(s == {'p': 2, 'o': True}, f'{dev} 実績：プロテイン・きせかえ（{s}）')
        await pg.click('#modalClose'); await pg.wait_for_timeout(1500)
        await pg.click('.tabbar [data-tab="cat"]'); await pg.click('#catSeg [data-v="wear"]'); await pg.click('[data-lslot="top"]'); await pg.wait_for_timeout(300)
        z = await pg.evaluate("({z:document.querySelector('.zk-top').innerText, has:!!document.querySelector('[data-wear=\"tee_diary\"] .rar.ach')})")
        check('/ 50' in z['z'] and z['has'], f'{dev} 実績：きせかえは「実績」・図鑑は 50 のまま（{z}）')
        await pg.click('[data-wear="tee_diary"]'); await pg.wait_for_timeout(300)
        await shot(pg, f'achieve-{dev}-tee')
        # 称号
        await pg.evaluate("S.tally.meals=300; save()")
        await pg.click('.tabbar [data-tab="home"]'); await pg.click('#btnMission'); await pg.wait_for_timeout(300); await pg.click('[data-a="meals"]'); await pg.wait_for_timeout(300)
        t = await pg.evaluate("document.querySelector('[data-a=\"meals\"]') ? 'still' : document.getElementById('modalBody').innerText")
        check('コンプリート' in t, f'{dev} 実績：ごはん コンプリート')
        await pg.click('#modalClose'); await pg.wait_for_timeout(1300)
        await pg.click('.tabbar [data-tab="cat"]'); await pg.click('#catSeg [data-v="status"]'); await pg.wait_for_timeout(300)
        await pg.click('#ncTitle'); await pg.wait_for_timeout(300)
        opts = await pg.evaluate("[...document.querySelectorAll('[data-title]')].map(b=>b.dataset.title)")
        check(opts == ['みならい', 'ごはん記録の達人'], f'{dev} 称号：えらべる称号（{opts}）')
        await shot(pg, f'achieve-{dev}-title')
        await pg.click('[data-title="ごはん記録の達人"]'); await pg.wait_for_timeout(300)
        t = await pg.evaluate("document.getElementById('ncTitle').innerText")
        check('ごはん記録の達人' in t, f'{dev} 称号：つけた称号を出す（{t!r}）')
        check(not pg.errs, f'{dev} 実績 エラーなし {pg.errs[:2]}')
        await ctx.close()
    # 回数がふえる・消すとへる（ミニゲーム・ごはん・写真）
    ctx, pg = await page(b, 'ip13', b103())
    await start(pg)
    await record(pg, photo=True); await record(pg, 'みそしる', 40)
    await pg.evaluate("miniReward(5); nyankaloMini.played(); save()")
    s = await pg.evaluate(f"{SAVED}.tally")
    check(s['meals'] == 2 and s['photos'] == 1 and s['minis'] == 2, f'実績：ごはん・写真・ミニゲームの数（{s}）')
    ms = await pg.evaluate(f"{SAVED}.days['2026-11-17'].meals.map(m=>m.id)")
    await pg.click('.tabbar [data-tab="history"]'); await pg.wait_for_timeout(300)
    await pg.click(f'[data-edit="{ms[0]}"]'); await pg.wait_for_timeout(300); await pg.click('#edDel'); await pg.click('#edDel'); await pg.wait_for_timeout(300)
    s = await pg.evaluate(f"{SAVED}.tally")
    check(s['meals'] == 1 and s['photos'] == 0, f'実績：消したら へる（{s}）')
    check(not pg.errs, f'実績 数 エラーなし {pg.errs[:2]}')
    await ctx.close()

async def t_stone(b):
    for dev in DEV:
        ctx, pg = await page(b, dev, b103(stones=25, coins=850))
        await start(pg)
        await pg.click('.tabbar [data-tab="shop"]'); await pg.wait_for_timeout(300)
        r = await pg.evaluate("({bal:document.getElementById('shopBalance').innerText, packs:document.querySelectorAll('.stone-pack').length, over:document.documentElement.scrollWidth>innerWidth+1})")
        check('25' in r['bal'] and r['packs'] == 3 and not r['over'], f'{dev} ダイヤ：残高・パック（{r}）')
        await pg.evaluate("document.querySelector('.stone-ex').scrollIntoView({block:'center'})"); await shot(pg, f'stone-{dev}-shop')
        await pg.click('[data-sinc]'); await pg.click('[data-sinc]'); await pg.wait_for_timeout(200)
        q = await pg.evaluate("document.querySelector('.stone-ex output').textContent")
        check(q == '2', f'{dev} ダイヤ：持っている分まで（{q}）')
        await pg.click('#stoneGo'); await pg.wait_for_timeout(1800)
        s = await pg.evaluate(f"(()=>{{const s={SAVED};return {{c:s.coins, st:s.stones, dis:document.getElementById('stoneGo').disabled}}}})()")
        check(s == {'c': 1050, 'st': 5, 'dis': True}, f'{dev} ダイヤ：20 → 200コイン・足りないと押せない（{s}）')
        await pg.click('[data-pack="0"]'); await pg.wait_for_timeout(300)
        t = await pg.evaluate("document.getElementById('modalBody').innerText")
        check('これは見本です' in t and '¥120' in t, f'{dev} ダイヤ：パックは見本（{t[:40]!r}）')
        await shot(pg, f'stone-{dev}-sample')
        await pg.click('#spOk'); await pg.wait_for_timeout(200)
        check(await pg.evaluate(f"{SAVED}.stones") == 5, f'{dev} ダイヤ：見本はダイヤを出さない')
        check(not pg.errs, f'{dev} ダイヤ エラーなし {pg.errs[:2]}')
        await ctx.close()
    # ログボ7日目
    ctx, pg = await page(b, 'se', b103(stones=0, coins=850, login={"last": "2026-11-16", "streak": 6}))
    await start(pg); await pg.click('#btnLogin'); await pg.wait_for_timeout(300)
    t = await pg.evaluate("document.getElementById('loginClaim').innerText")
    check('💎5' in t, f'ダイヤ：ログボ7日目のボタン（{t!r}）')
    await shot(pg, 'stone-se-login')
    await pg.click('#loginClaim'); await pg.wait_for_timeout(300)
    s = await pg.evaluate(f"(()=>{{const s={SAVED};return {{c:s.coins, st:s.stones}}}})()")
    check(s == {'c': 1150, 'st': 5}, f'ダイヤ：ログボ7日目 +300コイン・+5ダイヤ（{s}）')
    await ctx.close()

async def del_meal(pg, mid, date=None):
    await pg.click('.tabbar [data-tab="history"]'); await pg.wait_for_timeout(300)
    if date: await pg.click(f'[data-day="{date}"]'); await pg.wait_for_timeout(200)
    await pg.click(f'[data-edit="{mid}"]'); await pg.wait_for_timeout(300); await pg.click('#edDel'); await pg.click('#edDel'); await pg.wait_for_timeout(400)
    await pg.click('.tabbar [data-tab="home"]'); await pg.wait_for_timeout(200)

async def t_mealdel(b):
    ST = f"(()=>{{const s={SAVED}, d=s.days[todayStr()]||{{}};return {{st:s.stamina, rw:d.mealRewards, pb:d.photoBonus||0, n:(d.meals||[]).length}}}})()"
    # 新しい記録：ふえた分だけ もどす
    ctx, pg = await page(b, 'ip13', b103(stamina=80))
    await start(pg)
    await record(pg); s = await pg.evaluate(ST)
    check(s['st'] == 95 and s['rw'] == 1, f'消す：記録で +15（{s}）')
    mid = await pg.evaluate(f"{SAVED}.days[todayStr()].meals[0].id")
    await del_meal(pg, mid); s = await pg.evaluate(ST)
    t = await pg.evaluate("document.getElementById('toast').innerText")
    check(s['st'] == 80 and s['rw'] == 0 and s['n'] == 0, f'消す：スタミナ −15・ごほうびの回数ももどる（{s}）')
    check('スタミナ −15' in t, f'消す：トーストで知らせる（{t!r}）')
    await shot(pg, 'mealdel-ip13-toast')
    # 満タン近く：本当にふえた分だけ
    await pg.evaluate("S.stamina = 95; save(); renderAll()")
    await record(pg); mid = await pg.evaluate(f"{SAVED}.days[todayStr()].meals[0].id")
    check(await pg.evaluate(f"{SAVED}.days[todayStr()].meals[0].st") == 5, '消す：満タンのときは ふえた分（+5）を覚える')
    await del_meal(pg, mid); s = await pg.evaluate(ST)
    check(s['st'] == 95, f'消す：満タン近くは −5（{s}）')
    # 使ったあと：0 より下にしない
    await record(pg); mid = await pg.evaluate(f"{SAVED}.days[todayStr()].meals[0].id")
    await pg.evaluate("S.stamina = 3; save(); renderAll()")
    await del_meal(pg, mid); s = await pg.evaluate(ST)
    check(s['st'] == 0, f'消す：スタミナは 0 より下にならない（{s}）')
    # 写真つき：ミニゲーム +1 も もどす
    await pg.evaluate("S.stamina = 50; save(); renderAll()")
    await record(pg, photo=True); s = await pg.evaluate(ST)
    check(s['pb'] == 1, f'消す：写真つきで ミニゲーム +1（{s}）')
    mid = await pg.evaluate(f"{SAVED}.days[todayStr()].meals[0].id")
    await del_meal(pg, mid); s = await pg.evaluate(ST)
    check(s['pb'] == 0 and s['st'] == 50, f'消す：写真の +1回 も もどす（{s}）')
    check(not pg.errs, f'消す エラーなし {pg.errs[:2]}')
    await ctx.close()
    # 前の版の記録（st がない）：ルールで考える（ごほうびの回数ぶん、古い順に +15）
    st = b103(stamina=50)
    st['days'] = {'2026-11-17': dayrec([meal('a', 'morning', '08:00'), meal('b', 'noon', '12:00'), meal('c', 'snack', '15:00', photo='data:image/jpeg;base64,AA')], mealRewards=2, photoBonus=1)}
    ctx, pg = await page(b, 'se', st)
    await start(pg)
    await del_meal(pg, 'c'); s = await pg.evaluate(ST)
    check(s['st'] == 50 and s['rw'] == 2 and s['pb'] == 0, f'消す（前の版）：3つめは ごほうびなし・写真の +1 は もどす（{s}）')
    await del_meal(pg, 'b'); s = await pg.evaluate(ST)
    check(s['st'] == 35 and s['rw'] == 1, f'消す（前の版）：2つめは −15（{s}）')
    check(not pg.errs, f'消す（前の版） エラーなし {pg.errs[:2]}')
    await ctx.close()
    # きのう（まだ しめていない）の「あとから」の記録：ごほうびはないので もどさない
    st = b103(stamina=50, settled='2026-11-15', closeAsk='2026-11-16')
    st['days'] = {'2026-11-16': dayrec([meal('y', time='あとから')])}
    ctx, pg = await page(b, 'ip13', st, '2026-11-17T11:00:00+09:00')
    await start(pg)
    await del_meal(pg, 'y', '2026-11-16'); s = await pg.evaluate(f"(()=>{{const s={SAVED};return {{st:s.stamina, n:s.days['2026-11-16'].meals.length}}}})()")
    check(s == {'st': 50, 'n': 0}, f'消す：きのうの分は スタミナを もどさない（{s}）')
    check(not pg.errs, f'消す（きのう） エラーなし {pg.errs[:2]}')
    await ctx.close()

# ===== v10.4 イベント =====
EV_IDS = ['school', 'rainy', 'summer', 'halloween', 'xmas', 'newyear']
async def t_event(b):
    # 1) 日がわりの順番（EVENT_MODE 'rotate' のときの計算）
    ctx, pg = await page(b, 'ip13', b103())
    r = await pg.evaluate("['2026-11-18','2026-11-19','2026-11-20','2026-11-24','2026-11-25','2027-01-01'].map(d=>evRotate(d).id)")
    check(r == ['newyear', 'school', 'rainy', 'newyear', 'school', 'rainy'], f'イベント：日がわりの順番（{r}）')
    r = await pg.evaluate("({mode:EVENT_MODE, n:evList().length, now:eventNow().id, wears:EVENTS.every(e=>e.wears.length===4&&e.wears.every(k=>WEAR[k]&&WEAR[k].ev===e.id&&WEAR[k].slot==='suit'&&!WEAR[k].bonus)), zukan:zukanKeys().length})")
    check(r == {'mode': 'all', 'n': 6, 'now': 'school', 'wears': True, 'zukan': 50}, f'イベント：6つ全部・きせかえ4つずつ・図鑑は50のまま（{r}）')
    await ctx.close()
    for dev in DEV:
        # 2) ホーム：バナー・イベントのボタン・背景
        ctx, pg = await page(b, dev, b103())
        await start(pg)
        r = await pg.evaluate("""(()=>{const bn=document.getElementById('eventBanner'), gb=document.getElementById('btnGacha'), r=e=>e.getBoundingClientRect();
          return {ban:!!bn.querySelector('img[src="ev-school-banner.webp"]'), cls:bn.classList.contains('ev-b'), btn:gb.classList.contains('ev-btn')&&gb.innerText.includes('イベント'),
            bg:document.getElementById('tab-home').style.backgroundImage.includes('ev-school-home'), title:document.getElementById('title').style.backgroundImage.includes('ev-school-home'),
            inBan: r(bn.querySelector('img')).right <= r(bn).right+1 && r(bn.querySelector('img')).left >= r(bn).left-1, over:document.documentElement.scrollWidth>innerWidth+1}})()""")
        check(all(v for k, v in r.items() if k != 'over') and not r['over'], f'{dev} イベント：ホームのバナー・ボタン・背景（{r}）')
        await shot(pg, f'event-{dev}-home-school')
        # 3) イベントページ → 6つ えらべる → ハロウィンにすると ホームも かわる
        await pg.click('#btnGacha'); await pg.wait_for_timeout(500)
        r = await pg.evaluate("({open:!!document.getElementById('evHub'), chips:document.querySelectorAll('#evHub [data-evpick]').length, inert:document.getElementById('app').inert, foc:document.getElementById('evHub').contains(document.activeElement)})")
        check(r == {'open': True, 'chips': 6, 'inert': True, 'foc': True}, f'{dev} イベント：イベントページ（{r}）')
        await shot(pg, f'event-{dev}-hub-school')
        await pg.click('#evHub [data-evpick="halloween"]'); await pg.wait_for_timeout(300)
        r = await pg.evaluate(f"({{now:eventNow().id, pick:{SAVED}.ev.pick, hero:!!document.querySelector('#evHub img[src=\"ev-halloween-banner.webp\"]'), bg:document.getElementById('tab-home').style.backgroundImage.includes('ev-halloween-home'), game:document.querySelector('#evHub [data-evgame]').dataset.evgame}})")
        check(r == {'now': 'halloween', 'pick': 'halloween', 'hero': True, 'bg': True, 'game': 'halloween'}, f'{dev} イベント：えらぶと かわる（{r}）')
        await shot(pg, f'event-{dev}-hub-halloween')
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        r = await pg.evaluate("({closed:!document.getElementById('evHub'), inert:document.getElementById('app').inert, foc:document.activeElement&&document.activeElement.id})")
        check(r == {'closed': True, 'inert': False, 'foc': 'btnGacha'}, f'{dev} イベント：Esc で とじて ボタンに もどる（{r}）')
        # 4) BGM：ホーム・ショップは イベントの曲
        r = await pg.evaluate("(()=>{S.settings.bgm=true;bgmUnlocked=true;bgmUpdate();const a=bgmCur;setTab('shop');const b2=bgmCur;setTab('train');const c=bgmCur;setTab('home');S.settings.bgm=false;bgmUpdate();return [a,b2,c]})()")
        check(r == ['ev-halloween-bgm.mp3', 'ev-halloween-bgm.mp3', 'bgm-train.mp3'], f'{dev} イベント：BGM（{r}）')
        check(not pg.errs, f'{dev} イベント（ホーム）エラーなし {pg.errs[:2]}')
        await ctx.close()
    # 5) ショップ：イベントガチャ（必ず まだ持っていないもの・4回で コンプリート）・いつもの福袋
    for dev in DEV:
        ctx, pg = await page(b, dev, b103(coins=2600))
        await start(pg)
        await pg.click('.tabbar [data-tab="shop"]'); await pg.wait_for_timeout(200); await pg.click('#shopSeg [data-v="gacha"]'); await pg.wait_for_timeout(300)
        r = await pg.evaluate("({ev:document.querySelector('[data-gmode=\"ev\"]').getAttribute('aria-selected'), img:!!document.querySelector('.shop-scene img[src=\"ev-school-gacha.webp\"]'), bags:document.querySelectorAll('[data-evbag]').length, say:!!document.querySelector('.shop-say'), over:document.documentElement.scrollWidth>innerWidth+1})")
        check(r == {'ev': 'true', 'img': True, 'bags': 4, 'say': False, 'over': False}, f'{dev} イベントガチャ：はじめは イベント（{r}）')
        await shot(pg, f'event-{dev}-gacha-school')
        got = []
        for i in range(4):
            await pg.click(f'[data-evbag="{i}"]'); await pg.wait_for_timeout(500); await pg.click('#gYes'); await pg.wait_for_timeout(2600)
            if i == 0: await shot(pg, f'event-{dev}-gacha-result')
            got.append(await pg.evaluate(f"{SAVED}.owned.filter(k=>/^ev_/.test(k)).length"))
            await pg.evaluate("closeModal()"); await pg.wait_for_timeout(300)
        s = await pg.evaluate(f"(()=>{{const s={SAVED};return {{c:s.coins, ev:s.owned.filter(k=>/^ev_/.test(k)).sort(), memo:s.memo.filter(m=>m.k==='ev_school').length, dis:[...document.querySelectorAll('[data-evbag]')].every(b=>b.disabled), stamp:!!document.querySelector('.ev-stamp')}}}})()")
        check(got == [1, 2, 3, 4] and s['c'] == 600 and s['ev'] == sorted(['ev_gakuran', 'ev_sailor', 'ev_randoseru', 'ev_hakama']) and s['memo'] == 1 and s['dis'] and s['stamp'], f'{dev} イベントガチャ：毎回 新しい・4回で コンプリート・おもいで1つ（{got} {s}）')
        await shot(pg, f'event-{dev}-gacha-complete')
        await pg.click('[data-gmode="normal"]'); await pg.wait_for_timeout(300)
        r = await pg.evaluate("({img:!!document.querySelector('.shop-scene img[src=\"shop-bg.webp\"]'), bags:document.querySelectorAll('[data-bag]').length, say:!!document.querySelector('.shop-say')})")
        check(r == {'img': True, 'bags': 4, 'say': False}, f'{dev} いつもの福袋：新しい絵・台詞は絵の中（{r}）')
        await shot(pg, f'event-{dev}-gacha-normal')
        # いつもの福袋からは イベントのきせかえが出ない
        r = await pg.evaluate("(()=>{S.coins=99999;for(let i=0;i<24;i++){pullGacha();closeModal();}return S.owned.filter(k=>WEAR[k]&&WEAR[k].ev).length})()")
        check(r == 4, f'{dev} いつもの福袋：イベントのきせかえは出ない（{r}）')
        check(not pg.errs, f'{dev} イベントガチャ エラーなし {pg.errs[:2]}')
        await ctx.close()
    # 6) きせかえ：イベントの印・まだのものは「イベントでもらえる」・着た猫
    ctx, pg = await page(b, 'ip13', b103(owned=["band_none", "tee_orange", "gloves_brown", "suit_none", "ev_hakama", "ev_shark"]))
    await start(pg)
    await pg.evaluate("UI.catTab='wear';UI.lockerSlot='suit';setTab('cat')"); await pg.wait_for_timeout(300)
    r = await pg.evaluate("({tag:document.querySelectorAll('.wear .rar.ev').length, lock:[...document.querySelectorAll('.wear.locked')].filter(e=>e.innerText.includes('イベントでもらえる')).length, z:document.querySelector('.zk-top').innerText})")
    check(r['tag'] == 24 and r['lock'] == 22 and '/ 50' in r['z'], f'イベントのきせかえ：更衣室（{r}）')
    await pg.click('[data-wear="ev_hakama"]'); await pg.wait_for_timeout(300)
    r = await pg.evaluate("({eq:S.cat.equip.suit, front:!!document.querySelector('#catBody .pc-front, .pc-front'), back:!!document.querySelector('.pc-back')})")
    check(r['eq'] == 'ev_hakama' and r['front'] and r['back'], f'イベントのきせかえ：着る（体の前・うしろ）（{r}）')
    await pg.evaluate("document.querySelector('.wear-grid').scrollIntoView({block:'end'})"); await shot(pg, 'event-ip13-wardrobe')
    check(not pg.errs, f'イベントのきせかえ エラーなし {pg.errs[:2]}')
    await ctx.close()
    # 7) せってい（発表用）
    ctx, pg = await page(b, 'se', b103())
    await start(pg); await pg.click('#btnSettings'); await pg.wait_for_timeout(300)
    n = await pg.evaluate("document.querySelectorAll('[data-setev]').length")
    await pg.click('[data-setev="xmas"]'); await pg.wait_for_timeout(300)
    r = await pg.evaluate(f"({{n:{n}, now:eventNow().id, pick:{SAVED}.ev.pick, pressed:document.querySelector('[data-setev=\"xmas\"]').getAttribute('aria-pressed')}})")
    check(r == {'n': 6, 'now': 'xmas', 'pick': 'xmas', 'pressed': 'true'}, f'イベント：せっていで かえる（{r}）')
    await pg.evaluate("document.querySelector('[data-setev]').scrollIntoView({block:'center'})"); await shot(pg, 'event-se-settings')
    await pg.click('#setBack'); await pg.wait_for_timeout(300); await shot(pg, 'event-se-home-xmas')
    await ctx.close()
    # 8) コインの きまり（アプリ側）：1日3回まで・1回100まで・はじめてクリア1回
    ctx, pg = await page(b, 'ip13', b103(coins=0))
    r = await pg.evaluate("""(()=>{const m=window.nyankaloMini, o=[];
      o.push(m.evResult('halloween', 3200, 91, true)); o.push(m.evResult('halloween', 100, 3, true)); o.push(m.evResult('xmas', 10, 250, false)); o.push(m.evResult('school', 900, 60, false));
      return {o:o.map(x=>[x.given,x.bonus,x.plays]), coins:S.coins, best:S.ev.best.halloween, clear:!!S.ev.clear.halloween, minis:day().minis, ev:day().evPlays, mini:day().miniRewards}})()""")
    check(r == {'o': [[91, 200, 2], [3, 0, 1], [100, 0, 0], [0, 0, 0]], 'coins': 394, 'best': 3200, 'clear': True, 'minis': 4, 'ev': 3, 'mini': 0}, f'イベントのゲーム：コインの きまり（{r}）')
    await ctx.close()
    # 9) 6つの ゲーム：アプリの中で 開いて、スタート → 3秒で おわる（テスト用）→ けっか → もどる
    for dev in DEV:
        for i, gid in enumerate(EV_IDS):
            ctx, pg = await page(b, dev, b103(coins=0))
            await ctx.add_init_script("window.__errs=[];addEventListener('error',e=>__errs.push(String(e.message)))")
            await start(pg)
            await pg.evaluate(f"openEvGame('{gid}');document.querySelector('#miniFrame iframe').src+='&fast=1'"); await pg.wait_for_timeout(1500)
            fr = pg.frames[-1]
            m = await fr.evaluate("({t:document.querySelector('.eg-title').innerText, start:!!document.getElementById('egStart'), ban:document.querySelector('.eg-banner').complete&&document.querySelector('.eg-banner').naturalWidth>0, over:document.documentElement.scrollWidth>innerWidth+1})")
            check(m['start'] and m['ban'] and not m['over'], f'{dev} {gid}：はじめの画面（{m}）')
            if dev == 'ip13' or i == 0: await shot(pg, f'event-{dev}-game-{gid}-menu')
            await fr.click('#egStart'); await pg.wait_for_timeout(2900)
            box = await pg.evaluate("(()=>{const r=document.querySelector('#miniFrame iframe').getBoundingClientRect();return [r.width,r.height]})()")
            for k in range(4):   # すこし さわる
                x, y = box[0] * (.3 + .13 * k), box[1] * .55
                await pg.mouse.move(x, y); await pg.mouse.down(); await pg.wait_for_timeout(180); await pg.mouse.move(x + 20, y - 10); await pg.mouse.up(); await pg.wait_for_timeout(120)
            h = await fr.evaluate("({hud:!document.getElementById('egHud').hidden, cat:!!document.querySelector('.eg-cat .pc')})")
            check(h['hud'] and h['cat'], f'{dev} {gid}：あそんでいる画面（{h}）')
            if dev == 'ip13' or i == 0: await shot(pg, f'event-{dev}-game-{gid}-play')
            await pg.wait_for_timeout(2600)
            res = await fr.evaluate("({res:!!document.getElementById('egAgain'), say:(document.querySelector('.eg-say')||{}).innerText||''})")
            s = await pg.evaluate(f"(()=>{{const s={SAVED};return {{minis:(s.days[todayStr()]||{{}}).minis||0, best:'{gid}' in s.ev.best}}}})()")
            check(res['res'] and res['say'] and s['minis'] == 1 and s['best'], f'{dev} {gid}：けっか（{res} {s}）')
            if dev == 'ip13' or i == 0: await shot(pg, f'event-{dev}-game-{gid}-result')
            await fr.click('#egHome'); await pg.wait_for_timeout(300); await fr.click('#egBack'); await pg.wait_for_timeout(400)
            e = await fr.evaluate("window.__errs||[]") if not fr.is_detached() else []
            closed = await pg.evaluate("!document.getElementById('miniFrame')")
            errs = await pg.evaluate("window.__errs||[]")
            check(closed and not errs and not e and not pg.errs, f'{dev} {gid}：もどる・エラーなし（{closed} {errs[:2]} {e[:2]} {pg.errs[:2]}）')
            await ctx.close()
    # 10) 前の版から：お知らせ（10.3 → 10.4 は イベントだけ、10.1 からは 10.3 の分も）
    for frm, want103 in (('10.3', False), ('10.1', True)):
        ctx, pg = await page(b, 'se', b103(news=frm, ev=None))
        await start(pg); await pg.wait_for_timeout(400)
        t = await pg.evaluate("document.getElementById('modalBody').innerText")
        check('イベントが はじまったよ' in t and (('おもいで' in t) == want103), f'お知らせ（{frm} から）：{t[:60]!r}')
        if frm == '10.3': await shot(pg, 'event-se-news')
        r = await pg.evaluate("({ev:JSON.stringify(S.ev)})")
        check(r['ev'] == '{"pick":"","best":{},"clear":{}}', f'前の版のデータ：S.ev（{r}）')
        await ctx.close()

GROUPS = [('home', t_home), ('tabs', t_tabs), ('tour', t_tour), ('gacha', t_gacha), ('level', t_level), ('coin', t_coin), ('daily', t_daily), ('first', t_first),
          ('battle', t_battle), ('slot', t_slot), ('sagase', t_sagase), ('font', t_font), ('a11y', t_a11y), ('manifest', t_manifest),
          ('memo', t_memo), ('migrate', t_migrate), ('achieve', t_achieve), ('stone', t_stone), ('meal-delete', t_mealdel), ('event', t_event)]

async def main():
    async with async_playwright() as p:
        bt = getattr(p, BROWSER)
        try:
            if BROWSER == 'chromium' and os.path.exists('/usr/bin/google-chrome'):
                b = await bt.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
            else:
                b = await bt.launch()
        except Exception as e:
            print(f'{BROWSER} が起動できません：{str(e).splitlines()[0]}\n  → python -m playwright install {BROWSER}')
            sys.exit(2)
        print(f'ブラウザ：{BROWSER} {b.version}　アプリ：v{APP_VER}　スクショ：{OUT}')
        for name, fn in GROUPS:
            if ONLY and name not in ONLY: continue
            print('==', name)
            try: await fn(b)
            except Exception as e: FAILS.append(f'{name} 例外 {e}'); traceback.print_exc()
        await b.close()
    print(f'\nOK {len(LOG)}  FAIL {len(FAILS)}')
    for f in FAILS: print(' -', f)
    sys.exit(1 if FAILS else 0)

asyncio.run(main())
