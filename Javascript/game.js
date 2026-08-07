import * as THREE from 'three';

const canvas = document.getElementById('gameCanvas');
const container = document.getElementById('gameContainer');
const navIcon = document.getElementById('back-link');

const screens = Array.from(document.querySelectorAll('.screen'));
const loadingScreen = document.getElementById('loading-screen');
const startScreen = document.getElementById('start-screen');
const shipScreen = document.getElementById('ship-screen');
const difficultyScreen = document.getElementById('difficulty-screen');
const settingsScreen = document.getElementById('settings-screen');
const pauseScreen = document.getElementById('pause-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const webglError = document.getElementById('webgl-error');

const startButton = document.getElementById('start-button');
const selectShipButton = document.getElementById('select-ship');
const selectDifficultyButton = document.getElementById('select-difficulty');
const selectSettingsButton = document.getElementById('select-settings');
const shipBackButton = document.getElementById('ship-back');
const difficultyBackButton = document.getElementById('difficulty-back');
const settingsBackButton = document.getElementById('settings-back');
const settingsHitboxesButton = document.getElementById('settings-hitboxes');
const settingsHitboxesValue = document.getElementById('settings-hitboxes-value');
const resumeButton = document.getElementById('resume-button');
const retryButton = document.getElementById('retry-button');
const homeButton = document.getElementById('home-button');
const shipButtons = Array.from(document.querySelectorAll('[data-ship]'));
const difficultyButtons = Array.from(document.querySelectorAll('[data-diff]'));

const hud = document.getElementById('hud');
const scoreValue = document.getElementById('score-value');
const distanceValue = document.getElementById('distance-value');
const difficultyValue = document.getElementById('difficulty-value');
const shieldPips = Array.from(document.querySelectorAll('#shield-pips span'));
const shieldPipsContainer = document.getElementById('shield-pips');
const heatFill = document.getElementById('heat-fill');
const overheatLabel = document.getElementById('overheat-label');
const crosshair = document.querySelector('.crosshair');
const mobileFireButton = document.getElementById('mobile-fire');
const damageFlash = document.getElementById('damage-flash');

const finalScore = document.getElementById('final-score');
const finalDistance = document.getElementById('final-distance');
const finalDestroyed = document.getElementById('final-destroyed');
const finalNearMisses = document.getElementById('final-near-misses');

const DIFFICULTIES = Object.freeze({
  Easy: Object.freeze({
    speedMultiplier: 0.8,
    enemyCap: 2,
    enemyInterval: 4.4,
    asteroidCap: 22,
    asteroidInterval: 1.25
  }),
  Medium: Object.freeze({
    speedMultiplier: 1,
    enemyCap: 4,
    enemyInterval: 3.1,
    asteroidCap: 30,
    asteroidInterval: 0.85
  }),
  Hard: Object.freeze({
    speedMultiplier: 1.25,
    enemyCap: 6,
    enemyInterval: 2.1,
    asteroidCap: 40,
    asteroidInterval: 0.58
  }),
  Extreme: Object.freeze({
    speedMultiplier: 1.55,
    enemyCap: 8,
    enemyInterval: 1.35,
    asteroidCap: 52,
    asteroidInterval: 0.38
  })
});

const BASE_WORLD_SPEED = 16;
const PLAYER_BULLET_SPEED = 62;
const ENEMY_BULLET_SPEED = 21;
const PLAYER_BULLET_RADIUS = 0.12;
const PLAYER_NEAR_RADIUS = 1.25;
const FIRE_INTERVAL = 0.13;
const SHOT_HEAT = 8;
const COOL_RATE = 20;
const OVERHEAT_RELEASE = 42;
const FIXED_TIME_STEP = 1 / 60;
const MAX_FRAME_DELTA = 0.25;

const SHIP_STATS = Object.freeze({
  alien: Object.freeze({ moveSpeed: 10.4, maxShields: 3 }),
  rocket: Object.freeze({ moveSpeed: 8.6, maxShields: 4 })
});

let state = 'loading';
let difficulty = 'Medium';
let shipType = 'alien';
let renderer;
let scene;
let camera;
let currentShip = null;
let starfield = null;
let starPositions = null;
let planet = null;
let planetRing = null;
let debugLayer = null;

let score = 0;
let distanceTravelled = 0;
let destroyedCount = 0;
let nearMissCount = 0;
let maxShields = SHIP_STATS.alien.maxShields;
let shields = maxShields;
let heat = 0;
let overheated = false;
let fireCooldown = 0;
let invulnerability = 0;
let asteroidTimer = 0;
let enemyTimer = 0;
let elapsedRunTime = 0;
let lastFrameTime = 0;
let simulationAccumulator = 0;
let gamePaused = false;
let hitboxesVisible = true;

let movementPointerId = null;
let firePointerId = null;
let pointerFireHeld = false;
let pointerStartX = 0;
let pointerStartY = 0;
let pointerStartShipX = 0;
let pointerStartShipY = 0;

const keys = new Set();
const shipTarget = new THREE.Vector3(0, -2, 2);
const previousShipPosition = new THREE.Vector3(0, -2, 2);
const previousShipQuaternion = new THREE.Quaternion();
const cameraTarget = new THREE.Vector3();
const cameraLookTarget = new THREE.Vector3();
const tempA = new THREE.Vector3();
const tempB = new THREE.Vector3();
const tempC = new THREE.Vector3();
const tempD = new THREE.Vector3();
const projectileAxis = new THREE.Vector3(0, 0, 1);
const flightBounds = { x: 7.2, minY: -3.35, maxY: 3.55 };

const SHIP_COLLIDERS = Object.freeze({
  alien: Object.freeze([
    Object.freeze({ x: 0, y: 0, z: 0, radius: 0.78 }),
    Object.freeze({ x: -1.28, y: -0.04, z: 0.25, radius: 0.62 }),
    Object.freeze({ x: 1.28, y: -0.04, z: 0.25, radius: 0.62 }),
    Object.freeze({ x: 0, y: 0, z: -0.88, radius: 0.54 }),
    Object.freeze({ x: 0, y: 0, z: 0.88, radius: 0.5 })
  ]),
  rocket: Object.freeze([
    Object.freeze({ x: 0, y: 0, z: 0, radius: 0.72 }),
    Object.freeze({ x: -0.92, y: -0.04, z: 0.58, radius: 0.52 }),
    Object.freeze({ x: 0.92, y: -0.04, z: 0.58, radius: 0.52 }),
    Object.freeze({ x: 0, y: 0, z: -1.35, radius: 0.46 }),
    Object.freeze({ x: 0, y: 0, z: 1.12, radius: 0.48 })
  ])
});

const ENEMY_COLLIDERS = Object.freeze([
  Object.freeze({ x: 0, y: 0, z: 0, radius: 0.74 }),
  Object.freeze({ x: -1.04, y: -0.02, z: 0.2, radius: 0.66 }),
  Object.freeze({ x: 1.04, y: -0.02, z: 0.2, radius: 0.66 }),
  Object.freeze({ x: 0, y: 0, z: -0.82, radius: 0.48 }),
  Object.freeze({ x: 0, y: 0, z: 0.82, radius: 0.48 })
]);

const asteroids = [];
const enemies = [];
const playerBullets = [];
const enemyBullets = [];
const effects = [];
const playerHitboxes = [];

let asteroidGeometry;
let playerBulletGeometry;
let enemyBulletGeometry;
let sparkGeometry;
let hitboxGeometry;
let materials;

function setActiveScreen(activeScreen) {
  screens.forEach(screen => {
    const isActive = screen === activeScreen;
    screen.classList.toggle('active', isActive);
    screen.toggleAttribute('inert', !isActive);
    screen.setAttribute('aria-hidden', String(!isActive));
  });

  if (activeScreen) {
    const focusTarget = activeScreen.querySelector('h1, h2, button');
    if (focusTarget) {
      if (focusTarget.matches('h1, h2')) focusTarget.setAttribute('tabindex', '-1');
      focusTarget.focus({ preventScroll: true });
    }
  }
}

function setPlayingUi(isPlaying) {
  document.body.classList.toggle('game-playing', isPlaying);
  setGameplayControlsEnabled(isPlaying && !gamePaused);
  updateHitboxLayerVisibility();
  updateNavIcon();
}

function setGameplayControlsEnabled(enabled) {
  hud.setAttribute('aria-hidden', String(!enabled));
  canvas.tabIndex = enabled ? 0 : -1;
  canvas.toggleAttribute('inert', !enabled);
  canvas.setAttribute('aria-hidden', String(!enabled));
  mobileFireButton.disabled = !enabled;
  mobileFireButton.tabIndex = enabled ? 0 : -1;
  mobileFireButton.setAttribute('aria-hidden', String(!enabled));
}

function updateHitboxLayerVisibility() {
  if (debugLayer) debugLayer.visible = hitboxesVisible && state === 'playing';
}

function setHitboxesVisible(visible) {
  hitboxesVisible = visible;
  settingsHitboxesValue.textContent = visible ? 'ON' : 'OFF';
  settingsHitboxesButton.setAttribute('aria-pressed', String(visible));
  updateHitboxLayerVisibility();
}

function toggleHitboxes() {
  setHitboxesVisible(!hitboxesVisible);
}

function updateNavIcon() {
  const shouldHide = state === 'playing';
  navIcon.classList.toggle('hide', shouldHide);
  navIcon.tabIndex = shouldHide ? -1 : 0;
  navIcon.setAttribute('aria-hidden', String(shouldHide));
}

function showStartScreen() {
  state = 'start';
  gamePaused = false;
  simulationAccumulator = 0;
  resetInput();
  clearDynamicScene();
  selectShipButton.textContent = `Ship: ${shipType === 'alien' ? 'Alien Ship' : 'Rocket'}`;
  selectDifficultyButton.textContent = `Difficulty: ${difficulty}`;
  updateSelections();
  setPlayingUi(false);
  setActiveScreen(startScreen);
}

function showShipScreen() {
  state = 'ship-select';
  updateSelections();
  setPlayingUi(false);
  setActiveScreen(shipScreen);
}

function showDifficultyScreen() {
  state = 'difficulty-select';
  updateSelections();
  setPlayingUi(false);
  setActiveScreen(difficultyScreen);
}

function showSettingsScreen() {
  state = 'settings';
  setHitboxesVisible(hitboxesVisible);
  setPlayingUi(false);
  setActiveScreen(settingsScreen);
}

function showGameOverScreen() {
  if (state !== 'playing') return;

  state = 'gameover';
  gamePaused = false;
  simulationAccumulator = 0;
  resetInput();
  setPlayingUi(false);
  if (currentShip) currentShip.visible = false;

  finalScore.textContent = Math.floor(score).toLocaleString();
  finalDistance.textContent = `${Math.floor(distanceTravelled).toLocaleString()} m`;
  finalDestroyed.textContent = destroyedCount.toLocaleString();
  finalNearMisses.textContent = nearMissCount.toLocaleString();
  setActiveScreen(gameoverScreen);
}

function showWebglError() {
  state = 'error';
  gamePaused = false;
  resetInput();
  setPlayingUi(false);
  setActiveScreen(webglError);
}

function pauseGame() {
  if (state !== 'playing' || gamePaused) return;
  gamePaused = true;
  simulationAccumulator = 0;
  resetInput();
  setGameplayControlsEnabled(false);
  setActiveScreen(pauseScreen);
}

function resumeGame() {
  if (state !== 'playing' || !gamePaused) return;
  gamePaused = false;
  simulationAccumulator = 0;
  lastFrameTime = performance.now();
  setActiveScreen(null);
  setGameplayControlsEnabled(true);
  canvas.focus({ preventScroll: true });
}

function updateSelections() {
  shipButtons.forEach(button => {
    const selected = button.dataset.ship === shipType;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });

  difficultyButtons.forEach(button => {
    const selected = button.dataset.diff === difficulty;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function setupRenderer() {
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
  } catch (error) {
    console.error('Unable to create the 3D renderer.', error);
    showWebglError();
    return false;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;
  renderer.setClearColor(0x02030a, 1);
  return true;
}

function setupScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02030a);
  scene.fog = new THREE.Fog(0x02030a, 62, 155);

  camera = new THREE.PerspectiveCamera(60, 1, 0.1, 220);
  camera.position.set(0, 4.8, 13.2);
  camera.lookAt(0, -0.2, -18);

  const hemisphere = new THREE.HemisphereLight(0x8adfff, 0x180b35, 1.65);
  scene.add(hemisphere);

  const keyLight = new THREE.DirectionalLight(0xb9f4ff, 2.25);
  keyLight.position.set(-7, 12, 8);
  scene.add(keyLight);

  const rimLight = new THREE.PointLight(0xff4fd8, 14, 42, 1.7);
  rimLight.position.set(10, 2, -12);
  scene.add(rimLight);

  materials = {
    alienHull: new THREE.MeshStandardMaterial({ color: 0x2fe4ed, metalness: 0.78, roughness: 0.24, flatShading: true }),
    alienWing: new THREE.MeshStandardMaterial({ color: 0x51258f, metalness: 0.68, roughness: 0.32, side: THREE.DoubleSide }),
    canopy: new THREE.MeshStandardMaterial({ color: 0x9ffbff, emissive: 0x137e9b, emissiveIntensity: 1.6, metalness: 0.2, roughness: 0.12 }),
    rocketHull: new THREE.MeshStandardMaterial({ color: 0xe7f5ff, metalness: 0.65, roughness: 0.25 }),
    rocketShade: new THREE.MeshStandardMaterial({ color: 0x315889, metalness: 0.7, roughness: 0.28 }),
    rocketAccent: new THREE.MeshStandardMaterial({ color: 0xff4f80, emissive: 0x7a102f, emissiveIntensity: 0.8, metalness: 0.5, roughness: 0.3 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: 0x14243c, metalness: 0.84, roughness: 0.27 }),
    engine: new THREE.MeshBasicMaterial({ color: 0x54edff, transparent: true, opacity: 0.88 }),
    rocketEngine: new THREE.MeshBasicMaterial({ color: 0xff9b52, transparent: true, opacity: 0.9 }),
    asteroidSmall: new THREE.MeshStandardMaterial({ color: 0x9b664e, emissive: 0x2c1008, emissiveIntensity: 0.35, roughness: 0.95, metalness: 0.05, flatShading: true }),
    asteroidLarge: new THREE.MeshStandardMaterial({ color: 0x424859, roughness: 0.92, metalness: 0.08, flatShading: true }),
    enemyHull: new THREE.MeshStandardMaterial({ color: 0xa31f52, emissive: 0x4a071f, emissiveIntensity: 1, metalness: 0.72, roughness: 0.28, flatShading: true }),
    enemyWing: new THREE.MeshStandardMaterial({ color: 0x33134f, metalness: 0.62, roughness: 0.32, side: THREE.DoubleSide }),
    enemyLight: new THREE.MeshBasicMaterial({ color: 0xff557d }),
    playerBullet: new THREE.MeshBasicMaterial({ color: 0x7cf8ff }),
    enemyBullet: new THREE.MeshBasicMaterial({ color: 0xff315f }),
    sparkCyan: new THREE.MeshBasicMaterial({ color: 0x63efff }),
    sparkOrange: new THREE.MeshBasicMaterial({ color: 0xff9b52 }),
    sparkPink: new THREE.MeshBasicMaterial({ color: 0xff4f9e }),
    sparkRed: new THREE.MeshBasicMaterial({ color: 0xff315f }),
    hitboxPlayer: new THREE.MeshBasicMaterial({ color: 0x55ff9d, wireframe: true, transparent: true, opacity: 0.48, depthTest: false, depthWrite: false }),
    hitboxEnemy: new THREE.MeshBasicMaterial({ color: 0xff3f68, wireframe: true, transparent: true, opacity: 0.48, depthTest: false, depthWrite: false }),
    hitboxAsteroid: new THREE.MeshBasicMaterial({ color: 0xffc14f, wireframe: true, transparent: true, opacity: 0.42, depthTest: false, depthWrite: false }),
    hitboxPlayerBullet: new THREE.MeshBasicMaterial({ color: 0x63efff, wireframe: true, transparent: true, opacity: 0.64, depthTest: false, depthWrite: false }),
    hitboxEnemyBullet: new THREE.MeshBasicMaterial({ color: 0xff68b7, wireframe: true, transparent: true, opacity: 0.64, depthTest: false, depthWrite: false })
  };

  asteroidGeometry = new THREE.DodecahedronGeometry(1, 0);
  playerBulletGeometry = new THREE.SphereGeometry(0.09, 8, 8);
  enemyBulletGeometry = new THREE.OctahedronGeometry(0.15, 0);
  sparkGeometry = new THREE.TetrahedronGeometry(0.09, 0);
  hitboxGeometry = new THREE.SphereGeometry(1, 14, 10);

  debugLayer = new THREE.Group();
  debugLayer.name = 'development-hitboxes';
  scene.add(debugLayer);
  setHitboxesVisible(true);

  createStarfield();
  createDistantPlanet();
  resizeRenderer();
}

function createStarfield() {
  const count = 1100;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const cool = new THREE.Color();

  for (let index = 0; index < count; index += 1) {
    const offset = index * 3;
    positions[offset] = THREE.MathUtils.randFloatSpread(100);
    positions[offset + 1] = THREE.MathUtils.randFloatSpread(70);
    positions[offset + 2] = THREE.MathUtils.randFloat(-155, 18);

    cool.setHSL(THREE.MathUtils.randFloat(0.52, 0.67), THREE.MathUtils.randFloat(0.15, 0.55), THREE.MathUtils.randFloat(0.65, 1));
    colors[offset] = cool.r;
    colors[offset + 1] = cool.g;
    colors[offset + 2] = cool.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.14,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.92,
    vertexColors: true,
    depthWrite: false
  });

  starfield = new THREE.Points(geometry, material);
  starPositions = geometry.getAttribute('position');
  scene.add(starfield);
}

function createDistantPlanet() {
  const planetMaterial = new THREE.MeshStandardMaterial({
    color: 0x285fa8,
    emissive: 0x071d48,
    emissiveIntensity: 0.8,
    roughness: 0.86,
    metalness: 0.05,
    flatShading: true
  });
  planet = new THREE.Mesh(new THREE.IcosahedronGeometry(8, 2), planetMaterial);
  planet.position.set(-13, 10, -112);
  scene.add(planet);

  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0x8edcff,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  planetRing = new THREE.Mesh(new THREE.RingGeometry(10.2, 15.8, 64), ringMaterial);
  planetRing.position.copy(planet.position);
  planetRing.rotation.set(1.18, 0.25, -0.35);
  scene.add(planetRing);
}

function createAlienShip() {
  const group = new THREE.Group();

  const hull = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), materials.alienHull);
  hull.scale.set(1.05, 0.48, 1.7);
  group.add(hull);

  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.48, 16, 10), materials.canopy);
  canopy.scale.set(0.9, 0.55, 1.15);
  canopy.position.set(0, 0.43, -0.35);
  group.add(canopy);

  const wingGeometry = new THREE.BufferGeometry();
  wingGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.25, 0, -1.15,
    -2.25, -0.08, 0.72,
    -0.5, 0.02, 0.42,
     0.25, 0, -1.15,
     2.25, -0.08, 0.72,
     0.5, 0.02, 0.42
  ], 3));
  wingGeometry.setIndex([0, 1, 2, 3, 5, 4]);
  wingGeometry.computeVertexNormals();
  const wings = new THREE.Mesh(wingGeometry, materials.alienWing);
  group.add(wings);

  const trim = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.045, 6, 32, Math.PI), materials.enemyLight);
  trim.rotation.set(Math.PI / 2, 0, 0);
  trim.position.set(0, 0.02, 0.25);
  group.add(trim);

  const flames = [];
  [-0.48, 0.48].forEach(x => {
    const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.48, 10), materials.darkMetal);
    thruster.rotation.x = Math.PI / 2;
    thruster.position.set(x, -0.05, 1.18);
    group.add(thruster);

    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.14, 1.1, 10), materials.engine);
    flame.rotation.x = Math.PI / 2;
    flame.position.set(x, -0.05, 1.84);
    group.add(flame);
    flames.push(flame);
  });

  group.userData.flames = flames;
  group.userData.muzzleOffset = 0.52;
  group.scale.setScalar(0.92);
  return group;
}

