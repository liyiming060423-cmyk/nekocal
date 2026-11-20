// にゃんカロ イベントのミニゲーム：サマー「金魚すくい」（v10.4）
// 画面を おすと ポイが 水に 入る。金魚の下に うごかして、はなすと すくえる。水の中に いるあいだ・はやく うごかすと ポイが よわくなる
// ポイは 2まい。やぶれたら つぎの ポイ。2まいとも やぶれたら おしまい
// v10.4.1：金魚は おたがいに はなれて およぐ（いっきに すくえるのは ときどき）。コンボは 2秒いないに つぎを すくうと つづく。
//          ときどき「にじいろ金魚」（はやい・数秒で いなくなる・出る前に 水の輪）
'use strict';
(() => {
  const L = EG.util.line, rr = EG.util.rr;
  const KIND = { red: { p: 100, wt: 9, sp: 46, col: '#F0475E', w: .6 }, kohaku: { p: 120, wt: 10, sp: 52, col: '#FFFFFF', w: .2 }, black: { p: 160, wt: 13, sp: 38, col: '#2A2A34', w: .14 }, gold: { p: 400, wt: 15, sp: 82, col: '#FFC23A', w: .06 }, rainbow: { p: 600, wt: 12, sp: 112, col: '#FF7AB8', w: 0 } };
  const GAP = 70;           // 金魚どうしの きょり（これより ちかいと はなれる）
  const COMBO_T = 2;        // コンボが つづく 時間（秒）
  const RARE = { every: [12, 18], stay: 4, warn: .6 };   // にじいろ金魚：何秒ごと・いる時間・出る前の 水の輪
  let g, cat, fish, poi, dur, pois, tub, bowlN, ripples, tearT, catHop, lastPos, comboT, rareT, rareWarn;

  // ほかの 金魚から いちばん はなれた 場所（12こ ためして えらぶ）
  function freeSpot() {
    let best = null, bd = -1;
    for (let i = 0; i < 12; i++) {
      const x = g.rnd(tub.x + 40, tub.x + tub.w - 40), y = g.rnd(tub.y + 40, tub.y + tub.h - 40);
      const d = fish.reduce((m, f) => Math.min(m, Math.hypot(f.x - x, f.y - y)), 1e9);
      if (d > bd) { bd = d; best = [x, y]; } if (d >= GAP * 1.2) break;
    }
    return best;
  }
  function addFish(k, at) {
    if (!k) { let x = Math.random(); k = 'red'; for (const [kk, v] of Object.entries(KIND)) { x -= v.w; if (x < 0) { k = kk; break; } } }
    const a = g.rnd(0, Math.PI * 2), [x, y] = at || freeSpot();
    const f = { k, x, y, a, ta: a, sp: KIND[k].sp, s: k === 'black' ? 1.05 : k === 'gold' ? .95 : k === 'rainbow' ? 1 : g.rnd(.8, 1.05), ph: g.rnd(0, 6), turnT: g.rnd(.5, 2) };
    fish.push(f); return f;
  }
  function rareNext() { rareT = g.rnd(...RARE.every); }
  function drawFish(c, f) {
    c.save(); c.translate(f.x, f.y); c.rotate(f.a); c.scale(f.s, f.s);
    let col = KIND[f.k].col; const wag = Math.sin(g.time * 12 + f.ph) * .35;
    let ba = 1; if (f.k === 'rainbow') { col = `hsl(${(g.time * 160 + f.ph * 40) % 360},90%,64%)`; ba = g.clamp(Math.min(f.life / .4, (RARE.stay - f.life) / .5), .15, 1); }
    c.lineWidth = 2.5; c.strokeStyle = L;
    c.save(); c.translate(-16, 0); c.rotate(wag);
    c.fillStyle = f.k === 'kohaku' ? '#F0475E' : col; c.globalAlpha = .9 * ba;
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-14, -16, -24, -12); c.quadraticCurveTo(-16, 0, -24, 12); c.quadraticCurveTo(-14, 16, 0, 0); c.fill(); c.stroke(); c.restore();
    c.globalAlpha = ba; c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, 18, 10, 0, 0, 7); c.fill(); c.stroke();
    if (f.k === 'kohaku') { c.fillStyle = '#F0475E'; c.beginPath(); c.ellipse(-2, -2, 8, 5, .3, 0, 7); c.fill(); }
    if (f.k === 'gold' || f.k === 'rainbow') { c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(2, -4, 8, 3, 0, 0, 7); c.fill(); }
    const big = f.k === 'black';
    [-1, 1].forEach(d => { c.fillStyle = big ? '#55556A' : '#FFFFFF'; c.beginPath(); c.arc(10, d * (big ? 9 : 5), big ? 6 : 3.4, 0, 7); c.fill(); if (big) c.stroke(); c.fillStyle = big ? '#FFFFFF' : L; c.beginPath(); c.arc(11, d * (big ? 9 : 5), big ? 2.4 : 1.8, 0, 7); c.fill(); });
    c.restore();
  }
  function drawTub(c) {
    c.lineWidth = 5; c.strokeStyle = L; c.fillStyle = '#2E6FB8'; rr(c, tub.x - 12, tub.y - 12, tub.w + 24, tub.h + 24, 26); c.fill(); c.stroke();
    const gr = c.createLinearGradient(0, tub.y, 0, tub.y + tub.h); gr.addColorStop(0, '#A8DDF7'); gr.addColorStop(1, '#6EB8E8');
    c.fillStyle = gr; rr(c, tub.x, tub.y, tub.w, tub.h, 18); c.fill(); c.lineWidth = 3; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const x = tub.x + 30 + ((i * 83 + g.time * 14) % (tub.w - 60)), y = tub.y + 40 + (i * 67) % (tub.h - 80); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 14, y - 5, x + 28, y); c.stroke(); }
  }
  function drawPoi(c) {
    if (!poi || tearT > 0 && !poi.torn) return;
    const { x, y, inW } = poi, R = 36;
    c.save(); c.translate(x, y);
    c.lineWidth = 9; c.strokeStyle = L; c.beginPath(); c.moveTo(R * .7, R * .7); c.lineTo(R * 1.9, R * 1.9); c.stroke();
    c.lineWidth = 6; c.strokeStyle = '#F7A21E'; c.stroke();
    c.fillStyle = inW ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.88)'; c.beginPath(); c.arc(0, 0, R, 0, 7); c.fill();
    if (poi.torn) { c.fillStyle = 'rgba(110,184,232,.9)'; c.beginPath(); c.moveTo(-R * .6, -R * .3); c.lineTo(R * .1, -R * .6); c.lineTo(R * .6, R * .2); c.lineTo(-R * .1, R * .6); c.closePath(); c.fill(); }
    c.lineWidth = 6; c.strokeStyle = L; c.beginPath(); c.arc(0, 0, R, 0, 7); c.stroke(); c.lineWidth = 4; c.strokeStyle = '#F7A21E'; c.stroke();
    // よわさ
    if (inW || dur < 100) { c.lineWidth = 5; c.strokeStyle = dur > 50 ? '#4FAE5B' : dur > 25 ? '#F7C64B' : '#E0573F'; c.beginPath(); c.arc(0, 0, R + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * dur / 100); c.stroke(); }
    c.restore();
  }
  function drawBowl(c) {
    const bx = g.W - 70, by = g.H - 64;
    c.lineWidth = 3; c.strokeStyle = L; c.fillStyle = 'rgba(200,235,255,.85)'; c.beginPath(); c.ellipse(bx, by - 4, 46, 30, 0, 0, 7); c.fill(); c.stroke();
    c.fillStyle = '#F0475E'; for (let i = 0; i < Math.min(8, bowlN); i++) { c.beginPath(); c.ellipse(bx - 26 + (i % 4) * 17, by - 10 + Math.floor(i / 4) * 12, 7, 4, (i % 2 ? .4 : -.4), 0, 7); c.fill(); }
    c.fillStyle = '#FFFFFF'; rr(c, bx - 30, by + 18, 60, 26, 10); c.fill(); c.stroke();
    c.fillStyle = L; c.font = '900 16px "Zen Maru Gothic", sans-serif'; c.textAlign = 'center'; c.fillText(`${bowlN}ひき`, bx, by + 37);
  }
  function hud() { g.hud(`ポイ ${'●'.repeat(pois)}<span style="color:#D6C8B8">${'●'.repeat(2 - pois)}</span>`); }
  function tear() {
    poi.torn = true; tearT = .8; pois--; hud(); g.combo(0); g.se('bad'); g.buzz([60, 40, 60]); g.pop('やぶれた！', poi.x, poi.y - 50, '#FF8A7A', 22);
    if (pois <= 0) setTimeout(() => g.end({ torn: true }), 700);
  }

  EG.register('summer', {
    title: '金魚すくい', time: 60, goal: '10ぴき すくう',
    how: ['画面を おすと ポイが 水に 入る。金魚の下へ そっと うごかそう', 'はなすと すくえる！ 2秒いないに つぎを すくうと コンボ', '水の輪が 出たら にじいろ金魚！ すぐ いなくなるよ', '水の中に ながく いたり、はやく うごかすと ポイが やぶれる（ポイは 2まい）'],
    tiers: [[0, 'ポイって むずかしいにゃ…'], [900, 'おうちに 金魚が ふえたにゃ！'], [1800, 'すくいの 名人！ 夏まつりの ヒーローにゃ！']],
    coins: (s, sc) => sc / 20, cleared: s => (s.fish || 0) >= 10, rec: s => s.fish,
    endTitle: s => s.torn ? 'ポイが ぜんぶ やぶれた！' : 'おしまい！',
    init(api) {
      g = api; fish = []; ripples = []; poi = null; dur = 100; pois = 2; bowlN = 0; tearT = 0; catHop = 0; lastPos = null; comboT = 0; rareWarn = null;
      g.stats.fish = 0; g.stats.gold = 0; g.stats.rare = 0; g.stats.multi = 0; rareNext();
      this.resize(api);
      for (let i = 0; i < 8; i++) addFish();
      cat = g.cat(); hud();
    },
    resize() { const top = 110; tub = { x: 22, y: top, w: g.W - 44, h: g.H - top - 120 }; },
    down(x, y) {
      if (tearT > 0 || pois <= 0) return;
      poi = { x, y, inW: true, torn: false }; lastPos = [x, y]; g.se('splash');
      ripples.push({ x, y, t: 0 });
    },
    move(x, y, pressed) {
      if (!poi || poi.torn) { if (!pressed) poi = poi && poi.torn ? poi : { x, y, inW: false, torn: false }; return; }
      if (pressed && poi.inW) {
        const d = lastPos ? Math.hypot(x - lastPos[0], y - lastPos[1]) : 0; lastPos = [x, y];
        dur -= Math.max(0, d - 6) * .09;   // はやく うごかすと よわくなる
        poi.v = (poi.v || 0) + d;
        if (dur <= 0) { dur = 0; tear(); return; }
      }
      poi.x = x; poi.y = y;
    },
    up(x, y) {
      if (!poi || poi.torn || !poi.inW) return;
      poi.inW = false; lastPos = null;
      const got = fish.filter(f => Math.hypot(f.x - poi.x, f.y - poi.y) < 34);
      if (!got.length) { g.combo(0); g.pop('からっぽ', poi.x, poi.y - 40, '#FFFFFF', 16); return; }
      const need = got.reduce((a, f) => a + KIND[f.k].wt, 0);
      if (need >= dur) { dur = 0; tear(); return; }
      dur -= need;
      let pts = 0; got.forEach(f => { pts += KIND[f.k].p; fish.splice(fish.indexOf(f), 1); bowlN++; g.stats.fish++; if (f.k === 'gold') g.stats.gold++; });
      const n = comboT > 0 ? g.comboN + 1 : 1; g.combo(n); comboT = COMBO_T;   // 2秒いないなら コンボが つづく
      if (got.some(f => f.k === 'rainbow')) { g.stats.rare++; g.pop('にじいろ！', poi.x, poi.y - 96, '#FFE07A', 22); }
      if (got.length > 1) { pts *= 1.5; g.stats.multi++; g.pop(`${got.length}ひき いっきに！`, poi.x, poi.y - 70, '#FFFFFF', 18); }
      g.add(pts * (1 + Math.min(4, n - 1) * .1), poi.x, poi.y - 40);
      g.se(got.some(f => f.k === 'gold' || f.k === 'rainbow') ? 'coin' : 'get'); g.burst(poi.x, poi.y, '#CFEAFF', 10, 150); catHop = .5;
      g.live(`${g.stats.fish}ひき`);
      while (fish.filter(f => f.k !== 'rainbow').length < 7) addFish();
    },
    update(dt) {
      catHop = Math.max(0, catHop - dt);
      if (tearT > 0) { tearT -= dt; if (tearT <= 0 && pois > 0) { dur = 100; poi = null; } }
      if (poi) poi.v = (poi.v || 0) * Math.exp(-8 * dt);
      if (poi && poi.inW && !poi.torn) { dur -= 5.5 * dt; if (dur <= 0) { dur = 0; tear(); } }
      // コンボの 時間
      if (comboT > 0) { comboT -= dt; if (comboT <= 0) { comboT = 0; if (g.comboN) g.combo(0); } }
      // にじいろ金魚：水の輪 → 出てくる → 数秒で いなくなる
      if (!rareWarn && !fish.some(f => f.k === 'rainbow')) { rareT -= dt; if (rareT <= 0) { const [x, y] = freeSpot(); rareWarn = { x, y, t: 0 }; g.live('水の輪！ にじいろ金魚が 来るよ'); } }
      if (rareWarn) { rareWarn.t += dt; if (rareWarn.t >= RARE.warn) { const f = addFish('rainbow', [rareWarn.x, rareWarn.y]); f.life = 0; f.turnT = .3; rareWarn = null; g.se('pop'); } }
      for (let i = fish.length - 1; i >= 0; i--) { const f = fish[i]; if (f.k !== 'rainbow') continue; f.life += dt; if (f.life > RARE.stay) { fish.splice(i, 1); rareNext(); } }
      fish.forEach(f => {
        f.turnT -= dt; if (f.turnT <= 0) { f.ta = f.a + g.rnd(-1.4, 1.4); f.turnT = g.rnd(.6, 2.2); }
        let sp = f.sp;
        if (poi && poi.inW && !poi.torn) {   // ポイが ちかいと にげる
          const dx = f.x - poi.x, dy = f.y - poi.y, d = Math.hypot(dx, dy);
          if (d < 90 && (poi.v || 0) > 22) { f.ta = Math.atan2(dy, dx); sp *= 1.7; }   // はやく うごかしたときだけ
        }
        let da = ((f.ta - f.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI; f.a += da * Math.min(1, dt * 3);
        f.x += Math.cos(f.a) * sp * dt; f.y += Math.sin(f.a) * sp * dt;
        // ほかの 金魚と はなれる（ちかいほど つよく おしあう）
        for (const o of fish) {
          if (o === f) continue; const dx = f.x - o.x, dy = f.y - o.y, d = Math.hypot(dx, dy);
          if (d < GAP && d > .01) { const k = (GAP - d) / GAP; f.x += dx / d * k * 90 * dt; f.y += dy / d * k * 90 * dt; if (k > .4) f.ta = Math.atan2(dy, dx); }
        }
        const m = 26;
        if (f.x < tub.x + m) { f.x = tub.x + m; f.ta = 0; } if (f.x > tub.x + tub.w - m) { f.x = tub.x + tub.w - m; f.ta = Math.PI; }
        if (f.y < tub.y + m) { f.y = tub.y + m; f.ta = Math.PI / 2; } if (f.y > tub.y + tub.h - m) { f.y = tub.y + tub.h - m; f.ta = -Math.PI / 2; }
      });
      for (let i = ripples.length - 1; i >= 0; i--) { ripples[i].t += dt; if (ripples[i].t > .8) ripples.splice(i, 1); }
    },
    // 自動テスト用
    t: { get fish() { return fish; }, get comboT() { return comboT; }, get rareWarn() { return rareWarn; }, get rareT() { return rareT; }, set rareT(v) { rareT = v; },
      catchAt(f) { this.dip(f.x, f.y); EGT.def.up(f.x, f.y); }, dip(x, y) { poi = { x, y, inW: true, torn: false }; dur = 100; },
      minGap() { let m = 1e9; fish.forEach((a, i) => fish.forEach((b, j) => { if (i < j) m = Math.min(m, Math.hypot(a.x - b.x, a.y - b.y)); })); return m; } },
    draw(c) {
      const gr = c.createLinearGradient(0, 0, 0, g.H); gr.addColorStop(0, '#FFE6B8'); gr.addColorStop(1, '#F7C98A'); c.fillStyle = gr; c.fillRect(0, 0, g.W, g.H);
      c.fillStyle = '#E8484F'; for (let x = 0; x < g.W; x += 40) { c.beginPath(); c.moveTo(x, 96); c.lineTo(x + 40, 96); c.lineTo(x + 20, 104); c.fill(); }
      drawTub(c);
      fish.forEach(f => drawFish(c, f));
      c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 2; ripples.forEach(r => { c.globalAlpha = 1 - r.t / .8; c.beginPath(); c.arc(r.x, r.y, 20 + r.t * 50, 0, 7); c.stroke(); }); c.globalAlpha = 1;
      // にじいろ金魚の 水の輪（出る前）・きらきら（いるあいだ）
      if (rareWarn) { c.lineWidth = 3; for (let i = 0; i < 3; i++) { const u = (rareWarn.t / RARE.warn + i / 3) % 1; c.globalAlpha = 1 - u; c.strokeStyle = i % 2 ? '#FFE07A' : '#FFFFFF'; c.beginPath(); c.arc(rareWarn.x, rareWarn.y, 10 + u * 46, 0, 7); c.stroke(); } c.globalAlpha = 1; }
      fish.forEach(f => { if (f.k !== 'rainbow' || g.reduced) return; c.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 3; i++) { const a = g.time * 4 + i * 2.1; c.beginPath(); c.arc(f.x + Math.cos(a) * 26, f.y + Math.sin(a) * 18, 2.4, 0, 7); c.fill(); } });
      // コンボの のこり時間
      if (comboT > 0 && g.comboN >= 1) { const w = 120, x = g.W / 2 - w / 2, y = tub.y + 18; c.fillStyle = 'rgba(255,255,255,.9)'; rr(c, x, y - 8, w, 8, 4); c.fill(); c.fillStyle = '#F7A21E'; rr(c, x, y - 8, w * comboT / COMBO_T, 8, 4); c.fill(); c.lineWidth = 2; c.strokeStyle = L; rr(c, x, y - 8, w, 8, 4); c.stroke(); }
      drawPoi(c);
      drawBowl(c);
      const cw = Math.min(78, g.W * .2), hop = catHop > 0 ? Math.sin(catHop / .5 * Math.PI) * 14 : 0;
      cat.set(54, g.H - 6 - hop, cw);
    }
  });
})();
