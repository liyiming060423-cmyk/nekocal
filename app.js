// にゃんカロ 本体（状態の保存・計算・画面の表示）
'use strict';

/* =========================================================
   1. 小さな道具
   ========================================================= */
const KEY = 'nyankalo-v1';
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = n => Number(n || 0).toLocaleString('ja-JP');
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => ymd(new Date());
const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const daysBetween = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 86400000);

/* =========================================================
   2. アイコン（SVG）
   ========================================================= */
const I = {
  user: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 22 L12 6 L22 14 Z M38 22 L36 6 L26 14 Z" fill="#F2A65A" stroke="#4A2A1A" stroke-width="2.5" stroke-linejoin="round"/><ellipse cx="24" cy="26" rx="16" ry="14" fill="#F2A65A" stroke="#4A2A1A" stroke-width="2.5"/><circle cx="18" cy="25" r="2" fill="#4A2A1A"/><circle cx="30" cy="25" r="2" fill="#4A2A1A"/><path d="M22 30 h4 l-2 2 z" fill="#E8607A"/></svg>`,
  gift: `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="20" width="32" height="22" rx="3" fill="#E0573F" stroke="#4A2A1A" stroke-width="2.5"/><rect x="5" y="14" width="38" height="9" rx="3" fill="#F7C64B" stroke="#4A2A1A" stroke-width="2.5"/><path d="M24 14 V42" stroke="#F7C64B" stroke-width="6"/><path d="M24 14 V42" stroke="#4A2A1A" stroke-width="1.5" stroke-dasharray="0"/><path d="M24 14 C18 4 10 8 14 13 Z M24 14 C30 4 38 8 34 13 Z" fill="#F7C64B" stroke="#4A2A1A" stroke-width="2.5" stroke-linejoin="round"/></svg>`,
  mission: `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="10" y="8" width="28" height="34" rx="4" fill="#FFFFFF" stroke="#4A2A1A" stroke-width="2.5"/><rect x="17" y="4" width="14" height="8" rx="3" fill="#F0943F" stroke="#4A2A1A" stroke-width="2.5"/><path d="M16 22 l3 3 5 -6 M16 32 l3 3 5 -6" fill="none" stroke="#4FAE5B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M27 23 h6 M27 33 h6" stroke="#4A2A1A" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  camera: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.6"/></svg>`,
  pad: `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="#4A2A1A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="7" width="19" height="11" rx="5"/><path d="M7.5 10.5v4M5.5 12.5h4"/><circle cx="16" cy="11.5" r="1" fill="#4A2A1A"/><circle cx="18" cy="13.8" r="1" fill="#4A2A1A"/></svg>`,
  coin: `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#F7C64B" stroke="#4A2A1A" stroke-width="1.6"/><ellipse cx="12" cy="15" rx="4.2" ry="3.4" fill="#8A5A12"/><circle cx="7.4" cy="10" r="1.7" fill="#8A5A12"/><circle cx="10.4" cy="7.4" r="1.7" fill="#8A5A12"/><circle cx="13.6" cy="7.4" r="1.7" fill="#8A5A12"/><circle cx="16.6" cy="10" r="1.7" fill="#8A5A12"/></svg>`,
  stone: `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M12 2 L21 9 L12 22 L3 9 Z" fill="#7FC4F2" stroke="#4A2A1A" stroke-width="1.6" stroke-linejoin="round"/><path d="M3 9 h18 M12 2 L8 9 L12 22 L16 9 Z" fill="none" stroke="#4A2A1A" stroke-width="1.2"/></svg>`,
  steps: `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><ellipse cx="8" cy="9" rx="3.4" ry="5" fill="#4C8FD6" stroke="#4A2A1A" stroke-width="1.4"/><ellipse cx="8" cy="17.5" rx="2.4" ry="2" fill="#4C8FD6" stroke="#4A2A1A" stroke-width="1.4"/><ellipse cx="16" cy="6" rx="3.2" ry="4.6" fill="#4C8FD6" stroke="#4A2A1A" stroke-width="1.4"/><ellipse cx="16" cy="13.8" rx="2.3" ry="1.9" fill="#4C8FD6" stroke="#4A2A1A" stroke-width="1.4"/></svg>`,
  bag: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#4A2A1A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>`,
  dumb: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#4A2A1A" stroke-width="2.4" stroke-linecap="round"><path d="M6 7v10M18 7v10M3 9.5v5M21 9.5v5M6 12h12"/></svg>`,
  house: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#4A2A1A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-5.5a2 2 0 0 1 4 0V20" fill="#8A5A3C"/></svg>`,
  cal: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#4A2A1A" stroke-width="2.2" stroke-linecap="round"><rect x="4" y="5.5" width="16" height="14.5" rx="2" fill="#FFFFFF"/><path d="M4 10h16" /><path d="M9 3.5v4M15 3.5v4"/><circle cx="9" cy="14" r=".8" fill="#4A2A1A"/><circle cx="12" cy="14" r=".8" fill="#4A2A1A"/><circle cx="15" cy="14" r=".8" fill="#4A2A1A"/><circle cx="9" cy="17" r=".8" fill="#4A2A1A"/><circle cx="12" cy="17" r=".8" fill="#4A2A1A"/></svg>`,
  gear: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#4A2A1A" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M5.5 18.5l2.1-2.1M16.4 7.6l2.1-2.1"/></svg>`,
  drink: `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="16" y="6" width="16" height="6" rx="2" fill="#4FAE5B" stroke="#4A2A1A" stroke-width="2.5"/><path d="M14 14 h20 l-2 28 h-16 z" fill="#BFE7C3" stroke="#4A2A1A" stroke-width="2.5" stroke-linejoin="round"/><path d="M24 20 l-4 9 h5 l-3 8" fill="none" stroke="#F0943F" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  protein: `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="10" y="8" width="28" height="8" rx="3" fill="#4C8FD6" stroke="#4A2A1A" stroke-width="2.5"/><rect x="11" y="16" width="26" height="26" rx="5" fill="#FFFFFF" stroke="#4A2A1A" stroke-width="2.5"/><text x="24" y="33" text-anchor="middle" font-size="9" font-weight="900" fill="#4A2A1A" font-family="sans-serif">PRO</text></svg>`,
  sandbag: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 2 V8" stroke="#4A2A1A" stroke-width="2.5"/><rect x="14" y="8" width="20" height="36" rx="9" fill="#8B5A3C" stroke="#4A2A1A" stroke-width="2.5"/><path d="M14 16 h20 M14 36 h20" stroke="#4A2A1A" stroke-width="2"/></svg>`,
  tread: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 36 L40 30" stroke="#4A2A1A" stroke-width="5" stroke-linecap="round"/><path d="M36 30 L32 10 h8" fill="none" stroke="#4A2A1A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="40" r="3" fill="#4A2A1A"/><circle cx="36" cy="35" r="3" fill="#4A2A1A"/><rect x="30" y="6" width="12" height="7" rx="2" fill="#4C8FD6" stroke="#4A2A1A" stroke-width="2"/></svg>`,
  barbell: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M4 24 H44" stroke="#9AA3A8" stroke-width="4" stroke-linecap="round"/><rect x="8" y="12" width="7" height="24" rx="2" fill="#2E3A4A" stroke="#4A2A1A" stroke-width="2"/><rect x="33" y="12" width="7" height="24" rx="2" fill="#2E3A4A" stroke="#4A2A1A" stroke-width="2"/><rect x="15" y="16" width="5" height="16" rx="2" fill="#E0573F" stroke="#4A2A1A" stroke-width="2"/><rect x="28" y="16" width="5" height="16" rx="2" fill="#E0573F" stroke="#4A2A1A" stroke-width="2"/></svg>`,
  plate: `<svg viewBox="0 0 64 50" aria-hidden="true"><ellipse cx="32" cy="36" rx="26" ry="9" fill="#E6EEF4" stroke="#4A2A1A" stroke-width="2"/><g transform="translate(18 2) scale(.5)"><path d="M10 26 L12 4 L26 16 Z M50 26 L48 4 L34 16 Z" fill="#F2A65A" stroke="#4A2A1A" stroke-width="3" stroke-linejoin="round"/><ellipse cx="30" cy="32" rx="24" ry="20" fill="#F2A65A" stroke="#4A2A1A" stroke-width="3"/><path d="M18 30 q4 4 8 0 M34 30 q4 4 8 0" fill="none" stroke="#4A2A1A" stroke-width="3" stroke-linecap="round"/><ellipse cx="30" cy="42" rx="4" ry="3" fill="#7A2E2E"/></g></svg>`
};
function bagSVG(c) {
  return `<svg viewBox="0 0 60 70" aria-hidden="true"><path d="M14 26 Q8 64 30 66 Q52 64 46 26 Z" fill="${c}" stroke="#4A2A1A" stroke-width="3" stroke-linejoin="round"/><path d="M18 26 Q30 14 42 26 Z" fill="${c}" stroke="#4A2A1A" stroke-width="3"/><path d="M18 26 Q30 32 42 26" fill="none" stroke="#F7C64B" stroke-width="4"/><path d="M24 14 l6 6 6 -6" fill="none" stroke="#F7C64B" stroke-width="4" stroke-linecap="round"/><circle cx="30" cy="46" r="9" fill="#FFFFFF" stroke="#4A2A1A" stroke-width="2"/><text x="30" y="50" text-anchor="middle" font-size="11" font-weight="900" fill="#E0573F" font-family="sans-serif">福</text></svg>`;
}
function wearIcon(id) {
  const w = WEAR[id]; if (!w) return '';
  const L = '#4A2A1A';
  if (w.slot === 'head') {
    if (id === 'band_none') return `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="14" fill="none" stroke="#B9A48E" stroke-width="3" stroke-dasharray="4 4"/></svg>`;
    if (id === 'crown') return `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 36 V14 l9 10 7 -14 7 14 9 -10 V36 Z" fill="#E9B730" stroke="${L}" stroke-width="2.5" stroke-linejoin="round"/></svg>`;
    if (id === 'cap_red') return `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 30 Q10 10 28 10 Q40 10 40 30 Z" fill="#D33A3A" stroke="${L}" stroke-width="2.5"/><path d="M4 30 h36" stroke="${L}" stroke-width="4" stroke-linecap="round"/></svg>`;
    return `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="18" width="36" height="12" rx="5" fill="${w.color}" stroke="${L}" stroke-width="2.5"/></svg>`;
  }
  if (w.slot === 'top') return `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M16 6 L8 12 L4 22 L11 24 L12 42 H36 L37 24 L44 22 L40 12 L32 6 Q24 12 16 6 Z" fill="${w.color}" stroke="${L}" stroke-width="2.5" stroke-linejoin="round"/></svg>`;
  if (id === 'dumbbell') return I.barbell;
  return `<svg viewBox="0 0 48 48" aria-hidden="true"><ellipse cx="24" cy="22" rx="14" ry="15" fill="${w.color}" stroke="${L}" stroke-width="2.5"/><rect x="13" y="34" width="22" height="9" rx="3" fill="#FFFFFF" stroke="${L}" stroke-width="2.5"/></svg>`;
}

