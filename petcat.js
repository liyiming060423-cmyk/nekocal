// にゃんカロ イラスト猫（B案）
// petCatHTML({ idx, dead, mood }) で猫のHTMLを返し、petCatBind(要素) でタップ反応をつける。
//   idx : 体型 -100(骸骨) 〜 0 〜 +100(爆発)。今は絵を横に伸び縮みさせて表現
//   dead: null / 'skel' / 'boom'（骸骨・爆発は今までの SVG を使う）
//   mood: 'normal' / 'hungry' / 'tired'
//   equip: { head, top, hand } … data.js の WEAR のキー
// 画像：同じ大きさ 600×813 の透過PNG を重ねる。
//   cat-body.png（しっぽ以外）/ cat-tail.png（しっぽだけ）/ cat-shirt.png（服だけ）/ cat-gloves.png（手袋だけ）
//   服と手袋は色フィルターで着せかえ色にする（petcat.css の .wear-○○）。
//   組員の新しい絵が届いたら、この4枚を差しかえるだけで見た目が変わる。
var PC_IMG = window.PC_IMG || { body: 'cat-body.png', tail: 'cat-tail.png', shirt: 'cat-shirt.png', gloves: 'cat-gloves.png' };

const PC_W = 1108, PC_H = 1502;            // 部位の座標は元の切り抜き画像の大きさで書く
const PC_TAIL_PIVOT = [900 / PC_W * 100, 935 / PC_H * 100];
// 当たり判定（上から順に優先）: [名前, 中心x, 中心y, 半径x, 半径y]
const PC_ZONES = [
  ['tail', 1000, 890, 115, 135],
  ['ear', 190, 125, 85, 90], ['ear', 635, 85, 85, 90],
  ['hand', 150, 590, 155, 165], ['hand', 825, 470, 145, 140],
  ['head', 440, 300, 345, 235],
  ['foot', 200, 1385, 170, 115], ['foot', 860, 1385, 160, 115],
  ['belly', 550, 760, 310, 180],
  ['pants', 580, 1100, 400, 160]
];

const PC_LINES = {
  head: ['ゴロゴロ…', 'もっとなでて♡', 'ふにゃ〜'],
  ear: ['みみはダメ！', 'くすぐったいにゃ', 'ピクッ'],
  hand: ['シュッ！', 'ワンツー！', 'パンチ見たか！'],
  belly: ['くすぐったいニャ！', 'おなかはヒミツ！', 'ぷにぷに…'],
  pants: ['ひっぱらないで〜', 'ずれるにゃ！'],
  tail: ['シャーッ！', 'しっぽ禁止！'],
  foot: ['ぴょん！', 'ステップ！'],
  dizzy: ['めがまわる〜', '@_@'],
  idle: ['ジム行くにゃ！', 'いい感じにゃ！', 'ふわぁ…', '今日もがんばるにゃ']
};
const pcPick = a => a[Math.floor(Math.random() * a.length)];

function petCatShape(idx) {
  const f = Math.max(-100, Math.min(100, idx || 0)) / 100;
  const fat = Math.max(0, f), thin = Math.max(0, -f);
  return { sx: 1 + 0.32 * fat - 0.22 * thin, sy: 1 - 0.04 * fat + 0.02 * thin, fat, thin };
}

function petCatHTML(o) {
  o = o || {};
  if (o.dead === 'skel') return `<div class="pc pc-dead">${skeletonSVG()}</div>`;
  if (o.dead === 'boom') return `<div class="pc pc-dead">${boomSVG()}</div>`;
  const s = petCatShape(o.idx);
  const cls = ['pc', 'mood-' + (o.mood || 'normal')];
  if (s.fat > 0.5) cls.push('is-fat');
  if (s.thin > 0.6) cls.push('is-thin');
  return `<div class="${cls.join(' ')}" style="--sx:${s.sx.toFixed(3)};--sy:${s.sy.toFixed(3)};--tx:${PC_TAIL_PIVOT[0].toFixed(1)}%;--ty:${PC_TAIL_PIVOT[1].toFixed(1)}%">
    <div class="pc-shape"><div class="pc-act"><div class="pc-idle">
      <img class="pc-tail" src="${PC_IMG.tail}" alt="" draggable="false">
      <img class="pc-body" src="${PC_IMG.body}" alt="猫" draggable="false">
      ${petCatWear(o.equip || {})}
    </div></div></div>
    <div class="pc-fx" aria-hidden="true"></div>
    <div class="pc-say" role="status" hidden></div>
  </div>`;
}

