// にゃんカロ 猫の絵
// catSVG({ idx, equip, face, dead }) で猫のSVG（文字列）を返す。
//   idx  : 体型 -100(骸骨) 〜 0(ちょうどいい) 〜 +100(爆発)
//   equip: { head, top, hand }  … data.js の WEAR のキー
//   face : 'shout'（気合い）/ 'happy' / 'tired' / 'hungry'
//   dead : null / 'skel' / 'boom'

const C = { line: '#3B2A20', fur: '#F2A65A', furDark: '#D7843A', belly: '#FBE3C4', pink: '#F29BB0', mouth: '#7A2E2E' };

function catSVG(o) {
  const idx = Math.max(-100, Math.min(100, o.idx || 0));
  if (o.dead === 'skel') return skeletonSVG();
  if (o.dead === 'boom') return boomSVG();
  const f = idx / 100;
  const fat = Math.max(0, f), thin = Math.max(0, -f);
  const bw = 1 + 0.55 * fat - 0.3 * thin;          // 体の横幅
  const limb = (1 + 0.35 * fat) * (1 - 0.35 * thin); // 手足の太さ
  const eq = o.equip || {};
  const top = WEAR[eq.top] || WEAR.tee_orange;
  const hand = eq.hand || 'gloves_brown';
  const head = eq.head || 'band_none';
  const face = o.face || 'shout';
  const L = C.line, F = C.fur;
  let s = '';

  // 影
  s += `<ellipse cx="150" cy="432" rx="${100 + 30 * fat}" ry="8" fill="#3B2A20" fill-opacity=".18"/>`;
  // しっぽ
  s += `<path d="M${200 + 20 * fat} 320 C262 322 274 270 254 236" fill="none" stroke="${L}" stroke-width="22" stroke-linecap="round"/>`;
  s += `<path d="M${200 + 20 * fat} 320 C262 322 274 270 254 236" fill="none" stroke="${F}" stroke-width="15" stroke-linecap="round"/>`;

  // 足
  const lw = 25 * limb;
  s += `<path d="M120 360 L104 408 M180 360 L196 408" stroke="${L}" stroke-width="${lw + 7}" stroke-linecap="round"/>`;
  s += `<path d="M120 360 L104 408 M180 360 L196 408" stroke="${F}" stroke-width="${lw}" stroke-linecap="round"/>`;
  s += `<ellipse cx="96" cy="414" rx="27" ry="13" fill="${F}" stroke="${L}" stroke-width="3"/>`;
  s += `<ellipse cx="204" cy="414" rx="27" ry="13" fill="${F}" stroke="${L}" stroke-width="3"/>`;

  // ズボン（白い短パン）
  const px = 62 * bw;
  s += `<path d="M${150 - px} 316 L${150 + px} 316 L${150 + px + 10} 372 L160 372 L150 356 L140 372 L${150 - px - 10} 372 Z" fill="#FFFFFF" stroke="${L}" stroke-width="3" stroke-linejoin="round"/>`;
  s += `<path d="M${150 - px - 4} 336 L${150 - px - 8} 368 M${150 + px + 4} 336 L${150 + px + 8} 368" stroke="${top.color === '#FFFFFF' ? '#3A72D0' : top.color}" stroke-width="5"/>`;

  // 服（体）
  const x1 = 150 - 50 * bw, x2 = 150 + 50 * bw, x3 = 150 + 60 * bw, x4 = 150 - 60 * bw;
  const bulge = fat > 0 ? 36 * fat : -6 * thin;
  s += `<path d="M${x1} 210 L${x2} 210 Q${x2 + 10 + bulge} 266 ${x3} 318 L${x4} 318 Q${x1 - 10 - bulge} 266 ${x1} 210 Z" fill="${top.color}" stroke="${L}" stroke-width="3" stroke-linejoin="round"/>`;
  if (eq.top === 'gi_white') {
    s += `<path d="M126 210 L150 262 L174 210" fill="${C.belly}" stroke="${L}" stroke-width="3" stroke-linejoin="round"/>`;
    s += `<rect x="${x4 - 2}" y="292" width="${x3 - x4 + 4}" height="14" rx="4" fill="#1F2A27"/>`;
  } else {
    s += `<path d="M128 210 L150 240 L172 210 Z" fill="${F}" stroke="${L}" stroke-width="3" stroke-linejoin="round"/>`;
  }
  if (eq.top === 'jersey_blue' || eq.top === 'gold_jacket') {
    s += `<path d="M150 240 V316" stroke="${L}" stroke-width="2.5"/><rect x="146" y="246" width="8" height="12" rx="2" fill="#F5CF5C" stroke="${L}" stroke-width="1.5"/>`;
  }
  if (eq.top === 'tee_orange' || eq.top === 'tank_paw' || !eq.top) {
    s += pawPrint(172, 280, 1, '#FFFFFF');
  }
  if (eq.top === 'gold_jacket') s += `<path d="M110 250 l14 4 M190 250 l-14 4" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>`;
  // やせすぎ：あばら
  if (thin > 0.45) s += `<path d="M132 252 q18 6 36 0 M130 266 q20 6 40 0 M132 280 q18 6 36 0" fill="none" stroke="${L}" stroke-opacity=".45" stroke-width="2"/>`;

  // 腕
  const aw = 22 * limb;
  const sleeve = (eq.top === 'tank_paw') ? F : top.color;
  s += `<path d="M${x1 + 6} 226 Q70 254 64 210 M${x2 - 6} 226 Q230 254 236 210" fill="none" stroke="${L}" stroke-width="${aw + 7}" stroke-linecap="round"/>`;
  s += `<path d="M${x1 + 6} 226 Q70 254 64 210 M${x2 - 6} 226 Q230 254 236 210" fill="none" stroke="${sleeve}" stroke-width="${aw}" stroke-linecap="round"/>`;

  // 耳・頭
  const hr = 96 * (1 + 0.12 * fat) - 8 * thin;
  s += `<path d="M${150 - hr * 0.83} 92 L${150 - hr * 0.73} 24 L122 66 Z M${150 + hr * 0.83} 92 L${150 + hr * 0.73} 24 L178 66 Z" fill="${F}" stroke="${L}" stroke-width="3" stroke-linejoin="round"/>`;
  s += `<path d="M${150 - hr * 0.71} 80 L${150 - hr * 0.66} 42 L110 66 Z M${150 + hr * 0.71} 80 L${150 + hr * 0.66} 42 L190 66 Z" fill="${C.pink}"/>`;
  s += `<ellipse cx="150" cy="130" rx="${hr}" ry="80" fill="${F}" stroke="${L}" stroke-width="3"/>`;
  s += `<path d="M139 56 l-2 18 M150 54 v20 M161 56 l2 18" stroke="${C.furDark}" stroke-width="5" stroke-linecap="round"/>`;
  s += headGear(head, hr);

  // 顔
  s += faceSVG(face, fat, thin, hr);

  // 手（グローブ or ダンベル）
  s += handSVG(hand);

  // 汗（太りすぎ）
  if (fat > 0.5) s += `<path d="M${150 + hr - 4} 70 q9 13 0 18 q-9 -5 0 -18 z" fill="#7FC4F2" stroke="${L}" stroke-width="1.5"/>`;
  return `<svg viewBox="0 0 300 440" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="猫">${s}</svg>`;
}

