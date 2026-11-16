// にゃんカロ ゲームのルール
// 目標カロリー・体型の変わり方・1日の締め（v9.9）・ねこ病院・連続記録・猫のSOS・経験値。数字は data.js、計算はここ
// （v10.0 で app.js から分けた。読みこむ順番は index.html。ほかのファイルの関数・変数はそのまま使える）
'use strict';

/* =========================================================
   4. 計算ルール
   ========================================================= */
// 基礎代謝（Mifflin-St Jeor 式）
const bmr = u => Math.round(10 * u.weight + 6.25 * u.height - 5 * u.age + (u.sex === 'male' ? 5 : -161));
// 1日の目標（安全のため 1200kcal より下にはしない）
const target = u => Math.max(1200, bmr(u) + (u.goal === 'lose' ? -u.delta : u.goal === 'gain' ? u.delta : 0));
// 1日を締めたときの体型の変化
function bodyChange(diff, idx) {
  if (Math.abs(diff) <= 100) return idx === 0 ? 0 : -Math.sign(idx) * Math.min(5, Math.abs(idx));
  return clamp(Math.round(diff / 20), -40, 40);
}
function bodyState(idx) {
  if (idx <= -100) return ['骸骨', '#8E8E8E']; if (idx < -70) return ['骸骨寸前', '#E0573F']; if (idx < -35) return ['やせすぎ', '#4C8FD6'];
  if (idx < -12) return ['ほっそり', '#4C8FD6']; if (idx <= 12) return ['ちょうどいい', '#4FAE5B']; if (idx <= 35) return ['ぽっちゃり', '#F0943F'];
  if (idx <= 70) return ['でぶ猫', '#F0943F']; if (idx < 100) return ['破裂寸前', '#E0573F']; return ['爆発', '#E0573F'];
}
const expNeed = lv => 50 + lv * 50;
const statWithBonus = k => S.cat.stats[k] + ['head', 'top', 'hand', 'suit'].reduce((a, sl) => a + (((WEAR[S.cat.equip[sl]] || {}).bonus || {})[k] || 0), 0);
function mealSlotNow() { const h = new Date().getHours() + new Date().getMinutes() / 60; return h < 10.5 ? 'morning' : h < 15.5 ? 'noon' : 'night'; }

/* ---------- 1日の締め（v9.9） ----------
   0時：ごきげんが下がる・古い写真を消す（今までどおり）。
   体型の計算（締め）は、すぐにはしない。きのうの分は 今日の RULE.closeHour 時まで待つ（わすれたごはんを足せるように）。
   「これでしめる」を押すか、時刻をすぎたら締める。おとといより前の日は待たずに締める。
   締めた結果は S.resultQ にためて、「きのうの結果」で見せる。 */
const MAIN_SLOTS = ['morning', 'noon', 'night'];
const weekMon = d => { const x = parseYmd(d); return addDays(d, -((x.getDay() + 6) % 7)); };   // その週の月曜日
// ある日のごはんで体型がどう変わるか（計算だけ。from=いまの体型）
function dayChange(d, from) {
  const tg = target(S.user), meals = (S.days[d] && S.days[d].meals) || [], it = intake(d);
  const main = new Set(meals.map(m => m.slot).filter(x => MAIN_SLOTS.includes(x))).size;
  if (!meals.length) return { tg, it, main, n: 0, diff: null, ch: 0, partial: false };
  const diff = it - tg; let ch = bodyChange(diff, from), partial = false;
  // 記録が少なくて、目標より少ない日：わすれているだけかもしれないので、やせる方向は少しだけ
  if (main < RULE.partialMinMain && diff < -100) { partial = true; ch = Math.max(ch, -RULE.partialCap); }
  return { tg, it, main, n: meals.length, diff, ch, partial };
}
// まだ締めていない日（ふつうは きのう だけ）
const pendingDays = () => { const out = [], t = todayStr(); for (let d = addDays(S.settled, 1); d < t; d = addDays(d, 1)) out.push(d); return out; };
const pendingYesterday = () => S.settled < addDays(todayStr(), -1);
// ごはんを足したり直したりできる日：今日と、まだ締めていない日
const canEditDay = d => d === todayStr() || (d > S.settled && d < todayStr());

