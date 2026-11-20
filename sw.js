// にゃんカロ service worker
// アプリ本体はキャッシュしてオフラインでも起動できるようにする。
// 更新したら VERSION の数字を上げると、利用者のスマホに新しい版が届く。
const VERSION = '10.7';   // index.html などの ?v= と同じ数字にする
const CACHE = 'nekocal-v' + VERSION;
const V = '?v=' + VERSION;
// ↓ ここは bump.py が自動で書く（フォルダの中のファイルから作る。手で直さなくてよい）
// BEGIN APP_FILES
const APP_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './sagase.html',
  './dash.html',
  './slot.html',
  './baseball.html',
  './evgame.html',
  './achieve.js' + V,
  './apple-touch-icon.png',
  './battle.css' + V,
  './battle.js' + V,
  './cat-ev.js' + V,
  './cat.js' + V,
  './daily.js' + V,
  './data.js' + V,
  './ev-halloween-bag.webp',
  './ev-halloween-banner.webp',
  './ev-halloween-gacha.webp',
  './ev-halloween-home.webp',
  './ev-newyear-bag.webp',
  './ev-newyear-banner.webp',
  './ev-newyear-gacha.webp',
  './ev-newyear-home.webp',
  './ev-rainy-bag.webp',
  './ev-rainy-banner.webp',
  './ev-rainy-gacha.webp',
  './ev-rainy-home.webp',
  './ev-school-bag.webp',
  './ev-school-banner.webp',
  './ev-school-gacha.webp',
  './ev-school-home.webp',
  './ev-summer-bag.webp',
  './ev-summer-banner.webp',
  './ev-summer-gacha.webp',
  './ev-summer-home.webp',
  './ev-xmas-bag.webp',
  './ev-xmas-banner.webp',
  './ev-xmas-gacha.webp',
  './ev-xmas-home.webp',
  './event.js' + V,
  './evg-halloween.js' + V,
  './evg-newyear.js' + V,
  './evg-rainy.js' + V,
  './evg-school.js' + V,
  './evg-summer.js' + V,
  './evg-xmas.js' + V,
  './evgame.css' + V,
  './evgame.js' + V,
  './fonts.css' + V,
  './fx.js' + V,
  './grey-body-paw.webp',
  './grey-body.webp',
  './grey-gloves.webp',
  './grey-shirt.webp',
  './grey-tail.webp',
  './gym-bg.webp',
  './history.js' + V,
  './home-bg.webp',
  './home.js' + V,
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './leaflet.css' + V,
  './leaflet.js' + V,
  './longwhite-body-paw.webp',
  './longwhite-body.webp',
  './longwhite-gloves.webp',
  './longwhite-shirt.webp',
  './longwhite-tail.webp',
  './main.js' + V,
  './neko.js' + V,
  './petcat.css' + V,
  './petcat.js' + V,
  './rules.js' + V,
  './sagase.css' + V,
  './settings.js' + V,
  './shop-bg.webp',
  './shop.js' + V,
  './sound.js' + V,
  './state.js' + V,
  './storage.js' + V,
  './style.css' + V,
  './tabby-body-paw.webp',
  './tabby-body.webp',
  './tabby-gloves.webp',
  './tabby-shirt.webp',
  './tabby-tail.webp',
  './train.js' + V,
  './ui.js' + V,
  './util.js' + V,
  './walk.css' + V,
  './walk.js' + V,
  './weekly.js' + V,
  './white-body-paw.webp',
  './white-body.webp',
  './white-gloves.webp',
  './white-shirt.webp',
  './white-tail.webp',
  './zmg-500.woff2' + V,
  './zmg-700.woff2' + V,
  './zmg-900.woff2' + V
];
// END APP_FILES

const GAME_PAGES = ['sagase.html', 'dash.html', 'slot.html', 'baseball.html'];
const NAV_WAIT = 3000;   // 画面を開くとき、ネットの返事をこの時間（ミリ秒）まで待つ

// v9.8：前の版が開いているあいだは、すぐには入れかわらずに待つ（古い画面と新しいファイルが混ざらないように）。
// アプリ（app.js の swWaiting）から 'skip' が来たら入れかわる。はじめての人は待たずにすぐ動く。
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_FILES)));
});
self.addEventListener('message', (e) => { if (e.data === 'skip') self.skipWaiting(); });

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('nekocal-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 画面（HTML）：ネット優先、つながらなければキャッシュ
  // （ミニゲームのページも画面なので、ページごとに別々に保存する）
  // v9.8：電波が弱くて 3 秒たっても返事がないときは、キャッシュの画面を先に出す（ネットの返事が来たら裏でキャッシュを更新）
  if (req.mode === 'navigate') {
    const page = url.pathname.split('/').pop();
    const key = GAME_PAGES.includes(page) ? './' + page : './index.html';
    const net = fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); return caches.open(CACHE).then((c) => c.put(key, copy)).then(() => res, () => res); }
      return res;
    });
    e.waitUntil(net.catch(() => {}));
    e.respondWith(new Promise((resolve) => {
      let done = false;
      const finish = (r) => { if (!done && r) { done = true; resolve(r); } };
      net.then(finish, () => caches.match(key).then((hit) => { if (hit) finish(hit); else if (!done) { done = true; resolve(Response.error()); } }));
      setTimeout(() => { caches.match(key).then(finish); }, NAV_WAIT);
    }));
    return;
  }

  // v10.2：文字は自分のサイトの zmg-*.woff2（下の「自分のファイル」と同じあつかい）。Google Fonts は使わない

  // BGM（mp3）は service worker を通さない（iPhone の Safari は、ここを通すと音楽が鳴らないことがあるため）
  if (url.pathname.endsWith('.mp3')) return;

  // それ以外の自分のファイル：キャッシュ優先
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
  }
});
