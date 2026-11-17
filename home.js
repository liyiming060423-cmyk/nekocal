// にゃんカロ ホーム
// ホームの表示・歩数のごほうび・ログボ・ミッション・はじめてガイド・ホームの案内（ツアー）・ごはんの記録と AI
// （v10.0 で app.js から分けた。読みこむ順番は index.html。ほかのファイルの関数・変数はそのまま使える）
'use strict';

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
  if (S.cat.hospital) return '早くよくなりたいにゃ…';
  const cr = crisisNow(); if (cr) return cr.say;
  if (S.stamina < 20) return 'つかれたにゃ…';
  const nm = S.user.name && S.user.name !== 'プレイヤー' ? S.user.name + '、' : '';
  if (!d.meals.length && h >= 10) return nm + '飯くれ！';
  if (h >= 19 && S.sumSeen !== todayStr()) return nm + '今日のまとめ、見てにゃ！';   // v9.9：夜は「今日のまとめ」へ（カロリーのカードから）
  if ((S.mood ?? 60) < 30) return nm + 'かまってほしいニャ…';
  if (f > 0.5) return 'おなかパンパン…';
  if (f < -0.5) return 'おなかすいた…';
  if (!d.trains) return nm + 'ジム行くにゃ！';
  if ((S.mood ?? 60) >= 80) return 'ごきげんニャ♪';
  return 'いい感じにゃ！';
}
function homeMood() {
  const h = new Date().getHours();
  if (S.cat.hospital || S.stamina < 20) return 'tired';
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
  $('pillCoins').innerHTML = `${I.coin.replace('width="24" height="24"', '')}<span class="num coin-num">${coinText()}</span><span class="plus">${I.plus}</span>`;
  $('btnUser').innerHTML = `<span class="nc-ico">${I.user}</span><span class="nc-name">${esc(S.user.name || 'プレイヤー')}</span>`;   // v10.1：えんぴつの絵はやめて、名前の字を広く
  if (!$('btnSettings').querySelector('svg')) $('btnSettings').innerHTML = I.gear;
  if (!$('btnLogin').querySelector('svg')) $('btnLogin').insertAdjacentHTML('afterbegin', I.gift);
  if (!$('btnMission').querySelector('svg')) $('btnMission').insertAdjacentHTML('afterbegin', I.mission);
  $('kcalIco').innerHTML = I.flame;
  $('dayChip').textContent = `${daysBetween(S.start, t) + 1}日目`;
  $('kcalIntake').textContent = fmt(it); $('kcalTarget').textContent = fmt(tg);
  const scale = tg * 1.5;
  $('kcalBar').style.width = Math.min(100, it / scale * 100) + '%';
  $('kcalBar').style.background = Math.abs(it - tg) <= 100 ? 'var(--green)' : it > tg ? 'var(--orange)' : 'var(--blue)';
  $('kcalMark').style.left = (tg / scale * 100) + '%';
  const bn = $('eventBanner'); bn.classList.remove('hosp-b', 'close-b');
  if (S.cat.hospital) {   // v9.9：入院中は退院までのようす
    const h = S.cat.hospital, left = Math.max(1, daysBetween(t, h.until)), g = Math.max(0, HOSPITAL.goodDays - (h.good || 0));
    bn.classList.remove('guide'); bn.classList.add('hosp-b');
    bn.innerHTML = `<span class="ev-ico ev-emoji" aria-hidden="true">🏥</span><span class="ev-txt"><small>入院中</small>あと${left}日で退院<br>バランス ${h.good || 0}/${HOSPITAL.goodDays}日</span>`;
  } else if (pendingYesterday()) {   // v9.9：まだ締めていない きのう
    bn.classList.remove('guide'); bn.classList.add('close-b');
    bn.innerHTML = `<span class="ev-ico ev-emoji" aria-hidden="true">🌙</span><span class="ev-txt"><small>きのうの記録</small>${RULE.closeHour}時にしめる<br><b>見なおす ›</b></span>`;
  } else if (!S.guide.done) {   // はじめてガイドのあいだは、バナーをガイドにする
    const g = guideCount();
    $('eventBanner').classList.add('guide');
    $('eventBanner').innerHTML = `<span class="ev-txt"><small>はじめてガイド</small>${g.got} / ${GUIDE.tasks.length} クリア<br>${g.ready ? '<b>受けとれるよ！</b>' : 'コインがもらえる！'}</span>`;
  } else {
    $('eventBanner').classList.remove('guide');
    $('eventBanner').innerHTML = `<span class="ev-ico">${I.luckyBag}</span><span class="ev-txt"><small>${esc(EVENT.tag)}</small>${EVENT.title}</span>`;
  }
  $('stamIco').innerHTML = I.bolt; $('moodIco').innerHTML = I.heart;
  renderMeters();
  mountHomeCat();
  if (!$('btnGacha').querySelector('svg')) $('btnGacha').insertAdjacentHTML('afterbegin', `${I.gachaMachine}<span>ガチャ</span>`);
  $('dotGacha').hidden = S.coins < GACHA_COST;
  $('btnCamera').innerHTML = I.camera;
  const km = d.steps * (S.user.height || 165) * RULE.strideRate / 100000;
  $('pillSteps').innerHTML = `<span class="sc-ico">${I.shoe}</span><span class="sc-main"><small>歩数</small><b><span class="num">${km.toFixed(1)}</span> km</b><small class="num">${fmt(d.steps)}歩</small></span><span class="sc-arrow" aria-hidden="true">›</span>`;
  const st = bodyState(S.cat.idx);
  $('bodyPill').innerHTML = `<span class="sb-ico">${I.paw}</span><span class="sb-main"><small>${esc(S.cat.name)}　Lv.${S.cat.level}</small><b>${S.cat.hospital ? '入院中' : st[0]}</b><span class="sb-bar"><i style="left:${(S.cat.idx + 100) / 2}%"></i></span></span>`;
  $('bodyPill').style.background = st[1];
  $('tab-home').classList.toggle('hosp', !!S.cat.hospital);
  $('dotLogin').hidden = S.login.last === t;
  $('dotMission').hidden = !MISSIONS.some(m => m.check(d) >= m.goal && !claimedToday().includes(m.id));
  coinSync();   // v10.1：コインの数字がふえた・へったら動かす（fx.js）
}
function claimedToday() { if (S.claimed.date !== todayStr()) S.claimed = { date: todayStr(), ids: [] }; return S.claimed.ids; }

