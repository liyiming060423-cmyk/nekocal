// にゃんカロ イベント（v10.4）
// 6つのイベント（新学年・梅雨・サマー・ハロウィン・クリスマス・お正月）：ホームの背景・タイトルの字・BGM・イベントページ・イベントガチャ・ミニゲーム
// 数字・名前・絵の場所は data.js の EVENTS / EVENT_MODE / EV_GAME。ミニゲームの中身は evgame.html（evgame.js ＋ 各ゲーム）
// （読みこむ順番は index.html：train.js のあと。ほかのファイルの関数・変数はそのまま使える）
'use strict';

/* ---------- いまのイベント ---------- */
const evList = () => EVENTS.filter(e => e.on);
const evById = id => EVENTS.find(e => e.id === id && e.on) || null;
const evFile = (e, kind) => `ev-${e.id}-${kind}`;
// EVENT_MODE 'all'：イベントページ（とせってい）で えらんだもの。'rotate'：日がわり（せっていで 発表用に固定もできる）
function eventNow(t = todayStr()) {
  const L = evList(); if (!L.length) return null;
  if (EVENT_MODE === 'rotate') {
    const fix = S.settings.event;
    if (fix && fix !== 'auto' && evById(fix)) return evById(fix);
    return evRotate(t);
  }
  return evById(S.ev.pick) || L[0];
}
function evRotate(t) { const L = evList(), n = daysBetween(EVENT_BASE, t); return L[((n % L.length) + L.length) % L.length]; }
function evPick(id) {
  if (!evById(id)) return;
  if (EVENT_MODE === 'rotate') S.settings.event = id; else S.ev.pick = id;
  save(); evTheme();
}
const evLeft = e => e.wears.filter(k => !S.owned.includes(k));          // まだ持っていない きせかえ
const evPlaysLeft = () => Math.max(0, EV_GAME.plays - (day().evPlays || 0));   // きょう コインがもらえる のこり回数（6つのゲーム あわせて）

/* ---------- 見た目（ホームの背景・タイトル画面） ---------- */
function evTheme() {
  const e = eventNow();
  const home = $('tab-home'), title = $('title');
  if (home) home.style.backgroundImage = e ? `url("${evFile(e, 'home.webp')}")` : '';
  if (title) title.style.backgroundImage = e ? `linear-gradient(rgba(255, 246, 230, .45), rgba(253, 233, 201, .8)), url("${evFile(e, 'home.webp')}")` : '';
  document.documentElement.style.setProperty('--ev', e ? e.color : '#F08A3C');
  document.documentElement.style.setProperty('--ev2', e ? e.color2 : '#FFF1D6');
}
// ホームのバナー（入院・きのうの記録・はじめてガイドが ないとき）
function evBannerHTML(e) {
  return `<span class="evb-in"><small>${e.icon} イベント</small><img src="${evFile(e, 'banner.webp')}" alt="${esc(e.gacha)}" width="640" height="120"></span>`;
}
// ホームの右下のボタン（D44：ガチャのボタンの場所）
function evButtonHTML(e) {
  return `<span class="evbtn-bag"><img src="${evFile(e, 'bag.webp')}" alt="" width="64" height="64"><i class="evbtn-spark" aria-hidden="true"></i></span><span>イベント</span><span class="dot" id="dotGacha" hidden></span>`;
}

