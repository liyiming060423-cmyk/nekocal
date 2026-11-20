// にゃんカロ ねこ（v10.1）
// 「ねこ」タブ：ステータス（体型・能力・称号・連続記録・これまで）と、きせかえ（前の更衣室・図鑑）
// （v10.1 で、ステータスは history.js、更衣室は train.js から そのまま うつした。読みこむ順番は index.html）
'use strict';

// 更衣室（v9.4）：部位のタブ＋図鑑。持っていないものは「？」で出す
const LOCKER_SLOTS = ['head', 'top', 'hand', 'suit'];
const RAR_ORDER = { N: 0, R: 1, SR: 2 };
const evOrder = k => WEAR[k].ev ? EVENTS.findIndex(e => e.id === WEAR[k].ev) : -1;   // v10.4
const evName = k => (EVENTS.find(e => e.id === WEAR[k].ev) || {}).name || '';
function lockerHTML(eq) {
  const sl = LOCKER_SLOTS.includes(UI.lockerSlot) ? UI.lockerSlot : 'head';
  const isNone = k => /_none$/.test(k);
  const all = zukanKeys(), got = zukanGot();   // v10.3：図鑑の数は 福袋のきせかえだけ（実績のきせかえは べつ）
  const cnt = x => { const ks = all.filter(k => WEAR[k].slot === x); return `${ks.filter(k => S.owned.includes(k)).length}/${ks.length}`; };
  const list = Object.keys(WEAR).filter(k => WEAR[k].slot === sl)
    .sort((a, b) => (isNone(b) - isNone(a)) || (!!WEAR[a].ev - !!WEAR[b].ev) || (!!WEAR[a].ach - !!WEAR[b].ach) || (evOrder(a) - evOrder(b)) || (RAR_ORDER[WEAR[a].rar] - RAR_ORDER[WEAR[b].rar]));   // v10.4：イベントのきせかえは うしろ（イベントの順）
  const tag = k => WEAR[k].ev ? `<span class="rar ev">イベント${(() => { const e = EVENTS.find(x => x.id === WEAR[k].ev); return e && setCount(e) >= e.wears.length ? '・セット' : ''; })()}</span>` : WEAR[k].ach ? '<span class="rar ach">実績</span>' : `<span class="rar ${WEAR[k].rar}">${WEAR[k].rar}</span>`;
  const cell = k => S.owned.includes(k)
    ? `<button class="wear" data-wear="${k}" aria-pressed="${eq[sl] === k}">${wearIcon(k)}<span>${esc(WEAR[k].name)}</span>${tag(k)}</button>`
    : WEAR[k].ev ? `<div class="wear locked" aria-label="${esc(evName(k))}イベントでもらえるきせかえ"><span class="q">？</span><span>${esc(evName(k))}イベントでもらえる</span>${tag(k)}</div>`
    : WEAR[k].ach ? `<div class="wear locked" aria-label="ずっとミッションでもらえるきせかえ"><span class="q">？</span><span>ずっとミッションでもらえる</span>${tag(k)}</div>`
    : `<div class="wear locked" aria-label="まだ持っていない ${WEAR[k].rar} のきせかえ"><span class="q">？</span><span>？？？</span>${tag(k)}</div>`;
  return `<div class="card zukan"><div class="zk-top"><b>きせかえ図鑑</b><span>集めた <b class="num">${got}</b> / ${all.length}</span></div><div class="prog"><i style="width:${got / all.length * 100}%"></i></div></div>
    <div class="seg locker-seg" role="tablist">${LOCKER_SLOTS.map(x => `<button role="tab" data-lslot="${x}" aria-selected="${x === sl}">${SLOT_NAME[x]}<small>${cnt(x)}</small></button>`).join('')}</div>
    ${sl === 'suit' ? `<p class="hint" style="margin:0 0 8px;text-align:center">着ている間は 頭・服 が見えません（能力のボーナスはそのまま）</p>${setListHTML(eq)}` : ''}
    <div class="wear-grid">${list.map(cell).join('')}</div>`;
}
// v10.6 セットボーナス：イベントごとに いくつ そろったか。そろった イベントの きせかえを 着ていると 能力が上がる
function setListHTML(eq) {
  const on = setEvent(eq);
  return `<div class="card set-list"><b>🎁 イベントの セットボーナス</b><small>おなじイベントの 4つが そろうと、そのどれかを 着ているあいだ ${setBonusText()}</small>
    <div class="set-chips">${evList().map(e => { const n = setCount(e), all = n >= e.wears.length; return `<span class="set-chip${all ? ' all' : ''}${on && on.id === e.id ? ' on' : ''}" style="--c:${e.color}"><span aria-hidden="true">${e.icon}</span>${esc(e.name)} ${all ? '✔' : `${n}/${e.wears.length}`}</span>`; }).join('')}</div>
    ${on ? `<p class="set-on">いま ${esc(on.name)}の セットボーナス 中！</p>` : ''}</div>`;
}
function statRows() {
  const col = { pow: 'var(--red)', spd: 'var(--blue)', sta: 'var(--green)' };
  return ['pow', 'spd', 'sta'].map(k => { const v = statWithBonus(k), bonus = v - S.cat.stats[k]; return `<div class="stat-row"><span>${STAT_NAME[k]}</span><span class="bar"><i style="width:${Math.min(100, v / 3)}%;background:${col[k]}"></i></span><b class="num">${v}${bonus ? `<small style="color:var(--orange-d)">+${bonus}</small>` : ''}</b></div>`; }).join('') +
    `<div class="stat-row"><span>EXP</span><span class="bar"><i style="width:${S.cat.exp / expNeed(S.cat.level) * 100}%;background:var(--yellow)"></i></span><b class="num" style="font-size:12px">${S.cat.exp}/${expNeed(S.cat.level)}</b></div>`;
}

