// にゃんカロ イベントのきせかえの絵（v10.4）
// data.js の WEAR で ev: のあるコスチューム（24こ）。cat.js の suitHead・suitBack・suitFront から呼ばれる
//   evSuitHead(id)      ：頭（頭の中心 150,130・半径 97 の座標。cat.js の headGear と同じ）
//   evSuitBack(id, c)   ：体のうしろ（マント・ランドセルなど。猫の絵の座標）
//   evSuitFront(id, c)  ：体の前（えり・ボタン・帯・スカートなど。服の上・手袋の下。猫の絵の座標）
//   evSuitIcon(id)      ：更衣室・ガチャのアイコン
// c は data.js の CATS の1匹。c.fit（えり・すそ）と c.zones（belly・pants）を目安に描く
'use strict';

const EVL = () => C.line;
const r1 = n => Math.round(n * 10) / 10;
// 体の向きにあわせた点：t＝えり(0)→すそ(1)、s＝横（＋は絵の右）
function evBody(c) {
  const f = c.fit || { neck: [300, 330], hem: [300, 515], hw: 175, cw: 130 };
  const [nx, ny] = f.neck, [hx, hy] = f.hem, dx = hx - nx, dy = hy - ny, len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len, px = uy, py = -ux;
  const pz = c.zones.find(z => z[0] === 'pants') || [0, 300, 600, 215, 85];
  const bz = c.zones.find(z => z[0] === 'belly') || [0, 300, 410, 168, 97];
  const P = (t, s) => [r1(nx + ux * len * t + px * s), r1(ny + uy * len * t + py * s)];
  const pt = (t, s) => P(t, s).join(' ');
  return { f, P, pt, len, cw: f.cw, hw: f.hw, pants: { x: pz[1], y: pz[2], rx: pz[3], ry: pz[4] }, belly: { x: bz[1], y: bz[2], rx: bz[3], ry: bz[4] } };
}
// 5まいの花びら（さくら・梅）
function evFlower(x, y, r, fill, center = '#FFE07A', notch = true, sw = 3) {
  let s = '';
  for (let i = 0; i < 5; i++) {
    const a = (i * 72 - 90) * Math.PI / 180, cx = x + Math.cos(a) * r * 0.55, cy = y + Math.sin(a) * r * 0.55;
    s += `<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(r * 0.42)}" ry="${r1(r * 0.55)}" transform="rotate(${i * 72} ${r1(cx)} ${r1(cy)})" fill="${fill}" stroke="${EVL()}" stroke-width="${sw}"/>`;
    if (notch) { const nx = x + Math.cos(a) * r * 1.02, ny = y + Math.sin(a) * r * 1.02; s += `<circle cx="${r1(nx)}" cy="${r1(ny)}" r="${r1(r * 0.12)}" fill="${fill}"/>`; }
  }
  return s + `<circle cx="${x}" cy="${y}" r="${r1(r * 0.22)}" fill="${center}"/>`;
}
const evStar = (x, y, r, fill, sw = 3) => {
  let d = '';
  for (let i = 0; i < 10; i++) { const a = (i * 36 - 90) * Math.PI / 180, rr = i % 2 ? r * 0.45 : r; d += `${i ? 'L' : 'M'}${r1(x + Math.cos(a) * rr)} ${r1(y + Math.sin(a) * rr)} `; }
  return `<path d="${d}Z" fill="${fill}" stroke="${EVL()}" stroke-width="${sw}" stroke-linejoin="round"/>`;
};
const evSpark = (x, y, r, fill = '#FFFFFF') => `<path d="M${x} ${y - r} Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r} Z" fill="${fill}"/>`;
const evHood = (col, extra = '', sw = 5) => `<path d="${SUIT_HOOD} ${SUIT_HOLE}" fill="${col}" fill-rule="evenodd" stroke="${EVL()}" stroke-width="${sw}" stroke-linejoin="round"/>${extra}`;
const evCheek = (col = '#F28CA0') => `<ellipse cx="70" cy="196" rx="14" ry="8" fill="${col}" fill-opacity=".7"/><ellipse cx="230" cy="196" rx="14" ry="8" fill="${col}" fill-opacity=".7"/>`;
// 体の前に、ななめの帯（たすき・ベルト）を描く：a→b の太さ w
const evBand = (a, b, w, fill, extra = '') => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * w / 2, ny = dx / l * w / 2;
  return `<path d="M${r1(a[0] + nx)} ${r1(a[1] + ny)} L${r1(b[0] + nx)} ${r1(b[1] + ny)} L${r1(b[0] - nx)} ${r1(b[1] - ny)} L${r1(a[0] - nx)} ${r1(a[1] - ny)} Z" fill="${fill}" stroke="${EVL()}" stroke-width="5" stroke-linejoin="round"/>${extra}`;
};
// スカート・はかま・すそ（ズボンの上にかぶせる）。top＝上のはしの t（服のすそ＝1）、bot＝下のはし（ズボンの高さに対する割合）、flare＝広がり
function evSkirt(B, o) {
  const L = EVL(), p = B.pants, top = o.top ?? 0.86, wTop = B.hw * (o.wTop ?? 0.96);
  const a = B.P(top, -wTop), b = B.P(top, wTop);
  const yb = p.y + p.ry * (o.bot ?? 0.55), xl = p.x - p.rx * (o.flare ?? 1.12), xr = p.x + p.rx * (o.flare ?? 1.12);
  let d = `M${a[0]} ${a[1]} L${b[0]} ${b[1]} L${r1(xr)} ${r1(yb)} `;
  if (o.wave) { const n = o.wave; for (let i = n; i >= 0; i--) { const x = xl + (xr - xl) * i / n; d += i === n ? '' : `Q${r1(x + (xr - xl) / n / 2)} ${r1(yb + o.waveH)} ${r1(x)} ${r1(yb)} `; } }
  else d += `Q${r1(p.x)} ${r1(yb + (o.curve ?? 18))} ${r1(xl)} ${r1(yb)} `;
  d += 'Z';
  let s = `<path d="${d}" fill="${o.fill}" stroke="${L}" stroke-width="6" stroke-linejoin="round"/>`;
  if (o.pleats) {
    for (let i = 1; i < o.pleats; i++) {
      const u = i / o.pleats, x0 = a[0] + (b[0] - a[0]) * u, y0 = a[1] + (b[1] - a[1]) * u, x1 = xl + (xr - xl) * u;
      s += `<path d="M${r1(x0)} ${r1(y0 + 6)} L${r1(x1)} ${r1(yb + (o.curve ?? 18) * Math.sin(u * Math.PI) - 4)}" stroke="${o.pleatCol || 'rgba(0,0,0,.25)'}" stroke-width="4" stroke-linecap="round"/>`;
    }
  }
  return { s, a, b, yb, xl, xr };
}