/* ---------- イベントページ ---------- */
function evChipsHTML(cur, attr = 'data-evpick') {
  if (EVENT_MODE !== 'all') return '';
  return `<div class="ev-chips" role="group" aria-label="イベントをえらぶ">${evList().map(e => `<button type="button" class="ev-chip" ${attr}="${e.id}" aria-pressed="${e.id === cur.id}" style="--c:${e.color}"><span aria-hidden="true">${e.icon}</span>${esc(e.name)}</button>`).join('')}</div>`;
}
// えらんでいる イベントの ボタンが 見えるように（よこに スクロール）
function evChipsScroll(root) {
  root.querySelectorAll('.ev-chips').forEach(box => { const b = box.querySelector('[aria-pressed="true"]'); if (b) box.scrollLeft = Math.max(0, b.offsetLeft - (box.clientWidth - b.offsetWidth) / 2); });
}
function evWearsHTML(e) {
  return `<div class="ev-wears">${e.wears.map(k => {
    const w = WEAR[k], got = S.owned.includes(k);
    return `<div class="ev-wear${got ? ' got' : ''}" aria-label="${got ? esc(w.name) : 'まだ持っていない ' + w.rar + ' のきせかえ'}">${got ? wearIcon(k) : '<span class="q" aria-hidden="true">？</span>'}<span class="rar ${w.rar}">${w.rar}</span></div>`;
  }).join('')}</div>`;
}
function evHubHTML() {
  const e = eventNow(); if (!e) return '';
  const best = S.ev.best[e.id] || 0, cleared = !!S.ev.clear[e.id], left = evLeft(e).length, plays = evPlaysLeft();
  const next = EVENT_MODE === 'rotate' ? evRotate(addDays(todayStr(), 1)) : null;
  return `${evChipsHTML(e)}
    <div class="evh-hero" style="background-image:url('${evFile(e, 'home.webp')}')">
      <img src="${evFile(e, 'banner.webp')}" alt="${esc(e.gacha)}" width="640" height="120">
      <p>${EVENT_MODE === 'all' ? `テスト中：6つ ぜんぶ あそべるよ` : `きょうのイベントは「${esc(e.name)}」${next && next.id !== e.id ? `　あしたは ${next.icon}${esc(next.name)}` : ''}`}</p>
    </div>
    <div class="card evh-card">
      <div class="evh-ct"><span class="evh-ico" aria-hidden="true">🎮</span><div><b>${esc(e.game)}</b><small>${esc(e.gameDesc)}</small></div></div>
      <div class="evh-rows">
        <div><span>いちばんの点</span><b class="num">${best ? fmt(best) : '—'}</b></div>
        <div><span>はじめてクリア</span><b>${cleared ? '✔ クリアずみ' : `+${EV_GAME.clear}コイン`}</b></div>
        <div><span>きょう コインがもらえる</span><b>${plays ? `あと <span class="num">${plays}</span> 回` : 'あしたまで おやすみ'}</b></div>
      </div>
      <button class="btn block" data-evgame="${e.id}">あそぶ</button>
      <p class="hint" style="margin:6px 0 0">コインがもらえるのは 6つのゲームを あわせて 1日${EV_GAME.plays}回まで（1回 最大${EV_GAME.max}コイン）。そのあとも あそべます。</p>
    </div>
    <div class="card evh-card">
      <div class="evh-ct"><span class="evh-ico ev-bagico" aria-hidden="true"><img src="${evFile(e, 'bag.webp')}" alt="" width="64" height="64"></span><div><b>${esc(e.gacha)}</b><small>${left ? `まだ持っていない きせかえが かならず出る！（のこり ${left}/${e.wears.length}）` : 'コンプリート！ ぜんぶ そろったよ'}</small></div></div>
      ${evWearsHTML(e)}
      <button class="btn block ${left ? '' : 'white'}" data-evgacha="${e.id}">${left ? `ガチャへ（1回 ${fmt(EV_GACHA_COST)}コイン）` : 'ガチャを見る'}</button>
    </div>`;
}
function openEventHub() {
  const e = eventNow(); if (!e) { UI.shopTab = 'gacha'; setTab('shop'); return; }
  let el = $('evHub');
  if (!el) {
    el = document.createElement('div'); el.id = 'evHub'; el.className = 'ev-hub';
    el.innerHTML = `<div class="evh-sheet" role="dialog" aria-modal="true" aria-labelledby="evhTitle">
      <div class="evh-head"><button type="button" class="back-btn" id="evhBack">‹ もどる</button><h2 id="evhTitle">イベント</h2><span class="pill coin-target">${I.coin}<span class="num" id="evhCoins"></span></span></div>
      <div class="evh-body" id="evhBody"></div></div>`;
    document.body.appendChild(el);
    el.addEventListener('click', evHubClick);
    el.addEventListener('keydown', ev => { if (ev.key === 'Escape') closeEventHub(); });
  }
  renderEventHub();
  trapOpen(el, $('evhBack'));
  bgmUpdate();
}
function renderEventHub() {
  if (!$('evHub')) return;
  $('evhBody').innerHTML = evHubHTML(); evChipsScroll($('evhBody'));
  $('evhCoins').textContent = fmt(S.coins);
  const e = eventNow(); if (e) $('evHub').style.setProperty('--c', e.color);
}
function closeEventHub() {
  const el = $('evHub'); if (!el) return;
  trapClose(el); el.remove(); renderAll();
}
function evHubClick(ev) {
  const b = ev.target.closest('button'); if (!b) return;
  if (b.id === 'evhBack') { se('tap'); closeEventHub(); return; }
  if (b.dataset.evpick) { se('tap'); evPick(b.dataset.evpick); renderEventHub(); renderHome(); bgmUpdate(); const f = $('evhBody').querySelector(`[data-evpick="${b.dataset.evpick}"]`); if (f) f.focus({ preventScroll: true }); return; }
  if (b.dataset.evgame) { se('tap'); openEvGame(b.dataset.evgame); return; }
  if (b.dataset.evgacha) { se('tap'); closeEventHub(); UI.shopTab = 'gacha'; UI.gachaMode = 'ev'; setTab('shop'); }
}