// v10.5：きせかえの いちばん上で 猫の種類を かえる（見た目だけ。名前・レベル・きせかえは そのまま）
function breedRowHTML() {
  return `<div class="breed-row" role="radiogroup" aria-label="猫の種類">${CAT_KEYS.map(k => `<button type="button" role="radio" data-nbreed="${k}" aria-checked="${k === S.cat.breed}"><span class="breed-face" aria-hidden="true">${catArtHTML(k, pcBare(S.cat.equip))}</span><b>${esc(CATS[k].name)}</b></button>`).join('')}</div>`;
}
function pickBreed(k) {
  if (!CATS[k] || k === S.cat.breed) return;
  S.cat.breed = k; save(); se('tap'); buzz(10); petSound('meow'); renderAll();
  toast(`${CATS[k].name}になりました`);
  const b = document.querySelector(`[data-nbreed="${k}"]`); if (b) b.focus({ preventScroll: true });
}
function renderCat() {
  if (UI.catTab !== 'wear' && UI.catTab !== 'memo') UI.catTab = 'status';
  $('catSeg').querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', b.dataset.v === UI.catTab));
  const t = todayStr();
  if (UI.catTab === 'memo') {
    if (S.memoNew) { S.memoNew = 0; save(); renderHome(); }   // 見たので ねこ の赤い点を消す
    $('catBody').innerHTML = memoHTML();
  } else if (UI.catTab === 'wear') {
    const eq = S.cat.equip;
    $('catBody').innerHTML = `${breedRowHTML()}<div class="locker"><div class="card preview">${petCatHTML({ breed: S.cat.breed, idx: S.cat.idx, equip: eq, dead: S.cat.dead })}</div>
      <div class="card stats"><div style="font-weight:900">${esc(S.cat.name)}　Lv.${S.cat.level}</div>${statRows()}</div></div>
      ${lockerHTML(eq)}
      <p class="hint" style="margin-top:10px">ガチャで新しいきせかえが手に入ります。</p>`;
  } else {
    const st = bodyState(S.cat.idx), recDays = Object.values(S.days).filter(d => d.meals.length).length;
    const meals = Object.values(S.days).reduce((a, d) => a + d.meals.length, 0), steps = Object.values(S.days).reduce((a, d) => a + (d.steps || 0), 0);
    const nx = nextMilestone(S.cat.level);
    $('catBody').innerHTML = `<div class="locker"><div class="card preview">${petCatHTML({ breed: S.cat.breed, idx: S.cat.idx, equip: S.cat.equip, dead: S.cat.dead })}</div>
      <div class="card stats"><div style="font-weight:900">${esc(S.cat.name)}　Lv.${S.cat.level}</div><button type="button" class="lv-title t-pick" id="ncTitle" aria-label="称号をえらぶ（いまは ${esc(curTitle())}）">🎖 ${esc(curTitle())}<span aria-hidden="true"> ›</span></button>${statRows()}</div></div>
      <div class="card lv-next">つぎのレベルのごほうび：<b>Lv.${nx}</b>（あと${nx - S.cat.level}レベル）<small>${esc(levelRewardText(nx))}</small></div>
      <div class="section-title">体型</div>
      <div class="card" style="padding:12px 14px"><div style="display:flex;justify-content:space-between;font-weight:900;margin-bottom:8px"><span>${st[0]}</span><span class="num">${S.cat.idx > 0 ? '+' : ''}${S.cat.idx}</span></div>
        <div class="body-meter"><i style="left:${(S.cat.idx + 100) / 2}%"></i></div><div class="body-labels"><span>骸骨</span><span>ちょうどいい</span><span>爆発</span></div>
        <p class="hint" style="margin-top:8px">その日の「食べた量 − 目標」で体型が変わります。しめるのは つぎの日の${RULE.closeHour}時（「これでしめる」を押せば すぐ）。目標±100kcalなら、ちょうどいいに少しもどります。朝・昼・夜の記録が少ない日は、やせる変化を小さくします。</p></div>
      ${S.cat.hospital ? `<div class="card hosp-note" style="margin-top:10px;padding:10px 14px;font-weight:900;border:2.5px solid var(--ink);border-radius:14px">🏥 入院中　退院まで あと${Math.max(1, daysBetween(t, S.cat.hospital.until))}日（バランスのいい日 ${S.cat.hospital.good || 0}/${HOSPITAL.goodDays}）</div>` : ''}
      <div class="card streak-card"><span>🔥 連続記録</span><span><b class="num">${S.streak.n}</b>日　<small class="muted">今週のおやすみ券 ${S.streak.pass === weekMon(t) ? 0 : STREAK.passPerWeek}/${STREAK.passPerWeek}</small></span></div>
      <div class="section-title">これまで</div>
      <div class="totals"><div class="card"><b class="num">${recDays}</b><span>記録した日</span></div><div class="card"><b class="num">${meals}</b><span>ごはんの記録</span></div><div class="card"><b class="num">${fmt(steps)}</b><span>歩いた歩数</span></div></div>
      <div class="card" style="margin-top:10px;padding:10px 14px;font-size:14px">基礎代謝 <b>${fmt(bmr(S.user))}</b> kcal　→　1日の目標 <b>${fmt(target(S.user))}</b> kcal</div>
`;
  }
}
$('catSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; UI.catTab = b.dataset.v; se('tap'); renderCat(); bgmUpdate(); });
$('catBody').addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.lslot) { UI.lockerSlot = t.dataset.lslot; se('tap'); renderCat(); }
  else if (t.dataset.wear) { const k = t.dataset.wear; S.cat.equip[WEAR[k].slot] = k; guideHit('wear'); save(); se('tap'); renderAll(); }
  else if (t.dataset.nbreed) pickBreed(t.dataset.nbreed);
  else if (t.id === 'ncTitle') openTitlePicker();
  else if (t.dataset.memo != null) openMemo(+t.dataset.memo);
});

