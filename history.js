// にゃんカロ きろく
// 1週間のきろく（前の週も）・ごはんを直す・予想カード（v10.1：ステータスは neko.js へ）
// （v10.0 で app.js から分けた。読みこむ順番は index.html。ほかのファイルの関数・変数はそのまま使える）
'use strict';

/* =========================================================
   10. りれき
   ========================================================= */
// off：0＝今週、−1＝先週…（v9.9：前の週も見られる。記録は60日分のこっている）
const WEEKS_BACK = 8;
function weekDates(off = 0) { const mon = addDays(weekMon(todayStr()), off * 7); return Array.from({ length: 7 }, (_, i) => addDays(mon, i)); }
function chartSVG(dates) {
  const tg = target(S.user), vals = dates.map(intake), max = Math.max(tg * 1.4, ...vals, 1);
  const W = 340, H = 190, x0 = 46, x1 = 330, y0 = 14, y1 = 160, bw = 26, step = (x1 - x0) / 7;
  const y = v => y1 - v / max * (y1 - y0);
  let s = `<defs><pattern id="stripe" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="4" height="16" fill="#E0573F"/><rect x="4" width="4" height="16" fill="#F7C64B"/><rect x="8" width="4" height="16" fill="#4FAE5B"/><rect x="12" width="4" height="16" fill="#4C8FD6"/></pattern></defs>`;
  s += `<rect x="${x0}" y="${y0 - 4}" width="${x1 - x0}" height="${y1 - y0 + 4}" fill="#FFFFFF" stroke="#4A2A1A" stroke-width="2.5"/>`;
  const pts = [];
  dates.forEach((d, i) => {
    const v = vals[i], cx = x0 + step * i + step / 2;
    if (v > 0) { s += `<rect x="${cx - bw / 2}" y="${y(v)}" width="${bw}" height="${y1 - y(v)}" fill="url(#stripe)" stroke="#4A2A1A" stroke-width="2"/>`; pts.push([cx, y(v)]); }
    if (d === UI.histDate) s += `<rect x="${cx - step / 2 + 2}" y="${y0 - 2}" width="${step - 4}" height="${y1 - y0}" fill="none" stroke="#F0943F" stroke-width="2.5" stroke-dasharray="4 3" rx="4"/>`;
    s += `<text x="${cx}" y="${y1 + 20}" text-anchor="middle" font-size="15" font-weight="900" fill="${d === todayStr() ? '#D9772B' : '#4A2A1A'}" font-family="Zen Maru Gothic, sans-serif">${WEEK[parseYmd(d).getDay()]}</text>`;
  });
  if (pts.length > 1) s += `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="#4A2A1A" stroke-width="2.5"/>`;
  pts.forEach(p => { s += `<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="#4A2A1A"/>`; });
  s += `<line x1="${x0}" x2="${x1}" y1="${y(tg)}" y2="${y(tg)}" stroke="#4A2A1A" stroke-width="2.5" stroke-dasharray="8 6"/>`;
  s += `<text x="${x0 - 6}" y="${y(tg) + 5}" text-anchor="end" font-size="14" font-weight="900" fill="#4A2A1A" font-family="Zen Maru Gothic, sans-serif">目安</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="今週の摂取カロリー。点線が目安の${tg}kcal">${s}</svg>`;
}
// 糖質・たんぱく質・脂質の合計とバランス（エネルギー比）
// 目安：日本人の食事摂取基準のエネルギー比（たんぱく質13〜20%・脂質20〜30%・炭水化物50〜65%）
const PFC_REF = { protein: [13, 20], fat: [20, 30], carbs: [50, 65] };
function pfcCard(meals) {
  const ms = meals.filter(m => m.carbs != null);
  if (!ms.length) return meals.length ? `<p class="hint" style="margin:8px 4px 0">糖質・たんぱく質・脂質は、AIで調べたごはんだけ表示されます</p>` : '';
  const g = { carbs: 0, protein: 0, fat: 0 }; ms.forEach(m => { g.carbs += m.carbs || 0; g.protein += m.protein || 0; g.fat += m.fat || 0; });
  const e = { protein: g.protein * 4, fat: g.fat * 9, carbs: g.carbs * 4 }, tot = e.protein + e.fat + e.carbs || 1;
  const pct = k => Math.round(e[k] / tot * 100);
  const row = (k, name, col) => { const p = pct(k), [lo, hi] = PFC_REF[k], mark = p < lo ? '少なめ' : p > hi ? '多め' : 'ちょうどいい';
    return `<div class="pfc-row"><span class="pfc-name"><i style="background:${col}"></i>${name}</span><b class="num">${fmt(g[k])}g</b><span class="num pfc-pct">${p}%</span><span class="pfc-tag ${mark === 'ちょうどいい' ? 'ok' : ''}">${mark}</span></div>`; };
  return `<div class="card pfc-card"><div class="pfc-bar" role="img" aria-label="エネルギーの割合 たんぱく質${pct('protein')}% 脂質${pct('fat')}% 糖質${pct('carbs')}%">
      <i style="width:${pct('protein')}%;background:#E8577A"></i><i style="width:${pct('fat')}%;background:#F7C64B"></i><i style="width:${pct('carbs')}%;background:#4C8FD6"></i></div>
    ${row('protein', 'たんぱく質', '#E8577A')}${row('fat', '脂質', '#F7C64B')}${row('carbs', '糖質', '#4C8FD6')}
    <p class="hint" style="margin:6px 0 0">％はエネルギーの割合。目安 たんぱく質13〜20%・脂質20〜30%・炭水化物50〜65%${ms.length < meals.length ? `（${meals.length - ms.length}件は数値なし）` : ''}</p></div>`;
}
// 「このまま締めると」の予想（今日のまとめ・まだ締めていない きのう）
function predHTML(d) {
  const t = todayStr();
  if (S.cat.hospital) {
    const r = dayChange(d, S.cat.idx), ok = r.n && r.main >= RULE.partialMinMain && Math.abs(r.diff) <= 100;
    return `<div class="card pred-card">🏥 バランスのいい日：<b>${ok ? 'クリアしそう！' : 'まだ'}</b><small>目標 ±100kcal で、朝・昼・夜のうち${RULE.partialMinMain}回以上の記録</small></div>`;
  }
  let from = S.cat.idx;
  for (const p of pendingDays()) if (p < d) from = clamp(from + dayChange(p, from).ch, -100, 100);   // 先に締める日のぶんを足しておく
  const r = dayChange(d, from), to = clamp(from + r.ch, -100, 100);
  return `<div class="card pred-card">${d === t ? 'このまま今日が終わると' : 'このまま しめると'}：<b>${bodyState(to)[0]}</b> <span class="num">（${signed(to - from)}）</span>
    <small>${d === t ? `あしたの${RULE.closeHour}時に しめて体型が変わります（それまでは直せます）` : `今日の${RULE.closeHour}時に しめます`}</small>${r.partial ? '<small>朝・昼・夜の記録が少ないので、やせる変化は小さくなります</small>' : ''}</div>`;
}
function renderHistory() {
  const t = todayStr(), dt = parseYmd(t);
  $('histDate').textContent = `Date ${dt.getMonth() + 1}/${dt.getDate()}（${WEEK[dt.getDay()]}）`;
  {
    const off = clamp(UI.histWeek || 0, -WEEKS_BACK, 0), dates = weekDates(off);
    if (!dates.includes(UI.histDate) || UI.histDate > t) UI.histDate = off === 0 ? t : dates[6];
    const sel = UI.histDate, sd = S.days[sel] || { meals: [] }, sdt = parseYmd(sel), edit = canEditDay(sel);
    if (sel === t && S.sumSeen !== t) { S.sumSeen = t; save(); }
    const cards = Object.keys(SLOTS).map(k => {
      const ms = sd.meals.filter(m => m.slot === k), kc = ms.reduce((a, m) => a + m.kcal, 0), m0 = ms[0];
      if (!m0 && k === 'snack') return `<div class="meal-card"><span class="slot">${SLOTS[k]}</span><span class="mname">なし</span><span class="ph">${I.plate}</span><span class="hint"> </span></div>`;
      if (!m0) return `<div class="meal-card"><span class="slot">${SLOTS[k]}</span><span class="mname">${sel <= t ? 'まだ' : '－'}</span><span class="ph">${I.plate}</span><span class="hint" style="font-weight:900">${sel === t ? 'たべてないよ' : sel < t ? '記録なし' : ''}</span></div>`;
      return `<div class="meal-card"><span class="slot">${SLOTS[k]}</span><span class="mname">${esc(m0.name)}${ms.length > 1 ? ` ほか${ms.length - 1}` : ''}</span>${m0.photo ? `<img src="${m0.photo}" alt="${esc(m0.name)}の写真">` : `<span class="ph">${I.plate}</span>`}<span class="kc num">${fmt(kc)} kcal</span></div>`;
    }).join('');
    // v9.9：締める前の日（今日・まだ締めていない きのう）は、タップで直せる
    const row = m => { const inner = `${m.photo ? `<img src="${m.photo}" alt="">` : `<span class="ph"></span>`}<div class="grow"><div class="name">${esc(m.name)}</div><div class="hint">${SLOTS[m.slot]}　${esc(m.time)}${m.carbs != null ? `<br>糖質${m.carbs}g・たんぱく質${m.protein}g・脂質${m.fat}g` : ''}</div></div><b class="num">${fmt(m.kcal)} kcal</b>`;
      return edit ? `<button type="button" class="card row edit" data-edit="${m.id}" aria-label="${esc(m.name)}を直す">${inner}</button>` : `<div class="card row">${inner}</div>`; };
    const list = sd.meals.length ? `<div class="list meal-list" style="margin-top:12px">${sd.meals.map(row).join('')}</div>` : '';
    const add = edit ? `<button class="btn white block add-meal" data-addmeal="1">＋ ${sel === t ? 'ごはんを記録' : 'わすれたごはんを追加'}</button>` : (sel < t ? '<p class="hint" style="margin:10px 4px 0">この日はもう しめたので、直せません</p>' : '');
    $('histBody').innerHTML = `<div class="hist-week"><button class="btn small white" data-wk="-1" ${off <= -WEEKS_BACK ? 'disabled' : ''} aria-label="前の週">◀ 前の週</button><b>${off === 0 ? '今週' : `${mdw(dates[0])}〜`}</b><button class="btn small white" data-wk="1" ${off >= 0 ? 'disabled' : ''} aria-label="次の週">次の週 ▶</button></div>
      <div class="card chart-card" style="margin-top:8px">${chartSVG(dates)}</div>
      <div class="chips hist-days">${dates.map(d => `<button class="chip" data-day="${d}" ${d > t ? 'disabled' : ''} style="${d === sel ? 'background:var(--yellow)' : ''}" aria-label="${mdw(d)} ${intake(d) ? fmt(intake(d)) + 'kcal' : '記録なし'}"><b>${WEEK[parseYmd(d).getDay()]}</b><span class="num">${intake(d) ? fmt(intake(d)) : '-'}</span></button>`).join('')}</div>
      <div class="section-title">${sel === t ? '本日' : `${sdt.getMonth() + 1}/${sdt.getDate()}（${WEEK[sdt.getDay()]}）`}</div>
      <div class="meals3">${cards}</div>
      <div class="card" style="margin-top:12px;padding:10px 14px;display:flex;justify-content:space-between;font-weight:900"><span>合計</span><span class="num">${fmt(intake(sel))} / ${fmt(target(S.user))} kcal</span></div>${edit ? predHTML(sel) : ''}${pfcCard(sd.meals)}${list}${add}`;
  }
}
$('histBody').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.day) { UI.histDate = b.dataset.day; renderHistory(); }
  else if (b.dataset.wk) { UI.histWeek = clamp((UI.histWeek || 0) + +b.dataset.wk, -WEEKS_BACK, 0); UI.histDate = null; se('tap'); renderHistory(); }
  else if (b.dataset.edit) openMealEdit(UI.histDate, b.dataset.edit);
  else if (b.dataset.addmeal) { if (UI.histDate === todayStr()) openCapture(); else openCapture({ date: UI.histDate }); }
});
// ごはんの記録を直す・消す（v9.9：今日と、まだ締めていない日だけ）
function openMealEdit(date, id) {
  const dd = S.days[date], m = dd && dd.meals.find(x => x.id === id);
  if (!m) return;
  if (!canEditDay(date)) { toast('この日はもう しめたので、直せません'); return; }
  const v = x => x == null ? '' : x;
  openModal(`<h2 id="modalTitle">ごはんを直す<small>${mdw(date)}</small></h2><div class="stack">
    <div class="radio-row" id="edSlot">${Object.entries(SLOTS).map(([k, n]) => `<button type="button" data-v="${k}" aria-pressed="${k === m.slot}">${n}</button>`).join('')}</div>
    <div class="form-grid" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr)">
      <label class="f">料理名<input type="text" id="edName" maxlength="30" value="${esc(m.name)}"></label>
      <label class="f">kcal<input type="number" id="edKcal" inputmode="numeric" min="1" max="5000" value="${m.kcal}"></label></div>
    <div class="form-grid pfc-in">
      <label class="f">糖質 g<input type="number" id="edC" inputmode="numeric" min="0" max="1000" value="${v(m.carbs)}" placeholder="－"></label>
      <label class="f">たんぱく質 g<input type="number" id="edP" inputmode="numeric" min="0" max="500" value="${v(m.protein)}" placeholder="－"></label>
      <label class="f">脂質 g<input type="number" id="edF" inputmode="numeric" min="0" max="500" value="${v(m.fat)}" placeholder="－"></label></div>
    <button class="btn block" id="edSave">ほぞんする</button>
    <button class="btn white block" id="edDel">この記録を消す</button></div>`, root => {
    let slotV = m.slot, armed = false;
    root.querySelector('#edSlot').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; slotV = b.dataset.v; root.querySelectorAll('#edSlot button').forEach(x => x.setAttribute('aria-pressed', x === b)); });
    root.querySelector('#edSave').onclick = () => {
      const kcal = Math.round(+root.querySelector('#edKcal').value);
      if (!(kcal > 0 && kcal <= 5000)) { toast('カロリーを1〜5000の数字で入れてください'); return; }
      const g = q => { const x = root.querySelector(q).value; return x === '' ? null : clamp(Math.round(+x) || 0, 0, 1000); };
      const pc = g('#edC'), pp = g('#edP'), pf = g('#edF');
      Object.assign(m, { name: root.querySelector('#edName').value.trim() || '食事', kcal, slot: slotV });
      if (pc != null || pp != null || pf != null) Object.assign(m, { carbs: pc || 0, protein: pp || 0, fat: pf || 0 }); else { delete m.carbs; delete m.protein; delete m.fat; }
      save(); se('coin'); closeModal(); toast('直しました'); setTimeout(checkCrisis, 600);
    };
    root.querySelector('#edDel').onclick = e => {
      if (!armed) { armed = true; e.target.textContent = 'もう一度押すと消えます'; e.target.classList.add('red'); return; }
      const back = mealRefund(date, m);   // v10.3：その記録でふえたスタミナなどを もどす（D30）
      dd.meals = dd.meals.filter(x => x.id !== id); save(); closeModal(); toast(back ? `消しました（スタミナ −${back}）` : '消しました'); setTimeout(checkCrisis, 600);
    };
  });
}
// v10.3：記録を消すとき、その記録でもらったごほうびをもどす。もどしたスタミナを返す
//   今日の記録だけ（きのうの分は あとから足した分で、もともと ごほうびなし）。スタミナは 0 より下にしない
//   v10.3 からの記録は m.rw（ごほうびの回数を使った）・m.st（本当にふえたスタミナ）・m.pb（ミニゲーム +1）を見る
//   それより前の記録は のこっていないので、ルールで考える：その日の「あとから」でない古い記録を順に、ごほうびの回数ぶんが +スタミナ
//   EXP と ごきげん は もどさない（D34）
function mealRefund(date, m) {
  const dd = S.days[date];
  if (!dd || date !== todayStr() || m.time === 'あとから') { tallyAdd('meals', -1); if (m.photo || m.pb) tallyAdd('photos', -1); return 0; }
  tallyAdd('meals', -1); if (m.photo || m.pb) tallyAdd('photos', -1);
  let rw = !!m.rw, st = m.st || 0, pb = !!m.pb;
  if (m.rw == null) {   // 前の版の記録
    const olds = dd.meals.filter(x => x.rw == null && x.time !== 'あとから');
    const oldRw = (dd.mealRewards || 0) - dd.meals.filter(x => x.rw).length;
    rw = olds.indexOf(m) < oldRw; st = rw ? RULE.staminaPerMeal : 0;
    const oldPhotos = olds.filter(x => x.photo), oldPb = (dd.photoBonus || 0) - dd.meals.filter(x => x.pb).length;
    pb = !!m.photo && oldPhotos.indexOf(m) < oldPb;
  }
  if (rw) dd.mealRewards = Math.max(0, (dd.mealRewards || 0) - 1);
  if (pb) dd.photoBonus = Math.max(0, (dd.photoBonus || 0) - 1);
  const back = Math.min(S.stamina, st);
  S.stamina -= back;
  return back;
}
