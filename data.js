// アプリの版。index.html の ?v= と sw.js の VERSION もこれにそろえる
const APP_VER = '10.4.1';
const APP_NEWS = '10.4';   // この版のお知らせ（ui.js の showNews）まで見たか。10.1＝メニューが変わった、10.3＝おもいで・ずっとミッション・ダイヤ、10.4＝イベント（次に大きく変えたら、数字をその版にする）

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
  // v9.4 で追加（絵は cat.js の headGear）
  hachimaki:   { slot: 'head', name: 'ハチマキ',           rar: 'N',  color: '#FFFFFF' },
  ribbon:      { slot: 'head', name: 'リボン',             rar: 'N',  color: '#E8607A' },
  straw_hat:   { slot: 'head', name: '麦わら帽子',         rar: 'N',  color: '#E8C26A' },
  knit_cat:    { slot: 'head', name: 'ねこみみニット帽',   rar: 'N',  color: '#4FA3A0' },
  sunglasses:  { slot: 'head', name: 'サングラス',         rar: 'R',  color: '#2A2A2A', bonus: { spd: 3 } },
  headphones:  { slot: 'head', name: 'ヘッドホン',         rar: 'R',  color: '#3A72D0', bonus: { sta: 3 } },
  school_cap:  { slot: 'head', name: '学生帽',             rar: 'R',  color: '#22252B', bonus: { pow: 3 } },
  halo:        { slot: 'head', name: '天使の輪',           rar: 'SR', color: '#F5D45C', bonus: { spd: 6, sta: 8 } },
  tiara:       { slot: 'head', name: 'ティアラ',           rar: 'SR', color: '#C9D6E8', bonus: { pow: 6, spd: 6, sta: 2 } },
  tee_orange:  { slot: 'top',  name: 'オレンジTシャツ',    rar: 'N',  color: '#F08A3C' },
  jersey_blue: { slot: 'top',  name: '青ジャージ',         rar: 'N',  color: '#3A72D0' },
  tank_paw:    { slot: 'top',  name: '肉球タンクトップ',   rar: 'R',  color: '#2BA37A', bonus: { sta: 4 } },
  gi_white:    { slot: 'top',  name: '白い道着',           rar: 'R',  color: '#FFFFFF', bonus: { pow: 4 } },
  gold_jacket: { slot: 'top',  name: 'チャンピオンジャケット', rar: 'SR', color: '#E9B730', bonus: { pow: 8, sta: 8 } },
  // v9.4 で追加（服の絵の色を petcat.css の .wear-○○ で変える）
  tee_pink:    { slot: 'top',  name: 'ピンクTシャツ',      rar: 'N',  color: '#F08AA8' },
  tee_yellow:  { slot: 'top',  name: '黄色Tシャツ',        rar: 'N',  color: '#F5D24A' },
  tee_black:   { slot: 'top',  name: '黒Tシャツ',          rar: 'N',  color: '#33302E' },
  jersey_cyan: { slot: 'top',  name: '水色ジャージ',       rar: 'N',  color: '#6CC6E8' },
  jersey_purple:{ slot: 'top', name: '紫ジャージ',         rar: 'R',  color: '#8A5AC8', bonus: { spd: 4 } },
  uni_red:     { slot: 'top',  name: '赤いユニフォーム',   rar: 'R',  color: '#D33A3A', bonus: { pow: 4 } },
  rainbow_jacket:{ slot: 'top', name: 'にじ色ジャケット',  rar: 'SR', color: '#E86AA8', bonus: { pow: 6, spd: 4, sta: 4 } },
  gloves_brown:{ slot: 'hand', name: '茶色グローブ',       rar: 'N',  color: '#7A4A2A' },
  gloves_red:  { slot: 'hand', name: '赤グローブ',         rar: 'N',  color: '#D33A3A' },
  dumbbell:    { slot: 'hand', name: 'ダンベル',           rar: 'R',  bonus: { pow: 4 } },
  gloves_gold: { slot: 'hand', name: '金のグローブ',       rar: 'SR', color: '#E9B730', bonus: { pow: 10 } },
  // v9.4 で追加（手袋の絵の色を petcat.css で変える）
  gloves_blue: { slot: 'hand', name: '青グローブ',         rar: 'N',  color: '#3A72D0' },
  gloves_green:{ slot: 'hand', name: '緑グローブ',         rar: 'N',  color: '#4FAE5B' },
  gloves_white:{ slot: 'hand', name: '白グローブ',         rar: 'N',  color: '#F4F1EC' },
  gloves_pink: { slot: 'hand', name: 'ピンクグローブ',     rar: 'R',  color: '#F08AA8', bonus: { pow: 3 } },
  gloves_rainbow:{ slot: 'hand', name: 'にじ色グローブ',   rar: 'SR', color: '#E86AA8', bonus: { pow: 8, spd: 4 } },
  // v10.3 ずっとミッション（実績）でだけもらえる（ach: true）。福袋には出ない・図鑑の数には入らない・能力のボーナスはなし（D26）
  tee_diary:   { slot: 'top',  name: 'ごはん日記Tシャツ',   rar: 'R',  color: '#7FD1B9', ach: true },
  gloves_paw:  { slot: 'hand', name: '肉球グローブ',        rar: 'R',  color: '#B99AE8', ach: true },
  // コスチューム（全身の着ぐるみ・コスプレ。着ている間は 頭・服 の見た目をかくす。body=服の色）
  // 絵は cat.js の suitHead（頭）と suitBack（体のうしろ）、服の色は petcat.css の .wear-suit-○○
  suit_none:   { slot: 'suit', name: 'なし',                 rar: 'N' },
  frog_coat:   { slot: 'suit', name: 'カエルのレインコート', rar: 'N',  color: '#7CC24A', body: '#F2C94C', bonus: { sta: 2 } },
  bear_suit:   { slot: 'suit', name: 'くまの着ぐるみ',       rar: 'N',  color: '#8A5A36', body: '#8A5A36', bonus: { sta: 3 } },
  dino_hood:   { slot: 'suit', name: '恐竜パーカー',         rar: 'R',  color: '#4FA35A', body: '#4FA35A', bonus: { pow: 4 } },
  chef:        { slot: 'suit', name: 'コックさん',           rar: 'R',  color: '#FFFFFF', body: '#FFFFFF', bonus: { sta: 4 } },
  wizard:      { slot: 'suit', name: '魔法使い',             rar: 'SR', color: '#6E4AB8', body: '#6E4AB8', bonus: { pow: 6, spd: 6 } },
  astronaut:   { slot: 'suit', name: '宇宙飛行士',           rar: 'SR', color: '#E8EEF4', body: '#E8EEF4', bonus: { spd: 8, sta: 6 } },
  // v9.5 で追加（コスチューム +10 → きせかえ 合計50こ）
  chick_suit:  { slot: 'suit', name: 'ひよこの着ぐるみ',     rar: 'N',  color: '#F5D24A', body: '#F5D24A', bonus: { spd: 2 } },
  panda_suit:  { slot: 'suit', name: 'パンダの着ぐるみ',     rar: 'N',  color: '#F4F1EC', body: '#F4F1EC', bonus: { sta: 3 } },
  bunny_suit:  { slot: 'suit', name: 'うさぎの着ぐるみ',     rar: 'N',  color: '#F7DCE6', body: '#F7DCE6', bonus: { spd: 3 } },
  santa:       { slot: 'suit', name: 'サンタさん',           rar: 'R',  color: '#D33A3A', body: '#D33A3A', bonus: { sta: 4 } },
  penguin_suit:{ slot: 'suit', name: 'ペンギンの着ぐるみ',   rar: 'R',  color: '#2E3A4A', body: '#2E3A4A', bonus: { spd: 3 } },
  ninja:       { slot: 'suit', name: '忍者',                 rar: 'R',  color: '#2A3040', body: '#2A3040', bonus: { spd: 4 } },
  pirate:      { slot: 'suit', name: '海賊',                 rar: 'R',  color: '#9A2E2E', body: '#9A2E2E', bonus: { pow: 3 } },
  baseball_uni:{ slot: 'suit', name: '野球のユニフォーム',   rar: 'R',  color: '#24346A', body: '#FFFFFF', bonus: { pow: 4 } },
  dragon_suit: { slot: 'suit', name: 'ドラゴン',             rar: 'SR', color: '#D9503A', body: '#D9503A', bonus: { pow: 8, spd: 6 } },
  knight:      { slot: 'suit', name: '騎士',                 rar: 'SR', color: '#B8C4CE', body: '#B8C4CE', bonus: { pow: 6, sta: 8 } },
  // v10.4 イベントのきせかえ（ev: イベントのid）。イベントガチャだけで出る・福袋には出ない・図鑑の 50 には入らない・能力のボーナスはなし（D40・D41）
  // 絵は cat.js の suitHead（頭）・suitBack（体のうしろ）・suitFront（体の前：えり・ボタン・帯など）、服の色は petcat.css の .wear-suit-○○
  ev_gakuran:   { slot: 'suit', name: '学ラン',               rar: 'N',  color: '#1F2433', body: '#1F2433', ev: 'school' },
  ev_sailor:    { slot: 'suit', name: 'セーラー服',           rar: 'N',  color: '#F4F6FA', body: '#F4F6FA', ev: 'school' },
  ev_randoseru: { slot: 'suit', name: 'ランドセル',           rar: 'R',  color: '#D8343F', body: '#F4F6FA', ev: 'school' },
  ev_hakama:    { slot: 'suit', name: '卒業はかま',           rar: 'SR', color: '#7A3E8E', body: '#F2A7BE', ev: 'school' },
  ev_teru:      { slot: 'suit', name: 'てるてる坊主',         rar: 'N',  color: '#FFFFFF', body: '#FFFFFF', ev: 'rainy' },
  ev_snail:     { slot: 'suit', name: 'かたつむり',           rar: 'N',  color: '#C98A4B', body: '#9BC46A', ev: 'rainy' },
  ev_ajisai:    { slot: 'suit', name: 'あじさい',             rar: 'R',  color: '#8C7BD8', body: '#7FA8E8', ev: 'rainy' },
  ev_raijin:    { slot: 'suit', name: '雷さま',               rar: 'SR', color: '#F2C230', body: '#F2C230', ev: 'rainy' },
  ev_suika:     { slot: 'suit', name: 'スイカの着ぐるみ',     rar: 'N',  color: '#3E9E4A', body: '#E84B4B', ev: 'summer' },
  ev_aloha:     { slot: 'suit', name: 'アロハシャツ',         rar: 'N',  color: '#2FA7C8', body: '#2FA7C8', ev: 'summer' },
  ev_yukata:    { slot: 'suit', name: '浴衣',                 rar: 'R',  color: '#2C4F9E', body: '#2C4F9E', ev: 'summer' },
  ev_shark:     { slot: 'suit', name: 'サメの着ぐるみ',       rar: 'SR', color: '#5E8FB8', body: '#5E8FB8', ev: 'summer' },
  ev_pumpkin:   { slot: 'suit', name: 'かぼちゃの着ぐるみ',   rar: 'N',  color: '#F0882A', body: '#F0882A', ev: 'halloween' },
  ev_ghost:     { slot: 'suit', name: 'おばけ',               rar: 'N',  color: '#F7F4FF', body: '#F7F4FF', ev: 'halloween' },
  ev_mummy:     { slot: 'suit', name: 'ミイラ',               rar: 'R',  color: '#EFE6CF', body: '#EFE6CF', ev: 'halloween' },
  ev_dracula:   { slot: 'suit', name: 'ドラキュラ伯爵',       rar: 'SR', color: '#2A1F35', body: '#2A1F35', ev: 'halloween' },
  ev_reindeer:  { slot: 'suit', name: 'トナカイ',             rar: 'N',  color: '#A8693E', body: '#A8693E', ev: 'xmas' },
  ev_snowman:   { slot: 'suit', name: 'ゆきだるま',           rar: 'N',  color: '#FFFFFF', body: '#FFFFFF', ev: 'xmas' },
  ev_xtree:     { slot: 'suit', name: 'クリスマスツリー',     rar: 'R',  color: '#2E8B4E', body: '#2E8B4E', ev: 'xmas' },
  ev_snowqueen: { slot: 'suit', name: 'スノークイーン',       rar: 'SR', color: '#9FD3F2', body: '#DDF0FB', ev: 'xmas' },
  ev_kagami:    { slot: 'suit', name: '鏡もちの着ぐるみ',     rar: 'N',  color: '#FBF7EE', body: '#FBF7EE', ev: 'newyear' },
  ev_sheep:     { slot: 'suit', name: 'ひつじの着ぐるみ',     rar: 'N',  color: '#FFF8EC', body: '#FFF8EC', ev: 'newyear' },
  ev_furisode:  { slot: 'suit', name: '振袖',                 rar: 'R',  color: '#D9334A', body: '#D9334A', ev: 'newyear' },
  ev_shishi:    { slot: 'suit', name: '獅子舞',               rar: 'SR', color: '#C8302B', body: '#3E9A56', ev: 'newyear' }
};
const SLOT_NAME = { suit: 'コスチューム', head: '頭', top: '服', hand: '手' };

