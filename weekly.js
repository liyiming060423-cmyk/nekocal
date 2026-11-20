// にゃんカロ 1週間（v10.7）
// ねこのアドバイス（きろく）・先週のまとめ（週に1回 出す）・今週のチャレンジ（📋ミッションの「今週」）
// 数字・ことばは data.js の ADV / ADVICE / ADVICE_GOOD / WEEK_CH / WEEK_RW。1週間＝月〜日（rules.js の weekMon）
// S.wk＝今週のチャレンジ { mon, ids, goals, got, allGot }・S.wkPrev＝先週の（まとめで のこりを わたす）・S.weekSeen＝まとめを見せた週の月曜日
'use strict';

const wkDays = mon => Array.from({ length: 7 }, (_, i) => addDays(mon, i));
const wkSun = mon => addDays(mon, 6);
const wkFill = (s, n) => s.replace('{n}', fmt(n));
const wkSum = (a, k) => a.reduce((t, x) => t + (x[k] || 0), 0);
const wkHash = s => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
// その日の目安（締めた日は そのときの目安）
function wkTarget(d) { const h = S.history.find(x => x.date === d); return h && h.target ? h.target : target(S.user); }
// 1日ぶんの数
function wkDay(d) {
  const dd = S.days[d] || {}, ms = dd.meals || [], it = wkSum(ms, 'kcal'), tg = wkTarget(d);
  const sl = new Set(ms.map(m => m.slot)), kc = k => wkSum(ms.filter(m => m.slot === k), 'kcal');
  const ai = ms.filter(m => m.carbs != null);
  return { d, n: ms.length, it, tg, diff: it - tg, main: MAIN_SLOTS.filter(k => sl.has(k)).length, morning: sl.has('morning'),
    night: kc('night'), snack: kc('snack'), steps: dd.steps || 0, trains: dd.trains || 0, photos: ms.filter(m => m.cam || m.photo || m.pb).length,
    ai: ai.length, pe: wkSum(ai, 'protein') * 4, fe: wkSum(ai, 'fat') * 9, ce: wkSum(ai, 'carbs') * 4 };
}
// 1週間の数。D＝はじめた日から 今日までの日、F＝そのうち 終わった日（きのうまで）
function wkStats(mon) {
  const t = todayStr(), D = wkDays(mon).filter(d => d >= S.start && d <= t).map(wkDay);
  return { mon, D, F: D.filter(x => x.d < t) };
}
const wkJust = x => x.n && x.main >= RULE.partialMinMain && Math.abs(x.diff) <= 100;   // ちょうどいい日（ねこ病院の「バランスのいい日」と同じ）

/* ---------- ねこのアドバイス ---------- */
// { tips: [{icon, say, tip, n}], good: {icon, say}, hit: {id: 数} }。しらべる日が ないときは null
function wkAdvice(mon) {
  const { F } = wkStats(mon); if (!F.length) return null;
  const rec = F.filter(x => x.n), hit = {};
  if (rec.length < Math.min(ADV.few, F.length)) hit.few = rec.length;
  if (rec.length) {
    const cnt = f => rec.filter(f).length;
    const noM = cnt(x => !x.morning), over = cnt(x => x.diff > 100), under = cnt(x => x.diff < -100 && x.main >= RULE.partialMinMain);
    const late = cnt(x => x.it > 0 && x.night > x.it * ADV.lateShare);
    if (noM >= ADV.morning) hit.morning = noM;
    if (over >= ADV.over) hit.over = over;
    if (under >= ADV.under) hit.under = under;
    if (late >= ADV.late) hit.late = late;
    const tot = wkSum(rec, 'it'), sn = wkSum(rec, 'snack');
    if (tot && sn / tot > ADV.snackShare) hit.snack = Math.round(sn / tot * 100);
    if (wkSum(rec, 'ai') >= ADV.pfcMin) {   // 栄養：いちばん 目安から はなれている 1つだけ
      const e = { p: wkSum(rec, 'pe'), f: wkSum(rec, 'fe'), c: wkSum(rec, 'ce') }, et = e.p + e.f + e.c || 1, pc = k => Math.round(e[k] / et * 100);
      const off = [['pfcP', PFC_REF.protein[0] - pc('p'), pc('p')], ['pfcF', pc('f') - PFC_REF.fat[1], pc('f')], ['pfcC', pc('c') - PFC_REF.carbs[1], pc('c')]]
        .filter(o => o[1] > 0).sort((a, b) => b[1] - a[1])[0];
      if (off) hit[off[0]] = off[2];
    }
    const stp = Math.round(wkSum(rec, 'steps') / rec.length);
    if (stp < ADV.steps) hit.steps = stp;
  }
  const tips = ADVICE.filter(a => a.id in hit).slice(0, ADV.tips).map(a => ({ icon: a.icon, say: a.say, tip: wkFill(a.tip, hit[a.id]), id: a.id }));
  let good = null;
  if (rec.length) {
    const g = { just: rec.filter(wkJust).length, three: rec.filter(x => x.main === 3).length, streak: S.streak.n, steps: Math.round(wkSum(rec, 'steps') / rec.length) };
    const ok = { just: g.just >= ADV.goodJust, three: g.three >= ADV.goodThree, streak: g.streak >= ADV.goodStreak, steps: g.steps >= ADV.goodSteps, thanks: true };
    const a = ADVICE_GOOD.find(x => ok[x.id]); good = { icon: a.icon, say: wkFill(a.say, g[a.id] || 0), id: a.id };
  }
  return { tips, good, hit, rec: rec.length, days: F.length };
}
function adviceHTML(adv, cls = '') {
  return `<div class="card adv-card ${cls}"><div class="adv-head"><span class="adv-cat">${I.user}</span><b>ねこのアドバイス</b><small class="adv-note">記録から 見た 目安です</small></div>
    ${adv.tips.length ? `<ul class="adv-list">${adv.tips.map(t => `<li><span class="adv-ic" aria-hidden="true">${t.icon}</span><div><b>${esc(t.say)}</b><small>${esc(t.tip)}</small></div></li>`).join('')}</ul>` : ''}
    ${adv.good ? `<p class="adv-good"><span aria-hidden="true">${adv.good.icon}</span>${esc(adv.good.say)}</p>` : ''}</div>`;
}