$('btnUser').addEventListener('click', () => openProfile(false));
$('kcalCard').addEventListener('click', () => { UI.histWeek = 0; UI.histDate = todayStr(); setTab('history'); });
$('pillCoins').addEventListener('click', () => { UI.shopTab = 'shop'; setTab('shop'); });
$('btnGacha').addEventListener('click', () => { UI.shopTab = 'gacha'; setTab('shop'); });
$('eventBanner').addEventListener('click', () => {
  if (S.cat.hospital) { openHospitalInfo(); return; }
  if (pendingYesterday()) { openCloseDay(); return; }
  if (!S.guide.done) { openGuide(); return; }
  UI.shopTab = 'gacha'; setTab('shop');
});
$('bodyPill').addEventListener('click', () => { UI.catTab = 'status'; setTab('cat'); });   // v10.1：ステータスは「ねこ」タブ
$('btnSettings').addEventListener('click', () => { se('tap'); setTab('settings'); });
$('pillSteps').addEventListener('click', () => openWalk());
$('btnLogin').addEventListener('click', openLogin);
$('btnMission').addEventListener('click', openMissions);
$('btnCamera').addEventListener('click', openCapture);

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
      S.login = { last: t, streak: nextStreak }; S.coins += LOGIN_REWARDS[pos]; save(); se('coin'); buzz(); coinFx(LOGIN_REWARDS[pos], root.querySelector('#loginClaim')); closeModal();
    };
  });
}

