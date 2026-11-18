// テレビ画面の中で、見出しやメニューを入れ替える領域を取得する。
const stage = document.querySelector('#stage');
// 画面ごとの表示内容を定義する。options と destinations は同じ順番で対応する。
const screens = {
  start: { title: 'Portfolio', options: ['スタート'], destinations: ['menu'] },
  menu: { options: ['自己紹介', 'ポートフォリオ'], destinations: ['profile', 'portfolio'] },
  profile: { title: '自己紹介', page: './profile.html' },
  portfolio: { title: 'ポートフォリオ', page: './portfolio.html' }
};
// 表示中の画面、選択中の項目番号、メニューに戻るときの選択位置を保持する。
let current = 'start';
let selected = 0;
let menuSelection = 0;

// 選択中のボタンの aria-current を true にする。CSS はこの属性を使って選択中の項目を強調する。
function updateSelection() {
  stage.querySelectorAll('.option').forEach((button, index) => {
    button.setAttribute('aria-current', String(index === selected));
  });
}

// 表示中の画面を作り直す。選択肢がある画面にはボタン、詳細画面には本文を表示する。
function render() {
  const screen = screens[current];
  // 前の画面の要素を消してから、新しい画面の内容を追加する。
  stage.replaceChildren();
  // 詳細画面の見出しと本文は、テレビ内のフレームで別HTMLを表示する。
  if (screen.page) {
    const frame = document.createElement('iframe');
    frame.className = 'detail-frame';
    frame.title = screen.title;
    frame.src = screen.page;
    stage.append(frame);
    return;
  }
  if (screen.title) {
    const heading = document.createElement(current === 'start' ? 'h1' : 'h2');
    heading.textContent = screen.title;
    stage.append(heading);
  }
  if (screen.options) {
    const list = document.createElement('div');
    list.className = 'options';
    list.setAttribute('role', 'group');
    list.setAttribute('aria-label', current === 'start' ? 'スタート画面' : 'メニュー');
    screen.options.forEach((label, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'option';
      button.textContent = label;
      // 画面内の項目を直接押した場合も、選択してから決定処理を呼ぶ。
      button.addEventListener('click', () => {
        selected = index;
        advance();
        // 画面の描き直しで押したボタンが消えるため、フォーカスを「進む」ボタンへ移す。
        document.querySelector('#next').focus();
      });
      list.append(button);
    });
    stage.append(list);
    updateSelection();
  }
}

// 十字キーで選択を移動する。step が -1 なら前、1 なら次の項目へ進む。
function move(step) {
  const count = screens[current].options?.length ?? 0;
  if (count < 2) return;
  // 余りを使い、最後から先頭へ、先頭から最後へと循環させる。
  selected = (selected + step + count) % count;
  updateSelection();
  // 画面内のボタンをキーボードで操作中なら、選択先へフォーカスも移す。
  if (stage.contains(document.activeElement)) {
    stage.querySelectorAll('.option')[selected].focus();
  }
}

// 選択中の項目に対応する画面へ進む。詳細画面など、遷移先がない場合は処理を終える。
function advance() {
  const destination = screens[current].destinations?.[selected];
  if (!destination) return;
  // 詳細画面から戻ったときに同じ項目を選べるよう、メニューの選択位置を記憶する。
  if (current === 'menu') menuSelection = selected;
  current = destination;
  selected = 0;
  render();
}

// 詳細画面からはメニューへ、メニューからはスタート画面へ戻る。
function back() {
  if (current === 'start') return;
  current = current === 'menu' ? 'start' : 'menu';
  selected = current === 'menu' ? menuSelection : 0;
  render();
}

// 十字キーの data-step 属性を数値に変換し、前後の移動に使う。
document.querySelectorAll('[data-step]').forEach(button => {
  button.addEventListener('click', () => move(Number(button.dataset.step)));
});
// コントローラーの丸い「→」と「←」に、進む処理と戻る処理を割り当てる。
document.querySelector('#next').addEventListener('click', advance);
document.querySelector('#back').addEventListener('click', back);
// キーボードの矢印キー、Enter、Esc を画面上の操作に対応させる。
const keys = {
  ArrowUp: () => move(-1),
  ArrowLeft: () => move(-1),
  ArrowDown: () => move(1),
  ArrowRight: () => move(1),
  Enter: advance,
  Escape: back
};
window.addEventListener('keydown', event => {
  // 修飾キー付きの操作は、ブラウザなどのショートカットに任せる。
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  // ボタンにフォーカスがあるときは、Enter でそのボタンが押されるブラウザ標準の動作を使う。
  if (event.key === 'Enter' && document.activeElement instanceof HTMLButtonElement) return;
  if (!Object.hasOwn(keys, event.key)) return;
  // 処理するキーの標準動作を止め、矢印キーでページがスクロールするのを防ぐ。
  event.preventDefault();
  // Enter や Esc の長押しで、画面が連続して切り替わるのを防ぐ。
  if (event.repeat && (event.key === 'Enter' || event.key === 'Escape')) return;
  const focusWasInScreen = stage.contains(document.activeElement);
  keys[event.key]();
  // 画面の描き直しでフォーカスが外れたら、選択中の項目または「戻る」ボタンへ移す。
  if (focusWasInScreen && document.activeElement === document.body) {
    const target = stage.querySelector('[aria-current="true"]') ?? document.querySelector('#back');
    target.focus();
  }
});
// ページを開いたときに、最初のスタート画面を表示する。
render();

// 詳細HTMLの中で Esc を押した場合も、テレビ側のメニューに戻る。
window.addEventListener('message', event => {
  const frame = stage.querySelector('.detail-frame');
  if (!frame || event.source !== frame.contentWindow || event.data !== 'portfolio:back') return;
  back();
  document.querySelector('#back').focus();
});
