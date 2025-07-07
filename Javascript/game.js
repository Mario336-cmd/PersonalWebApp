const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

const startScreen    = document.getElementById('start-screen');
const shipScreen     = document.getElementById('ship-screen');
const diffScreen     = document.getElementById('difficulty-screen');
const gameoverScreen = document.getElementById('gameover-screen');

const startBtn      = document.getElementById('start-button');
const selectShipBtn = document.getElementById('select-ship');
const selectDiffBtn = document.getElementById('select-difficulty');

const chooseAlien  = document.getElementById('choose-triangle');
const chooseRocket = document.getElementById('choose-rocket');
const shipBackBtn  = document.getElementById('ship-back');

const diffBackBtn = document.getElementById('diff-back');
const diffButtons = Array.from(diffScreen.querySelectorAll('button[data-diff]'));

const retryBtn     = document.getElementById('retry-button');
const homeBtn      = document.getElementById('home-button');
const finalScoreEl = document.getElementById('final-score');

const alienEl  = document.getElementById('triangleShip');
const rocketEl = document.getElementById('rocketShip');
const container = document.getElementById('gameContainer');
const navIcon   = document.getElementById('back-link');

const WIDTH  = canvas.width;
const HEIGHT = canvas.height;

let state         = 'start';
let difficulty    = 'Medium';
let spawnRate     = 25;
let blockSpeed    = 400;
let starSpeedBack = 100;
let starSpeedFront= 200;
let score         = 0;
let shipType      = 'alien';

const ship = {
  w: 50, h: 50,
  x: (WIDTH - 30) / 2,
  y: HEIGHT - 230,
  speed: 400
};
const baseY = ship.y;

const keys = {};
let starsBack = [], starsFront = [], blocks = [];
let dragging = false;
let targetX = ship.x;
let targetY = ship.y;

function updateNavIcon() {
  if (window.innerWidth <= 700 && state === 'playing') {
    navIcon.classList.add('hide');
  } else {
    navIcon.classList.remove('hide');
  }
}

function hideAllShips() {
  alienEl.style.display = rocketEl.style.display = 'none';
}

function showStartScreen() {
  state = 'start';
  selectShipBtn.textContent = `Ship: ${shipType === 'alien' ? 'Alien Ship' : 'Rocket'}`;
  selectDiffBtn.textContent = `Difficulty: ${difficulty}`;
  startScreen.style.display    = 'flex';
  shipScreen.style.display     =
  diffScreen.style.display     =
  gameoverScreen.style.display = 'none';
  hideAllShips();
  updateNavIcon();
}

function showShipScreen() {
  state = 'shipSelect';
  shipScreen.style.display     = 'flex';
  startScreen.style.display    =
  diffScreen.style.display     =
  gameoverScreen.style.display = 'none';
  updateNavIcon();
}

function showDiffScreen() {
  state = 'difficulty';
  diffScreen.style.display     = 'flex';
  startScreen.style.display    =
  shipScreen.style.display     =
  gameoverScreen.style.display = 'none';
  updateNavIcon();
}

function showGameOverScreen() {
  state = 'gameover';
  gameoverScreen.style.display = 'flex';
  startScreen.style.display    =
  shipScreen.style.display     =
  diffScreen.style.display     = 'none';
  finalScoreEl.textContent     = `Total Points: ${score}`;
  hideAllShips();
  updateNavIcon();
}

selectShipBtn.addEventListener('click', showShipScreen);
selectDiffBtn.addEventListener('click', showDiffScreen);
shipBackBtn.addEventListener('click', showStartScreen);
diffBackBtn.addEventListener('click', showStartScreen);

chooseAlien.addEventListener('click', () => {
  shipType = 'alien';
  showStartScreen();
});
chooseRocket.addEventListener('click', () => {
  shipType = 'rocket';
  showStartScreen();
});

diffButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    difficulty = btn.dataset.diff;
    const cfgs = {
      Easy:   [40, 300,  70, 140],
      Medium: [25, 400, 100, 200],
      Hard:   [12, 600, 150, 300],
      Extreme:[7,  800, 250, 500]
    };
    [spawnRate, blockSpeed, starSpeedBack, starSpeedFront] = cfgs[difficulty];
    showStartScreen();
  });
});

startBtn.addEventListener('click', startGame);
retryBtn.addEventListener('click', startGame);
homeBtn.addEventListener('click', showStartScreen);

function createStars(n) {
  return Array.from({ length: n }, () => ({
    x: Math.random() * WIDTH,
    y: Math.random() * HEIGHT
  }));
}

function startGame() {
  state      = 'playing';
  score      = 0;
  ship.x     = (WIDTH - ship.w) / 2;
  ship.y     = baseY;
  targetX    = ship.x;
  targetY    = ship.y;
  blocks     = [];
  starsBack  = createStars(80);
  starsFront = createStars(40);
  startScreen.style.display    =
  shipScreen.style.display     =
  diffScreen.style.display     =
  gameoverScreen.style.display = 'none';
  updateNavIcon();
}