/* ========== 頭 ========== */
function evSuitHead(id) {
  const L = EVL();
  switch (id) {
    // ---- 新学年 ----
    case 'ev_gakuran': {   // 学生帽（さくらの校章）
      return `<path d="M58 92 C54 44 96 22 150 22 C204 22 246 44 242 92 Z" fill="#23262E" stroke="${L}" stroke-width="5" stroke-linejoin="round"/>` +
        `<path d="M86 40 Q120 28 150 28" fill="none" stroke="#FFFFFF" stroke-opacity=".18" stroke-width="10" stroke-linecap="round"/>` +
        `<path d="M56 80 Q150 64 244 80 L244 98 Q150 82 56 98 Z" fill="#14161B" stroke="${L}" stroke-width="4" stroke-linejoin="round"/>` +
        `<path d="M70 96 Q150 84 230 96 Q226 124 150 120 Q74 124 70 96 Z" fill="#101114" stroke="${L}" stroke-width="5" stroke-linejoin="round"/>` +
        `<path d="M92 102 Q150 94 208 102" fill="none" stroke="#FFFFFF" stroke-opacity=".22" stroke-width="4" stroke-linecap="round"/>` +
        `<circle cx="150" cy="56" r="17" fill="#E9B730" stroke="${L}" stroke-width="3"/>` + evFlower(150, 56, 12, '#FFE9A8', '#C98E12', false, 2);
    }
    case 'ev_sailor': {   // さくらの ヘアピン
      return evFlower(84, 66, 20, '#F7B6CC', '#F27B9E') + evFlower(112, 48, 12, '#FFD3E0', '#F27B9E') +
        `<path d="M58 92 L116 60" stroke="#E9B730" stroke-width="5" stroke-linecap="round"/>`;
    }
    case 'ev_randoseru': {   // 黄色い 通学ぼうし
      return `<path d="M60 96 C56 40 98 18 150 18 C202 18 244 40 240 96 Z" fill="#F7D33E" stroke="${L}" stroke-width="5" stroke-linejoin="round"/>` +
        `<path d="M84 44 Q116 26 148 24" fill="none" stroke="#FFFFFF" stroke-opacity=".55" stroke-width="10" stroke-linecap="round"/>` +
        `<path d="M40 100 Q150 72 260 100 Q262 116 248 118 Q150 94 52 118 Q38 116 40 100 Z" fill="#F2C21E" stroke="${L}" stroke-width="5" stroke-linejoin="round"/>` +
        `<path d="M62 92 Q150 76 238 92" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-dasharray="2 9" stroke-linecap="round"/>` +
        `<circle cx="150" cy="22" r="7" fill="#F2C21E" stroke="${L}" stroke-width="3"/>` +
        `<path d="M60 108 Q50 170 70 214" fill="none" stroke="#F2C21E" stroke-width="5" stroke-linecap="round"/><path d="M240 108 Q250 170 230 214" fill="none" stroke="#F2C21E" stroke-width="5" stroke-linecap="round"/>`;
    }
    case 'ev_hakama': {   // 大きなリボン ＋ さくらの かんざし（下がり飾り）
      const bow = `<g transform="translate(196 44) rotate(14)">` +
        `<path d="M0 0 C-30 -40 -78 -30 -70 6 C-64 34 -24 22 0 0 Z" fill="#E8607A" stroke="${L}" stroke-width="5" stroke-linejoin="round"/>` +
        `<path d="M0 0 C30 -40 78 -30 70 6 C64 34 24 22 0 0 Z" fill="#E8607A" stroke="${L}" stroke-width="5" stroke-linejoin="round"/>` +
        `<path d="M-6 6 L-26 58 L-8 48 L0 64 L6 10 Z M6 6 L28 54 L10 46 L4 62" fill="#D94A68" stroke="${L}" stroke-width="4" stroke-linejoin="round"/>` +
        `<path d="M-52 -6 Q-40 -16 -24 -10 M52 -6 Q40 -16 24 -10" fill="none" stroke="#FFFFFF" stroke-opacity=".6" stroke-width="4" stroke-linecap="round"/>` +
        `<ellipse cx="0" cy="2" rx="13" ry="12" fill="#F27B9E" stroke="${L}" stroke-width="4"/></g>`;
      const pin = evFlower(82, 70, 20, '#FFFFFF', '#F27B9E') + evFlower(104, 46, 14, '#F7B6CC', '#F27B9E') + evFlower(62, 44, 11, '#FFD3E0', '#F27B9E') +
        `<path d="M70 88 L66 132 M78 90 L80 140" stroke="#E9B730" stroke-width="3"/>` + evFlower(66, 138, 7, '#F7B6CC', '#E9B730', false, 2) + evFlower(80, 146, 7, '#FFFFFF', '#E9B730', false, 2);
      return bow + pin + evSpark(250, 100, 9) + evSpark(40, 20, 7);
    }
    // ---- 梅雨 ----
    case 'ev_teru': {   // てるてる坊主（白い布＋むすびめのフリル）
      return `<path d="M150 6 C80 6 34 60 40 130 C42 176 58 206 80 222 Q150 244 220 222 C242 206 258 176 260 130 C266 60 220 6 150 6 Z ${SUIT_HOLE}" fill="#FFFFFF" fill-rule="evenodd" stroke="${L}" stroke-width="5" stroke-linejoin="round"/>` +
        `<path d="M70 40 Q100 18 132 14" fill="none" stroke="#DCE6F2" stroke-width="10" stroke-linecap="round"/><path d="M228 70 Q246 110 240 150" fill="none" stroke="#DCE6F2" stroke-width="8" stroke-linecap="round"/>` + evCheek('#FFB3C7') +
        `<path d="M150 6 q-10 -22 4 -30 q16 6 -4 30" fill="#FFFFFF" stroke="${L}" stroke-width="4"/>` + `<path d="M266 34 q4 12 0 18 q-6 -6 0 -18 Z M30 60 q4 12 0 18 q-6 -6 0 -18 Z" fill="#9CC8F2" stroke="${L}" stroke-width="2.5"/>`;
    }
    case 'ev_snail': {   // かたつむり（つの＝目）
      const st = (x, d) => `<path d="M${x} 50 Q${x + d * 6} 10 ${x + d * 24} -26" fill="none" stroke="${L}" stroke-width="13" stroke-linecap="round"/><path d="M${x} 50 Q${x + d * 6} 10 ${x + d * 24} -26" fill="none" stroke="#B8D97A" stroke-width="7" stroke-linecap="round"/>` +
        `<circle cx="${x + d * 26}" cy="-34" r="16" fill="#B8D97A" stroke="${L}" stroke-width="4.5"/><circle cx="${x + d * 28}" cy="-34" r="7" fill="${L}"/><circle cx="${x + d * 30}" cy="-37" r="2.5" fill="#FFFFFF"/>`;
      return st(112, -1) + st(188, 1) + evHood('#B8D97A', `<path d="M60 120 Q66 90 84 74 M240 120 Q234 90 216 74" fill="none" stroke="#9BC46A" stroke-width="6" stroke-linecap="round"/>` + evCheek());
    }
    case 'ev_ajisai': {   // あじさいの かんむり（小さな4まいの花を いっぱい）
      let s = '';
      const cols = ['#8C7BD8', '#7FA8E8', '#B49AE8', '#6E8EE0', '#C7A6F2', '#9DC0F5'];
      [[44, 112, 22, -40], [256, 112, 22, 40]].forEach(([x, y, r, a]) => { s += `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 1.7}" transform="rotate(${a} ${x} ${y})" fill="#5FAF6A" stroke="${L}" stroke-width="4"/><path d="M${x} ${y - r * 1.4} L${x} ${y + r * 1.4}" transform="rotate(${a} ${x} ${y})" stroke="#3E8A48" stroke-width="3"/>`; });
      const spots = [[70, 76], [96, 52], [128, 38], [160, 34], [192, 42], [222, 58], [244, 84], [58, 104], [112, 58], [176, 56], [86, 78], [214, 80], [146, 54]];
      spots.forEach(([x, y], i) => { const col = cols[i % cols.length], r = 15; s += `<g transform="translate(${x} ${y}) rotate(${i * 23})">` + [0, 90, 180, 270].map(a => `<ellipse cx="0" cy="-${r * 0.55}" rx="${r * 0.45}" ry="${r * 0.6}" transform="rotate(${a})" fill="${col}" stroke="${L}" stroke-width="2.5"/>`).join('') + `<circle r="3" fill="#FFFFFF"/></g>`; });
      return s + `<path d="M262 150 q6 14 0 22 q-8 -8 0 -22 Z M34 160 q5 12 0 18 q-6 -6 0 -18 Z" fill="#9CC8F2" stroke="${L}" stroke-width="2.5"/>` + evSpark(150, 8, 8);
    }
    case 'ev_raijin': {   // 雷さま（つの・くるくるの髪・かみなり雲）
      const horn = (x, d) => `<path d="M${x} 58 Q${x + d * 2} 18 ${x + d * 18} -4 Q${x + d * 22} 26 ${x + d * 22} 58 Z" fill="#FFF3C4" stroke="${L}" stroke-width="5" stroke-linejoin="round"/><path d="M${x + d * 4} 44 L${x + d * 18} 40 M${x + d * 6} 28 L${x + d * 17} 24" stroke="#E2C77A" stroke-width="3"/>`;
      let band = `<path d="M50 96 Q150 60 250 96 L254 122 Q150 86 46 122 Z" fill="#F2C230" stroke="${L}" stroke-width="5" stroke-linejoin="round"/>`;
      [70, 104, 140, 176, 212, 238].forEach((x, i) => { band += `<path d="M${x} ${i % 2 ? 84 : 86} q6 12 -2 26" fill="none" stroke="#2A2328" stroke-width="7" stroke-linecap="round"/>`; });
      let hair = band;
      const cloud = `<g transform="translate(250 6)"><path d="M-30 10 q-4 -24 18 -24 q8 -18 28 -8 q22 -6 22 16 q14 6 4 20 L-24 14 q-12 -2 -6 -4 Z" fill="#E8EAF2" stroke="${L}" stroke-width="4" stroke-linejoin="round"/><path d="M0 16 L-10 40 L4 38 L-6 62 L16 30 L4 32 L12 16 Z" fill="#FFD23F" stroke="${L}" stroke-width="3" stroke-linejoin="round"/></g>`;
      return hair + horn(118, -1) + horn(182, 1) + cloud;
    }
    // ---- サマー ----
    case 'ev_suika': {   // スイカの フード（しま＋つる＋葉）
      let st = '';
      [-74, -38, 0, 38, 74].forEach(dx => { st += `<path d="M${150 + dx * 0.4} 30 q${dx * 0.3 + 8} 20 ${dx * 0.55} 40 q${dx * 0.2 + 10} 20 ${dx * 0.75} 42 q${dx * 0.2 + 10} 22 ${dx * 0.95} 46 q${dx * 0.1 + 8} 22 ${dx * 1.05} 50" fill="none" stroke="#1E5E2A" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`; });
      return evHood('#3E9E4A', `<clipPath id="evSkC"><path d="${SUIT_HOOD} ${SUIT_HOLE}" clip-rule="evenodd"/></clipPath><g clip-path="url(#evSkC)">${st}</g><path d="${SUIT_HOOD} ${SUIT_HOLE}" fill="none" fill-rule="evenodd" stroke="${L}" stroke-width="5"/>` +
        `<path d="M70 166 a80 66 0 0 0 160 0" fill="none" stroke="#FFFFFF" stroke-width="8" stroke-opacity=".0"/>`) +
        `<path d="M150 28 q-4 -26 16 -34 q16 -2 10 14 q-8 4 -10 -6" fill="none" stroke="#3E7A2A" stroke-width="7" stroke-linecap="round"/>` +
        `<path d="M156 22 Q190 -8 222 6 Q206 34 160 26 Z" fill="#6CC24A" stroke="${L}" stroke-width="4" stroke-linejoin="round"/><path d="M162 24 Q190 10 214 8" fill="none" stroke="#3E8A2A" stroke-width="3"/>`;
    }
    case 'ev_aloha': {   // ハイビスカス（耳のよこ）＋ サングラス（あたまの上）
      const hib = (x, y, r, col) => { let s = ''; for (let i = 0; i < 5; i++) { const a = i * 72; s += `<path d="M${x} ${y} C${x - r * 0.6} ${y - r * 0.5} ${x - r * 0.5} ${y - r * 1.15} ${x} ${y - r * 1.1} C${x + r * 0.5} ${y - r * 1.15} ${x + r * 0.6} ${y - r * 0.5} ${x} ${y} Z" transform="rotate(${a} ${x} ${y})" fill="${col}" stroke="${L}" stroke-width="3.5" stroke-linejoin="round"/>`; } return s + `<circle cx="${x}" cy="${y}" r="${r * 0.2}" fill="#B81E3A"/><path d="M${x} ${y} l${r * 0.5} ${-r * 0.7}" stroke="#FFD23F" stroke-width="4" stroke-linecap="round"/><circle cx="${x + r * 0.52}" cy="${y - r * 0.74}" r="4" fill="#FFD23F" stroke="${L}" stroke-width="1.5"/>`; };
      const glass = `<g transform="translate(0 -6)"><path d="M70 66 Q150 50 230 66" fill="none" stroke="${L}" stroke-width="6"/><path d="M82 60 L136 56 Q140 84 112 88 Q84 86 82 60 Z M164 56 L218 60 Q216 86 188 88 Q160 84 164 56 Z" fill="#2B6C8F" stroke="${L}" stroke-width="5" stroke-linejoin="round"/><path d="M96 66 l14 -2 M178 64 l14 2" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" stroke-opacity=".7"/></g>`;
      return glass + `<path d="M222 70 Q262 56 270 88 Q244 98 222 70 Z" fill="#4FAE5B" stroke="${L}" stroke-width="3.5"/>` + hib(236, 92, 34, '#F0475E');
    }
    case 'ev_yukata': {   // つまみ細工の かんざし（下がり飾り）
      let s = evFlower(212, 64, 24, '#F0475E', '#FFD23F') + evFlower(240, 92, 15, '#FFFFFF', '#F0475E') + evFlower(186, 42, 13, '#F7B6CC', '#F0475E');
      s += `<path d="M222 84 L226 132 M232 100 L240 140 M214 86 L210 126" stroke="#E9B730" stroke-width="3"/>`;
      [[226, 136], [240, 146], [210, 130]].forEach(([x, y], i) => { s += `<circle cx="${x}" cy="${y}" r="${7 - i}" fill="${['#F0475E', '#FFFFFF', '#F7B6CC'][i]}" stroke="${L}" stroke-width="2.5"/>`; });
      return s;
    }
    case 'ev_shark': {   // サメの フード（背びれ・歯・えら）
      let teeth = '';
      for (let i = 0; i < 7; i++) { const x = 86 + i * 21.3, y = 82 - Math.sin((i + .5) / 7 * Math.PI) * 10; teeth += `<path d="M${r1(x)} ${r1(y)} l10.6 22 l10.6 -22 Z" fill="#FFFFFF" stroke="${L}" stroke-width="3" stroke-linejoin="round"/>`; }
      const fin = `<path d="M118 34 Q150 -60 214 -54 Q186 -14 190 40 Z" fill="#5E8FB8" stroke="${L}" stroke-width="5" stroke-linejoin="round"/><path d="M146 -6 Q170 -38 196 -44" fill="none" stroke="#9CC2E4" stroke-width="7" stroke-linecap="round"/>`;
      const side = d => `<path d="M${150 + d * 112} 118 L${150 + d * 156} 96 L${150 + d * 132} 134 Z" fill="#5E8FB8" stroke="${L}" stroke-width="4" stroke-linejoin="round"/>`;
      const gill = d => `<path d="M${150 + d * 108} 150 q${d * 10} 12 0 26 M${150 + d * 100} 146 q${d * 10} 14 0 30 M${150 + d * 92} 144 q${d * 10} 16 0 32" fill="none" stroke="#3E6F96" stroke-width="4" stroke-linecap="round"/>`;
      const eye = d => `<circle cx="${150 + d * 76}" cy="58" r="11" fill="${L}"/><circle cx="${150 + d * 79}" cy="54" r="3.5" fill="#FFFFFF"/>`;
      return fin + side(-1) + side(1) + evHood('#5E8FB8', `<path d="M58 192 Q150 252 242 192 Q236 216 214 226 Q150 246 86 226 Q64 216 58 192 Z" fill="#F4F8FC" stroke="${L}" stroke-width="4" stroke-linejoin="round"/>` + teeth + gill(-1) + gill(1) + eye(-1) + eye(1) + `<path d="M74 70 Q100 40 140 30" fill="none" stroke="#9CC2E4" stroke-width="8" stroke-linecap="round"/>`) +
        `<circle cx="276" cy="40" r="9" fill="#CFEAFF" fill-opacity=".8" stroke="#6AA6D8" stroke-width="3"/><circle cx="290" cy="12" r="6" fill="#CFEAFF" fill-opacity=".8" stroke="#6AA6D8" stroke-width="3"/>` + evSpark(30, 30, 9);
    }
    // ---- ハロウィン ----
    case 'ev_pumpkin': {   // かぼちゃの フード（すじ・へた・つる）
      let rib = '';
      [-70, -36, 36, 70].forEach(dx => { rib += `<path d="M${150 + dx * 0.35} 34 Q${150 + dx * 1.35} 80 ${150 + dx * 1.2} 214" fill="none" stroke="#C9601A" stroke-width="6" stroke-linecap="round"/>`; });
      return evHood('#F0882A', `<clipPath id="evPkC"><path d="${SUIT_HOOD} ${SUIT_HOLE}" clip-rule="evenodd"/></clipPath><g clip-path="url(#evPkC)">${rib}</g><path d="${SUIT_HOOD} ${SUIT_HOLE}" fill="none" fill-rule="evenodd" stroke="${L}" stroke-width="5"/>` +
        `<path d="M80 62 Q104 40 136 34" fill="none" stroke="#FFC27A" stroke-width="10" stroke-linecap="round"/>` + evCheek('#E8607A')) +
        `<path d="M138 34 Q134 0 150 -10 Q168 -8 164 4 Q154 6 158 34 Z" fill="#5A8A2E" stroke="${L}" stroke-width="5" stroke-linejoin="round"/>` +
        `<path d="M164 10 q30 -20 46 6 q-8 18 -26 4" fill="none" stroke="#5A8A2E" stroke-width="5" stroke-linecap="round"/><path d="M118 22 Q96 -6 72 6 Q86 30 118 22 Z" fill="#6CC24A" stroke="${L}" stroke-width="4" stroke-linejoin="round"/>`;
    }
    case 'ev_ghost': {   // おばけの シーツ ＋ ちいさな おばけの ともだち
      const pal = `<g transform="translate(262 34) rotate(12)"><path d="M-26 22 Q-30 -30 0 -32 Q30 -30 26 22 Q18 14 12 24 Q6 14 0 24 Q-6 14 -12 24 Q-18 14 -26 22 Z" fill="#FFFFFF" stroke="${L}" stroke-width="4" stroke-linejoin="round"/><ellipse cx="-8" cy="-6" rx="4" ry="6" fill="${L}"/><ellipse cx="9" cy="-6" rx="4" ry="6" fill="${L}"/><ellipse cx="0" cy="8" rx="5" ry="4" fill="#F28CA0"/></g>`;
      return `<path d="M150 0 C76 0 30 60 34 136 C36 180 48 206 60 222 Q150 246 240 222 C252 206 264 180 266 136 C270 60 224 0 150 0 Z ${SUIT_HOLE}" fill="#F7F4FF" fill-rule="evenodd" stroke="${L}" stroke-width="5" stroke-linejoin="round"/>` +
        `<path d="M74 44 Q104 16 140 10" fill="none" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round"/><path d="M236 70 Q252 120 244 170" fill="none" stroke="#DCD4F2" stroke-width="9" stroke-linecap="round"/>` + evCheek('#E8A0F0') + pal +
        `<text x="20" y="20" font-family="sans-serif" font-weight="900" font-size="26" fill="#8A4FD0" stroke="#FFFFFF" stroke-width="5" paint-order="stroke" transform="rotate(-14 20 20)">BOO</text>`;
    }
    case 'ev_mummy': {   // ほうたいの フード（まるみに そった すじ）＋ ほどけた はし
      let ln = '';
      [44, 70, 96, 124, 152, 180, 208].forEach((y, i) => { ln += `<path d="M20 ${y + (i % 2 ? 10 : -6)} Q150 ${y - 30} 280 ${y + (i % 2 ? -8 : 8)}" fill="none" stroke="#C9B890" stroke-width="4"/><path d="M20 ${y + 6} Q150 ${y - 22} 280 ${y + 4}" fill="none" stroke="#D2C3A0" stroke-width="2.5" stroke-dasharray="6 10"/>`; });
      return evHood('#EFE6CF', `<clipPath id="evMmC"><path d="${SUIT_HOOD} ${SUIT_HOLE}" clip-rule="evenodd"/></clipPath><g clip-path="url(#evMmC)">${ln}</g><path d="${SUIT_HOOD} ${SUIT_HOLE}" fill="none" fill-rule="evenodd" stroke="${EVL()}" stroke-width="5"/>`) +
        `<path d="M232 66 Q276 46 290 80 Q270 76 266 96 Q254 74 236 84 Z" fill="#EFE6CF" stroke="${L}" stroke-width="4" stroke-linejoin="round"/>` +
        `<path d="M66 128 Q102 108 132 112" fill="none" stroke="${L}" stroke-width="26" stroke-linecap="round"/><path d="M66 128 Q102 108 132 112" fill="none" stroke="#EFE6CF" stroke-width="18" stroke-linecap="round"/>`;
    }
    case 'ev_dracula': {   // かみ（オールバック）＋ たかい えり ＋ こうもり
      const bat = (x, y, sc, r) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${sc})"><path d="M0 0 Q-10 -14 -22 -8 Q-28 -18 -40 -12 Q-34 -2 -40 8 Q-26 2 -18 10 Q-10 4 0 10 Q10 4 18 10 Q26 2 40 8 Q34 -2 40 -12 Q28 -18 22 -8 Q10 -14 0 0 Z" fill="#2A1F35" stroke="${L}" stroke-width="3" stroke-linejoin="round"/><circle cx="-4" cy="2" r="2" fill="#FFD23F"/><circle cx="4" cy="2" r="2" fill="#FFD23F"/></g>`;
      return `<path d="M62 92 Q60 34 150 26 Q240 34 238 92 Q214 66 190 64 L150 92 L110 64 Q86 66 62 92 Z" fill="#2A1F35" stroke="${L}" stroke-width="5" stroke-linejoin="round"/>` +
        `<path d="M96 50 Q130 34 170 36" fill="none" stroke="#5B4A70" stroke-width="7" stroke-linecap="round"/>` + bat(262, 40, 1.1, 10) + bat(36, 60, 0.85, -14) + bat(286, 120, 0.7, 20);
    }
    // ---- クリスマス ----
    case 'ev_reindeer': {   // トナカイ（つの・耳・ベル）
      const ant = d => `<path d="M${150 + d * 50} 46 Q${150 + d * 60} 4 ${150 + d * 84} -26 M${150 + d * 64} 6 Q${150 + d * 92} 0 ${150 + d * 104} -16 M${150 + d * 76} -12 Q${150 + d * 72} -36 ${150 + d * 62} -48 M${150 + d * 58} 22 Q${150 + d * 34} 6 ${150 + d * 28} -10" fill="none" stroke="${L}" stroke-width="17" stroke-linecap="round"/>` +
        `<path d="M${150 + d * 50} 46 Q${150 + d * 60} 4 ${150 + d * 84} -26 M${150 + d * 64} 6 Q${150 + d * 92} 0 ${150 + d * 104} -16 M${150 + d * 76} -12 Q${150 + d * 72} -36 ${150 + d * 62} -48 M${150 + d * 58} 22 Q${150 + d * 34} 6 ${150 + d * 28} -10" fill="none" stroke="#D9B07A" stroke-width="9" stroke-linecap="round"/>`;
      const ear = d => `<ellipse cx="${150 + d * 112}" cy="84" rx="30" ry="15" transform="rotate(${d * 30} ${150 + d * 112} 84)" fill="#A8693E" stroke="${L}" stroke-width="4.5"/><ellipse cx="${150 + d * 112}" cy="84" rx="17" ry="7" transform="rotate(${d * 30} ${150 + d * 112} 84)" fill="#F2B98A"/>`;
      return ant(-1) + ant(1) + ear(-1) + ear(1) + evHood('#A8693E', `<path d="M80 60 Q104 36 140 30" fill="none" stroke="#C88A5A" stroke-width="9" stroke-linecap="round"/>` + evCheek());
    }
    case 'ev_snowman': {   // バケツの ぼうし ＋ ゆき
      return `<path d="M88 74 L102 6 Q150 -8 198 6 L212 74 Z" fill="#3A3F48" stroke="${L}" stroke-width="5" stroke-linejoin="round"/><path d="M104 14 Q150 2 196 14" fill="none" stroke="#6A7380" stroke-width="5"/>` +
        `<path d="M70 70 Q150 56 230 70 Q240 84 230 94 Q150 80 70 94 Q60 84 70 70 Z" fill="#2B2F36" stroke="${L}" stroke-width="5" stroke-linejoin="round"/>` +
        `<path d="M118 28 L126 52 M140 22 L144 50" stroke="#8C949E" stroke-width="4" stroke-linecap="round"/>` +
        `<path d="M100 10 Q150 -6 200 10 Q190 -4 150 -6 Q110 -4 100 10 Z" fill="#FFFFFF" stroke="${L}" stroke-width="3"/>` + evSpark(40, 40, 10) + evSpark(266, 70, 8) + evSpark(250, 12, 6);
    }
    case 'ev_xtree': {   // ツリーの フード（星・オーナメント・モール）
      const tree = `<path d="M150 -48 L94 30 L116 30 L64 100 L86 100 L36 192 Q150 230 264 192 L214 100 L236 100 L184 30 L206 30 Z ${SUIT_HOLE}" fill="#2E8B4E" fill-rule="evenodd" stroke="${L}" stroke-width="5" stroke-linejoin="round"/>`;
      let orn = '';
      [[124, 40, '#E8484F'], [180, 46, '#F2C230'], [62, 118, '#4C8FD6'], [240, 120, '#E8484F'], [56, 188, '#F2C230'], [246, 186, '#4C8FD6'], [150, 6, '#F7F4FF']].forEach(([x, y, c2]) => { orn += `<circle cx="${x}" cy="${y}" r="10" fill="${c2}" stroke="${L}" stroke-width="3"/><circle cx="${x - 3}" cy="${y - 3}" r="3" fill="#FFFFFF" fill-opacity=".8"/>`; });
      return tree + `<clipPath id="evTrC"><path d="M150 -48 L94 30 L116 30 L64 100 L86 100 L36 192 Q150 230 264 192 L214 100 L236 100 L184 30 L206 30 Z ${SUIT_HOLE}" clip-rule="evenodd"/></clipPath><path clip-path="url(#evTrC)" d="M110 20 Q150 36 190 18 M50 176 Q150 214 252 172" fill="none" stroke="#F2C230" stroke-width="6" stroke-dasharray="2 8" stroke-linecap="round"/>` + orn + evStar(150, -54, 26, '#FFD23F', 4) + evSpark(150, -54, 8);
    }
    case 'ev_snowqueen': {   // こおりの かんむり ＋ ゆきの けっしょう
      let cr = `<path d="M70 92 L82 40 L104 74 L120 18 L138 66 L150 -6 L162 66 L180 18 L196 74 L218 40 L230 92 Q150 78 70 92 Z" fill="#CFEAFF" stroke="${L}" stroke-width="5" stroke-linejoin="round"/>`;
      cr += `<path d="M86 82 L94 50 M120 76 L122 36 M150 74 L150 14 M180 76 L178 36 M214 82 L206 50" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-opacity=".9"/>`;
      [[150, 50, 9], [104, 70, 6], [196, 70, 6]].forEach(([x, y, r]) => { cr += `<path d="M${x} ${y - r * 1.6} L${x + r} ${y} L${x} ${y + r * 1.6} L${x - r} ${y} Z" fill="#7FC8F2" stroke="${L}" stroke-width="3"/>`; });
      const flake = (x, y, r) => { let o = ''; for (let i = 0; i < 6; i++) { const a = i * 60; o += `<g transform="rotate(${a} ${x} ${y})"><path d="M${x} ${y} L${x} ${y - r} M${x} ${y - r * 0.6} l${-r * 0.25} ${-r * 0.22} M${x} ${y - r * 0.6} l${r * 0.25} ${-r * 0.22}" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/><path d="M${x} ${y} L${x} ${y - r} M${x} ${y - r * 0.6} l${-r * 0.25} ${-r * 0.22} M${x} ${y - r * 0.6} l${r * 0.25} ${-r * 0.22}" stroke="#7FC8F2" stroke-width="2" stroke-linecap="round"/></g>`; } return o; };
      return cr + flake(258, 40, 26) + flake(42, 90, 18) + evSpark(270, 110, 9) + evSpark(30, 20, 8, '#CFEAFF');
    }
    // ---- お正月 ----
    case 'ev_kagami': {   // 鏡もち（2だん＋だいだい＋はっぱ）
      return evHood('#FBF7EE', `<path d="M78 56 Q110 30 146 26" fill="none" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round"/>` + evCheek()) +
        `<ellipse cx="150" cy="20" rx="70" ry="34" fill="#FBF7EE" stroke="${L}" stroke-width="5"/><path d="M98 12 Q122 -2 150 -6" fill="none" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round"/>` +
        `<circle cx="150" cy="-30" r="26" fill="#F7A21E" stroke="${L}" stroke-width="5"/><circle cx="141" cy="-38" r="6" fill="#FFD27A"/><path d="M150 -54 Q170 -76 196 -66 Q180 -46 152 -52 Z" fill="#4FA35A" stroke="${L}" stroke-width="4" stroke-linejoin="round"/>`;
    }
    case 'ev_sheep': {   // ひつじ（もこもこ＋まいた つの）
      let wool = '';
      for (let i = 0; i < 11; i++) { const a = Math.PI * (1.02 + i * 0.96 / 10), x = 150 + Math.cos(a) * 118, y = 136 + Math.sin(a) * 112; wool += `<circle cx="${r1(x)}" cy="${r1(y)}" r="30" fill="#FFF8EC" stroke="${L}" stroke-width="5"/>`; }
      for (let i = 0; i < 11; i++) { const a = Math.PI * (1.02 + i * 0.96 / 10), x = 150 + Math.cos(a) * 118, y = 136 + Math.sin(a) * 112; wool += `<circle cx="${r1(x)}" cy="${r1(y)}" r="25" fill="#FFF8EC"/>`; }
      const horn = d => `<path d="M${150 + d * 96} 120 a34 34 0 1 1 ${d * 46} 34 a20 20 0 1 1 ${-d * 12} -28" fill="#E8C68A" stroke="${L}" stroke-width="5" stroke-linejoin="round"/><path d="M${150 + d * 108} 112 a22 22 0 1 1 ${d * 26} 24" fill="none" stroke="#C9A060" stroke-width="4"/>`;
      return wool + evHood('#FFF8EC', evCheek()) + horn(-1) + horn(1) + `<circle cx="150" cy="226" r="13" fill="#F2C230" stroke="${L}" stroke-width="4"/><path d="M142 228 L158 228" stroke="${L}" stroke-width="3"/>`;
    }
    case 'ev_furisode': {   // 花の かんざし ＋ つまみの下がり
      let s = evFlower(206, 52, 26, '#F7B6CC', '#F0475E') + evFlower(238, 84, 18, '#FFFFFF', '#F2C230') + evFlower(176, 30, 15, '#F0475E', '#FFD23F') + evFlower(84, 60, 14, '#FFD3E0', '#F0475E');
      s += `<path d="M226 74 L230 136 M240 98 L248 150 M214 76 L208 128" stroke="#E9B730" stroke-width="3"/>`;
      [[230, 140], [248, 156], [208, 132]].forEach(([x, y], i) => { s += `<path d="M${x} ${y - 9} q8 9 0 18 q-8 -9 0 -18 Z" fill="${['#F0475E', '#FFFFFF', '#F7B6CC'][i]}" stroke="${L}" stroke-width="2.5"/>`; });
      return s;
    }
    case 'ev_shishi': {   // 獅子舞の あたま（あたまの上に のせる）
      let teeth = '';
      for (let i = 0; i < 6; i++) teeth += `<rect x="${r1(98 + i * 18)}" y="74" width="14" height="16" rx="3" fill="#FFFFFF" stroke="${L}" stroke-width="2.5"/>`;
      const eye = d => `<ellipse cx="${150 + d * 46}" cy="-6" rx="24" ry="20" fill="#F2C230" stroke="${L}" stroke-width="4"/><circle cx="${150 + d * 46}" cy="-4" r="11" fill="${L}"/><circle cx="${150 + d * 42}" cy="-9" r="4" fill="#FFFFFF"/><path d="M${150 + d * 22} -30 Q${150 + d * 46} -48 ${150 + d * 72} -30" fill="none" stroke="${L}" stroke-width="7" stroke-linecap="round"/>`;
      const ear = d => `<path d="M${150 + d * 84} -10 Q${150 + d * 128} -40 ${150 + d * 132} 6 Q${150 + d * 112} 20 ${150 + d * 92} 12 Z" fill="#C8302B" stroke="${L}" stroke-width="4.5" stroke-linejoin="round"/>`;
      return ear(-1) + ear(1) +
        `<path d="M62 64 Q54 -60 150 -64 Q246 -60 238 64 Q150 82 62 64 Z" fill="#C8302B" stroke="${L}" stroke-width="5" stroke-linejoin="round"/>` +
        `<path d="M88 -36 Q150 -58 212 -36" fill="none" stroke="#2A2328" stroke-width="12" stroke-linecap="round"/><path d="M96 -42 Q150 -60 204 -42" fill="none" stroke="#E9B730" stroke-width="4" stroke-dasharray="6 6"/>` +
        eye(-1) + eye(1) + `<path d="M118 8 Q150 -6 182 8 Q196 24 180 38 Q166 30 150 40 Q134 30 120 38 Q104 24 118 8 Z" fill="#2A2328" stroke="${L}" stroke-width="4" stroke-linejoin="round"/><path d="M130 12 Q150 4 170 12" fill="none" stroke="#E9B730" stroke-width="5" stroke-linecap="round"/><path d="M122 30 q-8 -10 2 -16 M178 30 q8 -10 -2 -16" fill="none" stroke="#E9B730" stroke-width="4" stroke-linecap="round"/>` +
        [[-1, 70], [1, 70], [-1, 30], [1, 30]].map(([d, y]) => `<path d="M${150 + d * 92} ${y} a12 12 0 1 1 ${d * 14} 14 a8 8 0 1 1 ${-d * 6} -10" fill="#3E9A56" stroke="${L}" stroke-width="4"/>`).join('') +
        `<path d="M70 56 Q150 98 230 56 L226 76 Q150 108 74 76 Z" fill="#E9B730" stroke="${L}" stroke-width="4" stroke-linejoin="round"/>` + teeth + `<path d="M118 90 Q150 112 182 90" fill="none" stroke="#F06A80" stroke-width="8" stroke-linecap="round"/>` +
        `<path d="M78 -30 Q100 -52 130 -56" fill="none" stroke="#F06A5E" stroke-width="8" stroke-linecap="round"/>` + evSpark(36, -40, 10, '#FFE07A') + evSpark(268, 20, 8, '#FFE07A');
    }
  }
  return '';
}