function pawPrint(x, y, k, col) {
  return `<ellipse cx="${x}" cy="${y + 6 * k}" rx="${12 * k}" ry="${10 * k}" fill="${col}"/>` +
    [[-14, -9], [-6, -16], [6, -16], [14, -9]].map(([dx, dy]) => `<circle cx="${x + dx * k}" cy="${y + dy * k}" r="${4.2 * k}" fill="${col}"/>`).join('');
}

function headGear(id, hr) {
  const L = C.line;
  if (id === 'band_pink' || id === 'band_blue') {
    const c = WEAR[id].color;
    return `<path d="M${150 - hr + 4} 96 Q150 60 ${150 + hr - 4} 96 L${150 + hr - 6} 110 Q150 76 ${150 - hr + 6} 110 Z" fill="${c}" stroke="${L}" stroke-width="3" stroke-linejoin="round"/>` +
      `<path d="M${150 + hr - 6} 100 l18 -6 M${150 + hr - 6} 106 l16 8" stroke="${c}" stroke-width="6" stroke-linecap="round"/>`;
  }
  if (id === 'cap_red') {
    return `<path d="M${150 - hr * 0.8} 84 Q150 20 ${150 + hr * 0.8} 84 Z" fill="#D33A3A" stroke="${L}" stroke-width="3" stroke-linejoin="round"/>` +
      `<path d="M${150 - hr * 0.8} 84 Q${150 - hr * 1.05} 92 ${150 - hr * 1.15} 84 L${150 - hr * 0.6} 80" fill="#B52B2B" stroke="${L}" stroke-width="3" stroke-linejoin="round"/>` +
      `<circle cx="150" cy="36" r="6" fill="#FFFFFF" stroke="${L}" stroke-width="2"/>`;
  }
  if (id === 'crown') {
    return `<path d="M110 60 L110 24 L126 42 L150 14 L174 42 L190 24 L190 60 Z" fill="#E9B730" stroke="${L}" stroke-width="3" stroke-linejoin="round"/>` +
      `<circle cx="150" cy="46" r="6" fill="#D93A6F"/><circle cx="124" cy="52" r="4" fill="#3A72D0"/><circle cx="176" cy="52" r="4" fill="#3A72D0"/>`;
  }
  return '';
}

