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
  flame: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-4-1-6 1-9z" fill="#F0943F" stroke="#4A2A1A" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 12c1 2 3 3 3 5a3 3 0 0 1-6 0c0-1.5 1-2.5 3-5z" fill="#F7C64B"/></svg>`,
  bolt: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h7l-2 8 9-12h-7z" fill="#4C8FD6" stroke="#4A2A1A" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z" fill="#E8577A" stroke="#4A2A1A" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
  pencil: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="#7E6150" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13 7 4 4"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#F7C64B" stroke="#4A2A1A" stroke-width="1.6"/><path d="M12 7v10M7 12h10" stroke="#4A2A1A" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  shoe: `<svg viewBox="0 0 48 32" aria-hidden="true"><path d="M4 22c0-8 4-14 10-14 2 4 8 4 10 0l4 6c6 0 16 2 16 8v2H4z" fill="#4C8FD6" stroke="#4A2A1A" stroke-width="2.5" stroke-linejoin="round"/><path d="M4 24h40v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" fill="#FFFFFF" stroke="#4A2A1A" stroke-width="2.5"/><path d="M17 14l5 2M19 11l5 2" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/></svg>`,
  paw: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="#FFFFFF"><ellipse cx="12" cy="16" rx="5" ry="4"/><circle cx="6" cy="10.5" r="2.2"/><circle cx="9.5" cy="6.5" r="2.2"/><circle cx="14.5" cy="6.5" r="2.2"/><circle cx="18" cy="10.5" r="2.2"/></svg>`,
  gachaMachine: `<svg viewBox="0 0 48 56" aria-hidden="true"><circle cx="24" cy="20" r="16" fill="#E6F4FB" stroke="#4A2A1A" stroke-width="2.5"/><circle cx="17" cy="16" r="4" fill="#E0573F"/><circle cx="27" cy="13" r="4" fill="#4C8FD6"/><circle cx="30" cy="23" r="4" fill="#F7C64B"/><circle cx="20" cy="25" r="4" fill="#4FAE5B"/><path d="M10 34h28l3 18H7z" fill="#E0573F" stroke="#4A2A1A" stroke-width="2.5" stroke-linejoin="round"/><circle cx="24" cy="42" r="4" fill="#F7C64B" stroke="#4A2A1A" stroke-width="2"/></svg>`,
  luckyBag: `<svg viewBox="0 0 48 52" aria-hidden="true"><path d="M10 18h28l4 30H6z" fill="#D33A3A" stroke="#4A2A1A" stroke-width="2.5" stroke-linejoin="round"/><path d="M17 18c0-8 14-8 14 0" fill="none" stroke="#4A2A1A" stroke-width="2.5"/><text x="24" y="40" text-anchor="middle" font-size="13" font-weight="900" fill="#F7C64B" font-family="sans-serif">福袋</text></svg>`,
  goldbag: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 2v6" stroke="#4A2A1A" stroke-width="2.5"/><rect x="14" y="8" width="20" height="34" rx="8" fill="#F7C64B" stroke="#4A2A1A" stroke-width="2.5"/><path d="M14 16h20M14 34h20" stroke="#C9971E" stroke-width="2.5"/><path d="M20 22l3 2-3 2M27 22l-3 2 3 2" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/></svg>`,
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
  if (w.slot === 'suit') {
    if (id === 'suit_none') return `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="14" fill="none" stroke="#B9A48E" stroke-width="3" stroke-dasharray="4 4"/></svg>`;
    return `<svg viewBox="-20 -70 340 300" aria-hidden="true"><ellipse cx="150" cy="140" rx="84" ry="66" fill="#FBE3C6" stroke="${L}" stroke-width="5"/><circle cx="120" cy="135" r="7" fill="${L}"/><circle cx="180" cy="135" r="7" fill="${L}"/>${suitHead(id)}</svg>`;
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
    cat: { name: 'もち', breed: 'tabby', idx: 0, dead: null, level: 1, exp: 0, stats: { pow: 20, spd: 20, sta: 20 }, equip: { head: 'band_none', top: 'tee_orange', hand: 'gloves_brown', suit: 'suit_none' } },
    stamina: 65, coins: 850, stones: 0, pity: 0,
    items: { drink: 0, protein: 0, goldbag: 0 }, protein: false, goldbag: 0, mood: RULE.moodStart,
    owned: ['band_none', 'tee_orange', 'gloves_brown', 'suit_none'],
    start: t, last: t, days: {}, history: [],
    login: { last: '', streak: 0 },
    claimed: { date: t, ids: [] },
    settings: { sound: true, bgm: true, vibrate: true, notify: false, lang: 'ja', remind: ['12:00', '19:00'] },
    onboarded: false
  };
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const s = JSON.parse(raw), d = defaultState();
    const st = Object.assign(d, s, {
      user: Object.assign(d.user, s.user), cat: Object.assign(d.cat, s.cat),
      items: Object.assign(d.items, s.items), settings: Object.assign(d.settings, s.settings)
    });
    // v8.8：コスチューム（suit）の欄を追加
    if (!st.owned.includes('suit_none')) st.owned.push('suit_none');
    if (!st.cat.equip.suit) st.cat.equip.suit = 'suit_none';
    return st;
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
  if (!S.days[d]) S.days[d] = { meals: [], steps: 0, stepUnits: 0, trains: 0, minis: 0, miniRewards: 0, mealRewards: 0, photoBonus: 0, slotNet: 0 };
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
const statWithBonus = k => S.cat.stats[k] + ['head', 'top', 'hand', 'suit'].reduce((a, sl) => a + (((WEAR[S.cat.equip[sl]] || {}).bonus || {})[k] || 0), 0);
function mealSlotNow() { const h = new Date().getHours() + new Date().getMinutes() / 60; return h < 10.5 ? 'morning' : h < 15.5 ? 'noon' : 'night'; }

