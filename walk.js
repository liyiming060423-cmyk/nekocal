// にゃんカロ さんぽモード（GPS）
// アプリを開いたまま歩くと、GPS で道のりをはかって歩数にする（歩数 = 距離 ÷ 歩幅、歩幅 = 身長 × RULE.strideRate）。
// ・地図のまわりに「お宝」が出る。近くまで歩くと拾える（数字は data.js の TREASURE）。
// ・画面が消えたり、ほかのアプリに切りかえると GPS は止まる（スマホのブラウザの制限）。
//   もどったときは、はなれた場所までの「まっすぐの距離」だけ足す（歩く速さのときだけ）。
// ・道のりとお宝の場所は歩いている間だけ地図に出し、保存しない（保存するのは歩数とごほうびだけ）。
// ・地図は Leaflet（leaflet.js / leaflet.css）＋ OpenStreetMap。地図の絵はネットから読む。
const WALK = {
  maxAcc: 30,       // GPS の誤差がこれ（m）より大きい点は使わない
  minMove: 5,       // これ（m）より小さい動きは GPS のゆれとして数えない
  maxSpeed: 4.5,    // 秒速 4.5m（約16km/h）より速い区間は乗り物とみなして数えない（お宝も拾えない）
  gapSec: 20,       // GPS がこれ（秒）より長く止まっていたら「切りかえていた」とみなす
  gapSpeed: 2.5,    //   そのときは 秒速 2.5m（約9km/h）以下のときだけ、まっすぐの距離を足す
  saveSec: 15,      // 保存の間かく（秒）。写真が多いと保存が重いので毎回はしない
  zoom: 16,         // 地図の大きさ（お宝が画面に入るくらい）
  home: [31.9156, 131.4320]   // 位置がわかるまでの地図の中心（宮崎駅あたり）
};
let W = null;

const walkStride = () => (S.user.height || 165) * RULE.strideRate / 100;   // 歩幅（m）
function walkHav(a, b) {   // 2点の距離（m）
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(x));
}
function walkOffset(p, dist, deg) {   // p から 方角deg（北=0・東=90）へ dist m 進んだ点
  const r = deg * Math.PI / 180;
  return { lat: p.lat + dist * Math.cos(r) / 111320, lng: p.lng + dist * Math.sin(r) / (111320 * Math.cos(p.lat * Math.PI / 180)) };
}
let leafletP = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve();
  if (leafletP) return leafletP;
  leafletP = new Promise((ok, ng) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = `leaflet.css?v=${APP_VER}`; document.head.appendChild(css);
    const s = document.createElement('script'); s.src = `leaflet.js?v=${APP_VER}`; s.onload = ok; s.onerror = () => { leafletP = null; ng(); }; document.head.appendChild(s);
  });
  return leafletP;
}

// お宝の絵（肉球マークの宝箱）
const TR_SVG = `<svg viewBox="0 0 48 44" width="40" height="37" aria-hidden="true"><ellipse cx="24" cy="41" rx="15" ry="3" fill="rgba(0,0,0,.25)"/>
  <path d="M6 18 Q6 6 24 6 Q42 6 42 18 Z" fill="#F0943F" stroke="#4A2A1A" stroke-width="2.5"/>
  <rect x="6" y="18" width="36" height="20" rx="3" fill="#E0573F" stroke="#4A2A1A" stroke-width="2.5"/>
  <rect x="6" y="16" width="36" height="5" fill="#F7C64B" stroke="#4A2A1A" stroke-width="2"/>
  <ellipse cx="24" cy="30" rx="4.2" ry="3.4" fill="#FFF3D6"/><circle cx="18.5" cy="25.5" r="1.9" fill="#FFF3D6"/><circle cx="22" cy="23.6" r="1.9" fill="#FFF3D6"/><circle cx="26" cy="23.6" r="1.9" fill="#FFF3D6"/><circle cx="29.5" cy="25.5" r="1.9" fill="#FFF3D6"/></svg>`;

