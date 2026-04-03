/* ═══════════════════════════════════
   Константы
═══════════════════════════════════ */
const WINS = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
];
const LS_SCORES  = 'ttt_scores';
const LS_HISTORY = 'ttt_history';

/* ═══════════════════════════════════
   Состояние
═══════════════════════════════════ */
let board, current, gameOver, mode, scores, history, moveCount;
let prevBoard = Array(9).fill(null);

/* ═══════════════════════════════════
   локальное хранилище
═══════════════════════════════════ */
function loadStorage() {
    try { scores  = JSON.parse(localStorage.getItem(LS_SCORES))  || { X:0, O:0, D:0 }; }
    catch { scores = { X:0, O:0, D:0 }; }

    try { history = JSON.parse(localStorage.getItem(LS_HISTORY)) || []; }
    catch { history = []; }
}

function saveStorage() {
    localStorage.setItem(LS_SCORES,  JSON.stringify(scores));
    localStorage.setItem(LS_HISTORY, JSON.stringify(history));
}

/* ═══════════════════════════════════
   Инициализация
═══════════════════════════════════ */
function init() {
    loadStorage();
    mode      = 'ai';
    board     = Array(9).fill(null);
    prevBoard = Array(9).fill(null);
    current   = 'X';
    gameOver  = false;
    moveCount = 0;
    updateScore();
    renderHistory();
    buildBoard();
}

function setMode(m) {
    mode = m;
    document.getElementById('btn2p').className = 'mode-btn' + (m === '2p' ? ' active' : '');
    document.getElementById('btnAI').className = 'mode-btn' + (m === 'ai'  ? ' active' : '');
    document.getElementById('o-label').textContent = m === 'ai' ? '🤖 ИИ (O)' : '○ Игрок O';
    newGame();
}

function newGame() {
    board     = Array(9).fill(null);
    prevBoard = Array(9).fill(null);
    current   = 'X';
    gameOver  = false;
    moveCount = 0;
    document.getElementById('status').textContent = 'Ход: X';
    buildBoard();
}

function resetAll() {
    scores  = { X:0, O:0, D:0 };
    history = [];
    saveStorage();
    updateScore();
    renderHistory();
    newGame();
}

/* ═══════════════════════════════════
   Логика хода
═══════════════════════════════════ */
function move(i) {
    if (board[i] || gameOver) return;
    board[i] = current;
    moveCount++;
    renderCell(i, true);

    const w = checkWin(board);
    if (w) {
        gameOver = true;
        scores[current]++;

        const name = current === 'X'
            ? '✕ Игрок X'
            : (mode === 'ai' ? '🤖 ИИ' : '○ Игрок O');

        document.getElementById('status').innerHTML =
            `<span class="winner-msg">${name} побеждает!</span>`;

        highlightWin();
        launchConfetti(current);
        addHistory(current === 'X' ? 'win-x' : 'win-o', name, moveCount);
        updateScore();
        saveStorage();
        updateTurnHighlight();
        return;
    }

    if (board.every(v => v)) {
        gameOver = true;
        scores.D++;
        document.getElementById('status').textContent = 'Ничья!';
        addHistory('draw', 'Ничья', moveCount);
        updateScore();
        saveStorage();
        updateTurnHighlight();
        return;
    }

    current = current === 'X' ? 'O' : 'X';
    document.getElementById('status').textContent =
        `Ход: ${current === 'X' ? '✕ X' : '○ O'}`;
    updateTurnHighlight();

    if (mode === 'ai' && current === 'O' && !gameOver)
        setTimeout(aiMove, 350);
}

/* ═══════════════════════════════════
   ИИ — minimax
═══════════════════════════════════ */
function aiMove() {
    const best = minimax(board, 'O');
    move(best.idx);
}

function minimax(b, player, depth = 0) {
    const w = checkWin(b);
    if (w === 'O') return { score: 10 - depth };
    if (w === 'X') return { score: depth - 10 };
    const empty = b.map((v,i) => v ? null : i).filter(v => v !== null);
    if (!empty.length) return { score: 0 };
    const results = empty.map(i => {
        const nb = [...b]; nb[i] = player;
        const r = minimax(nb, player === 'O' ? 'X' : 'O', depth + 1);
        return { idx: i, score: r.score };
    });
    return player === 'O'
        ? results.reduce((a,b) => b.score > a.score ? b : a)
        : results.reduce((a,b) => b.score < a.score ? b : a);
}

/* ═══════════════════════════════════
   Вспомогательные
═══════════════════════════════════ */
function checkWin(b) {
    for (const [a,c,d] of WINS)
        if (b[a] && b[a] === b[c] && b[c] === b[d]) return b[a];
    return null;
}
function getWinCombo() {
    for (const combo of WINS) {
        const [a,c,d] = combo;
        if (board[a] && board[a] === board[c] && board[c] === board[d]) return combo;
    }
    return null;
}