// 日付が変わっていたら、前の日を自動で締める
function rollover() {
  const t = todayStr();
  if (S.last === t) return;
  let d = S.last;
  while (d < t) { settleDay(d); S.mood = clamp((S.mood ?? RULE.moodStart) + RULE.moodPerDay, 0, 100); d = addDays(d, 1); }
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
/* ---- 猫のSOS（骸骨・爆発の前に知らせる） ----
   太る側：今の体型と「今日このまま1日が終わったら」の体型の大きいほう で判断（食べるほど増えるので前もって分かる）
   やせる側：今の体型で判断（朝はまだ食べていないので、今日の予想は使わない）
   1回目 ±crisisWarn、2回目 ±crisisDanger。体型がもどったら、また鳴けるようにする */
const CRISIS = {
  hi: [null, { say: 'く、くるしいにゃ…おなかパンパン…！', note: 'おなかがパンパンで苦しそう！このままだと爆発しちゃうかも…' },
    { say: 'もう限界にゃーーっ！！爆発しちゃうにゃ！！', note: '「もう限界にゃーっ！！」このままだと爆発します！今日はもう食べないで！' }],
  lo: [null, { say: 'おなかすきすぎて…力が出ないにゃ…', note: 'おなかがすきすぎてフラフラ…。ちゃんと食べさせてあげて！' },
    { say: 'た、たすけてにゃ…骨になっちゃうにゃ…！', note: '「たすけてにゃ…！」このままだと骸骨になってしまいます！しっかり食べて！' }]
};
function crisisNow() {
  if (S.cat.dead || !S.onboarded) return null;
  const t = todayStr(), d = S.days[t];
  let proj = S.cat.idx;
  if (d && d.meals.length) proj = clamp(S.cat.idx + bodyChange(intake(t) - target(S.user), S.cat.idx), -100, 100);
  const hi = Math.max(S.cat.idx, proj), lo = S.cat.idx;
  const st = v => v >= RULE.crisisDanger ? 2 : v >= RULE.crisisWarn ? 1 : 0;
  const hs = st(hi), ls = st(-lo);
  if (hs) return { side: 'hi', stage: hs, ...CRISIS.hi[hs] };
  if (ls) return { side: 'lo', stage: ls, ...CRISIS.lo[ls] };
  return null;
}
function checkCrisis() {
  if (!S.onboarded || S.cat.dead) return;
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
// 猫をさわったときの音
function petSound(n) {
  if (!S.settings.sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const c = actx, now = c.currentTime;
    const tone = (type, f0, f1, dur, vol, at = 0) => {
      const t = now + at, o = c.createOscillator(), g = c.createGain(); o.type = type;
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
    };
    const noise = (dur, vol, type, freq) => {
      const b = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = b; f.type = type; f.frequency.value = freq; g.gain.setValueAtTime(vol, now); g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      s.connect(f); f.connect(g); g.connect(c.destination); s.start(now);
    };
    if (n === 'purr') {
      const o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain(), f = c.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = 52; lfo.frequency.value = 24; lg.gain.value = 0.12; f.type = 'lowpass'; f.frequency.value = 380;
      g.gain.setValueAtTime(0.0001, now); g.gain.linearRampToValueAtTime(0.13, now + 0.08); g.gain.linearRampToValueAtTime(0.0001, now + 0.7);
      lfo.connect(lg); lg.connect(g.gain); o.connect(f); f.connect(g); g.connect(c.destination);
      o.start(now); lfo.start(now); o.stop(now + 0.75); lfo.stop(now + 0.75);
    }
    else if (n === 'meow') { tone('triangle', 620, 1050, 0.16, 0.18); tone('triangle', 1050, 560, 0.25, 0.16, 0.15); }
    else if (n === 'punch') { noise(0.12, 0.35, 'lowpass', 900); tone('sine', 140, 55, 0.14, 0.3); }
    else if (n === 'giggle') [0, 0.09, 0.18].forEach((a, i) => tone('triangle', 880 + i * 120, 760 + i * 120, 0.07, 0.14, a));
    else if (n === 'hiss') noise(0.45, 0.2, 'highpass', 2800);
    else if (n === 'pop') tone('sine', 480, 920, 0.09, 0.2);
    else if (n === 'dizzy') tone('sine', 900, 260, 0.6, 0.15);
    else if (n === 'cry') { tone('sawtooth', 700, 1150, 0.25, 0.12); tone('sawtooth', 1150, 380, 0.75, 0.13, 0.22); tone('triangle', 900, 300, 0.9, 0.1, 1.05); }
  } catch (e) {}
}
function buzz(ms = 30) { if (S.settings.vibrate && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
let toastT;
function toast(t) { const el = $('toast'); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 2600); }

/* =========================================================
   6. モーダル
   ========================================================= */
let modalClose = null;
let modalLocked = false;   // はじめての設定中は × や外側タップで閉じない
function openModal(html, onMount, onClose, locked) {
  modalLocked = !!locked; $('modalClose').hidden = modalLocked;
  $('modalBody').innerHTML = html; $('modal').hidden = false; modalClose = onClose || null;
  if (onMount) onMount($('modalBody'));
  const f = $('modalBody').querySelector('input,button,select'); if (f && !('ontouchstart' in window)) f.focus();
}
function closeModal() { modalLocked = false; $('modalClose').hidden = false; $('modal').hidden = true; $('modalBody').innerHTML = ''; const c = modalClose; modalClose = null; if (c) c(); renderAll(); }
$('modalClose').addEventListener('click', closeModal);
$('modal').addEventListener('click', e => { if (e.target === $('modal') && !modalLocked) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('modal').hidden && !modalLocked) closeModal(); });

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
  const cr = crisisNow(); if (cr) return cr.say;
  if (S.stamina < 20) return 'つかれたにゃ…';
  const nm = S.user.name && S.user.name !== 'プレイヤー' ? S.user.name + '、' : '';
  if (!d.meals.length && h >= 10) return nm + '飯くれ！';
  if ((S.mood ?? 60) < 30) return nm + 'かまってほしいニャ…';
  if (f > 0.5) return 'おなかパンパン…';
  if (f < -0.5) return 'おなかすいた…';
  if (!d.trains) return nm + 'ジム行くにゃ！';
  if ((S.mood ?? 60) >= 80) return 'ごきげんニャ♪';
  return 'いい感じにゃ！';
}
function homeMood() {
  const h = new Date().getHours();
  if (S.stamina < 20) return 'tired';
  if (!day().meals.length && h >= 10) return 'hungry';
  return 'normal';
}
// ホームの猫：見た目が変わったときだけ作り直す（動きやタップ反応を止めないため）
let homeCat = null, homeCatKey = '';
function touchCat() {
  const d = day(); d.pets = d.pets || 0;
  if (d.pets >= RULE.moodTouchMax) return;
  d.pets += RULE.moodPerTouch; addMood(RULE.moodPerTouch); save(); renderMeters();
}
function renderMeters() {
  const m = S.mood ?? RULE.moodStart;
  $('stamFill').style.width = S.stamina + '%';
  $('stamFill').style.backgroundColor = S.stamina < 20 ? 'var(--red)' : S.stamina < 50 ? 'var(--yellow)' : 'var(--green)';
  $('stamVal').textContent = S.stamina + '%'; $('stamMeter').setAttribute('aria-valuenow', S.stamina);
  $('moodFill').style.width = m + '%'; $('moodVal').textContent = m + '%'; $('moodMeter').setAttribute('aria-valuenow', m);
}
function mountHomeCat() {
  const key = JSON.stringify([S.cat.breed, S.cat.idx, S.cat.dead, S.cat.equip, homeMood()]);
  if (homeCat && key === homeCatKey && $('catWrap').querySelector('.pc')) { homeCat.rest(); return; }
  if (homeCat) homeCat.stop();
  homeCatKey = key;
  $('catWrap').innerHTML = petCatHTML({ breed: S.cat.breed, idx: S.cat.idx, equip: S.cat.equip, dead: S.cat.dead, mood: homeMood() });
  homeCat = petCatBind($('catWrap'), { sayEl: $('bubble'), status: bubbleText, mood: homeMood, sound: petSound, vibrate: p => buzz(p), onReact: touchCat });
  const b = bubbleText(); $('bubble').textContent = b; $('bubble').hidden = !b;
}
function renderHome() {
  const d = day(), t = todayStr(), tg = target(S.user), it = intake(t);
  $('pillCoins').innerHTML = `${I.coin.replace('width="24" height="24"', '')}<span class="num">${fmt(S.coins)}</span><span class="plus">${I.plus}</span>`;
  $('btnUser').innerHTML = `<span class="nc-ico">${I.user}</span><span class="nc-name">${esc(S.user.name || 'プレイヤー')}</span>${I.pencil}`;
  if (!$('btnLogin').querySelector('svg')) $('btnLogin').insertAdjacentHTML('afterbegin', I.gift);
  if (!$('btnMission').querySelector('svg')) $('btnMission').insertAdjacentHTML('afterbegin', I.mission);
  $('kcalIco').innerHTML = I.flame;
  $('dayChip').textContent = `${daysBetween(S.start, t) + 1}日目`;
  $('kcalIntake').textContent = fmt(it); $('kcalTarget').textContent = fmt(tg);
  const scale = tg * 1.5;
  $('kcalBar').style.width = Math.min(100, it / scale * 100) + '%';
  $('kcalBar').style.background = Math.abs(it - tg) <= 100 ? 'var(--green)' : it > tg ? 'var(--orange)' : 'var(--blue)';
  $('kcalMark').style.left = (tg / scale * 100) + '%';
  $('eventBanner').innerHTML = `<span class="ev-ico">${I.luckyBag}</span><span class="ev-txt"><small>${esc(EVENT.tag)}</small>${EVENT.title}</span>`;
  $('stamIco').innerHTML = I.bolt; $('moodIco').innerHTML = I.heart;
  renderMeters();
  mountHomeCat();
  if (!$('btnGacha').querySelector('svg')) $('btnGacha').insertAdjacentHTML('afterbegin', `${I.gachaMachine}<span>ガチャ</span>`);
  $('dotGacha').hidden = S.coins < GACHA_COST;
  $('btnCamera').innerHTML = I.camera;
  const km = d.steps * (S.user.height || 165) * RULE.strideRate / 100000;
  $('pillSteps').innerHTML = `<span class="sc-ico">${I.shoe}</span><span class="sc-main"><small>歩数</small><b><span class="num">${km.toFixed(1)}</span> km</b><small class="num">${fmt(d.steps)}歩</small></span><span class="sc-arrow" aria-hidden="true">›</span>`;
  const st = bodyState(S.cat.idx);
  $('bodyPill').innerHTML = `<span class="sb-ico">${I.paw}</span><span class="sb-main"><small>${esc(S.cat.name)}　Lv.${S.cat.level}</small><b>${st[0]}</b><span class="sb-bar"><i style="left:${(S.cat.idx + 100) / 2}%"></i></span></span>`;
  $('bodyPill').style.background = st[1];
  $('btnRevive').hidden = !S.cat.dead;
  $('dotLogin').hidden = S.login.last === t;
  $('dotMission').hidden = !MISSIONS.some(m => m.check(d) >= m.goal && !claimedToday().includes(m.id));
}
function claimedToday() { if (S.claimed.date !== todayStr()) S.claimed = { date: todayStr(), ids: [] }; return S.claimed.ids; }

$('btnUser').addEventListener('click', () => openProfile(false));
$('kcalCard').addEventListener('click', () => { UI.histTab = 'week'; UI.histDate = todayStr(); setTab('history'); });
$('pillCoins').addEventListener('click', () => { UI.shopTab = 'shop'; setTab('shop'); });
$('btnGacha').addEventListener('click', () => { UI.shopTab = 'gacha'; setTab('shop'); });
$('eventBanner').addEventListener('click', () => { UI.shopTab = 'gacha'; setTab('shop'); });
$('bodyPill').addEventListener('click', () => { UI.histTab = 'status'; setTab('history'); });
$('pillSteps').addEventListener('click', () => openWalk());
$('btnLogin').addEventListener('click', openLogin);
$('btnMission').addEventListener('click', openMissions);
$('btnCamera').addEventListener('click', openCapture);
$('btnRevive').addEventListener('click', () => {
  openModal(`<h2 id="modalTitle">新しい猫を迎える</h2><div class="stack"><p style="margin:0">${esc(S.cat.name)}とはお別れです。コイン・アイテム・きせかえはそのまま引きつぎます。</p>
  ${catPickerHTML(S.cat.breed)}
  <label class="f">新しい猫の名前<input type="text" id="newCatName" maxlength="10" value="もち"></label><button class="btn block" id="doRevive">この猫を迎える</button></div>`, root => {
    const pick = bindCatPicker(root, S.cat.breed);
    root.querySelector('#doRevive').onclick = () => {
      const n = root.querySelector('#newCatName').value.trim() || 'もち';
      S.cat = Object.assign(S.cat, { name: n, breed: pick(), idx: 0, dead: null, alert: { hi: 0, lo: 0 }, level: 1, exp: 0, stats: { pow: 20, spd: 20, sta: 20 } });
      S.stamina = 65; save(); closeModal(); toast(`${n}がやってきた！`); se('get');
    };
  });
});

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

/* ---------- BGM ----------
   タイトル：Cat life ／ ホーム・りれき・せってい：自宅にて ／ ショップ・更衣室：青空 ／ トレーニング（ジム・ミニゲーム一覧）：Sunrise
   ミニゲームを開いているあいだ・アプリが裏に回ったときは止める。
   スマホはタップする前に音を出せないので、最初のタップ（タイトルの音楽ボタンかスタート）から鳴らす。
   音量は Web Audio でしぼる（iPhone は audio.volume が効かないため） */
const BGM_FILES = { title: 'bgm-title.mp3', home: 'bgm-home.mp3', shop: 'bgm-shop.mp3', train: 'bgm-train.mp3' };
let bgmEl = null, bgmGain = null, bgmCur = '', bgmUnlocked = false;
function bgmWant() {
  if (S.settings.bgm === false || document.hidden || $('miniFrame')) return '';
  if ($('battleUI')) return 'train';
  const t = $('title');
  if ((t && !t.hidden && !t.classList.contains('out')) || modalLocked) return 'title';   // タイトル画面・はじめての設定
  if (UI.tab === 'shop') return 'shop';
  if (UI.tab === 'train') return UI.trainTab === 'locker' ? 'shop' : 'train';
  return 'home';
}
function bgmUpdate() {
  const want = bgmWant();
  if (!bgmEl) {
    if (!want || !bgmUnlocked) return;
    bgmEl = new Audio(); bgmEl.loop = true; bgmEl.preload = 'auto'; bgmEl.setAttribute('playsinline', '');
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const src = actx.createMediaElementSource(bgmEl); bgmGain = actx.createGain(); bgmGain.gain.value = RULE.bgmVolume;
      src.connect(bgmGain); bgmGain.connect(actx.destination);
    } catch (e) { bgmEl.volume = RULE.bgmVolume; }
  }
  if (!want) { bgmEl.pause(); return; }
  if (want !== bgmCur) { bgmCur = want; bgmEl.src = `${BGM_FILES[want]}?v=${APP_VER}`; }
  if (actx && actx.state === 'suspended') actx.resume().catch(() => {});
  if (bgmEl.paused) { const p = bgmEl.play(); if (p && p.catch) p.catch(() => {}); }
}
// どこかを最初にタップしたら鳴らせるようにする
['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, () => { if (!bgmUnlocked) { bgmUnlocked = true; bgmUpdate(); } }, { once: true, capture: true }));

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
function startFromTitle() {
  const t = $('title'); if (t.classList.contains('out')) return;
  se('get'); buzz(20); bgmUnlocked = true;
  t.classList.add('out'); setTimeout(() => { t.hidden = true; bgmUpdate(); }, 350);
  if (!S.onboarded) openWelcome(); else { setTimeout(checkCrisis, 900); setTimeout(checkBackupNag, 1800); }
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
      <p style="margin:0">いっしょに暮らす猫をえらんでね。あとから「せってい」で変えられます。</p>
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
      S.user = v; S.cat.name = root.querySelector('#pCat').value.trim() || 'もち'; S.onboarded = true; save(); closeModal(); toast(`目標は 1日 ${fmt(target(v))} kcal`);
    };
  }, null, first);
}