/* ---------- ミッション ---------- */
/* ---------- はじめてガイド・ホームの案内（v9.1） ---------- */
function guideHit(id) { if (!S.guide.hits.includes(id)) { S.guide.hits.push(id); save(); } }
function guideCount() {
  const g = S.guide; let got = 0, ready = false;
  for (const t of GUIDE.tasks) { if (g.got.includes(t.id)) got++; else if (t.check(S, g.hits)) ready = true; }
  if (got === GUIDE.tasks.length) ready = true;   // ボーナスが受けとれる
  return { got, ready };
}
function openGuide() {
  const draw = () => {
    const g = S.guide, all = g.got.length >= GUIDE.tasks.length;
    return `<h2 id="modalTitle">はじめてガイド</h2><p class="hint" style="margin:0 0 8px">1つクリアするごとに ${GUIDE.reward}コイン、ぜんぶで さらに ${GUIDE.bonus}コイン！</p><div class="list">${GUIDE.tasks.map(t => {
      const got = g.got.includes(t.id), ok = got || t.check(S, g.hits);
      return `<div class="card mission"><div class="grow"><div style="font-weight:900">${ok ? '✅ ' : ''}${esc(t.name)}</div><div class="hint">${esc(t.how)}　報酬 ${GUIDE.reward}コイン</div></div>
      ${got ? '<span class="hint" style="font-weight:900">受けとり済み</span>' : `<button class="btn small ${ok ? 'yellow' : 'white'}" data-g="${t.id}" ${ok ? '' : 'disabled'}>受けとる</button>`}</div>`;
    }).join('')}</div>
    <button class="btn block ${all ? 'yellow' : 'white'}" id="gBonus" style="margin-top:10px" ${all ? '' : 'disabled'}>ぜんぶクリアのボーナス ${GUIDE.bonus}コイン</button>
    <button class="btn block white" id="gTour" style="margin-top:8px">ホームの案内をもう一度見る</button>`;
  };
  openModal(draw(), root => {
    root.addEventListener('click', e => {
      if (e.target.closest('#gTour')) { closeModal(); setTab('home'); setTimeout(startTour, 300); return; }
      if (e.target.closest('#gBonus')) {
        if (S.guide.done || S.guide.got.length < GUIDE.tasks.length) return;
        S.guide.done = true; S.coins += GUIDE.bonus; save(); se('get'); buzz([60, 40, 60]); coinFx(GUIDE.bonus, e.target.closest('#gBonus')); closeModal(); toast('はじめてガイド ぜんぶクリア！'); return;
      }
      const b = e.target.closest('[data-g]'); if (!b) return;
      const t = GUIDE.tasks.find(x => x.id === b.dataset.g);
      if (!t || S.guide.got.includes(t.id) || !t.check(S, S.guide.hits)) return;
      S.guide.got.push(t.id); S.coins += GUIDE.reward; save(); se('coin'); buzz(); coinFx(GUIDE.reward, b); root.innerHTML = draw(); renderHome();
    });
  });
}
// ホームの案内：画面を暗くして、1か所ずつ照らす。右上の「スキップ」でいつでも終われる
let tourI = -1;
function startTour() {
  if (tourI >= 0 || S.cat.dead) return;
  if (!$('modal').hidden) closeModal();
  $('toast').hidden = true;   // 照らす所にかぶらないように
  if (UI.tab !== 'home') setTab('home');
  const el = document.createElement('div');
  el.id = 'tour'; el.className = 'tour'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'ホームの案内');
  el.innerHTML = `<div class="tour-hole"></div><button class="tour-skip" id="tourSkip">スキップ ✕</button>
    <div class="tour-box"><p class="tour-text" id="tourText" aria-live="polite"></p>
      <div class="tour-nav"><span class="tour-n" id="tourN"></span><button class="btn small white" id="tourBack">もどる</button><button class="btn small" id="tourNext">つぎへ</button></div></div>`;
  document.body.appendChild(el);
  el.querySelector('#tourSkip').onclick = () => endTour();
  el.querySelector('#tourBack').onclick = () => { if (tourI > 0) { se('tap'); tourShow(tourI - 1); } };
  el.querySelector('#tourNext').onclick = () => { se('tap'); if (tourI < TOUR.length - 1) tourShow(tourI + 1); else endTour(); };
  window.addEventListener('resize', tourPlace);
  el.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); endTour(); } });   // v10.2：Esc でも終われる
  tourShow(0);
  trapOpen(el, el.querySelector('#tourNext'));   // v10.2：うしろは inert・Tab は案内の中だけ・終わったら元の場所へ
}
function tourRect(sel) {
  let r = null;
  for (const q of sel) {
    const e = document.querySelector(q); if (!e) continue;
    const b = e.getBoundingClientRect(); if (!b.width) continue;
    r = r ? { left: Math.min(r.left, b.left), top: Math.min(r.top, b.top), right: Math.max(r.right, b.right), bottom: Math.max(r.bottom, b.bottom) } : { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
  }
  return r;
}
function tourShow(i) {
  tourI = i;
  const st = TOUR[i];
  $('tourText').textContent = st.text.replace(/\{cat\}/g, S.cat.name || '猫');
  $('tourN').textContent = `${i + 1} / ${TOUR.length}`;
  $('tourBack').hidden = i === 0;
  $('tourNext').textContent = i === TOUR.length - 1 ? 'はじめる！' : 'つぎへ';
  tourPlace();
}
function tourPlace() {
  const el = $('tour'); if (!el || tourI < 0) return;
  const hole = el.querySelector('.tour-hole'), box = el.querySelector('.tour-box'), skip = el.querySelector('.tour-skip');
  const r = tourRect(TOUR[tourI].sel), pad = 6, vh = window.innerHeight;
  skip.style.top = '';
  if (!r) { hole.style.cssText = 'left:50%;top:50%;width:0;height:0'; box.style.top = ''; box.style.bottom = '30%'; return; }
  hole.style.cssText = `left:${r.left - pad}px;top:${r.top - pad}px;width:${r.right - r.left + pad * 2}px;height:${r.bottom - r.top + pad * 2}px`;
  // 右上の「スキップ」が照らす所にかぶるときは、その下にずらす（説明はさらにその下）
  const sk = skip.getBoundingClientRect(), hit = r.left - pad < sk.right && r.right + pad > sk.left && r.top - pad < sk.bottom && r.bottom + pad > sk.top;
  let below = r.bottom + pad + 14;
  if (hit) { skip.style.top = (r.bottom + pad + 10) + 'px'; below += sk.height + 12; }
  // 照らした所が上半分なら、説明はその下。下半分なら、その上
  if ((r.top + r.bottom) / 2 < vh / 2) { box.style.top = Math.min(below, vh - 190) + 'px'; box.style.bottom = ''; }
  else { box.style.top = ''; box.style.bottom = Math.min(vh - r.top + pad + 14, vh - 190) + 'px'; }
}
function endTour() {
  const el = $('tour'); if (el) { el.remove(); trapClose(el); }
  window.removeEventListener('resize', tourPlace);
  const first = !S.guide.tour;
  tourI = -1; S.guide.tour = true; save(); renderHome();
  if (first) setTimeout(maybeShowDaily, 600);
}

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
      cl.push(m.id); S.coins += m.reward; save(); se('coin'); buzz(); coinFx(m.reward, b); root.innerHTML = draw(); renderHome();
    });
  });
}