function faceSVG(face, fat, thin, hr) {
  const L = C.line;
  let s = '';
  if (face === 'tired' || thin > 0.6) {
    s += `<path d="M98 122 q14 8 28 0 M174 122 q14 8 28 0" fill="none" stroke="${L}" stroke-width="5" stroke-linecap="round"/>`;
    s += `<path d="M100 134 q10 5 22 0 M178 134 q10 5 22 0" fill="none" stroke="#7A5A9A" stroke-opacity=".5" stroke-width="3"/>`;
    s += `<path d="M138 168 q12 -8 24 0" fill="none" stroke="${L}" stroke-width="3" stroke-linecap="round"/>`;
  } else if (face === 'happy') {
    s += `<path d="M100 126 q12 -14 24 0 M176 126 q12 -14 24 0" fill="none" stroke="${L}" stroke-width="5" stroke-linecap="round"/>`;
    s += `<path d="M132 154 q18 22 36 0 Z" fill="${C.mouth}" stroke="${L}" stroke-width="3" stroke-linejoin="round"/>`;
  } else {
    // 気合い（＞＜）・おなかすいた（口を大きく開ける）
    s += `<path d="M100 110 L124 122 L100 134 M200 110 L176 122 L200 134" fill="none" stroke="${L}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += `<path d="M126 150 Q150 142 174 150 Q172 190 150 192 Q128 190 126 150 Z" fill="${C.mouth}" stroke="${L}" stroke-width="3" stroke-linejoin="round"/>`;
    s += `<ellipse cx="150" cy="180" rx="14" ry="8" fill="#F27C8C"/>`;
    s += `<path d="M132 151 l5 11 l5 -10 Z M168 151 l-5 11 l-5 -10 Z" fill="#FFFFFF"/>`;
  }
  s += `<path d="M144 136 h12 l-6 6 z" fill="${C.pink}" stroke="${L}" stroke-width="1.5" stroke-linejoin="round"/>`;
  const ck = 13 + 6 * fat;
  s += `<ellipse cx="${150 - hr * 0.56}" cy="156" rx="${ck}" ry="${7 + 3 * fat}" fill="#F27C8C" fill-opacity=".5"/>`;
  s += `<ellipse cx="${150 + hr * 0.56}" cy="156" rx="${ck}" ry="${7 + 3 * fat}" fill="#F27C8C" fill-opacity=".5"/>`;
  s += `<path d="M${150 - hr * 0.65} 140 l-40 -6 M${150 - hr * 0.65} 150 l-42 4 M${150 - hr * 0.63} 160 l-38 12 M${150 + hr * 0.65} 140 l40 -6 M${150 + hr * 0.65} 150 l42 4 M${150 + hr * 0.63} 160 l38 12" stroke="${L}" stroke-width="2" stroke-linecap="round"/>`;
  return s;
}

function handSVG(id) {
  const L = C.line;
  if (id === 'dumbbell') {
    let s = '';
    for (const x of [45, 255]) {
      s += `<rect x="${x - 4}" y="140" width="7" height="86" rx="3" fill="#9AA3A8" stroke="${L}" stroke-width="2"/>`;
      s += `<circle cx="${x}" cy="190" r="17" fill="${C.fur}" stroke="${L}" stroke-width="3"/>`;
      s += `<rect x="${x - 23}" y="130" width="46" height="16" rx="5" fill="#2E3A4A" stroke="#1F2A27" stroke-width="3"/>`;
      s += `<rect x="${x - 23}" y="220" width="46" height="16" rx="5" fill="#2E3A4A" stroke="#1F2A27" stroke-width="3"/>`;
    }
    return s;
  }
  const c = (WEAR[id] && WEAR[id].color) || '#7A4A2A';
  let s = '';
  for (const [x, t] of [[58, 82], [242, 218]]) {
    s += `<rect x="${x - 24}" y="206" width="48" height="16" rx="6" fill="#FFFFFF" stroke="${L}" stroke-width="3"/>`;
    s += `<ellipse cx="${x}" cy="178" rx="32" ry="36" fill="${c}" stroke="${L}" stroke-width="3"/>`;
    s += `<ellipse cx="${t}" cy="190" rx="11" ry="15" fill="${c}" stroke="${L}" stroke-width="3"/>`;
    s += `<ellipse cx="${x - 10}" cy="164" rx="9" ry="6" fill="#FFFFFF" fill-opacity=".5"/>`;
  }
  return s;
}

function skeletonSVG() {
  const B = '#F1EEE4', E = '#6E6A5E';
  let s = `<ellipse cx="150" cy="432" rx="90" ry="7" fill="#3B2A20" fill-opacity=".15"/>`;
  for (let i = 0; i < 7; i++) s += `<rect x="142" y="${236 + i * 22}" width="16" height="16" rx="4" fill="${B}" stroke="${E}" stroke-width="2"/>`;
  for (let i = 0; i < 4; i++) {
    const y = 250 + i * 22, w = 54 - i * 6;
    s += `<path d="M146 ${y} Q${150 - w} ${y - 2} ${150 - w + 8} ${y + 20} M154 ${y} Q${150 + w} ${y - 2} ${150 + w - 8} ${y + 20}" fill="none" stroke="${E}" stroke-width="9" stroke-linecap="round"/>`;
    s += `<path d="M146 ${y} Q${150 - w} ${y - 2} ${150 - w + 8} ${y + 20} M154 ${y} Q${150 + w} ${y - 2} ${150 + w - 8} ${y + 20}" fill="none" stroke="${B}" stroke-width="5" stroke-linecap="round"/>`;
  }
  s += `<ellipse cx="150" cy="398" rx="44" ry="14" fill="${B}" stroke="${E}" stroke-width="2"/>`;
  s += `<path d="M120 404 L108 424 M180 404 L192 424" stroke="${E}" stroke-width="12" stroke-linecap="round"/><path d="M120 404 L108 424 M180 404 L192 424" stroke="${B}" stroke-width="7" stroke-linecap="round"/>`;
  s += `<path d="M84 110 L92 40 L126 80 Z M216 110 L208 40 L174 80 Z" fill="${B}" stroke="${E}" stroke-width="3" stroke-linejoin="round"/>`;
  s += `<ellipse cx="150" cy="150" rx="74" ry="66" fill="${B}" stroke="${E}" stroke-width="3"/>`;
  s += `<ellipse cx="122" cy="142" rx="18" ry="22" fill="#2A2622"/><ellipse cx="178" cy="142" rx="18" ry="22" fill="#2A2622"/>`;
  s += `<path d="M144 170 h12 l-6 9 z" fill="#2A2622"/><path d="M122 196 h56 M130 190 v12 M142 190 v12 M154 190 v12 M166 190 v12" stroke="${E}" stroke-width="2.5"/>`;
  s += `<g opacity=".7"><path d="M232 66 q0 -26 22 -26 q22 0 22 26 v30 l-7 -6 -7 6 -8 -6 -7 6 -8 -6 -7 6 z" fill="#FFFFFF" stroke="${E}" stroke-width="2"/><circle cx="246" cy="62" r="3" fill="#2A2622"/><circle cx="262" cy="62" r="3" fill="#2A2622"/><ellipse cx="254" cy="32" rx="14" ry="4" fill="none" stroke="#E8C24A" stroke-width="3"/></g>`;
  return `<svg viewBox="0 0 300 440" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="骸骨になった猫">${s}</svg>`;
}

function boomSVG() {
  let s = `<path d="M150 150 L176 90 L188 150 L250 120 L206 176 L276 200 L206 220 L246 280 L184 246 L172 312 L146 252 L104 300 L112 236 L40 240 L98 200 L32 150 L104 160 L92 92 Z" fill="#F5CF5C" stroke="#E8604C" stroke-width="6" stroke-linejoin="round"/>`;
  s += `<text x="150" y="214" text-anchor="middle" font-size="52" font-weight="900" fill="#E8604C" font-family="sans-serif">ドカーン</text>`;
  const bits = [[40, 360, '#F2A65A'], [90, 400, '#FFFFFF'], [150, 380, '#F08A3C'], [210, 410, '#F2A65A'], [260, 370, '#7A4A2A'], [120, 420, '#FBE3C4'], [190, 360, '#F2A65A']];
  bits.forEach(([x, y, c]) => { s += `<ellipse cx="${x}" cy="${y}" rx="14" ry="10" fill="${c}" stroke="#3B2A20" stroke-width="2"/>`; });
  s += `<rect x="128" y="404" width="44" height="14" rx="4" fill="#FFFFFF" stroke="#3B2A20" stroke-width="2"/>`;
  return `<svg viewBox="0 0 300 440" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="食べすぎて爆発した猫">${s}</svg>`;
}

// ===== コスチューム（data.js の WEAR で slot: 'suit'） =====
// suitHead(id)：頭にかぶる部分。headGear と同じ座標（頭の中心 150,130・半径 97）で描く
// フード系は「顔の穴」をあけた形（fill-rule evenodd）にして、猫の顔が見えるようにする
const SUIT_HOLE = 'M70 140 a80 66 0 1 0 160 0 a80 66 0 1 0 -160 0 Z';
const SUIT_HOOD = 'M36 214 C22 120 56 30 150 26 C244 30 278 120 264 214 Q150 236 36 214 Z';
function suitHead(id) {
  const L = C.line;
  const hood = (col, extra = '') => `<path d="${SUIT_HOOD} ${SUIT_HOLE}" fill="${col}" fill-rule="evenodd" stroke="${L}" stroke-width="5" stroke-linejoin="round"/>${extra}`;
  if (id === 'dino_hood') {
    let sp = '';
    [[62, 92], [92, 52], [150, 30], [208, 52], [238, 92]].forEach(([x, y], i) => {
      const a = Math.atan2(y - 130, x - 150), nx = Math.cos(a), ny = Math.sin(a), s = i === 2 ? 30 : 24;
      sp += `<path d="M${x - ny * 16} ${y + nx * 16} L${x + nx * s} ${y + ny * s} L${x + ny * 16} ${y - nx * 16} Z" fill="#F7A93B" stroke="${L}" stroke-width="4" stroke-linejoin="round"/>`;
    });
    let teeth = '';
    for (let i = 0; i < 6; i++) { const x = 92 + i * 23; teeth += `<path d="M${x} ${84 - Math.sin((i + .5) / 6 * Math.PI) * 8} l10 18 l10 -18 Z" fill="#FFFFFF" stroke="${L}" stroke-width="3" stroke-linejoin="round"/>`; }
    return sp + hood('#4FA35A', teeth + '<circle cx="78" cy="190" r="7" fill="#3E8A48"/><circle cx="222" cy="190" r="7" fill="#3E8A48"/><circle cx="64" cy="160" r="5" fill="#3E8A48"/><circle cx="236" cy="160" r="5" fill="#3E8A48"/>');
  }
  if (id === 'frog_coat') {
    const eye = x => `<circle cx="${x}" cy="40" r="30" fill="#7CC24A" stroke="${L}" stroke-width="5"/><circle cx="${x}" cy="38" r="19" fill="#FFFFFF" stroke="${L}" stroke-width="3"/><circle cx="${x + 3}" cy="40" r="9" fill="${L}"/><circle cx="${x + 6}" cy="35" r="3" fill="#FFFFFF"/>`;
    return eye(100) + eye(200) + hood('#7CC24A', '<ellipse cx="70" cy="196" rx="14" ry="8" fill="#F28CA0" fill-opacity=".7"/><ellipse cx="230" cy="196" rx="14" ry="8" fill="#F28CA0" fill-opacity=".7"/>');
  }
  if (id === 'bear_suit') {
    const ear = x => `<circle cx="${x}" cy="52" r="30" fill="#8A5A36" stroke="${L}" stroke-width="5"/><circle cx="${x}" cy="54" r="15" fill="#E8B98A"/>`;
    return ear(72) + ear(228) + hood('#8A5A36', '<path d="M118 30 q10 -10 18 0 M164 30 q10 -10 18 0" fill="none" stroke="#6B4428" stroke-width="5" stroke-linecap="round"/>');
  }
  if (id === 'chef') {
    return `<path d="M98 86 Q94 50 110 46 Q96 14 132 14 Q150 -8 168 14 Q204 14 190 46 Q206 50 202 86 Z" fill="#FFFFFF" stroke="${L}" stroke-width="5" stroke-linejoin="round"/>` +
      `<path d="M96 84 Q150 96 204 84 L206 104 Q150 116 94 104 Z" fill="#FFFFFF" stroke="${L}" stroke-width="5" stroke-linejoin="round"/>` +
      `<path d="M132 46 Q138 30 150 28 M170 50 Q176 36 168 26" fill="none" stroke="#D8D2CA" stroke-width="4" stroke-linecap="round"/>` +
      `<path d="M112 222 Q150 240 188 222 L176 258 L150 242 L124 258 Z" fill="#E0573F" stroke="${L}" stroke-width="4" stroke-linejoin="round"/>`;
  }
  if (id === 'wizard') {
    return `<path d="M88 78 Q120 30 150 -10 Q168 -40 210 -58 Q196 -20 196 20 L214 80 Z" fill="#6E4AB8" stroke="${L}" stroke-width="5" stroke-linejoin="round"/>` +
      `<path d="M92 66 Q150 84 212 68 L214 82 Q150 98 88 80 Z" fill="#E9B730" stroke="${L}" stroke-width="4" stroke-linejoin="round"/>` +
      `<ellipse cx="150" cy="86" rx="118" ry="20" fill="#5A3A9A" stroke="${L}" stroke-width="5"/>` +
      `<path d="M150 10 l5 11 12 1 -9 8 3 12 -11 -6 -11 6 3 -12 -9 -8 12 -1 Z" fill="#FFE066" stroke="${L}" stroke-width="2.5" stroke-linejoin="round"/>` +
      `<circle cx="180" cy="40" r="5" fill="#FFE066"/><circle cx="128" cy="52" r="4" fill="#FFE066"/>`;
  }
  if (id === 'astronaut') {
    return `<line x1="150" y1="-4" x2="150" y2="-38" stroke="${L}" stroke-width="5"/><circle cx="150" cy="-44" r="10" fill="#E0573F" stroke="${L}" stroke-width="4"/>` +
      `<circle cx="150" cy="126" r="124" fill="#CFE8FF" fill-opacity=".28" stroke="#8FA9BF" stroke-width="9"/>` +
      `<circle cx="150" cy="126" r="124" fill="none" stroke="${L}" stroke-width="3"/>` +
      `<path d="M62 70 Q86 30 132 18" fill="none" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round" stroke-opacity=".8"/>` +
      `<path d="M78 236 Q150 262 222 236 L214 254 Q150 280 86 254 Z" fill="#B9C6D2" stroke="${L}" stroke-width="5" stroke-linejoin="round"/>`;
  }
  return '';
}
// suitBack(id, cat)：体のうしろに出す部分（マント・リュック）。cat は data.js の CATS の1匹。絵の座標で描く
function suitBack(id, c) {
  const L = C.line, bz = (c.zones.find(z => z[0] === 'belly') || [0, 300, 410, 168, 97]), pz = (c.zones.find(z => z[0] === 'pants') || [0, 300, 600, 215, 85]);
  const [, bx, by, brx, bry] = bz, [, px, py, prx, pry] = pz;
  if (id === 'wizard') {
    const top = by - bry * 1.5, bot = py + pry * 1.1;
    return `<path d="M${bx - brx * 1.05} ${top} Q${bx} ${top - 30} ${bx + brx * 1.05} ${top} L${px + prx * 1.25} ${bot} Q${px} ${bot + 40} ${px - prx * 1.25} ${bot} Z" fill="#5A3A9A" stroke="${L}" stroke-width="6" stroke-linejoin="round"/>` +
      `<path d="M${bx - brx * .8} ${top + 20} L${px - prx * 1.0} ${bot - 10} M${bx + brx * .8} ${top + 20} L${px + prx * 1.0} ${bot - 10}" stroke="#7E5CC8" stroke-width="10" stroke-linecap="round"/>`;
  }
  if (id === 'astronaut') {
    const top = by - bry * 1.4;
    return `<rect x="${bx - brx * 1.25}" y="${top}" width="${brx * 2.5}" height="${bry * 2.4}" rx="40" fill="#C9D3DC" stroke="${L}" stroke-width="6"/>` +
      `<rect x="${bx - brx * 1.15}" y="${top + bry * .3}" width="40" height="${bry * 1.6}" rx="14" fill="#E0573F" stroke="${L}" stroke-width="4"/>`;
  }
  if (id === 'dino_hood') {   // しっぽ
    return `<path d="M${px + prx * .5} ${py - pry * .2} Q${px + prx * 1.6} ${py + pry * .2} ${px + prx * 1.8} ${py + pry * 1.4} Q${px + prx * 1.2} ${py + pry * .9} ${px + prx * .4} ${py + pry * .8} Z" fill="#4FA35A" stroke="${L}" stroke-width="6" stroke-linejoin="round"/>`;
  }
  return '';
}