// 着せかえ（服・手袋は色フィルター、頭とダンベルは絵を重ねる）
const PC_GEAR_DY = { cap_red: 36, crown: 24, band_pink: 16, band_blue: 16 };
function petCatWear(eq) {
  let s = '';
  if (eq.top && eq.top !== 'tee_orange' && PC_IMG.shirt) s += `<img class="pc-shirt wear-${eq.top}" src="${PC_IMG.shirt}" alt="" draggable="false">`;
  if (eq.hand && eq.hand !== 'gloves_brown' && eq.hand !== 'dumbbell' && PC_IMG.gloves) s += `<img class="pc-gloves wear-${eq.hand}" src="${PC_IMG.gloves}" alt="" draggable="false">`;
  let g = '';
  if (eq.head && eq.head !== 'band_none' && typeof headGear === 'function') {
    const k = 3.55, dy = PC_GEAR_DY[eq.head] || 0;
    g += `<g transform="translate(${(445 - 150 * k).toFixed(1)} ${(290 - (130 - dy) * k).toFixed(1)}) scale(${k})">${headGear(eq.head, 97)}</g>`;
  }
  if (eq.hand === 'dumbbell') {
    for (const [x, y] of [[150, 600], [825, 470]]) {
      g += `<g transform="translate(${x} ${y}) rotate(-12)"><rect x="-150" y="-14" width="300" height="28" rx="12" fill="#9AA3A8" stroke="#3B2A20" stroke-width="8"/>` +
        `<rect x="-170" y="-62" width="56" height="124" rx="16" fill="#2E3A4A" stroke="#1F2A27" stroke-width="10"/><rect x="114" y="-62" width="56" height="124" rx="16" fill="#2E3A4A" stroke="#1F2A27" stroke-width="10"/></g>`;
    }
  }
  if (g) s += `<svg class="pc-gear" viewBox="0 0 ${PC_W} ${PC_H}" aria-hidden="true">${g}</svg>`;
  return s;
}

