// にゃんカロ イラスト猫（B案）
// petCatHTML({ breed, idx, dead, mood, equip }) で猫のHTMLを返し、petCatBind(要素) でタップ反応をつける。
//   breed: data.js の CATS のキー（tabby / white / longwhite / grey）
//   idx  : 体型 -100(骸骨) 〜 0 〜 +100(爆発)。今は絵を横に伸び縮みさせて表現
//   dead : null / 'skel' / 'boom'（骸骨・爆発は今までの SVG を使う）
//   mood : 'normal' / 'hungry' / 'tired'
//   equip: { head, top, hand } … data.js の WEAR のキー
// 画像：<breed>-body.webp（しっぽ以外）/ -tail.webp（しっぽの先）/ -shirt.webp（服だけ）/ -gloves.webp（手袋だけ）　v9.3 で PNG→WebP（元のPNGは別の「原図」zip）
//   服と手袋は色フィルターで着せかえ色にする（petcat.css の .wear-○○）。どの猫も服はオレンジ・手袋は茶色でそろえてある。
//   絵の大きさ・当たり判定などは data.js の CATS に書く。
const PC_BOX_W = 600, PC_BOX_H = 813;      // 猫を入れる枠（どの猫も同じ）
const pcCat = b => CATS[b] || CATS.tabby;
const pcImg = (b, part) => `./${CATS[b] ? b : 'tabby'}-${part}.webp`;

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
  const b = CATS[o.breed] ? o.breed : 'tabby', c = pcCat(b);
  const s = petCatShape(o.idx);
  const cls = ['pc', 'mood-' + (o.mood || 'normal')];
  if (s.fat > 0.5) cls.push('is-fat');
  if (s.thin > 0.6) cls.push('is-thin');
  const art = `left:${(c.x / PC_BOX_W * 100).toFixed(2)}%;width:${(c.w / PC_BOX_W * 100).toFixed(2)}%`;
  return `<div class="${cls.join(' ')}" data-breed="${b}" style="--sx:${s.sx.toFixed(3)};--sy:${s.sy.toFixed(3)};--tx:${(c.pivot[0] / c.w * 100).toFixed(1)}%;--ty:${(c.pivot[1] / c.h * 100).toFixed(1)}%">
    <div class="pc-shape"><div class="pc-act"><div class="pc-idle"><div class="pc-art" style="${art}">
      ${petCatBack(b, o.equip || {})}
      <img class="pc-tail" src="${pcImg(b, 'tail')}" alt="" draggable="false">
      <img class="pc-body" src="${pcImg(b, 'body')}" alt="${c.name}" draggable="false">
      ${petCatWear(b, o.equip || {})}
    </div></div></div></div>
    <div class="pc-fx" aria-hidden="true"></div>
    <div class="pc-say" role="status" hidden></div>
  </div>`;
}

// 着せかえ（服・手袋は色フィルター、頭とダンベルは絵を重ねる）
const PC_GEAR_DY = { cap_red: 36, crown: 24, band_pink: 16, band_blue: 16,
  hachimaki: 16, ribbon: 14, straw_hat: 30, knit_cat: 22, sunglasses: 14, headphones: 4, school_cap: 30, halo: 44, tiara: 22 };   // v9.4 追加分
// 猫の種類ごとの微調整（目の高さ・頭のかたむきがちがうので）。{ 種類: { きせかえ: { dy: 下にずらす量（＋で下）, rot: 回す角度 } } }
const PC_GEAR_FIX = { grey: { sunglasses: { dy: -4, rot: -7 }, knit_cat: { dy: -8 } }, white: { sunglasses: { dy: 4 } } };
// コスチューム（全身）を着ているか
const pcSuit = eq => eq && eq.suit && eq.suit !== 'suit_none' && typeof WEAR !== 'undefined' && WEAR[eq.suit] ? eq.suit : null;
// 体のうしろ（マント・リュックなど）
function petCatBack(b, eq) {
  const su = pcSuit(eq), c = pcCat(b);
  if (!su || typeof suitBack !== 'function') return '';
  const g = suitBack(su, c);
  return g ? `<svg class="pc-gear pc-back" viewBox="0 0 ${c.w} ${c.h}" aria-hidden="true">${g}</svg>` : '';
}
function petCatWear(b, eq) {
  const c = pcCat(b), su = pcSuit(eq);
  let s = '';
  if (su) s += `<img class="pc-shirt wear-suit-${su}" src="${pcImg(b, 'shirt')}" alt="" draggable="false">`;
  else if (eq.top && eq.top !== 'tee_orange') s += `<img class="pc-shirt wear-${eq.top}" src="${pcImg(b, 'shirt')}" alt="" draggable="false">`;
  if (eq.hand && eq.hand !== 'gloves_brown' && eq.hand !== 'dumbbell') s += `<img class="pc-gloves wear-${eq.hand}" src="${pcImg(b, 'gloves')}" alt="" draggable="false">`;
  let g = '';
  if (su && typeof suitHead === 'function') {
    const [hx, hy, hr] = c.head, k = hr / 97;
    g += `<g transform="translate(${(hx - 150 * k).toFixed(1)} ${(hy - 130 * k).toFixed(1)}) scale(${k.toFixed(3)})">${suitHead(su)}</g>`;
  } else if (eq.head && eq.head !== 'band_none' && typeof headGear === 'function') {
    const [hx, hy, hr] = c.head, k = hr / 97, fx = (PC_GEAR_FIX[b] || {})[eq.head] || {}, dy = (PC_GEAR_DY[eq.head] || 0) + (fx.dy || 0);
    g += `<g transform="translate(${(hx - 150 * k).toFixed(1)} ${(hy - (130 - dy) * k).toFixed(1)}) scale(${k.toFixed(3)})${fx.rot ? ` rotate(${fx.rot} 150 130)` : ''}">${headGear(eq.head, 97)}</g>`;
  }
  if (eq.hand === 'dumbbell') {
    for (const [x, y] of c.hands) {
      g += `<g transform="translate(${x} ${y}) rotate(-12) scale(.54)"><rect x="-150" y="-14" width="300" height="28" rx="12" fill="#9AA3A8" stroke="#3B2A20" stroke-width="8"/>` +
        `<rect x="-170" y="-62" width="56" height="124" rx="16" fill="#2E3A4A" stroke="#1F2A27" stroke-width="10"/><rect x="114" y="-62" width="56" height="124" rx="16" fill="#2E3A4A" stroke="#1F2A27" stroke-width="10"/></g>`;
    }
  }
  if (g) s += `<svg class="pc-gear" viewBox="0 0 ${c.w} ${c.h}" aria-hidden="true">${g}</svg>`;
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
  const cat = pcCat(root.dataset.breed);
  const pos = (cx, cy) => [(cx + cat.x) / PC_BOX_W * 100, cy / PC_BOX_H * 100];

  function zoneAt(ev) {
    const r = body.getBoundingClientRect();
    const x = (ev.clientX - r.left) / r.width * cat.w, y = (ev.clientY - r.top) / r.height * cat.h;
    for (const [n, cx, cy, rx, ry] of cat.zones) {
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
