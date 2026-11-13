// にゃんカロ さんぽモード（GPS）
// アプリを開いたまま歩くと、GPS で道のりをはかって歩数にする（歩数 = 距離 ÷ 歩幅、歩幅 = 身長 × RULE.strideRate）。
// ・画面が消えたり、ほかのアプリに切りかえると GPS は止まる（スマホのブラウザの制限）。
//   もどったときは、はなれた場所までの「まっすぐの距離」だけ足す（歩く速さのときだけ）。
// ・道のりは歩いている間だけ地図に出し、保存しない（保存するのは歩数だけ）。
// ・地図は Leaflet（leaflet.js / leaflet.css）＋ OpenStreetMap。地図の絵はネットから読む。
// ・1日の歩数は「手で入力」と「さんぽモード」の大きいほう（app.js の applySteps）。
const WALK = {
  maxAcc: 30,       // GPS の誤差がこれ（m）より大きい点は使わない
  minMove: 5,       // これ（m）より小さい動きは GPS のゆれとして数えない
  maxSpeed: 4.5,    // 秒速 4.5m（約16km/h）より速い区間は乗り物とみなして数えない
  gapSec: 20,       // GPS がこれ（秒）より長く止まっていたら「切りかえていた」とみなす
  gapSpeed: 2.5,    //   そのときは 秒速 2.5m（約9km/h）以下のときだけ、まっすぐの距離を足す
  saveSec: 15,      // 保存の間かく（秒）。写真が多いと保存が重いので毎回はしない
  home: [31.9156, 131.4320]   // 位置がわかるまでの地図の中心（宮崎駅あたり）
};
let W = null;

const walkStride = () => (S.user.height || 165) * RULE.strideRate / 100;   // 歩幅（m）
function walkHav(a, b) {   // 2点の距離（m）
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(x));
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

