// にゃんカロ 保存のしくみ（v10.0）
// データの読み書きは、かならずこの store を通す。いまの保存先はブラウザの localStorage。
// 将来 IndexedDB などに変えるときは、このファイルだけ直せばよい（ほかのファイルは store.read / write / remove しか使わない）
'use strict';

const store = {
  kind: 'localStorage',
  // 読む（なければ null。読めないときも null）
  read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  // 書く（容量オーバーなどで書けないときは例外をそのまま投げる。呼んだ側で写真を消すなどして、もう一度ためす）
  write(k, v) { localStorage.setItem(k, v); },
  // 消す
  remove(k) { try { localStorage.removeItem(k); } catch (e) {} }
};