/* ---------- イベントガチャ（D40：まだ持っていないものから。4つ そろったら引けない） ---------- */
function confirmEvGacha(e, bag) {
  const left = evLeft(e); if (!left.length) { toast('コンプリートしています'); return; }
  bag = bag ?? rand(0, 3);
  const enough = S.coins >= EV_GACHA_COST;
  openModal(`<h2 id="modalTitle">${esc(e.bagNames[bag])}を引く？</h2><div class="reveal">
    <div class="item-big ev-bagbig"><img src="${evFile(e, 'bag.webp')}" alt="" width="96" height="96"></div>
    <div style="font-weight:900;font-size:18px">${I.coin.replace('width="24" height="24"', 'width="20" height="20" style="vertical-align:-4px"')} ${fmt(EV_GACHA_COST)}コインを使います</div>
    <div class="hint">もっているコイン：${fmt(S.coins)} → ${enough ? fmt(S.coins - EV_GACHA_COST) : 'たりません'}</div>
    <div class="gacha-pity">まだ持っていない きせかえが かならず出る（のこり <b class="num">${left.length}</b>）</div>
    <button class="btn block" id="gYes" ${enough ? '' : 'disabled'}>はい、引く！</button>
    <button class="btn white block" id="gNo">やめる</button></div>`, root => {
    root.querySelector('#gYes').onclick = () => { closeModal(); pullEvGacha(e); };
    root.querySelector('#gNo').onclick = closeModal;
  });
}
function pullEvGacha(e) {
  const left = evLeft(e);
  if (!left.length) { toast('コンプリートしています'); return; }
  if (S.coins < EV_GACHA_COST) { toast(`コインが ${fmt(EV_GACHA_COST - S.coins)} 足りません`); se('bad'); return; }
  // レア度の重みは いつもの福袋と同じ（GACHA_RATE）。のこっているレア度の中から えらぶ
  const rars = [...new Set(left.map(k => WEAR[k].rar))], tot = rars.reduce((a, r) => a + GACHA_RATE[r], 0);
  let x = Math.random() * tot, rar = rars[rars.length - 1];
  for (const r of rars) { if ((x -= GACHA_RATE[r]) < 0) { rar = r; break; } }
  const pool = left.filter(k => WEAR[k].rar === rar), id = pool[Math.floor(Math.random() * pool.length)], w = WEAR[id];
  S.coins -= EV_GACHA_COST; guideHit('gacha');
  S.owned.push(id);
  memoAdd('ev_' + e.id);   // おもいで：そのイベントで はじめて
  const done = !evLeft(e).length;
  save(); renderShop();   // 結果は ここで保存ずみ（演出の途中で閉じても なくならない）
  const tryEq = Object.assign({}, S.cat.equip, { suit: id });
  const body = `<div class="g-stage ${rar}"><span class="g-rays"></span><div class="g-cat">${petCatHTML({ breed: S.cat.breed, idx: S.cat.idx, equip: tryEq })}</div><span class="g-badge">${wearIcon(id)}</span></div><span class="rar ${rar}">${rar}</span>
    <div style="font-weight:900;font-size:20px">${esc(w.name)}</div><div class="hint">${esc(e.name)}イベントの コスチューム（見た目だけ）</div>
    <button class="btn block" id="equipNow" data-id="${id}">さっそく着る</button>`;
  gachaOpen(rar, root => {
    se(rar === 'SR' ? 'get' : 'coin'); buzz(rar === 'SR' ? [60, 40, 60] : 40);
    root.innerHTML = `<h2 id="modalTitle">${done ? 'コンプリート！' : rar === 'SR' ? '大当たり！' : 'でたよ！'}</h2><div class="reveal g-res ${rar}">${rar === 'SR' || done ? confettiHTML() : ''}${body}
      ${done ? `<p style="margin:0;font-weight:900">${esc(e.gacha)}の きせかえが ぜんぶ そろったよ！</p>` : `<div class="gacha-pity">のこり <b class="num">${evLeft(e).length}</b> / ${e.wears.length}</div>
      <button class="btn white block" id="againG">もう1回（${fmt(EV_GACHA_COST)}コイン）</button>`}</div>`;
    const eq = root.querySelector('#equipNow');
    eq.onclick = () => { S.cat.equip.suit = eq.dataset.id; guideHit('wear'); save(); closeModal(); toast(`${w.name} を着たよ`); };
    const ag = root.querySelector('#againG'); if (ag) ag.onclick = () => { closeModal(); confirmEvGacha(e); };
  }, w.name);
}