function createRocketShip() {
  const group = new THREE.Group();

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.67, 2.6, 12), materials.rocketHull);
  body.rotation.x = -Math.PI / 2;
  body.position.z = -0.05;
  group.add(body);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.51, 1.25, 12), materials.rocketAccent);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -1.95;
  group.add(nose);

  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 8), materials.canopy);
  cockpit.scale.set(0.85, 0.5, 1.2);
  cockpit.position.set(0, 0.48, -0.65);
  group.add(cockpit);

  const wingGeometry = new THREE.BufferGeometry();
  wingGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.38, -0.02, -0.2,
    -1.75, -0.08, 1.05,
    -0.48, 0, 0.82,
     0.38, -0.02, -0.2,
     1.75, -0.08, 1.05,
     0.48, 0, 0.82
  ], 3));
  wingGeometry.setIndex([0, 1, 2, 3, 5, 4]);
  wingGeometry.computeVertexNormals();
  group.add(new THREE.Mesh(wingGeometry, materials.rocketShade));

  const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.59, 0.07, 7, 24), materials.rocketAccent);
  stripe.rotation.x = Math.PI / 2;
  stripe.position.z = 0.55;
  group.add(stripe);

  const flames = [];
  [-0.34, 0.34].forEach(x => {
    const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.46, 10), materials.darkMetal);
    thruster.rotation.x = Math.PI / 2;
    thruster.position.set(x, -0.04, 1.36);
    group.add(thruster);

    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.15, 1.2, 10), materials.rocketEngine);
    flame.rotation.x = Math.PI / 2;
    flame.position.set(x, -0.04, 2.05);
    group.add(flame);
    flames.push(flame);
  });

  group.userData.flames = flames;
  group.userData.muzzleOffset = 0.42;
  group.scale.setScalar(0.9);
  return group;
}

