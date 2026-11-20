// にゃんカロ イベントのミニゲーム（v10.4）共通の しくみ
// v10.4.1：目標の記録（ゲームの rec(stats)・data.js の EVENTS[].rec）・むずかしさ（EVENTS[].modes）・時間を足す（addTime）
// evgame.html?e=イベントのid で開く。ゲームの中身は evg-{id}.js（EG.register で登録）
//   はじめの画面 → 3・2・1 → あそぶ → けっか（点・いちばん・コイン・猫のひとこと・もう1回）
//   コイン・いちばんの点・はじめてクリアは アプリ（event.js の nyankaloMini.evInfo / evResult）が きめて保存する
// ゲームから使えるもの（g）：W・H（画面の大きさ）、add(点, x, y)・combo(n)・end()・burst()・pop()・se()・buzz()・cat()・hud()・reduced・time・mode（むずかしさ）・addTime(秒)
//   x・y は 画面の 位置（カメラで うごく ゲームは カメラの分を ひいてから わたす）
'use strict';
const EG = (() => {
  const ID = new URLSearchParams(location.search).get('e') || 'school';
  const FAST = /[?&]fast=1/.test(location.search);   // 自動テスト用：3秒で おわる
  const gameTime = () => FAST ? 3 : def.time || 0;
  const APP = (() => { try { return window.parent !== window && window.parent.nyankaloMini ? window.parent.nyankaloMini : null; } catch (e) { return null; } })();
  // アプリの外で開いたとき（確認用）
  const EVD = EVENTS.find(e => e.id === ID) || EVENTS[0];   // data.js の イベント（rec・modes）
  const MODES = EVD.modes || null;
  const mock = { coins: 1000, plays: 3, best: {}, rec: {}, cleared: false, mode: '' };
  const info = m => APP ? APP.evInfo(ID, m) : (() => { const mm = m || mock.mode || (MODES ? MODES[0].id : ''); return { ev: EVD, coins: mock.coins, plays: mock.plays, perMax: EV_GAME.max, clearBonus: EV_GAME.clear, cleared: mock.cleared, best: mock.best[mm] || 0, rec: mock.rec[mm] || 0, mode: mm, sound: true, vibrate: true, bgm: true, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, cat: { breed: 'tabby' } }; })();
  // 「14かい ジャンプ（目標 20）」
  const recText = (n, goal = true) => { const r = EVD.rec || { unit: '', goal: 0 }; return `${n ? fmt(n) + r.unit : '—'}${goal && r.goal ? `（目標 ${r.goal}）` : ''}`; };
  const modeOf = m => MODES ? (MODES.find(x => x.id === m) || MODES[0]) : null;
  const games = {};
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Number(n || 0).toLocaleString('ja-JP');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  let inf, ev, def, cv, ctx, W = 0, H = 0, dpr = 1;
  let mode = '', state = 'menu', score = 0, comboN = 0, timeLeft = 0, raf = 0, lastT = 0, stats = {}, playT = 0;
  const parts = [], pops = [];

  /* ---------- 音（Web Audio で その場で つくる。BGM は イベントの曲） ---------- */
  let actx = null, bgm = null, bgmGain = null, muted = false;
  function audioInit() {
    if (actx) return;
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
  }
  const SE = {
    get: [[880, .07, 'triangle'], [1320, .09, 'triangle']], coin: [[1200, .05, 'square'], [1800, .08, 'square']],
    bad: [[220, .16, 'sawtooth'], [150, .2, 'sawtooth']], jump: [[440, .06, 'triangle'], [700, .1, 'triangle']],
    splash: [[300, .08, 'sine'], [180, .2, 'sine']], pop: [[660, .05, 'sine']], tick: [[1000, .03, 'square']],
    clear: [[784, .1, 'triangle'], [988, .1, 'triangle'], [1318, .18, 'triangle']], tap: [[520, .04, 'triangle']], go: [[523, .08, 'square'], [1046, .14, 'square']]
  };
  function se(k) {
    if (muted || !inf.sound || !actx || !SE[k]) return;
    let t = actx.currentTime;
    for (const [f, d, type] of SE[k]) {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.18, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + d + .02); t += d * .8;
    }
  }
  function bgmPlay(on) {
    if (!inf.bgm || muted) on = false;
    if (on && !bgm) {
      bgm = new Audio(`ev-${ID}-bgm.mp3`); bgm.loop = true; bgm.setAttribute('playsinline', '');
      try { if (actx) { const src = actx.createMediaElementSource(bgm); bgmGain = actx.createGain(); bgmGain.gain.value = .32; src.connect(bgmGain); bgmGain.connect(actx.destination); } else bgm.volume = .32; } catch (e) { bgm.volume = .32; }
    }
    if (!bgm) return;
    if (on) { if (actx && actx.state === 'suspended') actx.resume().catch(() => {}); const p = bgm.play(); if (p && p.catch) p.catch(() => {}); } else bgm.pause();
  }
  const buzz = p => { if (inf.vibrate && navigator.vibrate) try { navigator.vibrate(p); } catch (e) {} };

  /* ---------- 猫（にゃんカロの猫を、いま着ている きせかえで） ---------- */
  function catEquip() {
    const c = inf.cat || {};
    return { head: c.head || 'band_none', top: c.top || 'tee_orange', hand: c.hand || 'gloves_brown', suit: c.suit || 'suit_none' };
  }
  const catHTML = () => petCatHTML({ breed: (inf.cat || {}).breed || 'tabby', idx: 0, equip: catEquip() });
  // ゲームの中を動く猫：set(x, 足もとのy, はば, { flip, rot, sx, sy })
  function catSprite() {
    const el = document.createElement('div'); el.className = 'eg-cat'; el.innerHTML = catHTML();
    $('egSprites').appendChild(el);
    return {
      el,
      set(x, y, w, o = {}) {
        const h = w * 813 / 600;
        el.style.width = w + 'px';
        el.style.transform = `translate(${(x - w / 2).toFixed(1)}px, ${(y - h).toFixed(1)}px)${o.rot ? ` rotate(${o.rot}deg)` : ''} scale(${(o.flip ? -1 : 1) * (o.sx || 1)}, ${o.sy || 1})`;
      },
      show(v) { el.hidden = !v; },
      remove() { el.remove(); }
    };
  }

  /* ---------- 点・コンボ・つぶ・文字 ---------- */
  function add(n, x, y, col) {
    score = Math.max(0, score + Math.round(n)); $('egScore').textContent = fmt(score);
    if (x !== undefined && n) pop((n > 0 ? '+' : '') + Math.round(n), x, y, col || (n > 0 ? '#FFE07A' : '#FF8A7A'));
  }
  function combo(n) {
    comboN = n; const el = $('egCombo');
    el.textContent = n >= 2 ? `${n} コンボ！` : '';
    if (n >= 2 && !inf.reduced) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  }
  function burst(x, y, col, n = 10, sp = 160) {
    if (inf.reduced) n = Math.min(n, 4);
    for (let i = 0; i < n; i++) { const a = rnd(0, Math.PI * 2), v = rnd(sp * .4, sp); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: rnd(.4, .8), t: 0, col, r: rnd(2.5, 5.5) }); }
  }
  function pop(text, x, y, col = '#FFFFFF', size = 22) { pops.push({ text, x, y, col, t: 0, size }); }
  function drawFx(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.t += dt; if (p.t > p.life) { parts.splice(i, 1); continue; }
      p.vy += 380 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      ctx.globalAlpha = 1 - p.t / p.life; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i]; p.t += dt; if (p.t > .9) { pops.splice(i, 1); continue; }
      const y = p.y - p.t * 50;
      ctx.globalAlpha = 1 - Math.max(0, p.t - .5) / .4;
      ctx.font = `900 ${p.size}px "Zen Maru Gothic", sans-serif`;
      ctx.lineWidth = 5; ctx.strokeStyle = '#4A2A1A'; ctx.strokeText(p.text, p.x, y); ctx.fillStyle = p.col; ctx.fillText(p.text, p.x, y);
    }
    ctx.globalAlpha = 1;
  }
  // 時間を足す（梅雨の「ぴったり」など）。はじめの時間より 多くは ならない
  function addTime(sec) { if (!gameTime() || state !== 'play') return; timeLeft = Math.min(gameTime(), timeLeft + sec); setTimebar(); }
  const hud = html => { $('egInfo').innerHTML = html || ''; };
  const live = t => { $('egLive').textContent = t; };

  /* ---------- 画面の大きさ ---------- */
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (def && def.resize && (state === 'play' || state === 'pause' || state === 'count')) def.resize(api());
  }

  /* ---------- ゲームに わたすもの ---------- */
  function api() {
    return {
      get W() { return W; }, get H() { return H; }, ctx, rnd, clamp, add, combo, get comboN() { return comboN; }, burst, pop, se, buzz, hud, live,
      get reduced() { return !!inf.reduced; }, get time() { return playT; }, get timeLeft() { return timeLeft; }, get score() { return score; }, get mode() { return mode; }, addTime,
      stats, cat: catSprite, end: endGame, ev
    };
  }

  /* ---------- 流れ ---------- */
  function panel(html, dim) { const p = $('egPanel'); p.innerHTML = html; p.hidden = false; p.classList.toggle('dim', !!dim); p.scrollTop = 0; }
  function closePanel() { $('egPanel').hidden = true; $('egPanel').innerHTML = ''; }
  function menu(focusMode) {
    state = 'menu'; inf = info(); ev = inf.ev || ev; mode = inf.mode || (MODES ? MODES[0].id : '');
    $('egHud').hidden = true; $('egCombo').textContent = ''; $('egCount').textContent = '';
    $('egSprites').innerHTML = ''; parts.length = 0; pops.length = 0;
    drawIdle();
    panel(`<div class="eg-top"><button type="button" class="eg-back" id="egBack">‹ もどる</button><button type="button" class="eg-snd" id="egSnd" aria-label="${muted ? '音を出す' : '音を消す'}">${muted ? '🔇' : '🔊'}</button></div>
      <div class="eg-card">
        <img class="eg-banner" src="ev-${ID}-banner.webp" alt="${esc(ev.gacha)}" width="640" height="120">
        <h1 class="eg-title">${esc(def.title)}</h1>
        <p class="eg-desc">${esc(ev.gameDesc || '')}</p>
        <div class="eg-catbox eg-cat-jump">${catHTML()}</div>
        ${MODES ? `<div class="eg-modes" role="group" aria-label="むずかしさ">${MODES.map(m => `<button type="button" class="eg-mode" data-mode="${m.id}" aria-pressed="${m.id === mode}"><b>${esc(m.name)}</b><small>${esc(m.desc)}</small></button>`).join('')}</div>` : ''}
        <div class="eg-stats"><div><small>いちばんの点</small><b>${inf.best ? fmt(inf.best) : '—'}</b></div><div><small>はじめてクリア</small><b>${inf.cleared ? '✔' : '+' + inf.clearBonus}</b></div><div><small>コイン きょう</small><b>あと${inf.plays}回</b></div></div>
        <p class="eg-rec" id="egRec">いちばん：<b>${esc(recText(inf.rec))}</b></p>
        <button type="button" class="eg-btn" id="egStart">スタート</button>
        <p class="eg-note">クリアの目標：${esc(def.goal)}</p>
        <ul class="eg-how" aria-label="あそびかた">${def.how.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
      </div>`);
    $('egBack').onclick = quit;
    $('egSnd').onclick = () => { muted = !muted; menu(); };
    $('egStart').onclick = () => { audioInit(); se('tap'); start(); };
    document.querySelectorAll('[data-mode]').forEach(b => { b.onclick = () => { audioInit(); se('tap'); setMode(b.dataset.mode); }; });
    setTimeout(() => { const b = focusMode ? document.querySelector(`[data-mode="${focusMode}"]`) : $('egStart'); if (b) b.focus({ preventScroll: true }); }, 50);
  }
  function setMode(m) {
    if (!MODES) return;
    if (APP && APP.evMode) APP.evMode(ID, m); else mock.mode = m;
    menu(m);
  }
  function drawIdle() { ctx.clearRect(0, 0, W, H); }
  function start() {
    closePanel(); score = 0; comboN = 0; playT = 0; for (const k in stats) delete stats[k];
    $('egScore').textContent = '0'; combo(0); hud('');
    $('egSprites').innerHTML = ''; parts.length = 0; pops.length = 0;
    $('egHud').hidden = false; $('egTimebar').hidden = !gameTime(); timeLeft = gameTime(); setTimebar();
    def.init(api());
    bgmPlay(true);
    state = 'count';
    let n = 3; const c = $('egCount');
    const step = () => {
      if (state !== 'count') return;
      if (n > 0) { c.className = 'eg-count'; c.textContent = n; se('tick'); n--; setTimeout(step, 600); }
      else { c.className = 'eg-count go'; c.textContent = 'スタート！'; se('go'); setTimeout(() => { c.textContent = ''; }, 500); state = 'play'; lastT = performance.now(); }
    };
    step();
    lastT = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }
  function setTimebar() {
    if (!gameTime()) return;
    $('egTime').style.transform = `scaleX(${clamp(timeLeft / gameTime(), 0, 1)})`;
    $('egTimebar').classList.toggle('low', timeLeft <= 10);
  }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
    if (state === 'play') {
      playT += dt;
      if (gameTime()) {
        const before = Math.ceil(timeLeft); timeLeft -= dt; setTimebar();
        if (timeLeft <= 10 && Math.ceil(timeLeft) < before && timeLeft > 0) se('tick');
        if (timeLeft <= 0) { timeLeft = 0; endGame({ timeUp: true }); return; }
      }
      def.update(dt);
    }
    if (state === 'play' || state === 'count' || state === 'pause') {
      ctx.clearRect(0, 0, W, H);
      def.draw(ctx, state === 'play' ? dt : 0);
      drawFx(state === 'pause' ? 0 : dt);
    }
  }
  function pause() {
    if (state !== 'play' && state !== 'count') return;
    state = 'pause'; bgmPlay(false);
    panel(`<div class="eg-card"><h2 class="eg-title">いちじていし</h2>
      <button type="button" class="eg-btn" id="egResume">つづける</button><button type="button" class="eg-btn white" id="egQuit">やめる（はじめの画面へ）</button></div>`, true);
    $('egResume').onclick = () => { closePanel(); state = 'play'; lastT = performance.now(); bgmPlay(true); };
    $('egQuit').onclick = () => { cancelAnimationFrame(raf); bgmPlay(false); if (def.stop) def.stop(); menu(); };
    $('egResume').focus({ preventScroll: true });
  }
  function endGame(extra = {}) {
    if (state !== 'play') return;
    state = 'end'; Object.assign(stats, extra);
    if (def.stop) def.stop();
    const cleared = !!def.cleared(stats, score), coins = clamp(Math.round(def.coins(stats, score)), 0, EV_GAME.max);
    se(cleared ? 'clear' : extra.timeUp ? 'get' : 'bad');
    setTimeout(() => {
      cancelAnimationFrame(raf); bgmPlay(false);
      const rec = Math.max(0, Math.round(def.rec ? def.rec(stats) || 0 : 0));
      const r = APP ? APP.evResult(ID, score, coins, cleared, rec, mode) : (() => {
        const g = mock.plays > 0 && coins > 0 ? coins : 0; if (g) mock.plays--; const b = cleared && !mock.cleared ? EV_GAME.clear : 0; if (b) mock.cleared = true;
        const ob = mock.best[mode] || 0, or = mock.rec[mode] || 0; mock.best[mode] = Math.max(ob, score); mock.rec[mode] = Math.max(or, rec); mock.coins += g + b;
        return { given: g, bonus: b, best: mock.best[mode], newBest: score > ob && ob > 0, plays: mock.plays, rec: mock.rec[mode], newRec: rec > or && or > 0 };
      })();
      stats.rec = rec;
      showResult(r, cleared, coins);
    }, extra.timeUp ? 300 : 900);
  }
  function showResult(r, cleared, coins) {
    inf = info();
    const tier = def.tiers.reduce((a, t) => (score >= t[0] ? t : a), def.tiers[0]);
    const coinRow = r.given ? `<b class="plus">+${fmt(r.given)}コイン</b>` : coins > 0 ? '<b>きょうは もう もらえない</b>' : '<b>0</b>';
    $('egHud').hidden = true; $('egCombo').textContent = '';
    panel(`<div class="eg-card">
      <h2 class="eg-title">${stats.timeUp ? 'タイムアップ！' : esc(def.endTitle ? def.endTitle(stats) : 'おしまい！')}</h2>
      <div class="eg-res-score"><small>スコア${MODES ? `（${esc(modeOf(mode).name)}）` : ''}</small><b>${fmt(score)}</b>${r.newBest ? '<span class="eg-new">NEW!</span>' : ''}</div>
      ${cleared ? `<div class="eg-clear">クリア！ ${esc(def.goal)}</div>` : ''}
      <div class="eg-say">${esc(tier[1].replace('{cat}', (inf.cat || {}).name || '猫'))}</div>
      <div class="eg-catbox${score >= def.tiers[def.tiers.length - 1][0] ? ' eg-cat-jump' : ''}">${catHTML()}</div>
      <div class="eg-rows"><div><span>きろく</span><b class="eg-recrow">${esc(recText(stats.rec, false))}<small>（いちばん ${r.rec ? fmt(r.rec) : '—'}）</small>${r.newRec ? '<span class="eg-new sm">NEW!</span>' : ''}</b></div>
        <div><span>いちばんの点</span><b>${fmt(r.best)}</b></div>
        <div><span>コイン</span>${coinRow}</div>
        ${r.bonus ? `<div><span>はじめてクリア</span><b class="plus">+${fmt(r.bonus)}コイン</b></div>` : ''}
        <div><span>コインが もらえる のこり</span><b>きょう あと${r.plays}回</b></div></div>
      <div class="eg-btns"><button type="button" class="eg-btn white" id="egHome">もどる</button><button type="button" class="eg-btn" id="egAgain">もう1回</button></div></div>`);
    live(`スコア ${score}。${r.given ? `${r.given}コイン もらいました。` : ''}${r.bonus ? `はじめてクリアで ${r.bonus}コイン。` : ''}`);
    if (r.given || r.bonus) setTimeout(() => se('coin'), 200);
    $('egAgain').onclick = () => { se('tap'); start(); };
    $('egHome').onclick = () => { se('tap'); menu(); };
    $('egAgain').focus({ preventScroll: true });
  }
  function quit() { bgmPlay(false); if (APP) APP.close(); else history.back(); }

  /* ---------- さわる ---------- */
  function bindInput() {
    const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    let downId = null;
    cv.addEventListener('pointerdown', e => {
      if (state !== 'play') return; e.preventDefault(); downId = e.pointerId;
      try { cv.setPointerCapture(e.pointerId); } catch (er) {}
      if (def.down) def.down(...pos(e));
    });
    cv.addEventListener('pointermove', e => { if (state !== 'play') return; if (def.move) def.move(...pos(e), downId !== null && e.pointerId === downId); });
    const up = e => { if (e.pointerId !== downId) return; downId = null; if (state === 'play' && def.up) def.up(...pos(e)); };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && (state === 'play' || state === 'count')) { pause(); return; }
      if (state === 'play' && def.key) def.key(e.key, true, e);
    });
    window.addEventListener('keyup', e => { if (state === 'play' && def.key) def.key(e.key, false, e); });
    $('egPause').onclick = () => { se('tap'); pause(); };
    document.addEventListener('visibilitychange', () => { if (document.hidden) { if (state === 'play' || state === 'count') pause(); bgmPlay(false); } });
    window.addEventListener('resize', resize);
  }

  // 自動テスト用（?fast=1 のときだけ）
  if (FAST) window.EGT = { api: () => api(), get def() { return def; }, get state() { return state; }, get mode() { return mode; }, get timeLeft() { return timeLeft; }, get pops() { return pops; }, get parts() { return parts; } };

  return {
    register(id, d) { games[id] = d; },
    boot() {
      inf = info(); ev = inf.ev || EVENTS[0];
      def = games[ID];
      const root = $('eg');
      root.style.setProperty('--c', ev.color); root.style.setProperty('--c2', ev.color2);
      document.title = def ? def.title : 'イベント';
      $('egPanel').style.setProperty('--bgimg', `url("ev-${ID}-home.webp")`);
      cv = $('egCanvas'); ctx = cv.getContext('2d');
      resize(); bindInput();
      if (!def) { panel(`<div class="eg-card"><p>このゲームは まだありません</p><button class="eg-btn white" id="egBack">もどる</button></div>`); $('egBack').onclick = quit; return; }
      menu();
    },
    // ゲームの中で使う 小さな道具
    util: {
      rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); },
      line: '#4A2A1A'
    }
  };
})();
