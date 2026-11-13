// にゃんカロ 対戦（PvP）
// ・サーバー（BATTLE_API）に自分の猫を登録し、順位の近い人の猫と戦う（相手の猫はAIが操作）
// ・毎ターン3枚のスキルカードが配られ、1枚えらぶ。数字やカードは data.js の BATTLE / BCARDS
// ・1日の対戦回数とレートはサーバーが計算する。コインはこのアプリでもらう
// 使っているもの（app.js）：S, save, $, esc, fmt, se, petSound, buzz, toast, statWithBonus, petCatHTML, bgmUpdate

/* ---------- サーバーとの通信 ---------- */
async function bApi(path, body) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 12000);
  try {
    const r = await fetch(BATTLE_API + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal } : { signal: ctl.signal });
    const j = await r.json().catch(() => ({}));
    return { status: r.status, ...j };
  } catch (e) { return { status: 0, error: 'network' }; }
  finally { clearTimeout(t); }
}
const bAuth = () => S.battle && S.battle.id ? { id: S.battle.id, token: S.battle.token } : null;
const bProfile = () => ({ name: S.user.name || 'プレイヤー', cat: S.cat.name, breed: S.cat.breed, equip: S.cat.equip, level: S.cat.level, pow: statWithBonus('pow'), spd: statWithBonus('spd'), sta: statWithBonus('sta') });
// 登録（はじめてだけ）＋自分の猫の最新データを送る
async function bReady() {
  S.battle = S.battle || { log: [] };
  if (!S.battle.id) {
    const r = await bApi('/api/register', { name: S.user.name, cat: S.cat.name, breed: S.cat.breed });
    if (r.status !== 200) return r;
    S.battle.id = r.id; S.battle.token = r.token; save();
  }
  const r = await bApi('/api/sync', { ...bAuth(), profile: bProfile() });
  if (r.status === 401) { S.battle.id = null; S.battle.token = null; save(); return bReady(); }   // サーバーのデータが消えていたら作りなおす
  if (r.status === 200) { S.battle.me = r.me; save(); }
  return r;
}
const bErr = r => r.status === 0 ? 'サーバーにつながりません。電波を確認してね' : r.status === 429 ? '今日の対戦はおわりです（練習試合はできます）' : r.status === 503 ? '対戦相手が見つかりませんでした' : `サーバーエラー（${r.status}）`;

/* ---------- ロビー ---------- */
function openBattleLobby() {
  if ($('battleUI')) return;
  const w = document.createElement('div');
  w.id = 'battleUI'; w.className = 'b-ui';
  w.innerHTML = `<div class="b-head"><button class="b-x" data-b="close" aria-label="とじる">×</button><h2>⚔️ 猫バトル</h2></div><div class="b-body" id="bBody"><p class="b-wait">サーバーにつないでいます…</p></div>`;
  document.body.appendChild(w); document.body.classList.add('mini-open');
  w.addEventListener('click', bClick);
  bgmUpdate(); se('tap');
  bLobby();
}
function closeBattle() {
  const w = $('battleUI'); if (!w) return;
  w.remove(); document.body.classList.remove('mini-open'); B = null; bgmUpdate(); renderAll();
}
async function bLobby() {
  const body = $('bBody'); if (!body) return;
  body.innerHTML = `<p class="b-wait">サーバーにつないでいます…</p>`;
  const r = await bReady();
  if (!$('bBody')) return;
  if (r.status !== 200) { body.innerHTML = `<p class="b-wait">${esc(bErr(r))}</p><button class="btn block" data-b="lobby">もう一度</button>`; return; }
  const me = r.me, rk = await bApi('/api/ranking?id=' + encodeURIComponent(me.id));
  if (!$('bBody')) return;
  const top = rk.status === 200 ? rk.top : [];
  const row = (p, i) => `<li class="${p.id === me.id ? 'me' : ''}"><b class="rk">${i + 1}</b><span class="nm">${esc(p.cat)}<small>${p.cpu ? '<i class="cpu">CPU</i>' : `（${esc(p.name)}）`}</small></span><span class="wl">${p.wins}勝${p.losses}敗</span><b class="rt num">${p.rating}</b></li>`;
  const log = (S.battle.log || []).slice(0, 5).map(l => `<li><span class="${l.win ? 'w' : 'l'}">${l.win ? '勝ち' : '負け'}</span>${esc(l.opp)}<small>${l.practice ? '練習' : (l.delta >= 0 ? '+' : '') + l.delta}</small></li>`).join('');
  body.innerHTML = `
    <div class="card b-me">
      <div class="b-me-cat">${petCatHTML({ breed: S.cat.breed, equip: S.cat.equip })}</div>
      <div class="b-me-info"><div class="b-me-name">${esc(S.cat.name)} <small>Lv.${S.cat.level}</small></div>
        <div class="b-rate"><span>レート</span><b class="num">${me.rating}</b></div>
        <div class="hint">${me.rank}位 / ${me.total}匹　${me.wins}勝${me.losses}敗</div>
        <div class="b-stats">ちから <b>${statWithBonus('pow')}</b>　すばやさ <b>${statWithBonus('spd')}</b>　たいりょく <b>${statWithBonus('sta')}</b></div></div>
    </div>
    <div class="b-left">今日の対戦 のこり <b>${me.left}</b> / ${me.daily}回　<small>勝ち +${BATTLE.winCoin}・負け +${BATTLE.loseCoin}コイン</small></div>
    <button class="btn red block b-go" data-b="match" ${me.left > 0 ? '' : 'disabled'}>⚔️ 対戦する</button>
    <button class="btn white block" data-b="practice" style="margin-top:8px">練習試合（レート・コインなし）</button>
    ${log ? `<div class="section-title">さいきんの対戦</div><ul class="b-log">${log}</ul>` : ''}
    <div class="section-title">ランキング</div>
    <ol class="b-rank">${top.map(row).join('') || '<li>読みこめませんでした</li>'}</ol>
    ${me.rank > top.length ? `<p class="hint" style="text-align:center">あなたは ${me.rank}位</p>` : ''}
    <p class="hint">順位の近い猫と戦います。相手の猫はAIが動かします。ジムで鍛えた能力と装備がそのまま使われます。</p>`;
}

