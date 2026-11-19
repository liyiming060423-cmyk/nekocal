// にゃんカロ 音・バイブ・トースト・BGM
// 効果音（se）・猫の声（petSound）・バイブ（buzz）・下に出るお知らせ（toast）・画面ごとの BGM
// （v10.0 で app.js から分けた。読みこむ順番は index.html。ほかのファイルの関数・変数はそのまま使える）
'use strict';

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

/* ---------- BGM ----------
   タイトル：Cat life ／ ホーム・きろく・ねこ（ステータス）・せってい：自宅にて ／ ショップ・ねこ（きせかえ）：青空 ／ あそぶ（ジム・ミニゲーム一覧）：Sunrise
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
  if (UI.tab === 'train') return 'train';
  if (UI.tab === 'cat' && UI.catTab === 'wear') return 'shop';   // v10.1：きせかえ（前の更衣室）は ショップの曲
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
  // v9.8：mp3 には ?v= をつけない（版を上げるたびに大きな曲を全部ダウンロードしなおさないように。曲を変えるときはファイル名を変える）
  // v10.4：イベントのあいだは ホーム・ショップの曲が イベントの曲（ev-{id}-bgm.mp3）になる
  const ev = (want === 'home' || want === 'shop') && typeof eventNow === 'function' ? eventNow() : null;
  const src = ev ? `ev-${ev.id}-bgm.mp3` : BGM_FILES[want];
  if (src !== bgmCur) { bgmCur = src; bgmEl.src = src; }
  if (actx && actx.state === 'suspended') actx.resume().catch(() => {});
  if (bgmEl.paused) { const p = bgmEl.play(); if (p && p.catch) p.catch(() => {}); }
}
// どこかを最初にタップしたら鳴らせるようにする
['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, () => { if (!bgmUnlocked) { bgmUnlocked = true; bgmUpdate(); } }, { once: true, capture: true }));