function createEnemyModel() {
  const group = new THREE.Group();

  const hull = new THREE.Mesh(new THREE.OctahedronGeometry(0.75, 0), materials.enemyHull);
  hull.scale.set(1, 0.5, 1.45);
  group.add(hull);

  const wingGeometry = new THREE.BufferGeometry();
  wingGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.25, 0, -0.55,
    -1.55, -0.02, 0.55,
    -0.42, 0, 0.35,
     0.25, 0, -0.55,
     1.55, -0.02, 0.55,
     0.42, 0, 0.35
  ], 3));
  wingGeometry.setIndex([0, 1, 2, 3, 5, 4]);
  wingGeometry.computeVertexNormals();
  group.add(new THREE.Mesh(wingGeometry, materials.enemyWing));

  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8), materials.enemyLight);
  eye.scale.set(1.4, 0.55, 0.7);
  eye.position.set(0, 0.33, 0.18);
  group.add(eye);

  group.rotation.y = Math.PI;
  return group;
}

function createDebugHitbox(radius, material) {
  const hitbox = new THREE.Mesh(hitboxGeometry, material);
  hitbox.scale.setScalar(radius);
  hitbox.renderOrder = 1000;
  debugLayer.add(hitbox);
  return hitbox;
}

function createPlayerDebugHitboxes() {
  playerHitboxes.length = 0;
  SHIP_COLLIDERS[shipType].forEach(collider => {
    playerHitboxes.push({
      collider,
      mesh: createDebugHitbox(collider.radius, materials.hitboxPlayer)
    });
  });
  updatePlayerDebugHitboxes();
}

function updatePlayerDebugHitboxes() {
  if (!currentShip) return;

  playerHitboxes.forEach(({ collider, mesh }) => {
    tempC.set(collider.x, collider.y, collider.z).applyQuaternion(currentShip.quaternion);
    mesh.position.copy(currentShip.position).add(tempC);
  });
}

function createEnemyDebugHitboxes(enemyMesh) {
  const hitboxes = ENEMY_COLLIDERS.map(collider => ({
    collider,
    mesh: createDebugHitbox(collider.radius, materials.hitboxEnemy)
  }));
  updateEnemyDebugHitboxes({ mesh: enemyMesh, hitboxes });
  return hitboxes;
}

function updateEnemyDebugHitboxes(enemy) {
  enemy.hitboxes.forEach(({ collider, mesh }) => {
    tempC.set(collider.x, collider.y, collider.z).applyQuaternion(enemy.mesh.quaternion);
    mesh.position.copy(enemy.mesh.position).add(tempC);
  });
}

function removeDebugHitbox(item) {
  if (item?.hitbox && debugLayer) debugLayer.remove(item.hitbox);
  item?.hitboxes?.forEach(({ mesh }) => debugLayer?.remove(mesh));
}