/* ---------- 今週のチャレンジ ---------- */
// しんちょく（D＝今日まで・F＝きのうまで）
const WK_PROG = {
  rec5: D => D.filter(x => x.n).length,
  morning4: D => D.filter(x => x.morning).length,
  three3: D => D.filter(x => x.main === 3).length,
  photo5: D => wkSum(D, 'photos'),
  just3: (D, F) => F.filter(wkJust).length,
  late3: (D, F) => F.filter(x => x.main >= RULE.partialMinMain && x.night < x.it * ADV.lateShare).length,
  prot2: (D, F) => F.filter(x => x.ai && x.pe / (x.pe + x.fe + x.ce || 1) * 100 >= PFC_REF.protein[0]).length,
  steps15k: D => wkSum(D, 'steps'),
  walk3: D => D.filter(x => x.steps >= 2000).length,
  train5: D => wkSum(D, 'trains')
};
const wkCh = id => WEEK_CH.find(c => c.id === id);
function wkProg(id, mon) { const s = wkStats(mon), f = WK_PROG[id]; return f ? f(s.D, s.F) : 0; }
const wkGoal = (w, i) => (w.goals && w.goals[i]) || wkCh(w.ids[i]).goal;
const wkDone = (w, i) => wkProg(w.ids[i], w.mon) >= wkGoal(w, i);
// その週の3つを えらぶ：記録・バランス・うごく から 1つずつ。先週の アドバイスに あうもの（fix）を 先に。なければ 週で きまる くじ
function wkPick(mon) {
  const pm = addDays(mon, -7), adv = S.start <= wkSun(pm) ? wkAdvice(pm) : null, hit = adv ? adv.hit : {};
  const pfc = wkStats(pm).D.some(x => x.ai), order = ADVICE.map(a => a.id).filter(id => id in hit);
  return ['rec', 'bal', 'move'].map(g => {
    const cs = WEEK_CH.filter(c => c.g === g && (!c.need || pfc));
    for (const id of order) { const c = cs.find(x => (x.fix || []).includes(id)); if (c) return c.id; }
    return cs[wkHash(mon + g) % cs.length].id;
  });
}
// はじめた週は、のこりの日数に あわせて 目標を へらす
function wkGoals(mon, ids) {
  const days = 7 - clamp(daysBetween(mon, S.start), 0, 6);
  return ids.map(id => { const g = wkCh(id).goal; if (days >= 7) return g; const v = g * days / 7; return wkCh(id).unit === '歩' ? Math.max(1000, Math.round(v / 1000) * 1000) : Math.max(1, Math.round(v)); });
}
// 週が かわったら 新しい チャレンジ（rules.js の rollover から）。かわったら true
function weekRoll() {
  const mon = weekMon(todayStr());
  if (S.wk && S.wk.mon === mon) return false;
  if (S.wk && S.wk.mon < mon) {
    if (S.wkPrev && !S.wkPrev.paid) wkPay(S.wkPrev);   // まとめを 見ないまま 次の週に なった分
    S.wkPrev = S.wk;
    if (S.wkPrev.mon < addDays(mon, -7)) wkPay(S.wkPrev);   // 2週より前の分は まとめに 出さないので ここで わたす
  }
  const ids = wkPick(mon);
  S.wk = { mon, ids, goals: wkGoals(mon, ids), got: [], allGot: false };
  return true;
}
// ごほうびを わたす（1つ）。{ coins, stones } か null
function wkGive(w, i) {
  if (w.got.includes(w.ids[i]) || !wkDone(w, i)) return null;
  w.got.push(w.ids[i]); S.coins += WEEK_RW.coins;
  let stones = 0;
  if (!w.allGot && w.ids.every(id => w.got.includes(id))) { w.allGot = true; stones = WEEK_RW.allStones; S.stones = (S.stones || 0) + stones; }
  return { coins: WEEK_RW.coins, stones };
}
function wkClaim(id) { const w = S.wk; if (!w) return null; const r = wkGive(w, w.ids.indexOf(id)); if (r) save(); return r; }
// 先週の のこり（クリアしたのに 受けとっていない分）を まとめて わたす
function wkPay(w) {
  const out = { coins: 0, stones: 0, ids: [] };
  if (w.paid) return w.pay || out;
  w.ids.forEach((id, i) => { const r = wkGive(w, i); if (r) { out.coins += r.coins; out.stones += r.stones; out.ids.push(id); } });
  w.paid = true; w.pay = out; return out;
}
const wkCanAny = () => !!S.wk && S.wk.ids.some((id, i) => !S.wk.got.includes(id) && wkDone(S.wk, i));
function wkRowHTML(w, i, btn) {
  const c = wkCh(w.ids[i]), goal = wkGoal(w, i), p = Math.min(wkProg(c.id, w.mon), goal), done = p >= goal, got = w.got.includes(c.id);
  const right = !btn ? `<span class="wk-mark" aria-label="${done ? 'クリア' : 'まだ'}">${done ? '✅' : '・'}</span>`
    : got ? '<span class="hint" style="font-weight:900">受けとり済み</span>' : `<button class="btn small ${done ? 'yellow' : 'white'}" data-wkc="${c.id}" ${done ? '' : 'disabled'}>受けとる</button>`;
  return `<div class="card mission wk-row"><div class="grow"><div style="font-weight:900"><span aria-hidden="true">${c.icon}</span> ${esc(c.name)}</div>
    <div class="hint"><span class="num">${fmt(p)}</span> / ${fmt(goal)}${c.unit}${btn ? `　報酬 ${WEEK_RW.coins}コイン` : ''}</div><div class="prog"><i style="width:${p / goal * 100}%"></i></div></div>${right}</div>`;
}
// ミッションの「今週」
function wkMissionHTML() {
  if (weekRoll()) save();
  const w = S.wk, left = daysBetween(todayStr(), wkSun(w.mon)) + 1, n = w.got.length;
  return `<div class="list">${w.ids.map((_, i) => wkRowHTML(w, i, true)).join('')}</div>
    <div class="card wk-all${w.allGot ? ' got' : ''}"><span aria-hidden="true">💎</span><span class="grow">${w.allGot ? `3つ ぜんぶ クリア！ ダイヤ +${WEEK_RW.allStones}` : `3つ ぜんぶ 受けとると ダイヤ +${WEEK_RW.allStones}`}</span><b class="num">${n} / 3</b></div>
    <p class="hint" style="margin-top:10px">月曜に 新しくなります（のこり ${left}日）。先週の 記録に あわせて えらんでいます。クリアして 受けとらなかった分は 先週のまとめで わたします。</p>`;
}