/* ═══════════════════════════════════
   Рендер доски
═══════════════════════════════════ */
function buildBoard() {
    const container = document.getElementById('board');
    container.innerHTML = '';
    board.forEach((v, i) => {
        const cell = document.createElement('div');
        cell.id = 'cell-' + i;
        cell.className = 'cell' + (v ? ' taken ' + v.toLowerCase() : '');
        if (v) {
            const span = document.createElement('span');
            span.className = 'cell-symbol';
            span.textContent = v === 'X' ? '✕' : '○';
            cell.appendChild(span);
        }
        if (!v && !gameOver) cell.onclick = () => move(i);
        container.appendChild(cell);
    });
    prevBoard = [...board];
    updateTurnHighlight();
}

function renderCell(i, animate) {
    const v    = board[i];
    const cell = document.getElementById('cell-' + i);
    if (!cell) return;

    cell.className = 'cell taken ' + v.toLowerCase();
    cell.onclick   = null;

    const span = document.createElement('span');
    span.className = animate ? 'cell-symbol' : '';
    span.textContent = v === 'X' ? '✕' : '○';
    cell.innerHTML = '';
    cell.appendChild(span);
    prevBoard[i] = v;
}

function highlightWin() {
    const combo = getWinCombo();
    if (!combo) return;
    combo.forEach(i => {
        const cell = document.getElementById('cell-' + i);
        if (cell) cell.classList.add('win');
    });
}

function updateTurnHighlight() {
    document.getElementById('sc-x').className =
        'score-card sc-x' + (!gameOver && current === 'X' ? ' active-turn' : '');
    document.getElementById('sc-o').className =
        'score-card sc-o' + (!gameOver && current === 'O' ? ' active-turn' : '');
}

function updateScore() {
    document.getElementById('val-x').textContent = scores.X;
    document.getElementById('val-o').textContent = scores.O;
    document.getElementById('val-d').textContent = scores.D;
}

/* ═══════════════════════════════════
   История партий
═══════════════════════════════════ */
function addHistory(type, label, moves) {
    history.unshift({ type, label, moves });
    if (history.length > 20) history.pop();
    renderHistory();
}

function renderHistory() {
    const body = document.getElementById('history-body');
    if (!history.length) {
        body.innerHTML = '<p class="history-empty">Партий ещё не было</p>';
        return;
    }
    const ul = document.createElement('ul');
    ul.className = 'history-list';
    history.forEach((item, idx) => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML =
            `<span class="h-num">${history.length - idx}</span>` +
            `<span class="h-badge ${item.type}">${item.label}</span>` +
            `<span class="h-moves">${item.moves} ход${plural(item.moves)}</span>`;
        ul.appendChild(li);
    });
    body.innerHTML = '';
    body.appendChild(ul);
}

function plural(n) {
    if (n % 10 === 1 && n % 100 !== 11) return '';
    if ([2,3,4].includes(n % 10) && ![12,13,14].includes(n % 100)) return 'а';
    return 'ов';
}

/* ═══════════════════════════════════
   Конфетти (Canvas API)
═══════════════════════════════════ */
let confettiAnim = null;

function launchConfetti(winner) {
    const canvas = document.getElementById('confetti-canvas');
    const ctx    = canvas.getContext('2d');
    const rect   = canvas.parentElement.getBoundingClientRect();
    canvas.width  = rect.width;
    canvas.height = rect.height;

    const fromLeft = winner === 'X';
    const originX  = fromLeft ? 0 : canvas.width;

    const palette = {
        X: ['#534ab7','#7f77dd','#afa9ec','#eeedfe','#ffd700','#fff'],
        O: ['#0f6e56','#1d9e75','#5dcaa5','#e1f5ee','#ffd700','#fff']
    };
    const colors = palette[winner];

    const particles = Array.from({ length: 90 }, () => ({
        x:     originX,
        y:     canvas.height * (0.15 + Math.random() * 0.7),
        vx:    (fromLeft ? 1 : -1) * (4 + Math.random() * 7),
        vy:    -5 + Math.random() * 10,
        ay:    0.2,
        size:  5 + Math.random() * 7,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot:   Math.random() * Math.PI * 2,
        rotV:  (Math.random() - 0.5) * 0.3,
        life:  1,
        decay: 0.011 + Math.random() * 0.009
    }));

    if (confettiAnim) cancelAnimationFrame(confettiAnim);

    (function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;
        for (const p of particles) {
            if (p.life <= 0) continue;
            alive = true;
            p.vy += p.ay;
            p.x  += p.vx;
            p.y  += p.vy;
            p.rot += p.rotV;
            p.life -= p.decay;
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
            ctx.restore();
        }
        if (alive) confettiAnim = requestAnimationFrame(draw);
        else { ctx.clearRect(0, 0, canvas.width, canvas.height); confettiAnim = null; }
    })();
}

/* Запуск */
init();