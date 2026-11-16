// にゃんカロ せってい・データ
// せってい画面・データの保護・バックアップと復元
// （v10.0 で app.js から分けた。読みこむ順番は index.html。ほかのファイルの関数・変数はそのまま使える）
'use strict';

/* ---------- バックアップ・復元（v8.9） ---------- */
// データはこのスマホの中（storage.js の store＝いまは localStorage）にしかないので、機種変更やブラウザのデータ削除で消える。
// 全データ（写真こみ）を1つの JSON ファイルにして保存し、新しいスマホで「復元」すると同じ状態にもどる。
const BK_APP = 'nyankalo', DAY_MS = 864e5, BK_NAG_DAYS = 7;
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
const verNum = v => String(v || '0').split('.').reduce((a, x) => a * 1000 + (parseInt(x, 10) || 0), 0);
// v9.8：ブラウザに「このデータは消さないで」とお願いする（容量が足りないときなどに自動で消されにくくなる）
async function askPersist() {
  try { if (navigator.storage && navigator.storage.persist && !(await navigator.storage.persisted())) await navigator.storage.persist(); } catch (e) {}
  if (UI.tab === 'settings') showPersist();
}
// せっていの「データの保護」に、いまの状態を書く
async function showPersist() {
  const el = $('sPersist'); if (!el) return;
  let on = null;
  try { if (navigator.storage && navigator.storage.persisted) on = await navigator.storage.persisted(); } catch (e) {}
  const el2 = $('sPersist'); if (!el2) return;
  el2.textContent = on === true ? 'オン：ブラウザがデータを自動で消しにくくなっています'
    : on === null ? 'この端末では確かめられません。ときどきバックアップしてね'
    : isIOS() && !isStandalone() ? 'オフ：Safari の共有ボタン →「ホーム画面に追加」から開くと、データが消えにくくなります'
    : 'オフ：ホーム画面に追加（インストール）して使うと、オンになりやすくなります';
}
function backupAgoText() {
  if (!S.lastBackup) return 'まだ一度も保存していません';
  const n = Math.floor((Date.now() - S.lastBackup) / DAY_MS);
  return `最後のバックアップ：${n <= 0 ? '今日' : n + '日前'}`;
}
async function doBackup() {
  const name = `nyankalo-backup-${todayStr().replace(/-/g, '')}.json`;
  const blob = new Blob([JSON.stringify({ app: BK_APP, ver: APP_VER, at: Date.now(), data: S })], { type: 'application/json' });
  // スマホで共有シートが使えるときはそちら（「ファイルに保存」や LINE に送れる）
  let file = null; try { file = new File([blob], name, { type: 'application/json' }); } catch (e) {}
  if (file && navigator.canShare && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
    try { if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'にゃんカロのバックアップ' }); markBackup(); return; } }
    catch (e) { if (e && e.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  markBackup();
}
function markBackup() {
  S.lastBackup = Date.now(); save(); se('coin');
  toast(isIOS() ? 'バックアップを保存しました（「ファイル」アプリに入っています）' : 'バックアップを保存しました（ダウンロードに入っています）');
  if (UI.tab === 'settings') renderSettings();
}
// ファイルの中身をチェック。問題があればメッセージを返す
function checkBackup(o) {
  if (!o || o.app !== BK_APP || !o.data) return 'にゃんカロのバックアップファイルではありません';
  const d = o.data;
  if (typeof d !== 'object' || !d.cat || !d.user || !d.days || typeof d.days !== 'object' || !Array.isArray(d.owned) || typeof d.coins !== 'number') return 'ファイルがこわれているようです';
  if (verNum(o.ver) > verNum(APP_VER)) return `新しいバージョン（v${o.ver}）のバックアップです。アプリを最新にしてから復元してください`;
  return null;
}
function openRestore() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'application/json,.json';
  inp.onchange = () => {
    const f = inp.files && inp.files[0]; if (!f) return;
    if (f.size > 60e6) { toast('ファイルが大きすぎます'); return; }
    const r = new FileReader();
    r.onerror = () => toast('ファイルを読みこめませんでした');
    r.onload = () => {
      let o; try { o = JSON.parse(r.result); } catch (e) { toast('にゃんカロのバックアップファイルではありません'); return; }
      const err = checkBackup(o); if (err) { toast(err); se('bad'); return; }
      const d = o.data, at = new Date(o.at || 0);
      const back = () => { if (!S.onboarded) openWelcome(); else closeModal(); };
      openModal(`<h2 id="modalTitle">バックアップから復元</h2><div class="stack">
        <div class="card" style="padding:12px 14px;font-weight:700;line-height:1.8">保存した日：${at.getFullYear()}/${at.getMonth() + 1}/${at.getDate()} ${pad(at.getHours())}:${pad(at.getMinutes())}<br>
          猫：${esc(d.cat.name || '')}（Lv.${Number(d.cat.level) || 1}）<br>コイン：${fmt(d.coins)}<br>記録：${Object.keys(d.days).length}日分</div>
        <p class="hint" style="color:var(--red);font-weight:900;margin:0">今のデータはすべて上書きされます（元にはもどせません）</p>
        <button class="btn red block" id="rsGo">復元する</button><button class="btn white block" id="rsNo">やめる</button></div>`, root => {
        root.querySelector('#rsNo').onclick = back;
        root.querySelector('#rsGo').onclick = () => {
          d.lastBackup = o.at || Date.now(); d.onboarded = true;
          try { store.write(KEY, JSON.stringify(d)); }
          catch (e) { toast('スマホの容量が足りず、復元できませんでした'); return; }
          toast('復元しました！ 読みこみなおします'); se('get');
          setTimeout(() => location.reload(), 700);
        };
      }, null, !S.onboarded);   // はじめての設定の途中なら、外をタップしても閉じない
    };
    r.readAsText(f);
  };
  inp.click();
}
// しばらくバックアップしていないとき、週に1回だけお知らせ（使いはじめて7日たってから）
function checkBackupNag() {
  if (!S.onboarded || !$('modal').hidden) return;
  const first = Object.keys(S.days).sort()[0], firstT = first ? new Date(first).getTime() : Date.now();
  const base = S.lastBackup || firstT, now = Date.now();
  if (now - base < BK_NAG_DAYS * DAY_MS || now - (S.backupNag || 0) < BK_NAG_DAYS * DAY_MS) return;
  S.backupNag = now; save();
  openModal(`<h2 id="modalTitle">バックアップしよう</h2><div class="stack">
    <p style="margin:0">${S.lastBackup ? `最後のバックアップから${Math.floor((now - S.lastBackup) / DAY_MS)}日たちました。` : 'まだ一度もバックアップしていません。'}データはこのスマホの中にしかないので、機種変更やブラウザのデータ削除で${esc(S.cat.name)}が消えてしまいます。</p>
    ${isIOS() && !isStandalone() ? '<p class="hint" style="margin:0">iPhone は Safari の共有ボタン →「ホーム画面に追加」から開くと、データが消えにくくなります。</p>' : ''}
    <button class="btn block" id="bnGo">今すぐ保存</button><button class="btn white block" id="bnNo">あとで</button></div>`, root => {
    root.querySelector('#bnGo').onclick = () => { closeModal(); doBackup(); };
    root.querySelector('#bnNo').onclick = closeModal;
  });
}