/* =========================================================
   3. 状態（localStorage に保存）
   ========================================================= */
function defaultState() {
  const t = todayStr();
  return {
    v: 1,
    user: { name: 'プレイヤー', sex: 'male', age: 20, height: 170, weight: 60, goal: 'keep', delta: 300 },
    cat: { name: 'もち', idx: 0, dead: null, level: 1, exp: 0, stats: { pow: 20, spd: 20, sta: 20 }, equip: { head: 'band_none', top: 'tee_orange', hand: 'gloves_brown' } },
    stamina: 65, coins: 850, stones: 0,
    items: { drink: 0, protein: 0 }, protein: false,
    owned: ['band_none', 'tee_orange', 'gloves_brown'],
    start: t, last: t, days: {}, history: [],
    login: { last: '', streak: 0 },
    claimed: { date: t, ids: [] },
    settings: { sound: true, vibrate: true, notify: false, lang: 'ja', remind: ['12:00', '19:00'] },
    onboarded: false
  };
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const s = JSON.parse(raw), d = defaultState();
    return Object.assign(d, s, {
      user: Object.assign(d.user, s.user), cat: Object.assign(d.cat, s.cat),
      items: Object.assign(d.items, s.items), settings: Object.assign(d.settings, s.settings)
    });
  } catch (e) { return defaultState(); }
}
let S = load();
const UI = { tab: 'home', shopTab: 'shop', trainTab: 'gym', histTab: 'week', histDate: todayStr(), face: null };

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) {
    // 容量オーバー：古い写真から消して保存し直す
    const keys = Object.keys(S.days).sort();
    for (const k of keys) { S.days[k].meals.forEach(m => { m.photo = null; }); try { localStorage.setItem(KEY, JSON.stringify(S)); toast('容量がいっぱいなので、古い写真を消しました'); return; } catch (e2) {} }
  }
}
function day(d = todayStr()) {
  if (!S.days[d]) S.days[d] = { meals: [], steps: 0, stepUnits: 0, trains: 0, minis: 0, miniRewards: 0, mealRewards: 0 };
  return S.days[d];
}
const intake = d => (S.days[d] ? S.days[d].meals.reduce((a, m) => a + m.kcal, 0) : 0);

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
const statWithBonus = k => S.cat.stats[k] + ['head', 'top', 'hand'].reduce((a, sl) => a + (((WEAR[S.cat.equip[sl]] || {}).bonus || {})[k] || 0), 0);
function mealSlotNow() { const h = new Date().getHours() + new Date().getMinutes() / 60; return h < 10.5 ? 'morning' : h < 15.5 ? 'noon' : 'night'; }

// 日付が変わっていたら、前の日を自動で締める
function rollover() {
  const t = todayStr();
  if (S.last === t) return;
  let d = S.last;
  while (d < t) { settleDay(d); d = addDays(d, 1); }
  S.last = t;
  // 7日より前の写真は消して容量を節約
  Object.keys(S.days).forEach(k => { if (daysBetween(k, t) > 7) S.days[k].meals.forEach(m => { m.photo = null; }); if (daysBetween(k, t) > 60) delete S.days[k]; });
  save();
}
function settleDay(d) {
  if (S.cat.dead) return;
  const tg = target(S.user), dd = S.days[d];
  if (!dd || !dd.meals.length) { S.history.push({ date: d, intake: 0, target: tg, diff: null, change: 0, idx: S.cat.idx }); return; }
  const it = intake(d), diff = it - tg, ch = bodyChange(diff, S.cat.idx);
  S.cat.idx = clamp(S.cat.idx + ch, -100, 100);
  S.history.push({ date: d, intake: it, target: tg, diff, change: ch, idx: S.cat.idx });
  if (S.cat.idx <= -100) S.cat.dead = 'skel';
  if (S.cat.idx >= 100) S.cat.dead = 'boom';
}
function addExp(n) {
  S.cat.exp += n;
  while (S.cat.exp >= expNeed(S.cat.level)) { S.cat.exp -= expNeed(S.cat.level); S.cat.level++; S.coins += 50; setTimeout(() => { toast(`猫レベル ${S.cat.level} にアップ！ コイン +50`); se('get'); }, 700); }
}
function addStamina(n) { S.stamina = clamp(S.stamina + n, 0, 100); }

