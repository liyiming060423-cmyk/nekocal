"""にゃんカロ の確認テスト（playwright）。v10.1 の t101.py をもとに v10.2 で リポジトリに入れた。

つかいかた（このファイルと同じフォルダで）：
  pip install playwright && python -m playwright install chromium
  python test_nyankalo.py                      … 全部（chromium）
  python test_nyankalo.py home,a11y            … 一部だけ
  python test_nyankalo.py --shots shots        … スクショを shots/ に保存（なしなら保存しない）
  python test_nyankalo.py --browser webkit     … Safari と同じエンジン（python -m playwright install webkit が必要）
  python test_nyankalo.py --app <フォルダ>      … ほかのフォルダのアプリを調べる
グループ：home tabs tour gacha level coin daily first battle slot sagase font a11y manifest
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
 const nm=document.querySelector('.nc-name'), ev=document.querySelector('.ev-txt'), bn=document.querySelector('#eventBanner');
 return {vh:innerHeight, docH:document.documentElement.scrollHeight, tabbar:r('.tabbar'), bottom:r('.h-bottom'), left:r('.h-left'), right:r('.h-right'), bubble:r('#bubble'), cat:r('#catWrap'), stage:r('.h-stage'),
  nameCut: nm.scrollWidth>nm.clientWidth+1, nameW: nm.clientWidth, evOver: ev.getBoundingClientRect().right > bn.getBoundingClientRect().right-3 || ev.scrollWidth>ev.clientWidth+1, evTxt: ev.innerText.replace(/\\n/g,'/'),
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
        await pg.click('#btnGacha'); await pg.wait_for_timeout(400)
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
    await start(pg); await pg.click('#btnGacha'); await pg.wait_for_timeout(300); await pg.click('.bag-hit.b0'); await pg.wait_for_timeout(500)
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

GROUPS = [('home', t_home), ('tabs', t_tabs), ('tour', t_tour), ('gacha', t_gacha), ('level', t_level), ('coin', t_coin), ('daily', t_daily), ('first', t_first),
          ('battle', t_battle), ('slot', t_slot), ('sagase', t_sagase), ('font', t_font), ('a11y', t_a11y), ('manifest', t_manifest)]

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
