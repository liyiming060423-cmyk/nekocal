// にゃんカロ イベントのミニゲーム：お正月「鏡餅タワー」（v10.4。v10.4.1：10だんより上で 点の字が 見えないのを なおした）
// 上で ゆれている おもちを、タップで おとして つみあげる。ずれると タワーが かたむき、かたむきすぎると たおれる。はみだしすぎた おもちは おちて ♥が へる
'use strict';
(() => {
  const L = EG.util.line, rr = EG.util.rr;
  const MH = 44;   // おもち1つの高さ
  let g, cat, img, blocks, cur, falling, lives, cam, camT, baseX, baseY, baseW, swing, dir, topple, wob, catHop;

  function newCur() {
    const w = g.clamp(baseW * g.rnd(.72, .98) - blocks.length * 1.2, baseW * .5, baseW);
    const sp = 120 + Math.min(220, blocks.length * 12);
    cur = { x: g.W / 2, w, sp, t: g.rnd(0, 6), orange: (blocks.length + 1) % 10 === 0 };
  }
  function towerTop() { return blocks.length ? blocks[blocks.length - 1] : { x: baseX, w: baseW, y: baseY + MH }; }
  // かさなりの重心：i だん目より上の 重さの 中心が、i だん目の上に のっているか
  function stable() {
    for (let i = -1; i < blocks.length - 1; i++) {
      const sup = i < 0 ? { x: baseX, w: baseW } : blocks[i];
      let m = 0, sx = 0; for (let j = i + 1; j < blocks.length; j++) { m += blocks[j].w; sx += blocks[j].x * blocks[j].w; }
      if (!m) continue;
      if (Math.abs(sx / m - sup.x) > sup.w / 2) return false;
    }
    return true;
  }
  function lean() {   // ぜんたいの かたむき（見た目）
    let m = 0, sx = 0; blocks.forEach(b => { m += b.w; sx += b.x * b.w; });
    return m ? g.clamp((sx / m - baseX) / (baseW / 2), -1, 1) : 0;
  }
  function drawMochi(c, x, y, w, orange) {
    c.lineWidth = 3; c.strokeStyle = L;
    c.fillStyle = '#FBF7EE'; c.beginPath(); c.moveTo(x - w / 2, y); c.bezierCurveTo(x - w / 2 - 4, y - MH * 1.05, x + w / 2 + 4, y - MH * 1.05, x + w / 2, y); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.ellipse(x - w * .18, y - MH * .55, w * .16, MH * .14, -.2, 0, 7); c.fill();
    c.strokeStyle = 'rgba(200,180,140,.45)'; c.beginPath(); c.moveTo(x - w * .4, y - 4); c.quadraticCurveTo(x, y + 2, x + w * .4, y - 4); c.stroke();
    if (orange) {
      c.strokeStyle = L; c.fillStyle = '#F7A21E'; c.beginPath(); c.arc(x, y - MH - 14, 18, 0, 7); c.fill(); c.stroke();
      c.fillStyle = '#4FA35A'; c.beginPath(); c.ellipse(x + 12, y - MH - 32, 12, 6, -.5, 0, 7); c.fill(); c.stroke();
    }
  }
  function drawBase(c) {
    const x = baseX, y = baseY;
    c.lineWidth = 3; c.strokeStyle = L;
    c.fillStyle = '#E6B873'; c.beginPath(); c.moveTo(x - baseW * .5 - 18, y); c.lineTo(x + baseW * .5 + 18, y); c.lineTo(x + baseW * .5 + 8, y + 18); c.lineTo(x - baseW * .5 - 8, y + 18); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#D9A55A'; c.fillRect(x - baseW * .38, y + 18, baseW * .76, 56); c.strokeRect(x - baseW * .38, y + 18, baseW * .76, 56);
    c.fillStyle = '#7A4A2A'; c.beginPath(); c.arc(x, y + 48, 13, 0, 7); c.fill();
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.moveTo(x - baseW * .48, y - 1); c.lineTo(x, y - 14); c.lineTo(x + baseW * .48, y - 1); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = '#D8343F'; c.lineWidth = 4; c.beginPath(); c.moveTo(x - baseW * .46, y - 3); c.lineTo(x, y - 12); c.lineTo(x + baseW * .46, y - 3); c.stroke();
  }
  // v10.4.1：タワーの 位置（カメラで 上に うごく）→ 画面の 位置。点の 字・つぶは 画面の 位置で かく（10だんより 上で 字が 見えなかった）
  const sy = y => y - cam;
  function hearts() { g.hud(`<span style="color:#E0573F">${'♥'.repeat(lives)}</span><span style="color:#D6C8B8">${'♥'.repeat(3 - lives)}</span>`); }

  EG.register('newyear', {
    title: '鏡餅タワー', time: 0, goal: '10だん つむ',
    how: ['ゆれている おもちを タップで おとそう', 'まん中に のせるほど 点が高い。ぴったりで コンボ', 'ずれると タワーが かたむく。はみだした おもちは おちて ♥が へる'],
    tiers: [[0, 'おもちは むずかしいにゃ…つぎこそ！'], [800, 'りっぱな 鏡もちが できたにゃ！'], [1800, 'たかい たかい 鏡もち！ ことしは いい年にゃ！']],
    coins: (s, sc) => sc / 18, cleared: s => (s.layers || 0) >= 10, rec: s => s.layers,
    endTitle: s => s.fall ? 'タワーが たおれた！' : 'おもちが なくなった…',
    init(api) {
      g = api; blocks = []; falling = []; lives = 3; cam = camT = 0; topple = null; wob = 0; catHop = 0;
      g.stats.layers = 0; g.stats.perfect = 0;
      if (!img) { img = new Image(); img.src = 'ev-newyear-home.webp'; }
      this.resize(api); newCur();
      cat = g.cat(); hearts();
    },
    // 自動テスト用：ぴったり n だん つむ（1だんごとに おちたあと 0.75秒 すすめる＝ふつうに あそぶときの 間）
    t: { stack(n) { for (let i = 0; i < n; i++) { const t2 = towerTop(); falling.push({ x: t2.x, y: t2.y - MH - 1, w: baseW * .8, vy: 0 }); cur = null; this.step(); } }, step() { for (let k = 0; k < 30 && falling.length; k++) EGT.def.update(1 / 60); for (let k = 0; k < 45; k++) EGT.def.update(1 / 60); }, get cam() { return cam; }, get layers() { return blocks.length; } },
    resize() { baseW = Math.min(210, g.W * .46); baseX = g.W / 2; baseY = g.H - Math.max(110, g.H * .17); },
    down() {
      if (cur && !topple) { falling.push({ x: cur.x, y: cur.y, w: cur.w, vy: 0, orange: cur.orange }); cur = null; g.se('tap'); }
    },
    key(k, on, e) { if ((k === ' ' || k === 'Enter') && on) { e.preventDefault(); this.down(); } },
    update(dt) {
      catHop = Math.max(0, catHop - dt);
      if (topple) {
        topple.a += topple.dir * dt * (0.6 + topple.a * topple.dir * 3); topple.t += dt;
        if (topple.t > 1.4) g.end({ fall: true });
        return;
      }
      const top = towerTop(), dropY = top.y - MH * 4.2;   // ゆれる高さ（タワーの上から すこし上）
      if (cur) { cur.t += dt * cur.sp / 100; cur.x = g.W / 2 + Math.sin(cur.t) * (g.W / 2 - cur.w / 2 - 14); cur.y = dropY; }
      for (let i = falling.length - 1; i >= 0; i--) {
        const f = falling[i]; f.vy += 1500 * dt; f.y += f.vy * dt;
        if (f.off) { f.x += f.vx * dt; f.rot += f.vr * dt; if (f.y > g.H + cam + 200) falling.splice(i, 1); continue; }
        const t2 = towerTop(), landY = t2.y - MH;
        if (f.y >= landY) {
          const off = f.x - t2.x, lim = t2.w / 2 * .96;   // おもちの まん中が 下の おもちから はみだしたら おちる
          if (Math.abs(off) > lim) {   // はみだし：おちる
            f.off = true; f.vx = Math.sign(off) * 140; f.vr = Math.sign(off) * 4; f.rot = 0; f.y = landY;
            lives--; hearts(); g.combo(0); g.se('bad'); g.buzz([40, 30, 40]); g.pop('ポロッ！', f.x, sy(landY - 30), '#FF8A7A');
            if (lives <= 0) setTimeout(() => g.end({}), 600);
            else newCur();
            continue;
          }
          falling.splice(i, 1);
          const perfect = Math.abs(off) < 6;
          const b = { x: perfect ? t2.x : f.x, w: f.w, y: landY, orange: f.orange };
          blocks.push(b); g.stats.layers = blocks.length;
          if (perfect) { g.stats.perfect++; const n = g.comboN + 1; g.combo(n); g.add(150 + Math.min(5, n) * 30, b.x, sy(b.y - 50), '#FFE07A'); g.pop('ぴったり！', b.x, sy(b.y - 80), '#FFFFFF', 20); g.se('coin'); catHop = .5; }
          else { g.combo(0); g.add(Math.round(100 - Math.abs(off) / lim * 60), b.x, sy(b.y - 50)); g.se('get'); }
          if (b.orange) { g.add(200, b.x, sy(b.y - 110), '#FFB04A'); g.pop('だいだい ボーナス！', b.x, sy(b.y - 140), '#FFFFFF', 18); }
          g.burst(b.x, sy(b.y), '#FFFFFF', 8, 120); wob = 1;
          g.live(`${blocks.length}だん`);
          if (!stable()) { topple = { a: 0, dir: Math.sign(lean()) || 1, t: 0 }; g.se('bad'); g.buzz([60, 40, 60]); return; }
          newCur();
        }
      }
      wob = Math.max(0, wob - dt * 2.2);
      const topY = towerTop().y; camT = Math.min(0, topY - g.H * .55); cam += (camT - cam) * Math.min(1, dt * 4);
    },
    draw(c) {
      if (img && img.complete && img.naturalWidth) {
        const s = Math.max(g.W / img.naturalWidth, g.H / img.naturalHeight), w = img.naturalWidth * s, h = img.naturalHeight * s;
        c.drawImage(img, (g.W - w) / 2, (g.H - h) / 2 - cam * .25, w, h);
      } else { c.fillStyle = '#FFE7C8'; c.fillRect(0, 0, g.W, g.H); }
      c.fillStyle = 'rgba(255,246,230,.45)'; c.fillRect(0, 0, g.W, g.H);
      c.save(); c.translate(0, -cam);
      drawBase(c);
      // タワー（かたむき＋ゆれ）
      const ln = lean(), ang = topple ? topple.a : ln * .06 + Math.sin(g.time * 18) * .015 * wob;
      c.save(); c.translate(baseX, baseY); c.rotate(ang); c.translate(-baseX, -baseY);
      blocks.forEach(b => drawMochi(c, b.x, b.y, b.w, b.orange && b === blocks[blocks.length - 1]));
      c.restore();
      falling.forEach(f => { c.save(); c.translate(f.x, f.y); c.rotate(f.rot || 0); drawMochi(c, 0, 0, f.w, f.orange); c.restore(); });
      if (cur) {
        c.strokeStyle = 'rgba(74,42,26,.35)'; c.setLineDash([5, 7]); c.lineWidth = 2; c.beginPath(); c.moveTo(cur.x, cur.y + 4); c.lineTo(cur.x, towerTop().y - MH); c.stroke(); c.setLineDash([]);
        drawMochi(c, cur.x, cur.y, cur.w, cur.orange);
      }
      c.restore();
      // 高さの目もり
      c.fillStyle = 'rgba(255,255,255,.9)'; rr(c, 10, g.H - 52, 86, 40, 12); c.fill(); c.lineWidth = 3; c.strokeStyle = L; c.stroke();
      c.fillStyle = L; c.font = '900 18px "Zen Maru Gothic", sans-serif'; c.textAlign = 'center'; c.fillText(`${blocks.length} だん`, 53, g.H - 25);
      const cw = Math.min(84, g.W * .2), hop = catHop > 0 ? Math.sin(catHop / .5 * Math.PI) * 18 : 0;
      cat.set(g.W - cw * .6, baseY + 74 - cam - hop, cw, { flip: true });
    }
  });
})();
