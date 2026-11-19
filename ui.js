// にゃんカロ 画面の共通部品
// モーダル（openModal/closeModal）・猫えらび・タイトル画面・はじめての設定・プロフィール・新しい版のお知らせ
// （v10.0 で app.js から分けた。読みこむ順番は index.html。ほかのファイルの関数・変数はそのまま使える）
'use strict';

/* =========================================================
   6. モーダル
   ========================================================= */
let modalClose = null;
let modalLocked = false;   // はじめての設定中は × や外側タップで閉じない

/* ---------- v10.2：ダイアログの あいだの フォーカス（キーボード・読み上げの人向け） ----------
   開いているあいだ：うしろの画面（#app・下のメニュー・タイトル）は inert（さわれない・読み上げない）、Tab はダイアログの中だけを回る
   閉じたら：開く前に押していたボタンにフォーカスをもどす（描きなおされていたら同じ id・data の新しいボタンへ） */
const TRAP = [];   // 開いているダイアログ（{ el, back }）。上にあるほど あと
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const isTouch = () => 'ontouchstart' in window;
function trapBack() {   // 待ってもどる先：id か data-○○ で探せるように覚えておく
  const a = document.activeElement;
  if (!a || a === document.body) return null;
  const d = Object.entries(a.dataset || {})[0];
  return { el: a, id: a.id, sel: d ? `[data-${d[0].replace(/[A-Z]/g, m => '-' + m.toLowerCase())}="${CSS.escape(d[1])}"]` : '' };
}
function trapInert() {
  const on = TRAP.length > 0;
  [$('app'), document.querySelector('.tabbar'), $('title')].forEach(e => { if (e) e.inert = on; });
}
function trapOpen(el, first) {
  if (TRAP.some(t => t.el === el)) return;   // つづけて開いたとき（中身の入れかえ）は、最初に押したボタンを覚えたまま
  TRAP.push({ el, back: trapBack() }); trapInert();
  trapFocus(el, first);
}
function trapFocus(el, first) {
  // さわる画面（スマホ）では、入力欄にフォーカスするとキーボードが出てしまうので、ダイアログそのものにフォーカスする
  const f = first || el.querySelector(FOCUSABLE);
  const box = el.querySelector('[role="dialog"]') || el;
  if (f && !isTouch()) f.focus({ preventScroll: true });
  if (!el.contains(document.activeElement)) { if (!box.hasAttribute('tabindex')) box.setAttribute('tabindex', '-1'); box.focus({ preventScroll: true }); }
}
function trapClose(el) {
  const i = TRAP.findIndex(t => t.el === el); if (i < 0) return;
  const { back } = TRAP.splice(i, 1)[0]; trapInert();
  if (TRAP.length) { trapFocus(TRAP[TRAP.length - 1].el); return; }
  if (!back) return;
  let b = back.el.isConnected ? back.el : (back.id && $(back.id)) || (back.sel && document.querySelector(back.sel));
  if (b && !b.closest('[hidden]') && !b.disabled) b.focus({ preventScroll: true });
}
document.addEventListener('keydown', e => {
  if (e.key !== 'Tab' || !TRAP.length) return;
  const el = TRAP[TRAP.length - 1].el;
  const list = [...el.querySelectorAll(FOCUSABLE)].filter(x => x.offsetParent !== null || x === document.activeElement);
  if (!list.length) { e.preventDefault(); return; }
  const a = list[0], z = list[list.length - 1], cur = document.activeElement;
  if (!el.contains(cur)) { e.preventDefault(); (e.shiftKey ? z : a).focus(); }
  else if (e.shiftKey && (cur === a || !list.includes(cur))) { e.preventDefault(); z.focus(); }
  else if (!e.shiftKey && cur === z) { e.preventDefault(); a.focus(); }
});

function openModal(html, onMount, onClose, locked) {
  modalLocked = !!locked; $('modalClose').hidden = modalLocked;
  const again = TRAP.some(t => t.el === $('modal'));
  $('modalBody').innerHTML = html; $('modal').hidden = false; modalClose = onClose || null;
  if (onMount) onMount($('modalBody'));
  const f = $('modalBody').querySelector(FOCUSABLE);
  if (again) trapFocus($('modal'), f); else trapOpen($('modal'), f);   // v10.2
}
function closeModal() {
  modalLocked = false; $('modalClose').hidden = false; $('modal').hidden = true; $('modalBody').innerHTML = ''; const c = modalClose; modalClose = null; if (c) c(); renderAll();
  if ($('modal').hidden) trapClose($('modal'));   // v10.2：閉じたあと すぐ次の画面が開いたときは、フォーカスは そのまま中に
  setTimeout(levelUpTry, 250);   // v10.1：待っているレベルアップがあれば出す
}
$('modalClose').addEventListener('click', closeModal);
$('modal').addEventListener('click', e => { if (e.target === $('modal') && !modalLocked) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('modal').hidden && !modalLocked) closeModal(); });

