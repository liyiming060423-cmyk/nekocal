// にゃんカロ イベントのミニゲーム：クリスマス「サンタのそり」（v10.4）
// 上下に ゆびを うごかして そりを とばす。プレゼントを ひろって、えんとつの上で「なげる」→ はいったら 配達せいこう。つづけて 入れると コンボ
// 鳥・かみなり雲に ぶつかると ♥が へる
'use strict';
(() => {
  const L = EG.util.line, rr = EG.util.rr;
  let g, cat, py, ty, lives, gifts, houses, things, drops, snow, speed, scroll, spawnT, hitT, bg, groundY, sx, downAt, downPos, btn, keyDir;
  const MAXG = 9;

  function makeBg() {
    bg = document.createElement('canvas'); const d = Math.min(2, window.devicePixelRatio || 1), W = g.W, H = g.H;
    bg.width = Math.round(W * d); bg.height = Math.round(H * d); const c = bg.getContext('2d'); c.scale(d, d);
    const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#16224E'); gr.addColorStop(.6, '#3B3C8A'); gr.addColorStop(1, '#8A6FB8');
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(255,255,255,${Math.random() * .6 + .3})`; c.beginPath(); c.arc(Math.random() * W, Math.random() * H * .7, Math.random() * 1.6 + .4, 0, 7); c.fill(); }
    c.fillStyle = '#FFF6D8'; c.beginPath(); c.arc(W * .82, H * .16, Math.min(W, H) * .08, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.arc(W * .82, H * .16, Math.min(W, H) * .13, 0, 7); c.fill();
    c.fillStyle = '#C9D6F2'; c.beginPath(); c.moveTo(0, groundY - 30); for (let x = 0; x <= W; x += 40) c.lineTo(x, groundY - 30 - Math.sin(x / 70) * 22 - 18); c.lineTo(W, groundY); c.lineTo(0, groundY); c.fill();
    c.fillStyle = '#F4F8FF'; c.fillRect(0, groundY, W, H - groundY);
  }
  function newHouse(x) {
    const w = g.rnd(90, 130), h = g.rnd(70, 120), chx = g.rnd(.2, .7) * w;
    houses.push({ x, w, h, chx, col: ['#C8574A', '#4C7FB8', '#5FA06A', '#C89A4A'][Math.floor(Math.random() * 4)], done: false, ch: 28 });
  }
  function houseRoofY(h) { return groundY - h.h; }
  function chimney(h) { const top = houseRoofY(h) - 50 + (h.chx / h.w) * 30 - 10; return { x: h.x + h.chx, y: top, w: h.ch }; }
  function drawHouse(c, h) {
    const y = houseRoofY(h), cmy = chimney(h);
    c.lineWidth = 3; c.strokeStyle = L; c.lineJoin = 'round';
    c.fillStyle = '#8C4A3A'; c.fillRect(cmy.x - cmy.w / 2, cmy.y, cmy.w, groundY - cmy.y - h.h * .5); c.strokeRect(cmy.x - cmy.w / 2, cmy.y, cmy.w, groundY - cmy.y - h.h * .5);
    c.fillStyle = '#FFFFFF'; rr(c, cmy.x - cmy.w / 2 - 5, cmy.y - 8, cmy.w + 10, 12, 5); c.fill(); c.stroke();
    if (!h.done) { c.fillStyle = 'rgba(255,224,122,.9)'; c.beginPath(); c.moveTo(cmy.x - 8, cmy.y - 26); c.lineTo(cmy.x + 8, cmy.y - 26); c.lineTo(cmy.x, cmy.y - 14); c.fill(); c.stroke(); }
    c.fillStyle = h.col; c.fillRect(h.x, y + h.h * .38, h.w, h.h * .62); c.strokeRect(h.x, y + h.h * .38, h.w, h.h * .62);
    c.fillStyle = '#F4F8FF'; c.beginPath(); c.moveTo(h.x - 12, y + h.h * .42); c.lineTo(h.x + h.w * .5, y - 10); c.lineTo(h.x + h.w + 12, y + h.h * .42); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = h.done ? '#FFE07A' : '#FFC85A'; c.fillRect(h.x + h.w * .2, y + h.h * .55, h.w * .22, h.h * .2); c.strokeRect(h.x + h.w * .2, y + h.h * .55, h.w * .22, h.h * .2);
    c.fillStyle = '#7A4A2A'; c.fillRect(h.x + h.w * .6, y + h.h * .62, h.w * .2, h.h * .38); c.strokeRect(h.x + h.w * .6, y + h.h * .62, h.w * .2, h.h * .38);
    if (h.done) { c.fillStyle = '#FFFFFF'; c.font = '900 14px "Zen Maru Gothic", sans-serif'; c.textAlign = 'center'; c.fillText('ありがとう！', h.x + h.w / 2, y - 18); }
  }
  function drawGift(c, x, y, s, col = '#D8343F', rib = '#F2C230') {
    c.lineWidth = 3; c.strokeStyle = L; c.fillStyle = col; rr(c, x - s, y - s, s * 2, s * 2, 4); c.fill(); c.stroke();
    c.fillStyle = rib; c.fillRect(x - s * .2, y - s, s * .4, s * 2); c.fillRect(x - s, y - s * .2, s * 2, s * .4);
    c.beginPath(); c.ellipse(x - s * .35, y - s - 4, s * .4, s * .25, -.4, 0, 7); c.ellipse(x + s * .35, y - s - 4, s * .4, s * .25, .4, 0, 7); c.fill(); c.stroke();
  }
  function drawSleigh(c, x, y) {
    // トナカイ
    const rx = x + 78, ry = y - 4 + Math.sin(g.time * 8) * 3;
    c.lineWidth = 3; c.strokeStyle = L; c.fillStyle = '#A8693E';
    c.beginPath(); c.ellipse(rx, ry, 24, 13, 0, 0, 7); c.fill(); c.stroke();
    c.beginPath(); c.ellipse(rx + 24, ry - 14, 11, 10, 0, 0, 7); c.fill(); c.stroke();
    c.strokeStyle = '#D9B07A'; c.lineWidth = 4; c.beginPath(); c.moveTo(rx + 20, ry - 22); c.lineTo(rx + 14, ry - 36); c.moveTo(rx + 16, ry - 30); c.lineTo(rx + 8, ry - 34); c.moveTo(rx + 28, ry - 22); c.lineTo(rx + 32, ry - 36); c.stroke();
    c.fillStyle = '#E8484F'; c.beginPath(); c.arc(rx + 35, ry - 13, 4.5, 0, 7); c.fill();
    c.strokeStyle = L; c.lineWidth = 3; const leg = Math.sin(g.time * 12) * 6;
    c.beginPath(); c.moveTo(rx - 14, ry + 10); c.lineTo(rx - 18 + leg, ry + 24); c.moveTo(rx + 12, ry + 10); c.lineTo(rx + 16 - leg, ry + 24); c.stroke();
    c.strokeStyle = '#F2C230'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 30, y + 4); c.lineTo(rx - 20, ry); c.stroke();
    // そり
    c.strokeStyle = L; c.lineWidth = 3; c.fillStyle = '#D8343F';
    c.beginPath(); c.moveTo(x - 44, y - 20); c.lineTo(x + 30, y - 20); c.quadraticCurveTo(x + 40, y + 4, x + 22, y + 14); c.lineTo(x - 40, y + 14); c.quadraticCurveTo(x - 52, y - 2, x - 44, y - 20); c.fill(); c.stroke();
    c.strokeStyle = '#F2C230'; c.lineWidth = 4; c.beginPath(); c.moveTo(x - 46, y + 24); c.lineTo(x + 30, y + 24); c.quadraticCurveTo(x + 46, y + 24, x + 44, y + 12); c.stroke();
    c.strokeStyle = '#F2C230'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 30, y + 14); c.lineTo(x - 30, y + 24); c.moveTo(x + 10, y + 14); c.lineTo(x + 10, y + 24); c.stroke();
    if (gifts > 0) drawGift(c, x - 36, y - 26, 9, '#4FAE5B', '#FFFFFF');
  }
  function drawThing(c, t) {
    c.lineWidth = 3; c.strokeStyle = L;
    if (t.k === 'gift') drawGift(c, t.x, t.y + Math.sin(g.time * 4 + t.ph) * 4, 13, ['#4FAE5B', '#4C8FD6', '#C08BF0'][t.ph % 3 | 0]);
    else if (t.k === 'bird') {
      const f = Math.sin(g.time * 14 + t.ph) * 10;
      c.fillStyle = '#3B3C4A'; c.beginPath(); c.ellipse(t.x, t.y, 16, 11, 0, 0, 7); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(t.x - 4, t.y - 4); c.lineTo(t.x + 6, t.y - 22 - f); c.lineTo(t.x + 12, t.y - 4); c.fill(); c.stroke();
      c.fillStyle = '#F7A21E'; c.beginPath(); c.moveTo(t.x - 16, t.y - 2); c.lineTo(t.x - 26, t.y + 2); c.lineTo(t.x - 15, t.y + 5); c.fill();
      c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(t.x - 8, t.y - 3, 3, 0, 7); c.fill();
    } else if (t.k === 'cloud') {
      c.fillStyle = '#5A5E78'; c.beginPath(); c.arc(t.x - 24, t.y + 4, 20, 0, 7); c.arc(t.x, t.y - 8, 26, 0, 7); c.arc(t.x + 26, t.y + 4, 20, 0, 7); c.fill(); c.stroke();
      c.fillStyle = '#5A5E78'; c.fillRect(t.x - 40, t.y + 2, 80, 20);
      if (Math.floor(g.time * 6 + t.ph) % 3 === 0) { c.fillStyle = '#FFD23F'; c.beginPath(); c.moveTo(t.x - 4, t.y + 20); c.lineTo(t.x - 14, t.y + 44); c.lineTo(t.x - 2, t.y + 40); c.lineTo(t.x - 10, t.y + 60); c.lineTo(t.x + 10, t.y + 32); c.lineTo(t.x - 2, t.y + 34); c.lineTo(t.x + 6, t.y + 20); c.fill(); c.stroke(); }
    }
  }
  function hud() { g.hud(`<span style="color:#E0573F">${'♥'.repeat(lives)}</span><span style="color:#D6C8B8">${'♥'.repeat(3 - lives)}</span>　🎁${gifts}`); }
  function drop() {
    if (gifts <= 0) { g.pop('プレゼントが ないよ', sx, py - 40, '#FFFFFF', 16); g.se('bad'); return; }
    gifts--; hud(); drops.push({ x: sx - 30, y: py - 10, vy: 60 }); g.se('pop');
  }

  EG.register('xmas', {
    title: 'サンタのそり', time: 60, goal: '10けん 配達',
    how: ['ゆびを 上下に うごかして そりを とばそう', 'えんとつの 上で「なげる」（または タップ）→ プレゼントを 入れよう', '鳥・かみなり雲に ぶつかると ♥が へる。🎁は とんでいる プレゼントで ふえる'],
    tiers: [[0, 'こんどは もっと とどけるにゃ！'], [600, 'みんな よろこんでたにゃ〜'], [1500, 'サンタさんも びっくりの 名ドライバーにゃ！']],
    coins: (s, sc) => sc / 22, cleared: s => (s.deliver || 0) >= 10, rec: s => s.deliver,   // v10.4.1：記録は 配達の数
    endTitle: s => s.out ? 'そりが こわれちゃった…' : 'おしまい！',
    init(api) {
      g = api; lives = 3; gifts = 5; houses = []; things = []; drops = []; snow = []; scroll = 0; spawnT = 1.2; hitT = 0; keyDir = 0; downAt = 0;
      g.stats.deliver = 0; g.stats.maxCombo = 0;
      this.resize(api);
      py = ty = g.H * .35;
      for (let x = g.W * .7; x < g.W * 2.2; x += g.rnd(170, 240)) newHouse(x);
      cat = g.cat(); hud();
    },
    resize() {
      groundY = g.H - Math.max(60, g.H * .09); sx = Math.max(90, g.W * .3);
      btn = { x: g.W - 54, y: groundY - 150, r: 40 };
      makeBg();
    },
    down(x, y) {
      if (Math.hypot(x - btn.x, y - btn.y) < btn.r + 6) { drop(); downAt = 0; return; }
      downAt = performance.now(); downPos = [x, y]; this.ydrag = py - y;
    },
    move(x, y, pressed) { if (pressed && downAt) ty = y + this.ydrag; },
    up(x, y) { if (downAt && performance.now() - downAt < 200 && Math.hypot(x - downPos[0], y - downPos[1]) < 12) drop(); downAt = 0; },
    key(k, on, e) { if (k === 'ArrowUp') keyDir = on ? -1 : 0; else if (k === 'ArrowDown') keyDir = on ? 1 : 0; else if ((k === ' ' || k === 'Enter') && on) { e.preventDefault(); drop(); } },
    update(dt) {
      speed = 150 + g.time * 3.2;
      const top = g.H * .16, bot = groundY - 175;
      if (keyDir) ty += keyDir * 360 * dt;
      ty = g.clamp(ty, top, bot); py += (ty - py) * Math.min(1, dt * 10);
      hitT = Math.max(0, hitT - dt);
      // 家
      houses.forEach(h => { h.x -= speed * dt; });
      while (houses.length && houses[0].x + houses[0].w < -40) houses.shift();
      const lastH = houses[houses.length - 1]; if (!lastH || lastH.x < g.W + 60) newHouse((lastH ? lastH.x + lastH.w : g.W) + g.rnd(80, 170));
      // とぶもの
      spawnT -= dt;
      if (spawnT <= 0) {
        const r = Math.random(), lvl = Math.min(1, g.time / 50);
        const k = r < .38 ? 'gift' : r < .38 + .34 + lvl * .1 ? 'bird' : 'cloud';
        things.push({ k, x: g.W + 50, y: g.rnd(top, bot + 10), ph: g.rnd(0, 6), v: k === 'bird' ? g.rnd(60, 130) : k === 'cloud' ? 10 : 0 });
        spawnT = g.rnd(.9, 1.5) - lvl * .35;
      }
      for (let i = things.length - 1; i >= 0; i--) {
        const t = things[i]; t.x -= (speed + t.v) * dt; if (t.k === 'bird') t.y += Math.sin(g.time * 3 + t.ph) * 30 * dt;
        if (t.x < -60) { things.splice(i, 1); continue; }
        const dx = t.x - sx, dy = t.y - (py - 10), hit = t.k === 'gift' ? Math.abs(dx) < 50 && Math.abs(dy) < 42 : t.k === 'bird' ? Math.abs(dx) < 46 && Math.abs(dy) < 30 : Math.abs(dx) < 62 && Math.abs(dy) < 34;
        if (!hit) continue;
        if (t.k === 'gift') { things.splice(i, 1); gifts = Math.min(MAXG, gifts + 1); g.add(10, t.x, t.y); g.se('get'); hud(); continue; }
        if (hitT > 0) continue;
        things.splice(i, 1); lives--; hitT = 1.3; g.combo(0); hud(); g.se('bad'); g.buzz([40, 30, 40]); g.burst(sx, py, t.k === 'bird' ? '#3B3C4A' : '#FFD23F', 14, 200);
        g.pop(t.k === 'bird' ? 'ゴツン！' : 'ビリビリ！', sx, py - 50, '#FF8A7A');
        if (lives <= 0) { g.end({ out: true }); return; }
      }
      // なげた プレゼント（そりと同じ はやさで 前に すすむので、画面では まっすぐ 下に おちる）
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i], y0 = d.y; d.vy += 900 * dt; d.y += d.vy * dt;
        let done = false;
        for (const h of houses) {
          const ch = chimney(h);
          if (y0 <= ch.y && d.y >= ch.y && Math.abs(d.x - ch.x) < ch.w / 2 + 12) {
            done = true;
            if (h.done) { g.pop('もう とどいてる', d.x, ch.y - 20, '#FFFFFF', 16); break; }
            h.done = true; const n = g.comboN + 1; g.combo(n); g.stats.deliver++; g.stats.maxCombo = Math.max(g.stats.maxCombo, n);
            const p = Math.abs(d.x - ch.x) < 7 ? 150 : 100; g.add(p * (1 + Math.min(4, n - 1) * .25), ch.x, ch.y - 30, '#FFE07A');
            if (p === 150) g.pop('ど真ん中！', ch.x, ch.y - 60, '#FFFFFF', 18);
            g.se('coin'); g.burst(ch.x, ch.y, '#FFE07A', 12, 160); g.live(`配達 ${g.stats.deliver}けん`);
            break;
          }
          if (d.x > h.x - 4 && d.x < h.x + h.w + 4 && d.y > houseRoofY(h) + (Math.abs(d.x - (h.x + h.w / 2)) / (h.w / 2)) * h.h * .42 - 6) { done = true; g.combo(0); g.pop('おしい！', d.x, d.y - 20, '#FFFFFF', 16); break; }
        }
        if (!done && d.y > groundY) { done = true; g.combo(0); g.burst(d.x, groundY, '#FFFFFF', 6, 90); }
        if (done) drops.splice(i, 1);
      }
      // ゆき
      if (!g.reduced && snow.length < 50 && Math.random() < .6) snow.push({ x: g.rnd(0, g.W + 100), y: -5, v: g.rnd(30, 70), r: g.rnd(1.5, 3.5) });
      for (let i = snow.length - 1; i >= 0; i--) { const s = snow[i]; s.y += s.v * dt; s.x -= (speed * .3) * dt; if (s.y > g.H) snow.splice(i, 1); }
    },
    draw(c) {
      if (bg) c.drawImage(bg, 0, 0, g.W, g.H);
      c.fillStyle = 'rgba(255,255,255,.85)'; snow.forEach(s => { c.beginPath(); c.arc(s.x, s.y, s.r, 0, 7); c.fill(); });
      houses.forEach(h => drawHouse(c, h));
      things.forEach(t => drawThing(c, t));
      drops.forEach(d => drawGift(c, d.x, d.y, 11));
      // ねらいの線（そりの下）
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.setLineDash([6, 8]); c.lineWidth = 2; c.beginPath(); c.moveTo(sx - 30, py + 30); c.lineTo(sx - 30, groundY); c.stroke(); c.setLineDash([]);
      const blink = hitT > 0 && Math.floor(hitT * 10) % 2;
      c.globalAlpha = blink ? .45 : 1; drawSleigh(c, sx, py); c.globalAlpha = 1;
      cat.el.style.opacity = blink ? .45 : 1;
      cat.set(sx - 6, py - 6, 62, { rot: -4 });
      // なげるボタン
      c.lineWidth = 4; c.strokeStyle = L; c.fillStyle = gifts ? '#D8343F' : '#B9A48E';
      c.beginPath(); c.arc(btn.x, btn.y, btn.r, 0, 7); c.fill(); c.stroke();
      drawGift(c, btn.x, btn.y - 6, 12, '#FFFFFF', '#F2C230');
      c.fillStyle = '#FFFFFF'; c.font = '900 13px "Zen Maru Gothic", sans-serif'; c.textAlign = 'center'; c.fillText('なげる', btn.x, btn.y + 26);
    }
  });
})();
