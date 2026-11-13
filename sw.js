// にゃんカロ service worker
// アプリ本体はキャッシュしてオフラインでも起動できるようにする。
// 更新したら VERSION の数字を上げると、利用者のスマホに新しい版が届く。
const VERSION = '9.6';   // index.html などの ?v= と同じ数字にする
const CACHE = 'nekocal-v' + VERSION;
const V = '?v=' + VERSION;
const APP_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './style.css' + V,
  './data.js' + V,
  './cat.js' + V,
  './petcat.js' + V,
  './petcat.css' + V,
  './sagase.html',
  './dash.html',
  './slot.html',
  './baseball.html',
  './sagase.css' + V,
  './home-bg.webp',
  './tabby-body.webp',
  './tabby-tail.webp',
  './tabby-shirt.webp',
  './tabby-gloves.webp',
  './white-body.webp',
  './white-tail.webp',
  './white-shirt.webp',
  './white-gloves.webp',
  './longwhite-body.webp',
  './longwhite-tail.webp',
  './longwhite-shirt.webp',
  './longwhite-gloves.webp',
  './grey-body.webp',
  './grey-tail.webp',
  './grey-shirt.webp',
  './grey-gloves.webp',
  './gym-bg.webp',
  './shop-bg.webp',
  './battle.js' + V,
  './battle.css' + V,
  './walk.js' + V,
  './walk.css' + V,
  './leaflet.js' + V,
  './leaflet.css' + V,
  './app.js' + V,
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

const GAME_PAGES = ['sagase.html', 'dash.html', 'slot.html', 'baseball.html'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

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
  if (req.mode === 'navigate') {
    const page = url.pathname.split('/').pop();
    const key = GAME_PAGES.includes(page) ? './' + page : './index.html';
    e.respondWith(
      fetch(req)
        .then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(key, copy)); } return res; })
        .catch(() => caches.match(key))
    );
    return;
  }

  // Google Fonts：キャッシュがあればすぐ使い、裏で更新
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(CACHE).then((c) =>
        c.match(req).then((hit) => {
          const net = fetch(req).then((res) => { c.put(req, res.clone()); return res; }).catch(() => hit);
          return hit || net;
        })
      )
    );
    return;
  }

  // BGM（mp3）は service worker を通さない（iPhone の Safari は、ここを通すと音楽が鳴らないことがあるため）
  if (url.pathname.endsWith('.mp3')) return;

  // それ以外の自分のファイル：キャッシュ優先
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
  }
});
