// にゃんカロ おもいで・ずっとミッション（実績）・ダイヤ・称号（v10.3）
// S.tally＝ずっと数える回数　S.ach＝実績の受けとった段階　S.memo＝おもいで　S.stones＝ダイヤ　S.titles / S.title＝称号
// 数字や文は data.js の ACHIEVE・MEMO・STONE。画面は home.js（ミッション）・neko.js（おもいで・称号）・shop.js（ダイヤ）
// （読みこむ順番は index.html：fx.js のあと。ほかのファイルの関数・変数はそのまま使える）
'use strict';

/* ---------- 数える ---------- */
function tallyAdd(k, n = 1) { if (!S.tally) return; S.tally[k] = Math.max(0, (S.tally[k] || 0) + n); }
// ミニゲームを1回あそんだ（今日の回数と、ずっとの回数）
function bumpMini(d) { d.minis = (d.minis || 0) + 1; tallyAdd('minis'); }
// 図鑑：福袋から出るきせかえだけ数える（実績のきせかえ・「なし」は入れない）
const zukanKeys = () => Object.keys(WEAR).filter(k => !/_none$/.test(k) && !WEAR[k].ach);
const zukanGot = () => zukanKeys().filter(k => S.owned.includes(k)).length;
const walkKm = steps => steps * (S.user.height || 165) * RULE.strideRate / 100000;

/* ---------- ずっとミッション（実績） ---------- */
function achValue(a) {
  const t = S.tally || {};
  if (a.id === 'walk') return Math.floor(walkKm(t.steps || 0) * 10) / 10;
  if (a.id === 'zukan') return zukanGot();
  if (a.id === 'streak') return Math.max(t.bestStreak || 0, S.streak.n || 0);
  return t[a.id] || 0;
}
const achStep = a => Math.min(a.goals.length, S.ach[a.id] || 0);   // 受けとった段階の数
const achCan = a => achStep(a) < a.goals.length && achValue(a) >= a.goals[achStep(a)];
const achAnyCan = () => ACHIEVE.some(achCan);
function achRwText(a, i) {
  const r = a.rw[i] || {}, out = [];
  if (r.coins) out.push(`${fmt(r.coins)}コイン`);
  for (const [k, n] of Object.entries(r.items || {})) out.push(`${(SHOP_ITEMS.find(x => x.id === k) || {}).name || k} ×${n}`);
  if (r.wear) out.push(`きせかえ「${WEAR[r.wear].name}」`);
  if (r.title) out.push(`称号「${r.title}」`);
  if (a.stones[i]) out.push(`💎${a.stones[i]}`);
  return out.join('・');
}
// 受けとる。わたしたコイン（演出用）を返す。受けとれないときは −1
function achClaim(id) {
  const a = ACHIEVE.find(x => x.id === id); if (!a || !achCan(a)) return -1;
  const i = achStep(a), r = a.rw[i] || {};
  S.ach[a.id] = i + 1;
  S.coins += r.coins || 0;
  for (const [k, n] of Object.entries(r.items || {})) S.items[k] = (S.items[k] || 0) + n;
  if (r.wear && !S.owned.includes(r.wear)) S.owned.push(r.wear);
  if (r.title && !S.titles.includes(r.title)) S.titles.push(r.title);
  S.stones = (S.stones || 0) + (a.stones[i] || 0);
  save();
  return r.coins || 0;
}

/* ---------- 称号 ---------- */
// つけられる称号：とどいたレベルの称号（低い順）＋ 実績の称号
function titleList() {
  const lv = Object.keys(LEVEL_UP.titles).map(Number).sort((a, b) => a - b).filter(k => S.cat.level >= k).map(k => LEVEL_UP.titles[k]);
  return [...new Set([...lv, ...(S.titles || [])])];
}
const curTitle = () => (S.title && titleList().includes(S.title) ? S.title : levelTitle(S.cat.level));