function startGame() {
  clearDynamicScene();
  resetInput();
  damageFlash.classList.remove('hit');

  state = 'playing';
  score = 0;
  distanceTravelled = 0;
  destroyedCount = 0;
  nearMissCount = 0;
  maxShields = SHIP_STATS[shipType].maxShields;
  shields = maxShields;
  heat = 0;
  overheated = false;
  fireCooldown = 0;
  invulnerability = 0;
  asteroidTimer = 0.8;
  enemyTimer = 2.4;
  elapsedRunTime = 0;
  gamePaused = false;
  simulationAccumulator = 0;

  currentShip = shipType === 'alien' ? createAlienShip() : createRocketShip();
  currentShip.position.set(0, -2, 2);
  shipTarget.copy(currentShip.position);
  previousShipPosition.copy(currentShip.position);
  previousShipQuaternion.copy(currentShip.quaternion);
  scene.add(currentShip);
  resizeRenderer();
  createPlayerDebugHitboxes();

  camera.position.set(0, 4.8, 13.2);
  camera.lookAt(0, -0.2, -18);

  for (let index = 0; index < 5; index += 1) {
    spawnAsteroid(-30 - index * 14);
  }

  updateHud();
  setActiveScreen(null);
  setPlayingUi(true);
  canvas.focus({ preventScroll: true });
  lastFrameTime = performance.now();
}

function clearDynamicScene() {
  debugLayer?.clear();
  playerHitboxes.length = 0;

  [asteroids, playerBullets, enemyBullets, effects].forEach(collection => {
    collection.forEach(item => scene?.remove(item.mesh));
    collection.length = 0;
  });

  enemies.forEach(enemy => removeComplexMesh(enemy.mesh));
  enemies.length = 0;

  if (currentShip && scene) {
    removeComplexMesh(currentShip);
    currentShip = null;
  }
}

function removeComplexMesh(object) {
  if (!object || !scene) return;
  scene.remove(object);
  object.traverse(child => child.geometry?.dispose());
}

function chooseSpawnPosition(radius, z) {
  const xLimit = flightBounds.x + 1.4;
  const yMin = flightBounds.minY - 0.3;
  const yMax = flightBounds.maxY + 1.2;
  let candidate = { x: 0, y: 0, z };

  for (let attempt = 0; attempt < 14; attempt += 1) {
    candidate = {
      x: THREE.MathUtils.randFloat(-xLimit, xLimit),
      y: THREE.MathUtils.randFloat(yMin, yMax),
      z
    };

    const crowdedByAsteroid = asteroids.some(asteroid => (
      Math.abs(asteroid.mesh.position.z - z) < 10
      && Math.hypot(asteroid.mesh.position.x - candidate.x, asteroid.mesh.position.y - candidate.y) < asteroid.radius + radius + 1.2
    ));
    const crowdedByEnemy = enemies.some(enemy => (
      Math.abs(enemy.mesh.position.z - z) < 12
      && Math.hypot(enemy.mesh.position.x - candidate.x, enemy.mesh.position.y - candidate.y) < radius + enemy.radius + 1.6
    ));

    if (!crowdedByAsteroid && !crowdedByEnemy) break;
  }

  return candidate;
}

function spawnAsteroid(forcedZ = null) {
  const radius = THREE.MathUtils.randFloat(0.58, 1.72);
  const destructible = radius <= 1.05;
  const z = forcedZ ?? THREE.MathUtils.randFloat(-105, -82);
  const position = chooseSpawnPosition(radius, z);
  const mesh = new THREE.Mesh(asteroidGeometry, destructible ? materials.asteroidSmall : materials.asteroidLarge);

  mesh.position.set(position.x, position.y, position.z);
  mesh.scale.setScalar(radius);
  mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
  scene.add(mesh);
  const hitbox = createDebugHitbox(radius, materials.hitboxAsteroid);
  hitbox.position.copy(mesh.position);

  asteroids.push({
    mesh,
    hitbox,
    previousPosition: mesh.position.clone(),
    radius,
    destructible,
    speedFactor: THREE.MathUtils.randFloat(0.88, 1.1),
    spinX: THREE.MathUtils.randFloatSpread(1.4),
    spinY: THREE.MathUtils.randFloatSpread(1.4),
    nearMissed: false
  });
}

function spawnEnemy() {
  const z = THREE.MathUtils.randFloat(-100, -82);
  const position = chooseSpawnPosition(1.7, z);
  const mesh = createEnemyModel();
  mesh.position.set(position.x, position.y, position.z);
  scene.add(mesh);
  const hitboxes = createEnemyDebugHitboxes(mesh);

  enemies.push({
    mesh,
    hitboxes,
    previousPosition: mesh.position.clone(),
    previousQuaternion: mesh.quaternion.clone(),
    radius: 1.7,
    health: 2,
    baseX: position.x,
    baseY: position.y,
    phase: Math.random() * Math.PI * 2,
    elapsed: 0,
    shootTimer: THREE.MathUtils.randFloat(1.25, 2.2),
    fireTime: Infinity,
    hitFlash: 0
  });
}

function spawnPlayerBullet(xOffset) {
  if (!currentShip) return;

  const mesh = new THREE.Mesh(playerBulletGeometry, materials.playerBullet);
  mesh.scale.set(1, 1, 3.8);
  tempC.set(xOffset, 0.02, -1.35).applyQuaternion(currentShip.quaternion);
  mesh.position.copy(currentShip.position).add(tempC);

  const direction = getAimDirection(mesh.position);
  mesh.quaternion.setFromUnitVectors(projectileAxis, direction);
  scene.add(mesh);
  const hitbox = createDebugHitbox(PLAYER_BULLET_RADIUS, materials.hitboxPlayerBullet);
  hitbox.position.copy(mesh.position);
  playerBullets.push({
    mesh,
    hitbox,
    previousPosition: mesh.position.clone(),
    velocity: direction.multiplyScalar(PLAYER_BULLET_SPEED),
    age: 0
  });
}

function getAimDirection(origin) {
  let bestEnemy = null;
  let bestScore = Infinity;

  enemies.forEach(enemy => {
    const dz = origin.z - enemy.mesh.position.z;
    if (dz <= 3) return;

    const lateral = Math.hypot(enemy.mesh.position.x - origin.x, enemy.mesh.position.y - origin.y);
    if (lateral > 3.25) return;

    const targetScore = lateral + dz * 0.006;
    if (targetScore < bestScore) {
      bestScore = targetScore;
      bestEnemy = enemy;
    }
  });

  tempA.set(0, 0, -1);
  if (bestEnemy) {
    tempB.copy(bestEnemy.mesh.position).sub(origin).normalize();
    tempA.lerp(tempB, 0.58).normalize();
  }
  return tempA.clone();
}

function spawnEnemyBullet(enemy, origin = enemy.mesh.position, target = currentShip?.position, stepFraction = 1) {
  if (!currentShip || state !== 'playing') return;

  const mesh = new THREE.Mesh(enemyBulletGeometry, materials.enemyBullet);
  mesh.scale.set(0.85, 0.85, 2.1);
  mesh.position.copy(origin);
  mesh.position.z += 0.8;

  const velocity = target.clone().sub(mesh.position).normalize().multiplyScalar(ENEMY_BULLET_SPEED);
  tempC.copy(velocity).normalize();
  mesh.quaternion.setFromUnitVectors(projectileAxis, tempC);
  scene.add(mesh);
  const hitbox = createDebugHitbox(0.14, materials.hitboxEnemyBullet);
  hitbox.position.copy(mesh.position);
  enemyBullets.push({ mesh, hitbox, velocity, age: 0, stepFraction });
}

function tryFire() {
  if (state !== 'playing' || overheated || fireCooldown > 0 || !currentShip) return;

  const muzzleOffset = currentShip.userData.muzzleOffset || 0.48;
  spawnPlayerBullet(-muzzleOffset);
  spawnPlayerBullet(muzzleOffset);

  fireCooldown = FIRE_INTERVAL;
  heat = Math.min(100, heat + SHOT_HEAT);
  if (heat >= 100) overheated = true;
}

function createBurst(position, materialKey = 'sparkCyan', count = 7, force = 5) {
  const material = materials[materialKey] || materials.sparkCyan;

  for (let index = 0; index < count; index += 1) {
    const mesh = new THREE.Mesh(sparkGeometry, material);
    mesh.position.copy(position);
    mesh.scale.setScalar(THREE.MathUtils.randFloat(0.7, 1.45));

    const velocity = new THREE.Vector3(
      THREE.MathUtils.randFloatSpread(force),
      THREE.MathUtils.randFloatSpread(force),
      THREE.MathUtils.randFloatSpread(force)
    );
    const life = THREE.MathUtils.randFloat(0.28, 0.72);
    scene.add(mesh);
    effects.push({ mesh, velocity, life, maxLife: life });
  }
}