/* ---------- 先週のまとめ ---------- */
// 出すとき：先週の日曜日が 締まっていて（12時か「これでしめる」）、先週も 遊んでいて、まだ 見せていない
function weekSumDue() {
  const mon = weekMon(todayStr()), lm = addDays(mon, -7), ls = addDays(mon, -1);
  return (S.weekSeen || '') < lm && S.start <= ls && S.settled >= ls;
}
function weekSumHTML(mon, pay) {
  const { F } = wkStats(mon), rec = F.filter(x => x.n), adv = wkAdvice(mon), sun = wkSun(mon);
  const avg = rec.length ? Math.round(wkSum(rec, 'it') / rec.length) : 0, tg = rec.length ? Math.round(wkSum(rec, 'tg') / rec.length) : target(S.user);
  const hs = S.history.filter(h => h.date >= mon && h.date <= sun), w = [S.wkPrev, S.wk].find(x => x && x.mon === mon);
  const cell = (lbl, v, u, sub = '') => `<div><small>${lbl}</small><b class="num">${v}<span>${u}</span></b>${sub ? `<small>${sub}</small>` : ''}</div>`;
  let body = '';
  if (hs.length) { const from = hs[0].idx - hs[0].change, to = hs[hs.length - 1].idx; body = `<div class="wk-body"><span>体型</span><span>${bodyState(from)[0]}</span><span aria-hidden="true">→</span><b>${bodyState(to)[0]}</b><span class="num">（${signed(to - from)}）</span></div>`; }
  const chs = w ? `<div class="card wk-chs"><div class="wk-sec">チャレンジ <b class="num">${w.ids.filter((_, i) => wkDone(w, i)).length} / 3</b></div>${w.ids.map((id, i) => { const c = wkCh(id), ok = wkDone(w, i); return `<div class="wk-ch${ok ? ' ok' : ''}"><span aria-hidden="true">${ok ? '✅' : '・'}</span><span>${c.icon} ${esc(c.name)}</span></div>`; }).join('')}
    ${pay && (pay.coins || pay.stones) ? `<p class="wk-pay">受けとっていない分：<b class="res-coin">コイン +${fmt(pay.coins)}</b>${pay.stones ? `　<b>💎+${pay.stones}</b>` : ''}</p>` : ''}</div>` : '';
  return `<div class="stack wk-sum"><div class="wk-grid">${cell('記録', rec.length, `/${F.length}日`)}${cell('1日の平均', fmt(avg), 'kcal', `目安 ${fmt(tg)}`)}${cell('ちょうどいい', rec.filter(wkJust).length, '日')}${cell('歩数', fmt(wkSum(F, 'steps')), '歩')}</div>
    ${body}${chs}${adv ? adviceHTML(adv, 'in-sum') : ''}`;
}
// view＝きろく から 見るとき（ごほうびは わたさない）
function showWeekSum(mon, view) {
  const t = todayStr(); mon = mon || addDays(weekMon(t), -7);
  let pay = null;
  if (!view) { S.weekSeen = mon; if (S.wkPrev && S.wkPrev.mon === mon) pay = wkPay(S.wkPrev); weekRoll(); save(); }
  const w = S.wk, next = !view && w ? `<div class="card wk-next"><div class="wk-sec">今週のチャレンジ</div>${w.ids.map((id, i) => `<span class="chip">${wkCh(id).icon} ${esc(wkCh(id).s)} ${fmt(wkGoal(w, i))}${wkCh(id).unit}</span>`).join('')}</div>` : '';
  openModal(`<h2 id="modalTitle">${view ? 'この週のまとめ' : '先週のまとめ'}<small>${mdw(mon)}〜${mdw(wkSun(mon))}</small></h2>${weekSumHTML(mon, pay)}
    ${next}<button class="btn block" id="wsOk">OK</button>`, root => {
    root.querySelector('#wsOk').onclick = closeModal;
    if (pay && (pay.coins || pay.stones)) setTimeout(() => { se('get'); const el = root.querySelector('.res-coin'); if (el && pay.coins) coinFx(pay.coins, el); }, 500);
  }, view ? null : () => setTimeout(maybeShowDaily, 300));
}
// きろく の アドバイス（その週）＋ まとめ・チャレンジへの ボタン
function histAdviceHTML(off, dates) {
  const mon = dates[0], adv = wkAdvice(mon);
  if (off < 0) return adv ? `${adviceHTML(adv)}<button class="btn white block wk-link" data-wksum="${mon}">📊 この週のまとめ</button>` : '';
  const w = S.wk, n = w && w.mon === mon ? w.ids.filter((_, i) => wkDone(w, i)).length : 0;
  const link = `<button class="btn white block wk-link" data-wkch="1">📋 今週のチャレンジ <span class="num">${n} / 3</span> ▶</button>`;
  return (adv ? adviceHTML(adv) : `<div class="card adv-card"><div class="adv-head"><span class="adv-cat">${I.user}</span><b>ねこのアドバイス</b></div><p class="adv-good">今週の アドバイスは あしたから。今日の ごはんを 記録してにゃ</p></div>`) + link;
}