// 日付が変わったときの処理。日付が変わったか、締めた日があれば true を返す
function rollover() {
  const t = todayStr();
  let changed = false;
  if (S.last !== t) {
    let d = S.last;
    while (d < t) { S.mood = clamp((S.mood ?? RULE.moodStart) + RULE.moodPerDay, 0, 100); d = addDays(d, 1); }
    S.last = t; changed = true;
    // 7日より前の写真は消して容量を節約（60日より前の記録は消す）
    Object.keys(S.days).forEach(k => { if (daysBetween(k, t) > 7) S.days[k].meals.forEach(m => { m.photo = null; }); if (daysBetween(k, t) > 60) delete S.days[k]; });
  }
  if (settleDue(false)) changed = true;
  if (changed) save();
  return changed;
}
// 締める日を締める。now=true なら きのうも今すぐ締める（「これでしめる」）
function settleDue(now) {
  const t = todayStr(), y = addDays(t, -1), wait = !now && new Date().getHours() < RULE.closeHour;
  let any = false;
  for (let d = addDays(S.settled, 1); d < t; d = addDays(d, 1)) {
    if (d === y && wait) break;
    settleDay(d); S.settled = d; any = true;
  }
  if (checkDischarge()) any = true;
  if (any) save();
  return any;
}
function settleDay(d) {
  const from = S.cat.idx, r = dayChange(d, from), hosp = S.cat.hospital;
  let to = clamp(from + r.ch, -100, 100), event = null, lost = 0;
  if (hosp) {
    // 入院中：もう倒れない。バランスのいい日を数える（入院した日から）
    to = clamp(to, -90, 90);
    if (d >= hosp.from && r.n && r.main >= RULE.partialMinMain && Math.abs(r.diff) <= 100) hosp.good = (hosp.good || 0) + 1;
  }
  S.cat.idx = to;
  // 連続記録とコイン（おやすみ券は1週間に STREAK.passPerWeek 枚。いまは1枚の前提で、使った週を覚える）
  const st = S.streak; let coins = 0, pass = false;
  if (r.n) {
    st.n++; coins = STREAK.perDay + (STREAK.bonus[st.n] || (st.n > 30 && st.n % 30 === 0 ? STREAK.bonus[30] : 0));
  } else if (st.n > 0 && STREAK.passPerWeek > 0 && st.pass !== weekMon(d)) { st.pass = weekMon(d); pass = true; }
  else st.n = 0;
  S.coins += coins;
  // 骸骨・爆発 → ねこ病院に入院（次の日から）
  if (!hosp && Math.abs(to) >= 100) {
    const reason = to < 0 ? 'skel' : 'boom', start = addDays(d, 1);
    lost = Math.min(HOSPITAL.coinMax, Math.floor(S.coins * HOSPITAL.coinRate));
    S.coins -= lost; S.mood = HOSPITAL.mood;
    S.cat.hospital = { from: start, until: addDays(start, HOSPITAL.days), reason, good: 0 };
    S.cat.idx = reason === 'boom' ? HOSPITAL.admitIdx : -HOSPITAL.admitIdx;
    S.cat.alert = { hi: 0, lo: 0 };
    event = reason;
  }
  S.history.push({ date: d, intake: r.it, target: r.tg, diff: r.diff, change: to - from, idx: S.cat.idx });
  S.resultQ.push({ date: d, it: r.it, tg: r.tg, diff: r.diff, n: r.n, from, to, partial: r.partial, coins, streak: st.n, pass, event, lost });
  if (S.resultQ.length > 40) S.resultQ.splice(0, S.resultQ.length - 40);
}
// 退院できるか（日数がたった・バランスのいい日がそろった）。退院したら true
function checkDischarge() {
  const h = S.cat.hospital; if (!h) return false;
  if (todayStr() < h.until && (h.good || 0) < HOSPITAL.goodDays) return false;
  const from = S.cat.idx;
  if (Math.abs(S.cat.idx) > HOSPITAL.leaveIdx) S.cat.idx = Math.sign(S.cat.idx) * HOSPITAL.leaveIdx;
  S.cat.hospital = null; S.cat.alert = { hi: 0, lo: 0 };
  S.resultQ.push({ event: 'leave', from, to: S.cat.idx, early: todayStr() < h.until });
  return true;
}
/* ---- 猫のSOS（骸骨・爆発の前に知らせる） ----
   太る側：今の体型と「今日このまま1日が終わったら」の体型の大きいほう で判断（食べるほど増えるので前もって分かる）
   やせる側：今の体型で判断（朝はまだ食べていないので、今日の予想は使わない）
   1回目 ±crisisWarn、2回目 ±crisisDanger。体型がもどったら、また鳴けるようにする */