function destroyEnemy(index) {
  const enemy = enemies[index];
  if (!enemy) return;

  createBurst(enemy.mesh.position, 'sparkPink', 14, 8);
  removeDebugHitbox(enemy);
  removeComplexMesh(enemy.mesh);
  enemies.splice(index, 1);
  destroyedCount += 1;
  score += 100;
}

function destroyAsteroid(index) {
  const asteroid = asteroids[index];
  if (!asteroid) return;

  createBurst(asteroid.mesh.position, 'sparkOrange', 10, 6);
  removeDebugHitbox(asteroid);
  scene.remove(asteroid.mesh);
  asteroids.splice(index, 1);
  destroyedCount += 1;
  score += 30;
}

function damageShip(position) {
  if (state !== 'playing' || invulnerability > 0) return;

  shields -= 1;
  invulnerability = 1.25;
  createBurst(position || currentShip.position, 'sparkRed', 14, 9);

  damageFlash.classList.remove('hit');
  void damageFlash.offsetWidth;
  damageFlash.classList.add('hit');
  updateHud();

  if (shields <= 0) {
    createBurst(currentShip.position, 'sparkCyan', 24, 12);
    showGameOverScreen();
  }
}

function updateInput(deltaTime) {
  if (!currentShip) return;

  previousShipPosition.copy(currentShip.position);
  previousShipQuaternion.copy(currentShip.quaternion);

  let horizontal = 0;
  let vertical = 0;

  if (keys.has('KeyA') || keys.has('ArrowLeft')) horizontal -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) horizontal += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) vertical += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) vertical -= 1;

  if (horizontal !== 0 || vertical !== 0) {
    const length = Math.hypot(horizontal, vertical) || 1;
    const moveSpeed = SHIP_STATS[shipType].moveSpeed;
    shipTarget.x += (horizontal / length) * moveSpeed * deltaTime;
    shipTarget.y += (vertical / length) * moveSpeed * deltaTime;
  }

  shipTarget.x = THREE.MathUtils.clamp(shipTarget.x, -flightBounds.x, flightBounds.x);
  shipTarget.y = THREE.MathUtils.clamp(shipTarget.y, flightBounds.minY, flightBounds.maxY);

  const previousX = currentShip.position.x;
  const previousY = currentShip.position.y;
  const follow = 1 - Math.exp(-12 * deltaTime);
  currentShip.position.lerp(shipTarget, follow);

  const velocityX = (currentShip.position.x - previousX) / Math.max(deltaTime, 0.001);
  const velocityY = (currentShip.position.y - previousY) / Math.max(deltaTime, 0.001);
  currentShip.rotation.z = THREE.MathUtils.lerp(currentShip.rotation.z, -velocityX * 0.038, 1 - Math.exp(-9 * deltaTime));
  currentShip.rotation.x = THREE.MathUtils.lerp(currentShip.rotation.x, velocityY * 0.018, 1 - Math.exp(-9 * deltaTime));
  updatePlayerDebugHitboxes();

  const flamePulse = 0.82 + Math.sin(elapsedRunTime * 18) * 0.15 + Math.random() * 0.08;
  currentShip.userData.flames?.forEach(flame => {
    flame.scale.y = flamePulse;
    flame.material.opacity = 0.72 + Math.random() * 0.2;
  });
}

function updateWeapons(deltaTime) {
  fireCooldown = Math.max(0, fireCooldown - deltaTime);
  heat = Math.max(0, heat - COOL_RATE * deltaTime);

  if (overheated && heat <= OVERHEAT_RELEASE) overheated = false;
  if ((keys.has('Space') || keys.has('Enter') || pointerFireHeld) && !overheated) tryFire();
}

function updateSpawning(deltaTime, config) {
  asteroidTimer -= deltaTime;
  enemyTimer -= deltaTime;

  if (asteroidTimer <= 0 && asteroids.length < config.asteroidCap) {
    spawnAsteroid();
    asteroidTimer = config.asteroidInterval * THREE.MathUtils.randFloat(0.78, 1.22);
  }

  if (enemyTimer <= 0 && enemies.length < config.enemyCap) {
    spawnEnemy();
    enemyTimer = config.enemyInterval * THREE.MathUtils.randFloat(0.84, 1.2);
  }
}

function updateAsteroids(deltaTime, worldSpeed) {
  asteroids.forEach(asteroid => {
    asteroid.previousPosition.copy(asteroid.mesh.position);

    asteroid.mesh.position.z += worldSpeed * asteroid.speedFactor * deltaTime;
    asteroid.mesh.rotation.x += asteroid.spinX * deltaTime;
    asteroid.mesh.rotation.y += asteroid.spinY * deltaTime;
    asteroid.hitbox.position.copy(asteroid.mesh.position);
  });
}

function resolveAsteroidPasses() {
  for (let index = asteroids.length - 1; index >= 0; index -= 1) {
    const asteroid = asteroids[index];

    if (!asteroid.nearMissed && asteroid.previousPosition.z < currentShip.position.z && asteroid.mesh.position.z >= currentShip.position.z) {
      asteroid.nearMissed = true;
      const lateralDistance = Math.hypot(
        asteroid.mesh.position.x - currentShip.position.x,
        asteroid.mesh.position.y - currentShip.position.y
      );
      if (lateralDistance < asteroid.radius + PLAYER_NEAR_RADIUS + 1.65) {
        nearMissCount += 1;
        score += 25;
      }
    }

    if (asteroid.mesh.position.z > 17) {
      removeDebugHitbox(asteroid);
      scene.remove(asteroid.mesh);
      asteroids.splice(index, 1);
      score += 5;
    }
  }
}

function updateEnemies(deltaTime, worldSpeed) {
  enemies.forEach(enemy => {
    enemy.previousPosition.copy(enemy.mesh.position);
    enemy.previousQuaternion.copy(enemy.mesh.quaternion);

    enemy.elapsed += deltaTime;
    enemy.mesh.position.z += worldSpeed * 0.74 * deltaTime;
    enemy.mesh.position.x = THREE.MathUtils.clamp(
      enemy.baseX + Math.sin(enemy.elapsed * 1.65 + enemy.phase) * 1.15,
      -flightBounds.x - 1,
      flightBounds.x + 1
    );
    enemy.mesh.position.y = THREE.MathUtils.clamp(
      enemy.baseY + Math.cos(enemy.elapsed * 1.25 + enemy.phase) * 0.45,
      flightBounds.minY,
      flightBounds.maxY + 1
    );
    enemy.mesh.rotation.z = Math.sin(enemy.elapsed * 1.65 + enemy.phase) * 0.32;
    updateEnemyDebugHitboxes(enemy);

    const shootTimerBeforeStep = enemy.shootTimer;
    enemy.shootTimer -= deltaTime;
    enemy.fireTime = shootTimerBeforeStep <= 0
      ? 0
      : enemy.shootTimer <= 0
        ? THREE.MathUtils.clamp(shootTimerBeforeStep / deltaTime, 0, 1)
        : Infinity;

    if (enemy.hitFlash > 0) {
      enemy.hitFlash -= deltaTime;
      const pulse = 1 + Math.sin(enemy.hitFlash * 55) * 0.12;
      enemy.mesh.scale.setScalar(pulse);
    } else {
      enemy.mesh.scale.setScalar(1);
    }
  });
}

function resolveEnemyPasses() {
  for (let index = enemies.length - 1; index >= 0; index -= 1) {
    const enemy = enemies[index];

    if (enemy.mesh.position.z > 17) {
      removeDebugHitbox(enemy);
      removeComplexMesh(enemy.mesh);
      enemies.splice(index, 1);
    }
  }
}

function updatePlayerBullets(deltaTime) {
  playerBullets.forEach(bullet => {
    const ageBeforeStep = bullet.age;
    bullet.previousPosition.copy(bullet.mesh.position);
    bullet.mesh.position.addScaledVector(bullet.velocity, deltaTime);
    bullet.hitbox.position.copy(bullet.mesh.position);
    bullet.age += deltaTime;

    bullet.validThrough = 1;
    if (ageBeforeStep >= 3) {
      bullet.validThrough = 0;
    } else if (bullet.age >= 3) {
      bullet.validThrough = Math.min(bullet.validThrough, (3 - ageBeforeStep) / deltaTime);
    }

    if (bullet.previousPosition.z <= -140) {
      bullet.validThrough = 0;
    } else if (bullet.mesh.position.z <= -140) {
      const rangeTime = (-140 - bullet.previousPosition.z) / (bullet.mesh.position.z - bullet.previousPosition.z);
      bullet.validThrough = Math.min(bullet.validThrough, THREE.MathUtils.clamp(rangeTime, 0, 1));
    }
  });
}