/* ---------- イベントのミニゲーム（evgame.html を iframe で開く。閉じかた・BGM は ほかのミニゲームと同じ） ---------- */
function openEvGame(id) {
  const e = evById(id); if (!e || $('miniFrame')) return;
  const w = document.createElement('div');
  w.className = 'mini-frame'; w.id = 'miniFrame';
  w.innerHTML = `<iframe src="evgame.html?e=${e.id}&v=${APP_VER}" title="${esc(e.game)}" allow="autoplay"></iframe>`;
  document.body.appendChild(w); document.body.classList.add('mini-open'); bgmUpdate();
}
// evgame.js から呼ぶ（train.js の window.nyankaloMini に足す）
Object.assign(window.nyankaloMini, {
  evInfo: id => {
    const e = evById(id) || EVENTS.find(x => x.id === id);
    return Object.assign(window.nyankaloMini.info(), {
      ev: e ? { id: e.id, name: e.name, game: e.game, color: e.color, color2: e.color2 } : null,
      plays: evPlaysLeft(), perMax: EV_GAME.max, clearBonus: EV_GAME.clear, cleared: !!S.ev.clear[id], best: S.ev.best[id] || 0,
      bgm: S.settings.bgm !== false, reduced: !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)
    });
  },
  // 1回あそんだ結果：score＝点、coins＝点から決めたコイン（ゲームの中で計算）、cleared＝クリアの条件をみたしたか
  evResult: (id, score, coins, cleared) => {
    const e = evById(id); if (!e) return { given: 0, bonus: 0, best: 0, newBest: false, plays: 0 };
    const d = day(); bumpMini(d);   // ミッション・ずっとミッションの「ミニゲーム」に数える
    score = Math.max(0, Math.round(score || 0));
    const old = S.ev.best[id] || 0, newBest = score > old; S.ev.best[id] = Math.max(old, score);
    let given = 0, bonus = 0;
    coins = Math.max(0, Math.min(EV_GAME.max, Math.round(coins || 0)));
    if (coins > 0 && (d.evPlays || 0) < EV_GAME.plays) { d.evPlays = (d.evPlays || 0) + 1; given = coins; }
    if (cleared && !S.ev.clear[id]) { S.ev.clear[id] = todayStr(); bonus = EV_GAME.clear; }
    S.coins += given + bonus; save();
    return { given, bonus, best: Math.max(old, score), newBest: newBest && old > 0, plays: evPlaysLeft() };
  }
});