// 猫の種類（はじめに選ぶ・せっていで変えられる）
// 絵は ○○-body.webp / -tail.webp / -shirt.webp / -gloves.webp（高さ813の透過画像、4枚とも同じ大きさ。v9.3 で PNG→WebP。新しい猫を足すときは透過PNGを WebP（品質85）にする）
//   w,h  : 絵の大きさ    x : 横の位置あわせ（600幅の枠の中で、頭の真ん中がそろうようにずらす量）
//   pivot: しっぽを振る中心    head: 頭の中心と半径（頭の着せかえの位置）    hands: ダンベルを持つ位置
//   zones: タップの当たり判定 [部位, 中心x, 中心y, 半径x, 半径y]（上から順に優先）
const CATS = {
  tabby: {
    name: '茶トラ', desc: '元気いっぱいの茶トラ', w: 600, h: 813, x: 0,
    fit: { neck: [272, 326], hem: [297, 512], hw: 176, cw: 130 },
    pivot: [487, 506], head: [241, 157, 186], hands: [[81, 325], [447, 254]],
    zones: [['tail', 541, 482, 62, 73], ['ear', 103, 68, 46, 49], ['ear', 344, 46, 46, 49],
      ['hand', 81, 319, 84, 89], ['hand', 447, 254, 79, 76], ['head', 238, 162, 187, 127],
      ['foot', 108, 750, 92, 62], ['foot', 466, 750, 87, 62], ['belly', 298, 412, 168, 97], ['pants', 314, 596, 217, 87]]
  },
  white: {
    name: '白猫', desc: 'まっしろでおっとり', w: 581, h: 813, x: -13,
    fit: { neck: [268, 358], hem: [285, 526], hw: 168, cw: 125 },
    pivot: [488, 556], head: [254, 170, 178], hands: [[86, 339], [441, 298]],
    zones: [['tail', 524, 569, 56, 66], ['ear', 102, 87, 46, 49], ['ear', 341, 58, 46, 49],
      ['hand', 86, 339, 84, 76], ['hand', 441, 298, 87, 80], ['head', 254, 189, 180, 135],
      ['foot', 102, 755, 90, 58], ['foot', 479, 755, 80, 58], ['belly', 290, 410, 165, 95], ['pants', 290, 600, 215, 85]]
  },
  longwhite: {
    name: '白い長毛猫', desc: 'ふわふわのしっぽ自慢', w: 722, h: 813, x: -28,
    fit: { neck: [305, 376], hem: [312, 532], hw: 188, cw: 140 },
    pivot: [534, 571], head: [269, 168, 185], hands: [[108, 343], [510, 278]],
    zones: [['tail', 640, 590, 80, 125], ['ear', 116, 87, 46, 49], ['ear', 370, 58, 46, 49],
      ['hand', 108, 343, 81, 75], ['hand', 510, 278, 72, 78], ['head', 269, 200, 190, 150],
      ['foot', 123, 762, 90, 55], ['foot', 472, 762, 85, 55], ['belly', 308, 410, 170, 100], ['pants', 300, 600, 215, 85]]
  },
  grey: {
    name: '灰色の長毛猫', desc: 'クールなボクサー', w: 580, h: 813, x: 9,
    fit: { neck: [250, 330], hem: [280, 516], hw: 178, cw: 135 },
    pivot: [478, 474], head: [232, 165, 170], hands: [[87, 323], [445, 267]],
    zones: [['tail', 522, 411, 55, 95], ['ear', 65, 58, 45, 48], ['ear', 298, 44, 45, 48],
      ['hand', 87, 323, 70, 78], ['hand', 445, 267, 75, 90], ['head', 232, 170, 170, 130],
      ['foot', 87, 762, 85, 55], ['foot', 407, 768, 85, 55], ['belly', 283, 400, 170, 100], ['pants', 270, 585, 210, 85]]
  }
};
// v10.4 fit：コスチュームの「体の前」（cat-ev.js の suitFront）の目安。neck＝服のえりの まんなか、hem＝服のすその まんなか、hw＝すその はばの半分、cw＝むねの はばの半分（絵の座標）
const CAT_KEYS = Object.keys(CATS);


