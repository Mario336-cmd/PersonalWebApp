const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// Colors & sizes
const STAR_BACK_COLOR   = '#444';
const STAR_FRONT_COLOR  = '#888';
const BLOCK_COLOR       = '#fff';
const SHIP_FILL_COLOR   = '#0ff';
const SHIP_BORDER_COLOR = '#f0f';
const SHIP_WIDTH        = 60;
const SHIP_HEIGHT       = 40;
// Extra space from the bottom so the ship isn't hidden on short screens
const SHIP_Y_OFFSET     = 160;

// Game state
let state         = 'start';
let difficulty    = 'Medium';
let spawnRate     = 25;
let blockSpeed    = 400;
let starSpeedBack = 100;
let starSpeedFront= 200;
let score         = 0;

// Entities
let starsBack = [];
let starsFront= [];
let blocks    = [];
const ship = {
  x: (WIDTH - SHIP_WIDTH) / 2,
  y: HEIGHT - SHIP_HEIGHT - SHIP_Y_OFFSET,
  w: SHIP_WIDTH,
  h: SHIP_HEIGHT,
  speed: 400
};

// Input
const keys = {};
window.addEventListener('keydown', e => { keys[e.key] = true; handleKey(e.key); });
window.addEventListener('keyup',   e => { keys[e.key] = false; });

function handleKey(key) {
  if (state === 'start') {
    if (/^[nN]$/.test(key)) startGame();
    if (/^[sS]$/.test(key)) state = 'settings';
  } else if (state === 'settings') {
    if (/[1-4]/.test(key)) {
      switch(key) {
        case '1': setDifficulty('Easy',   40,  300, 70, 140); break;
        case '2': setDifficulty('Medium', 25,  400,100, 200); break;
        case '3': setDifficulty('Hard',   12,  600,150, 300); break;
        case '4': setDifficulty('Extreme',7,   800,250, 500); break;
      }
      state = 'start';
    }
  } else if (state === 'gameover') {
    if (/^[rR]$/.test(key)) state = 'start';
    if (/^[qQ]$/.test(key)) state = 'start';
  }
}

function setDifficulty(name, sr, bs, ssb, ssf) {
  difficulty    = name;
  spawnRate     = sr;
  blockSpeed    = bs;
  starSpeedBack = ssb;
  starSpeedFront= ssf;
}

function startGame() {
  state     = 'playing';
  score     = 0;
  blocks    = [];
  ship.x    = (WIDTH - SHIP_WIDTH) / 2;
  ship.y    = HEIGHT - SHIP_HEIGHT - SHIP_Y_OFFSET;
  starsBack = createStars(80);
  starsFront= createStars(40);
}

function createStars(n) {
  const arr = [];
  for (let i = 0; i < n; i++) arr.push({ x: Math.random()*WIDTH, y: Math.random()*HEIGHT });
  return arr;
}

function update(dt) {
  if (state !== 'playing') return;
  if (keys['ArrowLeft']  && ship.x > 0)               ship.x -= ship.speed * dt;
  if (keys['ArrowRight'] && ship.x + ship.w < WIDTH) ship.x += ship.speed * dt;
  moveStars(starsBack,  starSpeedBack,  dt);
  moveStars(starsFront, starSpeedFront, dt);
  if (Math.random() < dt * 60 / spawnRate) blocks.push({ x: Math.random()*(WIDTH-20), y: -20, w:20, h:20 });
  blocks = blocks.filter(b => {
    b.y += blockSpeed * dt;
    if (collides(b, ship)) { state = 'gameover'; return false; }
    if (b.y > HEIGHT) { score++; return false; }
    return true;
  });
}

function moveStars(arr, speed, dt) {
  arr.forEach(s => {
    s.y += speed * dt;
    if (s.y > HEIGHT) { s.y = 0; s.x = Math.random()*WIDTH; }
  });
}

function draw() {
  const grad = ctx.createLinearGradient(0,0,0,HEIGHT);
  grad.addColorStop(0, 'rgb(10,10,40)');
  grad.addColorStop(1, 'rgb(0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,WIDTH,HEIGHT);

  if (state === 'start') {
    drawText('STAR DODGER', WIDTH/2, HEIGHT/3, '48px Impact');
    drawText('Earn points by dodging blocks!', WIDTH/2, HEIGHT/3 + 60, '24px Verdana');
    drawText('N: New Game   S: Settings', WIDTH/2, HEIGHT/2, '24px Verdana');
  } else if (state === 'settings') {
    drawText('SETTINGS', WIDTH/2, HEIGHT/4, '48px Impact');
    drawText('1 - Easy   2 - Medium   3 - Hard   4 - Extreme', WIDTH/2, HEIGHT/2, '24px Verdana');
    drawText(`Current: ${difficulty}`, WIDTH/2, HEIGHT*3/4, '24px Verdana');
  } else if (state === 'playing') {
    ctx.fillStyle = STAR_BACK_COLOR;
    starsBack.forEach(s => ctx.fillRect(s.x,s.y,2,2));
    ctx.fillStyle = STAR_FRONT_COLOR;
    starsFront.forEach(s => ctx.fillRect(s.x,s.y,2,2));
    ctx.fillStyle = BLOCK_COLOR;
    blocks.forEach(b => ctx.fillRect(b.x,b.y,b.w,b.h));
    ctx.fillStyle = SHIP_FILL_COLOR;
    ctx.beginPath();
    ctx.moveTo(ship.x + ship.w/2, ship.y);
    ctx.lineTo(ship.x + ship.w, ship.y + ship.h);
    ctx.lineTo(ship.x, ship.y + ship.h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = SHIP_BORDER_COLOR;
    ctx.lineWidth = 3;
    ctx.stroke();
    drawText(`Score: ${score}`, 10, 30, '20px Verdana', 'left');
    drawText(difficulty, WIDTH-10, 30, '20px Verdana', 'right');
  } else if (state === 'gameover') {
    drawText('GAME OVER', WIDTH/2, HEIGHT/3, '48px Impact');
    drawText(`Total Points: ${score}`, WIDTH/2, HEIGHT/2, '24px Verdana');
    drawText('R: Restart   Q: Quit', WIDTH/2, HEIGHT*2/3, '24px Verdana');
  }
}

function drawText(text, x, y, font, align = 'center') {
  ctx.fillStyle = BLOCK_COLOR;
  ctx.font = font;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
}

function collides(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

let lastTime = 0;
function loop(ts) {
  const dt = (ts - lastTime) / 1000;
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

starsBack  = createStars(80);
starsFront = createStars(40);
requestAnimationFrame(loop);