/* ---------- 歩数 ---------- */
// 歩数は さんぽモード（GPS、walk.js）だけで数える（v8.7 で手入力はなくした）。
// v8.6 までに手で入れた歩数（d.stepsManual）はそのまま残し、その日は「手入力」と「さんぽ」の大きいほうにする。
// d.steps は合計（ミッション・km表示・きろく はこれを使う）。
function normSteps(d) {
  if (d.stepsManual == null) d.stepsManual = d.steps || 0;   // v8.5 までのデータは手入力として読む
  if (d.stepsGps == null) d.stepsGps = 0;
}
// 歩数を決めなおして、ふえた 1000歩ごとに ごほうび。ふえたぶんの回数を返す
function applySteps(d) {
  normSteps(d);
  d.steps = Math.max(d.stepsManual, d.stepsGps);
  const units = Math.floor(d.steps / RULE.stepsUnit), add = units - (d.stepUnits || 0);
  if (add <= 0) return 0;
  d.stepUnits = units; addStamina(add * RULE.staminaPerUnit); S.coins += add * RULE.coinPerUnit;
  return add;
}
/* ---------- バックアップ・復元（v8.9） ---------- */
// データはこのスマホの中（localStorage）にしかないので、機種変更やブラウザのデータ削除で消える。
// 全データ（写真こみ）を1つの JSON ファイルにして保存し、新しいスマホで「復元」すると同じ状態にもどる。
const BK_APP = 'nyankalo', DAY_MS = 864e5, BK_NAG_DAYS = 7;
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
const verNum = v => String(v || '0').split('.').reduce((a, x) => a * 1000 + (parseInt(x, 10) || 0), 0);
function backupAgoText() {
  if (!S.lastBackup) return 'まだ一度も保存していません';
  const n = Math.floor((Date.now() - S.lastBackup) / DAY_MS);
  return `最後のバックアップ：${n <= 0 ? '今日' : n + '日前'}`;
}
async function doBackup() {
  const name = `nyankalo-backup-${todayStr().replace(/-/g, '')}.json`;
  const blob = new Blob([JSON.stringify({ app: BK_APP, ver: APP_VER, at: Date.now(), data: S })], { type: 'application/json' });
  // スマホで共有シートが使えるときはそちら（「ファイルに保存」や LINE に送れる）
  let file = null; try { file = new File([blob], name, { type: 'application/json' }); } catch (e) {}
  if (file && navigator.canShare && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
    try { if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'にゃんカロのバックアップ' }); markBackup(); return; } }
    catch (e) { if (e && e.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  markBackup();
}
function markBackup() {
  S.lastBackup = Date.now(); save(); se('coin');
  toast(isIOS() ? 'バックアップを保存しました（「ファイル」アプリに入っています）' : 'バックアップを保存しました（ダウンロードに入っています）');
  if (UI.tab === 'settings') renderSettings();
}
// ファイルの中身をチェック。問題があればメッセージを返す
function checkBackup(o) {
  if (!o || o.app !== BK_APP || !o.data) return 'にゃんカロのバックアップファイルではありません';
  const d = o.data;
  if (typeof d !== 'object' || !d.cat || !d.user || !d.days || typeof d.days !== 'object' || !Array.isArray(d.owned) || typeof d.coins !== 'number') return 'ファイルがこわれているようです';
  if (verNum(o.ver) > verNum(APP_VER)) return `新しいバージョン（v${o.ver}）のバックアップです。アプリを最新にしてから復元してください`;
  return null;
}
function openRestore() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'application/json,.json';
  inp.onchange = () => {
    const f = inp.files && inp.files[0]; if (!f) return;
    if (f.size > 60e6) { toast('ファイルが大きすぎます'); return; }
    const r = new FileReader();
    r.onerror = () => toast('ファイルを読みこめませんでした');
    r.onload = () => {
      let o; try { o = JSON.parse(r.result); } catch (e) { toast('にゃんカロのバックアップファイルではありません'); return; }
      const err = checkBackup(o); if (err) { toast(err); se('bad'); return; }
      const d = o.data, at = new Date(o.at || 0);
      const back = () => { if (!S.onboarded) openWelcome(); else closeModal(); };
      openModal(`<h2 id="modalTitle">バックアップから復元</h2><div class="stack">
        <div class="card" style="padding:12px 14px;font-weight:700;line-height:1.8">保存した日：${at.getFullYear()}/${at.getMonth() + 1}/${at.getDate()} ${pad(at.getHours())}:${pad(at.getMinutes())}<br>
          猫：${esc(d.cat.name || '')}（Lv.${Number(d.cat.level) || 1}）<br>コイン：${fmt(d.coins)}<br>記録：${Object.keys(d.days).length}日分</div>
        <p class="hint" style="color:var(--red);font-weight:900;margin:0">今のデータはすべて上書きされます（元にはもどせません）</p>
        <button class="btn red block" id="rsGo">復元する</button><button class="btn white block" id="rsNo">やめる</button></div>`, root => {
        root.querySelector('#rsNo').onclick = back;
        root.querySelector('#rsGo').onclick = () => {
          d.lastBackup = o.at || Date.now(); d.onboarded = true;
          try { localStorage.setItem(KEY, JSON.stringify(d)); }
          catch (e) { toast('スマホの容量が足りず、復元できませんでした'); return; }
          toast('復元しました！ 読みこみなおします'); se('get');
          setTimeout(() => location.reload(), 700);
        };
      }, null, !S.onboarded);   // はじめての設定の途中なら、外をタップしても閉じない
    };
    r.readAsText(f);
  };
  inp.click();
}
// しばらくバックアップしていないとき、週に1回だけお知らせ（使いはじめて7日たってから）
function checkBackupNag() {
  if (!S.onboarded || !$('modal').hidden) return;
  const first = Object.keys(S.days).sort()[0], firstT = first ? new Date(first).getTime() : Date.now();
  const base = S.lastBackup || firstT, now = Date.now();
  if (now - base < BK_NAG_DAYS * DAY_MS || now - (S.backupNag || 0) < BK_NAG_DAYS * DAY_MS) return;
  S.backupNag = now; save();
  openModal(`<h2 id="modalTitle">バックアップしよう</h2><div class="stack">
    <p style="margin:0">${S.lastBackup ? `最後のバックアップから${Math.floor((now - S.lastBackup) / DAY_MS)}日たちました。` : 'まだ一度もバックアップしていません。'}データはこのスマホの中にしかないので、機種変更やブラウザのデータ削除で${esc(S.cat.name)}が消えてしまいます。</p>
    ${isIOS() && !isStandalone() ? '<p class="hint" style="margin:0">iPhone は Safari の共有ボタン →「ホーム画面に追加」から開くと、データが消えにくくなります。</p>' : ''}
    <button class="btn block" id="bnGo">今すぐ保存</button><button class="btn white block" id="bnNo">あとで</button></div>`, root => {
    root.querySelector('#bnGo').onclick = () => { closeModal(); doBackup(); };
    root.querySelector('#bnNo').onclick = closeModal;
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
    <div class="form-grid pfc-in">
      <label class="f">糖質 g<input type="number" id="capC" inputmode="numeric" min="0" max="1000" placeholder="－"></label>
      <label class="f">たんぱく質 g<input type="number" id="capP" inputmode="numeric" min="0" max="500" placeholder="－"></label>
      <label class="f">脂質 g<input type="number" id="capF" inputmode="numeric" min="0" max="500" placeholder="－"></label>
    </div>
    <div class="chips" id="capPresets">${PRESETS.map((p, i) => `<button type="button" class="chip" data-p="${i}">${esc(p[0])} ${p[1]}</button>`).join('')}</div>
    <button class="btn block" id="capSave">記録する</button>
    <p class="hint">カロリーは目安です。AIの結果は直してから記録できます。</p></div>`, root => {
    let slotV = slot;
    root.querySelector('#capPhoto').onclick = () => $('photoInput').click();
    root.querySelector('#capSlot').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; slotV = b.dataset.v; root.querySelectorAll('#capSlot button').forEach(x => x.setAttribute('aria-pressed', x === b)); });
    root.querySelector('#capPresets').addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (!b) return; const p = PRESETS[+b.dataset.p]; root.querySelector('#capName').value = p[0]; root.querySelector('#capKcal').value = p[1]; ['#capC', '#capP', '#capF'].forEach(q => { root.querySelector(q).value = ''; }); });
    root.querySelector('#capAI').onclick = () => runAI(root);
    root.querySelector('#capSave').onclick = () => {
      const name = root.querySelector('#capName').value.trim() || '食事', kcal = Math.round(+root.querySelector('#capKcal').value);
      if (!(kcal > 0 && kcal <= 5000)) { toast('カロリーを1〜5000の数字で入れてください'); return; }
      const d = day(), now = new Date();
      const g = q => { const v = root.querySelector(q).value; return v === '' ? null : clamp(Math.round(+v) || 0, 0, 1000); };
      const meal = { id: Math.random().toString(36).slice(2, 9), slot: slotV, name, kcal, photo: cap ? cap.thumb : null, time: `${pad(now.getHours())}:${pad(now.getMinutes())}` };
      const pc = g('#capC'), pp = g('#capP'), pf = g('#capF');
      if (pc != null || pp != null || pf != null) Object.assign(meal, { carbs: pc || 0, protein: pp || 0, fat: pf || 0 });
      d.meals.push(meal);
      let msg = `${name}（${kcal} kcal）を記録`;
      if (d.mealRewards < 5) { d.mealRewards++; addStamina(RULE.staminaPerMeal); addExp(RULE.expPerMeal); addMood(RULE.moodPerMeal); msg += `・スタミナ +${RULE.staminaPerMeal}`; }
      // 写真つきの記録：ミニゲームの報酬つきプレイ +1（1日 photoBonusMax 回まで）
      if (cap && (d.photoBonus || 0) < RULE.photoBonusMax) { d.photoBonus = (d.photoBonus || 0) + 1; msg += '・ミニゲーム +1回'; }
      save(); se('get'); buzz(40); setTimeout(() => { if (homeCat) homeCat.react('head'); }, 400);
      closeModal(); toast(msg); setTimeout(checkCrisis, 2800);
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
    const sum = k => items.reduce((a, x) => a + (Math.round(+x[k]) || 0), 0);
    const total = sum('kcal'), hasPfc = items.some(x => x.carbs != null || x.protein != null || x.fat != null);
    root.querySelector('#capName').value = items.map(x => x.name).join('・').slice(0, 30);
    root.querySelector('#capKcal').value = total;
    if (hasPfc) { root.querySelector('#capC').value = sum('carbs'); root.querySelector('#capP').value = sum('protein'); root.querySelector('#capF').value = sum('fat'); }
    const pfcTxt = x => hasPfc ? `<small class="pfc-mini">糖質${Math.round(+x.carbs) || 0}g・たんぱく質${Math.round(+x.protein) || 0}g・脂質${Math.round(+x.fat) || 0}g</small>` : '';
    const box = root.querySelector('#capResult');
    box.innerHTML = items.map(x => `<div class="r"><span>${esc(x.name)}${x.amount ? ` <small class="muted">${esc(x.amount)}</small>` : ''}${pfcTxt(x)}</span><b>${Math.round(+x.kcal)} kcal</b></div>`).join('') +
      `<div class="r t"><span>合計${pfcTxt({ carbs: sum('carbs'), protein: sum('protein'), fat: sum('fat') })}</span><span>${total} kcal</span></div>` + (d.note ? `<small class="muted">${esc(d.note)}</small>` : '');
    box.hidden = false; st.textContent = `入力しました（${Math.round((Date.now() - t0) / 1000)}秒）。違っていたら直してね`; se('coin');
  } catch (err) {
    st.textContent = err.name === 'AbortError' ? '時間がかかりすぎたので中止しました。もう一度押すか、手で入力してください' : (err instanceof TypeError ? '通信できませんでした。ネットを確認してください' : err.message);
  } finally { clearTimeout(to); clearInterval(timer); aiBusy = false; btn.textContent = 'AIでカロリーを調べる'; btn.disabled = !cap; }
}

/* =========================================================
   8. ショップ
   ========================================================= */
function balanceHTML() { return `<span class="pill">${I.coin}<span class="num">${fmt(S.coins)}</span></span><span class="pill">${I.stone}<span class="num">${fmt(S.stones)}</span></span>`; }
const shopQty = { drink: 1, protein: 1, goldbag: 1 };
function renderShop() {
  $('shopBalance').innerHTML = balanceHTML();
  $('shopSeg').querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', b.dataset.v === UI.shopTab));
  if (UI.shopTab === 'shop') {
    $('shopBody').innerHTML = `
      <div class="section-title">アイテム</div>
      <div class="list">${SHOP_ITEMS.filter(it => it.shop !== false).map(it => `<div class="card shop-item"><div class="ico">${I[it.id]}</div><div><div class="name" style="font-weight:900">${esc(it.name)}</div><div class="hint">${esc(it.desc)}　もっている：${S.items[it.id] || 0}</div><div class="price">${I.coin.replace('width="24" height="24"', 'width="18" height="18" style="vertical-align:-3px"')} ${fmt(it.price)}</div></div>
        <div class="buy-row"><span class="stepper"><button type="button" data-dec="${it.id}" aria-label="へらす">−</button><output>${shopQty[it.id]}</output><button type="button" data-inc="${it.id}" aria-label="ふやす">＋</button></span><button class="btn small" data-buy="${it.id}">購入</button></div></div>`).join('')}</div>
      <div class="section-title">石</div>
      <div class="list">${STONE_PACKS.map(p => `<div class="card shop-item"><div class="ico">${I.stone.replace('width="24" height="24"', 'width="38" height="38"')}</div><div><div style="font-weight:900">石 ×${p.n}</div><div class="price">¥${fmt(p.yen)}</div></div>
        <div class="buy-row"><button class="btn small white" data-stone="${p.n}">購入</button></div></div>`).join('')}</div>
      <p class="demo-note">学校の制作アプリなので、石の購入（お金を使う機能）は動きません。見た目だけのサンプルです。</p>`;
  } else {
    $('shopBody').innerHTML = `<div class="scene shop-scene">
      <img src="shop-bg.jpg" alt="猫の店員がいる福袋ガチャのお店の絵" width="900" height="762">
      <span class="shop-say">いらっしゃいだニャ！</span>
      ${['緑の福袋', '麻の福袋', '赤の福袋', '白の福袋'].map((n, i) => `<button class="bag-hit b${i}" data-bag="${i}" aria-label="${n}をえらぶ（${GACHA_COST}コイン）"></button>`).join('')}
    </div>
    <div class="card gacha-info"><div class="gacha-cost">1回引く：<b class="num">${GACHA_COST}</b>コイン<span class="muted">　もっている ${fmt(S.coins)}</span></div>
      <div class="gacha-pity">${pityHTML()}</div>
      <p class="hint">福袋をタップすると引けます。きせかえとトレーニングアイテムが出ます。SR ${GACHA_RATE.SR}%・R ${GACHA_RATE.R}%・N ${GACHA_RATE.N}%　${GACHA_PITY}回のうちに SR が必ず出ます（まだ持っていない SR から先に出ます）　かぶったら ${DUP_REFUND}コインに交換</p></div>`;
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
  else if (t.dataset.bag) { t.classList.add('picked'); setTimeout(() => confirmGacha(+t.dataset.bag), 300); }
});
const BAG_NAMES = ['緑の福袋', '麻の福袋', '赤の福袋', '白の福袋'];
// 天井までの表示（あと何回で SR 確定か）
const pityLeft = () => Math.max(1, GACHA_PITY - (S.pity || 0));
const pityHTML = () => pityLeft() === 1 ? '<b>つぎの1回は SR 確定！</b>' : `SR 確定まで あと <b class="num">${pityLeft()}</b> 回`;
function confirmGacha(bag) {
  bag = bag ?? rand(0, 3);
  const enough = S.coins >= GACHA_COST;
  openModal(`<h2 id="modalTitle">${BAG_NAMES[bag]}を引く？</h2><div class="reveal">
    <div class="item-big">${I.luckyBag}</div>
    <div style="font-weight:900;font-size:18px">${I.coin.replace('width="24" height="24"', 'width="20" height="20" style="vertical-align:-4px"')} ${fmt(GACHA_COST)}コインを使います</div>
    <div class="hint">もっているコイン：${fmt(S.coins)} → ${enough ? fmt(S.coins - GACHA_COST) : 'たりません'}</div>
    <div class="gacha-pity">${pityHTML()}</div>
    <button class="btn block" id="gYes" ${enough ? '' : 'disabled'}>はい、引く！</button>
    <button class="btn white block" id="gNo">やめる</button></div>`, root => {
    root.querySelector('#gYes').onclick = () => { closeModal(); pullGacha(); };
    root.querySelector('#gNo').onclick = closeModal;
  });
}
function pullGacha() {
  if (S.coins < GACHA_COST) { toast(`コインが ${fmt(GACHA_COST - S.coins)} 足りません`); se('bad'); return; }
  S.coins -= GACHA_COST;
  // 天井：SR が出ないまま GACHA_PITY 回目になったら SR 確定（S.pity = 前の SR から何回引いたか）
  const since = (S.pity || 0) + 1, r = Math.random() * 100;
  const rar = r < GACHA_RATE.SR || since >= GACHA_PITY ? 'SR' : r < GACHA_RATE.SR + GACHA_RATE.R ? 'R' : 'N';
  S.pity = rar === 'SR' ? 0 : since;
  let wears = Object.keys(WEAR).filter(k => WEAR[k].rar === rar && k !== 'band_none' && k !== 'suit_none');
  // SR はまだ持っていないきせかえから先に出す（そのあいだは金のサンドバッグも出ない。ぜんぶ持っていたら、かぶり・アイテムもあり）
  const srNew = rar === 'SR' && wears.some(k => !S.owned.includes(k));
  if (srNew) wears = wears.filter(k => !S.owned.includes(k));
  wears = wears.map(k => ({ wear: k }));
  const pool = srNew ? wears : wears.concat((GACHA_ITEMS[rar] || []).map(x => ({ item: x.id, n: x.n })));
  const got = pool[Math.floor(Math.random() * pool.length)];
  let body;
  if (got.item) {
    const it = SHOP_ITEMS.find(x => x.id === got.item);
    S.items[got.item] = (S.items[got.item] || 0) + got.n;
    body = `<div class="item-big ${rar}">${I[got.item]}</div><span class="rar ${rar}">${rar}</span>
      <div style="font-weight:900;font-size:20px">${esc(it.name)} ×${got.n}</div><div class="hint">トレーニングアイテム：${esc(it.desc)}</div>
      <p style="margin:0;font-weight:900">トレーニングの「もちもの」に入りました</p>`;
  } else {
    const id = got.wear, w = WEAR[id], dup = S.owned.includes(id);
    if (dup) S.coins += DUP_REFUND; else S.owned.push(id);
    body = `<div class="item-big ${rar}">${wearIcon(id)}</div><span class="rar ${rar}">${rar}</span>
      <div style="font-weight:900;font-size:20px">${esc(w.name)}</div><div class="hint">${SLOT_NAME[w.slot]}のきせかえ${w.bonus ? '　' + Object.entries(w.bonus).map(([k, v]) => `${STAT_NAME[k]}+${v}`).join(' ') : ''}</div>
      ${dup ? `<p style="margin:0;font-weight:900">もう持っていたので ${DUP_REFUND}コインに交換しました</p>` : `<button class="btn block" id="equipNow" data-slot="${w.slot}" data-id="${id}">さっそく着る</button>`}`;
  }
  save(); se(rar === 'SR' ? 'get' : 'coin'); buzz(rar === 'SR' ? [60, 40, 60] : 40);
  openModal(`<h2 id="modalTitle">${rar === 'SR' ? '大当たり！' : 'でたよ！'}</h2><div class="reveal">${body}
    <div class="gacha-pity">${pityHTML()}</div>
    <button class="btn white block" id="againG">もう1回（${GACHA_COST}コイン）</button></div>`, root => {
    const eq = root.querySelector('#equipNow'); if (eq) eq.onclick = () => { S.cat.equip[eq.dataset.slot] = eq.dataset.id; save(); closeModal(); toast('着がえました'); };
    root.querySelector('#againG').onclick = () => { closeModal(); confirmGacha(); };
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
    $('trainBody').innerHTML = `${S.protein ? '<p class="boost">プロテイン効果中：次のトレーニングが1.5倍</p>' : ''}${S.goldbag > 0 ? `<p class="boost">金のサンドバッグ効果中：あと${S.goldbag}回 2倍</p>` : ''}
      <div class="scene gym-scene b-entry" data-battle="1" role="button" tabindex="0" aria-label="猫バトル（対戦）をひらく"><img src="gym-bg.jpg" alt="ジムで猫たちがトレーニングしている絵" width="900" height="718"><span class="vs-badge">⚔️ 対戦</span></div>
      <div class="gym-cards">${TRAININGS.map(t => { const ok = S.stamina >= t.cost && !S.cat.dead; return `<div class="gym-card2" id="gc-${t.id}"><div class="gc-head">${{ bag: 'サンドバッグ<br>連打', tread: 'トレッドミル', weight: 'ウェイト<br>トレーニング' }[t.id] || esc(t.name)}</div>
        <div class="gc-body"><span class="gc-ico">${I[{ bag: 'sandbag', tread: 'tread', weight: 'barbell' }[t.id]]}</span><span class="gc-cost">スタミナ −${t.cost}</span><span class="gc-label">${esc(t.label)}</span>
        <button class="btn small red gc-start" data-train="${t.id}" ${ok ? '' : 'disabled'}>START</button></div></div>`; }).join('')}</div>
      <div class="section-title">もちもの</div>
      <div class="list">${SHOP_ITEMS.filter(it => it.shop !== false || (S.items[it.id] || 0) > 0).map(it => `<div class="card row"><span style="width:40px;height:40px;flex:none">${I[it.id]}</span><div class="grow"><div class="name">${esc(it.name)} ×${S.items[it.id] || 0}</div><div class="hint">${esc(it.desc)}</div></div><button class="btn small yellow" data-use="${it.id}" ${(S.items[it.id] || 0) > 0 ? '' : 'disabled'}>使う</button></div>`).join('')}</div>
      <p class="hint" style="margin-top:10px">スタミナは、ごはんを記録したり歩いたりすると回復します。</p>`;
  } else if (UI.trainTab === 'mini') {
    const left = miniLeft(), pb = Math.min(RULE.photoBonusMax, d.photoBonus || 0);
    $('trainBody').innerHTML = `<div class="card" style="padding:10px 14px;margin-bottom:10px;font-weight:900;text-align:center">今日の報酬つきプレイ　のこり ${left}回<div class="hint" style="font-weight:700">写真つきでごはんを記録すると +1回（今日 ${pb}/${RULE.photoBonusMax}）</div></div>
      <div class="list">
        <div class="card gym-card"><div class="ico" style="background:#FFE0EA;font-weight:900;font-size:30px;color:#C2335E">?</div><div><div style="font-weight:900">どっちが高い？</div><div class="hint">カロリーが高いほうを選ぶクイズ（5問）</div></div><button class="btn small" data-mini="quiz">あそぶ</button></div>
        <div class="card gym-card"><div class="ico">${I.sandbag}</div><div><div style="font-weight:900">サンドバッグ連打</div><div class="hint">10秒でできるだけタップ！</div></div><button class="btn small" data-mini="tap">あそぶ</button></div>
        <div class="card gym-card"><div class="ico" style="background:#E3F4E5;font-size:30px">🐱</div><div><div style="font-weight:900">お題の猫を探せ！</div><div class="hint">30秒でお題の猫をたくさんタップ！（最大${RULE.miniRewardMax}コイン）</div></div><button class="btn small" data-mini="sagase">あそぶ</button></div>
        <div class="card gym-card"><div class="ico" style="background:#F6E7C4;font-size:30px">🏃</div><div><div style="font-weight:900">にゃんこダッシュ</div><div class="hint">ベンチや茂みをよけてコインを集めよう（最大${RULE.miniRewardMax}コイン）</div></div><button class="btn small" data-mini="dash">あそぶ</button></div>
        <div class="card gym-card"><div class="ico" style="background:#DDEBFF;font-size:30px">⚾</div><div><div style="font-weight:900">にゃんこバッティング</div><div class="hint">犬のピッチャーの10球を打ちかえせ！（最大${RULE.miniRewardMax}コイン）</div></div><button class="btn small" data-mini="baseball">あそぶ</button></div>
        <div class="card gym-card"><div class="ico" style="background:#EBDDFF;font-size:30px">🎰</div><div><div style="font-weight:900">にゃんこスロット</div><div class="hint">アプリのコインをかけて目押し！（1日のもうけ上限 ${RULE.slotNetMax}コイン・回数に数えません）</div></div><button class="btn small" data-mini="slot">あそぶ</button></div>
      </div><p class="hint" style="margin-top:10px">ミニゲームはスタミナを使いません。カロリーは一般的な目安です。</p>`;
  } else {
    const eq = S.cat.equip;
    $('trainBody').innerHTML = `<div class="locker"><div class="card preview">${petCatHTML({ breed: S.cat.breed, idx: S.cat.idx, equip: eq, dead: S.cat.dead })}</div>
      <div class="card stats"><div style="font-weight:900">${esc(S.cat.name)}　Lv.${S.cat.level}</div>${statRows()}</div></div>
      ${['suit', 'head', 'top', 'hand'].map(sl => `<div class="section-title">${SLOT_NAME[sl]}</div>${sl === 'suit' ? '<p class="hint" style="margin:-4px 0 8px;text-align:center">着ている間は 頭・服 が見えません（能力のボーナスはそのまま）</p>' : ''}<div class="wear-grid">${S.owned.filter(k => WEAR[k] && WEAR[k].slot === sl).map(k => `<button class="wear" data-wear="${k}" aria-pressed="${eq[sl] === k}">${wearIcon(k)}<span>${esc(WEAR[k].name)}</span><span class="rar ${WEAR[k].rar}">${WEAR[k].rar}</span></button>`).join('')}</div>`).join('')}
      <p class="hint" style="margin-top:10px">ガチャで新しいきせかえが手に入ります。</p>`;
  }
}
function statRows() {
  const col = { pow: 'var(--red)', spd: 'var(--blue)', sta: 'var(--green)' };
  return ['pow', 'spd', 'sta'].map(k => { const v = statWithBonus(k), bonus = v - S.cat.stats[k]; return `<div class="stat-row"><span>${STAT_NAME[k]}</span><span class="bar"><i style="width:${Math.min(100, v / 3)}%;background:${col[k]}"></i></span><b class="num">${v}${bonus ? `<small style="color:var(--orange-d)">+${bonus}</small>` : ''}</b></div>`; }).join('') +
    `<div class="stat-row"><span>EXP</span><span class="bar"><i style="width:${S.cat.exp / expNeed(S.cat.level) * 100}%;background:var(--yellow)"></i></span><b class="num" style="font-size:11px">${S.cat.exp}/${expNeed(S.cat.level)}</b></div>`;
}
$('trainSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; UI.trainTab = b.dataset.v; se('tap'); renderTrain(); bgmUpdate(); });
$('trainBody').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-battle]')) { e.preventDefault(); openBattleLobby(); } });
$('trainBody').addEventListener('click', e => {
  if (e.target.closest('[data-battle]')) { openBattleLobby(); return; }
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.train) doTraining(TRAININGS.find(x => x.id === t.dataset.train));
  else if (t.dataset.use) {
    const id = t.dataset.use; if (!(S.items[id] > 0)) return;
    if (id === 'drink') { if (S.stamina >= 100) { toast('スタミナは満タンです'); return; } addStamina(30); toast('スタミナ +30'); }
    if (id === 'protein') { if (S.protein) { toast('もうプロテイン効果中です'); return; } S.protein = true; toast('次のトレーニングが1.5倍！'); }
    if (id === 'goldbag') { S.goldbag = (S.goldbag || 0) + 3; toast('つぎの3回のトレーニングが2倍！'); }
    S.items[id]--; save(); se('coin'); renderAll();
  }
  else if (t.dataset.mini === 'quiz') playQuiz();
  else if (t.dataset.mini === 'tap') playTap();
  else if (MINI_PAGES[t.dataset.mini]) openMiniPage(t.dataset.mini);
  else if (t.dataset.wear) { const k = t.dataset.wear; S.cat.equip[WEAR[k].slot] = k; save(); se('tap'); renderAll(); }
});
function doTraining(t) {
  if (S.cat.dead) return;
  if (S.stamina < t.cost) { toast('スタミナが足りません。ごはんを記録するか歩こう'); se('bad'); return; }
  S.stamina -= t.cost;
  const gold = (S.goldbag || 0) > 0;
  const mult = (S.protein ? 1.5 : 1) * (gold ? 2 : 1), g = Math.round(rand(t.gain[0], t.gain[1]) * mult);
  S.cat.stats[t.stat] += g; S.protein = false; if (gold) S.goldbag--;
  S.coins += t.coin; day().trains++; addExp(t.exp); addMood(RULE.moodPerTrain); save();
  se('get'); buzz(25); petSound(t.id === 'bag' ? 'punch' : 'pop');
  // 結果は画面の上にふわっと出すだけ（続けて押せる）
  renderAll();
  const card = document.getElementById('gc-' + t.id), scene = document.querySelector('.gym-scene');
  if (scene) { scene.classList.remove('hit'); void scene.offsetWidth; scene.classList.add('hit'); }
  if (card) {
    const f = document.createElement('span'); f.className = 'gc-float';
    f.innerHTML = `${STAT_NAME[t.stat]} +${g}${mult > 1 ? ' ×' + mult : ''}<small>EXP +${t.exp}${t.coin ? '・コイン +' + t.coin : ''}</small>`;
    card.appendChild(f); setTimeout(() => f.remove(), 1300);
  }
}
// 今日の報酬つきプレイの回数（写真つきの記録で最大+3）
const miniLimit = () => RULE.miniPlaysPerDay + Math.min(RULE.photoBonusMax, day().photoBonus || 0);
const miniLeft = () => Math.max(0, miniLimit() - day().miniRewards);
function miniReward(coins) {
  const d = day(); d.minis++;
  if (d.miniRewards >= miniLimit()) return '今日の報酬はもう受けとりました';
  d.miniRewards++; S.coins += coins; se('coin'); return `コイン +${coins}`;
}
// 組員作のミニゲーム（別ページ）を全画面で開く。
// ゲームの中からは window.parent.nyankaloMini を通してコインなどを読み書きする。
const MINI_PAGES = { sagase: ['sagase.html', 'お題の猫を探せ！'], dash: ['dash.html', 'にゃんこダッシュ'], slot: ['slot.html', 'にゃんこスロット'], baseball: ['baseball.html', 'にゃんこバッティング'] };
// ミニゲームに渡す猫の情報（能力は装備ボーナスこみ。shirt / gloves は着せかえの色、なければ null）
function miniCatInfo() {
  const eq = S.cat.equip || {};
  return {
    name: S.cat.name, breed: S.cat.breed, level: S.cat.level,
    pow: statWithBonus('pow'), spd: statWithBonus('spd'), sta: statWithBonus('sta'),
    head: eq.head || null, top: eq.top || null, hand: eq.hand || null, suit: eq.suit && eq.suit !== 'suit_none' ? eq.suit : null,
    suitColor: (WEAR[eq.suit] || {}).color || null, suitBody: (WEAR[eq.suit] || {}).body || null,
    shirt: (WEAR[eq.top] || {}).color || null, gloves: (WEAR[eq.hand] || {}).color || null
  };
}
window.nyankaloMini = {
  // 共通
  info: () => ({ coins: S.coins, left: miniLeft(), max: RULE.miniRewardMax, sound: S.settings.sound, vibrate: S.settings.vibrate, cat: miniCatInfo() }),
  // 報酬つきプレイ1回ぶん：コインは上限 miniRewardMax まで。回数が残っていなければ0
  reward: n => {
    n = Math.max(0, Math.round(n || 0));
    const d = day(); d.minis++;
    if (n <= 0) { save(); return { ok: false, given: 0, msg: '' }; }
    if (d.miniRewards >= miniLimit()) { save(); return { ok: false, given: 0, msg: '今日の報酬はもう受けとりました' }; }
    const g = Math.min(n, RULE.miniRewardMax);
    d.miniRewards++; S.coins += g; save();
    return { ok: true, given: g, msg: g < n ? `アプリに +${g}コイン（1回の上限 ${RULE.miniRewardMax}）` : `アプリに +${g}コイン` };
  },
  played: () => { day().minis++; save(); },
  // 記録（ゲームごと）
  getRec: k => (S.miniRec || {})[k] || null,
  setRec: (k, v) => { S.miniRec = S.miniRec || {}; S.miniRec[k] = v; save(); },
  // スロット：アプリのコインをかける。1日のもうけ（勝ち−かけ）は slotNetMax まで
  slotInfo: () => ({ coins: S.coins, net: day().slotNet || 0, max: RULE.slotNetMax }),
  slotBet: n => { const d = day(); if (S.coins < n) return { ok: false, coins: S.coins }; if (!d.slotPlayed) { d.slotPlayed = true; d.minis++; } S.coins -= n; d.slotNet = (d.slotNet || 0) - n; save(); return { ok: true, coins: S.coins, net: d.slotNet }; },
  slotWin: n => { const d = day(), net = d.slotNet || 0; const g = Math.max(0, Math.min(n, RULE.slotNetMax - net)); S.coins += g; d.slotNet = net + g; save(); return { given: g, capped: g < n, coins: S.coins, net: d.slotNet }; },
  close: () => closeMiniPage()
};
function openMiniPage(k) {
  if ($('miniFrame')) return;
  const [src, title] = MINI_PAGES[k];
  const w = document.createElement('div');
  w.className = 'mini-frame'; w.id = 'miniFrame';
  w.innerHTML = `<iframe src="${src}?v=${APP_VER}" title="${esc(title)}" allow="autoplay"></iframe>`;
  document.body.appendChild(w); document.body.classList.add('mini-open'); bgmUpdate();
}
function closeMiniPage() {
  const w = $('miniFrame'); if (!w) return;
  w.remove(); document.body.classList.remove('mini-open'); renderAll();
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
function renderHistory() {
  const t = todayStr(), dt = parseYmd(t);
  $('histDate').textContent = `Date ${dt.getMonth() + 1}/${dt.getDate()}（${WEEK[dt.getDay()]}）`;
  const tabs = `<div class="hist-seg" role="tablist"><button role="tab" data-h="status" aria-selected="${UI.histTab === 'status'}">ステータス</button><button role="tab" data-h="week" aria-selected="${UI.histTab === 'week'}">1週間の<br>きろく</button></div>`;
  if (UI.histTab === 'week') {
    const dates = weekDates(), sel = UI.histDate, sd = S.days[sel] || { meals: [] }, sdt = parseYmd(sel);
    const cards = Object.keys(SLOTS).map(k => {
      const ms = sd.meals.filter(m => m.slot === k), kc = ms.reduce((a, m) => a + m.kcal, 0), m0 = ms[0];
      if (!m0 && k === 'snack') return `<div class="meal-card"><span class="slot">${SLOTS[k]}</span><span class="mname">なし</span><span class="ph">${I.plate}</span><span class="hint"> </span></div>`;
      if (!m0) return `<div class="meal-card"><span class="slot">${SLOTS[k]}</span><span class="mname">${sel <= t ? 'まだ' : '－'}</span><span class="ph">${I.plate}</span><span class="hint" style="font-weight:900">${sel === t ? 'たべてないよ' : sel < t ? '記録なし' : ''}</span></div>`;
      return `<div class="meal-card"><span class="slot">${SLOTS[k]}</span><span class="mname">${esc(m0.name)}${ms.length > 1 ? ` ほか${ms.length - 1}` : ''}</span>${m0.photo ? `<img src="${m0.photo}" alt="${esc(m0.name)}の写真">` : `<span class="ph">${I.plate}</span>`}<span class="kc num">${fmt(kc)} kcal</span></div>`;
    }).join('');
    const list = sd.meals.length ? `<div class="list meal-list" style="margin-top:12px">${sd.meals.map(m => `<div class="card row">${m.photo ? `<img src="${m.photo}" alt="">` : `<span class="ph"></span>`}<div class="grow"><div class="name">${esc(m.name)}</div><div class="hint">${SLOTS[m.slot]}　${esc(m.time)}${m.carbs != null ? `<br>糖質${m.carbs}g・たんぱく質${m.protein}g・脂質${m.fat}g` : ''}</div></div><b class="num">${fmt(m.kcal)} kcal</b>${sel === t ? `<button class="x-btn" data-del="${m.id}" aria-label="${esc(m.name)}を消す">✕</button>` : ''}</div>`).join('')}</div>` : '';
    $('histBody').innerHTML = `<div class="card chart-card">${chartSVG(dates)}</div>
      <div class="chips" style="justify-content:space-between;margin-top:8px">${dates.map(d => `<button class="chip" data-day="${d}" ${d > t ? 'disabled' : ''} style="${d === sel ? 'background:var(--yellow)' : ''}">${WEEK[parseYmd(d).getDay()]} <span class="num">${intake(d) ? fmt(intake(d)) : '-'}</span></button>`).join('')}</div>
      ${tabs}
      <div class="section-title">${sel === t ? '本日' : `${sdt.getMonth() + 1}/${sdt.getDate()}（${WEEK[sdt.getDay()]}）`}</div>
      <div class="meals3">${cards}</div>
      <div class="card" style="margin-top:12px;padding:10px 14px;display:flex;justify-content:space-between;font-weight:900"><span>合計</span><span class="num">${fmt(intake(sel))} / ${fmt(target(S.user))} kcal</span></div>${pfcCard(sd.meals)}${list}`;
  } else {
    const st = bodyState(S.cat.idx), recDays = Object.values(S.days).filter(d => d.meals.length).length;
    const meals = Object.values(S.days).reduce((a, d) => a + d.meals.length, 0), steps = Object.values(S.days).reduce((a, d) => a + (d.steps || 0), 0);
    $('histBody').innerHTML = `${tabs}
      <div class="locker" style="margin-top:12px"><div class="card preview">${petCatHTML({ breed: S.cat.breed, idx: S.cat.idx, equip: S.cat.equip, dead: S.cat.dead })}</div>
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
    <div class="card set-group"><div class="set-row"><div class="grow">BGM<small>画面ごとの音楽</small></div>${sw('sBgm', s.bgm !== false, 'BGM')}</div>
      <div class="set-row"><div class="grow">効果音<small>ボタンやコインの音</small></div>${sw('sSound', s.sound, '効果音')}</div></div>
    <div class="section-title">バイブレーション</div>
    <div class="card set-group"><div class="set-row"><div class="grow">バイブレーション<small>iPhone では動かないことがあります</small></div>${sw('sVib', s.vibrate, 'バイブレーション')}</div></div>
    <div class="section-title">通知</div>
    <div class="card set-group">
      <div class="set-row"><div class="grow">通知（ごはんのリマインダー・猫のSOS）<small>${perm === 'unsupported' ? 'この端末では通知が使えません' : 'アプリを開いているあいだに届きます'}</small></div>${sw('sNotify', s.notify && perm === 'granted', 'ごはんのリマインダー')}</div>
      <div class="set-row"><div class="grow">お昼</div><input type="time" id="sT1" value="${s.remind[0]}" style="width:120px"></div>
      <div class="set-row"><div class="grow">夜</div><input type="time" id="sT2" value="${s.remind[1]}" style="width:120px"></div>
    </div>
    <div class="section-title">言語</div>
    <div class="card set-group"><div class="set-row"><div class="grow">言語 / Language</div><select id="sLang" style="width:150px"><option value="ja" selected>日本語</option><option value="zh" disabled>中文（準備中）</option><option value="en" disabled>English（準備中）</option></select></div></div>
    <div class="section-title">データ</div>
    <div class="card set-group">
      <div class="set-row"><div class="grow">バックアップを保存<small>${esc(backupAgoText())}。写真もふくめて1つのファイルにします</small></div><button class="btn small" id="sBackup">保存</button></div>
      <div class="set-row"><div class="grow">バックアップから復元<small>機種変更のときなど。今のデータは上書きされます</small></div><button class="btn small white" id="sRestore">えらぶ</button></div>
      ${isIOS() && !isStandalone() ? '<div class="set-row"><div class="grow">iPhone の人へ<small>Safari の共有ボタン →「ホーム画面に追加」から開くと、データが消えにくくなります</small></div></div>' : ''}
    </div>
    <div class="section-title">そのほか</div>
    <div class="card set-group">
      <div class="set-row"><div class="grow">猫の種類<small>いまは「${esc((CATS[S.cat.breed] || CATS.tabby).name)}」</small></div><button class="btn small white" id="sCat">かえる</button></div>
      <div class="set-row"><div class="grow">プロフィール・目標カロリー</div><button class="btn small white" id="sProfile">ひらく</button></div>
      <div class="set-row"><div class="grow">データをすべて消す<small>猫・コイン・記録が最初にもどります</small></div><button class="btn small ${resetArmed ? 'red' : 'white'}" id="sReset">${resetArmed ? 'もう一度押すと消えます' : '消す'}</button></div>
    </div>
    <p class="hint" style="text-align:center;margin:14px 0">にゃんカロ　宮崎情報ビジネス専門学校 制作アプリ</p>`;
}
$('setBody').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  const s = S.settings;
  if (b.id === 'sSound') { s.sound = !s.sound; se('tap'); }
  else if (b.id === 'sBgm') { s.bgm = s.bgm === false; bgmUpdate(); }
  else if (b.id === 'sVib') { s.vibrate = !s.vibrate; buzz(80); }
  else if (b.id === 'sNotify') {
    if (!('Notification' in window)) { toast('この端末では通知が使えません'); return; }
    if (!s.notify) { const p = await Notification.requestPermission(); s.notify = p === 'granted'; if (p !== 'granted') toast('通知が許可されませんでした。端末の設定から許可してください'); }
    else s.notify = false;
  }
  else if (b.id === 'sProfile') { openProfile(false); return; }
  else if (b.id === 'sBackup') { doBackup(); return; }
  else if (b.id === 'sRestore') { openRestore(); return; }
  else if (b.id === 'sCat') { openCatPicker(); return; }
  else if (b.id === 'sReset') {
    if (!resetArmed) { resetArmed = true; renderSettings(); setTimeout(() => { resetArmed = false; if (UI.tab === 'settings') renderSettings(); }, 4000); return; }
    try { localStorage.removeItem(KEY); } catch (err) {} S = defaultState(); resetArmed = false; save(); setTab('home'); openWelcome(); return;
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
  rollover(); checkCrisis();
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
  bgmUpdate();
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
renderTitle();
$('title').addEventListener('click', startFromTitle);
$('titleMusic').addEventListener('click', e => {
  e.stopPropagation(); bgmUnlocked = true;
  if (S.settings.bgm === false) { S.settings.bgm = true; save(); }
  bgmUpdate(); $('titleMusic').textContent = '🔊';
});
$('title').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startFromTitle(); } });
document.addEventListener('visibilitychange', () => { bgmUpdate(); if (!document.hidden) { rollover(); renderAll(); if ($('title').hidden) checkCrisis(); } });