function openWalk() {
  if (W) return;
  W = { dist: 0, credited: 0, last: null, segs: [[]], start: Date.now(), watch: null, lock: null, map: null, line: null, dot: null, ring: null,
    free: 0, dirty: false, savedAt: Date.now(), timer: 0, endArmed: 0, cur: null, fast: false, tr: [], got: 0, swapAt: 0 };
  const el = document.createElement('div');
  el.className = 'walk'; el.id = 'walk';
  el.innerHTML = `<div class="walk-map" id="walkMap"><div class="walk-maptxt" id="walkMapTxt">地図をよみこみ中…</div></div>
    <div class="walk-panel">
      <div class="walk-cat">${petCatHTML({ breed: S.cat.breed, idx: S.cat.dead ? 0 : S.cat.idx, equip: S.cat.equip, dead: S.cat.dead })}</div>
      <div class="walk-info">
        <div class="walk-title">${esc(S.cat.name)}と さんぽ中</div>
        <div class="walk-nums"><div><b id="wKm">0.00</b><small>km</small></div><div><b id="wSteps">0</b><small>歩</small></div><div><b id="wTime">0:00</b><small>時間</small></div></div>
      </div>
      <div class="walk-tr"><span class="walk-tr-ico">${TR_SVG}</span><span class="walk-tr-txt"><b id="wTr">お宝 今日 0/${TREASURE.perDay}</b><small id="wTrNear">位置がわかると、まわりにお宝が出ます</small></span>
        <button class="btn small white" id="wSwap" type="button">入れかえ</button></div>
      <div class="walk-next"><span class="walk-bar"><i id="wBar"></i></span><small id="wNext"></small></div>
      <div class="walk-note" id="wNote" role="status">⚠️ 歩きスマホに注意！ 入れない場所のお宝は「入れかえ」で動かせます</div>
      <button class="btn red block walk-end" id="wEnd">おわる</button>
    </div>`;
  document.body.appendChild(el); document.body.classList.add('walk-open');
  $('wEnd').onclick = () => {
    // まちがって押さないように2回タップでおわる
    if (Date.now() - W.endArmed > 3000) { W.endArmed = Date.now(); $('wEnd').textContent = 'もう一度タップでおわる'; setTimeout(() => { if (W && $('wEnd')) $('wEnd').textContent = 'おわる'; }, 3000); return; }
    closeWalk();
  };
  $('wSwap').onclick = () => {
    if (!W.cur) { toast('位置がわかってから使えます'); return; }
    if (trLeft() <= 0) { toast('今日のお宝はおしまいです。また明日！'); return; }
    const wait = Math.ceil(TREASURE.swapWait - (Date.now() - W.swapAt) / 1000);
    if (wait > 0) { toast(`あと${wait}秒で入れかえられます`); return; }
    W.swapAt = Date.now(); walkTrClear(); walkTrFill(W.cur); se('tap'); toast('お宝の場所を入れかえました');
  };
  if (!('geolocation' in navigator)) walkNote('このスマホ（ブラウザ）では位置情報が使えません');
  else W.watch = navigator.geolocation.watchPosition(walkPos, walkErr, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
  walkLock();
  W.timer = setInterval(walkTick, 1000);
  walkUpdate();
  se('tap');
  loadLeaflet().then(walkMapInit).catch(() => { const t = $('walkMapTxt'); if (t) t.textContent = '地図をよみこめませんでした（GPSとお宝は動いています。下の「いちばん近いお宝」を見て歩いてね）'; });
}

function walkMapInit() {
  if (!W || W.map || !window.L) return;
  const t = $('walkMapTxt'); if (t) t.remove();
  const c = W.cur ? [W.cur.lat, W.cur.lng] : WALK.home;
  const m = L.map('walkMap', { zoomControl: false, attributionControl: false }).setView(c, W.cur ? WALK.zoom : 14);
  L.control.attribution({ position: 'topright' }).addTo(m);   // 下はパネルにかくれるので右上に出す（OpenStreetMap の表示は必ず必要）
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' }).addTo(m);
  W.line = L.polyline(W.segs, { color: '#E0573F', weight: 6, opacity: .9, lineCap: 'round', lineJoin: 'round' }).addTo(m);
  W.ring = L.circle(c, { radius: 0, stroke: false, fillColor: '#3A7BD5', fillOpacity: .15 }).addTo(m);
  W.dot = L.circleMarker(c, { radius: 8, color: '#fff', weight: 3, fillColor: '#3A7BD5', fillOpacity: W.cur ? 1 : 0, opacity: W.cur ? 1 : 0 }).addTo(m);
  // 地図を指で動かしたら、10秒は自分の位置に戻さない
  m.on('dragstart', () => { W.free = Date.now(); });
  W.map = m;
  W.tr.forEach(walkTrMark);
  if (W.cur) walkShow(W.cur);
}
function walkShow(pt) {
  W.cur = pt;
  if (!W.map) return;
  const ll = [pt.lat, pt.lng];
  W.dot.setLatLng(ll).setStyle({ opacity: 1, fillOpacity: 1 });
  W.ring.setLatLng(ll).setRadius(Math.min(pt.acc || 0, 200));
  W.line.setLatLngs(W.segs);
  if (Date.now() - W.free > 10000) W.map.setView(ll, Math.max(W.map.getZoom(), WALK.zoom), { animate: true });
}
function walkNote(t) { const n = $('wNote'); if (n) n.textContent = t; }

function walkPos(p) {
  if (!W) return;
  const c = p.coords, pt = { lat: c.latitude, lng: c.longitude, t: p.timestamp || Date.now(), acc: c.accuracy };
  if (c.accuracy > WALK.maxAcc) { if (!W.last) walkShow(pt); walkNote(`GPSの誤差が大きいです（±${Math.round(c.accuracy)}m）。空が見える場所だとはかりやすいです`); return; }
  if (!W.last) {
    W.last = pt; W.segs[W.segs.length - 1].push([pt.lat, pt.lng]);
    walkNote('GPS OK！ 歩きはじめよう（⚠️ 歩きスマホに注意）'); walkShow(pt);
    if (W.map) W.map.setView([pt.lat, pt.lng], WALK.zoom);
    walkTr(pt); walkUpdate();
    return;
  }
  const d = walkHav(W.last, pt), dt = (pt.t - W.last.t) / 1000;
  if (dt <= 0) return;
  if (d < Math.max(WALK.minMove, Math.min(c.accuracy, 20))) { walkShow(pt); if (!W.fast) walkTr(pt); walkUpdate(); return; }   // ゆれ（同じ場所にいる）
  const gap = dt > WALK.gapSec, sp = d / dt;
  if (sp > (gap ? WALK.gapSpeed : WALK.maxSpeed)) {
    // 乗り物（または切りかえ中に速く移動した）：この区間は数えず、線もいったん切る。お宝も拾えない
    W.last = pt; W.segs.push([[pt.lat, pt.lng]]); W.fast = true;
    walkNote(gap ? 'はなれていた間は歩く速さではなかったので、その分は数えません' : '速すぎるので乗り物とみなしました（歩数もお宝も数えません）');
    walkShow(pt); walkUpdate(); return;
  }
  W.fast = false;
  W.dist += d; W.last = pt; W.segs[W.segs.length - 1].push([pt.lat, pt.lng]);
  walkNote(gap ? `おかえり！ はなれていた間の ${fmt(Math.round(d))}m（まっすぐの距離）を足しました` : '');
  walkCredit(); walkShow(pt); walkTr(pt); walkUpdate();
}
function walkErr(e) {
  if (!W) return;
  if (e.code === 1) walkNote('位置情報が許可されていません。スマホの設定で、ブラウザ（Safari / Chrome）の位置情報を「許可」にしてから、もう一度ひらいてください。');
  else walkNote(e.code === 3 ? 'GPSの応答を待っています…' : '位置がわかりません。屋外で試してください');
}
// 歩いた距離を歩数にして、今日の歩数に足す（ごほうびは app.js の applySteps）
function walkCredit() {
  const n = Math.floor(W.dist / walkStride()) - W.credited;
  if (n <= 0) return;
  W.credited += n;
  const d = day(); normSteps(d); d.stepsGps += n;
  const add = applySteps(d);
  W.dirty = true;
  if (add > 0) {
    save(); W.dirty = false; W.savedAt = Date.now();
    toast(`今日 ${fmt(d.steps)}歩！ スタミナ +${add * RULE.staminaPerUnit}・コイン +${add * RULE.coinPerUnit}`); se('coin'); buzz(40);
  }
}

/* ---------- お宝 ---------- */
const trLeft = () => Math.max(0, TREASURE.perDay - (day().treasures || 0));
// 拾う・遠いのを消す・足りない分を出す
function walkTr(pt) {
  for (const t of W.tr.slice()) {
    const dist = walkHav(pt, t);
    if (dist <= TREASURE.pickR) walkTrPick(t);
    else if (dist > TREASURE.awayR) walkTrRemove(t);
    else if (dist <= TREASURE.nearR && !t.near) { t.near = true; buzz(20); walkNote('お宝が近いよ！'); }
  }
  walkTrFill(pt);
}
function walkTrFill(pt) {
  if (trLeft() <= 0) { walkTrClear(); return; }
  let tries = 0;
  while (W.tr.length < Math.min(TREASURE.onMap, trLeft()) && tries++ < 60) {
    const p = walkOffset(pt, TREASURE.minR + Math.random() * (TREASURE.maxR - TREASURE.minR), Math.random() * 360);
    if (W.tr.some(t => walkHav(t, p) < TREASURE.gap)) continue;
    const t = { lat: p.lat, lng: p.lng, near: false, mk: null };
    W.tr.push(t); walkTrMark(t);
  }
}
function walkTrMark(t) {
  if (!W.map || t.mk) return;
  t.mk = L.marker([t.lat, t.lng], { icon: L.divIcon({ className: 'walk-trmk', html: TR_SVG, iconSize: [40, 37], iconAnchor: [20, 34] }), keyboard: false, interactive: false }).addTo(W.map);
}
function walkTrRemove(t) {
  if (t.mk) t.mk.remove();
  W.tr = W.tr.filter(x => x !== t);
}
function walkTrClear() { W.tr.slice().forEach(walkTrRemove); }
function walkTrPick(t) {
  const d = day();
  if ((d.treasures || 0) >= TREASURE.perDay) { walkTrClear(); return; }
  // 中身をきめる
  let r = Math.random() * TREASURE.loot.reduce((a, x) => a + x.w, 0), lt = TREASURE.loot[0];
  for (const x of TREASURE.loot) { r -= x.w; if (r <= 0) { lt = x; break; } }
  let msg;
  if (lt.coin) { const n = lt.coin[0] + Math.floor(Math.random() * (lt.coin[1] - lt.coin[0] + 1)); S.coins += n; msg = `コイン +${n}`; }
  else { S.items[lt.item] = (S.items[lt.item] || 0) + 1; msg = `${(SHOP_ITEMS.find(i => i.id === lt.item) || {}).name || lt.item} ×1`; }
  d.treasures = (d.treasures || 0) + 1; W.got++;
  save(); W.dirty = false; W.savedAt = Date.now();
  if (t.mk) { const e = t.mk.getElement(); if (e) e.classList.add('got'); setTimeout(() => t.mk && t.mk.remove(), 500); }
  W.tr = W.tr.filter(x => x !== t);
  toast(`お宝ゲット！ ${msg}`); se('get'); buzz([30, 40, 60]);
  walkNote(d.treasures >= TREASURE.perDay ? `今日のお宝はぜんぶ拾いました（${TREASURE.perDay}/${TREASURE.perDay}）。また明日！` : `お宝ゲット！ ${msg}`);
}

function walkTick() {
  if (!W) return;
  if (W.dirty && Date.now() - W.savedAt > WALK.saveSec * 1000) { save(); W.dirty = false; W.savedAt = Date.now(); }
  walkUpdate();
}
function walkTime(ms) { const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, ss = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${m}:${String(ss).padStart(2, '0')}`; }
const DIR8 = ['北', '北東', '東', '南東', '南', '南西', '西', '北西'];
function walkUpdate() {
  if (!W || !$('wKm')) return;
  $('wKm').textContent = (W.dist / 1000).toFixed(2);
  $('wSteps').textContent = fmt(W.credited);
  $('wTime').textContent = walkTime(Date.now() - W.start);
  const d = day(); normSteps(d);
  const u = RULE.stepsUnit, next = (Math.floor(d.steps / u) + 1) * u;
  $('wBar').style.width = `${(d.steps % u) / u * 100}%`;
  $('wNext').textContent = d.stepsGps < d.stepsManual
    ? `今日のさんぽ ${fmt(d.stepsGps)}歩（前に手で入れた ${fmt(d.stepsManual)}歩 をこえると、今日の歩数がふえます）`
    : `今日 ${fmt(d.steps)}歩・あと ${fmt(next - d.steps)}歩で スタミナ +${RULE.staminaPerUnit}・コイン +${RULE.coinPerUnit}`;
  $('wTr').textContent = `お宝 今日 ${d.treasures || 0}/${TREASURE.perDay}`;
  // いちばん近いお宝（地図が出ないときも、これを見て歩ける）
  let near = null, nd = Infinity;
  if (W.cur) for (const t of W.tr) { const x = walkHav(W.cur, t); if (x < nd) { nd = x; near = t; } }
  if (trLeft() <= 0) $('wTrNear').textContent = '今日はもうおしまい。また明日！';
  else if (near) {
    const dy = (near.lat - W.cur.lat) * 111320, dx = (near.lng - W.cur.lng) * 111320 * Math.cos(W.cur.lat * Math.PI / 180);
    const deg = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
    $('wTrNear').textContent = `いちばん近いお宝：${DIR8[Math.round(deg / 45) % 8]}へ ${fmt(Math.round(nd))}m`;
  }
}
async function walkLock() {   // さんぽ中は画面を消さない（対応しているスマホだけ）
  try { if (W && 'wakeLock' in navigator && document.visibilityState === 'visible') W.lock = await navigator.wakeLock.request('screen'); } catch (e) {}
}
document.addEventListener('visibilitychange', () => {
  if (!W) return;
  if (document.visibilityState === 'visible') { walkLock(); walkUpdate(); }
  else if (W.dirty) { save(); W.dirty = false; W.savedAt = Date.now(); }
});

function closeWalk() {
  if (!W) return;
  const w = W; W = null;
  try { if (w.watch != null) navigator.geolocation.clearWatch(w.watch); } catch (e) {}
  try { if (w.lock) w.lock.release(); } catch (e) {}
  clearInterval(w.timer);
  try { if (w.map) w.map.remove(); } catch (e) {}
  const el = $('walk'); if (el) el.remove();
  document.body.classList.remove('walk-open');
  save(); renderAll();
  if (!w.cur && !w.credited) return;   // 位置がわからないまま閉じたときは、まとめを出さない
  const d = day();
  openModal(`<h2 id="modalTitle">さんぽおわり</h2><div class="stack">
    <div class="walk-sum"><div><b>${(w.dist / 1000).toFixed(2)}</b><small>km</small></div><div><b>${fmt(w.credited)}</b><small>歩</small></div><div><b>${w.got}</b><small>お宝</small></div></div>
    <div class="card" style="padding:10px 14px;font-weight:700">今日の歩数 <b>${fmt(d.steps)}歩</b>・お宝 ${d.treasures || 0}/${TREASURE.perDay}<div class="hint">さんぽ時間 ${walkTime(Date.now() - w.start)}</div></div>
    <p class="hint">道のりとお宝の場所は保存していません。保存したのは歩数とごほうびだけです。</p>
    <button class="btn block" id="walkOk">OK</button></div>`, root => { root.querySelector('#walkOk').onclick = closeModal; });
  se('get');
}
