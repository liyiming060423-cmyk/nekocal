// にゃんカロ ごほうびの演出（v10.1）
// コインが飛んで残高に入る（coinFx）・残高の数字が動く（coinSync）・レベルアップ画面（levelUpQueue / levelUpTry）・福袋をあける演出（gachaOpen）
// 「動きをへらす」設定（OS の視差効果を減らす）の人には、動きなしで数字だけ変える
// （読みこむ順番は index.html：sound.js のあと。ほかのファイルの関数・変数はそのまま使える）
'use strict';

const FX = { shown: null, res: 0, raf: 0, lv: null };
// FX.shown＝画面に出しているコインの数　FX.res＝飛んでいる途中のコイン（まだ残高に足して見せない分）　FX.lv＝待っているレベルアップ
const fxCalm = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

/* ---------- 残高の数字 ---------- */
// 画面に出すコインの数（飛んでいる途中のコインは、着いてから足す）
const coinGoal = () => Math.max(0, S.coins - FX.res);
function coinText() { if (FX.shown == null) FX.shown = coinGoal(); return fmt(FX.shown); }
function coinPaint(v) { FX.shown = v; document.querySelectorAll('.coin-num').forEach(e => { e.textContent = fmt(v); }); }
// 本当の残高まで数字を動かす（ふえるときも へるときも）。対戦・さんぽ・組員のミニゲームから もどったときも これで動く
function coinSync() {
  const to = coinGoal();
  if (FX.shown == null) { coinPaint(to); return; }
  if (FX.shown === to) return;
  cancelAnimationFrame(FX.raf);
  if (fxCalm() || document.hidden) { coinPaint(to); return; }
  const from = FX.shown, t0 = performance.now(), dur = Math.min(900, 350 + Math.abs(to - from) * 2);
  const step = now => {
    const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    coinPaint(Math.round(from + (to - from) * e));
    if (k < 1) FX.raf = requestAnimationFrame(step);
  };
  FX.raf = requestAnimationFrame(step);
  document.querySelectorAll('.coin-num').forEach(e => { const p = e.closest('.coin-chip, .coin-target'); if (p) { p.classList.remove(to > from ? 'coin-down' : 'coin-up'); p.classList.add(to > from ? 'coin-up' : 'coin-down'); setTimeout(() => p.classList.remove('coin-up', 'coin-down'), 700); } });
}

/* ---------- コインが飛ぶ ---------- */
// いま見えている残高（ホームの上・ショップ・あそぶ）
function coinTarget() {
  for (const q of ['#pillCoins', '#shopBalance .coin-target', '#trainBalance .coin-target']) {
    const e = document.querySelector(q);
    if (e && e.offsetParent !== null) { const r = e.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight) return e; }
  }
  return null;
}
const rectMid = el => { const r = el && el.getBoundingClientRect && el.getBoundingClientRect(); return r && r.width ? [r.left + r.width / 2, r.top + r.height / 2] : [innerWidth / 2, innerHeight / 2]; };
// n コインを from（ボタンなど）から残高へ飛ばす。コインは呼ぶ前に S.coins に足しておく（保存もすませておく）
function coinFx(n, from) {
  n = Math.round(n || 0); if (n <= 0) return;
  FX.res += n;
  coinFly(n, from, () => { FX.res = Math.max(0, FX.res - n); coinSync(); });
}
// 飛ぶところだけ（done は かならず1回よばれる）
function coinFly(n, from, done) {
  const [x0, y0] = rectMid(from), tg = coinTarget();
  // 「+50」の文字（その場でふわっと上がる）
  const lb = document.createElement('span');
  lb.className = 'coin-plus'; lb.innerHTML = `${I.coin.replace('width="24" height="24"', 'width="22" height="22"')}+${fmt(n)}`;
  lb.style.left = x0 + 'px'; lb.style.top = y0 + 'px';
  document.body.appendChild(lb); setTimeout(() => lb.remove(), 1300);
  if (fxCalm() || !tg || typeof Element.prototype.animate !== 'function') {
    if (!tg) toast(`コイン +${fmt(n)}`);
    setTimeout(done, fxCalm() ? 0 : 500); return;
  }
  const [x1, y1] = rectMid(tg), k = clamp(Math.round(n / 15), 3, 8), box = document.createElement('div');
  box.className = 'coin-fly'; document.body.appendChild(box);
  let last = 0;
  for (let i = 0; i < k; i++) {
    const c = document.createElement('span'); c.innerHTML = I.coin; box.appendChild(c);
    c.style.left = x0 + 'px'; c.style.top = y0 + 'px';
    const sx = (Math.random() - .5) * 90, sy = -20 - Math.random() * 50, d = 620 + i * 55, delay = i * 40;
    last = Math.max(last, d + delay);
    c.animate([
      { transform: 'translate(-50%,-50%) scale(.5)', opacity: 0 },
      { transform: `translate(calc(-50% + ${sx}px), calc(-50% + ${sy}px)) scale(1.05)`, opacity: 1, offset: .3 },
      { transform: `translate(calc(-50% + ${x1 - x0}px), calc(-50% + ${y1 - y0}px)) scale(.6)`, opacity: .9 }
    ], { duration: d, delay, easing: 'cubic-bezier(.45,0,.7,.2)', fill: 'both' });
  }
  setTimeout(() => {
    box.remove();
    tg.classList.remove('coin-hit'); void tg.offsetWidth; tg.classList.add('coin-hit');
    setTimeout(() => tg.classList.remove('coin-hit'), 400);
    se('coin'); done();
  }, last);
}

