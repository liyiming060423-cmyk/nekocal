// アプリの版。index.html の ?v= と sw.js の VERSION もこれにそろえる
const APP_VER = '8.9';

// にゃんカロ データ定義
// アイテム・ショップ・トレーニング・ミッションなど「数字や名前」はここだけで管理する。
// 値を変えたいときはこのファイルだけ直せばOK。

// AIカロリー推定の中継（Cloudflare Worker）のURL
const AI_ENDPOINT = 'https://nekocal-ai.liyiming060423.workers.dev';

// 着せかえアイテム（slot: head=頭 / top=服 / hand=手）
// rar: N / R / SR    bonus: 着ていると上がる能力
const WEAR = {
  band_none:   { slot: 'head', name: 'なし',               rar: 'N' },
  band_pink:   { slot: 'head', name: 'ピンクのヘアバンド', rar: 'N',  color: '#E8607A' },
  band_blue:   { slot: 'head', name: '青のヘアバンド',     rar: 'N',  color: '#3A7BD5' },
  cap_red:     { slot: 'head', name: '赤いキャップ',       rar: 'R',  color: '#D33A3A', bonus: { spd: 3 } },
  crown:       { slot: 'head', name: '金の王冠',           rar: 'SR', color: '#E9B730', bonus: { pow: 5, spd: 5, sta: 5 } },
  tee_orange:  { slot: 'top',  name: 'オレンジTシャツ',    rar: 'N',  color: '#F08A3C' },
  jersey_blue: { slot: 'top',  name: '青ジャージ',         rar: 'N',  color: '#3A72D0' },
  tank_paw:    { slot: 'top',  name: '肉球タンクトップ',   rar: 'R',  color: '#2BA37A', bonus: { sta: 4 } },
  gi_white:    { slot: 'top',  name: '白い道着',           rar: 'R',  color: '#FFFFFF', bonus: { pow: 4 } },
  gold_jacket: { slot: 'top',  name: 'チャンピオンジャケット', rar: 'SR', color: '#E9B730', bonus: { pow: 8, sta: 8 } },
  gloves_brown:{ slot: 'hand', name: '茶色グローブ',       rar: 'N',  color: '#7A4A2A' },
  gloves_red:  { slot: 'hand', name: '赤グローブ',         rar: 'N',  color: '#D33A3A' },
  dumbbell:    { slot: 'hand', name: 'ダンベル',           rar: 'R',  bonus: { pow: 4 } },
  gloves_gold: { slot: 'hand', name: '金のグローブ',       rar: 'SR', color: '#E9B730', bonus: { pow: 10 } },
  // コスチューム（全身の着ぐるみ・コスプレ。着ている間は 頭・服 の見た目をかくす。body=服の色）
  // 絵は cat.js の suitHead（頭）と suitBack（体のうしろ）、服の色は petcat.css の .wear-suit-○○
  suit_none:   { slot: 'suit', name: 'なし',                 rar: 'N' },
  frog_coat:   { slot: 'suit', name: 'カエルのレインコート', rar: 'N',  color: '#7CC24A', body: '#F2C94C', bonus: { sta: 2 } },
  bear_suit:   { slot: 'suit', name: 'くまの着ぐるみ',       rar: 'N',  color: '#8A5A36', body: '#8A5A36', bonus: { sta: 3 } },
  dino_hood:   { slot: 'suit', name: '恐竜パーカー',         rar: 'R',  color: '#4FA35A', body: '#4FA35A', bonus: { pow: 4 } },
  chef:        { slot: 'suit', name: 'コックさん',           rar: 'R',  color: '#FFFFFF', body: '#FFFFFF', bonus: { sta: 4 } },
  wizard:      { slot: 'suit', name: '魔法使い',             rar: 'SR', color: '#6E4AB8', body: '#6E4AB8', bonus: { pow: 6, spd: 6 } },
  astronaut:   { slot: 'suit', name: '宇宙飛行士',           rar: 'SR', color: '#E8EEF4', body: '#E8EEF4', bonus: { spd: 8, sta: 6 } }
};
const SLOT_NAME = { suit: 'コスチューム', head: '頭', top: '服', hand: '手' };

