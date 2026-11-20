// にゃんカロ イベントのミニゲーム：梅雨「カエルぴょん」（v10.4）
// おして ためて、はなして ジャンプ。はっぱ（はす）の上に のれたら 1てん。まん中なら「ぴったり」。水に おちたら おしまい
// v10.4.1：つぎの はっぱに のれば コンボ（まん中でなくても）。ぴったりは 時間 +2秒。むずかしさ：ふつう（とどく場所の 線あり）／上級（線なし・点 ×1.5）
'use strict';
(() => {
  const L = EG.util.line;
  let g, cat, img, pads, at, camX, camT, charge, charging, jump, rain, waterY, catW, sink, keyHold;

  function addPad() {
    const last = pads[pads.length - 1], n = pads.length;
    const w = g.clamp(110 - n * 1.6, 62, 110) * g.rnd(.9, 1.1);
    const gap = n < 4 ? g.rnd(50, 110) : g.rnd(Math.min(g.W * .2, 80), Math.min(g.W * .55, 220)) + Math.min(50, n * 2);   // はじめの3つは ちかい
    pads.push({ x: last.x + last.w / 2 + gap + w / 2, w, mv: n > 8 && Math.random() < .45 ? g.rnd(18, 34) : 0, ph: g.rnd(0, 6), frog: Math.random() < .3, flower: Math.random() < .35, x0: 0 });
    const p = pads[pads.length - 1]; p.x0 = p.x;
  }
  function padX(p) { return p.mv ? p.x0 + Math.sin(g.time * 1.6 + p.ph) * p.mv : p.x; }
  function drawPad(c, p, sx) {
    const y = waterY + 4;
    c.lineWidth = 3; c.strokeStyle = L; c.fillStyle = 'rgba(40,80,120,.25)'; c.beginPath(); c.ellipse(sx, y + 8, p.w / 2 + 6, 10, 0, 0, 7); c.fill();
    c.fillStyle = '#4FA35A'; c.beginPath(); c.ellipse(sx, y, p.w / 2, 14, 0, .25, Math.PI * 2 - .25 + .0001); c.lineTo(sx, y); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = '#2F7A3A'; c.lineWidth = 2; for (let a = -2.4; a <= -0.6; a += .6) { c.beginPath(); c.moveTo(sx, y); c.lineTo(sx + Math.cos(a) * p.w * .42, y + Math.sin(a) * 10); c.stroke(); }
    if (p.flower) { c.lineWidth = 2.5; c.strokeStyle = L; for (let i = 0; i < 5; i++) { const a = i * 1.256; c.fillStyle = i % 2 ? '#F7B6CC' : '#FFFFFF'; c.beginPath(); c.ellipse(sx + p.w * .28 + Math.cos(a) * 6, y - 6 + Math.sin(a) * 4, 6, 4, a, 0, 7); c.fill(); c.stroke(); } c.fillStyle = '#FFE07A'; c.beginPath(); c.arc(sx + p.w * .28, y - 6, 3, 0, 7); c.fill(); }
    if (p.frog) drawFrog(c, sx - p.w * .22, y - 4, p.frogJ || 0);
  }
  function drawFrog(c, x, y, j) {
    y -= j * 60; c.lineWidth = 2.5; c.strokeStyle = L;
    c.fillStyle = '#7CC24A'; c.beginPath(); c.ellipse(x, y - 10, 14, 11, 0, 0, 7); c.fill(); c.stroke();
    [-6, 6].forEach(d => { c.beginPath(); c.arc(x + d, y - 21, 5.5, 0, 7); c.fill(); c.stroke(); c.fillStyle = L; c.beginPath(); c.arc(x + d, y - 21, 2.4, 0, 7); c.fill(); c.fillStyle = '#7CC24A'; });
    c.strokeStyle = L; c.beginPath(); c.arc(x, y - 10, 5, .3, 2.8); c.stroke();
  }
  function water(c) {
    const gr = c.createLinearGradient(0, waterY, 0, g.H); gr.addColorStop(0, 'rgba(120,150,220,.92)'); gr.addColorStop(1, 'rgba(70,90,170,.96)');
    c.fillStyle = gr; c.fillRect(0, waterY, g.W, g.H - waterY);
    c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const x = ((i * 97 - camX * .6) % (g.W + 120) + g.W + 120) % (g.W + 120) - 60; c.beginPath(); c.moveTo(x, waterY + 26 + i * 9); c.quadraticCurveTo(x + 20, waterY + 20 + i * 9, x + 40, waterY + 26 + i * 9); c.stroke(); }
  }
  const PX = () => g.W * .24;
  const PERFECT_TIME = 2;   // ぴったりで ふえる 時間（秒）
  const hard = () => g.mode === 'hard';
  const pts = n => hard() ? n * 1.5 : n;   // 上級は 点 ×1.5   // ねこの 画面の よこ位置

  EG.register('rainy', {
    title: 'カエルぴょん', time: 60, goal: '20かい ジャンプ',
    how: ['画面を おしている あいだ パワーが たまる', 'はなすと ジャンプ！ つぎの はっぱに のれば コンボ', 'まん中に のると「ぴったり」で 時間 +2秒。水に おちたら おしまい'],
    tiers: [[0, 'ぬれちゃったにゃ…でも たのしかったにゃ'], [1000, 'ぴょんぴょん じょうずにゃ！'], [2400, 'カエルさんも びっくりの ジャンプ名人にゃ！']],
    coins: (s, sc) => sc / 26, cleared: s => (s.jumps || 0) >= 20, rec: s => s.jumps,
    endTitle: s => s.fall ? 'ポチャン！' : 'おしまい！',
    init(api) {
      g = api; pads = []; at = 0; camX = camT = 0; charge = 0; charging = false; jump = null; rain = []; sink = 0; keyHold = false;
      g.stats.jumps = 0; g.stats.perfect = 0; this.land = 0; this.splashT = 0; this.fallX = 0;
      if (!img) { img = new Image(); img.src = 'ev-rainy-home.webp'; }
      this.resize(api);
      pads.push({ x: 0, w: 120, mv: 0, ph: 0, frog: false, flower: true, x0: 0 });
      for (let i = 0; i < 6; i++) addPad();
      cat = g.cat();
    },
    // 自動テスト用：つぎの はっぱの まん中（off）に のる・いまの 線
    t: { guide: 0, cancel() { charging = false; }, land(off = 0) { const p = pads[at + 1], from = padX(pads[at]); jump = { x0: from, d: padX(p) + off - from, t: 0, T: .01, h: 10 }; EGT.def.update(.02); }, get at() { return at; }, get pads() { return pads; } },
    resize() { waterY = g.H * .68; catW = Math.min(76, g.W * .19); },
    down() { if (!jump && !this.splashT) { charging = true; charge = 0; this.t0 = g.time; g.se('tap'); } },
    up() {
      if (!charging || jump) return; charging = false;
      const pw = charge;
      const from = padX(pads[at]), maxD = Math.min(g.W * .78, 330);
      jump = { x0: from, d: 40 + pw * maxD, t: 0, T: .5 + pw * .25, h: 60 + pw * 110 };
      g.se('jump');
    },
    key(k, on, e) { if (k === ' ' || k === 'Enter' || k === 'ArrowUp') { e.preventDefault(); if (on && !keyHold) { keyHold = true; this.down(); } else if (!on) { keyHold = false; this.up(); } } },
    update(dt) {
      if (charging) { const p = ((g.time - this.t0) / 1.1) % 2; charge = p > 1 ? 2 - p : p; }
      if (jump) {
        jump.t += dt;
        if (jump.t >= jump.T) {
          const lx = jump.x0 + jump.d; jump = null;
          let hit = -1;
          for (let i = at + 1; i < pads.length; i++) if (Math.abs(lx - padX(pads[i])) < pads[i].w / 2 + 4) { hit = i; break; }
          if (hit < 0 && Math.abs(lx - padX(pads[at])) < pads[at].w / 2) { this.land = lx - padX(pads[at]); g.combo(0); g.pop('もどっちゃった', PX(), waterY - 120, '#FFFFFF', 16); return; }
          if (hit < 0) { this.fallX = lx; g.burst(PX() + (lx - padX(pads[at])), waterY, '#CFEAFF', 16, 200); g.se('splash'); g.buzz([50, 30, 50]); this.splashT = .01; return; }
          const p = pads[hit], off = lx - padX(p), skip = hit - at - 1; at = hit; this.land = off;
          g.stats.jumps++;
          const perfect = Math.abs(off) < p.w * .16;
          const n = g.comboN + 1; g.combo(n);   // のれたら コンボ（まん中でなくても）
          let pt = 100 + skip * 150 + (n >= 2 ? Math.min(5, n) * 20 : 0);
          if (perfect) { g.stats.perfect++; pt += 50; g.addTime(PERFECT_TIME); g.pop('ぴったり！', PX(), waterY - 140, '#FFFFFF', 20); g.pop(`+${PERFECT_TIME}びょう`, PX() + 70, waterY - 118, '#BFE3F8', 17); g.se('coin'); } else g.se('get');
          if (skip) g.pop('とびこし！', PX(), waterY - 170, '#FFE07A', 18);
          if (p.frog) { pt += 40; p.frogJ = .01; g.pop('ケロッ！', PX() - 30, waterY - 60, '#B8F28A', 18); }
          g.add(pts(pt), PX(), waterY - 100);
          g.live(`${g.stats.jumps}かい`);
          while (pads.length < at + 7) addPad();
        }
      }
      if (this.splashT) { this.splashT += dt; if (this.splashT > .7) { this.splashT = 0; g.end({ fall: true }); return; } }
      pads.forEach(p => { if (p.frogJ) { p.frogJ += dt * 2; if (p.frogJ > 1.2) { p.frog = false; p.frogJ = 0; } } });
      // カメラ：いまの はっぱが 左に来るように
      camT = padX(pads[at]) - PX() + (this.land || 0); camX += (camT - camX) * Math.min(1, dt * 5);
      if (!g.reduced && rain.length < 70) for (let i = 0; i < 3; i++) rain.push({ x: g.rnd(0, g.W + 60), y: g.rnd(-40, 0), v: g.rnd(500, 700) });
      for (let i = rain.length - 1; i >= 0; i--) { const r = rain[i]; r.y += r.v * dt; r.x -= 80 * dt; if (r.y > waterY + 10) rain.splice(i, 1); }
    },
    draw(c) {
      if (img && img.complete && img.naturalWidth) {
        const s = Math.max(g.W / img.naturalWidth, g.H / img.naturalHeight) * 1.1, w = img.naturalWidth * s, h = img.naturalHeight * s;
        const span = Math.max(1, w - g.W), ox = -((((camX * .15) % span) + span) % span);
        c.drawImage(img, ox, (g.H - h) * .4, w, h);
      } else { c.fillStyle = '#B9C6F2'; c.fillRect(0, 0, g.W, g.H); }
      water(c);
      for (let i = Math.max(0, at - 2); i < pads.length; i++) { const sx = padX(pads[i]) - camX; if (sx > -150 && sx < g.W + 150) drawPad(c, pads[i], sx); }
      c.strokeStyle = 'rgba(230,240,255,.7)'; c.lineWidth = 1.5; rain.forEach(r => { c.beginPath(); c.moveTo(r.x, r.y); c.lineTo(r.x - 4, r.y + 14); c.stroke(); });
      // ねこ
      let x, y = waterY + 2, rot = 0, sy = 1;
      if (jump) { const u = jump.t / jump.T; x = jump.x0 + jump.d * u - camX; y = waterY + 2 - Math.sin(u * Math.PI) * jump.h; rot = (u - .5) * 24; }
      else if (this.splashT) { x = this.fallX - camX; y = waterY + 2 + this.splashT * 120; }
      else { x = padX(pads[at]) + (this.land || 0) - camX; if (charging) sy = 1 - charge * .2; }
      cat.set(x, y, catW, { rot, sy });
      cat.el.style.clipPath = this.splashT ? `inset(0 0 ${Math.min(100, this.splashT * 140)}% 0)` : '';
      // パワー（とどく場所の めやす）
      if (charging) {
        if (!hard()) {   // 上級は とどく場所の 線を 出さない（パワーの メーターだけ）
          const maxD = Math.min(g.W * .78, 330), d = 40 + charge * maxD, h = 60 + charge * 110;
          c.fillStyle = 'rgba(255,255,255,.9)';
          for (let i = 1; i <= 9; i++) { const u = i / 10; c.beginPath(); c.arc(x + d * u, waterY + 2 - Math.sin(u * Math.PI) * h - catW * .5, 3.2, 0, 7); c.fill(); }
          c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 3; c.beginPath(); c.ellipse(x + d, waterY + 6, 16, 6, 0, 0, 7); c.stroke();
          this.t.guide++;
        }
        const cx = x, cy = y - catW * 1.55;
        c.lineWidth = 10; c.strokeStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(cx, cy, 22, Math.PI * .75, Math.PI * 2.25); c.stroke();
        c.strokeStyle = charge > .85 ? '#E0573F' : charge > .5 ? '#F7C64B' : '#4FAE5B'; c.lineWidth = 7; c.beginPath(); c.arc(cx, cy, 22, Math.PI * .75, Math.PI * (.75 + 1.5 * charge)); c.stroke();
        c.lineWidth = 3; c.strokeStyle = L; c.beginPath(); c.arc(cx, cy, 27, Math.PI * .75, Math.PI * 2.25); c.stroke();
      }
    }
  });
})();