function removePlayerBullet(bullet) {
  const index = playerBullets.indexOf(bullet);
  if (index < 0) return false;
  removeDebugHitbox(bullet);
  scene.remove(bullet.mesh);
  playerBullets.splice(index, 1);
  return true;
}

function removeEnemyBullet(bullet) {
  const index = enemyBullets.indexOf(bullet);
  if (index < 0) return false;
  removeDebugHitbox(bullet);
  scene.remove(bullet.mesh);
  enemyBullets.splice(index, 1);
  return true;
}

function resolveStepEvents(deltaTime) {
  const events = [];
  let resolvedTime = 0;

  const advanceStepClock = normalizedTime => {
    const clampedTime = THREE.MathUtils.clamp(normalizedTime, resolvedTime, 1);
    invulnerability = Math.max(0, invulnerability - (clampedTime - resolvedTime) * deltaTime);
    resolvedTime = clampedTime;
  };

  asteroids.forEach(asteroid => {
    const contactTime = movingObjectPlayerIntersectionTime(
      asteroid.previousPosition.x, asteroid.previousPosition.y, asteroid.previousPosition.z,
      asteroid.mesh.position.x, asteroid.mesh.position.y, asteroid.mesh.position.z,
      asteroid.radius
    );
    if (Number.isFinite(contactTime)) events.push({ time: contactTime, type: 'player-asteroid', target: asteroid });
  });

  enemies.forEach(enemy => {
    const contactTime = movingEnemyPlayerIntersectionTime(enemy);
    if (Number.isFinite(contactTime)) events.push({ time: contactTime, type: 'player-enemy', target: enemy });

    if (Number.isFinite(enemy.fireTime)) {
      const fireZ = THREE.MathUtils.lerp(enemy.previousPosition.z, enemy.mesh.position.z, enemy.fireTime);
      if (fireZ > -48 && fireZ < -5) events.push({ time: enemy.fireTime, type: 'enemy-fire', target: enemy });
    }
  });

  playerBullets.forEach(bullet => {
    enemies.forEach(enemy => {
      const hitTime = movingPlayerBulletEnemyIntersectionTime(
        bullet.previousPosition.x, bullet.previousPosition.y, bullet.previousPosition.z,
        bullet.mesh.position.x, bullet.mesh.position.y, bullet.mesh.position.z,
        enemy,
        PLAYER_BULLET_RADIUS
      );
      if (Number.isFinite(hitTime) && hitTime <= bullet.validThrough) {
        events.push({ time: hitTime, type: 'bullet-enemy', bullet, target: enemy });
      }
    });

    asteroids.forEach(asteroid => {
      const hitTime = segmentSphereIntersectionTime(
        bullet.previousPosition.x - asteroid.previousPosition.x,
        bullet.previousPosition.y - asteroid.previousPosition.y,
        bullet.previousPosition.z - asteroid.previousPosition.z,
        bullet.mesh.position.x - asteroid.mesh.position.x,
        bullet.mesh.position.y - asteroid.mesh.position.y,
        bullet.mesh.position.z - asteroid.mesh.position.z,
        0, 0, 0,
        asteroid.radius + PLAYER_BULLET_RADIUS
      );
      if (Number.isFinite(hitTime) && hitTime <= bullet.validThrough) {
        events.push({ time: hitTime, type: 'bullet-asteroid', bullet, target: asteroid });
      }
    });
  });

  enemyBullets.forEach(bullet => {
    const movementDelta = deltaTime * (bullet.stepFraction ?? 1);
    const projectedPosition = bullet.mesh.position.clone().addScaledVector(bullet.velocity, movementDelta);
    let validThrough = 1;

    if (bullet.age >= 5) {
      validThrough = 0;
    } else if (bullet.age + movementDelta >= 5) {
      validThrough = Math.min(validThrough, (5 - bullet.age) / movementDelta);
    }

    if (bullet.mesh.position.z >= 19) {
      validThrough = 0;
    } else if (projectedPosition.z >= 19) {
      const rangeTime = (19 - bullet.mesh.position.z) / (projectedPosition.z - bullet.mesh.position.z);
      validThrough = Math.min(validThrough, THREE.MathUtils.clamp(rangeTime, 0, 1));
    }

    const hitTime = movingObjectPlayerIntersectionTime(
      bullet.mesh.position.x, bullet.mesh.position.y, bullet.mesh.position.z,
      projectedPosition.x, projectedPosition.y, projectedPosition.z,
      0.14
    );
    if (Number.isFinite(hitTime) && hitTime <= validThrough) {
      events.push({ time: hitTime, type: 'enemy-bullet-player', bullet, projectedPosition });
    }
  });

  const priority = {
    'enemy-fire': 0,
    'enemy-bullet-player': 1,
    'player-asteroid': 1,
    'player-enemy': 1,
    'bullet-asteroid': 2,
    'bullet-enemy': 2
  };
  events.sort((first, second) => first.time - second.time || priority[first.type] - priority[second.type]);

  for (const event of events) {
    advanceStepClock(event.time);

    if (event.type === 'enemy-fire') {
      if (!enemies.includes(event.target)) continue;
      const origin = event.target.previousPosition.clone().lerp(event.target.mesh.position, event.time);
      const target = previousShipPosition.clone().lerp(currentShip.position, event.time);
      spawnEnemyBullet(event.target, origin, target, 1 - event.time);
      event.target.shootTimer = THREE.MathUtils.randFloat(1.65, 2.45);
      event.target.fireTime = Infinity;
      continue;
    }

    if (event.type === 'enemy-bullet-player') {
      if (!enemyBullets.includes(event.bullet)) continue;
      const impactPosition = event.bullet.mesh.position.clone().lerp(event.projectedPosition, event.time);
      removeEnemyBullet(event.bullet);
      damageShip(impactPosition);
      if (state !== 'playing') return;
      continue;
    }

    if (event.type === 'player-asteroid') {
      const asteroidIndex = asteroids.indexOf(event.target);
      if (asteroidIndex < 0) continue;
      const impactPosition = event.target.previousPosition.clone().lerp(event.target.mesh.position, event.time);
      removeDebugHitbox(event.target);
      scene.remove(event.target.mesh);
      asteroids.splice(asteroidIndex, 1);
      damageShip(impactPosition);
      if (state !== 'playing') return;
      continue;
    }

    if (event.type === 'player-enemy') {
      const enemyIndex = enemies.indexOf(event.target);
      if (enemyIndex < 0) continue;
      const impactPosition = event.target.previousPosition.clone().lerp(event.target.mesh.position, event.time);
      createBurst(impactPosition, 'sparkPink', 10, 7);
      removeDebugHitbox(event.target);
      removeComplexMesh(event.target.mesh);
      enemies.splice(enemyIndex, 1);
      damageShip(impactPosition);
      if (state !== 'playing') return;
      continue;
    }

    if (!playerBullets.includes(event.bullet)) continue;
    const impactPosition = event.bullet.previousPosition.clone().lerp(event.bullet.mesh.position, event.time);

    if (event.type === 'bullet-enemy') {
      const enemyIndex = enemies.indexOf(event.target);
      if (enemyIndex < 0) continue;
      removePlayerBullet(event.bullet);
      event.target.health -= 1;
      event.target.hitFlash = 0.18;
      createBurst(impactPosition, 'sparkCyan', 4, 3.5);
      if (event.target.health <= 0) destroyEnemy(enemyIndex);
      continue;
    }

    const asteroidIndex = asteroids.indexOf(event.target);
    if (asteroidIndex < 0) continue;
    removePlayerBullet(event.bullet);
    if (event.target.destructible) {
      destroyAsteroid(asteroidIndex);
    } else {
      createBurst(impactPosition, 'sparkOrange', 4, 2.5);
    }
  }

  advanceStepClock(1);
}

function cleanupExpiredPlayerBullets() {
  for (let index = playerBullets.length - 1; index >= 0; index -= 1) {
    const bullet = playerBullets[index];
    if (bullet.age >= 3 || bullet.mesh.position.z <= -140) removePlayerBullet(bullet);
  }
}

function updateEnemyBullets(deltaTime) {
  for (let index = enemyBullets.length - 1; index >= 0; index -= 1) {
    const bullet = enemyBullets[index];
    const movementDelta = deltaTime * (bullet.stepFraction ?? 1);
    bullet.stepFraction = 1;

    bullet.mesh.position.addScaledVector(bullet.velocity, movementDelta);
    bullet.hitbox.position.copy(bullet.mesh.position);
    bullet.age += movementDelta;
    bullet.mesh.rotation.z += movementDelta * 6;

    if (bullet.age >= 5 || bullet.mesh.position.z >= 19) removeEnemyBullet(bullet);
  }
}

