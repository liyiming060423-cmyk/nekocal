// にゃんカロ あそぶ（トレーニング・ミニゲーム）
// ジム・ミニゲームの一覧と、組員作ミニゲームとのつなぎ（window.nyankaloMini）・クイズ・連打（v10.1：更衣室は neko.js へ）
// （v10.0 で app.js から分けた。読みこむ順番は index.html。ほかのファイルの関数・変数はそのまま使える）
'use strict';

/* =========================================================
   9. トレーニング＆ミニゲーム
   ========================================================= */
function renderTrain() {
  $('trainBalance').innerHTML = `<span class="pill" style="padding-left:10px">スタミナ <b class="num">${S.stamina}%</b></span>${balanceHTML()}`;
  if (UI.trainTab !== 'mini') UI.trainTab = 'gym';   // v10.1：更衣室は「ねこ」タブへ
  $('trainSeg').querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', b.dataset.v === UI.trainTab));
  const d = day();
  if (UI.trainTab === 'gym') {
    $('trainBody').innerHTML = `${S.cat.hospital ? '<p class="boost hosp-note">🏥 入院中は トレーニングと対戦はお休み（ミニゲーム・きせかえはできます）</p>' : ''}${S.protein ? '<p class="boost">プロテイン効果中：次のトレーニングが1.5倍</p>' : ''}${S.goldbag > 0 ? `<p class="boost">金のサンドバッグ効果中：あと${S.goldbag}回 2倍</p>` : ''}
      <div class="gym-cards">${TRAININGS.map(t => { const ok = S.stamina >= t.cost && !S.cat.hospital; return `<div class="gym-card2" id="gc-${t.id}"><div class="gc-head">${{ bag: 'サンドバッグ<br>連打', tread: 'トレッドミル', weight: 'ウェイト<br>トレーニング' }[t.id] || esc(t.name)}</div>
        <div class="gc-body"><span class="gc-ico">${I[{ bag: 'sandbag', tread: 'tread', weight: 'barbell' }[t.id]]}</span><span class="gc-cost">スタミナ −${t.cost}</span><span class="gc-label">${esc(t.label)}</span>
        <button class="btn small red gc-start" data-train="${t.id}" ${ok ? '' : 'disabled'}>START</button></div></div>`; }).join('')}</div>
      <div class="scene gym-scene b-entry" data-battle="1" role="button" tabindex="0" aria-label="猫バトル（対戦）をひらく"><img src="gym-bg.webp" alt="ジムで猫たちがトレーニングしている絵" width="900" height="718"><span class="vs-badge">⚔️ 対戦</span></div>
      <button class="btn red block b-open" data-battle="1" ${S.cat.hospital ? 'disabled' : ''}>⚔️ 猫バトル（対戦）へ</button>
      <div class="section-title">もちもの</div>
      <div class="list">${SHOP_ITEMS.filter(it => it.shop !== false || (S.items[it.id] || 0) > 0).map(it => `<div class="card row"><span style="width:40px;height:40px;flex:none">${I[it.id]}</span><div class="grow"><div class="name">${esc(it.name)} ×${S.items[it.id] || 0}</div><div class="hint">${esc(it.desc)}</div></div><button class="btn small yellow" data-use="${it.id}" ${(S.items[it.id] || 0) > 0 ? '' : 'disabled'}>使う</button></div>`).join('')}</div>
      <p class="hint" style="margin-top:10px">スタミナは、ごはんを記録したり歩いたりすると回復します。</p>`;
  } else {
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
  }
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
});
function doTraining(t) {
  if (S.cat.hospital) { toast('入院中はトレーニングできません（ミニゲームはできます）'); return; }
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
    if (t.coin) coinFx(t.coin, card);
  }
}
// 今日の報酬つきプレイの回数（写真つきの記録で最大+3）
const miniLimit = () => RULE.miniPlaysPerDay + Math.min(RULE.photoBonusMax, day().photoBonus || 0);
const miniLeft = () => Math.max(0, miniLimit() - day().miniRewards);
function miniReward(coins) {
  const d = day(); d.minis++;
  if (d.miniRewards >= miniLimit()) return '今日の報酬はもう受けとりました';
  d.miniRewards++; S.coins += coins; se('coin'); coinFx(coins); return `コイン +${coins}`;
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
  w.remove(); document.body.classList.remove('mini-open'); renderAll(); setTimeout(levelUpTry, 400);
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