/* ---------- おもいで ---------- */
const memoCat = () => ({ breed: S.cat.breed, idx: S.cat.idx, equip: Object.assign({}, S.cat.equip), level: S.cat.level });
const memoHas = (k, v = null) => S.memo.some(m => m.k === k && (m.v ?? null) === v);
const memoFill = (s, m) => s.replace(/\{v\}/g, m.v ?? '').replace(/\{cat\}/g, S.cat.name || '猫');
const memoTitle = m => memoFill((MEMO[m.k] || {}).t || '', m);
const memoText = m => memoFill(((MEMO[m.k] || {}).s || [''])[m.n || 0] || '', m);
// おもいでを1つ足す（同じものは1回だけ）。保存は呼んだ側でする。date＝その日（締めた日など）、null＝「これまで」
let memoToastT = 0;
function memoAdd(k, v = null, date, quiet) {
  if (!MEMO[k] || memoHas(k, v)) return false;
  const m = { k, v, d: date === undefined ? todayStr() : date, n: rand(0, MEMO[k].s.length - 1), cat: memoCat() };
  if (quiet) m.old = true;   // 前の版のデータから作った（猫は いまの すがた）
  S.memo.push(m);
  if (!quiet) {
    S.memoNew = (S.memoNew || 0) + 1;
    clearTimeout(memoToastT); memoToastT = setTimeout(() => { toast(`📖 おもいで「${memoTitle(m)}」が ふえたにゃ`); if (typeof renderHome === 'function') renderHome(); }, 2800);
  }
  return true;
}
// レベルが from → to になった：節目（5・10…）ごとに1つ
function memoLevel(from, to) { for (let lv = (Math.floor(from / LEVEL_UP.every) + 1) * LEVEL_UP.every; lv <= to; lv += LEVEL_UP.every) memoAdd('lv', lv); }
function memoZukan() { const n = zukanGot(); if (n >= 25) memoAdd('zukan25'); if (n >= zukanKeys().length) memoAdd('zukan50'); }
// 新しい順（日付のあるもの）＋ これまで（日付なし）
function memoSorted() {
  const ix = new Map(S.memo.map((m, i) => [m, i]));
  const dated = S.memo.filter(m => m.d).sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : ix.get(b) - ix.get(a)));
  return { dated, old: S.memo.filter(m => !m.d) };
}

/* ---------- 前の版のデータ（v10.2 まで）：数とおもいでを、のこっている記録から作る ---------- */
function longestRun(dates) {
  let best = 0, run = 0, prev = '';
  for (const d of [...new Set(dates)].sort()) { run = prev && addDays(prev, 1) === d ? run + 1 : 1; best = Math.max(best, run); prev = d; }
  return best;
}
function achMigrate() {
  if (S.tally) return;
  const days = Object.entries(S.days), sum = f => days.reduce((a, [, d]) => a + (f(d) || 0), 0);
  const log = ((S.battle && S.battle.log) || []).filter(l => l.win && !l.practice);
  const ate = (S.history || []).filter(h => h.intake > 0).map(h => h.date).concat(days.filter(([, d]) => d.meals.length).map(([k]) => k));
  S.tally = {
    meals: sum(d => d.meals.length),
    photos: sum(d => Math.max(d.photoBonus || 0, d.meals.filter(m => m.photo).length)),   // 7日より前の写真は消えているので、写真つきの回数は少なめになる
    steps: sum(d => d.steps), treasures: sum(d => d.treasures), trains: sum(d => d.trains), minis: sum(d => d.minis),
    wins: Math.max(log.length, (S.battle && S.battle.me && S.battle.me.wins) || 0),
    bestStreak: Math.max(S.streak.n || 0, longestRun(ate))
  };
  // おもいで：日付がわかるものは その日に、わからないものは「これまで」に
  const first = f => days.filter(([, d]) => f(d)).map(([k]) => k).sort()[0];
  const meal1 = [first(d => d.meals.length), ...(S.history || []).filter(h => h.intake > 0).map(h => h.date)].filter(Boolean).sort()[0];
  if (meal1) memoAdd('meal1', null, meal1, true);
  const w = first(d => (d.steps || 0) >= 1000); if (w) memoAdd('walk1k', null, w, true);
  const tr = first(d => (d.treasures || 0) > 0); if (tr) memoAdd('treasure1', null, tr, true);
  for (let lv = LEVEL_UP.every; lv <= S.cat.level; lv += LEVEL_UP.every) memoAdd('lv', lv, null, true);
  if (S.owned.some(k => WEAR[k] && WEAR[k].rar === 'SR' && !WEAR[k].ach)) memoAdd('sr1', null, null, true);
  const z = zukanGot(); if (z >= 25) memoAdd('zukan25', null, null, true); if (z >= zukanKeys().length) memoAdd('zukan50', null, null, true);
  if (S.tally.bestStreak >= 7) memoAdd('streak7', null, null, true);
  if (S.tally.bestStreak >= 30) memoAdd('streak30', null, null, true);
  const win = log.filter(l => l.at).sort((a, b) => a.at - b.at)[0];
  if (win) memoAdd('win1', null, ymd(new Date(win.at)), true); else if (S.tally.wins > 0) memoAdd('win1', null, null, true);
  save();
}
achMigrate();

/* ---------- ダイヤ ---------- */
// n 回ぶん交換（STONE.rate ダイヤ → STONE.coins コイン）。わたしたコインを返す（足りなければ 0）
function stoneExchange(n) {
  n = Math.max(1, Math.round(n || 1));
  if ((S.stones || 0) < STONE.rate * n) return 0;
  S.stones -= STONE.rate * n; S.coins += STONE.coins * n; save();
  return STONE.coins * n;
}
