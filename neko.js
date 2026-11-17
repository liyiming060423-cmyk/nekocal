// にゃんカロ ねこ（v10.1）
// 「ねこ」タブ：ステータス（体型・能力・称号・連続記録・これまで）と、きせかえ（前の更衣室・図鑑）
// （v10.1 で、ステータスは history.js、更衣室は train.js から そのまま うつした。読みこむ順番は index.html）
'use strict';

// 更衣室（v9.4）：部位のタブ＋図鑑。持っていないものは「？」で出す
const LOCKER_SLOTS = ['head', 'top', 'hand', 'suit'];
const RAR_ORDER = { N: 0, R: 1, SR: 2 };
function lockerHTML(eq) {
  const sl = LOCKER_SLOTS.includes(UI.lockerSlot) ? UI.lockerSlot : 'head';
  const isNone = k => /_none$/.test(k);
  const all = Object.keys(WEAR).filter(k => !isNone(k)), got = all.filter(k => S.owned.includes(k)).length;
  const cnt = x => { const ks = all.filter(k => WEAR[k].slot === x); return `${ks.filter(k => S.owned.includes(k)).length}/${ks.length}`; };
  const list = Object.keys(WEAR).filter(k => WEAR[k].slot === sl)
    .sort((a, b) => (isNone(b) - isNone(a)) || (RAR_ORDER[WEAR[a].rar] - RAR_ORDER[WEAR[b].rar]));
  const cell = k => S.owned.includes(k)
    ? `<button class="wear" data-wear="${k}" aria-pressed="${eq[sl] === k}">${wearIcon(k)}<span>${esc(WEAR[k].name)}</span><span class="rar ${WEAR[k].rar}">${WEAR[k].rar}</span></button>`
    : `<div class="wear locked" aria-label="まだ持っていない ${WEAR[k].rar} のきせかえ"><span class="q">？</span><span>？？？</span><span class="rar ${WEAR[k].rar}">${WEAR[k].rar}</span></div>`;
  return `<div class="card zukan"><div class="zk-top"><b>きせかえ図鑑</b><span>集めた <b class="num">${got}</b> / ${all.length}</span></div><div class="prog"><i style="width:${got / all.length * 100}%"></i></div></div>
    <div class="seg locker-seg" role="tablist">${LOCKER_SLOTS.map(x => `<button role="tab" data-lslot="${x}" aria-selected="${x === sl}">${SLOT_NAME[x]}<small>${cnt(x)}</small></button>`).join('')}</div>
    ${sl === 'suit' ? '<p class="hint" style="margin:0 0 8px;text-align:center">着ている間は 頭・服 が見えません（能力のボーナスはそのまま）</p>' : ''}
    <div class="wear-grid">${list.map(cell).join('')}</div>`;
}
function statRows() {
  const col = { pow: 'var(--red)', spd: 'var(--blue)', sta: 'var(--green)' };
  return ['pow', 'spd', 'sta'].map(k => { const v = statWithBonus(k), bonus = v - S.cat.stats[k]; return `<div class="stat-row"><span>${STAT_NAME[k]}</span><span class="bar"><i style="width:${Math.min(100, v / 3)}%;background:${col[k]}"></i></span><b class="num">${v}${bonus ? `<small style="color:var(--orange-d)">+${bonus}</small>` : ''}</b></div>`; }).join('') +
    `<div class="stat-row"><span>EXP</span><span class="bar"><i style="width:${S.cat.exp / expNeed(S.cat.level) * 100}%;background:var(--yellow)"></i></span><b class="num" style="font-size:12px">${S.cat.exp}/${expNeed(S.cat.level)}</b></div>`;
}

function renderCat() {
  if (UI.catTab !== 'wear') UI.catTab = 'status';
  $('catSeg').querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', b.dataset.v === UI.catTab));
  const t = todayStr();
  if (UI.catTab === 'wear') {
    const eq = S.cat.equip;
    $('catBody').innerHTML = `<div class="locker"><div class="card preview">${petCatHTML({ breed: S.cat.breed, idx: S.cat.idx, equip: eq, dead: S.cat.dead })}</div>
      <div class="card stats"><div style="font-weight:900">${esc(S.cat.name)}　Lv.${S.cat.level}</div>${statRows()}</div></div>
      ${lockerHTML(eq)}
      <p class="hint" style="margin-top:10px">ガチャで新しいきせかえが手に入ります。</p>`;
  } else {
    const st = bodyState(S.cat.idx), recDays = Object.values(S.days).filter(d => d.meals.length).length;
    const meals = Object.values(S.days).reduce((a, d) => a + d.meals.length, 0), steps = Object.values(S.days).reduce((a, d) => a + (d.steps || 0), 0);
    const nx = nextMilestone(S.cat.level);
    $('catBody').innerHTML = `<div class="locker"><div class="card preview">${petCatHTML({ breed: S.cat.breed, idx: S.cat.idx, equip: S.cat.equip, dead: S.cat.dead })}</div>
      <div class="card stats"><div style="font-weight:900">${esc(S.cat.name)}　Lv.${S.cat.level}</div><div class="lv-title">🎖 ${esc(levelTitle(S.cat.level))}</div>${statRows()}</div></div>
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
      <button class="btn white block" id="ncBreed" style="margin-top:10px">猫の種類をかえる（いまは「${esc((CATS[S.cat.breed] || CATS.tabby).name)}」）</button>`;
  }
}
$('catSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; UI.catTab = b.dataset.v; se('tap'); renderCat(); bgmUpdate(); });
$('catBody').addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.lslot) { UI.lockerSlot = t.dataset.lslot; se('tap'); renderCat(); }
  else if (t.dataset.wear) { const k = t.dataset.wear; S.cat.equip[WEAR[k].slot] = k; guideHit('wear'); save(); se('tap'); renderAll(); }
  else if (t.id === 'ncBreed') openCatPicker();
});