/* ---------- 対戦 ---------- */
let B = null;   // 対戦中のようす
const bRand = (a, b) => a + Math.random() * (b - a);
function bFighter(p, isMe) {
  const hp = Math.round(BATTLE.hpBase + p.sta * BATTLE.hpPerSta);
  return { name: p.cat, owner: p.name, breed: p.breed, equip: p.equip || {}, level: p.level, pow: p.pow, spd: p.spd, sta: p.sta, rating: p.rating, cpu: p.cpu, hp, maxHp: hp, gauge: 0, charged: false, me: isMe, hand: [], last: [] };
}
function bDeal(f) {
  const keys = Object.keys(BCARDS).filter(k => BCARDS[k].w > 0), hand = [];
  while (hand.length < 3) {
    const tot = keys.reduce((a, k) => a + BCARDS[k].w, 0); let r = Math.random() * tot, pick = keys[0];
    for (const k of keys) { r -= BCARDS[k].w; if (r <= 0) { pick = k; break; } }
    if (hand.filter(x => x === pick).length < 2) hand.push(pick);
  }
  if (f.gauge >= BATTLE.specialGauge) hand.push('special');
  f.hand = hand;
}
// 相手（AI）のえらび方：状況で重みを変えてランダム
function bAiPick(f, foe) {
  const w = {};
  f.hand.forEach(k => { w[k] = (w[k] || 0) + 1; });
  if (w.special) w.special = 5;
  if (w.counter && (foe.gauge >= BATTLE.specialGauge || foe.charged)) w.counter *= 3;
  if (w.guard && f.hp / f.maxHp < 0.35) w.guard *= 2.5;
  if (w.guard && foe.charged) w.guard *= 2;
  if (w.charge && f.hp / f.maxHp > 0.6) w.charge *= 1.4;
  if (w.straight && foe.last[0] === 'charge') w.straight *= 2;
  const keys = Object.keys(w), tot = keys.reduce((a, k) => a + w[k], 0); let r = Math.random() * tot;
  for (const k of keys) { r -= w[k]; if (r <= 0) return k; }
  return keys[0];
}
const bDmg = (att, card) => Math.max(1, Math.round(BCARDS[card].p * (1 + att.pow / BATTLE.powDiv) * (att.charged ? BATTLE.chargeMul : 1) * bRand(0.9, 1.1)));
const bDodge = (att, def) => Math.random() < Math.min(0.3, Math.max(0.03, 0.05 + (def.spd - att.spd) / Math.max(1, def.spd + att.spd) * 0.4));
// 1ターンの結果をイベントの列にする（画面ではこれを順に見せる）
function bResolve(a, ca, b, cb) {
  const ev = [], A = BCARDS[ca], Bc = BCARDS[cb];
  const gain = (f, n) => { f.gauge = Math.min(BATTLE.gaugeMax, f.gauge + n); };
  if (ca === 'special') a.gauge -= BATTLE.specialGauge;
  if (cb === 'special') b.gauge -= BATTLE.specialGauge;
  // そなえる系（先に効く）
  [[a, ca], [b, cb]].forEach(([f, c]) => {
    if (c === 'guard') { gain(f, 1); ev.push({ t: 'buff', who: f, text: 'ガード！' }); }
    if (c === 'charge') { gain(f, 2); ev.push({ t: 'buff', who: f, text: 'ためている…' }); }
  });
  // 攻撃する順番：ジャブ（速い）→ すばやさの高いほう
  const atk = [[a, ca, b, cb], [b, cb, a, ca]].filter(x => BCARDS[x[1]].kind === 'atk');
  atk.sort((x, y) => (BCARDS[y[1]].fast ? 1 : 0) - (BCARDS[x[1]].fast ? 1 : 0) || y[0].spd - x[0].spd || Math.random() - 0.5);
  for (const [att, c, def, dc] of atk) {
    if (att.hp <= 0) continue;
    const card = BCARDS[c];
    if (dc === 'counter' && (c === 'straight' || card.special)) {
      const d = Math.max(1, Math.round(card.p * BATTLE.counterMul * (1 + def.pow / BATTLE.powDiv) * bRand(0.9, 1.1)));
      att.hp = Math.max(0, att.hp - d); att.charged = false;
      ev.push({ t: 'counter', who: def, target: att, dmg: d, text: 'カウンター！' }); continue;
    }
    if (bDodge(att, def)) { ev.push({ t: 'dodge', who: def, target: def, text: 'ひらり！' }); att.charged = false; continue; }
    let d = bDmg(att, c);
    if (dc === 'guard') d = Math.max(1, Math.round(d * (card.special ? BATTLE.guardCutSpecial : BATTLE.guardCut)));
    if (dc === 'counter' && c === 'jab') d = Math.round(d * 1.3);   // カウンターを読まれた
    if (dc === 'charge') d = Math.round(d * 1.2);                   // ためている間はすき
    def.hp = Math.max(0, def.hp - d); att.charged = false; gain(att, 1);
    ev.push({ t: 'hit', who: att, target: def, dmg: d, text: card.special ? '必殺ねこパンチ！！' : card.name + '！', big: !!card.special, guarded: dc === 'guard' });
  }
  [[a, ca], [b, cb]].forEach(([f, c]) => { if (c === 'counter' && !ev.some(e => e.t === 'counter' && e.who === f)) ev.push({ t: 'miss', who: f, text: 'カウンター空ぶり…' }); });
  if (ca === 'charge') a.charged = true;
  if (cb === 'charge') b.charged = true;
  a.last.unshift(ca); b.last.unshift(cb);
  return ev;
}