window.addEventListener('keydown', e => { keys[e.key] = true; });
window.addEventListener('keyup',   e => { keys[e.key] = false; });

if (window.innerWidth <= 700) {
  const applyScale = () => {
    const scale = window.innerWidth / WIDTH;
    container.style.transform = `scale(${scale})`;
    updateNavIcon();
  };
  applyScale();
  window.addEventListener('resize', applyScale);

  let dragStartX = 0, dragStartY = 0, startShipX = 0, startShipY = 0;
  const getPos = e => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / WIDTH;
    const scaleY = rect.height / HEIGHT;
    return {
      x: (e.clientX - rect.left) / scaleX,
      y: (e.clientY - rect.top) / scaleY
    };
  };
  const start = e => {
    const p = getPos(e);
    dragStartX = p.x;
    dragStartY = p.y;
    startShipX = ship.x;
    startShipY = ship.y;
    targetX = ship.x;
    targetY = ship.y;
    dragging = true;
    e.preventDefault();
  };
  const move = e => {
    if (!dragging) return;
    const p = getPos(e);
    const dx = p.x - dragStartX;
    const dy = p.y - dragStartY;
    targetX = Math.max(0, Math.min(WIDTH - ship.w, startShipX + dx));
    targetY = Math.max(0, Math.min(baseY, startShipY + dy));
    e.preventDefault();
  };
  const end = () => { dragging = false; };
  canvas.addEventListener('pointerdown', start, { passive: false });
  canvas.addEventListener('pointermove', move, { passive: false });
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
}

function update(dt) {
  if (state !== 'playing') return;
  if (dragging) {
    const dx = targetX - ship.x;
    const dy = targetY - ship.y;
    const dist = Math.hypot(dx, dy);
    const maxD = ship.speed * dt;
    if (dist <= maxD) {
      ship.x = targetX;
      ship.y = targetY;
    } else {
      ship.x += dx / dist * maxD;
      ship.y += dy / dist * maxD;
    }
  } else {
    if ((keys['ArrowLeft'] || keys['a']) && ship.x > 0) ship.x -= ship.speed * dt;
    if ((keys['ArrowRight'] || keys['d']) && ship.x + ship.w < WIDTH) ship.x += ship.speed * dt;
    if ((keys['ArrowUp'] || keys['w']) && ship.y > 0) ship.y -= ship.speed * dt;
    if ((keys['ArrowDown'] || keys['s']) && ship.y < baseY) ship.y += ship.speed * dt;
  }
  starsBack.forEach(s => { s.y += starSpeedBack * dt; if (s.y > HEIGHT) { s.y = 0; s.x = Math.random() * WIDTH; } });
  starsFront.forEach(s => { s.y += starSpeedFront * dt; if (s.y > HEIGHT) { s.y = 0; s.x = Math.random() * WIDTH; } });
  if (Math.random() < dt * 60 / spawnRate) {
    blocks.push({ x: Math.random() * (WIDTH - 20), y: -20, w: 20, h: 20 });
  }
  blocks = blocks.filter(b => {
    b.y += blockSpeed * dt;
    if (b.x < ship.x + ship.w && b.x + b.w > ship.x &&
        b.y < ship.y + ship.h && b.y + b.h > ship.y) {
      showGameOverScreen();
      return false;
    }
    if (b.y > HEIGHT) {
      score++;
      return false;
    }
    return true;
  });
}

function drawText(txt, x, y, font, align = 'center') {
  ctx.fillStyle = '#fff';
  ctx.font       = font;
  ctx.textAlign = align;
  ctx.fillText(txt, x, y);
}

function draw() {
  const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  grad.addColorStop(0, 'rgb(10,10,40)');
  grad.addColorStop(1, 'rgb(0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  if (state === 'playing') {
    ctx.fillStyle = '#444';
    starsBack.forEach(s => ctx.fillRect(s.x, s.y, 2, 2));
    ctx.fillStyle = '#888';
    starsFront.forEach(s => ctx.fillRect(s.x, s.y, 2, 2));
    ctx.fillStyle = '#fff';
    blocks.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));
    hideAllShips();
    if (shipType === 'alien') {
      ctx.fillStyle = '#0ff';
      ctx.beginPath();
      ctx.moveTo(ship.x + ship.w / 2, ship.y);
      ctx.lineTo(ship.x + ship.w, ship.y + ship.h);
      ctx.lineTo(ship.x, ship.y + ship.h);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#f0f';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else {
      rocketEl.style.display = 'block';
      rocketEl.style.left    = `${ship.x}px`;
      rocketEl.style.top     = `${ship.y}px`;
    }
    drawText(`Score: ${score}`, 10, 30, '20px Verdana', 'left');
    drawText(`Difficulty: ${difficulty}`, WIDTH - 10, 30, '20px Verdana', 'right');
  }
}

let lastTime = 0;
function loop(time) {
  const dt = (time - lastTime) / 1000;
  lastTime = time;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

showStartScreen();
requestAnimationFrame(loop);