/* ---------- 猫えらび ---------- */
function catArtHTML(b) {
  const c = CATS[b];
  return `<span class="cp-art"><span class="pc-art" style="left:${(c.x / 600 * 100).toFixed(2)}%;width:${(c.w / 600 * 100).toFixed(2)}%"><img src="${pcImg(b, 'tail')}" alt=""><img src="${pcImg(b, 'body')}" alt="${esc(c.name)}"></span></span>`;
}
function catPickerHTML(sel) {
  return `<div class="cat-pick" role="radiogroup" aria-label="猫の種類">${CAT_KEYS.map(k => `<button type="button" role="radio" data-breed="${k}" aria-checked="${k === sel}">${catArtHTML(k)}<b>${esc(CATS[k].name)}</b><small>${esc(CATS[k].desc)}</small></button>`).join('')}</div>`;
}
function bindCatPicker(root, sel, onPick) {
  let v = CATS[sel] ? sel : 'tabby';
  root.querySelector('.cat-pick').addEventListener('click', e => {
    const b = e.target.closest('[data-breed]'); if (!b) return;
    v = b.dataset.breed; se('tap'); buzz(10); petSound('meow');
    root.querySelectorAll('.cat-pick [data-breed]').forEach(x => x.setAttribute('aria-checked', x === b));
    if (onPick) onPick(v);
  });
  return () => v;
}
function openCatPicker() {
  openModal(`<h2 id="modalTitle">猫の種類</h2><div class="stack">${catPickerHTML(S.cat.breed)}
    <p class="hint" style="margin:0">見た目だけが変わります。名前・レベル・きせかえはそのままです。</p>
    <button class="btn block" id="cpSave">この猫にする</button></div>`, root => {
    const pick = bindCatPicker(root, S.cat.breed);
    root.querySelector('#cpSave').onclick = () => { S.cat.breed = pick(); save(); closeModal(); se('get'); toast(`${CATS[S.cat.breed].name}になりました`); };
  });
}

