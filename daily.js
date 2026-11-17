// にゃんカロ 毎日の流れ（v9.9）
// きのうをしめる・きのうの結果・いないあいだの結果・退院・ねこ病院のようす。maybeShowDaily が順番に1つずつ出す
// （v10.0 で app.js から分けた。読みこむ順番は index.html。ほかのファイルの関数・変数はそのまま使える）
'use strict';

/* ---------- 毎日の流れ（v9.9）：きのうの結果・きのうを締める・入院と退院 ---------- */
const mdw = d => { const x = parseYmd(d); return `${x.getMonth() + 1}/${x.getDate()}（${WEEK[x.getDay()]}）`; };
const signed = n => (n > 0 ? '+' : n < 0 ? '−' : '±') + fmt(Math.abs(n));
// ほかの画面（モーダル・案内・ミニゲーム・対戦・さんぽ・タイトル）が出ていないとき true
const screenFree = () => $('modal').hidden && !$('tour') && !$('miniFrame') && !$('battleUI') && !document.querySelector('.walk') && $('title').hidden;
// アプリを開いたとき・もどったときに、順番に1つずつ出す
function maybeShowDaily() {
  if (!S.onboarded || !screenFree()) return;
  if (S.news !== APP_NEWS) { showNews(); return; }   // v10.1：メニューが変わったお知らせ（前から遊んでいる人に1回）
  if (S.resultQ.length) { showResults(); return; }
  const y = addDays(todayStr(), -1);
  if (pendingYesterday() && S.closeAsk !== y) { S.closeAsk = y; save(); openCloseDay(); return; }
  if (levelUpTry()) return;   // v10.1：レベルアップ・レベルのごほうび（fx.js）
  checkCrisis(); setTimeout(checkBackupNag, 900);
}
// 体型メーター（from から to へ針が動く）
function meterHTML(from, to) {
  return `<div class="body-meter res-meter"><i style="left:${(from + 100) / 2}%" data-to="${(to + 100) / 2}"></i></div><div class="body-labels"><span>骸骨</span><span>ちょうどいい</span><span>爆発</span></div>`;
}
function runMeter(root) { const i = root.querySelector('.res-meter i'); if (i) setTimeout(() => { i.style.left = i.dataset.to + '%'; }, 450); }
// きのうの記録を締める（わすれたごはんを足すか、これでしめる）
function openCloseDay() {
  const y = pendingDays().slice(-1)[0]; if (!y || !screenFree()) return;
  const dd = S.days[y] || { meals: [] }, r = dayChange(y, S.cat.idx), to = clamp(S.cat.idx + r.ch, -100, 100);
  const rows = Object.keys(SLOTS).map(k => {
    const ms = dd.meals.filter(m => m.slot === k);
    return `<div class="r"><span class="cl-slot">${SLOTS[k]}</span><span class="cl-name">${ms.length ? esc(ms.map(m => m.name).join('・')) : '<span class="muted">なし</span>'}</span><b class="num">${ms.length ? fmt(ms.reduce((a, m) => a + m.kcal, 0)) : ''}</b></div>`;
  }).join('');
  openModal(`<h2 id="modalTitle">きのうの記録をしめる</h2><div class="stack">
    <p style="margin:0">${mdw(y)}の記録です。わすれたごはんはない？ 今日の${RULE.closeHour}時に自動でしめて、体型が変わります。</p>
    <div class="card close-list">${rows}<div class="r t"><span>合計</span><span></span><b class="num">${fmt(r.it)} / ${fmt(r.tg)} kcal</b></div></div>
    <div class="card close-pred">このまま しめると：<b>${S.cat.hospital ? '入院中' : bodyState(to)[0]}</b> <span class="num">（${signed(to - S.cat.idx)}）</span>
      ${r.partial ? '<small>朝・昼・夜の記録が少ないので、やせる変化は小さくなります</small>' : ''}${!r.n ? '<small>記録がない日は、体型は変わりません</small>' : ''}</div>
    <button class="btn white block" id="clAdd">＋ わすれたごはんを追加</button>
    <button class="btn block" id="clGo">これでしめる</button>
    <button class="btn white block" id="clLater">あとで（${RULE.closeHour}時に自動でしめる）</button></div>`, root => {
    root.querySelector('#clAdd').onclick = () => { closeModal(); openCapture({ date: y, done: () => setTimeout(openCloseDay, 250) }); };
    root.querySelector('#clGo').onclick = () => { se('tap'); settleDue(true); closeModal(); };
    root.querySelector('#clLater').onclick = closeModal;
  }, () => setTimeout(maybeShowDaily, 300));
}
// きのうの結果（何日かぶんたまっていたら、まとめて1枚）
function showResults() {
  const q = S.resultQ.splice(0); save();
  const days = q.filter(r => r.event !== 'leave'), leave = q.find(r => r.event === 'leave');
  const next = () => { if (leave) showLeave(leave); else setTimeout(maybeShowDaily, 300); };
  if (!days.length) { next(); return; }
  const first = days[0], last = days[days.length - 1], admit = days.find(r => r.event === 'skel' || r.event === 'boom');
  const from = first.from, to = admit ? (admit.event === 'boom' ? 100 : -100) : last.to;
  const coins = days.reduce((a, r) => a + (r.coins || 0), 0), better = Math.abs(to) < Math.abs(from) || (Math.abs(to) <= 12);
  const one = days.length === 1;
  const kcal = r => r.n ? `<b class="num">${fmt(r.it)}</b> / ${fmt(r.tg)} kcal <span class="num ${Math.abs(r.diff) <= 100 ? 'ok' : ''}">（${signed(r.diff)}）</span>` : '<span class="muted">記録なし</span>';
  const head = one ? `<div class="card res-kcal"><span>食べた / 目標</span><span>${kcal(first)}</span></div>`
    : `<div class="card res-days">${days.map(r => `<div class="r"><span>${mdw(r.date)}</span><span>${kcal(r)}</span><b class="num">${signed(r.to - r.from)}</b></div>`).join('')}</div>`;
  const notes = [];
  if (days.some(r => r.partial)) notes.push('朝・昼・夜の記録が少ない日は、やせる変化を小さくしました');
  if (one && !first.n) notes.push('ごはんの記録がない日は、体型は変わりません');
  const passes = days.filter(r => r.pass).length, broke = days.some(r => !r.n && !r.pass && r.streak === 0);
  const stTxt = `🔥 連続記録 <b class="num">${last.streak}</b>日${coins ? `　<span class="res-coin">コイン +${fmt(coins)}</span>` : ''}${passes ? '<br><small>おやすみ券を使ったので、連続記録はつづいています</small>' : ''}${broke ? '<br><small>記録のない日があったので、連続記録はリセットされました</small>' : ''}`;
  const catHTML = admit ? petCatHTML({ breed: S.cat.breed, dead: admit.event }) : petCatHTML({ breed: S.cat.breed, idx: last.to, equip: S.cat.equip, mood: better ? 'normal' : 'tired' });
  openModal(`<h2 id="modalTitle">${one ? `きのうの結果<small>${mdw(first.date)}</small>` : `いないあいだの結果<small>${days.length}日ぶん</small>`}</h2>
    <div class="stack res"><div class="res-cat">${catHTML}</div>${head}
      <div class="card res-body"><div class="res-lbl"><span>${bodyState(from)[0]}</span><span aria-hidden="true">→</span><b>${bodyState(to)[0]}</b><span class="num">（${signed(to - from)}）</span></div>
        ${meterHTML(from, to)}${notes.map(n => `<p class="hint" style="margin:6px 0 0">${n}</p>`).join('')}</div>
      <div class="card res-streak">${stTxt}</div>
      ${admit ? `<div class="card res-admit"><b>🏥 ${esc(S.cat.name)}が${admit.event === 'boom' ? '食べすぎて破裂' : 'やせすぎて骨に'}…！ ねこ病院に入院しました</b>
        <p>入院費 −${fmt(admit.lost)}コイン・ごきげんが ${HOSPITAL.mood} に。${HOSPITAL.days}日で退院します（バランスのいいごはんを${HOSPITAL.goodDays}日記録すると早く退院）。入院中はトレーニングと対戦はお休みです。レベル・能力・きせかえはそのままです。</p></div>` : ''}
      <button class="btn block" id="resOk">${admit ? 'お見舞いに行く' : 'OK'}</button></div>`, root => {
    runMeter(root);
    root.querySelector('#resOk').onclick = closeModal;
    if (admit) { petSound('cry'); buzz([300, 120, 300]); } else if (coins) { setTimeout(() => { se(better ? 'get' : 'coin'); coinFx(coins, root.querySelector('.res-coin')); }, 500); }
  }, next);
}
// 退院
function showLeave(r) {
  openModal(`<h2 id="modalTitle">退院おめでとう！</h2><div class="stack res">
    <div class="res-cat">${petCatHTML({ breed: S.cat.breed, idx: r.to, equip: S.cat.equip })}</div>
    <p style="margin:0;text-align:center;font-weight:900">${esc(S.cat.name)}が元気になって帰ってきた！${r.early ? '<br>バランスのいいごはんで、早めに退院できたにゃ' : ''}</p>
    <div class="card res-body"><div class="res-lbl"><span>${bodyState(r.from)[0]}</span><span aria-hidden="true">→</span><b>${bodyState(r.to)[0]}</b></div>${meterHTML(r.from, r.to)}</div>
    <button class="btn block" id="lvOk">おかえり！</button></div>`, root => {
    runMeter(root); se('get'); setTimeout(() => petSound('meow'), 300);
    root.querySelector('#lvOk').onclick = closeModal;
  }, () => setTimeout(maybeShowDaily, 300));
}
// 入院中のようす（ホームのバナーから）
function openHospitalInfo() {
  const h = S.cat.hospital; if (!h) return;
  const left = Math.max(1, daysBetween(todayStr(), h.until)), g = h.good || 0;
  openModal(`<h2 id="modalTitle">🏥 ねこ病院</h2><div class="stack">
    <p style="margin:0">${esc(S.cat.name)}は${h.reason === 'boom' ? '食べすぎ' : 'やせすぎ'}で入院中です。</p>
    <div class="card" style="padding:12px 14px;font-weight:700;line-height:1.9">退院まで あと <b class="num">${left}</b>日<br>
      バランスのいいごはん <b class="num">${g}</b> / ${HOSPITAL.goodDays}日 <small class="muted">（そろうと早く退院）</small>
      <div class="prog"><i style="width:${Math.min(100, g / HOSPITAL.goodDays * 100)}%"></i></div></div>
    <p class="hint" style="margin:0">バランスのいい日＝目標カロリー ±100kcal で、朝・昼・夜のうち${RULE.partialMinMain}回以上記録した日（締めたときに数えます）。入院中はトレーニングと対戦はお休み。ミニゲーム・さんぽ・きせかえはできます。</p>
    <button class="btn block" id="hpMeal">ごはんを記録する</button></div>`, root => {
    root.querySelector('#hpMeal').onclick = () => { closeModal(); openCapture(); };
  });
}
