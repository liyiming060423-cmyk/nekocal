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
  gloves_gold: { slot: 'hand', name: '金のグローブ',       rar: 'SR', color: '#E9B730', bonus: { pow: 10 } }
};
const SLOT_NAME = { head: '頭', top: '服', hand: '手' };

// ショップで買える消耗品（コインで購入）
const SHOP_ITEMS = [
  { id: 'drink',   name: 'スタミナドリンク', desc: 'スタミナが30回復',             price: 100 },
  { id: 'protein', name: 'プロテイン',       desc: '次のトレーニングの効果が1.5倍', price: 150 }
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
  staminaPerMeal: 15,      // ごはんを1回記録すると回復
  stepsUnit: 1000,         // 何歩ごとに
  staminaPerUnit: 5,       //   スタミナ回復
  coinPerUnit: 10,         //   コイン
  miniPlaysPerDay: 3,      // ミニゲームで報酬がもらえる回数
  expPerMeal: 10
};

// ログインボーナス（7日で1周）
const LOGIN_REWARDS = [50, 60, 70, 80, 90, 100, 300];

// 毎日のミッション（check は今日のデータから達成数を数える）
const MISSIONS = [
  { id: 'photo1',  name: 'ごはんを1回記録する', goal: 1, reward: 30, check: d => d.meals.length },
  { id: 'meal3',   name: '朝・昼・夜を記録する', goal: 3, reward: 50, check: d => new Set(d.meals.map(m => m.slot)).size },
  { id: 'train1',  name: 'ジムでトレーニングする', goal: 1, reward: 30, check: d => d.trains || 0 },
  { id: 'mini1',   name: 'ミニゲームをあそぶ',   goal: 1, reward: 20, check: d => d.minis || 0 },
  { id: 'steps5k', name: '5,000歩あるく',        goal: 5000, reward: 50, check: d => d.steps || 0 }
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
const SLOTS = { morning: '朝', noon: '昼', night: '夜' };