/* =========================================================
   11. せってい
   ========================================================= */
let resetArmed = false;
function renderSettings() {
  const s = S.settings, sw = (id, on, label) => `<button class="switch" role="switch" id="${id}" aria-checked="${on}" aria-label="${label}"></button>`;
  const perm = ('Notification' in window) ? Notification.permission : 'unsupported';
  $('setBody').innerHTML = `
    <div class="section-title">音声</div>
    <div class="card set-group"><div class="set-row"><div class="grow">BGM<small>画面ごとの音楽</small></div>${sw('sBgm', s.bgm !== false, 'BGM')}</div>
      <div class="set-row"><div class="grow">効果音<small>ボタンやコインの音</small></div>${sw('sSound', s.sound, '効果音')}</div></div>
    <div class="section-title">バイブレーション</div>
    <div class="card set-group"><div class="set-row"><div class="grow">バイブレーション<small>iPhone では動かないことがあります</small></div>${sw('sVib', s.vibrate, 'バイブレーション')}</div></div>
    <div class="section-title">通知</div>
    <div class="card set-group">
      <div class="set-row"><div class="grow">猫のSOS通知<small>${perm === 'unsupported' ? 'この端末では通知が使えません' : 'アプリを開いているあいだだけ届きます（閉じているときは届きません）'}</small></div>${sw('sNotify', s.notify && perm === 'granted', '猫のSOS通知')}</div>
    </div>
    <div class="section-title">データ</div>
    <div class="card set-group">
      <div class="set-row"><div class="grow">バックアップを保存<small>${esc(backupAgoText())}。写真もふくめて1つのファイルにします</small></div><button class="btn small" id="sBackup">保存</button></div>
      <div class="set-row"><div class="grow">バックアップから復元<small>機種変更のときなど。今のデータは上書きされます</small></div><button class="btn small white" id="sRestore">えらぶ</button></div>
      <div class="set-row"><div class="grow">データの保護<small id="sPersist">しらべています…</small></div></div>
    </div>
    <div class="section-title">そのほか</div>
    <div class="card set-group">
      <div class="set-row"><div class="grow">猫の種類<small>いまは「${esc((CATS[S.cat.breed] || CATS.tabby).name)}」</small></div><button class="btn small white" id="sCat">かえる</button></div>
      <div class="set-row"><div class="grow">使い方ガイド<small>ホームの案内をもう一度見る</small></div><button class="btn small white" id="sTour">見る</button></div>
      <div class="set-row"><div class="grow">プロフィール・目標カロリー</div><button class="btn small white" id="sProfile">ひらく</button></div>
      <div class="set-row"><div class="grow">データをすべて消す<small>猫・コイン・記録が最初にもどります</small></div><button class="btn small ${resetArmed ? 'red' : 'white'}" id="sReset">${resetArmed ? 'もう一度押すと消えます' : '消す'}</button></div>
    </div>
    <p class="hint" style="text-align:center;margin:14px 0">にゃんカロ v${APP_VER}　宮崎情報ビジネス専門学校 制作アプリ</p>`;
  showPersist();
}
$('setBody').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  const s = S.settings;
  if (b.id === 'sSound') { s.sound = !s.sound; se('tap'); }
  else if (b.id === 'sBgm') { s.bgm = s.bgm === false; bgmUpdate(); }
  else if (b.id === 'sVib') { s.vibrate = !s.vibrate; buzz(80); }
  else if (b.id === 'sNotify') {
    if (!('Notification' in window)) { toast('この端末では通知が使えません'); return; }
    if (!s.notify) { const p = await Notification.requestPermission(); s.notify = p === 'granted'; if (p !== 'granted') toast('通知が許可されませんでした。端末の設定から許可してください'); }
    else s.notify = false;
  }
  else if (b.id === 'sProfile') { openProfile(false); return; }
  else if (b.id === 'sTour') { setTab('home'); setTimeout(startTour, 300); return; }
  else if (b.id === 'sBackup') { doBackup(); return; }
  else if (b.id === 'sRestore') { openRestore(); return; }
  else if (b.id === 'sCat') { openCatPicker(); return; }
  else if (b.id === 'sReset') {
    if (!resetArmed) { resetArmed = true; renderSettings(); setTimeout(() => { resetArmed = false; if (UI.tab === 'settings') renderSettings(); }, 4000); return; }
    store.remove(KEY); S = defaultState(); resetArmed = false; save(); setTab('home'); openWelcome(); return;
  }
  save(); renderSettings();
});
