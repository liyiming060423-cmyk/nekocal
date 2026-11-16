// にゃんカロ データ（状態）
// S＝アプリの全部のデータ。defaultState（はじめの値）・load（読みこみと古いデータの直し）・save（保存）・day（その日の記録）。保存は storage.js を通す
// （v10.0 で app.js から分けた。読みこむ順番は index.html。ほかのファイルの関数・変数はそのまま使える）
'use strict';

/* =========================================================
   3. 状態（storage.js の store に保存）
   ========================================================= */
function defaultState() {
  const t = todayStr();
  return {
    v: 1,
    user: { name: 'プレイヤー', sex: 'male', age: 20, height: 170, weight: 60, goal: 'keep', delta: 300 },
    cat: { name: 'もち', breed: 'tabby', idx: 0, dead: null, level: 1, exp: 0, stats: { pow: 20, spd: 20, sta: 20 }, equip: { head: 'band_none', top: 'tee_orange', hand: 'gloves_brown', suit: 'suit_none' } },
    stamina: 65, coins: 850, stones: 0, pity: 0,
    guide: { tour: false, hits: [], got: [], done: false },   // v9.1 はじめてガイド（tour=ホーム案内を見た）
    items: { drink: 0, protein: 0, goldbag: 0 }, protein: false, goldbag: 0, mood: RULE.moodStart,
    owned: ['band_none', 'tee_orange', 'gloves_brown', 'suit_none'],
    start: t, last: t, days: {}, history: [],
    settled: addDays(t, -1),          // v9.9 どの日まで締めたか（体型の計算がすんだ日）
    streak: { n: 0, pass: '' },       // v9.9 連続記録（n=日数、pass=おやすみ券を使った週の月曜日）
    resultQ: [],                      // v9.9 まだ見せていない「きのうの結果」
    login: { last: '', streak: 0 },
    claimed: { date: t, ids: [] },
    settings: { sound: true, bgm: true, vibrate: true, notify: false, lang: 'ja', remind: ['12:00', '19:00'] },
    onboarded: false
  };
}
function load() {
  try {
    const raw = store.read(KEY);
    if (!raw) return defaultState();
    const s = JSON.parse(raw), d = defaultState();
    const st = Object.assign(d, s, {
      user: Object.assign(d.user, s.user), cat: Object.assign(d.cat, s.cat),
      items: Object.assign(d.items, s.items), settings: Object.assign(d.settings, s.settings)
    });
    // v8.8：コスチューム（suit）の欄を追加
    if (!st.owned.includes('suit_none')) st.owned.push('suit_none');
    if (!st.cat.equip.suit) st.cat.equip.suit = 'suit_none';
    // v9.1：はじめてガイド（前からのデータにも出す）
    st.guide = Object.assign({ tour: false, hits: [], got: [], done: false }, s.guide);
    // v9.9：締め・連続記録・入院。前の版は 0 時に前の日まで締めていたので、締めたのは「最後に開いた日の前の日」まで
    if (!s.settled) st.settled = addDays(st.last || todayStr(), -1);
    st.streak = Object.assign({ n: 0, pass: '' }, s.streak);
    if (!Array.isArray(st.resultQ)) st.resultQ = [];
    // 前の版で骸骨・爆発になっていた猫は、今日から入院（入院費はとらない）
    if (st.cat.dead) {
      const t = todayStr();
      st.cat.hospital = { from: t, until: addDays(t, HOSPITAL.days), reason: st.cat.dead, good: 0 };
      st.cat.idx = st.cat.dead === 'boom' ? HOSPITAL.admitIdx : -HOSPITAL.admitIdx; st.cat.dead = null;
    }
    return st;
  } catch (e) { return defaultState(); }
}
let S = load();
const UI = { tab: 'home', shopTab: 'shop', trainTab: 'gym', histTab: 'week', histDate: todayStr(), face: null };

// 保存。容量がいっぱいなら古い写真から消して保存し直す。それでもだめなら知らせる（v10.0：前は何も言わずに失敗していた）
let saveFailAt = 0;
function save() {
  const json = () => JSON.stringify(S);
  try { store.write(KEY, json()); return true; }
  catch (e) {
    const keys = Object.keys(S.days).sort();
    for (const k of keys) {
      if (!S.days[k].meals.some(m => m.photo)) continue;
      S.days[k].meals.forEach(m => { m.photo = null; });
      try { store.write(KEY, json()); toast('容量がいっぱいなので、古い写真を消しました'); return true; } catch (e2) {}
    }
    if (Date.now() - saveFailAt > 60000) { saveFailAt = Date.now(); toast('データを保存できませんでした。せってい →「バックアップを保存」をしてください'); }
    return false;
  }
}
function day(d = todayStr()) {
  if (!S.days[d]) S.days[d] = { meals: [], steps: 0, stepUnits: 0, trains: 0, minis: 0, miniRewards: 0, mealRewards: 0, photoBonus: 0, slotNet: 0 };
  return S.days[d];
}
const intake = d => (S.days[d] ? S.days[d].meals.reduce((a, m) => a + m.kcal, 0) : 0);
