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
      <div class="gym-cards">${TRAININGS.map(t => { const ok = S.stamina >= t.cost && !S.cat.hospital; return `<div class="gym-card2" id="gc-${t.id}"><span class="gc-ico">${I[{ bag: 'sandbag', tread: 'tread', weight: 'barbell' }[t.id]]}</span>
        <div class="gc-body"><b class="gc-name">${esc(t.name)}</b><span class="gc-meta"><span class="gc-cost">スタミナ −${t.cost}</span><span class="gc-label">${esc(t.label)}</span></span></div>
        <button class="btn small red gc-start" data-train="${t.id}" aria-label="${esc(t.name)}をはじめる（スタミナ −${t.cost}）" ${ok ? '' : 'disabled'}>START</button></div>`; }).join('')}</div>
      <button type="button" class="scene gym-scene b-entry b-open" data-battle="1" ${S.cat.hospital ? 'disabled' : ''} aria-label="猫バトル（対戦）へ"><img src="gym-bg.webp" alt="" width="900" height="718"><span class="gs-txt">⚔️ 猫バトル（対戦）へ<small>順位の近い猫と たたかう（勝つと +${BATTLE.winCoin}コイン）</small></span><span class="vs-badge" aria-hidden="true">›</span></button>
      <div class="section-title">もちもの</div>
      <div class="list">${SHOP_ITEMS.filter(it => it.shop !== false || (S.items[it.id] || 0) > 0).map(it => `<div class="card row"><span style="width:40px;height:40px;flex:none">${I[it.id]}</span><div class="grow"><div class="name">${esc(it.name)} ×${S.items[it.id] || 0}</div><div class="hint">${esc(it.desc)}</div></div><button class="btn small yellow" data-use="${it.id}" ${(S.items[it.id] || 0) > 0 ? '' : 'disabled'}>使う</button></div>`).join('')}</div>
      <p class="hint" style="margin-top:10px">スタミナは、ごはんを記録したり歩いたりすると回復します。</p>`;
  } else {
    $('trainBody').innerHTML = `${heartCardHTML()}
      <button type="button" class="card medal-sum" id="medalOpen"><span>🏅 メダル <b class="num">${medalCount()}</b> / ${medalTotal()}</span><small>とると ダイヤ　じょうけんを見る ›</small></button>
      ${evMiniCard()}<div class="list">
        <div class="card gym-card"><div class="ico" style="background:#FFE0EA;font-weight:900;font-size:30px;color:#C2335E">?</div><div><div style="font-weight:900">どっちが高い？</div><div class="hint">カロリーが高いほうを選ぶクイズ（5問）</div>${medalRowHTML('quiz')}</div><button class="btn small" data-mini="quiz">あそぶ</button></div>
        <div class="card gym-card"><div class="ico">${I.sandbag}</div><div><div style="font-weight:900">サンドバッグ連打</div><div class="hint">10秒でできるだけタップ！</div>${medalRowHTML('tap')}</div><button class="btn small" data-mini="tap">あそぶ</button></div>
        <div class="card gym-card"><div class="ico" style="background:#E3F4E5;font-size:30px">🐱</div><div><div style="font-weight:900">お題の猫を探せ！</div><div class="hint">30秒でお題の猫をたくさんタップ！（最大${RULE.miniRewardMax}コイン）</div>${medalRowHTML('sagase')}</div><button class="btn small" data-mini="sagase">あそぶ</button></div>
        <div class="card gym-card"><div class="ico" style="background:#F6E7C4;font-size:30px">🏃</div><div><div style="font-weight:900">にゃんこダッシュ</div><div class="hint">ベンチや茂みをよけてコインを集めよう（最大${RULE.miniRewardMax}コイン）</div>${medalRowHTML('dash')}</div><button class="btn small" data-mini="dash">あそぶ</button></div>
        <div class="card gym-card"><div class="ico" style="background:#DDEBFF;font-size:30px">⚾</div><div><div style="font-weight:900">にゃんこバッティング</div><div class="hint">犬のピッチャーの10球を打ちかえせ！（最大${RULE.miniRewardMax}コイン）</div>${medalRowHTML('baseball')}</div><button class="btn small" data-mini="baseball">あそぶ</button></div>
        <div class="card gym-card"><div class="ico" style="background:#EBDDFF;font-size:30px">🎰</div><div><div style="font-weight:900">にゃんこスロット</div><div class="hint">アプリのコインをかけて目押し！（1回まわすと ♥1・BET ${RULE.slotBets.join('/')}）</div>${medalRowHTML('slot')}</div><button class="btn small" data-mini="slot">あそぶ</button></div>
      </div><p class="hint" style="margin-top:10px">ミニゲームはスタミナを使いません（♥を使います）。カロリーは一般的な目安です。</p>`;
    heartTick();
  }
}
$('trainSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; UI.trainTab = b.dataset.v; se('tap'); renderTrain(); bgmUpdate(); });
$('trainBody').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-battle]') && !e.target.closest('button')) { e.preventDefault(); openBattleLobby(); } });   // v10.5：対戦は button になったので、button は ふつうの クリックで ひらく
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
  else if (t.dataset.evgame) openEvGame(t.dataset.evgame);   // v10.4
  else if (t.dataset.evhub !== undefined) openEventHub();
  else if (t.id === 'medalOpen') { se('tap'); openMedals(); }
});
// v10.4：ミニゲームの いちばん上に イベントのゲーム（コインの回数は ほかのミニゲームと べつ）
function evMiniCard() {
  const e = typeof eventNow === 'function' ? eventNow() : null; if (!e) return '';
  return `<div class="card gym-card ev-mini" style="--c:${e.color};--c2:${e.color2}"><div class="ico"><img src="${evFile(e, 'bag.webp')}" alt="" width="48" height="48"></div>
    <div><div style="font-weight:900"><span class="ev-tag">${e.icon} ${esc(e.name)}イベント</span>${esc(e.game)}</div><div class="hint">${esc(e.gameDesc)}（1回 最大${EV_GAME.max}コイン）</div>${medalRowHTML(e.id)}
    ${EVENT_MODE === 'all' ? '<button type="button" class="link-btn" data-evhub>ほかのイベントを えらぶ ›</button>' : ''}</div><button class="btn small" data-evgame="${e.id}">あそぶ</button></div>`;
}
function doTraining(t) {
  if (S.cat.hospital) { toast('入院中はトレーニングできません（ミニゲームはできます）'); return; }
  if (S.stamina < t.cost) { toast('スタミナが足りません。ごはんを記録するか歩こう'); se('bad'); return; }
  S.stamina -= t.cost;
  const gold = (S.goldbag || 0) > 0;
  const mult = (S.protein ? 1.5 : 1) * (gold ? 2 : 1), g = Math.round(rand(t.gain[0], t.gain[1]) * mult);
  S.cat.stats[t.stat] += g; S.protein = false; if (gold) S.goldbag--;
  S.coins += t.coin; day().trains++; tallyAdd('trains'); addExp(t.exp); addMood(RULE.moodPerTrain); save();
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
// v10.6 ♥：ミニゲームの上の カード（♥・つぎの♥まで・写真の +1）。heartTick が 1秒ごとに 時間を なおす
function heartCardHTML() {
  const d = day(), pb = Math.min(RULE.photoBonusMax, d.photoBonus || 0), nx = heartNext();
  return `<div class="card heart-card"><div class="hc-top">${heartsHTML('lg')}<span class="hc-next" id="heartNext">${nx == null ? 'いっぱい' : `つぎの♥まで <b class="num">${heartTimeText(nx)}</b>`}</span></div>
    <div class="hint">コインを もらうと ♥1。${RULE.heartMin}分で ♥1 もどる・写真つきで ごはんを記録すると ♥+1（今日 ${pb}/${RULE.photoBonusMax}）。♥が なくても 練習できます</div></div>`;
}
let heartTimer = 0;
function heartTick() {
  clearInterval(heartTimer);
  heartTimer = setInterval(() => {
    const el = $('heartNext'); if (!el) { clearInterval(heartTimer); return; }
    const before = S.heart.n, nx = heartNext();
    if (S.heart.n !== before) { save(); renderTrain(); return; }
    el.innerHTML = nx == null ? 'いっぱい' : `つぎの♥まで <b class="num">${heartTimeText(nx)}</b>`;
  }, 1000);
}
// コインを わたす（♥を1つ使う）。♥がなければ わたさない。わたした数を返す
function heartPay(coins) {
  coins = Math.max(0, Math.round(coins || 0)); if (!coins || !heartUse()) return 0;
  const d = day(); d.miniRewards = (d.miniRewards || 0) + 1; S.coins += coins; return coins;
}
const noHeartMsg = '♥が ないので 練習（コインなし）';
// 中で あそぶ ミニゲーム（クイズ・連打）の けっか
function miniReward(coins) {
  const d = day(); bumpMini(d);   // v10.3：ずっとの回数も（d.minis++ はみんな bumpMini に）
  if (!(coins > 0)) return 'コインなし';
  const g = heartPay(Math.min(coins, RULE.miniRewardMax));
  if (!g) return noHeartMsg;
  se('coin'); coinFx(g); return `コイン +${g}（♥のこり ${hearts()}）`;
}
// v10.6：メダル用の記録（S.miniRec）。クイズ＝いちばんの正解数・ぜんぶ正解の回数、連打＝いちばんの回数
function miniRecBump(k, f) { S.miniRec = S.miniRec || {}; const r = S.miniRec[k] = Object.assign({}, S.miniRec[k]); f(r); medalScan(); }
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
let slotPend = 0;   // v10.6：いま まわしている スロットの BET（あたりは 1回だけ・BET×10 まで）
window.nyankaloMini = {
  // 共通
  // v10.6：left＝♥の数（前は きょうの のこり回数）。heartMax・next（つぎの♥まで ms。いっぱいなら null）
  info: () => ({ coins: S.coins, left: hearts(), hearts: hearts(), heartMax: RULE.heartMax, next: heartNext(), max: RULE.miniRewardMax, sound: S.settings.sound, vibrate: S.settings.vibrate, cat: miniCatInfo() }),
  // 1回ぶんの コイン：上限 miniRewardMax まで。♥を1つ使う（♥がなければ 0）
  reward: n => {
    n = Math.max(0, Math.round(n || 0));
    const d = day(); bumpMini(d);
    if (n <= 0) { save(); return { ok: false, given: 0, msg: '' }; }
    const g = heartPay(Math.min(n, RULE.miniRewardMax)); save();
    if (!g) return { ok: false, given: 0, msg: noHeartMsg };
    return { ok: true, given: g, msg: `アプリに +${g}コイン${g < n ? `（1回の上限 ${RULE.miniRewardMax}）` : ''}　♥のこり ${hearts()}` };
  },
  played: () => { bumpMini(day()); save(); },
  // 記録（ゲームごと）。v10.6：記録が かわったら メダルを しらべる
  getRec: k => (S.miniRec || {})[k] || null,
  setRec: (k, v) => { S.miniRec = S.miniRec || {}; S.miniRec[k] = v; save(); medalScan(); },
  // スロット（v10.6）：1回まわすと ♥1。1日の上限は なし。♥がなければ 練習（コインは うごかない）
  slotInfo: () => ({ coins: S.coins, hearts: hearts(), heartMax: RULE.heartMax, next: heartNext(), bets: RULE.slotBets, slip: RULE.slotSlip }),
  slotBet: n => {
    const d = day(); n = Math.round(n || 0);
    if (!RULE.slotBets.includes(n)) return { ok: false, coins: S.coins, hearts: hearts() };
    if (hearts() <= 0) { if (!d.slotPlayed) { d.slotPlayed = true; bumpMini(d); } save(); return { ok: true, practice: true, coins: S.coins, hearts: 0 }; }
    if (S.coins < n) return { ok: false, coins: S.coins, hearts: hearts() };
    if (!d.slotPlayed) { d.slotPlayed = true; bumpMini(d); }
    heartUse(); S.coins -= n; slotPend = n; save(); return { ok: true, coins: S.coins, hearts: hearts() };
  },
  // あたり：n＝もらうコイン、bet・sym（そろった絵柄）は メダル用。練習のときは よばない
  slotWin: (n, bet, sym) => {
    const bet0 = slotPend; slotPend = 0; if (!bet0) return { given: 0, coins: S.coins };   // BET した1回に 1つだけ
    n = Math.max(0, Math.min(Math.round(n || 0), bet0 * 10)); bet = bet0; S.coins += n;
    miniRecBump('slot', r => { r.win = (r.win || 0) + 1; if (sym === '🐈') { r.cat = (r.cat || 0) + 1; if (bet >= 100) r.cat100 = (r.cat100 || 0) + 1; } });
    save(); return { given: n, coins: S.coins };
  },
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
  w.remove(); document.body.classList.remove('mini-open'); renderAll(); setTimeout(levelUpTry, 400); medalToastNow();   // v10.6：ゲームの中で とった メダル
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
        const msg = miniReward(ok * 6); miniRecBump('quiz', r => { r.best = Math.max(r.best || 0, ok); if (ok === 5) r.perfect = (r.perfect || 0) + 1; }); save();
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
            const msg = miniReward(Math.min(40, Math.floor(n / 4))); miniRecBump('tap', r => { r.best = Math.max(r.best || 0, n); }); save();
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