/* =========================================================
   5. 効果音・バイブ・トースト
   ========================================================= */
let actx = null;
function se(type) {
  if (!S.settings.sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const notes = { tap: [660], coin: [880, 1320], get: [523, 659, 784, 1046], bad: [300, 220] }[type] || [660];
    notes.forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime + i * 0.08;
      o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0.12, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.15);
      o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + 0.16);
    });
  } catch (e) {}
}
function buzz(ms = 30) { if (S.settings.vibrate && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
let toastT;
function toast(t) { const el = $('toast'); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 2600); }

/* =========================================================
   6. モーダル
   ========================================================= */
let modalClose = null;
function openModal(html, onMount, onClose) {
  $('modalBody').innerHTML = html; $('modal').hidden = false; modalClose = onClose || null;
  if (onMount) onMount($('modalBody'));
  const f = $('modalBody').querySelector('input,button,select'); if (f && !('ontouchstart' in window)) f.focus();
}
function closeModal() { $('modal').hidden = true; $('modalBody').innerHTML = ''; const c = modalClose; modalClose = null; if (c) c(); renderAll(); }
$('modalClose').addEventListener('click', closeModal);
$('modal').addEventListener('click', e => { if (e.target === $('modal')) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('modal').hidden) closeModal(); });

/* =========================================================
   7. ホーム
   ========================================================= */
function catFace() {
  if (UI.face) return UI.face;
  if (S.stamina < 20) return 'tired';
  return 'shout';
}
function bubbleText() {
  const d = day(), h = new Date().getHours(), f = S.cat.idx / 100;
  if (S.cat.dead === 'skel') return '';
  if (S.cat.dead === 'boom') return '';
  if (S.stamina < 20) return 'つかれたにゃ…';
  if (!d.meals.length && h >= 10) return '飯くれ！';
  if (f > 0.5) return 'おなかパンパン…';
  if (f < -0.5) return 'おなかすいた…';
  if (!d.trains) return 'ジム行くにゃ！';
  return 'いい感じにゃ！';
}
function renderHome() {
  const d = day(), t = todayStr(), tg = target(S.user), it = intake(t);
  $('btnUser').innerHTML = I.user;
  if (!$('btnLogin').querySelector('svg')) $('btnLogin').insertAdjacentHTML('afterbegin', I.gift);
  if (!$('btnMission').querySelector('svg')) $('btnMission').insertAdjacentHTML('afterbegin', I.mission);
  $('dayWeek').textContent = `（${WEEK[new Date().getDay()]}）`;
  $('dayNum').textContent = daysBetween(S.start, t) + 1;
  $('kcalIntake').textContent = fmt(it); $('kcalTarget').textContent = fmt(tg);
  const scale = tg * 1.5;
  $('kcalBar').style.width = Math.min(100, it / scale * 100) + '%';
  $('kcalBar').style.background = Math.abs(it - tg) <= 100 ? 'var(--green)' : it > tg ? 'var(--orange)' : 'var(--blue)';
  $('kcalMark').style.left = (tg / scale * 100) + '%';
  $('stamFill').style.height = S.stamina + '%';
  $('stamFill').style.backgroundColor = S.stamina < 20 ? 'var(--red)' : S.stamina < 50 ? 'var(--yellow)' : 'var(--green)';
  $('stamVal').textContent = S.stamina + '%';
  $('stamMeter').setAttribute('aria-valuenow', S.stamina);
  $('catWrap').innerHTML = catSVG({ idx: S.cat.idx, equip: S.cat.equip, face: catFace(), dead: S.cat.dead });
  const b = bubbleText(); $('bubble').textContent = b; $('bubble').hidden = !b;
  $('pillCoins').innerHTML = `${I.coin}<span class="num">${fmt(S.coins)}</span>`;
  $('pillSteps').innerHTML = `${I.steps}<span class="num">${fmt(d.steps)}歩</span>`;
  $('pillLevel').innerHTML = `<span style="padding-left:6px">猫Lv.${S.cat.level}</span>`;
  const st = bodyState(S.cat.idx);
  $('bodyPill').textContent = `${S.cat.name}　${st[0]}`; $('bodyPill').style.background = st[1];
  $('btnRevive').hidden = !S.cat.dead;
  $('dotLogin').hidden = S.login.last === t;
  $('dotMission').hidden = !MISSIONS.some(m => m.check(d) >= m.goal && !claimedToday().includes(m.id));
  $('btnMini').innerHTML = `${I.pad}ミニゲーム`;
  $('btnCamera').innerHTML = I.camera;
}
function claimedToday() { if (S.claimed.date !== todayStr()) S.claimed = { date: todayStr(), ids: [] }; return S.claimed.ids; }

$('btnUser').addEventListener('click', () => openProfile(false));
$('kcalCard').addEventListener('click', () => { UI.histTab = 'week'; UI.histDate = todayStr(); setTab('history'); });
$('pillCoins').addEventListener('click', () => setTab('shop'));
$('pillSteps').addEventListener('click', openSteps);
$('btnLogin').addEventListener('click', openLogin);
$('btnMission').addEventListener('click', openMissions);
$('btnMini').addEventListener('click', () => { UI.trainTab = 'mini'; setTab('train'); });
$('btnCamera').addEventListener('click', openCapture);
$('btnRevive').addEventListener('click', () => {
  openModal(`<h2 id="modalTitle">新しい猫を迎える</h2><div class="stack"><p style="margin:0">${esc(S.cat.name)}とはお別れです。コイン・アイテム・きせかえはそのまま引きつぎます。</p>
  <label class="f">新しい猫の名前<input type="text" id="newCatName" maxlength="10" value="もち"></label><button class="btn block" id="doRevive">この名前で迎える</button></div>`, root => {
    root.querySelector('#doRevive').onclick = () => {
      const n = root.querySelector('#newCatName').value.trim() || 'もち';
      S.cat = Object.assign(S.cat, { name: n, idx: 0, dead: null, level: 1, exp: 0, stats: { pow: 20, spd: 20, sta: 20 } });
      S.stamina = 65; save(); closeModal(); toast(`${n}がやってきた！`); se('get');
    };
  });
});

