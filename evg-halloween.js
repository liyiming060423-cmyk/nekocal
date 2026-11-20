// にゃんカロ イベントのミニゲーム：ハロウィン「お菓子泥棒」（v10.4）
// 猫を左右に動かして、ふってくる おかし・コインを あつめる。かぼちゃばくだん・おばけに さわると ライフが へる。つづけて とると コンボ
'use strict';
(() => {
  const L = EG.util.line, rr = EG.util.rr;
  const ITEMS = {   // p＝点、w＝出やすさ
    candy:  { p: 10, w: 34, r: 18 }, lolli: { p: 15, w: 20, r: 20 }, choco: { p: 20, w: 14, r: 18 },
    coin:   { p: 30, w: 10, r: 16 }, star:  { p: 60, w: 3,  r: 20 },
    bomb:   { bad: 1, w: 13, r: 22 }, ghost: { bad: 1, w: 9, r: 24 }
  };
  const CANDY_COL = ['#F7708A', '#5DB7F0', '#FFD23F', '#8BD46A', '#C08BF0'];
  let g, cat, items, px, tx, lives, spawnT, bg, hitT, catW, groundY, keyDir;

  function makeBg() {
    bg = document.createElement('canvas'); const d = Math.min(2, window.devicePixelRatio || 1);
    bg.width = Math.round(g.W * d); bg.height = Math.round(g.H * d);
    const c = bg.getContext('2d'); c.scale(d, d);
    const W = g.W, H = g.H, gr = c.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#3B2466'); gr.addColorStop(.55, '#7A3E9E'); gr.addColorStop(1, '#F29A5A');
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
    c.fillStyle = '#FFF2B8'; c.beginPath(); c.arc(W * .78, H * .2, Math.min(W, H) * .1, 0, 7); c.fill();
    c.fillStyle = '#3B2466'; c.beginPath(); c.arc(W * .78 + 14, H * .2 - 8, Math.min(W, H) * .085, 0, 7); c.globalAlpha = .25; c.fill(); c.globalAlpha = 1;
    for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(255,255,255,${Math.random() * .7 + .2})`; c.fillRect(Math.random() * W, Math.random() * H * .5, 2, 2); }
    // やしき
    c.fillStyle = '#2A1840';
    const bx = W * .08, by = groundY - H * .28;
    c.fillRect(bx, by, W * .34, H * .28); c.beginPath(); c.moveTo(bx - 10, by); c.lineTo(bx + W * .17, by - H * .12); c.lineTo(bx + W * .34 + 10, by); c.fill();
    c.fillRect(bx + W * .26, by - H * .2, W * .06, H * .2); c.beginPath(); c.moveTo(bx + W * .25, by - H * .2); c.lineTo(bx + W * .29, by - H * .27); c.lineTo(bx + W * .33, by - H * .2); c.fill();
    c.fillStyle = '#FFC85A'; [[.05, .06], [.2, .06], [.05, .16], [.2, .16]].forEach(([x, y]) => c.fillRect(bx + W * x, by + H * y, W * .06, H * .05));
    // 旗
    c.strokeStyle = '#2A1840'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, H * .1); c.quadraticCurveTo(W / 2, H * .16, W, H * .1); c.stroke();
    for (let i = 0; i < 9; i++) { const x = W * (i + .5) / 9, y = H * .1 + Math.sin((i + .5) / 9 * Math.PI) * H * .045; c.fillStyle = i % 2 ? '#F0882A' : '#8A4FD0'; c.beginPath(); c.moveTo(x - 12, y); c.lineTo(x + 12, y); c.lineTo(x, y + 22); c.fill(); }
    // 地面
    c.fillStyle = '#4A2E5E'; c.fillRect(0, groundY, W, H - groundY);
    c.fillStyle = '#5E3A76'; for (let x = 0; x < W; x += 34) { rr(c, x + 2, groundY + 8, 28, 14, 6); c.fill(); }
  }
  function drawItem(c, it) {
    const { x, y, k, r } = it;
    c.save(); c.translate(x, y); c.rotate(it.rot || 0); c.lineWidth = 3; c.strokeStyle = L; c.lineJoin = 'round';
    if (k === 'candy') {
      c.fillStyle = it.col;
      c.beginPath(); c.moveTo(-r * .55, 0); c.lineTo(-r * 1.15, -r * .5); c.lineTo(-r * 1.15, r * .5); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(r * .55, 0); c.lineTo(r * 1.15, -r * .5); c.lineTo(r * 1.15, r * .5); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.ellipse(0, 0, r * .7, r * .55, 0, 0, 7); c.fill(); c.stroke();
      c.strokeStyle = '#FFFFFF'; c.lineWidth = 3; c.beginPath(); c.moveTo(-r * .3, -r * .35); c.lineTo(r * .1, r * .4); c.stroke();
    } else if (k === 'lolli') {
      c.strokeStyle = L; c.lineWidth = 5; c.beginPath(); c.moveTo(0, r * .6); c.lineTo(0, r * 1.6); c.stroke(); c.strokeStyle = '#FFFFFF'; c.lineWidth = 3; c.stroke();
      c.fillStyle = it.col; c.strokeStyle = L; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, r * .8, 0, 7); c.fill(); c.stroke();
      c.strokeStyle = '#FFFFFF'; c.lineWidth = 3; c.beginPath(); for (let a = 0; a < 9; a += .3) { const rr2 = a / 9 * r * .7; c.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } c.stroke();
    } else if (k === 'choco') {
      c.fillStyle = '#7A4A2A'; rr(c, -r, -r * .65, r * 2, r * 1.3, 4); c.fill(); c.stroke();
      c.fillStyle = '#D8343F'; c.fillRect(-r * .35, -r * .65, r * .7, r * 1.3); c.strokeRect(-r * .35, -r * .65, r * .7, r * 1.3);
    } else if (k === 'coin') {
      c.fillStyle = '#F7C64B'; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill(); c.stroke();
      c.fillStyle = '#E0A81E'; c.beginPath(); c.arc(0, 2, r * .35, 0, 7); c.fill();
      [[-.42, -.3], [-.15, -.55], [.15, -.55], [.42, -.3]].forEach(([a, b]) => { c.beginPath(); c.arc(a * r, b * r, r * .14, 0, 7); c.fill(); });
    } else if (k === 'star') {
      c.fillStyle = '#FFE07A'; c.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr2 = i % 2 ? r * .45 : r; c.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } c.closePath(); c.fill(); c.stroke();
    } else if (k === 'bomb') {
      c.fillStyle = '#F0882A'; c.beginPath(); c.ellipse(0, 2, r, r * .85, 0, 0, 7); c.fill(); c.stroke();
      c.strokeStyle = '#C9601A'; c.beginPath(); c.moveTo(-r * .35, -r * .7); c.quadraticCurveTo(-r * .55, 0, -r * .35, r * .8); c.moveTo(r * .35, -r * .7); c.quadraticCurveTo(r * .55, 0, r * .35, r * .8); c.stroke();
      c.fillStyle = '#2A2328'; c.beginPath(); c.moveTo(-r * .5, -r * .15); c.lineTo(-r * .2, -r * .15); c.lineTo(-r * .35, -r * .45); c.fill(); c.beginPath(); c.moveTo(r * .5, -r * .15); c.lineTo(r * .2, -r * .15); c.lineTo(r * .35, -r * .45); c.fill();
      c.beginPath(); c.moveTo(-r * .5, r * .2); c.quadraticCurveTo(0, r * .65, r * .5, r * .2); c.lineTo(r * .25, r * .3); c.lineTo(0, r * .2); c.lineTo(-r * .25, r * .3); c.closePath(); c.fill();
      c.strokeStyle = L; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -r * .8); c.quadraticCurveTo(r * .2, -r * 1.3, r * .5, -r * 1.25); c.stroke();
      if (Math.floor(g.time * 10) % 2) { c.fillStyle = '#FFE07A'; c.beginPath(); c.arc(r * .55, -r * 1.25, 5, 0, 7); c.fill(); }
    } else if (k === 'ghost') {
      c.globalAlpha = .95; c.fillStyle = '#F7F4FF';
      c.beginPath(); c.moveTo(-r, r * .7); c.quadraticCurveTo(-r * 1.05, -r, 0, -r); c.quadraticCurveTo(r * 1.05, -r, r, r * .7);
      for (let i = 0; i < 4; i++) { const x0 = r - i * r / 2; c.quadraticCurveTo(x0 - r / 4, r * (i % 2 ? .45 : 1.05), x0 - r / 2, r * .7); }
      c.closePath(); c.fill(); c.stroke();
      c.fillStyle = L; c.beginPath(); c.ellipse(-r * .3, -r * .15, 4, 6, 0, 0, 7); c.ellipse(r * .3, -r * .15, 4, 6, 0, 0, 7); c.fill();
      c.fillStyle = '#E8607A'; c.beginPath(); c.ellipse(0, r * .2, 6, 5, 0, 0, 7); c.fill();
    }
    c.restore();
  }
  function spawn() {
    const level = Math.min(1, g.time / 55);
    const pool = Object.entries(ITEMS), tot = pool.reduce((a, [k, v]) => a + v.w * (v.bad ? .6 + level : 1), 0);
    let x = Math.random() * tot, k = 'candy';
    for (const [kk, v] of pool) { x -= v.w * (v.bad ? .6 + level : 1); if (x < 0) { k = kk; break; } }
    const d = ITEMS[k], speed = (k === 'ghost' ? 70 : 120) + level * 140 + g.rnd(0, 40);
    items.push({ k, x: g.rnd(30, g.W - 30), y: -30, vy: speed, r: d.r, col: CANDY_COL[Math.floor(Math.random() * 5)], rot: g.rnd(-.5, .5), vr: g.rnd(-2, 2), ph: g.rnd(0, 6), bx: 0 });
  }
  function hearts() { g.hud('<span style="color:#E0573F">' + '♥'.repeat(lives) + '</span><span style="color:#D6C8B8">' + '♥'.repeat(3 - lives) + '</span>'); }

  EG.register('halloween', {
    title: 'お菓子泥棒', time: 60, goal: '3,000点',
    how: ['ゆびで 左右に うごかして おかしを あつめよう', 'かぼちゃばくだん・おばけに さわると ♥が へる', 'つづけて とると コンボで 点が ふえる'],
    tiers: [[0, 'つぎは もっと あつめるにゃ…！'], [1500, 'おかし いっぱい！ しあわせにゃ〜'], [3000, 'お菓子 大どろぼう！ ぜんぶ いただきにゃ！']],
    coins: (s, sc) => sc / 35, cleared: (s, sc) => sc >= 3000, rec: s => s.maxCombo,   // v10.4.1：記録は いちばんの コンボ
    endTitle: s => s.out ? 'みつかっちゃった！' : 'おしまい！',
    init(api) {
      g = api; items = []; lives = 3; spawnT = .4; hitT = 0; keyDir = 0;
      g.stats.candy = 0; g.stats.maxCombo = 0;
      this.resize(api);
      px = tx = g.W / 2;
      cat = g.cat(); hearts();
    },
    resize() { catW = Math.min(118, g.W * .28); groundY = g.H - Math.max(70, g.H * .1); makeBg(); },
    stop() {},
    down(x) { tx = x; }, move(x, y, pressed) { if (pressed) tx = x; },
    key(k, on) { if (k === 'ArrowLeft') keyDir = on ? -1 : (keyDir === -1 ? 0 : keyDir); if (k === 'ArrowRight') keyDir = on ? 1 : (keyDir === 1 ? 0 : keyDir); },
    update(dt) {
      if (keyDir) tx = g.clamp(tx + keyDir * 520 * dt, 0, g.W);
      tx = g.clamp(tx, catW * .4, g.W - catW * .4);
      px += (tx - px) * Math.min(1, dt * 14);
      spawnT -= dt; if (spawnT <= 0) { spawn(); spawnT = Math.max(.28, .75 - g.time * .007) * g.rnd(.7, 1.2); }
      hitT = Math.max(0, hitT - dt);
      const catTop = groundY - catW * 1.2, catBot = groundY - catW * .25;
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        it.y += it.vy * dt; it.rot += it.vr * dt;
        if (it.k === 'ghost') { it.ph += dt * 2.4; it.x += Math.cos(it.ph) * 80 * dt; }
        if (it.y > catTop && it.y < catBot && Math.abs(it.x - px) < catW * .42 + it.r * .5) {
          items.splice(i, 1);
          const d = ITEMS[it.k];
          if (d.bad) {
            if (hitT > 0) continue;
            lives--; hitT = 1.2; g.combo(0); hearts(); g.se('bad'); g.buzz([40, 30, 40]);
            g.burst(it.x, it.y, it.k === 'bomb' ? '#F0882A' : '#E8E0FF', 16, 220); g.pop(it.k === 'bomb' ? 'ドカン！' : 'ばあっ！', it.x, it.y - 20, '#FF8A7A', 24);
            if (lives <= 0) { g.end({ out: true }); return; }
          } else {
            const n = g.comboN + 1; g.combo(n); g.stats.maxCombo = Math.max(g.stats.maxCombo, n); g.stats.candy++;
            const mult = 1 + Math.min(4, Math.floor(n / 5)) * .5;
            g.add(d.p * mult, it.x, it.y - 10); g.se(it.k === 'coin' || it.k === 'star' ? 'coin' : 'get'); g.burst(it.x, it.y, it.col || '#FFE07A', 6, 120);
          }
          continue;
        }
        if (it.y > groundY + 10) {
          items.splice(i, 1);
          if (!ITEMS[it.k].bad && g.comboN) { g.combo(0); }
        }
      }
    },
    draw(c) {
      if (bg) c.drawImage(bg, 0, 0, g.W, g.H);
      items.forEach(it => drawItem(c, it));
      const blink = hitT > 0 && Math.floor(hitT * 10) % 2;
      const lean = g.clamp((tx - px) / 6, -12, 12);
      cat.el.style.opacity = blink ? .4 : 1;
      cat.set(px, groundY + catW * .05, catW, { rot: lean, flip: tx < px - 2 });
      c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(px, groundY + 4, catW * .38, 8, 0, 0, 7); c.fill();
    }
  });
})();