// ショップで買える消耗品（コインで購入）
const SHOP_ITEMS = [
  { id: 'drink',   name: 'スタミナドリンク', desc: 'スタミナが30回復',             price: 100 },
  { id: 'protein', name: 'プロテイン',       desc: '次のトレーニングの効果が1.5倍', price: 150 },
  { id: 'goldbag', name: '金のサンドバッグ', desc: 'つぎの3回のトレーニングが2倍', price: 0, shop: false }   // 福袋だけで出る
];

// v10.3 ダイヤ（S.stones）：ずっとミッション・ログボ7日目でもらえる。ショップでコインに交換できる
const STONE = {
  rate: 10,       // ダイヤ この数で
  coins: 100,     //   コイン この数に交換
  login: 5        // ログボ7日目にもらえるダイヤ
};
// ダイヤパック（見本。学校の作品なので実際の購入はできない：押すと「これは見本です」と出るだけ。D27）
const STONE_PACKS = [
  { n: 10,  yen: 120 },
  { n: 60,  yen: 610 },
  { n: 130, yen: 1220 }
];

// ガチャ
const GACHA_COST = 500;          // コイン
const GACHA_RATE = { N: 70, R: 25, SR: 5 };   // %
const GACHA_PITY = 10;          // 天井：この回数のうちに SR が出なければ、この回で SR が確定（SR はまだ持っていないきせかえから先に出る）
// 福袋から出るトレーニングアイテム（きせかえと同じ確率の箱に入る）
const GACHA_ITEMS = {
  N:  [{ id: 'drink', n: 2 }, { id: 'protein', n: 1 }],
  R:  [{ id: 'protein', n: 2 }, { id: 'drink', n: 3 }],
  SR: [{ id: 'goldbag', n: 1 }]
};
// ホームのイベントバナー（go: 'gacha' でガチャへ）
const EVENT = { tag: '福袋', title: 'トレーニング<br>アイテム入り！', go: 'gacha' };
const DUP_REFUND = 100;          // かぶったらコインに交換