/* ---------- おもいで（v10.3） ---------- */
const memoDate = d => { if (!d) return 'これまで'; const x = parseYmd(d); return `${x.getFullYear()}/${x.getMonth() + 1}/${x.getDate()}（${WEEK[x.getDay()]}）`; };
function memoCard(m) {
  const i = S.memo.indexOf(m), ic = (MEMO[m.k] || {}).icon || '📖';
  return `<button type="button" class="card memo-card" data-memo="${i}" aria-label="${esc(memoDate(m.d))} ${esc(memoTitle(m))}">
    <span class="memo-cat" aria-hidden="true">${petCatHTML({ breed: m.cat.breed, idx: m.cat.idx, equip: m.cat.equip })}</span>
    <span class="memo-txt"><small>${esc(memoDate(m.d))}${m.old ? '' : `　Lv.${m.cat.level}`}</small><b><span aria-hidden="true">${ic}</span> ${esc(memoTitle(m))}</b><span>${esc(memoText(m))}</span></span></button>`;
}
function memoHTML() {
  const { dated, old } = memoSorted(), n = S.memo.length;
  if (!n) return `<div class="card memo-empty"><b>まだ おもいでがないにゃ</b><p>はじめてのごはん・はじめての1,000歩・Lv.5・はじめての SR・7日連続の記録・対戦ではじめて勝つ…など、とくべつな日を ここに のこすにゃ。</p></div>`;
  return `<div class="card memo-head"><b>${esc(S.cat.name)}の おもいで</b><span><b class="num">${n}</b>こ</span></div>
    <div class="list memo-list">${dated.map(memoCard).join('')}</div>
    ${old.length ? `<div class="section-title">これまでの思い出</div><p class="hint" style="margin:-4px 4px 8px">前の版から遊んでいる人の、日付がわからない思い出です</p><div class="list memo-list">${old.map(memoCard).join('')}</div>` : ''}`;
}
function openMemo(i) {
  const m = S.memo[i]; if (!m) return;
  openModal(`<h2 id="modalTitle">${esc(memoTitle(m))}<small>${esc(memoDate(m.d))}</small></h2><div class="stack memo-big">
    <div class="memo-big-cat">${petCatHTML({ breed: m.cat.breed, idx: m.cat.idx, equip: m.cat.equip })}</div>
    <p class="memo-diary">${esc(memoText(m))}</p>
    <p class="hint" style="margin:0;text-align:center">${m.old ? `前の版のデータから作った おもいでです（${esc(S.cat.name)}は いまの すがた）` : `このときの ${esc(S.cat.name)}：Lv.${m.cat.level}・${esc(bodyState(m.cat.idx)[0])}`}</p>
    <button class="btn block" id="mmOk">とじる</button></div>`, root => { root.querySelector('#mmOk').onclick = closeModal; });
}
// 称号をえらぶ（v10.3）：とどいたレベルの称号と、ずっとミッションでもらった称号
function openTitlePicker() {
  const list = titleList(), cur = curTitle();
  openModal(`<h2 id="modalTitle">称号をえらぶ</h2><div class="stack">
    <div class="list title-list">${list.map(x => `<button type="button" class="card row title-opt" data-title="${esc(x)}" aria-pressed="${x === cur}"><span class="grow">🎖 ${esc(x)}</span><small class="muted">${(S.titles || []).includes(x) ? 'ずっとミッション' : 'レベル'}</small></button>`).join('')}</div>
    <p class="hint" style="margin:0">ずっとミッションをクリアすると、称号がふえます。</p></div>`, root => {
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-title]'); if (!b) return;
      const v = b.dataset.title; S.title = v === levelTitle(S.cat.level) && !(S.titles || []).includes(v) ? '' : v;   // レベルの称号をえらんだら「自動」にもどす
      save(); se('tap'); closeModal(); toast(`称号「${v}」をつけました`);
    });
  });
}