function updateEffects(deltaTime) {
  for (let index = effects.length - 1; index >= 0; index -= 1) {
    const effect = effects[index];
    effect.life -= deltaTime;
    effect.mesh.position.addScaledVector(effect.velocity, deltaTime);
    effect.velocity.multiplyScalar(Math.pow(0.12, deltaTime));
    effect.mesh.rotation.x += deltaTime * 5;
    effect.mesh.rotation.y += deltaTime * 7;

    const lifeRatio = Math.max(0, effect.life / effect.maxLife);
    effect.mesh.scale.setScalar(lifeRatio);

    if (effect.life <= 0) {
      scene.remove(effect.mesh);
      effects.splice(index, 1);
    }
  }
}

function updateCamera(deltaTime) {
  if (!currentShip) return;

  cameraTarget.set(
    currentShip.position.x * 0.17,
    4.8 + currentShip.position.y * 0.1,
    13.2
  );
  camera.position.lerp(cameraTarget, 1 - Math.exp(-3.6 * deltaTime));

  cameraLookTarget.set(
    currentShip.position.x * 0.1,
    currentShip.position.y * 0.12 - 0.2,
    -18
  );
  camera.lookAt(cameraLookTarget);
  camera.updateMatrixWorld();

  tempC.set(currentShip.position.x, currentShip.position.y, -35).project(camera);
  crosshair.style.left = `${(tempC.x * 0.5 + 0.5) * 100}%`;
  crosshair.style.top = `${(-tempC.y * 0.5 + 0.5) * 100}%`;
}

function updateBackground(deltaTime, speed) {
  if (!starPositions) return;

  const positions = starPositions.array;
  for (let index = 2; index < positions.length; index += 3) {
    positions[index] += speed * deltaTime;
    if (positions[index] > 18) positions[index] = -155;
  }
  starPositions.needsUpdate = true;

  if (planet) planet.rotation.y += deltaTime * 0.025;
  if (planetRing) planetRing.rotation.z += deltaTime * 0.006;
}

function updateHud() {
  scoreValue.textContent = Math.floor(score).toLocaleString();
  distanceValue.textContent = `${Math.floor(distanceTravelled).toLocaleString()} m`;
  difficultyValue.textContent = difficulty;

  shieldPips.forEach((pip, index) => pip.classList.toggle('empty', index >= shields));
  shieldPipsContainer.setAttribute('aria-label', `${Math.max(0, shields)} of ${maxShields} shields remaining`);

  heatFill.style.width = `${heat}%`;
  overheatLabel.textContent = overheated ? 'OVERHEATED' : heat > 70 ? 'HOT' : 'READY';
  overheatLabel.style.color = overheated ? '#ff536f' : heat > 70 ? '#ffd052' : '#4defff';
}

function updateGame(deltaTime) {
  const config = DIFFICULTIES[difficulty];
  const worldSpeed = BASE_WORLD_SPEED * config.speedMultiplier;

  elapsedRunTime += deltaTime;
  distanceTravelled += worldSpeed * deltaTime;
  score += deltaTime * 5;

  updateInput(deltaTime);
  updateWeapons(deltaTime);
  updateSpawning(deltaTime, config);
  updateAsteroids(deltaTime, worldSpeed);
  updateEnemies(deltaTime, worldSpeed);
  updatePlayerBullets(deltaTime);
  resolveStepEvents(deltaTime);
  if (state !== 'playing') return;
  if (currentShip) {
    currentShip.visible = invulnerability <= 0 || Math.floor(invulnerability * 14) % 2 === 0;
  }
  cleanupExpiredPlayerBullets();
  resolveAsteroidPasses();
  resolveEnemyPasses();
  updateEnemyBullets(deltaTime);
  if (state !== 'playing') return;
  updateCamera(deltaTime);
  updateHud();
}

function movingObjectPlayerIntersectionTime(oldX, oldY, oldZ, newX, newY, newZ, objectRadius) {
  if (!currentShip) return Infinity;

  const colliders = SHIP_COLLIDERS[shipType];
  let closestHit = Infinity;
  colliders.forEach(collider => {
    tempA.set(collider.x, collider.y, collider.z).applyQuaternion(previousShipQuaternion);
    tempB.set(collider.x, collider.y, collider.z).applyQuaternion(currentShip.quaternion);

    const relativeOldX = oldX - previousShipPosition.x - tempA.x;
    const relativeOldY = oldY - previousShipPosition.y - tempA.y;
    const relativeOldZ = oldZ - previousShipPosition.z - tempA.z;
    const relativeNewX = newX - currentShip.position.x - tempB.x;
    const relativeNewY = newY - currentShip.position.y - tempB.y;
    const relativeNewZ = newZ - currentShip.position.z - tempB.z;
    const combinedRadius = objectRadius + collider.radius;
    const hitTime = segmentSphereIntersectionTime(
      relativeOldX, relativeOldY, relativeOldZ,
      relativeNewX, relativeNewY, relativeNewZ,
      0, 0, 0,
      combinedRadius
    );
    closestHit = Math.min(closestHit, hitTime);
  });
  return closestHit;
}

function movingEnemyPlayerIntersectionTime(enemy) {
  if (!currentShip) return Infinity;

  let closestHit = Infinity;
  ENEMY_COLLIDERS.forEach(enemyCollider => {
    tempA.set(enemyCollider.x, enemyCollider.y, enemyCollider.z).applyQuaternion(enemy.previousQuaternion);
    const oldEnemyX = enemy.previousPosition.x + tempA.x;
    const oldEnemyY = enemy.previousPosition.y + tempA.y;
    const oldEnemyZ = enemy.previousPosition.z + tempA.z;

    tempB.set(enemyCollider.x, enemyCollider.y, enemyCollider.z).applyQuaternion(enemy.mesh.quaternion);
    const newEnemyX = enemy.mesh.position.x + tempB.x;
    const newEnemyY = enemy.mesh.position.y + tempB.y;
    const newEnemyZ = enemy.mesh.position.z + tempB.z;

    SHIP_COLLIDERS[shipType].forEach(shipCollider => {
      tempC.set(shipCollider.x, shipCollider.y, shipCollider.z).applyQuaternion(previousShipQuaternion);
      tempD.set(shipCollider.x, shipCollider.y, shipCollider.z).applyQuaternion(currentShip.quaternion);
      const combinedRadius = enemyCollider.radius + shipCollider.radius;

      const hitTime = segmentSphereIntersectionTime(
        oldEnemyX - previousShipPosition.x - tempC.x,
        oldEnemyY - previousShipPosition.y - tempC.y,
        oldEnemyZ - previousShipPosition.z - tempC.z,
        newEnemyX - currentShip.position.x - tempD.x,
        newEnemyY - currentShip.position.y - tempD.y,
        newEnemyZ - currentShip.position.z - tempD.z,
        0, 0, 0,
        combinedRadius
      );
      closestHit = Math.min(closestHit, hitTime);
    });
  });
  return closestHit;
}

function movingPlayerBulletEnemyIntersectionTime(oldX, oldY, oldZ, newX, newY, newZ, enemy, projectileRadius) {
  let closestHit = Infinity;

  ENEMY_COLLIDERS.forEach(collider => {
    tempA.set(collider.x, collider.y, collider.z).applyQuaternion(enemy.previousQuaternion);
    tempB.set(collider.x, collider.y, collider.z).applyQuaternion(enemy.mesh.quaternion);
    const hitTime = segmentSphereIntersectionTime(
      oldX - enemy.previousPosition.x - tempA.x,
      oldY - enemy.previousPosition.y - tempA.y,
      oldZ - enemy.previousPosition.z - tempA.z,
      newX - enemy.mesh.position.x - tempB.x,
      newY - enemy.mesh.position.y - tempB.y,
      newZ - enemy.mesh.position.z - tempB.z,
      0, 0, 0,
      collider.radius + projectileRadius
    );
    closestHit = Math.min(closestHit, hitTime);
  });

  return closestHit;
}