function openWalk() {
  if (W) return;
  if (!('geolocation' in navigator)) { toast('このスマホでは位置情報が使えません。手で入力してください'); return; }
  W = { dist: 0, credited: 0, last: null, segs: [[]], start: Date.now(), watch: null, lock: null, map: null, line: null, dot: null, ring: null,
    free: 0, dirty: false, savedAt: Date.now(), timer: 0, endArmed: 0 };
  const el = document.createElement('div');
  el.className = 'walk'; el.id = 'walk';
  el.innerHTML = `<div class="walk-map" id="walkMap"><div class="walk-maptxt" id="walkMapTxt">地図をよみこみ中…</div></div>
    <div class="walk-panel">
      <div class="walk-cat">${petCatHTML({ breed: S.cat.breed, idx: S.cat.dead ? 0 : S.cat.idx, equip: S.cat.equip, dead: S.cat.dead })}</div>
      <div class="walk-info">
        <div class="walk-title">${esc(S.cat.name)}と さんぽ中</div>
        <div class="walk-nums"><div><b id="wKm">0.00</b><small>km</small></div><div><b id="wSteps">0</b><small>歩</small></div><div><b id="wTime">0:00</b><small>時間</small></div></div>
      </div>
      <div class="walk-next"><span class="walk-bar"><i id="wBar"></i></span><small id="wNext"></small></div>
      <div class="walk-note" id="wNote" role="status">位置情報をさがしています…</div>
      <button class="btn red block walk-end" id="wEnd">おわる</button>
    </div>`;
  document.body.appendChild(el); document.body.classList.add('walk-open');
  $('wEnd').onclick = () => {
    // まちがって押さないように2回タップでおわる
    if (Date.now() - W.endArmed > 3000) { W.endArmed = Date.now(); $('wEnd').textContent = 'もう一度タップでおわる'; setTimeout(() => { if (W && $('wEnd')) $('wEnd').textContent = 'おわる'; }, 3000); return; }
    closeWalk();
  };
  W.watch = navigator.geolocation.watchPosition(walkPos, walkErr, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
  walkLock();
  W.timer = setInterval(walkTick, 1000);
  walkUpdate();
  se('tap');
  loadLeaflet().then(walkMapInit).catch(() => { const t = $('walkMapTxt'); if (t) t.textContent = '地図をよみこめませんでした（GPSは動いています）'; });
}

function walkMapInit() {
  if (!W || W.map || !window.L) return;
  const t = $('walkMapTxt'); if (t) t.remove();
  const c = W.last ? [W.last.lat, W.last.lng] : WALK.home;
  const m = L.map('walkMap', { zoomControl: false, attributionControl: false }).setView(c, W.last ? 17 : 14);
  L.control.attribution({ position: 'topright' }).addTo(m);   // 下はパネルにかくれるので右上に出す（OpenStreetMap の表示は必ず必要）
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' }).addTo(m);
  W.line = L.polyline(W.segs, { color: '#E0573F', weight: 6, opacity: .9, lineCap: 'round', lineJoin: 'round' }).addTo(m);
  W.ring = L.circle(c, { radius: 0, stroke: false, fillColor: '#3A7BD5', fillOpacity: .15 }).addTo(m);
  W.dot = L.circleMarker(c, { radius: 8, color: '#fff', weight: 3, fillColor: '#3A7BD5', fillOpacity: W.last ? 1 : 0, opacity: W.last ? 1 : 0 }).addTo(m);
  // 地図を指で動かしたら、10秒は自分の位置に戻さない
  m.on('dragstart', () => { W.free = Date.now(); });
  W.map = m;
  if (W.cur) walkShow(W.cur);
}
function walkShow(pt) {
  W.cur = pt;
  if (!W.map) return;
  const ll = [pt.lat, pt.lng];
  W.dot.setLatLng(ll).setStyle({ opacity: 1, fillOpacity: 1 });
  W.ring.setLatLng(ll).setRadius(Math.min(pt.acc || 0, 200));
  W.line.setLatLngs(W.segs);
  if (Date.now() - W.free > 10000) W.map.setView(ll, Math.max(W.map.getZoom(), 16), { animate: true });
}
function walkNote(t) { const n = $('wNote'); if (n) n.textContent = t; }

function walkPos(p) {
  if (!W) return;
  const c = p.coords, pt = { lat: c.latitude, lng: c.longitude, t: p.timestamp || Date.now(), acc: c.accuracy };
  if (c.accuracy > WALK.maxAcc) { walkShow(pt); walkNote(`GPSの誤差が大きいです（±${Math.round(c.accuracy)}m）。空が見える場所だとはかりやすいです`); return; }
  if (!W.last) {
    W.last = pt; W.segs[W.segs.length - 1].push([pt.lat, pt.lng]);
    walkNote('GPS OK！ 歩きはじめよう'); walkShow(pt);
    if (W.map) W.map.setView([pt.lat, pt.lng], 17);
    return;
  }
  const d = walkHav(W.last, pt), dt = (pt.t - W.last.t) / 1000;
  if (dt <= 0) return;
  if (d < Math.max(WALK.minMove, Math.min(c.accuracy, 20))) { walkShow(pt); return; }   // ゆれ（同じ場所にいる）
  const gap = dt > WALK.gapSec, sp = d / dt;
  if (sp > (gap ? WALK.gapSpeed : WALK.maxSpeed)) {
    // 乗り物（または切りかえ中に速く移動した）：この区間は数えず、線もいったん切る
    W.last = pt; W.segs.push([[pt.lat, pt.lng]]);
    walkNote(gap ? 'はなれていた間は歩く速さではなかったので、その分は数えません' : '速すぎるので乗り物とみなしました（数えません）');
    walkShow(pt); return;
  }
  W.dist += d; W.last = pt; W.segs[W.segs.length - 1].push([pt.lat, pt.lng]);
  walkNote(gap ? `おかえり！ はなれていた間の ${fmt(Math.round(d))}m（まっすぐの距離）を足しました` : '');
  walkCredit(); walkShow(pt); walkUpdate();
}
function walkErr(e) {
  if (!W) return;
  if (e.code === 1) {
    walkNote('位置情報が許可されていません。スマホの設定で、ブラウザ（Safari / Chrome）の位置情報を「許可」にしてください。');
    const b = $('wEnd'); if (b) { b.textContent = 'もどって手で入力する'; b.onclick = () => { closeWalk(true); openSteps(); }; }
  } else walkNote(e.code === 3 ? 'GPSの応答を待っています…' : '位置がわかりません。屋外で試してください');
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
function walkTick() {
  if (!W) return;
  if (W.dirty && Date.now() - W.savedAt > WALK.saveSec * 1000) { save(); W.dirty = false; W.savedAt = Date.now(); }
  walkUpdate();
}
function walkTime(ms) { const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, ss = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${m}:${String(ss).padStart(2, '0')}`; }
function walkUpdate() {
  if (!W || !$('wKm')) return;
  $('wKm').textContent = (W.dist / 1000).toFixed(2);
  $('wSteps').textContent = fmt(W.credited);
  $('wTime').textContent = walkTime(Date.now() - W.start);
  const d = day(); normSteps(d);
  const u = RULE.stepsUnit, next = (Math.floor(d.steps / u) + 1) * u;
  $('wBar').style.width = `${(d.steps % u) / u * 100}%`;
  $('wNext').textContent = d.stepsGps < d.stepsManual
    ? `今日のさんぽ ${fmt(d.stepsGps)}歩。手入力の ${fmt(d.stepsManual)}歩 をこえると今日の歩数がふえます`
    : `今日 ${fmt(d.steps)}歩・あと ${fmt(next - d.steps)}歩で スタミナ +${RULE.staminaPerUnit}・コイン +${RULE.coinPerUnit}`;
}
async function walkLock() {   // さんぽ中は画面を消さない（対応しているスマホだけ）
  try { if (W && 'wakeLock' in navigator && document.visibilityState === 'visible') W.lock = await navigator.wakeLock.request('screen'); } catch (e) {}
}
document.addEventListener('visibilitychange', () => {
  if (!W) return;
  if (document.visibilityState === 'visible') { walkLock(); walkUpdate(); }
  else if (W.dirty) { save(); W.dirty = false; W.savedAt = Date.now(); }
});

function closeWalk(quiet) {
  if (!W) return;
  const w = W; W = null;
  try { navigator.geolocation.clearWatch(w.watch); } catch (e) {}
  try { if (w.lock) w.lock.release(); } catch (e) {}
  clearInterval(w.timer);
  try { if (w.map) w.map.remove(); } catch (e) {}
  const el = $('walk'); if (el) el.remove();
  document.body.classList.remove('walk-open');
  save(); renderAll();
  if (quiet) return;
  const d = day();
  openModal(`<h2 id="modalTitle">さんぽおわり</h2><div class="stack">
    <div class="walk-sum"><div><b>${(w.dist / 1000).toFixed(2)}</b><small>km</small></div><div><b>${fmt(w.credited)}</b><small>歩</small></div><div><b>${walkTime(Date.now() - w.start)}</b><small>時間</small></div></div>
    <div class="card" style="padding:10px 14px;font-weight:700">今日の歩数 <b>${fmt(d.steps)}歩</b><div class="hint">手で入力 ${fmt(d.stepsManual)}歩／さんぽモード ${fmt(d.stepsGps)}歩（大きいほう）</div></div>
    <p class="hint">道のりは保存していません。保存したのは歩数だけです。</p>
    <button class="btn block" id="walkOk">OK</button></div>`, root => { root.querySelector('#walkOk').onclick = closeModal; });
  se('get');
}
