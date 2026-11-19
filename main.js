// にゃんカロ タブ切りかえ・起動
// setTab・renderAll・1分ごとの確認・起動の順番。いちばん最後に読みこむ
// （v10.0 で app.js から分けた。読みこむ順番は index.html。ほかのファイルの関数・変数はそのまま使える）
'use strict';

/* =========================================================
   12. タブ切りかえ・全体の描画
   ========================================================= */
function setTab(t) {
  UI.tab = t;
  ['home', 'shop', 'train', 'history', 'cat', 'settings'].forEach(k => { $('tab-' + k).hidden = k !== t; });   // v10.1：ねこ（cat）を追加。せっていは下のメニューにはない（ホームの ⚙ から）
  document.querySelectorAll('.tabbar button').forEach(b => { if (b.dataset.tab === t) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  window.scrollTo(0, 0);
  renderAll();
}
function renderAll() {
  bgmUpdate();
  renderHome();
  if (UI.tab === 'shop') renderShop();
  if (UI.tab === 'train') renderTrain();
  if (UI.tab === 'history') renderHistory();
  if (UI.tab === 'cat') renderCat();
  if (UI.tab === 'settings') renderSettings();
  if ($('evHub')) renderEventHub();   // v10.4：イベントページが開いていたら（ミニゲームから もどったときなど）
}
document.querySelector('.tabbar').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; se('tap'); buzz(10); setTab(b.dataset.tab); });
$('tiShop').innerHTML = I.bag; $('tiTrain').innerHTML = I.pad; $('tiHome').innerHTML = I.house; $('tiHistory').innerHTML = I.cal; $('tiCat').innerHTML = I.paw;

rollover();
if (S.onboarded) askPersist();
setTab('home');
renderTitle();
$('title').addEventListener('click', startFromTitle);
$('titleMusic').addEventListener('click', e => {
  e.stopPropagation(); bgmUnlocked = true;
  if (S.settings.bgm === false) { S.settings.bgm = true; save(); }
  bgmUpdate(); $('titleMusic').textContent = '🔊';
});
$('title').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startFromTitle(); } });
document.addEventListener('visibilitychange', () => { bgmUpdate(); if (!document.hidden) { rollover(); renderAll(); if ($('title').hidden) maybeShowDaily(); } });

// 開いているあいだ1分ごとに、日付が変わっていないか・猫のSOS を確認
// v9.8：ごはんのリマインダー（開いているときしか届かなかった）はやめた。0時をこえたら画面を描きなおす
setInterval(() => { if (rollover()) { renderAll(); maybeShowDaily(); } else checkCrisis(); }, 60000);