// ---- 反応 ----
function petCatBind(host, opt) {
  opt = opt || {};
  const root = host.querySelector('.pc');
  if (!root || root.classList.contains('pc-dead')) return { react() {}, rest() {}, stop() {} };
  const act = root.querySelector('.pc-act'), fx = root.querySelector('.pc-fx'), body = root.querySelector('.pc-body');
  const say = opt.sayEl || root.querySelector('.pc-say');
  const status = opt.status || (() => '');
  const sound = opt.sound || (() => {}), vib = opt.vibrate || (() => {});
  let sayT = 0, busy = 0, taps = [], petting = null, idleT = 0, alive = true;

  const rest = () => { const t = status(); say.textContent = t; say.hidden = !t; };
  const speak = (t, ms = 1600) => { say.textContent = t; say.hidden = false; say.classList.remove('pop'); void say.offsetWidth; say.classList.add('pop'); clearTimeout(sayT); sayT = setTimeout(rest, ms); };
  const play = (name, ms) => {
    act.className = 'pc-act';
    void act.offsetWidth;
    act.classList.add('a-' + name);
    busy = Date.now() + ms;
    setTimeout(() => act.classList.remove('a-' + name), ms);
  };
  const spawn = (txt, x, y, kind) => {
    const e = document.createElement('span');
    e.className = 'pc-p ' + (kind || '');
    e.textContent = txt;
    e.style.left = x + '%'; e.style.top = y + '%';
    e.style.setProperty('--dx', (Math.random() * 40 - 20).toFixed(0) + 'px');
    fx.appendChild(e);
    setTimeout(() => e.remove(), 1200);
  };
  const pos = (cx, cy) => [cx / PC_W * 100, cy / PC_H * 100];

  function zoneAt(ev) {
    const r = body.getBoundingClientRect();
    const x = (ev.clientX - r.left) / r.width * PC_W, y = (ev.clientY - r.top) / r.height * PC_H;
    for (const [n, cx, cy, rx, ry] of PC_ZONES) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) return { n, x, y };
    }
    return null;
  }

  function react(n, x, y) {
    const now = Date.now();
    taps = taps.filter(t => now - t < 1600); taps.push(now);
    if (taps.length >= 7) { taps = []; play('dizzy', 1400); speak(pcPick(PC_LINES.dizzy)); for (let i = 0; i < 4; i++) setTimeout(() => spawn('★', 30 + i * 12, 8, 'star'), i * 120); sound('dizzy'); vib([20, 40, 20, 40, 20]); return; }
    const p = x != null ? pos(x, y) : [50, 40];
    switch (n) {
      case 'head': play('squish', 600); speak(pcPick(PC_LINES.head)); spawn('♥', p[0], p[1] - 6, 'heart'); sound('purr'); vib(15); break;
      case 'ear': play('wiggle', 500); speak(pcPick(PC_LINES.ear)); spawn('ピクッ', p[0], p[1] - 4, 'word'); sound('meow'); vib(10); break;
      case 'hand': play(p[0] < 50 ? 'punchL' : 'punchR', 450); speak(pcPick(PC_LINES.hand), 1100); spawn('バシッ', p[0] + (p[0] < 50 ? -6 : 6), p[1], 'hit'); sound('punch'); vib(30); break;
      case 'belly': play('jiggle', 700); speak(pcPick(PC_LINES.belly)); spawn('くすくす', p[0], p[1], 'word'); sound('giggle'); vib([10, 30, 10]); break;
      case 'pants': play('tug', 500); speak(pcPick(PC_LINES.pants)); sound('pop'); vib(10); break;
      case 'tail': play('angry', 800); root.classList.add('tail-fast'); setTimeout(() => root.classList.remove('tail-fast'), 1500); speak(pcPick(PC_LINES.tail)); spawn('💢', 62, 10, 'anger'); sound('hiss'); vib([40, 20, 40]); break;
      case 'foot': play('hop', 600); speak(pcPick(PC_LINES.foot), 1000); spawn('･ω･', p[0], 96, 'dust'); sound('pop'); vib(15); break;
    }
    if (opt.onReact) opt.onReact(n);
  }

  root.addEventListener('pointerdown', ev => {
    const z = zoneAt(ev);
    if (!z) return;
    ev.preventDefault();
    if (z.n === 'head') petting = { x: ev.clientX, y: ev.clientY, dist: 0, strokes: 0, moved: false };
    else react(z.n, z.x, z.y);
  });
  root.addEventListener('pointermove', ev => {
    if (!petting) return;
    const d = Math.hypot(ev.clientX - petting.x, ev.clientY - petting.y);
    petting.x = ev.clientX; petting.y = ev.clientY; petting.dist += d;
    if (petting.dist > 45) {
      petting.dist = 0; petting.moved = true; petting.strokes++;
      const z = zoneAt(ev); const p = z ? pos(z.x, z.y) : [45, 20];
      spawn('♥', p[0], p[1] - 6, 'heart');
      if (petting.strokes === 1 || petting.strokes % 4 === 0) { root.classList.add('petting'); speak('ゴロゴロ…♡', 1400); sound('purr'); vib(8); }
    }
  });
  const endPet = ev => {
    if (!petting) return;
    const wasTap = !petting.moved; petting = null; root.classList.remove('petting');
    if (wasTap && ev.type === 'pointerup') { const z = zoneAt(ev); if (z) react('head', z.x, z.y); }
  };
  root.addEventListener('pointerup', endPet);
  root.addEventListener('pointercancel', endPet);
  root.addEventListener('pointerleave', endPet);

  // 自分で動く（ときどき）
  function idle() {
    if (!alive || !root.isConnected) return;
    if (Date.now() > busy && !petting) {
      const mood = opt.mood ? opt.mood() : 'normal';
      const r = Math.random();
      if (mood === 'hungry') { play('stomp', 900); speak('飯くれ！'); }
      else if (mood === 'tired') { speak('つかれたにゃ…', 1800); spawn('z', 70, 6, 'zzz'); setTimeout(() => spawn('z', 74, 2, 'zzz'), 400); }
      else if (root.classList.contains('is-fat')) { play('puff', 900); speak('おなかパンパン…'); spawn('💧', 78, 8, 'drop'); }
      else if (root.classList.contains('is-thin')) { play('shiver', 900); speak('おなかすいた…'); }
      else if (r < 0.45) { play('step', 1600); spawn('♪', 20, 30, 'note'); }
      else if (r < 0.75) { play('look', 1400); }
      else speak(status() || pcPick(PC_LINES.idle));
    }
    idleT = setTimeout(idle, 5000 + Math.random() * 4000);
  }
  idleT = setTimeout(idle, 2500);

  return { react, rest, stop() { alive = false; clearTimeout(idleT); clearTimeout(sayT); } };
}