async function bStart(practice) {
  const body = $('bBody'); if (!body) return;
  body.innerHTML = `<p class="b-wait">相手をさがしています…</p>`;
  const sync = await bReady();
  if (sync.status !== 200) { body.innerHTML = `<p class="b-wait">${esc(bErr(sync))}</p><button class="btn block" data-b="lobby">もどる</button>`; return; }
  const r = await bApi('/api/match', { ...bAuth(), practice: !!practice });
  if (!$('bBody')) return;
  if (r.status !== 200) { body.innerHTML = `<p class="b-wait">${esc(bErr(r))}</p><button class="btn block" data-b="lobby">もどる</button>`; return; }
  B = { id: r.battleId, practice: !!practice, round: 1, busy: false, me: bFighter({ ...bProfile(), rating: r.me.rating }, true), op: bFighter(r.opp, false) };
  se('get'); petSound('meow');
  bDeal(B.me); bDeal(B.op);
  bRender(`${B.practice ? '練習試合' : 'レート戦'}！ ${esc(B.op.name)}${B.op.cpu ? '（CPU）' : `（${esc(B.op.owner)}）`}があらわれた！`);
}
function bPanel(f) {
  const pct = Math.max(0, f.hp / f.maxHp * 100), pips = Array.from({ length: BATTLE.gaugeMax }, (_, i) => `<i class="${i < f.gauge ? 'on' : ''}"></i>`).join('');
  return `<div class="b-panel ${f.me ? 'mine' : 'foe'}"><div class="b-pn">${esc(f.name)} <small>${f.me ? '' : f.cpu ? 'CPU ' : esc(f.owner) + ' '}Lv.${f.level}${f.me ? '' : ' / ' + f.rating}</small></div>
    <div class="b-hp"><i style="width:${pct}%;background:${pct < 30 ? 'var(--red)' : pct < 60 ? 'var(--yellow)' : 'var(--green)'}"></i></div>
    <div class="b-sub"><span class="num">${f.hp}/${f.maxHp}</span><span class="b-gauge" aria-label="ゲージ ${f.gauge}">${pips}</span>${f.charged ? '<span class="b-tag">ため中</span>' : ''}</div></div>`;
}
function bRender(msg) {
  const body = $('bBody'); if (!body || !B) return;
  body.innerHTML = `<div class="b-arena">
    ${bPanel(B.op)}
    <div class="b-stage"><div class="b-cat foe" id="bCatOp">${petCatHTML({ breed: B.op.breed, equip: B.op.equip })}</div>
      <div class="b-cat mine" id="bCatMe">${petCatHTML({ breed: S.cat.breed, equip: S.cat.equip })}</div>
      <div class="b-round">ROUND ${Math.min(B.round, BATTLE.rounds)} / ${BATTLE.rounds}</div><div class="b-fx" id="bFx"></div></div>
    ${bPanel(B.me)}
    <p class="b-msg" id="bMsg" role="status">${msg || 'カードをえらんでね'}</p>
    <div class="b-hand" id="bHand">${B.me.hand.map((k, i) => `<button class="b-card ${BCARDS[k].special ? 'sp' : ''} k-${BCARDS[k].kind}" data-card="${i}"><span class="ic">${BCARDS[k].icon}</span><b>${BCARDS[k].name}</b><small>${BCARDS[k].desc}</small></button>`).join('')}</div>
  </div>`;
}
const bSleep = ms => new Promise(r => setTimeout(r, ms));
function bFloat(who, text, cls) {
  const fx = $('bFx'); if (!fx) return;
  const el = document.createElement('span'); el.className = 'b-pop ' + (cls || '') + (who.me ? ' at-me' : ' at-op'); el.textContent = text;
  fx.appendChild(el); setTimeout(() => el.remove(), 1100);
}
function bShake(who) { const el = $(who.me ? 'bCatMe' : 'bCatOp'); if (!el) return; el.classList.remove('hurt'); void el.offsetWidth; el.classList.add('hurt'); }
function bLunge(who) { const el = $(who.me ? 'bCatMe' : 'bCatOp'); if (!el) return; el.classList.remove('lunge'); void el.offsetWidth; el.classList.add('lunge'); }
async function bPlay(i) {
  if (!B || B.busy) return;
  const ck = B.me.hand[i]; if (!ck) return;
  B.busy = true; se('tap');
  const ok = bAiPick(B.op, B.me);
  const hand = $('bHand'); if (hand) hand.innerHTML = `<div class="b-vs"><span class="b-card mini k-${BCARDS[ck].kind}"><span class="ic">${BCARDS[ck].icon}</span><b>${BCARDS[ck].name}</b></span><b>VS</b><span class="b-card mini k-${BCARDS[ok].kind}"><span class="ic">${BCARDS[ok].icon}</span><b>${BCARDS[ok].name}</b></span></div>`;
  await bSleep(700);
  const evs = bResolve(B.me, ck, B.op, ok);
  for (const e of evs) {
    if (!$('bBody')) return;
    const m = $('bMsg'); if (m) m.textContent = `${e.who.name}の${e.text}`;
    if (e.t === 'hit' || e.t === 'counter') {
      bLunge(e.who); await bSleep(180);
      bShake(e.target); bFloat(e.target, `-${e.dmg}`, e.big ? 'big' : e.guarded ? 'small' : '');
      petSound(e.t === 'counter' || e.big ? 'punch' : 'pop'); if (e.big || e.t === 'counter') petSound('punch');
      buzz(e.big ? [40, 30, 60] : 25);
      bUpdatePanels();
    } else if (e.t === 'dodge') { bFloat(e.target, 'ひらり', 'dodge'); petSound('giggle'); }
    else if (e.t === 'miss') { bFloat(e.who, '空ぶり', 'small'); }
    else bFloat(e.who, e.text, 'buff');
    await bSleep(650);
    if (B.me.hp <= 0 || B.op.hp <= 0) break;
  }
  if (B.me.hp <= 0 || B.op.hp <= 0 || B.round >= BATTLE.rounds) return bFinish();
  B.round++; bDeal(B.me); bDeal(B.op); B.busy = false;
  bRender(`ROUND ${B.round}　カードをえらんでね`);
}
function bUpdatePanels() {
  const ps = document.querySelectorAll('#bBody .b-panel');
  if (ps.length === 2 && B) { ps[0].outerHTML = bPanel(B.op); document.querySelectorAll('#bBody .b-panel')[1].outerHTML = bPanel(B.me); }
}
async function bFinish() {
  const me = B.me, op = B.op;
  // KOされたほうの負け。最後まで行ったら、残りたいりょくの割合で判定
  let win;
  if (me.hp <= 0 && op.hp <= 0) win = me.spd >= op.spd;
  else if (op.hp <= 0) win = true; else if (me.hp <= 0) win = false;
  else { const a = me.hp / me.maxHp, b = op.hp / op.maxHp; win = a === b ? me.spd >= op.spd : a > b; }
  const ko = me.hp <= 0 || op.hp <= 0;
  const body = $('bBody'); if (!body) return;
  body.innerHTML = `<p class="b-wait">${win ? 'WIN!' : 'LOSE…'} 結果を送っています…</p>`;
  const r = await bApi('/api/result', { ...bAuth(), battleId: B.id, win });
  if (!$('bBody')) return;
  let coin = 0, delta = 0, rateTxt = '';
  if (r.status === 200) {
    delta = r.delta; S.battle.me = r.me;
    if (!r.practice) { coin = win ? BATTLE.winCoin : BATTLE.loseCoin; S.coins += coin; }
    rateTxt = r.practice ? '練習試合（レートは変わりません）' : `レート ${r.me.rating}（${delta >= 0 ? '+' : ''}${delta}）　${r.me.rank}位`;
  } else rateTxt = `結果を送れませんでした（${esc(bErr(r))}）。次の対戦のときに「負け」あつかいになります`;
  S.battle.log = [{ opp: op.name + (op.cpu ? '（CPU）' : `（${op.owner}）`), win, delta, practice: B.practice, at: Date.now() }, ...(S.battle.log || [])].slice(0, 20);
  save();
  if (win) { se('get'); petSound('giggle'); } else { se('bad'); petSound('dizzy'); }
  buzz(win ? [30, 40, 30, 40, 80] : 120);
  body.innerHTML = `<div class="b-result ${win ? 'win' : 'lose'}">
    <div class="b-res-title">${win ? 'WIN!' : 'LOSE…'}</div>
    <div class="b-res-cat">${petCatHTML({ breed: S.cat.breed, equip: S.cat.equip, mood: win ? 'normal' : 'tired' })}</div>
    <p class="b-res-sub">${win ? (ko ? 'KO勝ち！' : '判定勝ち！') : (ko ? 'KO負け…' : '判定負け…')}　vs ${esc(op.name)}</p>
    <p class="b-res-rate">${rateTxt}</p>
    ${coin ? `<p class="b-res-coin">コイン +${coin}</p>` : ''}
    <button class="btn red block" data-b="${(r.me && r.me.left > 0 && !B.practice) ? 'match' : 'practice'}">${(r.me && r.me.left > 0 && !B.practice) ? `もう一戦（のこり ${r.me.left}回）` : '練習試合をする'}</button>
    <button class="btn white block" data-b="lobby" style="margin-top:8px">ロビーへ</button></div>`;
  B = null;
}

function bClick(e) {
  const c = e.target.closest('[data-card]'); if (c) { bPlay(+c.dataset.card); return; }
  const b = e.target.closest('[data-b]'); if (!b) return;
  const a = b.dataset.b;
  if (a === 'close') { if (B && !B.practice && !confirm('対戦をやめると「負け」になります。やめますか？')) return; closeBattle(); }
  else if (a === 'lobby') { se('tap'); bLobby(); }
  else if (a === 'match') bStart(false);
  else if (a === 'practice') bStart(true);
}