// ===== v10.4 イベント =====
// EVENT_MODE：'all'＝6つ ぜんぶ同時に開く（テスト用。イベントページの上で えらぶ）／'rotate'＝1日1つ、下の順番で 0時に かわる（D38）
const EVENT_MODE = 'all';
const EVENT_BASE = '2026-11-19';   // rotate のとき、この日が EVENTS の1つめ（ここから日数 ÷ イベントの数 の あまりで決まる）
// 絵・曲のファイルは id から決まる：ev-{id}-gacha.webp（ガチャの絵）・-home.webp（ホームの背景）・-banner.webp（タイトルの字）・-bag.webp（ホームのボタン）・-bgm.mp3
// v10.4.1：rec＝ミニゲームの「目標の記録」（unit＝数のあとの字、goal＝目標の数。0 なら 目標は出さない）・modes＝むずかしさ（1つめが ふつう。2つめからは 点・記録を 別に保存）
// bags＝ガチャの絵の4つの福袋の場所（絵の幅・高さに対する %：左・上・幅・高さ）。on: false にすると そのイベントは出ない
const EVENTS = [
  { id: 'school',    name: '新学年',     gacha: '新学年ガチャ',       game: 'ねこの通学路',     gameDesc: '遅刻しないように、学校までの道を えらぼう', icon: '🌸', color: '#F48FB1', color2: '#FFE3EE', on: true,
    rec: { unit: '/3 とうちゃく', goal: 0 },
    bagNames: ['新学年の福袋', '入学の福袋', '進級の福袋', '卒業の福袋'], bags: [[4.4, 53, 22.3, 25], [27.5, 53, 21.1, 25], [51, 53, 21, 25], [73, 53, 22, 25]],
    wears: ['ev_gakuran', 'ev_sailor', 'ev_randoseru', 'ev_hakama'] },
  { id: 'rainy',     name: '梅雨',       gacha: '梅雨イベントガチャ', game: 'カエルぴょん',     gameDesc: 'おして ためて、はなして ジャンプ！ はっぱを わたろう', icon: '☔', color: '#7C8CE0', color2: '#E3E8FF', on: true,
    rec: { unit: 'かい ジャンプ', goal: 20 }, modes: [{ id: 'normal', name: 'ふつう', desc: 'とどく場所の 線が 見える' }, { id: 'hard', name: '上級', desc: '線なし・点が ×1.5' }],
    bagNames: ['あじさいの福袋', 'てるてるの福袋', 'カエルの福袋', 'にじの福袋'], bags: [[8, 51, 20.9, 30], [30.3, 51, 20.1, 30], [52.6, 51, 19.4, 30], [74.5, 51, 20.1, 30]],
    wears: ['ev_teru', 'ev_snail', 'ev_ajisai', 'ev_raijin'] },
  { id: 'summer',    name: 'サマー',     gacha: 'スイカガチャ',       game: '金魚すくい',       gameDesc: 'ポイが やぶれる前に 金魚を すくおう', icon: '🍉', color: '#2FA7C8', color2: '#DDF4FA', on: true,
    rec: { unit: 'ひき', goal: 10 },
    bagNames: ['緑のスイカ', '黄色のスイカ', '赤のスイカ', '黒のスイカ'], bags: [[8.8, 55, 19.1, 22.5], [29.5, 55, 19.1, 22.5], [50.2, 55, 18.8, 22.5], [71, 55, 19, 22.5]],
    wears: ['ev_suika', 'ev_aloha', 'ev_yukata', 'ev_shark'] },
  { id: 'halloween', name: 'ハロウィン', gacha: 'ハロウィンガチャ',   game: 'お菓子泥棒',       gameDesc: 'おばけを よけて、おかしを あつめよう', icon: '🎃', color: '#8A4FD0', color2: '#F0E4FF', on: true,
    rec: { unit: 'コンボ', goal: 0 },
    bagNames: ['むらさきリボンのかぼちゃ', 'しまリボンのかぼちゃ', 'ほしリボンのかぼちゃ', 'くろリボンのかぼちゃ'], bags: [[4.4, 57.5, 23, 21.5], [28, 57.5, 22, 21.5], [50.2, 57.5, 22, 21.5], [72.6, 57.5, 23.4, 21.5]],
    wears: ['ev_pumpkin', 'ev_ghost', 'ev_mummy', 'ev_dracula'] },
  { id: 'xmas',      name: 'クリスマス', gacha: 'クリスマスガチャ',   game: 'サンタのそり',     gameDesc: 'そりで 夜空を とんで、えんとつに プレゼント！', icon: '🎄', color: '#2E8B4E', color2: '#E2F4E6', on: true,
    rec: { unit: 'けん 配達', goal: 10 },
    bagNames: ['緑のプレゼント', '黄色のプレゼント', '赤のオーナメント', '黒のオーナメント'], bags: [[9.3, 56.5, 18.5, 21], [29.8, 56.5, 19, 21], [50.3, 56.5, 19, 21], [70.8, 56.5, 19, 21]],
    wears: ['ev_reindeer', 'ev_snowman', 'ev_xtree', 'ev_snowqueen'] },
  { id: 'newyear',   name: 'お正月',     gacha: 'お正月ガチャ',       game: '鏡餅タワー',       gameDesc: 'おもちを まっすぐ たかく つみあげよう', icon: '🎍', color: '#D9334A', color2: '#FFE7DF', on: true,
    rec: { unit: 'だん', goal: 10 },
    bagNames: ['福の福袋', '麻の福袋', '幸の福袋', '財の福袋'], bags: [[8.3, 48, 20, 24], [30.8, 48, 20, 24], [52, 48, 20, 24], [74, 48, 19.7, 24]],
    wears: ['ev_kagami', 'ev_sheep', 'ev_furisode', 'ev_shishi'] }
];
const EV_GACHA_COST = 500;     // イベントガチャ1回のコイン（いつも まだ持っていない きせかえが出る。4つ そろうと引けない）
// いつもの福袋の絵（shop-bg.webp）の4つの福袋の場所（%）
const BAGS_NORMAL = [[6.2, 47, 22, 31], [29.3, 47, 21, 31], [52.2, 47, 21, 31], [74.4, 47, 21.4, 31]];
// イベントのミニゲーム：6つ ぜんぶ あわせて1日 plays 回まで コインがもらえる（1回 max まで）。はじめてクリアすると clear コイン（ゲームごとに1回）
const EV_GAME = { plays: 3, max: 100, clear: 200 };