/* ---------- 撮影（AIカロリー推定） ---------- */
let cap = null; // { thumb, ai }
function shrink(img, max, q) { const s = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', q); }
function readPhoto(file) { return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => { const img = new Image(); img.onload = () => res({ thumb: shrink(img, 240, 0.7), ai: shrink(img, 768, 0.7) }); img.onerror = rej; img.src = fr.result; }; fr.onerror = rej; fr.readAsDataURL(file); }); }

// AIの回数の上限（v9.2）に使う端末ID。このスマホのブラウザに1つ（バックアップには入れない）
function aiDevId() {
  const K = 'nyankalo-dev';
  try {
    let v = store.read(K);
    if (!/^[A-Za-z0-9-]{8,64}$/.test(v || '')) { v = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12)); store.write(K, v); }
    return v;
  } catch (e) { return ''; }
}
// opt.date：その日に記録する（v9.9：まだ締めていない きのう に足すとき）。opt.done：閉じたあとに呼ぶ（記録したら true）
function openCapture(opt = {}) {
  cap = null;
  const t = todayStr(), date = opt.date && opt.date !== t && canEditDay(opt.date) ? opt.date : t, past = date !== t;
  // きのうの分を足すときは、まだ記録のない朝・昼・夜から選んでおく
  const pd = S.days[date], slot = past ? (MAIN_SLOTS.find(k => !(pd && pd.meals.some(m => m.slot === k))) || 'snack') : mealSlotNow();
  const pdt = parseYmd(date);
  let saved = false;
  openModal(`<h2 id="modalTitle">ごはんを記録${past ? `（${pdt.getMonth() + 1}/${pdt.getDate()}）` : ''}</h2><div class="stack">
    ${past ? '<p class="hint past-note">きのうの分の記録です。カロリーと体型に入ります（スタミナなどのごほうびはありません）</p>' : ''}
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
      const d = day(date), now = new Date();
      const g = q => { const v = root.querySelector(q).value; return v === '' ? null : clamp(Math.round(+v) || 0, 0, 1000); };
      const meal = { id: Math.random().toString(36).slice(2, 9), slot: slotV, name, kcal, photo: cap ? cap.thumb : null, time: past ? 'あとから' : `${pad(now.getHours())}:${pad(now.getMinutes())}` };
      const pc = g('#capC'), pp = g('#capP'), pf = g('#capF');
      if (pc != null || pp != null || pf != null) Object.assign(meal, { carbs: pc || 0, protein: pp || 0, fat: pf || 0 });
      d.meals.push(meal);
      let msg = `${name}（${kcal} kcal）を記録`;
      if (past) { saved = true; save(); se('coin'); closeModal(); toast(msg + '（きのうの分）'); return; }   // v9.9：あとから足した分は ごほうびなし
      if (d.mealRewards < 5) { d.mealRewards++; addStamina(RULE.staminaPerMeal); addExp(RULE.expPerMeal); addMood(RULE.moodPerMeal); msg += `・スタミナ +${RULE.staminaPerMeal}`; }
      // 写真つきの記録：ミニゲームの報酬つきプレイ +1（1日 photoBonusMax 回まで）
      if (cap && (d.photoBonus || 0) < RULE.photoBonusMax) { d.photoBonus = (d.photoBonus || 0) + 1; msg += '・ミニゲーム +1回'; }
      save(); se('get'); buzz(40); setTimeout(() => { if (homeCat) homeCat.react('head'); }, 400);
      saved = true; closeModal(); toast(msg); setTimeout(checkCrisis, 2800);
    };
  }, () => { cap = null; $('photoInput').value = ''; if (opt.done) setTimeout(() => opt.done(saved), 0); });
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
  const send = () => fetch(AI_ENDPOINT + '?d=' + aiDevId(), { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: cap.ai.split(',')[1], signal: ctrl.signal });
  try {
    let r;
    try { r = await send(); if (r.status === 503 || r.status === 504) throw new TypeError('retry'); }
    catch (e) { if (e.name === 'AbortError') throw e; st.textContent = 'もう一度送っています'; r = await send(); }
    const d = await r.json().catch(() => null);
    if (!r.ok || !d) {
      if (r.status === 429) throw new Error(d && d.error ? d.error : 'AIの利用回数の上限です。少し待つか、手で入力してください');
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
    box.hidden = false; st.textContent = `入力しました（${Math.round((Date.now() - t0) / 1000)}秒）。違っていたら直してね${typeof d.left === 'number' ? `　今日のAIあと${d.left}回` : ''}`; se('coin');
  } catch (err) {
    st.textContent = err.name === 'AbortError' ? '時間がかかりすぎたので中止しました。もう一度押すか、手で入力してください' : (err instanceof TypeError ? '通信できませんでした。ネットを確認してください' : err.message);
  } finally { clearTimeout(to); clearInterval(timer); aiBusy = false; btn.textContent = 'AIでカロリーを調べる'; btn.disabled = !cap; }
}