// 猫の種類（はじめに選ぶ・せっていで変えられる）
// 絵は ○○-body.png / -tail.png / -shirt.png / -gloves.png（高さ813の透過PNG、4枚とも同じ大きさ）
//   w,h  : 絵の大きさ    x : 横の位置あわせ（600幅の枠の中で、頭の真ん中がそろうようにずらす量）
//   pivot: しっぽを振る中心    head: 頭の中心と半径（頭の着せかえの位置）    hands: ダンベルを持つ位置
//   zones: タップの当たり判定 [部位, 中心x, 中心y, 半径x, 半径y]（上から順に優先）
const CATS = {
  tabby: {
    name: '茶トラ', desc: '元気いっぱいの茶トラ', w: 600, h: 813, x: 0,
    pivot: [487, 506], head: [241, 157, 186], hands: [[81, 325], [447, 254]],
    zones: [['tail', 541, 482, 62, 73], ['ear', 103, 68, 46, 49], ['ear', 344, 46, 46, 49],
      ['hand', 81, 319, 84, 89], ['hand', 447, 254, 79, 76], ['head', 238, 162, 187, 127],
      ['foot', 108, 750, 92, 62], ['foot', 466, 750, 87, 62], ['belly', 298, 412, 168, 97], ['pants', 314, 596, 217, 87]]
  },
  white: {
    name: '白猫', desc: 'まっしろでおっとり', w: 581, h: 813, x: -13,
    pivot: [488, 556], head: [254, 170, 178], hands: [[86, 339], [441, 298]],
    zones: [['tail', 524, 569, 56, 66], ['ear', 102, 87, 46, 49], ['ear', 341, 58, 46, 49],
      ['hand', 86, 339, 84, 76], ['hand', 441, 298, 87, 80], ['head', 254, 189, 180, 135],
      ['foot', 102, 755, 90, 58], ['foot', 479, 755, 80, 58], ['belly', 290, 410, 165, 95], ['pants', 290, 600, 215, 85]]
  },
  longwhite: {
    name: '白い長毛猫', desc: 'ふわふわのしっぽ自慢', w: 722, h: 813, x: -28,
    pivot: [534, 571], head: [269, 168, 185], hands: [[108, 343], [510, 278]],
    zones: [['tail', 640, 590, 80, 125], ['ear', 116, 87, 46, 49], ['ear', 370, 58, 46, 49],
      ['hand', 108, 343, 81, 75], ['hand', 510, 278, 72, 78], ['head', 269, 200, 190, 150],
      ['foot', 123, 762, 90, 55], ['foot', 472, 762, 85, 55], ['belly', 308, 410, 170, 100], ['pants', 300, 600, 215, 85]]
  },
  grey: {
    name: '灰色の長毛猫', desc: 'クールなボクサー', w: 580, h: 813, x: 9,
    pivot: [478, 474], head: [232, 165, 170], hands: [[87, 323], [445, 267]],
    zones: [['tail', 522, 411, 55, 95], ['ear', 65, 58, 45, 48], ['ear', 298, 44, 45, 48],
      ['hand', 87, 323, 70, 78], ['hand', 445, 267, 75, 90], ['head', 232, 170, 170, 130],
      ['foot', 87, 762, 85, 55], ['foot', 407, 768, 85, 55], ['belly', 283, 400, 170, 100], ['pants', 270, 585, 210, 85]]
  }
};
const CAT_KEYS = Object.keys(CATS);


// ショップで買える消耗品（コインで購入）
const SHOP_ITEMS = [
  { id: 'drink',   name: 'スタミナドリンク', desc: 'スタミナが30回復',             price: 100 },
  { id: 'protein', name: 'プロテイン',       desc: '次のトレーニングの効果が1.5倍', price: 150 },
  { id: 'goldbag', name: '金のサンドバッグ', desc: 'つぎの3回のトレーニングが2倍', price: 0, shop: false }   // 福袋だけで出る
];

// 石のパック（学校の作品なので実際の購入はできない：表示のみ）
const STONE_PACKS = [
  { n: 10,  yen: 120 },
  { n: 60,  yen: 610 },
  { n: 130, yen: 1220 }
];

