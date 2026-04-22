/**
 * game.js
 * Main entry point for Highway Dash.
 *
 * Game concept:
 *   - Player drives forward on an infinite straight road (automatic speed).
 *   - Steer left/right (A/D or Arrow keys) to dodge traffic and obstacles.
 *   - Hitting any obstacle or traffic car = CRASH → game over.
 *   - Speed increases over time — survive as long as possible.
 *   - Score = distance driven in metres. Best score saved to localStorage.
 *
 * Camera:
 *   - X: always centred on the road (road is fixed world X 0-480).
 *   - Y: player held at 65 % from top of screen; road scrolls upward.
 *
 * Dependencies: utils.js, input.js, track.js, car.js, aiCar.js
 */

// ── Canvas ────────────────────────────────────────────────────

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ── HUD references ────────────────────────────────────────────

const hudScore = document.getElementById('hud-score');
const hudTimer = document.getElementById('hud-timer');
const hudSpeed = document.getElementById('hud-speed');

const overlay      = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg   = document.getElementById('overlay-message');
const overlayBtn   = document.getElementById('overlay-btn');

// ── Game state ────────────────────────────────────────────────

const STATE = { WAITING: 'waiting', RACING: 'racing', DEAD: 'dead' };
let state    = STATE.WAITING;
let lastTime = null;

// ── Speed progression ─────────────────────────────────────────
const SPEED_START = 240;   // px/s at race start
const SPEED_MAX   = 620;   // px/s maximum
const SPEED_RATE  =  13;   // px/s increase per second

// ── Traffic colours ───────────────────────────────────────────
const TRAFFIC_COLORS = [
  '#4fc3f7', '#a5d6a7', '#fff176',
  '#ff8a65', '#ce93d8', '#90caf9', '#ffffff',
];

// ── Per-game variables ────────────────────────────────────────
let track, player, trafficCars;
let gameSpeed    = SPEED_START;
let raceTime     = 0;
let trafficTimer = 0;

// ── Persistent best score ─────────────────────────────────────
let bestScore = parseInt(localStorage.getItem('hwdash_best') || '0', 10);

// ── Helpers ───────────────────────────────────────────────────

/** Current score: metres driven (absolute Y progress). */
function getScore() {
  return Math.floor(Math.abs(player.y) / 5);
}

/**
 * Camera transform values.
 * tx — centres the road horizontally.
 * ty — keeps the player 65 % from the top of the screen.
 */
function getCamera() {
  return {
    tx: canvas.width  / 2 - track.roadCenterX,
    ty: canvas.height * 0.65 - player.y,
  };
}

/** World-space Y bounds of the visible screen. */
function getViewBounds() {
  return {
    minY: player.y - canvas.height * 0.65,
    maxY: player.y + canvas.height * 0.35,
  };
}

// ── Traffic spawning ──────────────────────────────────────────

/**
 * Spawn a single traffic car just above the visible screen.
 * Picks a random lane. Speed is 55-75 % of current game speed
 * so the player always approaches from behind.
 */
function spawnTraffic(y) {
  const lane  = Math.floor(Math.random() * track.laneCount);
  const x     = track.getLaneCenter(lane);
  const speed = gameSpeed * (0.55 + Math.random() * 0.20);
  const color = TRAFFIC_COLORS[Math.floor(Math.random() * TRAFFIC_COLORS.length)];
  trafficCars.push(new AICar(x, y, speed, color));
}

// ── Collision detection ───────────────────────────────────────

/**
 * Returns true if the player has collided with any obstacle or traffic car.
 * Hitboxes are shrunk by 25 % for fairness.
 */
function checkCollisions() {
  // Player vs track obstacles
  if (track.checkObstacleCollision(player.x, player.y, player.width, player.height)) {
    return true;
  }

  // Player vs traffic cars
  const s  = 0.75;
  const pr = {
    x:      player.x - (player.width  * s) / 2,
    y:      player.y - (player.height * s) / 2,
    width:  player.width  * s,
    height: player.height * s,
  };
  for (const car of trafficCars) {
    const cr = {
      x:      car.x - (car.width  * s) / 2,
      y:      car.y - (car.height * s) / 2,
      width:  car.width  * s,
      height: car.height * s,
    };
    if (aabbOverlap(pr, cr)) return true;
  }
  return false;
}

// ── Game initialisation ───────────────────────────────────────

function initGame() {
  track = new Track();

  // Player starts at road centre, world Y = 0
  player = new Car(track.roadCenterX, 0, '#e94560');

  trafficCars  = [];
  gameSpeed    = SPEED_START;
  raceTime     = 0;
  trafficTimer = 0;
  lastTime     = null;

  // Pre-seed a few traffic cars ahead so the road isn't empty at the start
  spawnTraffic(-700);
  spawnTraffic(-1050);
  spawnTraffic(-1380);
}