const CRISIS = {
  // v9.8：「食べないで」とは言わず、体を動かすほうにさそう
  hi: [null, { say: 'く、くるしいにゃ…おなかパンパン…！', note: 'おなかがパンパンで苦しそう…！ さんぽやジムで、いっしょに体を動かそう' },
    { say: 'もう限界にゃーーっ！！爆発しちゃうにゃ！！', note: '「もう限界にゃーっ！！」このままだと爆発しちゃう！ 今日はもう十分食べたにゃ。さんぽやジムで動こう！' }],
  lo: [null, { say: 'おなかすきすぎて…力が出ないにゃ…', note: 'おなかがすきすぎてフラフラ…。ちゃんと食べさせてあげて！' },
    { say: 'た、たすけてにゃ…骨になっちゃうにゃ…！', note: '「たすけてにゃ…！」このままだと骸骨になってしまいます！しっかり食べて！' }]
};
function crisisNow() {
  if (S.cat.hospital || !S.onboarded) return null;
  const t = todayStr(), proj = clamp(S.cat.idx + dayChange(t, S.cat.idx).ch, -100, 100);
  const hi = Math.max(S.cat.idx, proj), lo = S.cat.idx;
  const st = v => v >= RULE.crisisDanger ? 2 : v >= RULE.crisisWarn ? 1 : 0;
  const hs = st(hi), ls = st(-lo);
  if (hs) return { side: 'hi', stage: hs, ...CRISIS.hi[hs] };
  if (ls) return { side: 'lo', stage: ls, ...CRISIS.lo[ls] };
  return null;
}
function checkCrisis() {
  if (!S.onboarded || S.cat.hospital) return;
  const a = S.cat.alert || (S.cat.alert = { hi: 0, lo: 0 }), c = crisisNow();
  // もどったら段階を下げておく（また悪くなったら鳴く）
  ['hi', 'lo'].forEach(k => { const cur = c && c.side === k ? c.stage : 0; if (cur < a[k]) a[k] = cur; });
  if (!c || c.stage <= a[c.side]) { save(); return; }
  a[c.side] = c.stage; save();
  petSound('cry'); if (c.stage === 2) setTimeout(() => petSound('cry'), 1300);
  if (S.settings.vibrate && navigator.vibrate) { try { navigator.vibrate(c.stage === 2 ? [300, 120, 300, 120, 600] : [200, 100, 300]); } catch (e) {} }
  if (UI.tab === 'home' && $('bubble')) { $('bubble').textContent = c.say; $('bubble').hidden = false; $('bubble').classList.remove('pop'); void $('bubble').offsetWidth; $('bubble').classList.add('pop'); }
  document.body.classList.remove('sos'); void document.body.offsetWidth; document.body.classList.add('sos');
  toast(`${S.cat.name}：${c.say}`);
  const s = S.settings;
  if (s.notify && 'Notification' in window && Notification.permission === 'granted') {
    const opt = { body: `${S.cat.name}${c.note}`, icon: 'icon-192.png', tag: 'nyankalo-sos', renotify: true, vibrate: [300, 120, 300] };
    if (navigator.serviceWorker && navigator.serviceWorker.ready) navigator.serviceWorker.ready.then(r => r.showNotification(`🙀 ${S.cat.name}のSOS`, opt)).catch(() => {});
    else try { new Notification(`🙀 ${S.cat.name}のSOS`, opt); } catch (e) {}
  }
}
function addExp(n) {
  S.cat.exp += n;
  while (S.cat.exp >= expNeed(S.cat.level)) { S.cat.exp -= expNeed(S.cat.level); S.cat.level++; S.coins += 50; setTimeout(() => { toast(`猫レベル ${S.cat.level} にアップ！ コイン +50`); se('get'); }, 700); }
}
function addStamina(n) { S.stamina = clamp(S.stamina + n, 0, 100); }
function addMood(n) { S.mood = clamp((S.mood ?? RULE.moodStart) + n, 0, 100); }