// ガチャ
const GACHA_COST = 500;          // コイン
const GACHA_RATE = { N: 70, R: 25, SR: 5 };   // %
// 福袋から出るトレーニングアイテム（きせかえと同じ確率の箱に入る）
const GACHA_ITEMS = {
  N:  [{ id: 'drink', n: 2 }, { id: 'protein', n: 1 }],
  R:  [{ id: 'protein', n: 2 }, { id: 'drink', n: 3 }],
  SR: [{ id: 'goldbag', n: 1 }]
};
// ホームのイベントバナー（go: 'gacha' でガチャへ）
const EVENT = { tag: '福袋', title: 'トレーニング<br>アイテム入り！', go: 'gacha' };
const DUP_REFUND = 100;          // かぶったらコインに交換

// ジムのトレーニング（cost=使うスタミナ）
// stat: pow=ちから / spd=すばやさ / sta=たいりょく
const TRAININGS = [
  { id: 'bag',    name: 'サンドバッグ連打',   cost: 15, stat: 'sta', gain: [3, 6], exp: 15, coin: 10, label: 'たいりょくUP・コイン' },
  { id: 'tread',  name: 'トレッドミル',       cost: 20, stat: 'spd', gain: [4, 7], exp: 20, coin: 0,  label: 'すばやさUP' },
  { id: 'weight', name: 'ウェイトトレーニング', cost: 25, stat: 'pow', gain: [5, 9], exp: 25, coin: 0,  label: 'ちからUP' }
];
const STAT_NAME = { pow: 'ちから', spd: 'すばやさ', sta: 'たいりょく' };

// 回復・報酬のルール
const RULE = {
  moodStart: 60,           // ごきげんの最初の値（0〜100）
  moodPerTouch: 1,         // 猫をさわる（1日 +20 まで）
  moodTouchMax: 20,
  moodPerMeal: 5,          // ごはんを記録
  moodPerTrain: 2,         // トレーニング
  moodPerDay: -10,         // 日付が変わるたび
  strideRate: 0.45,        // 歩幅＝身長×0.45（km表示用）
  staminaPerMeal: 15,      // ごはんを1回記録すると回復
  stepsUnit: 1000,         // 何歩ごとに
  staminaPerUnit: 5,       //   スタミナ回復
  coinPerUnit: 10,         //   コイン
  bgmVolume: 0.35,         // BGMの音量（0〜1。効果音より小さめ）
  miniPlaysPerDay: 3,      // ミニゲームで報酬がもらえる回数
  photoBonusMax: 3,        // 写真つきでごはんを記録すると、報酬つきプレイが1回ふえる（1日この回数まで）
  miniRewardMax: 50,       // 組員作ミニゲーム（猫探し・ダッシュ）で1回にもらえるコインの上限
  slotNetMax: 100,         // スロットで1日に増やせるコインの上限（負けはそのまま減る）
  crisisWarn: 70,          // 体型がこの値をこえたら猫がSOS（1回目）
  crisisDanger: 90,        //   この値をこえたら2回目（±100で骸骨／爆発）
  expPerMeal: 10
};

// さんぽモードの地図の「お宝」（walk.js）
const TREASURE = {
  onMap: 5,          // 地図に同時に出ている数
  minR: 80,          // 自分から何mはなれた所に出すか（いちばん近く）
  maxR: 250,         //   （いちばん遠く）
  gap: 60,           // お宝どうしは何mはなす
  pickR: 30,         // 何mまで近づいたら拾えるか（GPSの誤差があるので少し広め）
  nearR: 60,         // 何mまで近づいたら「近い！」とブルッとするか
  awayR: 400,        // 何mはなれたら消して、近くに出しなおすか
  perDay: 10,        // 1日に拾える数
  swapWait: 30,      // 「入れかえ」を押せる間かく（秒）
  // 中身（w=出やすさ）。coin は [最小, 最大]
  loot: [
    { w: 70, coin: [10, 30] },
    { w: 20, item: 'drink' },
    { w: 8,  item: 'protein' },
    { w: 2,  item: 'goldbag' }
  ]
};

// ログインボーナス（7日で1周）
const LOGIN_REWARDS = [50, 60, 70, 80, 90, 100, 300];