// ジムのトレーニング（cost=使うスタミナ）
// stat: pow=ちから / spd=すばやさ / sta=たいりょく
const TRAININGS = [
  { id: 'bag',    name: 'サンドバッグ連打',   cost: 15, stat: 'sta', gain: [3, 6], exp: 15, coin: 10, label: 'たいりょくUP・コイン' },
  { id: 'tread',  name: 'トレッドミル',       cost: 20, stat: 'spd', gain: [4, 7], exp: 20, coin: 0,  label: 'すばやさUP' },
  { id: 'weight', name: 'ウェイトトレーニング', cost: 25, stat: 'pow', gain: [5, 9], exp: 25, coin: 0,  label: 'ちからUP' }
];
const STAT_NAME = { pow: 'ちから', spd: 'すばやさ', sta: 'たいりょく' };
// v10.1 レベルアップ：1つ上がるごとに coin コイン。every レベルごとに 称号と ごほうび（アイテムとコイン）
// rewards にないレベル（20・25…）は、いちばん近い下のレベル（15）と同じごほうび。称号は、そのレベル以上でいちばん上のもの
const LEVEL_UP = {
  coin: 50,
  every: 5,
  titles: { 0: 'みならい', 5: 'かけだしファイター', 10: 'ジムのエース', 15: 'まちのチャンピオン', 20: 'でんせつの猫', 30: 'ねこの神さま' },
  rewards: {
    5:  { coins: 100, items: { drink: 2 } },
    10: { coins: 200, items: { protein: 2 } },
    15: { coins: 300, items: { goldbag: 1 } }
  }
};

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
  expPerMeal: 10,
  // v9.9 1日の締め
  closeHour: 12,           // きのうの記録は、今日のこの時刻（時）まで足したり直したりできる。過ぎたら自動で締める
  partialMinMain: 2,       // 朝・昼・夜のうち、この数より少ない記録で、目標より少ない日は「記録が少ない日」
  partialCap: 5            //   「記録が少ない日」は、やせる方向の変化をこの数までにする（食べすぎはそのまま）
};