/* ========== 体の前 ========== */
function evSuitFront(id, c) {
  const L = EVL(), B = evBody(c), P = B.P, pt = B.pt, cw = B.cw;
  switch (id) {
    case 'ev_gakuran': {   // つめえり（白いカラー）＋ 金ボタン5こ ＋ さくらのバッジ
      let s = `<path d="M${pt(0.92, 0)} L${pt(0.02, 0)}" stroke="#0E1015" stroke-width="5" stroke-linecap="round"/>`;
      s += `<path d="M${pt(-0.06, -cw * 0.42)} Q${pt(0.1, 0)} ${pt(-0.06, cw * 0.42)} L${pt(0.07, cw * 0.4)} Q${pt(0.22, 0)} ${pt(0.07, -cw * 0.4)} Z" fill="#14161B" stroke="${L}" stroke-width="5" stroke-linejoin="round"/>`;
      s += `<path d="M${pt(-0.04, -cw * 0.38)} Q${pt(0.11, 0)} ${pt(-0.04, cw * 0.38)}" fill="none" stroke="#F4F6FA" stroke-width="5" stroke-linecap="round"/>`;
      [0.24, 0.39, 0.54, 0.69, 0.84].forEach(t => { const [x, y] = P(t, 0); s += `<circle cx="${x}" cy="${y}" r="11" fill="#E9B730" stroke="${L}" stroke-width="3.5"/><circle cx="${r1(x - 3)}" cy="${r1(y - 3)}" r="3.5" fill="#FFF3C4"/>`; });
      const [bx, by] = P(0.3, -cw * 0.5); s += evFlower(bx, by, 13, '#F7B6CC', '#F27B9E', true, 2.5);
      // 黒いズボン（白いズボンの上に）
      const pp = B.pants, yb = pp.y + pp.ry * 0.62;
      const tr = evSkirt(B, { top: 0.93, fill: '#1A1D25', bot: 0.62, flare: 1.04, curve: 4 });
      s = tr.s + `<path d="M${r1(pp.x)} ${r1(pp.y - pp.ry * 0.1)} L${r1(pp.x)} ${r1(yb + 2)}" stroke="#FFF6E6" stroke-width="14" stroke-linecap="round"/><path d="M${r1(pp.x - 7)} ${r1(pp.y - pp.ry * 0.05)} L${r1(pp.x - 7)} ${r1(yb)} M${r1(pp.x + 7)} ${r1(pp.y - pp.ry * 0.05)} L${r1(pp.x + 7)} ${r1(yb)}" stroke="${L}" stroke-width="5"/>` + s;
      return s;
    }
    case 'ev_sailor': {   // セーラーえり（紺に白い線）＋ 赤いスカーフ ＋ 紺のプリーツスカート
      const sk = evSkirt(B, { top: 0.9, fill: '#24305E', pleats: 7, pleatCol: '#3B4A86', bot: 0.5, flare: 1.15, curve: 14 });
      const SL = P(-0.04, -cw * 0.95), SR = P(-0.04, cw * 0.95), T = P(0.5, 0), IL = P(0.02, -cw * 0.52), IR = P(0.02, cw * 0.52), TI = P(0.32, 0);
      let s = sk.s + `<path d="M${pt(0.88, -B.hw * 0.95)} L${pt(0.88, B.hw * 0.95)}" stroke="#24305E" stroke-width="12" stroke-linecap="round"/>`;
      s += `<path d="M${SL.join(' ')} L${T.join(' ')} L${SR.join(' ')} L${IR.join(' ')} L${TI.join(' ')} L${IL.join(' ')} Z" fill="#24305E" stroke="${L}" stroke-width="5" stroke-linejoin="round"/>`;
      s += `<path d="M${pt(-0.02, -cw * 0.84)} L${pt(0.455, 0)} L${pt(-0.02, cw * 0.84)} M${pt(0.0, -cw * 0.74)} L${pt(0.42, 0)} L${pt(0.0, cw * 0.74)}" fill="none" stroke="#FFFFFF" stroke-width="3.5" stroke-linejoin="round"/>`;
      const K = P(0.5, 0);   // スカーフの むすびめ
      s += `<path d="M${pt(0.47, -10)} L${pt(0.86, -cw * 0.3)} L${pt(0.92, -cw * 0.12)} L${pt(0.55, 2)} Z M${pt(0.47, 10)} L${pt(0.84, cw * 0.26)} L${pt(0.9, cw * 0.08)} L${pt(0.55, -2)} Z" fill="#D8343F" stroke="${L}" stroke-width="4" stroke-linejoin="round"/>`;
      s += `<path d="M${pt(0.38, -cw * 0.34)} Q${pt(0.44, 0)} ${pt(0.38, cw * 0.34)} L${pt(0.48, cw * 0.16)} L${pt(0.48, -cw * 0.16)} Z" fill="#E8484F" stroke="${L}" stroke-width="4" stroke-linejoin="round"/>`;
      s += `<ellipse cx="${K[0]}" cy="${K[1]}" rx="15" ry="13" fill="#E8484F" stroke="${L}" stroke-width="4"/>`;
      return s;
    }
    case 'ev_randoseru': {   // 赤い かたひも ＋ 防犯ブザー ＋ 名札
      const strap = (sd) => evBand(P(-0.08, sd * cw * 0.66), P(0.78, sd * cw * 0.58), 30, '#D8343F', `<path d="M${pt(0.0, sd * cw * 0.66)} L${pt(0.74, sd * cw * 0.58)}" stroke="#FFFFFF" stroke-opacity=".7" stroke-width="2.5" stroke-dasharray="7 7"/>`);
      let s = strap(-1) + strap(1);
      [-1, 1].forEach(sd => { const [x, y] = P(0.62, sd * cw * 0.6); s += `<rect x="${r1(x - 14)}" y="${r1(y - 8)}" width="28" height="16" rx="4" fill="#C9CDD4" stroke="${L}" stroke-width="3"/>`; });
      const [zx, zy] = P(0.36, -cw * 0.66); s += `<path d="M${zx} ${r1(zy - 6)} L${zx} ${r1(zy + 14)}" stroke="#555" stroke-width="3"/><rect x="${r1(zx - 15)}" y="${r1(zy + 12)}" width="30" height="40" rx="12" fill="#F7D33E" stroke="${L}" stroke-width="4"/><circle cx="${zx}" cy="${r1(zy + 26)}" r="6" fill="#D8343F" stroke="${L}" stroke-width="2.5"/><rect x="${r1(zx - 7)}" y="${r1(zy + 38)}" width="14" height="5" rx="2" fill="#3B2A20"/>`;
      const [tx, ty] = P(0.33, cw * 0.18);
      s += `<g transform="translate(${tx} ${ty})"><rect x="-34" y="-20" width="68" height="40" rx="8" fill="#FFFFFF" stroke="${L}" stroke-width="4"/><rect x="-34" y="-20" width="68" height="12" rx="6" fill="#4C8FD6"/><text x="0" y="14" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="18" fill="${L}">1ねん</text></g>`;
      return s;
    }
    case 'ev_hakama': {   // 着物のえり（白）＋ さくら柄 ＋ むらさきの はかま ＋ ひも
      let s = '';
      [[0.3, -0.62], [0.55, 0.55], [0.7, -0.3], [0.2, 0.72]].forEach(([t, k]) => { const [x, y] = P(t, cw * k); s += evFlower(x, y, 13, '#FFFFFF', '#F27B9E', true, 2.5); });
      const sk = evSkirt(B, { top: 0.66, wTop: 1.02, fill: '#6E3A86', pleats: 6, pleatCol: '#8E56A8', bot: 0.82, flare: 1.18, curve: 20 });
      s += sk.s;
      for (let i = 0; i < 6; i++) { const u = (i + 0.5) / 6, x = sk.xl + (sk.xr - sk.xl) * u; s += evFlower(r1(x), r1(sk.yb - 16 + Math.sin(u * Math.PI) * 14), 9, '#F7B6CC', '#FFFFFF', false, 2); }
      s += `<path d="M${pt(0.66, -B.hw * 1.02)} L${pt(0.66, B.hw * 1.02)}" stroke="#4A2460" stroke-width="10" stroke-linecap="round"/>`;
      const [kx, ky] = P(0.68, cw * 0.32);
      s += `<path d="M${kx} ${ky} q-24 -16 -30 4 q10 14 30 -4 M${kx} ${ky} q24 -16 30 4 q-10 14 -30 -4 M${kx} ${ky} l-10 40 M${kx} ${ky} l12 38" fill="#B884CF" stroke="${L}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>`;
      s += `<path d="M${pt(-0.05, -cw * 0.6)} L${pt(0.62, cw * 0.14)} L${pt(0.62, cw * 0.32)} L${pt(-0.05, -cw * 0.36)} Z" fill="#FFFFFF" stroke="${L}" stroke-width="4" stroke-linejoin="round"/>`;
      s += `<path d="M${pt(-0.05, cw * 0.6)} L${pt(0.5, -cw * 0.02)} L${pt(0.42, -cw * 0.16)} L${pt(-0.05, cw * 0.36)} Z" fill="#FFFFFF" stroke="${L}" stroke-width="4" stroke-linejoin="round"/>`;
      return s;
    }

    case 'ev_teru': {   // 白い布（すそが ひらひら）＋ 赤い ひもの ちょうちょ結び
      const sk = evSkirt(B, { top: 0.08, wTop: 0.42, fill: '#FFFFFF', bot: 0.42, flare: 1.18, wave: 7, waveH: 22 });
      let s = sk.s;
      [[0.3, -0.35], [0.5, 0.3], [0.62, -0.05]].forEach(([t, k]) => { const a = P(t, cw * k), b = P(t + 0.4, cw * k * 1.4); s += `<path d="M${a.join(' ')} Q${r1((a[0] + b[0]) / 2 + 10)} ${r1((a[1] + b[1]) / 2)} ${b.join(' ')}" fill="none" stroke="#DCE6F2" stroke-width="6" stroke-linecap="round"/>`; });
      const [kx, ky] = P(0.06, 0);
      s += `<path d="M${pt(0.04, -cw * 0.5)} Q${pt(0.12, 0)} ${pt(0.04, cw * 0.5)}" fill="none" stroke="#D8343F" stroke-width="9" stroke-linecap="round"/>`;
      s += `<path d="M${kx} ${ky} q-38 -26 -44 4 q12 18 44 -4 M${kx} ${ky} q38 -26 44 4 q-12 18 -44 -4" fill="#E8484F" stroke="${L}" stroke-width="4" stroke-linejoin="round"/><path d="M${kx} ${ky} l-14 46 M${kx} ${ky} l16 44" stroke="#D8343F" stroke-width="7" stroke-linecap="round"/><circle cx="${kx}" cy="${ky}" r="9" fill="#E8484F" stroke="${L}" stroke-width="3.5"/>`;
      return s;
    }
    case 'ev_snail': {   // はっぱの ブローチ・雨つぶ
      const [x, y] = P(0.32, -cw * 0.45);
      return `<path d="M${x - 26} ${y + 14} Q${x - 18} ${y - 26} ${x + 26} ${y - 16} Q${x + 18} ${y + 22} ${x - 26} ${y + 14} Z" fill="#6CC24A" stroke="${L}" stroke-width="4"/><path d="M${x - 20} ${y + 10} Q${x} ${y - 4} ${x + 20} ${y - 12}" fill="none" stroke="#3E8A2A" stroke-width="3"/>` +
        `<path d="M${x + 8} ${y - 18} q8 14 0 20 q-8 -6 0 -20 Z" fill="#9CC8F2" stroke="${L}" stroke-width="2.5"/>`;
    }
    case 'ev_ajisai': {   // はっぱの えり ＋ あじさいの ブローチ
      let s = '';
      [-0.75, -0.38, 0.38, 0.75].forEach((k, i) => { const [x, y] = P(0.05, cw * k), a = k * 60; s += `<ellipse cx="${x}" cy="${y}" rx="22" ry="34" transform="rotate(${a} ${x} ${y})" fill="${i % 2 ? '#5FAF6A' : '#4FA35A'}" stroke="${L}" stroke-width="4"/><path d="M${x} ${y - 28} L${x} ${y + 28}" transform="rotate(${a} ${x} ${y})" stroke="#2F7A3A" stroke-width="3"/>`; });
      const [bx, by] = P(0.3, cw * 0.32), cols = ['#8C7BD8', '#7FA8E8', '#B49AE8', '#6E8EE0'];
      [[0, 0], [-14, -10], [14, -10], [-12, 12], [12, 12], [0, -20], [0, 20]].forEach(([dx, dy], i) => { const r = 10; s += `<g transform="translate(${r1(bx + dx)} ${r1(by + dy)}) rotate(${i * 30})">` + [0, 90, 180, 270].map(a => `<ellipse cx="0" cy="-${r * 0.55}" rx="${r * 0.45}" ry="${r * 0.6}" transform="rotate(${a})" fill="${cols[i % 4]}" stroke="${L}" stroke-width="2"/>`).join('') + `</g>`; });
      return s;
    }
    case 'ev_raijin': {   // とらもようの 服 ＋ とらの こしまき
      let s = '';
      const stripes = (t0, t1, n, w) => { let o = ''; for (let i = 0; i < n; i++) { const t = t0 + (t1 - t0) * (i + 0.5) / n, sd = i % 2 ? 1 : -1; const a = P(t, sd * w), b = P(t + 0.05, sd * w * 0.45), c2 = P(t - 0.02, sd * w * 0.3); o += `<path d="M${a.join(' ')} Q${b.join(' ')} ${c2.join(' ')}" fill="none" stroke="#2A2328" stroke-width="10" stroke-linecap="round"/>`; } return o; };
      s += stripes(0.15, 0.82, 6, cw * 1.0);
      const sk = evSkirt(B, { top: 0.88, fill: '#F2C230', bot: 0.5, flare: 1.08, wave: 8, waveH: 14 });
      s += sk.s;
      for (let i = 0; i < 7; i++) { const u = (i + 0.5) / 7, x0 = sk.a[0] + (sk.b[0] - sk.a[0]) * u, y0 = sk.a[1] + (sk.b[1] - sk.a[1]) * u, x1 = sk.xl + (sk.xr - sk.xl) * u; s += `<path d="M${r1(x0 - 6)} ${r1(y0 + 10)} Q${r1((x0 + x1) / 2 + 12)} ${r1((y0 + sk.yb) / 2)} ${r1(x1 - 4)} ${r1(sk.yb - 6)}" fill="none" stroke="#2A2328" stroke-width="8" stroke-linecap="round"/>`; }
      s += `<path d="M${pt(0.88, -B.hw)} L${pt(0.88, B.hw)}" stroke="#D8343F" stroke-width="14" stroke-linecap="round"/>`;
      return s;
    }
    case 'ev_suika': {   // 赤い実（たね）＋ 白と緑の かわ
      let s = '';
      [[0.25, -0.5], [0.3, 0.2], [0.42, -0.15], [0.5, 0.55], [0.58, -0.6], [0.66, 0.1], [0.38, 0.78], [0.72, -0.3]].forEach(([t, k], i) => { const [x, y] = P(t, cw * k); s += `<path d="M${x} ${y - 10} Q${x + 7} ${y + 2} ${x} ${y + 9} Q${x - 7} ${y + 2} ${x} ${y - 10} Z" transform="rotate(${(i % 3 - 1) * 18} ${x} ${y})" fill="#2A2328"/>`; });
      s += `<path d="M${pt(0.88, -B.hw * 0.98)} L${pt(0.88, B.hw * 0.98)}" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round"/>`;
      const sk = evSkirt(B, { top: 0.92, fill: '#3E9E4A', bot: 0.3, flare: 1.04, curve: 8 });
      s += sk.s;
      for (let i = 1; i < 6; i++) { const u = i / 6, x0 = sk.a[0] + (sk.b[0] - sk.a[0]) * u, y0 = sk.a[1] + (sk.b[1] - sk.a[1]) * u, x1 = sk.xl + (sk.xr - sk.xl) * u; s += `<path d="M${r1(x0)} ${r1(y0 + 6)} q8 ${r1((sk.yb - y0) / 3)} -2 ${r1((sk.yb - y0) * 0.66)} q-6 8 ${r1(x1 - x0)} ${r1((sk.yb - y0) * 0.26)}" fill="none" stroke="#1E5E2A" stroke-width="7" stroke-linecap="round"/>`; }
      return s;
    }
    case 'ev_aloha': {   // ひらいた えり ＋ ハイビスカス柄 ＋ レイ（花の首かざり）
      let s = '';
      const hib = (x, y, r, col) => { let o = ''; for (let i = 0; i < 5; i++) o += `<ellipse cx="${x}" cy="${r1(y - r * 0.55)}" rx="${r1(r * 0.42)}" ry="${r1(r * 0.6)}" transform="rotate(${i * 72} ${x} ${y})" fill="${col}" stroke="${L}" stroke-width="2.5"/>`; return o + `<circle cx="${x}" cy="${y}" r="${r1(r * 0.2)}" fill="#FFD23F"/>`; };
      [[0.32, -0.62, '#FFFFFF'], [0.55, 0.5, '#FFD23F'], [0.7, -0.25, '#FFFFFF'], [0.26, 0.66, '#FFFFFF'], [0.78, 0.55, '#FFFFFF'], [0.5, -0.85, '#FFD23F']].forEach(([t, k, col]) => { const [x, y] = P(t, cw * k); s += hib(x, y, 18, col) + `<path d="M${r1(x + 14)} ${r1(y + 10)} q14 6 22 -4" fill="none" stroke="#1E7A5A" stroke-width="5" stroke-linecap="round"/>`; });
      s += `<path d="M${pt(-0.04, -cw * 0.62)} L${pt(0.34, -cw * 0.04)} L${pt(0.2, -cw * 0.44)} L${pt(0.16, -cw * 0.62)} Z" fill="#2590AE" stroke="${L}" stroke-width="4" stroke-linejoin="round"/>`;
      s += `<path d="M${pt(-0.04, cw * 0.62)} L${pt(0.34, cw * 0.04)} L${pt(0.2, cw * 0.44)} L${pt(0.16, cw * 0.62)} Z" fill="#2590AE" stroke="${L}" stroke-width="4" stroke-linejoin="round"/>`;
      [0.46, 0.66].forEach(t => { const [x, y] = P(t, 0); s += `<circle cx="${x}" cy="${y}" r="7" fill="#FFFFFF" stroke="${L}" stroke-width="2.5"/>`; });
      const lei = ['#F7708A', '#FFD23F', '#FFFFFF', '#F0A3E0', '#FF9E4A'];
      for (let i = 0; i <= 12; i++) { const u = i / 12, ang = Math.PI * u, [x, y] = P(0.04 + Math.sin(ang) * 0.3, -cw * 0.78 * Math.cos(ang)); s += `<g transform="translate(${x} ${y}) rotate(${i * 40})">` + [0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-8" rx="6.5" ry="9" transform="rotate(${a})" fill="${lei[i % 5]}" stroke="${L}" stroke-width="2"/>`).join('') + `<circle r="3" fill="#FFF3C4"/></g>`; }
      return s;
    }
    case 'ev_yukata': {   // 着物のえり ＋ 金魚の柄 ＋ 黄色い帯 ＋ 浴衣のすそ
      const sk = evSkirt(B, { top: 0.84, wTop: 1.0, fill: '#2C4F9E', bot: 0.86, flare: 1.02, curve: 10 });
      let s = sk.s;
      const fish = (x, y, sc, flip) => `<g transform="translate(${x} ${y}) scale(${flip ? -sc : sc} ${sc})"><path d="M-16 0 Q-4 -14 12 -4 Q18 0 12 4 Q-4 14 -16 0 Z" fill="#F0475E" stroke="${L}" stroke-width="2.5"/><path d="M12 0 L26 -12 Q22 0 26 12 Z" fill="#F7708A" stroke="${L}" stroke-width="2.5" stroke-linejoin="round"/><circle cx="-8" cy="-2" r="2.2" fill="${L}"/></g>`;
      [[0.3, -0.6, 1, 0], [0.55, 0.5, 0.9, 1], [0.7, -0.4, 0.8, 1], [0.24, 0.72, 0.8, 0]].forEach(([t, k, sc, fl]) => { const [x, y] = P(t, cw * k); s += fish(x, y, sc * 1.3, fl); });
      const p = B.pants;
      [[-0.6, 0.35, 1, 1], [0.5, 0.7, 1.2, 0], [0.05, 0.15, 0.9, 0]].forEach(([kx, ky, sc, fl]) => { s += fish(r1(p.x + p.rx * kx), r1(p.y + p.ry * ky), sc * 1.3, fl); });
      [[-0.2, 0.55], [0.65, 0.2]].forEach(([kx, ky]) => { const x = r1(p.x + p.rx * kx), y = r1(p.y + p.ry * ky); s += `<path d="M${x - 24} ${y} q12 -8 24 0 q12 8 24 0" fill="none" stroke="#9CC8F2" stroke-width="4" stroke-linecap="round"/>`; });
      s += `<path d="M${pt(-0.05, -cw * 0.62)} L${pt(0.62, cw * 0.16)} L${pt(0.62, cw * 0.36)} L${pt(-0.05, -cw * 0.38)} Z" fill="#1C3878" stroke="${L}" stroke-width="4" stroke-linejoin="round"/><path d="M${pt(-0.04, -cw * 0.56)} L${pt(0.6, cw * 0.2)}" stroke="#F4F6FA" stroke-width="5"/>`;
      s += `<path d="M${pt(-0.05, cw * 0.62)} L${pt(0.5, -cw * 0.02)} L${pt(0.42, -cw * 0.16)} L${pt(-0.05, cw * 0.38)} Z" fill="#1C3878" stroke="${L}" stroke-width="4" stroke-linejoin="round"/><path d="M${pt(-0.04, cw * 0.56)} L${pt(0.47, -cw * 0.04)}" stroke="#F4F6FA" stroke-width="5"/>`;
      s += evBand(P(0.72, -B.hw * 1.02), P(0.72, B.hw * 1.02), 46, '#F2C230', `<path d="M${pt(0.72, -B.hw * 0.98)} L${pt(0.72, B.hw * 0.98)}" stroke="#D8343F" stroke-width="6"/>`);
      return s;
    }
    case 'ev_shark': {   // 白い おなか
      const b = B.belly;
      return `<path d="M${pt(0.12, -cw * 0.5)} Q${pt(0.1, 0)} ${pt(0.12, cw * 0.5)} Q${pt(0.55, cw * 0.72)} ${pt(0.95, cw * 0.5)} L${pt(0.95, -cw * 0.5)} Q${pt(0.55, -cw * 0.72)} ${pt(0.12, -cw * 0.5)} Z" fill="#F4F8FC" stroke="${L}" stroke-width="5" stroke-linejoin="round"/>` +
        [0.35, 0.5, 0.65, 0.8].map(t => `<path d="M${pt(t, -cw * 0.42)} Q${pt(t + 0.04, 0)} ${pt(t, cw * 0.42)}" fill="none" stroke="#C9D8E8" stroke-width="5" stroke-linecap="round"/>`).join('');
    }

    case 'ev_pumpkin': {   // かぼちゃの すじ ＋ 葉っぱの えり
      let s = '';
      [-0.6, -0.2, 0.2, 0.6].forEach(k => { s += `<path d="M${pt(0.12, cw * k * 0.7)} Q${pt(0.55, cw * k * 1.15)} ${pt(0.98, cw * k * 0.85)}" fill="none" stroke="#C9601A" stroke-width="6" stroke-linecap="round"/>`; });
      [-0.55, -0.18, 0.18, 0.55].forEach((k, i) => { const [x, y] = P(0.04, cw * k), a = k * 70; s += `<path d="M${x} ${y + 26} Q${x - 22} ${y} ${x} ${y - 22} Q${x + 22} ${y} ${x} ${y + 26} Z" transform="rotate(${a} ${x} ${y})" fill="${i % 2 ? '#4FA35A' : '#5FAF6A'}" stroke="${L}" stroke-width="4"/>`; });
      const [x, y] = P(0.48, 0);
      s += `<path d="M${x - 30} ${y - 6} l12 -16 l12 16 Z M${x + 6} ${y - 6} l12 -16 l12 16 Z" fill="#3B2A20"/><path d="M${x - 34} ${y + 8} Q${x} ${y + 40} ${x + 34} ${y + 8} L${x + 20} ${y + 14} L${x + 10} ${y + 6} L${x} ${y + 16} L${x - 10} ${y + 6} L${x - 20} ${y + 14} Z" fill="#3B2A20"/>`;
      return s;
    }
    case 'ev_ghost': {   // シーツの すそ（ひらひら）
      const sk = evSkirt(B, { top: 0.08, wTop: 0.48, fill: '#F7F4FF', bot: 0.5, flare: 1.2, wave: 5, waveH: 34 });
      let s = sk.s;
      [[0.3, -0.4], [0.45, 0.35], [0.7, -0.1]].forEach(([t, k]) => { const a = P(t, cw * k), b = P(t + 0.45, cw * k * 1.5); s += `<path d="M${a.join(' ')} Q${r1((a[0] + b[0]) / 2 - 8)} ${r1((a[1] + b[1]) / 2)} ${b.join(' ')}" fill="none" stroke="#DCD4F2" stroke-width="7" stroke-linecap="round"/>`; });
      return s;
    }
    case 'ev_mummy': {   // ほうたい（体と足）：まるみに そって ぐるぐる
      let s = '';
      const wrap = (d, w = 24) => `<path d="${d}" fill="none" stroke="${L}" stroke-width="${w + 8}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#EFE6CF" stroke-width="${w}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#D2C3A0" stroke-width="3" stroke-dasharray="7 9"/>`;
      [[0.16, 0.28], [0.36, 0.3], [0.56, 0.42], [0.76, 0.58], [0.94, 0.86]].forEach(([t0, t1], i) => {
        const sd = i % 2 ? 1 : -1, a = P(t0, sd * -B.hw * 0.98), b = P(t1, sd * B.hw * 0.98), m = P((t0 + t1) / 2 + 0.07, 0);
        s += wrap(`M${a.join(' ')} Q${m.join(' ')} ${b.join(' ')}`);
      });
      const p = B.pants, X = k => r1(p.x + p.rx * k), Y = k => r1(p.y + p.ry * k);
      s += wrap(`M${X(-1.0)} ${Y(-0.1)} Q${X(-0.5)} ${Y(0.25)} ${X(-0.05)} ${Y(0.05)}`) + wrap(`M${X(0.05)} ${Y(0.05)} Q${X(0.5)} ${Y(0.3)} ${X(1.0)} ${Y(-0.05)}`) +
        wrap(`M${X(-0.95)} ${Y(0.55)} Q${X(-0.55)} ${Y(0.85)} ${X(-0.15)} ${Y(0.6)}`) + wrap(`M${X(0.15)} ${Y(0.6)} Q${X(0.55)} ${Y(0.9)} ${X(0.95)} ${Y(0.5)}`);
      const [ex, ey] = P(0.76, B.hw * 1.0);
      s += `<path d="M${ex} ${ey} q40 10 46 50 q-14 -6 -24 6 q-4 -30 -30 -40 Z" fill="#EFE6CF" stroke="${L}" stroke-width="4" stroke-linejoin="round"/>`;
      return s;
    }
    case 'ev_dracula': {   // 白い ジャボ ＋ 赤い ブローチ ＋ ベスト
      let s = `<path d="M${pt(0.02, -cw * 0.5)} L${pt(0.95, -cw * 0.28)} L${pt(0.95, cw * 0.28)} L${pt(0.02, cw * 0.5)} L${pt(0.35, 0)} Z" fill="#7A1E2E" stroke="${L}" stroke-width="4" stroke-linejoin="round"/>`;
      [0.5, 0.65, 0.8].forEach(t => { const [x, y] = P(t, 0); s += `<circle cx="${x}" cy="${y}" r="7" fill="#E9B730" stroke="${L}" stroke-width="2.5"/>`; });
      const [jx, jy] = P(0.22, 0);
      s += `<path d="M${jx} ${jy - 24} Q${jx - 40} ${jy - 10} ${jx - 30} ${jy + 30} Q${jx - 14} ${jy + 22} ${jx - 6} ${jy + 40} Q${jx} ${jy + 30} ${jx + 6} ${jy + 40} Q${jx + 14} ${jy + 22} ${jx + 30} ${jy + 30} Q${jx + 40} ${jy - 10} ${jx} ${jy - 24} Z" fill="#FFFFFF" stroke="${L}" stroke-width="4" stroke-linejoin="round"/>`;
      s += `<path d="M${jx - 22} ${jy + 4} q8 10 0 20 M${jx + 22} ${jy + 4} q-8 10 0 20" fill="none" stroke="#D8D4E8" stroke-width="3"/>`;
      s += `<path d="M${jx} ${jy - 26} l14 14 l-14 14 l-14 -14 Z" fill="#D8343F" stroke="${L}" stroke-width="3.5" stroke-linejoin="round"/><circle cx="${jx - 4}" cy="${jy - 16}" r="3" fill="#FFB0B6"/>`;
      return s;
    }
    case 'ev_reindeer': {   // くびわの すず ＋ おなか
      let s = `<path d="M${pt(0.14, -cw * 0.5)} Q${pt(0.1, 0)} ${pt(0.14, cw * 0.5)} Q${pt(0.6, cw * 0.66)} ${pt(0.95, cw * 0.4)} L${pt(0.95, -cw * 0.4)} Q${pt(0.6, -cw * 0.66)} ${pt(0.14, -cw * 0.5)} Z" fill="#F4E2C8" stroke="${L}" stroke-width="4" stroke-linejoin="round"/>`;
      s += `<path d="M${pt(0.02, -cw * 0.62)} Q${pt(0.14, 0)} ${pt(0.02, cw * 0.62)}" fill="none" stroke="${L}" stroke-width="20" stroke-linecap="round"/><path d="M${pt(0.02, -cw * 0.62)} Q${pt(0.14, 0)} ${pt(0.02, cw * 0.62)}" fill="none" stroke="#D8343F" stroke-width="13" stroke-linecap="round"/>`;
      const [x, y] = P(0.16, 0);
      s += `<circle cx="${x}" cy="${r1(y + 18)}" r="20" fill="#F2C230" stroke="${L}" stroke-width="4"/><path d="M${x - 14} ${r1(y + 18)} L${x + 14} ${r1(y + 18)}" stroke="${L}" stroke-width="3"/><circle cx="${x}" cy="${r1(y + 26)}" r="4" fill="${L}"/><circle cx="${x - 6}" cy="${r1(y + 10)}" r="4" fill="#FFF3C4"/>`;
      return s;
    }
    case 'ev_snowman': {   // マフラー ＋ 石炭の ボタン
      let s = '';
      [0.36, 0.56, 0.76].forEach(t => { const [x, y] = P(t, 0); s += `<circle cx="${x}" cy="${y}" r="12" fill="#2B2F36" stroke="${L}" stroke-width="3"/><circle cx="${x - 3}" cy="${y - 4}" r="3" fill="#6A7380"/>`; });
      s += `<path d="M${pt(0.0, -cw * 0.62)} Q${pt(0.16, 0)} ${pt(0.0, cw * 0.62)}" fill="none" stroke="${L}" stroke-width="34" stroke-linecap="round"/><path d="M${pt(0.0, -cw * 0.62)} Q${pt(0.16, 0)} ${pt(0.0, cw * 0.62)}" fill="none" stroke="#D8343F" stroke-width="26" stroke-linecap="round"/>`;
      s += `<path d="M${pt(0.0, -cw * 0.5)} Q${pt(0.14, 0)} ${pt(0.0, cw * 0.5)}" fill="none" stroke="#2E8B4E" stroke-width="7" stroke-dasharray="14 14"/>`;
      s += evBand(P(0.08, cw * 0.42), P(0.5, cw * 0.62), 30, '#D8343F', `<path d="M${pt(0.42, cw * 0.5)} L${pt(0.44, cw * 0.74)}" stroke="#2E8B4E" stroke-width="6"/>`);
      const [fx, fy] = P(0.52, cw * 0.62);
      s += `<path d="M${fx - 14} ${fy} l-4 16 M${fx - 4} ${fy + 2} l-2 16 M${fx + 6} ${fy + 2} l0 16 M${fx + 16} ${fy} l2 16" stroke="#D8343F" stroke-width="5" stroke-linecap="round"/>`;
      return s;
    }
    case 'ev_xtree': {   // モールと オーナメント ＋ 木の みき（すそ）
      let s = '';
      [[0.22, -0.8, 0.5, 0.8], [0.5, -0.9, 0.78, 0.9]].forEach(([t0, k0, t1, k1]) => { s += `<path d="M${pt(t0, cw * k0)} Q${pt((t0 + t1) / 2 + 0.12, 0)} ${pt(t1, cw * k1)}" fill="none" stroke="#F2C230" stroke-width="9" stroke-linecap="round" stroke-dasharray="1 12"/>`; });
      [[0.3, -0.45, '#E8484F'], [0.42, 0.4, '#4C8FD6'], [0.62, -0.2, '#F2C230'], [0.72, 0.62, '#E8484F'], [0.82, -0.7, '#4C8FD6'], [0.26, 0.75, '#F2C230']].forEach(([t, k, col]) => { const [x, y] = P(t, cw * k); s += `<rect x="${x - 5}" y="${y - 22}" width="10" height="7" fill="#C9CDD4" stroke="${L}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="15" fill="${col}" stroke="${L}" stroke-width="3.5"/><circle cx="${x - 5}" cy="${y - 5}" r="4" fill="#FFFFFF" fill-opacity=".85"/>`; });
      const sk = evSkirt(B, { top: 0.9, fill: '#D8343F', bot: 0.28, flare: 1.02, curve: 6 });
      s += sk.s + `<path d="M${sk.a.join(' ')} L${sk.b.join(' ')}" stroke="#FFFFFF" stroke-width="8" stroke-dasharray="16 12"/>`;
      return s;
    }
    case 'ev_snowqueen': {   // ファーの えり ＋ 雪の ブローチ ＋ ドレスの すそ
      const sk = evSkirt(B, { top: 0.82, wTop: 1.0, fill: '#BFE3F8', bot: 0.9, flare: 1.22, wave: 6, waveH: 16 });
      let s = sk.s;
      for (let i = 0; i < 6; i++) { const u = (i + 0.5) / 6, x = sk.xl + (sk.xr - sk.xl) * u; s += `<path d="M${r1(x)} ${r1(sk.yb - 34)} l0 22 M${r1(x - 10)} ${r1(sk.yb - 23)} l20 0 M${r1(x - 7)} ${r1(sk.yb - 30)} l14 14 M${r1(x + 7)} ${r1(sk.yb - 30)} l-14 14" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round"/>`; }
      s += `<path d="M${pt(0.82, -B.hw)} L${pt(0.82, B.hw)}" stroke="#7FC8F2" stroke-width="10" stroke-linecap="round"/>`;
      for (let i = 0; i <= 10; i++) { const k = -0.82 + i * 0.164, [x, y] = P(0.04 + Math.abs(k) * -0.05, cw * k); s += `<circle cx="${x}" cy="${y}" r="17" fill="#FFFFFF" stroke="${L}" stroke-width="3.5"/>`; }
      for (let i = 0; i <= 10; i++) { const k = -0.82 + i * 0.164, [x, y] = P(0.04 + Math.abs(k) * -0.05, cw * k); s += `<circle cx="${x}" cy="${y}" r="13.5" fill="#FFFFFF"/>`; }
      const [bx, by] = P(0.34, 0);
      s += `<path d="M${bx} ${by - 20} L${bx + 14} ${by} L${bx} ${by + 20} L${bx - 14} ${by} Z" fill="#7FC8F2" stroke="${L}" stroke-width="3.5"/><circle cx="${bx}" cy="${by}" r="5" fill="#FFFFFF"/>`;
      return s;
    }
    case 'ev_kagami': {   // 紅白の 水引（えり）＋ 四方紅
      let s = `<path d="M${pt(0.04, -cw * 0.6)} Q${pt(0.18, 0)} ${pt(0.04, cw * 0.6)}" fill="none" stroke="${L}" stroke-width="22" stroke-linecap="round"/><path d="M${pt(0.04, -cw * 0.6)} Q${pt(0.18, 0)} ${pt(0.04, cw * 0.6)}" fill="none" stroke="#D8343F" stroke-width="8" stroke-linecap="round" transform="translate(0 -4)"/><path d="M${pt(0.04, -cw * 0.6)} Q${pt(0.18, 0)} ${pt(0.04, cw * 0.6)}" fill="none" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" transform="translate(0 5)"/>`;
      const [x, y] = P(0.18, 0);
      s += `<path d="M${x} ${y} q-34 -24 -40 4 q14 16 40 -4 M${x} ${y} q34 -24 40 4 q-14 16 -40 -4" fill="#FFFFFF" stroke="#D8343F" stroke-width="4"/><path d="M${x} ${y} l-10 44 M${x} ${y} l10 44" stroke="#D8343F" stroke-width="5"/><circle cx="${x}" cy="${y}" r="7" fill="#E9B730" stroke="${L}" stroke-width="3"/>`;
      const sk = evSkirt(B, { top: 0.9, fill: '#F4F6FA', bot: 0.36, flare: 1.04, curve: 6 });
      s += sk.s + `<path d="M${sk.a.join(' ')} L${sk.b.join(' ')}" stroke="#D8343F" stroke-width="12" stroke-linecap="round"/>`;
      return s;
    }
    case 'ev_sheep': {   // もこもこの むね
      let s = '';
      [[0.3, -0.4], [0.3, 0.1], [0.3, 0.55], [0.5, -0.65], [0.5, -0.15], [0.5, 0.35], [0.7, -0.4], [0.7, 0.1], [0.7, 0.6], [0.88, -0.2], [0.88, 0.35]].forEach(([t, k]) => { const [x, y] = P(t, cw * k); s += `<path d="M${x - 14} ${y} a8 8 0 0 1 14 -8 a8 8 0 0 1 14 8" fill="none" stroke="#E2D2B4" stroke-width="5" stroke-linecap="round"/>`; });
      return s;
    }
    case 'ev_furisode': {   // 花の柄 ＋ 金の えり ＋ 帯（金）＋ 帯じめ ＋ 着物の すそ
      const sk = evSkirt(B, { top: 0.84, wTop: 1.0, fill: '#C92A40', bot: 0.9, flare: 1.04, curve: 10 });
      let s = sk.s;
      [[0.28, -0.6, 18, '#FFFFFF'], [0.5, 0.55, 15, '#F7B6CC'], [0.62, -0.25, 13, '#FFD23F'], [0.22, 0.72, 13, '#F7B6CC']].forEach(([t, k, r, col]) => { const [x, y] = P(t, cw * k); s += evFlower(x, y, r, col, '#E9B730', true, 2.5); });
      const p = B.pants;
      [[-0.65, 0.45, 20, '#FFFFFF'], [0.55, 0.65, 22, '#F7B6CC'], [0.0, 0.2, 14, '#FFD23F'], [0.85, 0.0, 12, '#FFFFFF']].forEach(([kx, ky, r, col]) => { s += evFlower(r1(p.x + p.rx * kx), r1(p.y + p.ry * ky), r, col, '#E9B730', true, 2.5); });
      s += `<path d="M${r1(sk.xl + 10)} ${r1(sk.yb - 14)} Q${r1(p.x)} ${r1(sk.yb + 2)} ${r1(sk.xr - 10)} ${r1(sk.yb - 14)}" fill="none" stroke="#E9B730" stroke-width="5"/>`;
      s += `<path d="M${pt(-0.05, -cw * 0.62)} L${pt(0.62, cw * 0.16)} L${pt(0.62, cw * 0.36)} L${pt(-0.05, -cw * 0.38)} Z" fill="#E9B730" stroke="${L}" stroke-width="4" stroke-linejoin="round"/><path d="M${pt(-0.04, -cw * 0.55)} L${pt(0.6, cw * 0.22)}" stroke="#FFFFFF" stroke-width="5"/>`;
      s += `<path d="M${pt(-0.05, cw * 0.62)} L${pt(0.5, -cw * 0.02)} L${pt(0.42, -cw * 0.16)} L${pt(-0.05, cw * 0.38)} Z" fill="#E9B730" stroke="${L}" stroke-width="4" stroke-linejoin="round"/><path d="M${pt(-0.04, cw * 0.55)} L${pt(0.47, -cw * 0.05)}" stroke="#FFFFFF" stroke-width="5"/>`;
      s += evBand(P(0.7, -B.hw * 1.02), P(0.7, B.hw * 1.02), 54, '#E9B730', `<path d="M${pt(0.66, -B.hw * 0.98)} L${pt(0.66, B.hw * 0.98)} M${pt(0.74, -B.hw * 0.98)} L${pt(0.74, B.hw * 0.98)}" stroke="#C99A2A" stroke-width="3"/><path d="M${pt(0.7, -B.hw * 0.98)} L${pt(0.7, B.hw * 0.98)}" stroke="#F0475E" stroke-width="7"/>`);
      const [kx, ky] = P(0.7, -cw * 0.1);
      s += `<path d="M${kx} ${ky} q-20 -16 -26 2 q8 12 26 -2 M${kx} ${ky} q20 -16 26 2 q-8 12 -26 -2" fill="#F0475E" stroke="${L}" stroke-width="3"/>`;
      return s;
    }
    case 'ev_shishi': {   // 緑の からくさの 布（体の前）
      const sk = evSkirt(B, { top: 0.0, wTop: 0.6, fill: '#3E9A56', bot: 0.6, flare: 1.18, wave: 6, waveH: 10 });
      let s = sk.s;
      const swirl = (x, y, r) => `<path d="M${x} ${y} a${r} ${r} 0 1 1 ${r} ${r} a${r * 1.6} ${r * 1.6} 0 1 1 ${-r * 2.6} ${-r * 1.4}" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round"/>`;
      [[0.3, -0.4], [0.35, 0.45], [0.62, -0.05], [0.7, 0.75], [0.78, -0.8]].forEach(([t, k]) => { const [x, y] = P(t, cw * k); s += swirl(x, y, 12); });
      const p = B.pants;
      [[-0.6, 0.3], [0.4, 0.4], [0.95, 0.1], [-1.0, -0.1]].forEach(([kx, ky]) => { s += swirl(r1(p.x + p.rx * kx), r1(p.y + p.ry * ky), 12); });
      s += `<path d="M${pt(0.02, -cw * 0.46)} Q${pt(0.1, 0)} ${pt(0.02, cw * 0.46)}" fill="none" stroke="#C8302B" stroke-width="12" stroke-linecap="round"/>`;
      return s;
    }
  }
  return '';
}

/* ========== 体のうしろ ========== */
function evSuitBack(id, c) {
  const L = EVL(), B = evBody(c), b = B.belly, p = B.pants, f = n => r1(n);
  switch (id) {
    case 'ev_randoseru': {   // 赤いランドセル
      const x0 = b.x - b.rx * 1.32, x1 = b.x + b.rx * 1.32, y0 = b.y - b.ry * 2.15, y1 = b.y + b.ry * 0.9;
      return `<rect x="${f(x0)}" y="${f(y0)}" width="${f(x1 - x0)}" height="${f(y1 - y0)}" rx="46" fill="#D8343F" stroke="${L}" stroke-width="7"/>` +
        `<path d="M${f(x0 + 6)} ${f(y0 + 70)} Q${f((x0 + x1) / 2)} ${f(y0 - 10)} ${f(x1 - 6)} ${f(y0 + 70)} L${f(x1 - 6)} ${f(y0 + (y1 - y0) * 0.72)} Q${f((x0 + x1) / 2)} ${f(y0 + (y1 - y0) * 0.8)} ${f(x0 + 6)} ${f(y0 + (y1 - y0) * 0.72)} Z" fill="#B82431" stroke="${L}" stroke-width="5" stroke-linejoin="round"/>` +
        `<path d="M${f(x0 + 26)} ${f(y0 + 60)} Q${f((x0 + x1) / 2)} ${f(y0 + 12)} ${f(x1 - 26)} ${f(y0 + 60)}" fill="none" stroke="#FFB0B6" stroke-width="7" stroke-linecap="round" stroke-opacity=".7"/>` +
        `<rect x="${f(x0 - 14)}" y="${f(y0 + 40)}" width="22" height="70" rx="10" fill="#B82431" stroke="${L}" stroke-width="5"/><rect x="${f(x1 - 8)}" y="${f(y0 + 40)}" width="22" height="70" rx="10" fill="#B82431" stroke="${L}" stroke-width="5"/>`;
    }
    case 'ev_hakama': {   // 卒業証書のつつ（ななめに せおう）＋ さくらふぶき
      const x1 = b.x - b.rx * 1.3, y1 = b.y - b.ry * 2.2, x2 = b.x + b.rx * 1.1, y2 = b.y + b.ry * 0.6;
      let s = `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${L}" stroke-width="50" stroke-linecap="round"/>` +
        `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="#2A2328" stroke-width="40" stroke-linecap="round"/>` +
        `<line x1="${f(x1 + (x2 - x1) * .05)}" y1="${f(y1 + (y2 - y1) * .05)}" x2="${f(x1 + (x2 - x1) * .35)}" y2="${f(y1 + (y2 - y1) * .35)}" stroke="#5B4E56" stroke-width="10" stroke-linecap="round"/>` +
        `<circle cx="${f(x1)}" cy="${f(y1)}" r="22" fill="#E9B730" stroke="${L}" stroke-width="5"/>` +
        `<path d="M${f(x1 + 30)} ${f(y1 + 50)} q-36 -10 -30 22 q18 6 30 -22 q20 -30 36 -6 q-14 20 -36 6" fill="#D8343F" stroke="${L}" stroke-width="4"/>`;
      [[-1.5, -2.6, 12], [1.55, -2.2, 10], [1.7, -0.6, 13], [-1.65, -0.4, 10]].forEach(([kx, ky, r]) => { s += evFlower(f(b.x + b.rx * kx), f(b.y + b.ry * ky), r * 1.6, '#F7B6CC', '#FFFFFF', true, 3); });
      return s;
    }

    case 'ev_snail': {   // うずまきの から
      const cx = b.x + b.rx * 0.95, cy = b.y - b.ry * 0.55, R = b.rx * 1.12;
      let sp = `M${f(cx)} ${f(cy)}`;
      for (let a = 0; a <= Math.PI * 5.2; a += 0.2) { const r = R * 0.06 + R * 0.88 * a / (Math.PI * 5.2); sp += ` L${f(cx + Math.cos(a) * r)} ${f(cy + Math.sin(a) * r)}`; }
      return `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R)}" fill="#C98A4B" stroke="${L}" stroke-width="7"/>` +
        `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R * 0.86)}" fill="#E0A766"/>` +
        `<path d="${sp}" fill="none" stroke="#8E5A2A" stroke-width="12" stroke-linecap="round"/>` +
        `<path d="M${f(cx - R * 0.7)} ${f(cy - R * 0.4)} Q${f(cx - R * 0.3)} ${f(cy - R * 0.95)} ${f(cx + R * 0.3)} ${f(cy - R * 0.85)}" fill="none" stroke="#FFFFFF" stroke-opacity=".45" stroke-width="12" stroke-linecap="round"/>`;
    }
    case 'ev_ajisai': {   // むらさきの 和がさ（じゃのめ）
      const cx = b.x + b.rx * 0.9, cy = b.y - b.ry * 2.6, R = b.rx * 1.45;
      let ribs = '';
      for (let i = 0; i <= 8; i++) { const a = Math.PI + Math.PI * i / 8; ribs += `<path d="M${f(cx)} ${f(cy)} L${f(cx + Math.cos(a) * R)} ${f(cy + Math.sin(a) * R * 0.62)}" stroke="#5A3A9A" stroke-width="4"/>`; }
      let edge = `M${f(cx - R)} ${f(cy)}`;
      for (let i = 0; i < 8; i++) { const a0 = Math.PI + Math.PI * i / 8, a1 = Math.PI + Math.PI * (i + 1) / 8, am = (a0 + a1) / 2; edge += ` Q${f(cx + Math.cos(am) * R * 0.92)} ${f(cy + Math.sin(am) * R * 0.57)} ${f(cx + Math.cos(a1) * R)} ${f(cy + Math.sin(a1) * R * 0.62)}`; }
      return `<g transform="rotate(16 ${f(cx)} ${f(cy + R * 0.5)})"><path d="M${f(cx)} ${f(cy)} L${f(cx)} ${f(cy + R * 1.3)}" stroke="${L}" stroke-width="16" stroke-linecap="round"/><path d="M${f(cx)} ${f(cy)} L${f(cx)} ${f(cy + R * 1.3)}" stroke="#C8A060" stroke-width="9" stroke-linecap="round"/>` +
        `<path d="${edge} Q${f(cx)} ${f(cy - R * 0.3)} ${f(cx - R)} ${f(cy)} Z" fill="#8C7BD8" stroke="${L}" stroke-width="7" stroke-linejoin="round"/>` +
        `<path d="M${f(cx - R * 0.5)} ${f(cy - R * 0.32)} Q${f(cx)} ${f(cy - R * 0.5)} ${f(cx + R * 0.5)} ${f(cy - R * 0.32)}" fill="none" stroke="#FFFFFF" stroke-width="16" stroke-opacity=".75"/>` + ribs +
        `<circle cx="${f(cx)}" cy="${f(cy - R * 0.62)}" r="10" fill="#5A3A9A" stroke="${L}" stroke-width="4"/></g>`;
    }
    case 'ev_raijin': {   // せなかの 太鼓の わ
      const cx = b.x, cy = b.y - b.ry * 1.1, R = b.rx * 1.75;
      let s = `<path d="M${f(cx - R)} ${f(cy + R * 0.25)} A${f(R)} ${f(R)} 0 1 1 ${f(cx + R)} ${f(cy + R * 0.25)}" fill="none" stroke="${L}" stroke-width="22" stroke-linecap="round"/><path d="M${f(cx - R)} ${f(cy + R * 0.25)} A${f(R)} ${f(R)} 0 1 1 ${f(cx + R)} ${f(cy + R * 0.25)}" fill="none" stroke="#D8343F" stroke-width="13" stroke-linecap="round"/>`;
      for (let i = 0; i < 8; i++) {
        const a = Math.PI * (0.9 + i * 1.2 / 7), x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
        let studs = ''; for (let k = 0; k < 10; k++) { const q = k * Math.PI / 5; studs += `<circle cx="${f(Math.cos(q) * 39)}" cy="${f(Math.sin(q) * 39)}" r="3.5" fill="#E9B730"/>`; }
        s += `<g transform="translate(${f(x)} ${f(y)})"><circle r="48" fill="#B8402F" stroke="${L}" stroke-width="6"/><circle r="34" fill="#F4E7C8" stroke="${L}" stroke-width="4"/>${studs}` +
          [0, 120, 240].map(r => `<g transform="rotate(${r + i * 20})"><path d="M0 -4 a10 10 0 1 1 10 10 q-12 6 -18 -10 q2 -8 8 0 Z" transform="translate(-2 -10) scale(.9)" fill="#D8343F"/></g>`).join('') + `</g>`;
      }
      return s;
    }
    case 'ev_yukata': {   // 帯の ちょうちょ結び（よこから見える）＋ うちわ
      const [kx, ky] = B.P(0.72, -B.hw * 1.02), [ux, uy] = B.P(0.3, B.hw * 1.15);
      return `<g transform="translate(${f(ux + 20)} ${f(uy - 60)}) rotate(24)"><path d="M0 70 L0 160" stroke="${L}" stroke-width="16" stroke-linecap="round"/><path d="M0 70 L0 160" stroke="#C8A060" stroke-width="9" stroke-linecap="round"/><circle cx="0" cy="0" r="78" fill="#FFFFFF" stroke="${L}" stroke-width="7"/><circle cx="0" cy="0" r="66" fill="#DDF4FA"/>` +
        `<path d="M-34 6 Q-12 -20 20 -2 Q28 4 20 9 Q-12 24 -34 6 Z" fill="#F0475E" stroke="${L}" stroke-width="4"/><path d="M20 4 L44 -16 Q38 4 44 24 Z" fill="#F7708A" stroke="${L}" stroke-width="4" stroke-linejoin="round"/><path d="M-54 38 q14 -10 28 0 q14 10 28 0" fill="none" stroke="#4C8FD6" stroke-width="5" stroke-linecap="round"/></g>` +
        `<g transform="translate(${f(kx - 34)} ${f(ky)}) rotate(-10)"><path d="M0 0 C-30 -70 -110 -56 -100 0 C-92 46 -34 34 0 0 Z M0 0 C-4 -60 46 -84 64 -40 C74 -12 30 6 0 0 Z" fill="#F2C230" stroke="${L}" stroke-width="6" stroke-linejoin="round"/><path d="M-70 -14 Q-56 -30 -36 -24" fill="none" stroke="#FFF3C4" stroke-width="6" stroke-linecap="round"/><path d="M0 0 L-30 96 L-6 88 Z M0 0 L24 90 L44 74 Z" fill="#E0A81E" stroke="${L}" stroke-width="5" stroke-linejoin="round"/><ellipse cx="0" cy="0" rx="18" ry="22" fill="#E0A81E" stroke="${L}" stroke-width="5"/></g>`;
    }
    case 'ev_shark': {   // おびれ ＋ あわ
      const x = p.x + p.rx * 0.9, y = p.y - p.ry * 0.1;
      return `<path d="M${f(x - 40)} ${f(y - 10)} Q${f(x + 40)} ${f(y - 10)} ${f(x + 70)} ${f(y - 120)} Q${f(x + 96)} ${f(y - 40)} ${f(x + 80)} ${f(y + 10)} Q${f(x + 110)} ${f(y + 60)} ${f(x + 90)} ${f(y + 120)} Q${f(x + 40)} ${f(y + 40)} ${f(x - 40)} ${f(y + 30)} Z" fill="#5E8FB8" stroke="${L}" stroke-width="7" stroke-linejoin="round"/>` +
        `<path d="M${f(x + 30)} ${f(y - 20)} Q${f(x + 56)} ${f(y - 60)} ${f(x + 70)} ${f(y - 96)}" fill="none" stroke="#9CC2E4" stroke-width="10" stroke-linecap="round"/>` +
        `<circle cx="${f(b.x - b.rx * 1.5)}" cy="${f(b.y - b.ry * 1.6)}" r="18" fill="#CFEAFF" fill-opacity=".85" stroke="#6AA6D8" stroke-width="4"/><circle cx="${f(b.x - b.rx * 1.65)}" cy="${f(b.y - b.ry * 2.4)}" r="11" fill="#CFEAFF" fill-opacity=".85" stroke="#6AA6D8" stroke-width="4"/>`;
    }

    case 'ev_dracula': {   // 黒と赤の マント（たかい えり）
      const top = b.y - b.ry * 1.7, bot = p.y + p.ry * 1.25, xl = p.x - p.rx * 1.45, xr = p.x + p.rx * 1.45;
      return `<path d="M${f(b.x - b.rx * 1.25)} ${f(top - 120)} L${f(b.x - b.rx * 0.7)} ${f(top + 10)} L${f(b.x + b.rx * 0.7)} ${f(top + 10)} L${f(b.x + b.rx * 1.25)} ${f(top - 120)} L${f(b.x + b.rx * 1.05)} ${f(top + 40)} L${f(b.x - b.rx * 1.05)} ${f(top + 40)} Z" fill="#B8202E" stroke="${L}" stroke-width="7" stroke-linejoin="round"/>` +
        `<path d="M${f(b.x - b.rx * 1.12)} ${f(top)} L${f(xl)} ${f(bot)} Q${f(xl + 50)} ${f(bot - 30)} ${f(p.x - p.rx * 0.6)} ${f(bot + 10)} Q${f(p.x)} ${f(bot - 30)} ${f(p.x + p.rx * 0.6)} ${f(bot + 10)} Q${f(xr - 50)} ${f(bot - 30)} ${f(xr)} ${f(bot)} L${f(b.x + b.rx * 1.12)} ${f(top)} Z" fill="#2A1F35" stroke="${L}" stroke-width="7" stroke-linejoin="round"/>` +
        `<path d="M${f(b.x - b.rx * 1.05)} ${f(top + 20)} L${f(xl + 26)} ${f(bot - 16)} M${f(b.x + b.rx * 1.05)} ${f(top + 20)} L${f(xr - 26)} ${f(bot - 16)}" stroke="#B8202E" stroke-width="12" stroke-linecap="round"/>`;
    }
    case 'ev_snowqueen': {   // 雪の けっしょうの マント（すきとおる）
      const top = b.y - b.ry * 1.6, bot = p.y + p.ry * 1.5, xl = p.x - p.rx * 1.6, xr = p.x + p.rx * 1.6;
      let s = `<path d="M${f(b.x - b.rx * 1.1)} ${f(top)} Q${f(b.x)} ${f(top - 40)} ${f(b.x + b.rx * 1.1)} ${f(top)} L${f(xr)} ${f(bot)} Q${f(p.x)} ${f(bot + 50)} ${f(xl)} ${f(bot)} Z" fill="#CFEAFF" fill-opacity=".9" stroke="${L}" stroke-width="7" stroke-linejoin="round"/>`;
      s += `<path d="M${f(b.x - b.rx * 0.9)} ${f(top + 30)} L${f(xl + 40)} ${f(bot - 20)} M${f(b.x + b.rx * 0.9)} ${f(top + 30)} L${f(xr - 40)} ${f(bot - 20)}" stroke="#FFFFFF" stroke-width="14" stroke-linecap="round" stroke-opacity=".8"/>`;
      [[xl + 60, bot - 70, 30], [xr - 60, bot - 80, 34], [xr - 30, top + 160, 22], [xl + 30, top + 170, 20]].forEach(([x, y, r]) => { for (let i = 0; i < 6; i++) s += `<path d="M${f(x)} ${f(y)} L${f(x + Math.cos(i * Math.PI / 3) * r)} ${f(y + Math.sin(i * Math.PI / 3) * r)}" stroke="#7FC8F2" stroke-width="6" stroke-linecap="round"/>`; s += `<circle cx="${f(x)}" cy="${f(y)}" r="6" fill="#FFFFFF"/>`; });
      return s;
    }
    case 'ev_xtree': {   // うしろの ツリーの えだ
      const top = b.y - b.ry * 1.4;
      return `<path d="M${f(b.x - b.rx * 1.25)} ${f(top + 40)} L${f(b.x - b.rx * 1.6)} ${f(top + 160)} L${f(b.x - b.rx * 1.2)} ${f(top + 150)} L${f(b.x - b.rx * 1.7)} ${f(top + 280)} L${f(b.x - b.rx * 1.05)} ${f(top + 250)} Z M${f(b.x + b.rx * 1.25)} ${f(top + 40)} L${f(b.x + b.rx * 1.6)} ${f(top + 160)} L${f(b.x + b.rx * 1.2)} ${f(top + 150)} L${f(b.x + b.rx * 1.7)} ${f(top + 280)} L${f(b.x + b.rx * 1.05)} ${f(top + 250)} Z" fill="#2E8B4E" stroke="${L}" stroke-width="7" stroke-linejoin="round"/>` +
        `<circle cx="${f(b.x - b.rx * 1.45)}" cy="${f(top + 200)}" r="14" fill="#E8484F" stroke="${L}" stroke-width="4"/><circle cx="${f(b.x + b.rx * 1.5)}" cy="${f(top + 210)}" r="14" fill="#F2C230" stroke="${L}" stroke-width="4"/>`;
    }
    case 'ev_furisode': {   // 金の 帯の むすび（ふくらすずめ）
      const [kx, ky] = B.P(0.66, 0);
      return `<g transform="translate(${f(kx)} ${f(ky)})"><path d="M0 0 C-60 -110 -200 -90 -190 -10 C-180 50 -60 40 0 0 Z M0 0 C60 -110 200 -90 190 -10 C180 50 60 40 0 0 Z" fill="#E9B730" stroke="${L}" stroke-width="7" stroke-linejoin="round"/>` +
        `<path d="M-150 -40 Q-110 -70 -60 -50 M150 -40 Q110 -70 60 -50" fill="none" stroke="#FFF3C4" stroke-width="9" stroke-linecap="round"/><path d="M-170 -10 Q-120 10 -60 0 M170 -10 Q120 10 60 0" fill="none" stroke="#C99A2A" stroke-width="5"/></g>`;
    }
    case 'ev_shishi': {   // 緑の からくさの 布（うしろに ひろがる）
      const top = b.y - b.ry * 2.6, bot = p.y + p.ry * 1.4, xl = p.x - p.rx * 1.6, xr = p.x + p.rx * 1.6;
      let s = `<path d="M${f(b.x - b.rx * 1.0)} ${f(top)} Q${f(b.x)} ${f(top - 50)} ${f(b.x + b.rx * 1.0)} ${f(top)} L${f(xr)} ${f(bot)} Q${f(xr - 70)} ${f(bot + 30)} ${f(p.x)} ${f(bot + 10)} Q${f(xl + 70)} ${f(bot + 30)} ${f(xl)} ${f(bot)} Z" fill="#3E9A56" stroke="${L}" stroke-width="7" stroke-linejoin="round"/>`;
      const swirl = (x, y, r) => `<path d="M${f(x)} ${f(y)} a${r} ${r} 0 1 1 ${r} ${r} a${r * 1.6} ${r * 1.6} 0 1 1 ${-r * 2.6} ${-r * 1.4}" fill="none" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round"/>`;
      [[xl + 50, bot - 90], [xr - 60, bot - 120], [xl + 30, top + 220], [xr - 30, top + 200], [b.x + b.rx * 1.05, top + 60], [b.x - b.rx * 1.1, top + 80]].forEach(([x, y]) => { s += swirl(x, y, 18); });
      return s;
    }
  }
  return '';
}

/* ========== アイコン（更衣室・ガチャ・イベントページ） ========== */
// 顔＋頭（suitHead）＋ 小さな体（体の色 WEAR.body と、目じるしの もよう）
const EV_ICON_MARK = {
  ev_gakuran: L => `<circle cx="150" cy="268" r="7" fill="#E9B730" stroke="${L}" stroke-width="2.5"/><circle cx="150" cy="292" r="7" fill="#E9B730" stroke="${L}" stroke-width="2.5"/><path d="M118 226 Q150 240 182 226 L182 240 Q150 254 118 240 Z" fill="#14161B" stroke="${L}" stroke-width="3"/>`,
  ev_sailor: L => `<path d="M100 226 L150 278 L200 226 L182 226 L150 258 L118 226 Z" fill="#24305E" stroke="${L}" stroke-width="3" stroke-linejoin="round"/><path d="M138 270 L128 304 L150 290 L172 304 L162 270 Z" fill="#D8343F" stroke="${L}" stroke-width="3" stroke-linejoin="round"/>`,
  ev_randoseru: L => `<rect x="196" y="214" width="60" height="70" rx="16" fill="#D8343F" stroke="${L}" stroke-width="4"/><path d="M200 236 Q226 214 252 236 L252 262 Q226 270 200 262 Z" fill="#B82431" stroke="${L}" stroke-width="3"/><path d="M114 224 L120 300 M186 224 L180 300" stroke="#D8343F" stroke-width="10"/>`,
  ev_hakama: L => `<path d="M104 280 L196 280 L210 318 L90 318 Z" fill="#6E3A86" stroke="${L}" stroke-width="3" stroke-linejoin="round"/><path d="M120 226 L160 276 M180 226 L146 266" stroke="#FFFFFF" stroke-width="7"/>`,
  ev_teru: L => `<path d="M110 222 L86 318 Q150 330 214 318 L190 222 Z" fill="#FFFFFF" stroke="${L}" stroke-width="4" stroke-linejoin="round"/><path d="M130 226 q-16 -10 -18 4 q8 8 18 -4 M170 226 q16 -10 18 4 q-8 8 -18 -4" fill="#E8484F" stroke="${L}" stroke-width="2.5"/>`,
  ev_snail: L => `<circle cx="226" cy="262" r="44" fill="#C98A4B" stroke="${L}" stroke-width="4"/><path d="M226 262 m-6 0 a6 6 0 1 1 12 0 a14 14 0 1 1 -26 4 a24 24 0 1 1 46 -6" fill="none" stroke="#8E5A2A" stroke-width="5"/>`,
  ev_ajisai: L => `<path d="M112 226 L134 242 L150 226 L166 242 L188 226" fill="none" stroke="#4FA35A" stroke-width="10" stroke-linejoin="round"/>`,
  ev_raijin: L => `<path d="M100 250 L200 250 M96 282 L204 282" stroke="#2A2328" stroke-width="8"/><circle cx="62" cy="200" r="20" fill="#B8402F" stroke="${L}" stroke-width="3"/><circle cx="238" cy="200" r="20" fill="#B8402F" stroke="${L}" stroke-width="3"/>`,
  ev_suika: L => `<path d="M94 300 L206 300 L214 318 L86 318 Z" fill="#3E9E4A" stroke="${L}" stroke-width="3"/><path d="M126 246 l4 10 M170 262 l-4 10 M146 282 l3 9" stroke="#2A2328" stroke-width="6" stroke-linecap="round"/>`,
  ev_aloha: L => `<circle cx="122" cy="262" r="10" fill="#FFFFFF" stroke="${L}" stroke-width="2"/><circle cx="178" cy="286" r="10" fill="#FFD23F" stroke="${L}" stroke-width="2"/><path d="M104 222 Q150 252 196 222" fill="none" stroke="#F7708A" stroke-width="12" stroke-dasharray="10 4"/>`,
  ev_yukata: L => `<path d="M90 270 L210 270 L212 292 L88 292 Z" fill="#F2C230" stroke="${L}" stroke-width="3"/><path d="M120 222 L160 268 M180 222 L146 258" stroke="#F4F6FA" stroke-width="6"/><circle cx="124" cy="306" r="7" fill="#F0475E"/>`,
  ev_shark: L => `<ellipse cx="150" cy="276" rx="34" ry="40" fill="#F4F8FC" stroke="${L}" stroke-width="3"/>`,
  ev_pumpkin: L => `<path d="M118 222 Q110 270 120 316 M182 222 Q190 270 180 316" fill="none" stroke="#C9601A" stroke-width="5"/>`,
  ev_ghost: L => `<path d="M104 222 L84 314 Q100 300 116 316 Q132 300 150 316 Q168 300 184 316 Q200 300 216 314 L196 222 Z" fill="#F7F4FF" stroke="${L}" stroke-width="4" stroke-linejoin="round"/>`,
  ev_mummy: L => `<path d="M90 238 L210 252 M90 268 L210 254 M88 296 L212 286" stroke="${L}" stroke-width="16" stroke-linecap="round"/><path d="M90 238 L210 252 M90 268 L210 254 M88 296 L212 286" stroke="#EFE6CF" stroke-width="10" stroke-linecap="round"/>`,
  ev_dracula: L => `<path d="M60 220 L44 330 L256 330 L240 220 Z" fill="#2A1F35" stroke="${L}" stroke-width="4" stroke-linejoin="round" transform="translate(0 -4)"/><path d="M96 214 Q150 202 204 214 L214 316 Q150 326 86 316 Z" fill="#2A1F35" stroke="${L}" stroke-width="4"/><path d="M150 222 l-16 20 l16 24 l16 -24 Z" fill="#FFFFFF" stroke="${L}" stroke-width="3"/><circle cx="150" cy="232" r="6" fill="#D8343F"/>`,
  ev_reindeer: L => `<path d="M104 222 Q150 238 196 222" fill="none" stroke="#D8343F" stroke-width="10"/><circle cx="150" cy="242" r="11" fill="#F2C230" stroke="${L}" stroke-width="3"/>`,
  ev_snowman: L => `<path d="M100 224 Q150 240 200 224" fill="none" stroke="#D8343F" stroke-width="16" stroke-linecap="round"/><circle cx="150" cy="268" r="7" fill="#2B2F36"/><circle cx="150" cy="296" r="7" fill="#2B2F36"/>`,
  ev_xtree: L => `<path d="M88 300 L212 300 L214 318 L86 318 Z" fill="#D8343F" stroke="${L}" stroke-width="3"/><circle cx="126" cy="252" r="8" fill="#E8484F"/><circle cx="174" cy="270" r="8" fill="#F2C230"/>`,
  ev_snowqueen: L => `<path d="M100 270 L200 270 L230 322 L70 322 Z" fill="#BFE3F8" stroke="${L}" stroke-width="3" stroke-linejoin="round"/><path d="M100 222 Q150 236 200 222" fill="none" stroke="#FFFFFF" stroke-width="14" stroke-linecap="round"/>`,
  ev_kagami: L => `<path d="M112 226 q38 14 76 0" fill="none" stroke="#D8343F" stroke-width="7"/><path d="M88 300 L212 300" stroke="#D8343F" stroke-width="8"/>`,
  ev_sheep: L => `<path d="M118 250 a8 8 0 0 1 14 -6 a8 8 0 0 1 14 6 M156 276 a8 8 0 0 1 14 -6 a8 8 0 0 1 14 6" fill="none" stroke="#E2D2B4" stroke-width="5"/>`,
  ev_furisode: L => `<path d="M90 266 L210 266 L212 294 L88 294 Z" fill="#E9B730" stroke="${L}" stroke-width="3"/><path d="M120 222 L160 264 M180 222 L146 254" stroke="#E9B730" stroke-width="8"/>`,
  ev_shishi: L => `<path d="M100 222 L80 320 L220 320 L200 222 Z" fill="#3E9A56" stroke="${L}" stroke-width="4" stroke-linejoin="round"/><path d="M130 262 a8 8 0 1 1 8 8 M170 292 a8 8 0 1 1 8 8" fill="none" stroke="#FFFFFF" stroke-width="4"/>`
};
function evSuitIcon(id) {
  const w = WEAR[id]; if (!w) return '';
  const L = '#4A2A1A', mk = EV_ICON_MARK[id];
  const body = `<path d="M96 214 Q150 202 204 214 L214 316 Q150 326 86 316 Z" fill="${w.body}" stroke="${L}" stroke-width="5" stroke-linejoin="round"/>`;
  return `<svg viewBox="-14 -58 328 384" aria-hidden="true">${body}${mk ? mk(L) : ''}<ellipse cx="150" cy="140" rx="84" ry="66" fill="#FBE3C6" stroke="${L}" stroke-width="5"/><circle cx="120" cy="135" r="7" fill="${L}"/><circle cx="180" cy="135" r="7" fill="${L}"/>${evSuitHead(id)}</svg>`;
}
