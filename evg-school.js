// にゃんカロ イベントのミニゲーム：新学年「ねこの通学路」（v10.4。v10.4.1：地図は 毎回 自動で つくる・3つの しかけ）
// 家（いえ）から 学校まで、きめられた 歩数のうちに たどりつく。工事中・川は とおれない。ねこトンネルは もう1つの トンネルへ ワープ。さくらを ひろうと ボーナス
// 1回で 3つの 地図。だんだん むずかしく、しかけが 1つずつ ふえる：
//   1つめ 🚦信号（1歩 すすむたびに 赤⇄青。赤には 入れない）→ 2つめ ＋⬆一方通行（やじるしの ほうへだけ 入れる）→ 3つめ ＋🐕いぬ（きまった道を いったりきたり。ぶつかると 1マス もどる）
// 地図は 毎回 ちがう。かならず 学校まで 行けるか、いちばん みじかい歩数は いくつか を しらべてから 出す（だめなら つくりなおす）
// となりの マスを タップ（スワイプ・矢印キーでも）
'use strict';
(() => {
  const L = EG.util.line, rr = EG.util.rr;
  const R = 8, C = 6;
  const SLACK = [4, 4, 5];       // 歩数の よゆう（いちばん みじかい道 ＋ これ）。3つめは いぬが いるので 1つ多い
  const MIN = [9, 10, 11];       // いちばん みじかい道が これより 短い地図は つかわない（だんだん 長く）
  const MAX = 18;                // これより 長い地図も つかわない
  const WALL = [.28, .3, .3];    // 工事中の ふえかた
  const ARROW = { '^': [-1, 0], v: [1, 0], '<': [0, -1], '>': [0, 1] };
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const TIP = ['🚦 信号は 1歩ごとに 色が かわる', '⬆ 一方通行は やじるしの ほうへだけ', '🐕 いぬに ぶつかると 1マス もどる'];
  // 自動で つくれなかったときの 地図（v10.4 の 9つ。しかけなし）
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
  let g, cat, mi, map, grid, pos, from, moveT, steps, limit, cell, ox, oy, msg, msgT, swipe, wait, waitT = 0, petals, pend, dogFrom, dogTo;
  const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const same = (a, b) => !!a && !!b && a[0] === b[0] && a[1] === b[1];
  const gcd = (a, b) => b ? gcd(b, a % b) : a;

  /* ---------- しかけの きまり（地図の しらべと あそぶときで 同じものを つかう） ---------- */
  // いぬの いる場所（k 歩め）：dog＝道の マスの ならび。はしまで行ったら もどる
  function dogAt(m, k) {
    const d = m.dog; if (!d) return null;
    const n = d.length, P = 2 * (n - 1), i = ((k % P) + P) % P;
    return d[i < n ? i : P - i];
  }
  // 信号：k 歩め（すすむ前）に 赤か
  const red = (m, r, c, k) => m.sig[r * C + c] !== undefined && (m.sig[r * C + c] + k) % 2 === 1;
  // (r,c) から (dr,dc) へ k 歩めに すすめないわけ（すすめるなら ''）
  function blockWhy(m, gr, r, c, dr, dc, k) {
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nr >= R || nc < 0 || nc >= C) return 'edge';
    const ch = gr[nr][nc];
    if (ch === '#') return 'wall';
    if (ch === '~') return 'river';
    if (ARROW[ch] && (ARROW[ch][0] !== dr || ARROW[ch][1] !== dc)) return 'oneway';
    if (red(m, nr, nc, k)) return 'red';
    if (same(dogAt(m, k), [nr, nc])) return 'dog';
    return '';
  }
  // すすんだ けっか：step＝入るマス、warp＝トンネルの先、final＝さいごの場所（いぬに ぶつかったら もとの マス）
  function moveRes(m, gr, r, c, dr, dc, k) {
    const step = [r + dr, c + dc], ch = gr[step[0]][step[1]];
    const warp = (ch === 'A' || ch === 'B') && m.tp.A && m.tp.B ? m.tp[ch === 'A' ? 'B' : 'A'] : null;
    const dest = warp || step, bumped = same(dogAt(m, k + 1), dest);
    return { step, warp, final: bumped ? [r, c] : dest, bumped };
  }
  // どこにも すすめないとき：赤しんごう・いぬの せいなら 1歩 まつ（'wait'）、工事中・一方通行などで ずっと 出られないなら 'stuck'。すすめるなら ''
  function stuckWhy(m, gr, r, c, k) {
    let soft = false;
    for (const [dr, dc] of DIRS) { const w = blockWhy(m, gr, r, c, dr, dc, k); if (!w) return ''; if (w === 'red' || w === 'dog') soft = true; }
    return soft ? 'wait' : 'stuck';
  }
  // いちばん みじかい歩数（行けなければ null）。じょうたい＝場所 ＋ 何歩めか（信号は 2、いぬは 往復の 歩数で くりかえす）
  function solve(m, wantPath) {
    const gr = m.grid, P = m.dog ? 2 * (m.dog.length - 1) : 2, M = P * 2 / gcd(P, 2);
    let s, goal; gr.forEach((row, r) => row.forEach((ch, c) => { if (ch === 'H') s = [r, c]; if (ch === 'S') goal = [r, c]; }));
    const key = (r, c, k) => (r * C + c) * M + k, prev = new Map([[key(s[0], s[1], 0), null]]), q = [[s[0], s[1], 0, 0]];
    for (let h = 0; h < q.length; h++) {
      const [r, c, k, d] = q[h];
      if (stuckWhy(m, gr, r, c, k) === 'wait') { const k2 = (k + 1) % M, kk = key(r, c, k2); if (!prev.has(kk)) { prev.set(kk, key(r, c, k)); q.push([r, c, k2, d + 1]); } continue; }
      for (const [dr, dc] of DIRS) {
        if (blockWhy(m, gr, r, c, dr, dc, k)) continue;
        const f = moveRes(m, gr, r, c, dr, dc, k).final, k2 = (k + 1) % M, kk = key(f[0], f[1], k2);
        if (prev.has(kk)) continue;
        prev.set(kk, key(r, c, k));
        if (same(f, goal)) {
          if (!wantPath) return d + 1;
          const path = []; for (let x = kk; x !== null; x = prev.get(x)) { const rc = Math.floor(x / M); path.unshift([Math.floor(rc / C), rc % C]); }
          return { n: d + 1, path };
        }
        q.push([f[0], f[1], k2, d + 1]);
      }
    }
    return null;
  }

  /* ---------- 地図を つくる ---------- */
  function tryGen(lv) {
    const gr = Array.from({ length: R }, () => Array(C).fill('.'));
    gr[R - 1][rint(0, C - 1)] = 'H'; gr[0][rint(0, C - 1)] = 'S';
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (gr[r][c] === '.' && Math.random() < WALL[lv]) gr[r][c] = '#';
    if (Math.random() < .55) { const r = rint(2, R - 3), len = rint(2, 4), c0 = rint(0, C - len); for (let i = 0; i < len; i++) if (gr[r][c0 + i] === '.' || gr[r][c0 + i] === '#') gr[r][c0 + i] = '~'; }
    const m = { grid: gr, sig: {}, dog: null, tp: {} };
    const free = () => { const L2 = []; gr.forEach((row, r) => row.forEach((ch, c) => { if (ch === '.') L2.push([r, c]); })); return L2; };
    if (lv >= 1 && Math.random() < .4) { const f = free().sort(() => Math.random() - .5); if (f.length > 8) { const [a, b] = f; if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) > 4) { gr[a[0]][a[1]] = 'A'; gr[b[0]][b[1]] = 'B'; m.tp = { A: a, B: b }; } } }
    const base = solve(m, true);
    if (!base || base.n < MIN[lv] - 2) return null;
    // しかけは いちばん みじかい道の 上に おく（かならず 出会うように）
    const mid = base.path.slice(2, -1).filter(([r, c]) => gr[r][c] === '.').sort(() => Math.random() - .5);
    const dirOf = p => { const i = base.path.findIndex(q => same(q, p)); return [p[0] - base.path[i - 1][0], p[1] - base.path[i - 1][1]]; };
    const nSig = [2, 1, 1][lv];
    for (let i = 0; i < nSig && mid.length; i++) { const [r, c] = mid.pop(); gr[r][c] = 'L'; m.sig[r * C + c] = rint(0, 1); }
    { const f = free(); if (f.length) { const [r, c] = pick(f); gr[r][c] = 'L'; m.sig[r * C + c] = rint(0, 1); } }   // 道の そとにも 1つ
    if (lv >= 1) {
      if (mid.length < 2) return null;
      const toCh = ([dr, dc]) => Object.keys(ARROW).find(k => ARROW[k][0] === dr && ARROW[k][1] === dc);
      let p = mid.pop(), d = dirOf(p); gr[p[0]][p[1]] = toCh([-d[0], -d[1]]);   // 1つは 道と はんたい（まわり道に なる）
      p = mid.pop(); d = dirOf(p); gr[p[0]][p[1]] = toCh(d);                     // 1つは 道と 同じ むき
    }
    if (lv >= 2) {
      const ok = (r, c) => r >= 0 && r < R && c >= 0 && c < C && gr[r][c] === '.';
      let seg = null;
      for (const p of mid) {
        for (const [dr, dc] of (Math.random() < .5 ? [[0, 1], [1, 0]] : [[1, 0], [0, 1]])) {
          let a = 0, b = 0; while (ok(p[0] - dr * (a + 1), p[1] - dc * (a + 1))) a++; while (ok(p[0] + dr * (b + 1), p[1] + dc * (b + 1))) b++;
          if (a + b + 1 < 3) continue;
          const len = Math.min(a + b + 1, rint(3, 4)), st = rint(Math.max(-a, -(len - 1)), Math.min(0, b - len + 1));
          seg = Array.from({ length: len }, (_, i) => [p[0] + dr * (st + i), p[1] + dc * (st + i)]); break;
        }
        if (seg) break;
      }
      if (!seg) return null;
      m.dog = Math.random() < .5 ? seg : seg.reverse();
    }
    const n = solve(m);
    if (!n || n < MIN[lv] || n > MAX) return null;
    const f = free().filter(p => !(m.dog || []).some(q => same(p, q))).sort(() => Math.random() - .5);
    for (let i = 0; i < rint(4, 5) && f.length; i++) { const [r, c] = f.pop(); gr[r][c] = '*'; }
    m.best = n;
    return m;
  }
  function genMap(lv) {
    for (let i = 0; i < 300; i++) { const m = tryGen(lv); if (m) return m; }
    const gr = pick(MAPS).map(row => [...row]), m = { grid: gr, sig: {}, dog: null, tp: {}, fallback: true };   // つくれなかったら 前の地図
    gr.forEach((row, r) => row.forEach((ch, c) => { if (ch === 'A' || ch === 'B') m.tp[ch] = [r, c]; }));
    m.best = solve(m); return m;
  }

  /* ---------- あそぶ ---------- */
  function load() {
    map = genMap(mi); grid = map.grid;
    grid.forEach((row, r) => row.forEach((ch, c) => { if (ch === 'H') pos = [r, c]; }));
    from = pos.slice(); moveT = 1; steps = 0; limit = map.best + SLACK[mi]; petals = 0; wait = 0; waitT = 0; pend = null;
    dogFrom = dogTo = dogAt(map, 0);
    say(`${mi + 1}つめ：${TIP[mi]}`); msgT = 3.2;
    hud();
  }
  function hud() { g.hud(`<span style="font-size:13px">${mi + 1}/3</span>　のこり <b style="color:${limit - steps <= 2 ? '#E0573F' : 'inherit'}">${Math.max(0, limit - steps)}</b>歩`); }
  function say(t) { msg = t; msgT = 2.2; g.live(t); }
  const cx = c => ox + c * cell + cell / 2, cy = r => oy + r * cell + cell / 2;
  const NG = { wall: ['工事中！', ''], river: ['川だ！', ''], oneway: ['一方通行！', 'やじるしの ほうへだけ'], red: ['赤しんごう！', 'つぎの 1歩で 青に なるよ'], dog: ['わんわん！', ''] };
  function tryMove(dr, dc) {
    if (wait > 0 || moveT < 1 || waitT > 0) return;
    const why = blockWhy(map, grid, pos[0], pos[1], dr, dc, steps);
    if (why === 'edge') return;
    const nr = pos[0] + dr, nc = pos[1] + dc;
    if (why) { g.se('bad'); g.pop(NG[why][0], cx(nc), cy(nr), '#FF8A7A', 16); if (NG[why][1]) say(NG[why][1]); g.buzz(20); return; }
    const res = moveRes(map, grid, pos[0], pos[1], dr, dc, steps);
    dogFrom = dogAt(map, steps); dogTo = dogAt(map, steps + 1);
    from = pos.slice(); pos = res.step; moveT = 0; steps++; g.se('tap');
    if (!res.bumped && grid[nr][nc] === '*') { grid[nr][nc] = '.'; petals++; g.stats.petals++; g.add(60, cx(nc), cy(nr) - 20, '#FFC2D6'); g.se('get'); g.burst(cx(nc), cy(nr), '#F7B6CC', 8, 120); }
    pend = res.bumped ? { back: from.slice() } : res.warp ? { warp: res.warp } : null;
    hud();
  }
  function arrive() {
    dogFrom = dogTo;
    if (pend && pend.back) { const b = pend.back; pend = null; g.stats.bumps++; g.se('bad'); g.buzz([30, 20, 30]); g.pop('わんっ！ もどされた', cx(pos[1]), cy(pos[0]) - 30, '#FF8A7A', 16); from = pos.slice(); pos = b; moveT = 0; return; }
    if (pend && pend.warp) { const w = pend.warp; pend = null; from = pos.slice(); pos = w; moveT = .2; g.se('jump'); g.pop('ワープ！', cx(w[1]), cy(w[0]) - 30, '#BFE3F8', 16); return; }
    const ch = grid[pos[0]][pos[1]];
    if (ch === 'S') {
      const left = limit - steps; g.stats.reached++;
      g.add(300 + left * 40, cx(pos[1]), cy(pos[0]) - 30, '#FFE07A'); g.se('clear'); g.burst(cx(pos[1]), cy(pos[0]), '#F7B6CC', 18, 200);
      const n = g.comboN + 1; g.combo(n); say(left >= SLACK[mi] ? 'さいたん ルート！ はやいにゃ！' : 'まにあった！'); next(); return;
    }
    if (steps >= limit) { g.combo(0); g.se('bad'); say('ちこく〜！ つぎの 道へ'); g.buzz([40, 30, 40]); next(); return; }
    stuckCheck();
  }
  // すすめる マスが ない：赤しんごう・いぬ なら 1歩 まつ（自動）。ずっと 出られないなら つぎの 道へ
  function stuckCheck() {
    const w = stuckWhy(map, grid, pos[0], pos[1], steps);
    if (w === 'wait') { waitT = .45; say('まつにゃ…（1歩 つかう）'); }
    else if (w === 'stuck') { g.combo(0); g.se('bad'); say('行きどまり！ つぎの 道へ'); g.buzz([40, 30, 40]); next(); }
  }
  function doWait() {
    dogFrom = dogAt(map, steps); dogTo = dogAt(map, steps + 1); steps++; g.stats.waits++; hud();
    from = pos.slice(); moveT = 0;   // その場で ぴょん（いぬが うごく）
    pend = null;
  }
  function next() { wait = 1.4; }
  function drawDog(c, x, y, s) {
    c.save(); c.translate(x, y); c.lineWidth = 2.5; c.strokeStyle = L;
    c.fillStyle = '#8A5A36'; [-1, 1].forEach(d => { c.beginPath(); c.ellipse(d * s * .42, -s * .12, s * .16, s * .3, d * .35, 0, 7); c.fill(); c.stroke(); });
    c.fillStyle = '#D9A066'; c.beginPath(); c.ellipse(0, 0, s * .42, s * .36, 0, 0, 7); c.fill(); c.stroke();
    c.fillStyle = '#F6DDBB'; c.beginPath(); c.ellipse(0, s * .14, s * .22, s * .16, 0, 0, 7); c.fill();
    c.fillStyle = L; [-1, 1].forEach(d => { c.beginPath(); c.arc(d * s * .15, -s * .06, s * .05, 0, 7); c.fill(); });
    c.beginPath(); c.ellipse(0, s * .08, s * .08, s * .06, 0, 0, 7); c.fill();
    c.fillStyle = '#E8484F'; c.fillRect(-s * .3, s * .28, s * .6, s * .08);
    c.restore();
  }

  EG.register('school', {
    title: 'ねこの通学路', time: 90, goal: '3つの道で ぜんぶ 学校に つく',
    how: ['となりの マスを タップ（スワイプでも）して すすもう', 'きめられた 歩数のうちに 学校へ。工事中・川は とおれない', '🚦信号・⬆一方通行・🐕いぬ に 気をつけて。🌸を ひろうと ボーナス'],
    tiers: [[0, 'ちこくしちゃったにゃ…あしたは はやおきにゃ'], [900, 'ちゃんと 学校に ついたにゃ！'], [1500, 'みちあんないの 名人にゃ！ 先生も びっくりにゃ']],
    coins: (s, sc) => sc / 15, cleared: s => (s.reached || 0) >= 3, rec: s => s.reached,
    endTitle: s => s.done ? 'きょうの 通学 おしまい！' : 'おしまい！',
    init(api) {
      g = api; g.stats.reached = 0; g.stats.petals = 0; g.stats.bumps = 0; g.stats.waits = 0; swipe = null; mi = 0;
      this.resize(api); load();
      cat = g.cat();
    },
    // 自動テスト用
    t: { genMap, solve, dogAt, red, blockWhy, moveRes, stuckWhy, get waitT() { return waitT; }, tryMove: (dr, dc) => tryMove(dr, dc), get map() { return map; }, get pos() { return pos; }, get steps() { return steps; }, get limit() { return limit; }, get mi() { return mi; },
      finish() { for (let i = 0; i < 6 && (moveT < 1 || pend || waitT > 0); i++) { if (waitT > 0) { waitT = 0; doWait(); } moveT = 1; arrive(); } }, setMap(m) { map = m; grid = m.grid; grid.forEach((row, r) => row.forEach((ch, c) => { if (ch === 'H') pos = [r, c]; })); from = pos.slice(); steps = 0; limit = (m.best || 20) + SLACK[mi]; pend = null; moveT = 1; wait = 0; dogFrom = dogTo = dogAt(m, 0); } },
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
      if (waitT > 0) { waitT -= dt; if (waitT <= 0) { waitT = 0; doWait(); } return; }
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
        if (ch === 'L') {   // 信号：いまの色（1歩ごとに かわる）
          const isRed = red(map, r, col, steps);
          c.fillStyle = isRed ? 'rgba(240,80,70,.22)' : 'rgba(80,190,100,.2)'; c.fillRect(x + 1, y + 1, cell - 2, cell - 2);
          c.save(); c.translate(x + m, y + m);
          c.fillStyle = '#5A4A42'; c.fillRect(-m * .08, -m * .1, m * .16, m * .85);
          c.fillStyle = '#3B3436'; rr(c, -m * .56, -m * .62, m * 1.12, m * .58, m * .2); c.fill(); c.lineWidth = 2.5; c.strokeStyle = L; c.stroke();
          [[-.27, '#FF5A4A', isRed], [.27, '#4FD06A', !isRed]].forEach(([dx, col2, on]) => { c.fillStyle = on ? col2 : 'rgba(255,255,255,.18)'; c.beginPath(); c.arc(m * dx, -m * .33, m * .19, 0, 7); c.fill(); if (on && !g.reduced) { c.globalAlpha = .35; c.beginPath(); c.arc(m * dx, -m * .33, m * .3, 0, 7); c.fill(); c.globalAlpha = 1; } });
          c.restore();
        }
        if (ARROW[ch]) {   // 一方通行：やじるしの ほうへだけ 入れる
          const [dr, dc] = ARROW[ch], a = Math.atan2(dr, dc);
          c.save(); c.translate(x + m, y + m);
          c.fillStyle = '#3F7FD0'; c.beginPath(); c.arc(0, 0, m * .62, 0, 7); c.fill(); c.lineWidth = 2.5; c.strokeStyle = L; c.stroke();
          c.rotate(a); c.fillStyle = '#FFFFFF'; c.beginPath(); c.moveTo(m * .44, 0); c.lineTo(m * .04, -m * .34); c.lineTo(m * .04, -m * .13); c.lineTo(-m * .42, -m * .13); c.lineTo(-m * .42, m * .13); c.lineTo(m * .04, m * .13); c.lineTo(m * .04, m * .34); c.closePath(); c.fill();
          c.restore();
        }
        if (ch === 'H') { c.save(); c.translate(x + m, y + m); c.fillStyle = '#FFF6E6'; c.lineWidth = 2.5; c.strokeStyle = L; c.fillRect(-m * .5, -m * .1, m, m * .7); c.strokeRect(-m * .5, -m * .1, m, m * .7); c.fillStyle = '#4C8FD6'; c.beginPath(); c.moveTo(-m * .65, -m * .1); c.lineTo(0, -m * .6); c.lineTo(m * .65, -m * .1); c.closePath(); c.fill(); c.stroke(); c.restore(); }
      }
      // いぬの とおり道（足あと）と いぬ
      if (map.dog) {
        c.fillStyle = 'rgba(138,90,54,.28)';
        map.dog.forEach(([r, col]) => { const x = cx(col), y = cy(r); [[-.18, -.12], [.16, .14]].forEach(([a, b]) => { c.beginPath(); c.arc(x + cell * a, y + cell * b, cell * .07, 0, 7); c.fill(); }); });
        const u = moveT < 1 && !(pend && pend.warp) ? moveT : 1, df = dogFrom || dogTo, dt2 = dogTo || dogFrom;
        drawDog(c, cx(df[1] + (dt2[1] - df[1]) * u), cy(df[0] + (dt2[0] - df[0]) * u), cell * .86);
      }
      // となりの マスを 光らせる（いま 入れる マスだけ）
      if (moveT >= 1 && wait <= 0 && waitT <= 0) {
        c.strokeStyle = 'rgba(255,210,63,.95)'; c.lineWidth = 3; c.setLineDash([6, 5]);
        DIRS.forEach(([dr, dc]) => { if (blockWhy(map, grid, pos[0], pos[1], dr, dc, steps)) return; const r = pos[0] + dr, col = pos[1] + dc; rr(c, ox + col * cell + 4, oy + r * cell + 4, cell - 8, cell - 8, 8); c.stroke(); });
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