function segmentSphereIntersectionTime(ax, ay, az, bx, by, bz, cx, cy, cz, radius) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const fx = ax - cx;
  const fy = ay - cy;
  const fz = az - cz;
  const a = dx * dx + dy * dy + dz * dz;
  const c = fx * fx + fy * fy + fz * fz - radius * radius;

  if (c <= 0) return 0;
  if (a <= Number.EPSILON) return Infinity;

  const b = 2 * (fx * dx + fy * dy + fz * dz);
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return Infinity;

  const root = Math.sqrt(discriminant);
  const first = (-b - root) / (2 * a);
  const second = (-b + root) / (2 * a);
  if (first >= 0 && first <= 1) return first;
  if (second >= 0 && second <= 1) return second;
  return Infinity;
}

function resetInput() {
  const capturedMovementId = movementPointerId;
  const capturedFireId = firePointerId;
  keys.clear();
  pointerFireHeld = false;
  movementPointerId = null;
  firePointerId = null;
  mobileFireButton.classList.remove('pressed');

  try {
    if (capturedMovementId !== null && canvas.hasPointerCapture?.(capturedMovementId)) {
      canvas.releasePointerCapture(capturedMovementId);
    }
    if (capturedFireId !== null && mobileFireButton.hasPointerCapture?.(capturedFireId)) {
      mobileFireButton.releasePointerCapture(capturedFireId);
    }
  } catch {
    // Pointer capture can already be gone after a window or visibility change.
  }
}

function moveTargetFromPointer(event) {
  const rect = canvas.getBoundingClientRect();
  const deltaX = (event.clientX - pointerStartX) / Math.max(1, rect.width);
  const deltaY = (event.clientY - pointerStartY) / Math.max(1, rect.height);
  shipTarget.x = pointerStartShipX + deltaX * flightBounds.x * 2;
  shipTarget.y = pointerStartShipY - deltaY * (flightBounds.maxY - flightBounds.minY);
  shipTarget.x = THREE.MathUtils.clamp(shipTarget.x, -flightBounds.x, flightBounds.x);
  shipTarget.y = THREE.MathUtils.clamp(shipTarget.y, flightBounds.minY, flightBounds.maxY);
}

function resizeRenderer() {
  if (!renderer || !camera) return;

  const width = Math.max(1, container.clientWidth);
  const height = Math.max(1, container.clientHeight);
  const aspect = width / height;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  camera.aspect = aspect;
  camera.fov = aspect < 0.75 ? 68 : 60;
  camera.updateProjectionMatrix();

  const cameraDistanceToShip = 11.2;
  const halfVisibleHeight = cameraDistanceToShip * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
  const halfVisibleWidth = halfVisibleHeight * aspect;
  const shipHalfWidth = shipType === 'alien' ? 2.12 : 1.62;
  const cameraFollowFactor = 0.17;
  const horizontalMargin = 0.28;
  const safeCenterRange = (halfVisibleWidth - shipHalfWidth - horizontalMargin) / (1 - cameraFollowFactor);
  flightBounds.x = THREE.MathUtils.clamp(safeCenterRange, 0.85, 7.2);
  shipTarget.x = THREE.MathUtils.clamp(shipTarget.x, -flightBounds.x, flightBounds.x);
  if (currentShip) {
    currentShip.position.x = THREE.MathUtils.clamp(currentShip.position.x, -flightBounds.x, flightBounds.x);
  }
  updateNavIcon();
}

function animate(time) {
  const rawDelta = lastFrameTime ? (time - lastFrameTime) / 1000 : 0;
  const frameDelta = Math.min(Math.max(rawDelta, 0), MAX_FRAME_DELTA);
  lastFrameTime = time;

  const isActivelyPlaying = state === 'playing' && !gamePaused;
  if (!gamePaused) {
    const backgroundSpeed = isActivelyPlaying
      ? BASE_WORLD_SPEED * DIFFICULTIES[difficulty].speedMultiplier
      : 1.4;
    updateBackground(frameDelta, backgroundSpeed);
  }

  if (isActivelyPlaying) {
    simulationAccumulator = Math.min(simulationAccumulator + frameDelta, MAX_FRAME_DELTA);
    while (simulationAccumulator >= FIXED_TIME_STEP && state === 'playing' && !gamePaused) {
      updateGame(FIXED_TIME_STEP);
      updateEffects(FIXED_TIME_STEP);
      simulationAccumulator -= FIXED_TIME_STEP;
    }

    if (state !== 'playing' || gamePaused) simulationAccumulator = 0;
  } else {
    simulationAccumulator = 0;
    if (camera && state !== 'playing') {
      camera.position.x = Math.sin(time * 0.00016) * 0.35;
      camera.position.y = 4.8 + Math.cos(time * 0.00013) * 0.12;
      camera.lookAt(0, -0.2, -18);
    }
    if (!gamePaused) updateEffects(frameDelta);
  }

  if (renderer && scene && camera) renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

selectShipButton.addEventListener('click', showShipScreen);
selectDifficultyButton.addEventListener('click', showDifficultyScreen);
selectSettingsButton.addEventListener('click', showSettingsScreen);
shipBackButton.addEventListener('click', showStartScreen);
difficultyBackButton.addEventListener('click', showStartScreen);
settingsBackButton.addEventListener('click', showStartScreen);
settingsHitboxesButton.addEventListener('click', toggleHitboxes);
resumeButton.addEventListener('click', resumeGame);
startButton.addEventListener('click', startGame);
retryButton.addEventListener('click', startGame);
homeButton.addEventListener('click', showStartScreen);

shipButtons.forEach(button => {
  button.addEventListener('click', () => {
    shipType = button.dataset.ship;
    resizeRenderer();
    showStartScreen();
  });
});

difficultyButtons.forEach(button => {
  button.addEventListener('click', () => {
    difficulty = button.dataset.diff;
    showStartScreen();
  });
});

const gameplayKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);

window.addEventListener('keydown', event => {
  if (state !== 'playing' || gamePaused) return;
  if (gameplayKeys.has(event.code)) event.preventDefault();
  keys.add(event.code);
});

window.addEventListener('keyup', event => {
  keys.delete(event.code);
});

window.addEventListener('blur', pauseGame);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseGame();
  lastFrameTime = performance.now();
});

canvas.addEventListener('pointerdown', event => {
  if (state !== 'playing' || gamePaused || movementPointerId !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
  movementPointerId = event.pointerId;
  pointerStartX = event.clientX;
  pointerStartY = event.clientY;
  pointerStartShipX = shipTarget.x;
  pointerStartShipY = shipTarget.y;
  canvas.setPointerCapture?.(event.pointerId);
  event.preventDefault();
});

canvas.addEventListener('pointermove', event => {
  if (state !== 'playing' || event.pointerId !== movementPointerId) return;
  moveTargetFromPointer(event);
  event.preventDefault();
});

function endMovementPointer(event) {
  if (event.pointerId !== movementPointerId) return;
  movementPointerId = null;
}

canvas.addEventListener('pointerup', endMovementPointer);
canvas.addEventListener('pointercancel', endMovementPointer);
canvas.addEventListener('lostpointercapture', endMovementPointer);
canvas.addEventListener('contextmenu', event => event.preventDefault());

mobileFireButton.addEventListener('pointerdown', event => {
  if (state !== 'playing' || gamePaused || firePointerId !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
  firePointerId = event.pointerId;
  pointerFireHeld = true;
  mobileFireButton.classList.add('pressed');
  mobileFireButton.setPointerCapture?.(event.pointerId);
  event.preventDefault();
  event.stopPropagation();
});

function endFirePointer(event) {
  if (event.pointerId !== firePointerId) return;
  firePointerId = null;
  pointerFireHeld = false;
  mobileFireButton.classList.remove('pressed');
  event.preventDefault();
  event.stopPropagation();
}

mobileFireButton.addEventListener('pointerup', endFirePointer);
mobileFireButton.addEventListener('pointercancel', endFirePointer);
mobileFireButton.addEventListener('lostpointercapture', endFirePointer);
mobileFireButton.addEventListener('keydown', event => {
  if (event.code !== 'Enter' || state !== 'playing' || gamePaused) return;
  event.preventDefault();
  event.stopPropagation();
  keys.add('Enter');
});
mobileFireButton.addEventListener('keyup', event => {
  if (event.code !== 'Enter') return;
  event.preventDefault();
  event.stopPropagation();
  keys.delete('Enter');
});

window.addEventListener('resize', resizeRenderer);
window.visualViewport?.addEventListener('resize', resizeRenderer);

canvas.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  showWebglError();
});

canvas.addEventListener('webglcontextrestored', () => {
  window.location.reload();
});

if (setupRenderer()) {
  setupScene();
  loadingScreen.classList.remove('active');
  showStartScreen();
  requestAnimationFrame(animate);
}
