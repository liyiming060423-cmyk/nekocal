// にゃんカロ ショップ・ガチャ
// アイテムの購入・福袋ガチャ（天井つき）
// （v10.0 で app.js から分けた。読みこむ順番は index.html。ほかのファイルの関数・変数はそのまま使える）
'use strict';

/* =========================================================
   8. ショップ
   ========================================================= */
// v9.8：石（💎）は手に入れる方法も使い道もないので表示をやめた（S.stones はデータに残す）
function balanceHTML() { return `<span class="pill coin-target">${I.coin}<span class="num coin-num">${coinText()}</span></span>`; }   // v10.1：coin-num＝数字が動く、coin-target＝コインが飛んでくる所（fx.js）
const shopQty = { drink: 1, protein: 1, goldbag: 1 };
function renderShop() {
  $('shopBalance').innerHTML = balanceHTML();
  $('shopSeg').querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', b.dataset.v === UI.shopTab));
  if (UI.shopTab === 'shop') {
    $('shopBody').innerHTML = `
      <div class="section-title">アイテム</div>
      <div class="list">${SHOP_ITEMS.filter(it => it.shop !== false).map(it => `<div class="card shop-item"><div class="ico">${I[it.id]}</div><div><div class="name" style="font-weight:900">${esc(it.name)}</div><div class="hint">${esc(it.desc)}　もっている：${S.items[it.id] || 0}</div><div class="price">${I.coin.replace('width="24" height="24"', 'width="18" height="18" style="vertical-align:-3px"')} ${fmt(it.price)}</div></div>
        <div class="buy-row"><span class="stepper"><button type="button" data-dec="${it.id}" aria-label="へらす">−</button><output>${shopQty[it.id]}</output><button type="button" data-inc="${it.id}" aria-label="ふやす">＋</button></span><button class="btn small" data-buy="${it.id}">購入</button></div></div>`).join('')}</div>`;
  } else {
    $('shopBody').innerHTML = `<div class="scene shop-scene">
      <img src="shop-bg.webp" alt="猫の店員がいる福袋ガチャのお店の絵" width="900" height="762">
      <span class="shop-say">いらっしゃいだニャ！</span>
      ${['緑の福袋', '麻の福袋', '赤の福袋', '白の福袋'].map((n, i) => `<button class="bag-hit b${i}" data-bag="${i}" aria-label="${n}をえらぶ（${GACHA_COST}コイン）"></button>`).join('')}
    </div>
    <div class="card gacha-info"><div class="gacha-cost">1回引く：<b class="num">${GACHA_COST}</b>コイン<span class="muted">　もっている ${fmt(S.coins)}</span></div>
      <div class="gacha-pity">${pityHTML()}</div>
      <p class="hint">福袋をタップすると引けます。きせかえとトレーニングアイテムが出ます。SR ${GACHA_RATE.SR}%・R ${GACHA_RATE.R}%・N ${GACHA_RATE.N}%　${GACHA_PITY}回のうちに SR が必ず出ます（まだ持っていないきせかえから先に出ます）　かぶったら ${DUP_REFUND}コインに交換</p></div>`;
  }
}
$('shopSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; UI.shopTab = b.dataset.v; se('tap'); renderShop(); });
$('shopBody').addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.inc) { shopQty[t.dataset.inc] = Math.min(9, shopQty[t.dataset.inc] + 1); renderShop(); }
  else if (t.dataset.dec) { shopQty[t.dataset.dec] = Math.max(1, shopQty[t.dataset.dec] - 1); renderShop(); }
  else if (t.dataset.buy) {
    const it = SHOP_ITEMS.find(x => x.id === t.dataset.buy), n = shopQty[it.id], cost = it.price * n;
    if (S.coins < cost) { toast(`コインが ${fmt(cost - S.coins)} 足りません`); se('bad'); return; }
    S.coins -= cost; S.items[it.id] = (S.items[it.id] || 0) + n; shopQty[it.id] = 1; save(); se('coin'); buzz(); toast(`${it.name} ×${n} を買いました`); renderAll();
  }
  else if (t.dataset.bag) { t.classList.add('picked'); setTimeout(() => confirmGacha(+t.dataset.bag), 300); }
});
const BAG_NAMES = ['緑の福袋', '麻の福袋', '赤の福袋', '白の福袋'];
// 天井までの表示（あと何回で SR 確定か）
const pityLeft = () => Math.max(1, GACHA_PITY - (S.pity || 0));
const pityHTML = () => pityLeft() === 1 ? '<b>つぎの1回は SR 確定！</b>' : `SR 確定まで あと <b class="num">${pityLeft()}</b> 回`;
function confirmGacha(bag) {
  bag = bag ?? rand(0, 3);
  const enough = S.coins >= GACHA_COST;
  openModal(`<h2 id="modalTitle">${BAG_NAMES[bag]}を引く？</h2><div class="reveal">
    <div class="item-big">${I.luckyBag}</div>
    <div style="font-weight:900;font-size:18px">${I.coin.replace('width="24" height="24"', 'width="20" height="20" style="vertical-align:-4px"')} ${fmt(GACHA_COST)}コインを使います</div>
    <div class="hint">もっているコイン：${fmt(S.coins)} → ${enough ? fmt(S.coins - GACHA_COST) : 'たりません'}</div>
    <div class="gacha-pity">${pityHTML()}</div>
    <button class="btn block" id="gYes" ${enough ? '' : 'disabled'}>はい、引く！</button>
    <button class="btn white block" id="gNo">やめる</button></div>`, root => {
    root.querySelector('#gYes').onclick = () => { closeModal(); pullGacha(); };
    root.querySelector('#gNo').onclick = closeModal;
  });
}
function pullGacha() {
  if (S.coins < GACHA_COST) { toast(`コインが ${fmt(GACHA_COST - S.coins)} 足りません`); se('bad'); return; }
  S.coins -= GACHA_COST; guideHit('gacha');
  // 天井：SR が出ないまま GACHA_PITY 回目になったら SR 確定（S.pity = 前の SR から何回引いたか）
  const since = (S.pity || 0) + 1, r = Math.random() * 100;
  const rar = r < GACHA_RATE.SR || since >= GACHA_PITY ? 'SR' : r < GACHA_RATE.SR + GACHA_RATE.R ? 'R' : 'N';
  S.pity = rar === 'SR' ? 0 : since;
  let wears = Object.keys(WEAR).filter(k => WEAR[k].rar === rar && k !== 'band_none' && k !== 'suit_none');
  // まだ持っていないきせかえから先に出す（v9.4 から N・R も）。SR はそのあいだ金のサンドバッグも出ない
  // N・R はアイテム（ドリンク・プロテイン）はそのまま出る。ぜんぶ持っていたら、かぶり（コインに交換）もあり
  const hasNew = wears.some(k => !S.owned.includes(k)), srNew = rar === 'SR' && hasNew;
  if (hasNew) wears = wears.filter(k => !S.owned.includes(k));
  wears = wears.map(k => ({ wear: k }));
  const pool = srNew ? wears : wears.concat((GACHA_ITEMS[rar] || []).map(x => ({ item: x.id, n: x.n })));
  const got = pool[Math.floor(Math.random() * pool.length)];
  let body, refund = 0, label = '';
  if (got.item) {
    const it = SHOP_ITEMS.find(x => x.id === got.item);
    S.items[got.item] = (S.items[got.item] || 0) + got.n; label = `${it.name} ×${got.n}`;
    body = `<div class="g-stage ${rar}"><span class="g-rays"></span><div class="item-big ${rar}">${I[got.item]}</div></div><span class="rar ${rar}">${rar}</span>
      <div style="font-weight:900;font-size:20px">${esc(it.name)} ×${got.n}</div><div class="hint">トレーニングアイテム：${esc(it.desc)}</div>
      <p style="margin:0;font-weight:900">「あそぶ」→ ジム の「もちもの」に入りました</p>`;
  } else {
    const id = got.wear, w = WEAR[id], dup = S.owned.includes(id); label = w.name;
    if (dup) { S.coins += DUP_REFUND; refund = DUP_REFUND; } else S.owned.push(id);
    // v10.1：着てみたところを見せる（コスチュームを着ていると 頭・服 が見えないので、頭・服・手 のときは ぬいで見せる）
    const tryEq = Object.assign({}, S.cat.equip, { [w.slot]: id }, w.slot === 'suit' ? {} : { suit: 'suit_none' });
    body = `<div class="g-stage ${rar}"><span class="g-rays"></span><div class="g-cat">${petCatHTML({ breed: S.cat.breed, idx: S.cat.idx, equip: tryEq })}</div><span class="g-badge">${wearIcon(id)}</span></div><span class="rar ${rar}">${rar}</span>
      <div style="font-weight:900;font-size:20px">${esc(w.name)}</div><div class="hint">${SLOT_NAME[w.slot]}のきせかえ${w.bonus ? '　' + Object.entries(w.bonus).map(([k, v]) => `${STAT_NAME[k]}+${v}`).join(' ') : ''}</div>
      ${dup ? `<p style="margin:0;font-weight:900">もう持っていたので ${DUP_REFUND}コインに交換しました</p>` : `<button class="btn block" id="equipNow" data-slot="${w.slot}" data-id="${id}">さっそく着る</button>`}`;
  }
  save(); renderShop();   // 結果は ここで保存ずみ（演出の途中で閉じても なくならない）。うしろの残高も へらしておく
  // v10.1：福袋がゆれて光る（fx.js の gachaOpen）→ 結果。レア度で光りかたが変わる（N なし・R 青・SR 金＋紙ふぶき）
  gachaOpen(rar, root => {
    se(rar === 'SR' ? 'get' : 'coin'); buzz(rar === 'SR' ? [60, 40, 60] : 40);
    root.innerHTML = `<h2 id="modalTitle">${rar === 'SR' ? '大当たり！' : 'でたよ！'}</h2><div class="reveal g-res ${rar}">${rar === 'SR' ? confettiHTML() : ''}${body}
      <div class="gacha-pity">${pityHTML()}</div>
      <button class="btn white block" id="againG">もう1回（${GACHA_COST}コイン）</button></div>`;
    const eq = root.querySelector('#equipNow'); if (eq) eq.onclick = () => { S.cat.equip[eq.dataset.slot] = eq.dataset.id; if (eq.dataset.slot !== 'suit') S.cat.equip.suit = 'suit_none'; guideHit('wear'); save(); closeModal(); toast('着がえました'); };
    root.querySelector('#againG').onclick = () => { closeModal(); confirmGacha(); };
    if (refund) setTimeout(() => coinFx(refund, root.querySelector('.g-stage')), 450);
  }, label);
}