/* ---------- タイトル画面・はじめての設定 ---------- */
function renderTitle() {
  const box = $('titleCats');
  if (S.onboarded) {
    box.className = 't-cats one';
    box.innerHTML = petCatHTML({ breed: S.cat.breed, idx: S.cat.dead ? 0 : S.cat.idx, equip: S.cat.equip });
    $('titleHello').textContent = `おかえり、${S.user.name || 'プレイヤー'}！`;
  } else {
    box.className = 't-cats';
    box.innerHTML = CAT_KEYS.map(k => catArtHTML(k)).join('');
    $('titleHello').textContent = 'ようこそ！';
  }
}
// v10.2：ホーム画面のアイコンを長押し →「ごはんを記録」（manifest の shortcuts）で開いたとき（?go=camera）
let launchGo = new URLSearchParams(location.search).get('go');
if (launchGo) { try { history.replaceState(null, '', location.pathname); } catch (e) {} }   // 読みこみなおしで もう一度 開かないように
function startFromTitle() {
  const t = $('title'); if (t.classList.contains('out')) return;
  se('get'); buzz(20); bgmUnlocked = true;
  t.classList.add('out'); setTimeout(() => { t.hidden = true; bgmUpdate(); }, 350);
  const go = launchGo; launchGo = null;
  if (!S.onboarded) openWelcome();
  else if (!S.guide.tour) setTimeout(startTour, 700);   // v9.1：まだホームの案内を見ていない人（前からの人も1回）
  else if (go === 'camera' && !S.cat.dead) setTimeout(() => openCapture({ done: () => setTimeout(maybeShowDaily, 500) }), 450);   // v10.2：記録の画面をすぐ出す（お知らせなどは そのあと）
  else setTimeout(maybeShowDaily, 900);   // v9.9：きのうの結果 → きのうを締める → SOS → バックアップ の順
}
function openWelcome() {
  let name = S.user.name && S.user.name !== 'プレイヤー' ? S.user.name : '', breed = S.cat.breed || 'tabby', catName = S.cat.name || 'もち';
  const step1 = root => {
    root.innerHTML = `<h2 id="modalTitle">はじめまして！（1/3）</h2><div class="stack">
      <p style="margin:0">あなたの名前を教えてね。猫がこの名前で呼んでくれます。</p>
      <label class="f">あなたの名前<input type="text" id="wName" maxlength="12" value="${esc(name)}" placeholder="例：かいり" autocomplete="nickname"></label>
      <button class="btn block" id="wNext1">つぎへ</button>
      <button type="button" class="btn block white" id="wRestore" style="font-size:14px">前のスマホのデータがある → バックアップから復元</button></div>`;
    root.querySelector('#wRestore').onclick = () => openRestore();
    const inp = root.querySelector('#wName');
    root.querySelector('#wNext1').onclick = () => { name = inp.value.trim(); if (!name) { toast('名前を入れてね'); inp.focus(); return; } se('tap'); step2(root); };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') root.querySelector('#wNext1').click(); });
  };
  const step2 = root => {
    root.innerHTML = `<h2 id="modalTitle">猫をえらぶ（2/3）</h2><div class="stack">
      <p style="margin:0">いっしょに暮らす猫をえらんでね。あとから「ねこ」タブで変えられます。</p>
      ${catPickerHTML(breed)}
      <label class="f">猫の名前<input type="text" id="wCat" maxlength="10" value="${esc(catName)}"></label>
      <div class="w-nav"><button type="button" class="btn white" id="wBack">もどる</button><button type="button" class="btn" id="wNext2">つぎへ</button></div></div>`;
    const pick = bindCatPicker(root, breed, v => { breed = v; });
    root.querySelector('#wBack').onclick = () => { catName = root.querySelector('#wCat').value.trim() || 'もち'; step1(root); };
    root.querySelector('#wNext2').onclick = () => {
      breed = pick(); catName = root.querySelector('#wCat').value.trim() || 'もち';
      S.user.name = name; S.cat.breed = breed; S.cat.name = catName; save(); se('tap');
      openProfile(true);
    };
  };
  openModal('', step1, null, true);
}

/* ---------- ユーザー（プロフィール） ---------- */
function openProfile(first) {
  const u = S.user;
  openModal(`<h2 id="modalTitle">${first ? 'あなたのこと（3/3）' : 'ユーザー'}</h2>
  <div class="stack">
    ${first ? '<p style="margin:0">あなたに合った1日の目標カロリーを計算します。</p>' : ''}
    <div class="form-grid">
      <label class="f">あなたの名前<input type="text" id="pName" maxlength="12" value="${esc(u.name)}"></label>
      <label class="f">猫の名前<input type="text" id="pCat" maxlength="10" value="${esc(S.cat.name)}"></label>
      <label class="f">年齢<input type="number" id="pAge" inputmode="numeric" min="10" max="100" value="${u.age}"></label>
      <label class="f">性別<select id="pSex"><option value="male"${u.sex === 'male' ? ' selected' : ''}>男性</option><option value="female"${u.sex === 'female' ? ' selected' : ''}>女性</option></select></label>
      <label class="f">身長（cm）<input type="number" id="pH" inputmode="decimal" min="100" max="230" value="${u.height}"></label>
      <label class="f">体重（kg）<input type="number" id="pW" inputmode="decimal" min="25" max="250" value="${u.weight}"></label>
    </div>
    <div class="f" style="font-size:12px;font-weight:900">目標<div class="radio-row" id="pGoal" style="margin-top:4px">
      <button type="button" data-v="lose" aria-pressed="${u.goal === 'lose'}">へらしたい</button>
      <button type="button" data-v="keep" aria-pressed="${u.goal === 'keep'}">キープ</button>
      <button type="button" data-v="gain" aria-pressed="${u.goal === 'gain'}">ふやしたい</button></div></div>
    <label class="f">1日あたりの増減<select id="pDelta">${[200, 300, 500].map(v => `<option value="${v}"${u.delta === v ? ' selected' : ''}>${v} kcal</option>`).join('')}</select></label>
    <div class="card" style="padding:10px 14px;display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap"><span>基礎代謝 <b id="pBmr">${fmt(bmr(u))}</b> kcal</span><span>1日の目標 <b id="pTarget" style="font-size:20px">${fmt(target(u))}</b> kcal</span></div>
    <p class="hint">目標は安全のため 1,200kcal より下にはなりません。</p>
    <button class="btn block" id="pSave">${first ? 'はじめる' : 'ほぞんする'}</button>
  </div>`, root => {
    let goal = u.goal;
    const read = () => ({ name: root.querySelector('#pName').value.trim() || 'プレイヤー', sex: root.querySelector('#pSex').value, age: +root.querySelector('#pAge').value, height: +root.querySelector('#pH').value, weight: +root.querySelector('#pW').value, goal, delta: +root.querySelector('#pDelta').value });
    const upd = () => { const v = read(); if (v.age && v.height && v.weight) { root.querySelector('#pBmr').textContent = fmt(bmr(v)); root.querySelector('#pTarget').textContent = fmt(target(v)); } };
    root.querySelectorAll('input,select').forEach(el => el.addEventListener('input', upd));
    root.querySelector('#pGoal').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; goal = b.dataset.v; root.querySelectorAll('#pGoal button').forEach(x => x.setAttribute('aria-pressed', x === b)); upd(); });
    root.querySelector('#pSave').onclick = () => {
      const v = read();
      if (!(v.age >= 10 && v.age <= 100 && v.height >= 100 && v.height <= 230 && v.weight >= 25 && v.weight <= 250)) { toast('年齢・身長・体重を確かめてください'); return; }
      S.user = v; S.cat.name = root.querySelector('#pCat').value.trim() || 'もち'; S.onboarded = true; save(); askPersist(); closeModal(); toast(`目標は 1日 ${fmt(target(v))} kcal`);
      if (first && !S.guide.tour) setTimeout(startTour, 900);
    };
  }, null, first);
}

