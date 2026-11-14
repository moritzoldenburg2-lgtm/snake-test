const GRID = 20;
const CELL = 20;
const TICK_MS = 110;

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const nameInput = document.getElementById('name-input');
const startBtn = document.getElementById('start-btn');
const profileBar = document.getElementById('profile-bar');
const playerNameEl = document.getElementById('player-name');
const playerBestEl = document.getElementById('player-best');
const playerGamesEl = document.getElementById('player-games');
const logoutBtn = document.getElementById('logout-btn');
const leaderboardList = document.getElementById('leaderboard-list');

let player = null;
let snake, direction, nextDirection, food, score, timer = null, paused = false, gameOver = false;

function randomCell() {
  return {
    x: Math.floor(Math.random() * GRID),
    y: Math.floor(Math.random() * GRID),
  };
}

function resetGame() {
  snake = [{ x: 10, y: 10 }];
  direction = { x: 1, y: 0 };
  nextDirection = direction;
  food = randomCell();
  score = 0;
  paused = false;
  gameOver = false;
  scoreEl.textContent = '0';
  draw();
}

function startLoop() {
  clearInterval(timer);
  timer = setInterval(tick, TICK_MS);
}

function tick() {
  if (paused || gameOver) return;
  direction = nextDirection;
  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

  const hitWall = head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID;
  const hitSelf = snake.some((s) => s.x === head.x && s.y === head.y);
  if (hitWall || hitSelf) return endGame();

  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    scoreEl.textContent = score;
    food = randomCell();
  } else {
    snake.pop();
  }
  draw();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ff5470';
  ctx.beginPath();
  ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 3, 0, Math.PI * 2);
  ctx.fill();
  snake.forEach((s, i) => {
    ctx.fillStyle = i === 0 ? '#8ef58a' : '#4f7cff';
    ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
  });
}

async function endGame() {
  gameOver = true;
  clearInterval(timer);
  const res = await fetch('/api/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: player.id, score }),
  });
  const data = await res.json();
  player = data;
  updateProfileBar();
  overlayTitle.textContent = 'Game Over';
  overlayText.textContent = data.isNewBest
    ? `Neuer persönlicher Rekord: ${score} Punkte! (Global Platz ${data.rank})`
    : `Score: ${score} · Best: ${data.bestScore} (Global Platz ${data.rank})`;
  startBtn.textContent = 'Nochmal spielen';
  overlay.classList.remove('hidden');
  loadLeaderboard();
}

function updateProfileBar() {
  playerNameEl.textContent = player.name;
  playerBestEl.textContent = player.bestScore;
  playerGamesEl.textContent = player.gamesPlayed;
}

async function loadLeaderboard() {
  const res = await fetch('/api/leaderboard');
  const rows = await res.json();
  leaderboardList.innerHTML = '';
  if (!rows.length) {
    leaderboardList.innerHTML = '<li class="empty">Noch keine Einträge</li>';
    return;
  }
  rows.forEach((p) => {
    const li = document.createElement('li');
    li.textContent = `${p.name} — ${p.bestScore}`;
    if (player && p.id === player.id) li.classList.add('you');
    leaderboardList.appendChild(li);
  });
}

function showLogin() {
  player = null;
  localStorage.removeItem('snakePlayerId');
  profileBar.classList.add('hidden');
  overlayTitle.textContent = 'Willkommen';
  overlayText.textContent = 'Gib deinen Spielernamen ein, um zu spielen.';
  startBtn.textContent = 'Spielen';
  nameInput.value = '';
  overlay.classList.remove('hidden');
  clearInterval(timer);
}

async function login(name) {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) return null;
  player = await res.json();
  localStorage.setItem('snakePlayerId', player.id);
  updateProfileBar();
  profileBar.classList.remove('hidden');
  overlay.classList.add('hidden');
  resetGame();
  startLoop();
  loadLeaderboard();
  return player;
}

startBtn.addEventListener('click', async () => {
  const name = nameInput.value.trim();
  if (!name) {
    nameInput.focus();
    return;
  }
  const p = await login(name);
  if (!p) {
    overlayText.textContent = 'Login fehlgeschlagen, bitte erneut versuchen.';
  }
});

nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') startBtn.click();
});

logoutBtn.addEventListener('click', showLogin);

document.addEventListener('keydown', (e) => {
  if (!player || gameOver) return;
  const dirs = {
    ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 },
  };
  const dir = dirs[e.key];
  if (dir) {
    e.preventDefault();
    if (dir.x !== -direction.x || dir.y !== -direction.y) nextDirection = dir;
  }
  if (e.key === ' ') {
    e.preventDefault();
    paused = !paused;
  }
});

(async function init() {
  const savedId = localStorage.getItem('snakePlayerId');
  if (savedId) {
    const res = await fetch('/api/leaderboard');
    const rows = await res.json();
    const found = rows.find((p) => p.id === savedId);
    if (found) {
      player = found;
      updateProfileBar();
      profileBar.classList.remove('hidden');
      resetGame();
      startLoop();
      loadLeaderboard();
      return;
    }
  }
  showLogin();
  loadLeaderboard();
})();