/* ---------- 紙ふぶき（SR・レベルの節目） ---------- */
function confettiHTML() {
  const cols = ['#E0573F', '#F7C64B', '#4FAE5B', '#4C8FD6', '#E8577A', '#FFFFFF'];
  return `<div class="confetti" aria-hidden="true">${Array.from({ length: 22 }, (_, i) => `<i style="left:${(i * 37 % 100)}%;background:${cols[i % cols.length]};animation-delay:${(i % 7) * .09}s;animation-duration:${1.4 + (i % 5) * .18}s;--r:${(i % 2 ? 1 : -1) * (180 + i * 23)}deg"></i>`).join('')}</div>`;
}

/* ---------- レベルアップ ---------- */
// rules.js の addExp から呼ばれる。いくつ上がっても1枚にまとめる。コインはもう S.coins に入っている
function levelUpQueue(from, to, coins) {
  if (FX.lv) { FX.lv.to = to; FX.lv.coins += coins; } else FX.lv = { from, to, coins };
  FX.res += coins;   // 画面を出すまで残高には見せない（画面で飛ばす）
  setTimeout(levelUpTry, 700);
}
// 出せるとき（ほかの画面が出ていない）だけ出す。出したら true。モーダルを閉じたとき・毎日の流れ（daily.js）からも呼ぶ
function levelUpTry() {
  if (!S.onboarded || typeof screenFree !== 'function' || !screenFree()) return false;
  const lv = FX.lv, ev = LEVEL_UP.every;
  const behind = (Math.floor((S.lvRw || 0) / ev) + 1) * ev <= S.cat.level;   // まだ受けとっていない節目がある（前の版から遊んでいる人など）
  if (!lv && !behind) return false;
  FX.lv = null;
  const got = claimLevelRewards(); save();
  const rwCoins = got.reduce((a, r) => a + r.coins, 0), coins = (lv ? lv.coins : 0) + rwCoins;
  FX.res += rwCoins;
  const nx = nextMilestone(S.cat.level);
  const head = lv ? `<div class="lv-nums"><span>Lv.<b class="num">${lv.from}</b></span><span class="lv-arrow" aria-hidden="true">→</span><span class="lv-new">Lv.<b class="num">${lv.to}</b></span></div>`
    : `<p style="margin:0;text-align:center;font-weight:900">${esc(S.cat.name)}は いま Lv.${S.cat.level}！<br>これまでの レベルの ごほうびを わたすにゃ</p>`;
  const rws = got.map(r => `<div class="card lv-rw"><span class="lv-rw-lv">Lv.${r.lv}</span><span>${esc(r.text)}</span></div>`).join('')
    + (got.some(r => /×/.test(r.text)) ? '<p class="hint" style="margin:-4px 0 0;text-align:center">アイテムは「あそぶ」→ ジム の「もちもの」に入りました</p>' : '');
  openModal(`<h2 id="modalTitle">${lv ? 'レベルアップ！' : 'レベルのごほうび'}</h2><div class="stack lv-up">
    ${got.length ? confettiHTML() : ''}
    <div class="lv-cat">${petCatHTML({ breed: S.cat.breed, idx: S.cat.idx, equip: S.cat.equip, mood: 'normal' })}</div>
    ${head}
    <div class="lv-title-big">🎖 ${esc(levelTitle(S.cat.level))}</div>
    ${lv && lv.coins ? `<div class="card lv-coin">レベルアップ　コイン +${fmt(lv.coins)}</div>` : ''}
    ${rws}
    <p class="hint" style="margin:0;text-align:center">つぎのごほうび：Lv.${nx}（あと${nx - S.cat.level}レベル）　${esc(levelRewardText(nx))}</p>
    <button class="btn block" id="lvGo">やったね！</button></div>`, root => {
    se('get'); buzz([40, 30, 80]); setTimeout(() => petSound('meow'), 250);
    root.querySelector('#lvGo').onclick = closeModal;
    const from = root.querySelector('.lv-coin') || root.querySelector('.lv-rw') || root.querySelector('.lv-nums');
    if (coins > 0) setTimeout(() => coinFly(coins, from, () => { FX.res = Math.max(0, FX.res - coins); coinSync(); }), 500);
  }, () => setTimeout(maybeShowDaily, 300));
  return true;
}

/* ---------- 福袋をあける ---------- */
// 福袋がゆれる → レア度の色に光る → show(root) で結果を出す。タップで とばせる。
// 結果はもう保存してあるので、途中で閉じても なくならない（閉じたら label をトーストで知らせる）
function gachaOpen(rar, show, label) {
  let done = false;
  const reveal = root => { if (done) return; done = true; clearTimeout(t1); clearTimeout(t2); show(root); };
  if (fxCalm()) { openModal('', root => reveal(root)); return; }
  let t1 = 0, t2 = 0;
  openModal(`<h2 id="modalTitle">福袋をあけるよ…</h2><div class="g-open ${rar}" role="button" tabindex="0" aria-label="タップで とばす">
      <span class="g-rays"></span><div class="g-bag">${I.luckyBag}</div><p class="hint">タップで とばす</p></div>`, root => {
    const box = root.querySelector('.g-open');
    t1 = setTimeout(() => box.classList.add('lit'), 650);
    t2 = setTimeout(() => reveal(root), 1150);
    box.addEventListener('click', () => reveal(root));
    box.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); reveal(root); } });
  }, () => { if (!done) { done = true; clearTimeout(t1); clearTimeout(t2); if (label) toast(`${label} が出たよ`); } });
}
