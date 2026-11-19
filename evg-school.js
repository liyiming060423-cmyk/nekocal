// にゃんカロ イベントのミニゲーム：新学年「ねこの通学路」（v10.4）
// 家（いえ）から 学校まで、きめられた 歩数のうちに たどりつく。工事中・川は とおれない。ねこトンネルは もう1つの トンネルへ ワープ。さくらを ひろうと ボーナス
// 1回で 3つの 地図（9つの中から えらぶ）。となりの マスを タップ（スワイプ・矢印キーでも）
'use strict';
(() => {
  const L = EG.util.line, rr = EG.util.rr;
  const R = 8, C = 6, SLACK = 4;   // 歩数の よゆう（いちばん みじかい道 ＋ SLACK）
  const MAPS = [
['##S###',
 '#....#',
 '#.##*#',
 '#..#.#',
 '*#...#',
 '..#.##',
 '.*..*.',
 'H.###.'],
['#S####',
 '#..*.#',
 '##.#.#',
 '*..#..',
 '.###.#',
 '.~~~.*',
 '..*...',
 '####.H'],
['###S##',
 'A..*.#',
 '####.#',
 '*...~~',
 '.##..*',
 '.#B#.#',
 '..*...',
 'H#####'],
['S.~~~~',
 '.#*..A',
 '.####.',
 '..*..#',
 '##.#..',
 '*....#',
 '.#~~B#',
 '...H.*'],
['####S#',
 '*.....',
 '.#~~#.',
 '.#*#..',
 '..##.#',
 '#*...*',
 '#.###.',
 'H.....'],
['##S###',
 '*.A..#',
 '####.*',
 '..*..#',
 '.~~~##',
 '..B..*',
 '#.##..',
 '#.H..#'],
['#####S',
 '..*...',
 '.####.',
 '.#*...',
 '.#.###',
 '...~~*',
 '##.*..',
 'H....#'],
['S#####',
 '.*.A.#',
 '###.##',
 '*.....',
 '.#~#.#',
 '.#*#B.',
 '....#.',
 '##H..*'],
['##S###',
 '#.*.##',
 '#.#..*',
 '*.#.#.',
 '..#...',
 '.###.#',
 '*..*..',
 '##H###'],
];
  let g, cat, order, mi, grid, pos, from, moveT, steps, limit, tp, cell, ox, oy, msg, msgT, swipe, wait, petals;

  function shortest(m) {
    let s, goal; const t = {};
    m.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === 'H') s = [r, c]; if (ch === 'S') goal = [r, c]; if (ch === 'A' || ch === 'B') t[ch] = [r, c]; }));
    const d = { [s]: 0 }, q = [s];
    while (q.length) {
      const [r, c] = q.shift();
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        let nr = r + dr, nc = c + dc; if (nr < 0 || nr >= R || nc < 0 || nc >= C) continue;
        const ch = m[nr][nc]; if (ch === '#' || ch === '~') continue;
        if ((ch === 'A' || ch === 'B') && t.A && t.B) [nr, nc] = t[ch === 'A' ? 'B' : 'A'];
        if (d[[nr, nc]] !== undefined) continue; d[[nr, nc]] = d[[r, c]] + 1; q.push([nr, nc]);
      }
    }
    return d[goal];
  }
  function load() {
    const m = MAPS[order[mi]];
    grid = m.map(row => [...row]); tp = {};
    grid.forEach((row, r) => row.forEach((ch, c) => { if (ch === 'H') pos = [r, c]; if (ch === 'A' || ch === 'B') tp[ch] = [r, c]; }));
    from = pos.slice(); moveT = 1; steps = 0; limit = shortest(m) + SLACK; petals = 0; wait = 0;
    say(`${mi + 1}つめの 道！ ${limit}歩 いないに 学校へ`);
    hud();
  }
  function hud() { g.hud(`<span style="font-size:13px">${mi + 1}/3</span>　のこり <b style="color:${limit - steps <= 2 ? '#E0573F' : 'inherit'}">${Math.max(0, limit - steps)}</b>歩`); }
  function say(t) { msg = t; msgT = 2.2; g.live(t); }
  const cx = c => ox + c * cell + cell / 2, cy = r => oy + r * cell + cell / 2;
  function tryMove(dr, dc) {
    if (wait > 0 || moveT < 1) return;
    let nr = pos[0] + dr, nc = pos[1] + dc;
    if (nr < 0 || nr >= R || nc < 0 || nc >= C) return;
    const ch = grid[nr][nc];
    if (ch === '#' || ch === '~') { g.se('bad'); g.pop(ch === '#' ? '工事中！' : '川だ！', cx(nc), cy(nr), '#FF8A7A', 16); g.buzz(20); return; }
    from = pos.slice(); pos = [nr, nc]; moveT = 0; steps++; g.se('tap');
    if (ch === '*') { grid[nr][nc] = '.'; petals++; g.stats.petals++; g.add(60, cx(nc), cy(nr) - 20, '#FFC2D6'); g.se('get'); g.burst(cx(nc), cy(nr), '#F7B6CC', 8, 120); }
    if ((ch === 'A' || ch === 'B') && tp.A && tp.B) { const to = tp[ch === 'A' ? 'B' : 'A']; this_warp = to; }
    hud();
  }
  let this_warp = null;
  function arrive() {
    const ch = grid[pos[0]][pos[1]];
    if (this_warp) { const w = this_warp; this_warp = null; from = pos.slice(); pos = w; moveT = .2; g.se('jump'); g.pop('ワープ！', cx(w[1]), cy(w[0]) - 30, '#BFE3F8', 16); return; }
    if (ch === 'S') {
      const left = limit - steps; g.stats.reached++;
      g.add(300 + left * 40, cx(pos[1]), cy(pos[0]) - 30, '#FFE07A'); g.se('clear'); g.burst(cx(pos[1]), cy(pos[0]), '#F7B6CC', 18, 200);
      const n = g.comboN + 1; g.combo(n); say(left >= SLACK ? 'さいたん ルート！ はやいにゃ！' : 'まにあった！'); next(); return;
    }
    if (steps >= limit) { g.combo(0); g.se('bad'); say('ちこく〜！ つぎの 道へ'); g.buzz([40, 30, 40]); next(); }
  }
  function next() { wait = 1.4; }

  EG.register('school', {
    title: 'ねこの通学路', time: 90, goal: '3つの道で ぜんぶ 学校に つく',
    how: ['となりの マスを タップ（スワイプでも）して すすもう', 'きめられた 歩数のうちに 学校へ。工事中・川は とおれない', '🌸を ひろうと ボーナス。ねこトンネルは もう1つの トンネルへ ワープ'],
    tiers: [[0, 'ちこくしちゃったにゃ…あしたは はやおきにゃ'], [900, 'ちゃんと 学校に ついたにゃ！'], [1500, 'みちあんないの 名人にゃ！ 先生も びっくりにゃ']],
    coins: (s, sc) => sc / 15, cleared: s => (s.reached || 0) >= 3,
    endTitle: s => s.done ? 'きょうの 通学 おしまい！' : 'おしまい！',
    init(api) {
      g = api; g.stats.reached = 0; g.stats.petals = 0; this_warp = null; swipe = null;
      order = [...MAPS.keys()].sort(() => Math.random() - .5).slice(0, 3); mi = 0;
      this.resize(api); load();
      cat = g.cat();
    },
    resize() { cell = Math.floor(Math.min((g.W - 20) / C, (g.H - 190) / R)); ox = Math.round((g.W - cell * C) / 2); oy = Math.round(108 + (g.H - 190 - cell * R) / 2); },
    down(x, y) { swipe = [x, y]; },
    up(x, y) {
      if (!swipe) return; const dx = x - swipe[0], dy = y - swipe[1]; swipe = null;
      if (Math.hypot(dx, dy) > 24) { if (Math.abs(dx) > Math.abs(dy)) tryMove(0, Math.sign(dx)); else tryMove(Math.sign(dy), 0); return; }
      const c = Math.floor((x - ox) / cell), r = Math.floor((y - oy) / cell);
      const dr = r - pos[0], dc = c - pos[1];
      if (Math.abs(dr) + Math.abs(dc) === 1) tryMove(dr, dc);
      else if (dr === 0 && dc) tryMove(0, Math.sign(dc)); else if (dc === 0 && dr) tryMove(Math.sign(dr), 0);
    },
    key(k, on, e) { if (!on) return; const m = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k]; if (m) { e.preventDefault(); tryMove(...m); } },
    update(dt) {
      if (msgT > 0) msgT -= dt;
      if (wait > 0) { wait -= dt; if (wait <= 0) { mi++; if (mi >= 3) { g.end({ done: true }); return; } load(); } return; }
      if (moveT < 1) { moveT = Math.min(1, moveT + dt / .16); if (moveT >= 1) arrive(); }
    },
    draw(c) {
      const gr = c.createLinearGradient(0, 0, 0, g.H); gr.addColorStop(0, '#FFE3EE'); gr.addColorStop(1, '#D9F0C8'); c.fillStyle = gr; c.fillRect(0, 0, g.W, g.H);
      c.fillStyle = '#9ED67A'; rr(c, ox - 6, oy - 6, cell * C + 12, cell * R + 12, 16); c.fill(); c.lineWidth = 4; c.strokeStyle = L; c.stroke();
      for (let r = 0; r < R; r++) for (let col = 0; col < C; col++) {
        const ch = grid[r][col], x = ox + col * cell, y = oy + r * cell, m = cell / 2;
        if (ch === '#' || ch === '~') {
          if (ch === '~') { c.fillStyle = '#6EB8E8'; c.fillRect(x, y, cell, cell); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2; for (let i = 0; i < 2; i++) { c.beginPath(); c.moveTo(x + 6, y + cell * (.35 + i * .3)); c.quadraticCurveTo(x + m, y + cell * (.25 + i * .3), x + cell - 6, y + cell * (.35 + i * .3)); c.stroke(); } }
          else {
            c.fillStyle = '#B7E08F'; c.fillRect(x, y, cell, cell);
            c.save(); c.translate(x + m, y + m);
            c.fillStyle = '#FFFFFF'; rr(c, -m * .78, -m * .32, m * 1.56, m * .5, 4); c.fill(); c.lineWidth = 2.5; c.strokeStyle = L; c.stroke();
            c.save(); rr(c, -m * .78, -m * .32, m * 1.56, m * .5, 4); c.clip(); c.fillStyle = '#F0882A'; for (let i = -3; i < 4; i++) { c.beginPath(); c.moveTo(i * m * .4, -m * .32); c.lineTo(i * m * .4 + m * .2, -m * .32); c.lineTo(i * m * .4 + m * .02, m * .18); c.lineTo(i * m * .4 - m * .18, m * .18); c.fill(); } c.restore();
            c.fillStyle = '#5A3A28'; c.fillRect(-m * .68, m * .18, m * .12, m * .5); c.fillRect(m * .56, m * .18, m * .12, m * .5);
            c.restore();
          }
          continue;
        }
        c.fillStyle = (r + col) % 2 ? '#EDE6DA' : '#F4EEE4'; c.fillRect(x, y, cell, cell);
        c.strokeStyle = 'rgba(160,140,120,.35)'; c.lineWidth = 1; c.strokeRect(x + .5, y + .5, cell - 1, cell - 1);
        if (ch === '*') { const s2 = cell * .2; for (let i = 0; i < 5; i++) { const a = i * 1.256 - Math.PI / 2; c.fillStyle = '#F7B6CC'; c.strokeStyle = L; c.lineWidth = 1.8; c.beginPath(); c.ellipse(x + m + Math.cos(a) * s2 * .6, y + m + Math.sin(a) * s2 * .6, s2 * .45, s2 * .6, a + Math.PI / 2, 0, 7); c.fill(); c.stroke(); } c.fillStyle = '#FFE07A'; c.beginPath(); c.arc(x + m, y + m, s2 * .25, 0, 7); c.fill(); }
        if (ch === 'A' || ch === 'B') { c.fillStyle = ch === 'A' ? '#4C8FD6' : '#8C7BD8'; c.beginPath(); c.ellipse(x + m, y + m + 2, m * .72, m * .5, 0, 0, 7); c.fill(); c.lineWidth = 3; c.strokeStyle = L; c.stroke(); c.fillStyle = '#2A2328'; c.beginPath(); c.ellipse(x + m, y + m + 4, m * .46, m * .3, 0, 0, 7); c.fill(); c.fillStyle = '#FFFFFF'; c.font = `900 ${Math.round(cell * .22)}px "Zen Maru Gothic", sans-serif`; c.textAlign = 'center'; c.fillText('トンネル', x + m, y + cell - 3); }
        if (ch === 'S') {
          c.save(); c.translate(x + m, y + m);
          c.fillStyle = '#F4E2C8'; c.lineWidth = 2.5; c.strokeStyle = L; c.fillRect(-m * .85, -m * .35, m * 1.7, m * 1.15); c.strokeRect(-m * .85, -m * .35, m * 1.7, m * 1.15);
          c.fillStyle = '#C8574A'; c.beginPath(); c.moveTo(-m * .95, -m * .35); c.lineTo(0, -m * .85); c.lineTo(m * .95, -m * .35); c.closePath(); c.fill(); c.stroke();
          c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(0, -m * .5, m * .2, 0, 7); c.fill(); c.stroke(); c.beginPath(); c.moveTo(0, -m * .5); c.lineTo(0, -m * .62); c.moveTo(0, -m * .5); c.lineTo(m * .1, -m * .5); c.stroke();
          c.fillStyle = '#7FB8E8'; [-.55, -.15, .25].forEach(k => { c.fillRect(m * k, -m * .1, m * .3, m * .26); c.strokeRect(m * k, -m * .1, m * .3, m * .26); });
          c.fillStyle = '#7A4A2A'; c.fillRect(-m * .16, m * .32, m * .32, m * .48);
          c.fillStyle = '#F7B6CC'; c.beginPath(); c.arc(m * .8, -m * .5, m * .22, 0, 7); c.arc(-m * .82, -m * .45, m * .18, 0, 7); c.fill();
          c.restore();
          c.fillStyle = '#C2335E'; c.font = `900 ${Math.round(cell * .2)}px "Zen Maru Gothic", sans-serif`; c.textAlign = 'center'; c.fillText('学校', x + m, y + 13);
        }
        if (ch === 'H') { c.save(); c.translate(x + m, y + m); c.fillStyle = '#FFF6E6'; c.lineWidth = 2.5; c.strokeStyle = L; c.fillRect(-m * .5, -m * .1, m, m * .7); c.strokeRect(-m * .5, -m * .1, m, m * .7); c.fillStyle = '#4C8FD6'; c.beginPath(); c.moveTo(-m * .65, -m * .1); c.lineTo(0, -m * .6); c.lineTo(m * .65, -m * .1); c.closePath(); c.fill(); c.stroke(); c.restore(); }
      }
      // となりの マスを 光らせる
      if (moveT >= 1 && wait <= 0) {
        c.strokeStyle = 'rgba(255,210,63,.95)'; c.lineWidth = 3; c.setLineDash([6, 5]);
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => { const r = pos[0] + dr, col = pos[1] + dc; if (r < 0 || r >= R || col < 0 || col >= C) return; const ch = grid[r][col]; if (ch === '#' || ch === '~') return; rr(c, ox + col * cell + 4, oy + r * cell + 4, cell - 8, cell - 8, 8); c.stroke(); });
        c.setLineDash([]);
      }
      // ねこ
      const u = moveT < 1 ? moveT : 1, rr2 = from[0] + (pos[0] - from[0]) * u, cc = from[1] + (pos[1] - from[1]) * u, hop = Math.sin(u * Math.PI) * cell * .18;
      cat.set(cx(cc), oy + rr2 * cell + cell * .98 - hop, cell * .92, { flip: pos[1] < from[1] });
      if (msgT > 0) {
        c.globalAlpha = Math.min(1, msgT * 2); c.font = '900 17px "Zen Maru Gothic", sans-serif'; c.textAlign = 'center';
        const w = c.measureText(msg).width + 28; c.fillStyle = 'rgba(255,255,255,.95)'; rr(c, g.W / 2 - w / 2, g.H - 64, w, 40, 14); c.fill(); c.lineWidth = 3; c.strokeStyle = L; c.stroke();
        c.fillStyle = L; c.fillText(msg, g.W / 2, g.H - 38); c.globalAlpha = 1;
      }
    }
  });
})();