/* ---------- メニューが変わったお知らせ（v10.1。前から遊んでいる人に1回だけ） ---------- */
function showNews() {
  const from = S.news; S.news = APP_NEWS; save();
  const menu = verNum(from) < verNum('10.1');   // verNum は settings.js   // v10.1 より前から：メニューが変わったことも知らせる
  const v103 = `<div><b>📖</b><span>ねこ →「おもいで」に とくべつな日が のこる</span></div>
      <div><b>📋</b><span>ミッションに「ずっと」。称号・ダイヤがもらえる</span></div>
      <div><b>💎</b><span>ダイヤは ショップで コインに交換できる</span></div>`;
  openModal(`<h2 id="modalTitle">${menu ? 'メニューが かわったよ' : 'あたらしくなったよ'}</h2><div class="stack">
    <div class="card news-list">${menu ? `<div><b>ねこ</b><span>ステータスと きせかえ（前の更衣室）は ここ</span></div>
      <div><b>あそぶ</b><span>ジム・ミニゲーム・対戦（前のトレーニング）</span></div>
      <div><b>きろく</b><span>1週間のごはんの記録（前のりれき）</span></div>
      <div><b>⚙</b><span>せってい は ホームの右上</span></div>` : ''}${v103}</div>
    ${menu ? '<p class="hint" style="margin:0">ログボとミッションは、ホームの左（スタミナの上）に うつりました。</p>' : ''}
    <button class="btn block" id="nwOk">OK</button></div>`, root => { root.querySelector('#nwOk').onclick = closeModal; }, () => setTimeout(maybeShowDaily, 300));
}

/* ---------- 新しい版のお知らせ（v9.8） ----------
   新しい service worker（sw.js）は、前の版が開いているあいだは待っている。
   タイトル画面のうちなら すぐ入れかえて読みなおす。遊んでいる途中なら上にお知らせを出し、タップで更新する。
   （index.html の登録のところから swWaiting が呼ばれる） */
let swNew = null;
function swApply() { if (!swNew) return; window.__swSkip = true; try { swNew.postMessage('skip'); } catch (e) {} }
function swWaiting(w) {
  swNew = w;
  const t = $('title');
  if (t && !t.hidden && !t.classList.contains('out')) { swApply(); return; }
  if ($('updBar')) return;
  const b = document.createElement('button');
  b.id = 'updBar'; b.className = 'upd-bar'; b.type = 'button';
  b.innerHTML = '新しい版があります　<b>タップで更新</b>';
  b.onclick = () => { b.disabled = true; b.textContent = '更新しています…'; swApply(); };
  document.body.appendChild(b);
}