// 毎日のミッション（check は今日のデータから達成数を数える）
const MISSIONS = [
  { id: 'photo1',  name: 'ごはんを1回記録する', goal: 1, reward: 30, check: d => d.meals.length },
  { id: 'meal3',   name: '朝・昼・夜を記録する', goal: 3, reward: 50, check: d => new Set(d.meals.map(m => m.slot).filter(s => s !== 'snack')).size },
  { id: 'train1',  name: 'ジムでトレーニングする', goal: 1, reward: 30, check: d => d.trains || 0 },
  { id: 'mini1',   name: 'ミニゲームをあそぶ',   goal: 1, reward: 20, check: d => d.minis || 0 },
  { id: 'steps2k', name: 'さんぽで2,000歩あるく', goal: 2000, reward: 50, check: d => d.steps || 0 },
  { id: 'treasure3', name: 'さんぽでお宝を3つ拾う', goal: 3, reward: 50, check: d => d.treasures || 0 }
];

// よく食べるもの（手入力用・カロリーは目安）
const PRESETS = [
  ['ご飯（茶碗1杯）', 250], ['おにぎり', 180], ['食パン1枚', 160], ['味噌汁', 40], ['サラダ', 60],
  ['ラーメン', 500], ['カレーライス', 750], ['牛丼（並）', 650], ['ハンバーガー', 300], ['チキン南蛮定食', 900]
];

// ミニゲーム「どっちが高い？」の問題（カロリーは一般的な目安）
const QUIZ_FOODS = [
  ['ご飯（茶碗1杯）', 250], ['食パン1枚', 160], ['おにぎり', 180], ['ラーメン', 500], ['カレーライス', 750],
  ['牛丼（並）', 650], ['ハンバーガー', 300], ['ケーキ1切れ', 350], ['唐揚げ5個', 400], ['ざるそば', 300],
  ['味噌汁', 40], ['缶ジュース', 140], ['ポテトチップス1袋', 330], ['チキン南蛮定食', 900], ['冷や汁', 400],
  ['ピザ1切れ', 250], ['バナナ1本', 90], ['ヨーグルト', 60], ['うどん', 300], ['ドーナツ1個', 250]
];

const WEEK = ['日', '月', '火', '水', '木', '金', '土'];
const SLOTS = { morning: '朝', noon: '昼', night: '夜', snack: '間食' };

// ===== 対戦（PvP） =====
// サーバー（Cloudflare Worker）。Worker を作ったらここの URL をその Worker の URL にする
const BATTLE_API = 'https://nekocal-battle.liyiming060423.workers.dev';
const BATTLE = {
  rounds: 5,              // 最大ラウンド数（どちらかのたいりょくが0になったら終わり）
  winCoin: 30,            // 勝ったときのコイン
  loseCoin: 5,            // 負けたときのコイン
  hpBase: 80, hpPerSta: 1.5,     // たいりょく(HP) = 80 + スタミナ×1.5
  powDiv: 40,             // ダメージ倍率 = 1 + ちから÷40
  guardCut: 0.3,          // ガード中にうけるダメージ（3割）
  guardCutSpecial: 0.7,   // 必殺技はガードしても7割うける
  chargeMul: 1.5,         // ため の次の攻撃の倍率
  counterMul: 1.5,        // カウンターではね返す倍率
  specialGauge: 3,        // 必殺技に必要なゲージ
  gaugeMax: 5
};
// スキルカード（kind: atk 攻撃 / guard ガード / counter カウンター / charge ため）
const BCARDS = {
  jab:      { name: 'ジャブ',       icon: '👊', kind: 'atk', p: 8,  fast: true, w: 3, desc: 'すばやい攻撃。カウンターに強い' },
  straight: { name: 'ストレート',   icon: '💥', kind: 'atk', p: 14, w: 3, desc: '強い攻撃。カウンターに弱い' },
  guard:    { name: 'ガード',       icon: '🛡️', kind: 'guard', w: 2, desc: '攻撃を3割にへらす・ゲージ+1' },
  counter:  { name: 'カウンター',   icon: '🔄', kind: 'counter', w: 2, desc: 'ストレート・必殺技をはね返す' },
  charge:   { name: 'ため',         icon: '🔥', kind: 'charge', w: 2, desc: 'ゲージ+2・次の攻撃1.5倍' },
  special:  { name: '必殺ねこパンチ', icon: '🌟', kind: 'atk', p: 30, special: true, w: 0, desc: 'ゲージ3で使える大技' }
};