// v9.9 連続記録（ごはんを1回でも記録した日が続くと増える）。締めたときにコインがもらえる
const STREAK = {
  perDay: 20,                                   // 記録した日 1日ごと
  bonus: { 3: 50, 7: 100, 14: 150, 30: 300 },   // 連続○日のボーナス（30日のあとは 30日ごとに 30 のボーナス）
  passPerWeek: 1                                // 記録しなかった日をとぎれさせない「おやすみ券」（1週間＝月〜日に何枚）
};

// v9.9 ねこ病院（骸骨・爆発になったら、やり直しではなく入院）
const HOSPITAL = {
  days: 3,          // 入院の日数（この日数がたつと退院）
  goodDays: 2,      // バランスのいい日（目標±100kcal・朝昼夜のうち2回以上記録）がこの数になったら早めに退院
  mood: 20,         // 入院したときの ごきげん
  coinRate: 0.1,    // 入院費：もっているコインのこの割合
  coinMax: 200,     //   いちばん多くて この数まで
  admitIdx: 70,     // 入院したときの体型（爆発なら +70、骸骨なら −70）
  leaveIdx: 35      // 退院するときの体型（これより外側なら、ここまでもどす）
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
const LOGIN_REWARDS = [80, 90, 100, 110, 120, 130, 300];   // v9.0：1〜6日目を +30（少しだけ遊ぶ人もためやすく）

// 毎日のミッション（check は今日のデータから達成数を数える）
// v9.0：かんたんな3つ（ごはん1回・トレーニング・ミニゲーム）の報酬を上げた
const MISSIONS = [
  { id: 'photo1',  name: 'ごはんを1回記録する', goal: 1, reward: 50, check: d => d.meals.length },
  { id: 'meal3',   name: '朝・昼・夜を記録する', goal: 3, reward: 50, check: d => new Set(d.meals.map(m => m.slot).filter(s => s !== 'snack')).size },
  { id: 'train1',  name: 'ジムでトレーニングする', goal: 1, reward: 50, check: d => d.trains || 0 },
  { id: 'mini1',   name: 'ミニゲームをあそぶ',   goal: 1, reward: 40, check: d => d.minis || 0 },
  { id: 'steps2k', name: 'さんぽで2,000歩あるく', goal: 2000, reward: 50, check: d => d.steps || 0 },
  { id: 'treasure3', name: 'さんぽでお宝を3つ拾う', goal: 3, reward: 50, check: d => d.treasures || 0 }
];

// v10.3 ずっとミッション（実績）。goals＝段階ごとの目標、rw＝段階ごとのごほうび（coins / items / wear / title）、stones＝段階ごとのダイヤ
//   能力（ちから・すばやさ・たいりょく）は上げない（対戦のバランスのため。D26）。数は S.tally（achieve.js の achValue）
const ACHIEVE = [
  { id: 'meals',     icon: '🍚', name: 'ごはんを記録する',       unit: '回', goals: [30, 100, 300], stones: [5, 10, 20], rw: [{ coins: 200 }, { wear: 'tee_diary' }, { title: 'ごはん記録の達人' }] },
  { id: 'photos',    icon: '📷', name: '写真つきで記録する',     unit: '回', goals: [10, 50],       stones: [5, 10],     rw: [{ coins: 100 }, { coins: 300 }] },
  { id: 'walk',      icon: '🐾', name: 'さんぽで歩く（合計）',   unit: 'km', goals: [10, 50, 100],  stones: [5, 10, 20], rw: [{ coins: 100 }, { coins: 300 }, { items: { goldbag: 1 } }] },
  { id: 'treasures', icon: '🎁', name: 'さんぽでお宝を拾う',     unit: '個', goals: [10, 50],       stones: [5, 10],     rw: [{ coins: 100 }, { coins: 300 }] },
  { id: 'trains',    icon: '💪', name: 'ジムでトレーニングする', unit: '回', goals: [30, 100],      stones: [5, 10],     rw: [{ items: { protein: 2 } }, { items: { protein: 5 } }] },
  { id: 'minis',     icon: '🎮', name: 'ミニゲームであそぶ',     unit: '回', goals: [20, 100],      stones: [5, 10],     rw: [{ coins: 100 }, { coins: 300 }] },
  { id: 'zukan',     icon: '👕', name: 'きせかえ図鑑を集める',   unit: '件', goals: [10, 25, 50],   stones: [5, 10, 20], rw: [{ coins: 100 }, { coins: 300 }, { title: 'きせかえコレクター' }] },
  { id: 'streak',    icon: '🔥', name: '連続記録（いちばん長く）', unit: '日', goals: [7, 30],      stones: [5, 20],     rw: [{ wear: 'gloves_paw' }, { title: '毎日コツコツねこ' }] },
  { id: 'wins',      icon: '⚔️', name: '対戦で勝つ',             unit: '回', goals: [10, 50],       stones: [5, 20],     rw: [{ coins: 200 }, { title: 'バトルチャンピオン' }] }
];
// v10.3 おもいで（ねこ → おもいで）。t＝題、s＝日記（3つから1つ。{cat}＝猫の名前、{v}＝レベル）
// 写真は残さない（D24）。そのときの猫（種類・体型・きせかえ・レベル）は achieve.js の memoAdd が残す
const MEMO = {
  meal1:     { icon: '🍚', t: 'はじめてのごはん', s: ['きょう はじめて ごはんを記録してもらったにゃ。これから よろしくにゃ！', 'はじめての記録の日。どんなごはんか ドキドキしたにゃ', 'ごはんの記録、いっしょに見たにゃ。毎日つづけるにゃ！'] },
  walk1k:    { icon: '🐾', t: 'はじめての1,000歩', s: ['いっしょに 1,000歩 あるいたにゃ。風がきもちよかったにゃ', 'はじめてのさんぽで 1,000歩！ 足がぽかぽかするにゃ', '1,000歩 あるいたら、まちが ちょっと広く見えたにゃ'] },
  treasure1: { icon: '🎁', t: 'はじめてのお宝', s: ['さんぽの とちゅうで お宝を見つけたにゃ！ 中身は ないしょにゃ', '肉球の宝箱、ほんとうに あったにゃ！ また さがしに行くにゃ', 'はじめてのお宝。地図を見ながら がんばって あるいたにゃ'] },
  lv:        { icon: '🎖', t: 'Lv.{v} になった', s: ['Lv.{v} になったにゃ！ ジムで がんばった かいがあったにゃ', 'Lv.{v}！ ちょっとだけ つよくなった気がするにゃ', 'きょうで Lv.{v}。つぎの目標に むかって がんばるにゃ'] },
  sr1:       { icon: '✨', t: 'はじめての SR', s: ['福袋から SR が出たにゃ！ キラキラして まぶしかったにゃ', 'はじめての SR！ 似合ってるか 見てほしいにゃ', 'SR が出た日は、しっぽが ずっと ゆれてたにゃ'] },
  zukan25:   { icon: '👕', t: 'きせかえ 25こ', s: ['きせかえが 25こ になったにゃ。クローゼットが にぎやかにゃ', '図鑑の半分まで あつまったにゃ！ どれを着るか まよっちゃうにゃ', 'きせかえ 25こ。毎日 ファッションショーができるにゃ'] },
  zukan50:   { icon: '🏆', t: '図鑑コンプリート', s: ['きせかえを ぜんぶ あつめたにゃ！ 図鑑コンプリートにゃ！', '50こ ぜんぶ そろったにゃ。いちばんの お気に入りは ないしょにゃ', '図鑑が ぜんぶ うまったにゃ。いっしょに がんばってくれて ありがとにゃ'] },
  streak7:   { icon: '🔥', t: '7日連続の記録', s: ['7日つづけて ごはんを記録できたにゃ！ えらいにゃ', '1週間 毎日 記録したにゃ。いい習慣が できてきたにゃ', '7日連続！ からだの調子も いい感じにゃ'] },
  streak30:  { icon: '🌟', t: '30日連続の記録', s: ['30日 つづけて記録できたにゃ！ もう 記録の名人にゃ', '1か月 毎日 いっしょだったにゃ。これからも よろしくにゃ', '30日連続！ こんなに つづくなんて すごいにゃ'] },
  leave:     { icon: '🏥', t: '退院した日', s: ['病院から 帰ってきたにゃ。おうちが いちばんにゃ', '退院できたにゃ！ これからは バランスよく食べるにゃ', 'お見舞い ありがとにゃ。元気になって もどったにゃ'] },
  win1:      { icon: '⚔️', t: 'はじめての勝利', s: ['対戦で はじめて勝ったにゃ！ ねこパンチが きまったにゃ', 'はじめての勝ち！ ジムでの練習が 役に立ったにゃ', '勝ったにゃ！ きょうは ごほうびに いっぱい なでてほしいにゃ'] },
  // v10.4 イベントで はじめて きせかえを もらった日（イベントごとに1つ）
  ev_school:    { icon: '🌸', t: '新学年のきせかえ', s: ['新学年ガチャで きせかえを もらったにゃ！ ちょっとだけ おにいさんに なった気分にゃ', 'さくらの季節の きせかえにゃ。教室の においがするにゃ', 'あたらしい学年の きせかえ！ 通学路を あるいてみたいにゃ'] },
  ev_rainy:     { icon: '☔', t: '梅雨のきせかえ', s: ['梅雨イベントで きせかえを もらったにゃ。雨の日も たのしくなりそうにゃ', 'あじさいの色の きせかえにゃ。カエルさんと おそろいにゃ', '雨の音を ききながら 着がえたにゃ。ぽつぽつ リズムが すきにゃ'] },
  ev_summer:    { icon: '🍉', t: 'サマーのきせかえ', s: ['スイカガチャで きせかえを もらったにゃ！ 夏まつりに 行きたいにゃ', 'なつの きせかえにゃ。海の においが するにゃ', 'スイカを わったら きせかえが 出てきたにゃ…ってのは じょうだんにゃ'] },
  ev_halloween: { icon: '🎃', t: 'ハロウィンのきせかえ', s: ['ハロウィンの きせかえを もらったにゃ！ トリック・オア・トリートにゃ', 'かぼちゃの においが するきせかえにゃ。おばけに なった気分にゃ', 'この すがたで おかしを もらいに行くにゃ。いたずらも ちょっとだけ…にゃ'] },
  ev_xmas:      { icon: '🎄', t: 'クリスマスのきせかえ', s: ['クリスマスの きせかえを もらったにゃ！ サンタさん ありがとにゃ', 'ゆきの夜の きせかえにゃ。ほっぺが あったかいにゃ', 'プレゼントを あけたら きせかえだったにゃ。いちばん うれしい プレゼントにゃ'] },
  ev_newyear:   { icon: '🎍', t: 'お正月のきせかえ', s: ['お正月の きせかえを もらったにゃ！ ことしも よろしくにゃ', 'おめでたい きせかえにゃ。おもちを たくさん 食べたく…いや、ほどほどにゃ', 'はつもうでに 着ていくにゃ。いい1年に なりますようににゃ'] },
};

// はじめてガイド（v9.1）：1回だけのミッション。ホームのバナーから開く
//   check(S, hits)：hits は「さんぽを開いた」などの記録（S.guide.hits）
const GUIDE = {
  reward: 50,      // 1つクリアでもらえるコイン
  bonus: 200,      // ぜんぶクリアのボーナス
  tasks: [
    { id: 'meal',  name: 'ごはんを記録する',       how: 'ホームのカメラのボタン',       check: (s, h) => Object.values(s.days).some(d => (d.meals || []).length > 0) },
    { id: 'train', name: 'ジムでトレーニングする', how: 'あそぶ → ジム',                check: (s, h) => Object.values(s.days).some(d => d.trains > 0) },
    { id: 'mini',  name: 'ミニゲームをあそぶ',     how: 'あそぶ → ミニゲーム',          check: (s, h) => Object.values(s.days).some(d => d.minis > 0) },
    { id: 'walk',  name: 'さんぽを開いてみる',     how: 'ホームの歩数のカード',         check: (s, h) => h.includes('walk') },
    { id: 'gacha', name: '福袋を引く',             how: 'ショップ → ガチャ',            check: (s, h) => h.includes('gacha') },
    { id: 'wear',  name: 'きせかえで着がえる',     how: 'ねこ → きせかえ',              check: (s, h) => h.includes('wear') }
  ]
};
// ホームの案内（v9.1）：上から順に、sel の場所を照らして猫が説明する。{cat} は猫の名前
const TOUR = [
  { sel: ['#bodyPill'],               text: 'これが{cat}の体型だニャ。目標カロリーに近いごはんだと元気、食べすぎると太って、少なすぎるとやせちゃうニャ。' },
  { sel: ['#btnCamera'],              text: 'ごはんはここで記録するニャ。写真をとるとAIがカロリーを調べてくれて、スタミナも回復するニャ。' },
  { sel: ['#stamMeter', '#moodMeter'], text: 'スタミナはジムのトレーニングで使うニャ。ごきげんは{cat}をなでたり、ごはんを記録すると上がるニャ。' },
  { sel: ['#pillSteps'],              text: 'ここからさんぽに行けるニャ。歩くとコインとスタミナがもらえて、地図のお宝も拾えるニャ。' },
  { sel: ['#btnLogin', '#btnMission'], text: '毎日のログインボーナスとミッションはここ。コインのもらい忘れに気をつけてニャ。' },
  { sel: ['.tabbar'],                 text: 'あそぶ には ジム・ミニゲーム・対戦、ねこ には きせかえ、ショップ には福袋があるニャ。せっていは 右上の ⚙ ニャ。' },
  { sel: ['#eventBanner'],            text: 'さいごに「はじめてガイド」をやってみてニャ！ クリアするとコインがもらえるニャ。' }
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
  // v10.2：能力が高くなるほど のびがゆるやかになる曲線（v ÷ (v + curveK)）。能力 20〜60 は前とほぼ同じ、100 をこえると差がつきにくい
  curveK: 60,                    // 曲線のゆるやかさ（大きいほど まっすぐに近い）
  hpBase: 50, hpAdd: 240,        // たいりょく(HP) = 50 + 240 × スタミナ÷(スタミナ+60)（20→110、60→170、150→221）
  powBase: 0.5, powAdd: 4,       // ダメージ倍率 = 0.5 + 4 × ちから÷(ちから+60)（20→1.5、60→2.5、150→3.36）
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