/* ---------- ユーザー（プロフィール） ---------- */
function openProfile(first) {
  const u = S.user;
  openModal(`<h2 id="modalTitle">${first ? 'はじめまして！' : 'ユーザー'}</h2>
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
      S.user = v; S.cat.name = root.querySelector('#pCat').value.trim() || 'もち'; S.onboarded = true; save(); closeModal(); toast(`目標は 1日 ${fmt(target(v))} kcal`);
    };
  });
}

/* ---------- 歩数 ---------- */
function openSteps() {
  const d = day();
  openModal(`<h2 id="modalTitle">今日の歩数</h2><div class="stack">
    <p style="margin:0">スマホの「ヘルスケア」や「Google Fit」に出ている今日の歩数を入れてください。</p>
    <label class="f">今日の歩数<input type="number" id="stepIn" inputmode="numeric" min="0" max="100000" value="${d.steps || ''}" placeholder="例：6500"></label>
    <div class="card" style="padding:10px 14px;font-size:14px">${fmt(RULE.stepsUnit)}歩ごとに スタミナ +${RULE.staminaPerUnit}・コイン +${RULE.coinPerUnit}</div>
    <p class="hint">Webアプリはスマホの歩数計を直接読めないので、今は手で入力します。</p>
    <button class="btn block" id="stepSave">きろくする</button></div>`, root => {
    root.querySelector('#stepSave').onclick = () => {
      const n = Math.round(+root.querySelector('#stepIn').value);
      if (!(n >= 0 && n <= 100000)) { toast('0〜100,000の数字で入れてください'); return; }
      d.steps = n;
      const units = Math.floor(n / RULE.stepsUnit), add = units - d.stepUnits;
      let msg = '歩数を記録しました';
      if (add > 0) { d.stepUnits = units; addStamina(add * RULE.staminaPerUnit); S.coins += add * RULE.coinPerUnit; msg = `スタミナ +${add * RULE.staminaPerUnit}・コイン +${add * RULE.coinPerUnit}`; se('coin'); }
      save(); closeModal(); toast(msg);
    };
  });
}

/* ---------- ログボ・プレゼント ---------- */
function openLogin() {
  const t = todayStr(), can = S.login.last !== t;
  const nextStreak = can ? (S.login.last === addDays(t, -1) ? S.login.streak + 1 : 1) : S.login.streak;
  const pos = (nextStreak - 1) % 7;
  openModal(`<h2 id="modalTitle">ログインボーナス</h2><div class="stack">
    <div class="stamp-grid">${LOGIN_REWARDS.map((r, i) => `<div class="stamp ${i < pos || (!can && i === pos) ? 'done' : ''} ${i === pos && can ? 'today' : ''}"><span>${i + 1}日目</span>${I.coin.replace('width="24" height="24"', 'width="20" height="20"')}<span>${r}</span></div>`).join('')}</div>
    <p class="hint">毎日ひらくとコインがもらえます。7日目は ${LOGIN_REWARDS[6]} コイン。</p>
    <button class="btn block" id="loginClaim" ${can ? '' : 'disabled'}>${can ? `${LOGIN_REWARDS[pos]}コインを受けとる` : '今日はもう受けとりました'}</button></div>`, root => {
    root.querySelector('#loginClaim').onclick = () => {
      if (S.login.last === todayStr()) return;
      S.login = { last: t, streak: nextStreak }; S.coins += LOGIN_REWARDS[pos]; save(); se('coin'); buzz(); closeModal(); toast(`コイン +${LOGIN_REWARDS[pos]}`);
    };
  });
}

/* ---------- ミッション ---------- */
function openMissions() {
  const draw = () => {
    const d = day(), cl = claimedToday();
    return `<h2 id="modalTitle">今日のミッション</h2><div class="list">${MISSIONS.map(m => {
      const p = Math.min(m.check(d), m.goal), done = p >= m.goal, got = cl.includes(m.id);
      return `<div class="card mission"><div class="grow"><div style="font-weight:900">${esc(m.name)}</div><div class="hint">${fmt(p)} / ${fmt(m.goal)}　報酬 ${m.reward}コイン</div><div class="prog"><i style="width:${p / m.goal * 100}%"></i></div></div>
      ${got ? '<span class="hint" style="font-weight:900">受けとり済み</span>' : `<button class="btn small ${done ? 'yellow' : 'white'}" data-m="${m.id}" ${done ? '' : 'disabled'}>受けとる</button>`}</div>`;
    }).join('')}</div><p class="hint" style="margin-top:10px">ミッションは毎日0時に新しくなります。</p>`;
  };
  openModal(draw(), root => {
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-m]'); if (!b) return;
      const m = MISSIONS.find(x => x.id === b.dataset.m); const cl = claimedToday();
      if (cl.includes(m.id) || m.check(day()) < m.goal) return;
      cl.push(m.id); S.coins += m.reward; save(); se('coin'); buzz(); toast(`コイン +${m.reward}`); root.innerHTML = draw(); renderHome();
    });
  });
}

/* ---------- 撮影（AIカロリー推定） ---------- */
let cap = null; // { thumb, ai }
function shrink(img, max, q) { const s = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', q); }
function readPhoto(file) { return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => { const img = new Image(); img.onload = () => res({ thumb: shrink(img, 240, 0.7), ai: shrink(img, 768, 0.7) }); img.onerror = rej; img.src = fr.result; }; fr.onerror = rej; fr.readAsDataURL(file); }); }

function openCapture() {
  if (S.cat.dead) { toast('まず新しい猫を迎えてください'); return; }
  cap = null;
  const slot = mealSlotNow();
  openModal(`<h2 id="modalTitle">ごはんを記録</h2><div class="stack">
    <button type="button" class="photo-box" id="capPhoto">写真を撮る ／ えらぶ</button>
    <button class="btn red block" id="capAI" disabled>AIでカロリーを調べる</button>
    <p class="hint" id="capStatus" role="status" aria-live="polite">写真をえらぶと使えます</p>
    <div class="card ai-box" id="capResult" hidden></div>
    <div class="radio-row" id="capSlot">${Object.entries(SLOTS).map(([k, v]) => `<button type="button" data-v="${k}" aria-pressed="${k === slot}">${v}</button>`).join('')}</div>
    <div class="form-grid" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr)">
      <label class="f">料理名<input type="text" id="capName" maxlength="30" placeholder="例：カレーライス"></label>
      <label class="f">kcal<input type="number" id="capKcal" inputmode="numeric" min="1" max="5000" placeholder="750"></label>
    </div>
    <div class="chips" id="capPresets">${PRESETS.map((p, i) => `<button type="button" class="chip" data-p="${i}">${esc(p[0])} ${p[1]}</button>`).join('')}</div>
    <button class="btn block" id="capSave">記録する</button>
    <p class="hint">カロリーは目安です。AIの結果は直してから記録できます。</p></div>`, root => {
    let slotV = slot;
    root.querySelector('#capPhoto').onclick = () => $('photoInput').click();
    root.querySelector('#capSlot').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; slotV = b.dataset.v; root.querySelectorAll('#capSlot button').forEach(x => x.setAttribute('aria-pressed', x === b)); });
    root.querySelector('#capPresets').addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (!b) return; const p = PRESETS[+b.dataset.p]; root.querySelector('#capName').value = p[0]; root.querySelector('#capKcal').value = p[1]; });
    root.querySelector('#capAI').onclick = () => runAI(root);
    root.querySelector('#capSave').onclick = () => {
      const name = root.querySelector('#capName').value.trim() || '食事', kcal = Math.round(+root.querySelector('#capKcal').value);
      if (!(kcal > 0 && kcal <= 5000)) { toast('カロリーを1〜5000の数字で入れてください'); return; }
      const d = day(), now = new Date();
      d.meals.push({ id: Math.random().toString(36).slice(2, 9), slot: slotV, name, kcal, photo: cap ? cap.thumb : null, time: `${pad(now.getHours())}:${pad(now.getMinutes())}` });
      let msg = `${name}（${kcal} kcal）を記録`;
      if (d.mealRewards < 5) { d.mealRewards++; addStamina(RULE.staminaPerMeal); addExp(RULE.expPerMeal); msg += `・スタミナ +${RULE.staminaPerMeal}`; }
      save(); se('get'); buzz(40); UI.face = 'happy'; setTimeout(() => { UI.face = null; renderHome(); }, 4000);
      closeModal(); toast(msg);
    };
  }, () => { cap = null; $('photoInput').value = ''; });
}
$('photoInput').addEventListener('change', async e => {
  const f = e.target.files && e.target.files[0]; if (!f) return;
  const root = $('modalBody');
  try {
    cap = await readPhoto(f);
    const box = root.querySelector('#capPhoto'); if (!box) return;
    box.innerHTML = `<img src="${cap.thumb}" alt="選んだ料理の写真">`;
    root.querySelector('#capAI').disabled = false; root.querySelector('#capResult').hidden = true;
    root.querySelector('#capStatus').textContent = 'AIボタンを押すと料理名とカロリーが入ります';
  } catch (err) { toast('この画像は読みこめませんでした'); }
});
let aiBusy = false;
async function runAI(root) {
  if (aiBusy || !cap) return;
  aiBusy = true;
  const btn = root.querySelector('#capAI'), st = root.querySelector('#capStatus');
  btn.disabled = true;
  const t0 = Date.now(), tick = () => { btn.textContent = `しらべ中… ${Math.floor((Date.now() - t0) / 1000)}秒`; }; tick();
  const timer = setInterval(tick, 1000), ctrl = new AbortController(), to = setTimeout(() => ctrl.abort(), 60000);
  const send = () => fetch(AI_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: cap.ai.split(',')[1], signal: ctrl.signal });
  try {
    let r;
    try { r = await send(); if (r.status === 503 || r.status === 504) throw new TypeError('retry'); }
    catch (e) { if (e.name === 'AbortError') throw e; st.textContent = 'もう一度送っています'; r = await send(); }
    const d = await r.json().catch(() => null);
    if (!r.ok || !d) {
      if (r.status === 429) throw new Error('AIの利用回数の上限です。少し待つか、手で入力してください');
      throw new Error(d && d.error ? 'AIでしらべられませんでした：' + d.error : 'AIでしらべられませんでした（' + r.status + '）');
    }
    const items = Array.isArray(d.items) ? d.items.filter(x => x && x.name && +x.kcal > 0) : [];
    if (d.is_food === false || !items.length) { st.textContent = '食べ物が見つかりませんでした。手で入力してください'; return; }
    const total = items.reduce((a, x) => a + Math.round(+x.kcal), 0);
    root.querySelector('#capName').value = items.map(x => x.name).join('・').slice(0, 30);
    root.querySelector('#capKcal').value = total;
    const box = root.querySelector('#capResult');
    box.innerHTML = items.map(x => `<div class="r"><span>${esc(x.name)}${x.amount ? ` <small class="muted">${esc(x.amount)}</small>` : ''}</span><b>${Math.round(+x.kcal)} kcal</b></div>`).join('') + `<div class="r t"><span>合計</span><span>${total} kcal</span></div>` + (d.note ? `<small class="muted">${esc(d.note)}</small>` : '');
    box.hidden = false; st.textContent = `入力しました（${Math.round((Date.now() - t0) / 1000)}秒）。違っていたら直してね`; se('coin');
  } catch (err) {
    st.textContent = err.name === 'AbortError' ? '時間がかかりすぎたので中止しました。もう一度押すか、手で入力してください' : (err instanceof TypeError ? '通信できませんでした。ネットを確認してください' : err.message);
  } finally { clearTimeout(to); clearInterval(timer); aiBusy = false; btn.textContent = 'AIでカロリーを調べる'; btn.disabled = !cap; }
}

/* =========================================================
   8. ショップ
   ========================================================= */
function balanceHTML() { return `<span class="pill">${I.coin}<span class="num">${fmt(S.coins)}</span></span><span class="pill">${I.stone}<span class="num">${fmt(S.stones)}</span></span>`; }
const shopQty = { drink: 1, protein: 1 };
function renderShop() {
  $('shopBalance').innerHTML = balanceHTML();
  $('shopSeg').querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', b.dataset.v === UI.shopTab));
  if (UI.shopTab === 'shop') {
    $('shopBody').innerHTML = `
      <div class="section-title">アイテム</div>
      <div class="list">${SHOP_ITEMS.map(it => `<div class="card shop-item"><div class="ico">${I[it.id]}</div><div><div class="name" style="font-weight:900">${esc(it.name)}</div><div class="hint">${esc(it.desc)}　もっている：${S.items[it.id] || 0}</div><div class="price">${I.coin.replace('width="24" height="24"', 'width="18" height="18" style="vertical-align:-3px"')} ${fmt(it.price)}</div></div>
        <div class="buy-row"><span class="stepper"><button type="button" data-dec="${it.id}" aria-label="へらす">−</button><output>${shopQty[it.id]}</output><button type="button" data-inc="${it.id}" aria-label="ふやす">＋</button></span><button class="btn small" data-buy="${it.id}">購入</button></div></div>`).join('')}</div>
      <div class="section-title">石</div>
      <div class="list">${STONE_PACKS.map(p => `<div class="card shop-item"><div class="ico">${I.stone.replace('width="24" height="24"', 'width="38" height="38"')}</div><div><div style="font-weight:900">石 ×${p.n}</div><div class="price">¥${fmt(p.yen)}</div></div>
        <div class="buy-row"><button class="btn small white" data-stone="${p.n}">購入</button></div></div>`).join('')}</div>
      <p class="demo-note">学校の制作アプリなので、石の購入（お金を使う機能）は動きません。見た目だけのサンプルです。</p>`;
  } else {
    $('shopBody').innerHTML = `<div class="card gacha-stage">
      <div class="gacha-top"><span class="pill">1回 ${I.coin}<span class="num">${GACHA_COST}</span></span><span class="pill">${I.coin}<span class="num">${fmt(S.coins)}</span></span></div>
      <p class="gacha-title">福袋ガチャ</p>
      <div class="gacha-cat">${catSVG({ idx: 0, equip: { head: 'cap_red', top: 'gi_white', hand: 'gloves_red' }, face: 'happy' })}</div>
      <div class="bags">${['#3E8E5A', '#C9A227', '#D33A3A', '#F2F2F2'].map((c, i) => `<button class="bag" data-bag="${i}" aria-label="福袋${i + 1}をえらぶ">${bagSVG(c)}</button>`).join('')}</div>
      <p class="pick-note">↑ えらんでね ↑</p>
      <p class="hint">きせかえが出ます。SR ${GACHA_RATE.SR}%・R ${GACHA_RATE.R}%・N ${GACHA_RATE.N}%　かぶったら ${DUP_REFUND}コインに交換</p></div>`;
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
  else if (t.dataset.stone) { toast('学校の制作アプリなので、石は買えません'); }
  else if (t.dataset.bag) pullGacha();
});
function pullGacha() {
  if (S.coins < GACHA_COST) { toast(`コインが ${fmt(GACHA_COST - S.coins)} 足りません`); se('bad'); return; }
  S.coins -= GACHA_COST;
  const r = Math.random() * 100, rar = r < GACHA_RATE.SR ? 'SR' : r < GACHA_RATE.SR + GACHA_RATE.R ? 'R' : 'N';
  const pool = Object.keys(WEAR).filter(k => WEAR[k].rar === rar && k !== 'band_none');
  const id = pool[Math.floor(Math.random() * pool.length)], w = WEAR[id], dup = S.owned.includes(id);
  if (dup) S.coins += DUP_REFUND; else S.owned.push(id);
  save(); se(rar === 'SR' ? 'get' : 'coin'); buzz(rar === 'SR' ? [60, 40, 60] : 40);
  openModal(`<h2 id="modalTitle">${rar === 'SR' ? '大当たり！' : 'でたよ！'}</h2><div class="reveal">
    <div class="item-big ${rar}">${wearIcon(id)}</div><span class="rar ${rar}">${rar}</span>
    <div style="font-weight:900;font-size:20px">${esc(w.name)}</div><div class="hint">${SLOT_NAME[w.slot]}のきせかえ${w.bonus ? '　' + Object.entries(w.bonus).map(([k, v]) => `${STAT_NAME[k]}+${v}`).join(' ') : ''}</div>
    ${dup ? `<p style="margin:0;font-weight:900">もう持っていたので ${DUP_REFUND}コインに交換しました</p>` : `<button class="btn block" id="equipNow">さっそく着る</button>`}
    <button class="btn white block" id="againG">もう1回（${GACHA_COST}コイン）</button></div>`, root => {
    const eq = root.querySelector('#equipNow'); if (eq) eq.onclick = () => { S.cat.equip[w.slot] = id; save(); closeModal(); toast('着がえました'); };
    root.querySelector('#againG').onclick = () => { closeModal(); pullGacha(); };
  });
}

/* =========================================================
   9. トレーニング＆ミニゲーム
   ========================================================= */
function renderTrain() {
  $('trainBalance').innerHTML = `<span class="pill" style="padding-left:10px">スタミナ <b class="num">${S.stamina}%</b></span>${balanceHTML()}`;
  $('trainSeg').querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', b.dataset.v === UI.trainTab));
  const d = day();
  if (UI.trainTab === 'gym') {
    $('trainBody').innerHTML = `${S.protein ? '<p class="boost">プロテイン効果中：次のトレーニングが1.5倍</p>' : ''}
      <div class="list">${TRAININGS.map(t => `<div class="card gym-card"><div class="ico">${I[{ bag: 'sandbag', tread: 'tread', weight: 'barbell' }[t.id]]}</div>
        <div><div style="font-weight:900">${esc(t.name)}</div><div class="hint">${esc(t.label)}</div><div class="cost">スタミナ −${t.cost}</div></div>
        <button class="btn small ${S.stamina >= t.cost && !S.cat.dead ? '' : 'white'}" data-train="${t.id}" ${S.stamina >= t.cost && !S.cat.dead ? '' : 'disabled'}>START</button></div>`).join('')}</div>
      <div class="section-title">もちもの</div>
      <div class="list">${SHOP_ITEMS.map(it => `<div class="card row"><span style="width:40px;height:40px;flex:none">${I[it.id]}</span><div class="grow"><div class="name">${esc(it.name)} ×${S.items[it.id] || 0}</div><div class="hint">${esc(it.desc)}</div></div><button class="btn small yellow" data-use="${it.id}" ${(S.items[it.id] || 0) > 0 ? '' : 'disabled'}>使う</button></div>`).join('')}</div>
      <p class="hint" style="margin-top:10px">スタミナは、ごはんを記録したり歩いたりすると回復します。</p>`;
  } else if (UI.trainTab === 'mini') {
    const left = Math.max(0, RULE.miniPlaysPerDay - d.miniRewards);
    $('trainBody').innerHTML = `<div class="card" style="padding:10px 14px;margin-bottom:10px;font-weight:900;text-align:center">今日の報酬つきプレイ　のこり ${left}回</div>
      <div class="list">
        <div class="card gym-card"><div class="ico" style="background:#FFE0EA;font-weight:900;font-size:30px;color:#C2335E">?</div><div><div style="font-weight:900">どっちが高い？</div><div class="hint">カロリーが高いほうを選ぶクイズ（5問）</div></div><button class="btn small" data-mini="quiz">あそぶ</button></div>
        <div class="card gym-card"><div class="ico">${I.sandbag}</div><div><div style="font-weight:900">サンドバッグ連打</div><div class="hint">10秒でできるだけタップ！</div></div><button class="btn small" data-mini="tap">あそぶ</button></div>
      </div><p class="hint" style="margin-top:10px">ミニゲームはスタミナを使いません。カロリーは一般的な目安です。</p>`;
  } else {
    const eq = S.cat.equip;
    $('trainBody').innerHTML = `<div class="locker"><div class="card preview">${catSVG({ idx: S.cat.idx, equip: eq, face: 'happy', dead: S.cat.dead })}</div>
      <div class="card stats"><div style="font-weight:900">${esc(S.cat.name)}　Lv.${S.cat.level}</div>${statRows()}</div></div>
      ${['head', 'top', 'hand'].map(sl => `<div class="section-title">${SLOT_NAME[sl]}</div><div class="wear-grid">${S.owned.filter(k => WEAR[k] && WEAR[k].slot === sl).map(k => `<button class="wear" data-wear="${k}" aria-pressed="${eq[sl] === k}">${wearIcon(k)}<span>${esc(WEAR[k].name)}</span><span class="rar ${WEAR[k].rar}">${WEAR[k].rar}</span></button>`).join('')}</div>`).join('')}
      <p class="hint" style="margin-top:10px">ガチャで新しいきせかえが手に入ります。</p>`;
  }
}
function statRows() {
  const col = { pow: 'var(--red)', spd: 'var(--blue)', sta: 'var(--green)' };
  return ['pow', 'spd', 'sta'].map(k => { const v = statWithBonus(k), bonus = v - S.cat.stats[k]; return `<div class="stat-row"><span>${STAT_NAME[k]}</span><span class="bar"><i style="width:${Math.min(100, v / 3)}%;background:${col[k]}"></i></span><b class="num">${v}${bonus ? `<small style="color:var(--orange-d)">+${bonus}</small>` : ''}</b></div>`; }).join('') +
    `<div class="stat-row"><span>EXP</span><span class="bar"><i style="width:${S.cat.exp / expNeed(S.cat.level) * 100}%;background:var(--yellow)"></i></span><b class="num" style="font-size:11px">${S.cat.exp}/${expNeed(S.cat.level)}</b></div>`;
}
$('trainSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; UI.trainTab = b.dataset.v; se('tap'); renderTrain(); });
$('trainBody').addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.train) doTraining(TRAININGS.find(x => x.id === t.dataset.train));
  else if (t.dataset.use) {
    const id = t.dataset.use; if (!(S.items[id] > 0)) return;
    if (id === 'drink') { if (S.stamina >= 100) { toast('スタミナは満タンです'); return; } addStamina(30); toast('スタミナ +30'); }
    if (id === 'protein') { if (S.protein) { toast('もうプロテイン効果中です'); return; } S.protein = true; toast('次のトレーニングが1.5倍！'); }
    S.items[id]--; save(); se('coin'); renderAll();
  }
  else if (t.dataset.mini === 'quiz') playQuiz();
  else if (t.dataset.mini === 'tap') playTap();
  else if (t.dataset.wear) { const k = t.dataset.wear; S.cat.equip[WEAR[k].slot] = k; save(); se('tap'); renderAll(); }
});
function doTraining(t) {
  if (S.cat.dead) return;
  if (S.stamina < t.cost) { toast('スタミナが足りません。ごはんを記録するか歩こう'); se('bad'); return; }
  S.stamina -= t.cost;
  const mult = S.protein ? 1.5 : 1, g = Math.round(rand(t.gain[0], t.gain[1]) * mult);
  S.cat.stats[t.stat] += g; S.protein = false; S.coins += t.coin; day().trains++; addExp(t.exp); save(); se('get'); buzz([30, 30, 30]);
  openModal(`<h2 id="modalTitle">${esc(t.name)}</h2><div class="reveal"><div style="width:180px">${catSVG({ idx: S.cat.idx, equip: S.cat.equip, face: 'shout' })}</div>
    <div style="font-weight:900;font-size:24px">${STAT_NAME[t.stat]} +${g}${mult > 1 ? ' <small style="color:var(--orange-d)">プロテイン×1.5</small>' : ''}</div>
    <div class="hint">EXP +${t.exp}${t.coin ? `　コイン +${t.coin}` : ''}　スタミナ −${t.cost}</div>
    <button class="btn block" id="trOk">OK</button></div>`, root => {
    root.querySelector('div[style="width:180px"]').classList.add('cat-wrap', 'punch');
    root.querySelector('#trOk').onclick = closeModal;
  });
}
function miniReward(coins) {
  const d = day(); d.minis++;
  if (d.miniRewards >= RULE.miniPlaysPerDay) return '今日の報酬はもう受けとりました';
  d.miniRewards++; S.coins += coins; se('coin'); return `コイン +${coins}`;
}
function playQuiz() {
  let q = 0, ok = 0;
  const next = () => {
    let a, b;
    do { a = QUIZ_FOODS[rand(0, QUIZ_FOODS.length - 1)]; b = QUIZ_FOODS[rand(0, QUIZ_FOODS.length - 1)]; } while (a === b || Math.abs(a[1] - b[1]) < 30);
    return [a, b];
  };
  let pair = next(), answered = false;
  const draw = root => {
    root.innerHTML = `<h2 id="modalTitle">どっちが高い？</h2><div class="stack"><div class="hint" style="text-align:center;font-weight:900">${q + 1} / 5問　正解 ${ok}</div>
      <div class="quiz-opts">${pair.map((f, i) => `<button type="button" data-q="${i}"><span>${esc(f[0])}</span><span class="kc muted" hidden>約${f[1]} kcal</span></button>`).join('')}</div>
      <p class="hint" style="text-align:center">カロリーは一般的な目安です</p><button class="btn block" id="qNext" hidden>つぎへ</button></div>`;
    answered = false;
  };
  openModal('', root => {
    draw(root);
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-q]');
      if (b && !answered) {
        answered = true;
        const i = +b.dataset.q, win = pair[i][1] >= pair[1 - i][1];
        if (win) { ok++; se('coin'); } else { se('bad'); buzz(80); }
        root.querySelectorAll('[data-q]').forEach((x, j) => { x.querySelector('.kc').hidden = false; x.classList.add(pair[j][1] >= pair[1 - j][1] ? 'ok' : 'ng'); });
        root.querySelector('#qNext').hidden = false; root.querySelector('#qNext').textContent = q < 4 ? 'つぎへ' : 'けっかを見る';
      }
      if (e.target.closest('#qNext')) {
        q++;
        if (q < 5) { pair = next(); draw(root); return; }
        const msg = miniReward(ok * 6); save();
        root.innerHTML = `<h2 id="modalTitle">けっか</h2><div class="reveal"><div class="big-num">${ok} / 5</div><div style="font-weight:900">${ok >= 4 ? 'カロリー博士！' : ok >= 2 ? 'なかなか！' : 'つぎはがんばろう'}</div><div class="hint">${msg}</div><button class="btn block" id="qEnd">とじる</button></div>`;
        root.querySelector('#qEnd').onclick = closeModal;
      }
    });
  });
}
function playTap() {
  let n = 0, left = 10, started = false, timer = null;
  openModal(`<h2 id="modalTitle">サンドバッグ連打</h2><div class="stack" style="align-items:center"><div class="big-num"><span id="tapN">0</span><small style="font-size:18px">回</small></div>
    <div class="hint" id="tapT" style="font-weight:900">タップでスタート（10秒）</div>
    <button class="tapper" id="tapBtn">連打！</button><div id="tapEnd" style="width:100%"></div></div>`, root => {
    const btn = root.querySelector('#tapBtn');
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (left <= 0) return;
      if (!started) {
        started = true;
        timer = setInterval(() => {
          left--; const t = root.querySelector('#tapT'); if (t) t.textContent = `のこり ${left}秒`;
          if (left <= 0) {
            clearInterval(timer); btn.disabled = true;
            const msg = miniReward(Math.min(40, Math.floor(n / 4))); save();
            root.querySelector('#tapEnd').innerHTML = `<div class="reveal"><div style="font-weight:900;font-size:20px">${n}回 たたいた！</div><div class="hint">${msg}</div><button class="btn block" id="tapClose">とじる</button></div>`;
            root.querySelector('#tapClose').onclick = closeModal;
          }
        }, 1000);
        root.querySelector('#tapT').textContent = `のこり ${left}秒`;
      }
      n++; root.querySelector('#tapN').textContent = n; if (n % 5 === 0) se('tap'); buzz(10);
    });
  }, () => clearInterval(timer));
}

/* =========================================================
   10. りれき
   ========================================================= */
function weekDates() { const t = todayStr(), dow = parseYmd(t).getDay(), mon = addDays(t, -((dow + 6) % 7)); return Array.from({ length: 7 }, (_, i) => addDays(mon, i)); }
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
function renderHistory() {
  const t = todayStr(), dt = parseYmd(t);
  $('histDate').textContent = `Date ${dt.getMonth() + 1}/${dt.getDate()}（${WEEK[dt.getDay()]}）`;
  const tabs = `<div class="hist-seg" role="tablist"><button role="tab" data-h="status" aria-selected="${UI.histTab === 'status'}">ステータス</button><button role="tab" data-h="week" aria-selected="${UI.histTab === 'week'}">1週間の<br>きろく</button></div>`;
  if (UI.histTab === 'week') {
    const dates = weekDates(), sel = UI.histDate, sd = S.days[sel] || { meals: [] }, sdt = parseYmd(sel);
    const cards = Object.keys(SLOTS).map(k => {
      const ms = sd.meals.filter(m => m.slot === k), kc = ms.reduce((a, m) => a + m.kcal, 0), m0 = ms[0];
      if (!m0) return `<div class="meal-card"><span class="slot">${SLOTS[k]}</span><span class="mname">${sel <= t ? 'まだ' : '－'}</span><span class="ph">${I.plate}</span><span class="hint" style="font-weight:900">${sel === t ? 'たべてないよ' : sel < t ? '記録なし' : ''}</span></div>`;
      return `<div class="meal-card"><span class="slot">${SLOTS[k]}</span><span class="mname">${esc(m0.name)}${ms.length > 1 ? ` ほか${ms.length - 1}` : ''}</span>${m0.photo ? `<img src="${m0.photo}" alt="${esc(m0.name)}の写真">` : `<span class="ph">${I.plate}</span>`}<span class="kc num">${fmt(kc)} kcal</span></div>`;
    }).join('');
    const list = sd.meals.length ? `<div class="list meal-list" style="margin-top:12px">${sd.meals.map(m => `<div class="card row">${m.photo ? `<img src="${m.photo}" alt="">` : `<span class="ph"></span>`}<div class="grow"><div class="name">${esc(m.name)}</div><div class="hint">${SLOTS[m.slot]}　${esc(m.time)}</div></div><b class="num">${fmt(m.kcal)} kcal</b>${sel === t ? `<button class="x-btn" data-del="${m.id}" aria-label="${esc(m.name)}を消す">✕</button>` : ''}</div>`).join('')}</div>` : '';
    $('histBody').innerHTML = `<div class="card chart-card">${chartSVG(dates)}</div>
      <div class="chips" style="justify-content:space-between;margin-top:8px">${dates.map(d => `<button class="chip" data-day="${d}" ${d > t ? 'disabled' : ''} style="${d === sel ? 'background:var(--yellow)' : ''}">${WEEK[parseYmd(d).getDay()]} <span class="num">${intake(d) ? fmt(intake(d)) : '-'}</span></button>`).join('')}</div>
      ${tabs}
      <div class="section-title">${sel === t ? '本日' : `${sdt.getMonth() + 1}/${sdt.getDate()}（${WEEK[sdt.getDay()]}）`}</div>
      <div class="meals3">${cards}</div>
      <div class="card" style="margin-top:12px;padding:10px 14px;display:flex;justify-content:space-between;font-weight:900"><span>合計</span><span class="num">${fmt(intake(sel))} / ${fmt(target(S.user))} kcal</span></div>${list}`;
  } else {
    const st = bodyState(S.cat.idx), recDays = Object.values(S.days).filter(d => d.meals.length).length;
    const meals = Object.values(S.days).reduce((a, d) => a + d.meals.length, 0), steps = Object.values(S.days).reduce((a, d) => a + (d.steps || 0), 0);
    $('histBody').innerHTML = `${tabs}
      <div class="locker" style="margin-top:12px"><div class="card preview">${catSVG({ idx: S.cat.idx, equip: S.cat.equip, face: 'happy', dead: S.cat.dead })}</div>
      <div class="card stats"><div style="font-weight:900">${esc(S.cat.name)}　Lv.${S.cat.level}</div>${statRows()}</div></div>
      <div class="section-title">体型</div>
      <div class="card" style="padding:12px 14px"><div style="display:flex;justify-content:space-between;font-weight:900;margin-bottom:8px"><span>${st[0]}</span><span class="num">${S.cat.idx > 0 ? '+' : ''}${S.cat.idx}</span></div>
        <div class="body-meter"><i style="left:${(S.cat.idx + 100) / 2}%"></i></div><div class="body-labels"><span>骸骨</span><span>ちょうどいい</span><span>爆発</span></div>
        <p class="hint" style="margin-top:8px">毎日0時に、前の日の「食べた量 − 目標」で体型が変わります。目標±100kcalなら、ちょうどいいに少しもどります。</p></div>
      <div class="section-title">これまで</div>
      <div class="totals"><div class="card"><b class="num">${recDays}</b><span>記録した日</span></div><div class="card"><b class="num">${meals}</b><span>ごはんの記録</span></div><div class="card"><b class="num">${fmt(steps)}</b><span>歩いた歩数</span></div></div>
      <div class="card" style="margin-top:10px;padding:10px 14px;font-size:14px">基礎代謝 <b>${fmt(bmr(S.user))}</b> kcal　→　1日の目標 <b>${fmt(target(S.user))}</b> kcal</div>`;
  }
}
$('histBody').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.h) { UI.histTab = b.dataset.h; se('tap'); renderHistory(); }
  else if (b.dataset.day) { UI.histDate = b.dataset.day; renderHistory(); }
  else if (b.dataset.del) { const d = day(); d.meals = d.meals.filter(m => m.id !== b.dataset.del); save(); toast('消しました'); renderAll(); }
});

/* =========================================================
   11. せってい
   ========================================================= */
let resetArmed = false;
function renderSettings() {
  const s = S.settings, sw = (id, on, label) => `<button class="switch" role="switch" id="${id}" aria-checked="${on}" aria-label="${label}"></button>`;
  const perm = ('Notification' in window) ? Notification.permission : 'unsupported';
  $('setBody').innerHTML = `
    <div class="section-title">音声</div>
    <div class="card set-group"><div class="set-row"><div class="grow">効果音<small>ボタンやコインの音</small></div>${sw('sSound', s.sound, '効果音')}</div></div>
    <div class="section-title">バイブレーション</div>
    <div class="card set-group"><div class="set-row"><div class="grow">バイブレーション<small>iPhone では動かないことがあります</small></div>${sw('sVib', s.vibrate, 'バイブレーション')}</div></div>
    <div class="section-title">通知</div>
    <div class="card set-group">
      <div class="set-row"><div class="grow">ごはんのリマインダー<small>${perm === 'unsupported' ? 'この端末では通知が使えません' : 'アプリを開いているあいだに届きます'}</small></div>${sw('sNotify', s.notify && perm === 'granted', 'ごはんのリマインダー')}</div>
      <div class="set-row"><div class="grow">お昼</div><input type="time" id="sT1" value="${s.remind[0]}" style="width:120px"></div>
      <div class="set-row"><div class="grow">夜</div><input type="time" id="sT2" value="${s.remind[1]}" style="width:120px"></div>
    </div>
    <div class="section-title">言語</div>
    <div class="card set-group"><div class="set-row"><div class="grow">言語 / Language</div><select id="sLang" style="width:150px"><option value="ja" selected>日本語</option><option value="zh" disabled>中文（準備中）</option><option value="en" disabled>English（準備中）</option></select></div></div>
    <div class="section-title">そのほか</div>
    <div class="card set-group">
      <div class="set-row"><div class="grow">プロフィール・目標カロリー</div><button class="btn small white" id="sProfile">ひらく</button></div>
      <div class="set-row"><div class="grow">データをすべて消す<small>猫・コイン・記録が最初にもどります</small></div><button class="btn small ${resetArmed ? 'red' : 'white'}" id="sReset">${resetArmed ? 'もう一度押すと消えます' : '消す'}</button></div>
    </div>
    <p class="hint" style="text-align:center;margin:14px 0">にゃんカロ　宮崎情報ビジネス専門学校 制作アプリ</p>`;
}
$('setBody').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  const s = S.settings;
  if (b.id === 'sSound') { s.sound = !s.sound; se('tap'); }
  else if (b.id === 'sVib') { s.vibrate = !s.vibrate; buzz(80); }
  else if (b.id === 'sNotify') {
    if (!('Notification' in window)) { toast('この端末では通知が使えません'); return; }
    if (!s.notify) { const p = await Notification.requestPermission(); s.notify = p === 'granted'; if (p !== 'granted') toast('通知が許可されませんでした。端末の設定から許可してください'); }
    else s.notify = false;
  }
  else if (b.id === 'sProfile') { openProfile(false); return; }
  else if (b.id === 'sReset') {
    if (!resetArmed) { resetArmed = true; renderSettings(); setTimeout(() => { resetArmed = false; if (UI.tab === 'settings') renderSettings(); }, 4000); return; }
    try { localStorage.removeItem(KEY); } catch (err) {} S = defaultState(); resetArmed = false; save(); setTab('home'); openProfile(true); return;
  }
  save(); renderSettings();
});
$('setBody').addEventListener('change', e => {
  if (e.target.id === 'sT1') S.settings.remind[0] = e.target.value || '12:00';
  if (e.target.id === 'sT2') S.settings.remind[1] = e.target.value || '19:00';
  save();
});
// リマインダー：開いているあいだ1分ごとに確認
let lastNotified = '';
setInterval(() => {
  rollover();
  const s = S.settings; if (!s.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date(), hm = `${pad(now.getHours())}:${pad(now.getMinutes())}`, key = todayStr() + hm;
  const i = s.remind.indexOf(hm); if (i < 0 || lastNotified === key) return;
  const slot = i === 0 ? 'noon' : 'night'; if (day().meals.some(m => m.slot === slot)) return;
  lastNotified = key;
  const body = `${S.cat.name}「${SLOTS[slot]}ごはん、まだにゃ？」`;
  if (navigator.serviceWorker && navigator.serviceWorker.ready) navigator.serviceWorker.ready.then(r => r.showNotification('にゃんカロ', { body, icon: 'icon-192.png' })).catch(() => {});
  else new Notification('にゃんカロ', { body });
}, 60000);

/* =========================================================
   12. タブ切りかえ・全体の描画
   ========================================================= */
function setTab(t) {
  UI.tab = t;
  ['home', 'shop', 'train', 'history', 'settings'].forEach(k => { $('tab-' + k).hidden = k !== t; });
  document.querySelectorAll('.tabbar button').forEach(b => { if (b.dataset.tab === t) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  window.scrollTo(0, 0);
  renderAll();
}
function renderAll() {
  renderHome();
  if (UI.tab === 'shop') renderShop();
  if (UI.tab === 'train') renderTrain();
  if (UI.tab === 'history') renderHistory();
  if (UI.tab === 'settings') renderSettings();
}
document.querySelector('.tabbar').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; se('tap'); buzz(10); setTab(b.dataset.tab); });
$('tiShop').innerHTML = I.bag; $('tiTrain').innerHTML = I.dumb; $('tiHome').innerHTML = I.house; $('tiHistory').innerHTML = I.cal; $('tiSettings').innerHTML = I.gear;

rollover();
setTab('home');
if (!S.onboarded) openProfile(true);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { rollover(); renderAll(); } });