// ── Game over ─────────────────────────────────────────────────

function endGame() {
  state = STATE.DEAD;
  const score = getScore();

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('hwdash_best', bestScore);
  }

  overlayTitle.textContent = 'CRASH!';
  overlayMsg.innerHTML =
    `Distance: <strong>${score} m</strong><br>` +
    `Time: ${raceTime.toFixed(1)} s<br>` +
    `<small style="color:#aaa">Best: ${bestScore} m</small>`;
  overlayBtn.textContent = 'PLAY AGAIN';
  overlay.classList.add('visible');
}

// ── HUD update ────────────────────────────────────────────────

function updateHUD() {
  hudScore.textContent = `Distance: ${getScore()} m`;
  hudTimer.textContent = `Time: ${raceTime.toFixed(1)}s`;
  hudSpeed.textContent = `Speed: ${player.speedKmh} km/h`;
}

// ── Danger vignette (red edge glow when close to hazard) ──────

function drawDangerVignette() {
  let minDist = Infinity;

  for (const obs of track.obstacles) {
    const d = dist(player.x, player.y, obs.x, obs.y);
    if (d < minDist) minDist = d;
  }
  for (const car of trafficCars) {
    const d = dist(player.x, player.y, car.x, car.y);
    if (d < minDist) minDist = d;
  }

  const threshold = 160;
  if (minDist < threshold) {
    const alpha = (1 - minDist / threshold) * 0.45;
    const grad  = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, canvas.height * 0.15,
      canvas.width / 2, canvas.height / 2, canvas.width  * 0.75,
    );
    grad.addColorStop(0, 'rgba(255,0,0,0)');
    grad.addColorStop(1, `rgba(255,0,0,${alpha})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

// ── Speed stripe effect (thin vertical lines at high speed) ───

function drawSpeedLines() {
  const ratio = (gameSpeed - SPEED_START) / (SPEED_MAX - SPEED_START);
  if (ratio < 0.25) return;

  const alpha  = (ratio - 0.25) * 0.18;
  const count  = 12;
  const cam    = getCamera();
  const roadL  = track.leftEdge  + cam.tx;
  const roadR  = track.rightEdge + cam.tx;

  ctx.save();
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth   = 1;
  for (let i = 0; i < count; i++) {
    const x = roadL + (roadR - roadL) * (i / (count - 1));
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  ctx.restore();
}

// ── Main game loop ────────────────────────────────────────────

function gameLoop(timestamp) {
  requestAnimationFrame(gameLoop);

  const dt = lastTime ? Math.min((timestamp - lastTime) / 1000, 0.1) : 0;
  lastTime = timestamp;

  // ── Logic (only when racing) ─────────────────────────────
  if (state === STATE.RACING) {
    raceTime  += dt;
    gameSpeed  = Math.min(SPEED_MAX, gameSpeed + SPEED_RATE * dt);

    // Update player
    player.update(dt, gameSpeed, track);

    // Update track (spawns obstacles, culls old ones)
    track.update(player.y, getScore());

    // Periodic traffic spawning — spawn just above the visible screen
    trafficTimer -= dt;
    if (trafficTimer <= 0) {
      const view = getViewBounds();
      spawnTraffic(view.minY - 80);
      trafficTimer = 1.8 + Math.random() * 1.2;
    }

    // Update & cull traffic
    for (const car of trafficCars) car.update(dt);
    const cullY = player.y + canvas.height * 0.35 + 100;
    trafficCars  = trafficCars.filter(c => c.y < cullY);

    // Collision check → game over
    if (checkCollisions()) {
      endGame();
    }

    updateHUD();
  }

  // ── Render ───────────────────────────────────────────────
  const cam  = getCamera();
  const view = getViewBounds();

  // Background (sky-ish dark for contrast)
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // World transform
  ctx.save();
  ctx.translate(cam.tx, cam.ty);

  track.draw(ctx, view.minY, view.maxY);

  for (const car of trafficCars) {
    if (car.y >= view.minY - 100 && car.y <= view.maxY + 100) {
      car.draw(ctx);
    }
  }

  player.draw(ctx);

  ctx.restore();

  // Screen-space effects (no world transform)
  if (state === STATE.RACING) {
    drawSpeedLines();
    drawDangerVignette();
  }
}

// ── Button ────────────────────────────────────────────────────

overlayBtn.addEventListener('click', () => {
  overlay.classList.remove('visible');
  initGame();
  state = STATE.RACING;
});

// ── Boot ──────────────────────────────────────────────────────

initGame();
requestAnimationFrame(gameLoop);
