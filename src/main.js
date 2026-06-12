import * as THREE from 'three';
import './style.css';
import { World } from './world.js';
import { Vehicle } from './vehicle.js';
import { Zones } from './zones.js';
import { Controls } from './controls.js';
import { Ambience } from './audio.js';
import { HINTS } from './data.js';

/* ---------- renderer & scene ---------- */

const canvas = document.getElementById('webgl');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 14, 26);
camera.lookAt(0, 0, 0);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(dpr);
});

// adaptive resolution: if the frame rate sags, step the pixel ratio down
// (and back up when it recovers) — keeps weak phones smooth
const maxDpr = Math.min(window.devicePixelRatio, 2);
let dpr = maxDpr;
let qFrames = 0;
let qTime = 0;
function adaptQuality(dt) {
  qFrames++;
  qTime += dt;
  if (qTime < 2) return;
  const fps = qFrames / qTime;
  if (fps < 32 && dpr > 1) {
    dpr = Math.max(1, dpr - 0.25);
    renderer.setPixelRatio(dpr);
  } else if (fps > 55 && dpr < maxDpr) {
    dpr = Math.min(maxDpr, dpr + 0.25);
    renderer.setPixelRatio(dpr);
  }
  qFrames = 0;
  qTime = 0;
}

/* ---------- loading screen ---------- */

const loaderEl = document.getElementById('loader');
const fillEl = document.getElementById('loader-fill');
const pctEl = document.getElementById('loader-pct');
const vespaEl = document.getElementById('loader-vespa');
const startBtn = document.getElementById('start-btn');
const loaderHint = document.getElementById('loader-hint');
const isTouch = window.matchMedia('(pointer: coarse)').matches;
if (isTouch) document.body.classList.add('touch');
loaderHint.textContent = isTouch ? HINTS.mobile : HINTS.desktop;

// split the title into letters for the staggered reveal; letters are grouped
// per word, with a fixed break after the first name: VITO / DI GRIGOLI
const titleEl = document.getElementById('loader-title');
let letterIndex = 0;
const wordHtml = (word) =>
  `<span class="word">${[...word]
    .map((ch) => `<span style="--i:${letterIndex++}">${ch}</span>`)
    .join('')}</span>`;
const [firstName, ...restNames] = titleEl.textContent.trim().split(/\s+/);
titleEl.innerHTML =
  wordHtml(firstName) + '<br>' +
  restNames.map(wordHtml).join('<span class="sp"></span>');

function setProgress(p) {
  const pct = Math.round(p * 100);
  fillEl.style.width = `${pct}%`;
  pctEl.textContent = `${pct}%`;
  vespaEl.style.left = `${pct}%`;
}

// The world is procedural, so "loading" is really building. We construct it in
// staged chunks so the progress bar reflects actual work and the main thread
// never locks long enough to jank the loader animation.
let world, vehicle, zones, controls, ambience;

const buildSteps = [
  ['Shaping the island', () => { world = new World(scene); }],
  ['Warming up the Vespa', () => { vehicle = new Vehicle(scene, world.colliders); }],
  ['Placing the landmarks', () => { zones = new Zones(scene, world); }],
  ['Listening for input', () => {
    controls = new Controls();
    ambience = new Ambience();
  }],
  ['First light', () => {
    renderer.compile(scene, camera);
    renderer.render(scene, camera);
    if (import.meta.env.DEV) {
      window.__vito = {
        get vehicle() { return vehicle; },
        get world() { return world; },
        get renderInfo() { return renderer.info.render; },
        topView: (on = true) => { topView = on; },
      };
    }
  }],
];

let step = 0;
function runBuildStep() {
  if (step < buildSteps.length) {
    const [, fn] = buildSteps[step];
    fn();
    step++;
    setProgress(step / buildSteps.length);
    setTimeout(runBuildStep, 90);
  } else {
    startBtn.disabled = false;
    startBtn.classList.add('ready');
  }
}
setProgress(0);
// wait (briefly) for Inter so the canvas-rendered 3D signs pick it up too;
// if Google Fonts is slow or unreachable, build anyway with the fallback font
Promise.race([
  document.fonts.load('700 90px "Inter"').catch(() => {}),
  new Promise((resolve) => setTimeout(resolve, 2500)),
]).then(() => setTimeout(runBuildStep, 120));

/* ---------- HUD ---------- */

const hud = document.getElementById('hud');
const hudHint = document.getElementById('hud-hint');
const soundBtn = document.getElementById('sound-btn');
const resetBtn = document.getElementById('reset-btn');

soundBtn.addEventListener('click', () => {
  const on = ambience.toggle();
  soundBtn.textContent = on ? '🔊' : '🔇';
});

resetBtn.addEventListener('click', () => vehicle.reset());

const nightBtn = document.getElementById('night-btn');
let night = false;
nightBtn.addEventListener('click', () => {
  night = !night;
  world.setNight(night);
  vehicle.setNight(night);
  zones.setNight(night);
  nightBtn.textContent = night ? '☀️' : '🌙';
});

let started = false;
startBtn.addEventListener('click', () => {
  if (started) return;
  started = true;
  ambience.start();
  soundBtn.textContent = ambience.enabled ? '🔊' : '🔇';
  loaderEl.classList.add('done');
  hud.classList.remove('hidden');
  hudHint.textContent = isTouch ? HINTS.mobile : HINTS.desktop;
  hudHint.classList.add('show');
  setTimeout(() => hudHint.classList.remove('show'), 7000);
  clock.start();
});

/* ---------- camera follow ---------- */

let topView = false;
const camGoal = new THREE.Vector3();
const lookGoal = new THREE.Vector3();
const lookCurrent = new THREE.Vector3(0, 0, 0);

function updateCamera(dt) {
  if (topView) {
    camera.position.set(0, 270, 60);
    camera.lookAt(0, 0, 0);
    return;
  }
  // chase position: behind the vehicle, slightly above
  const back = 13.5;
  const height = 7.5;
  camGoal.set(
    vehicle.position.x - Math.sin(vehicle.heading) * back,
    height,
    vehicle.position.z - Math.cos(vehicle.heading) * back
  );
  // widen the shot a touch with speed
  const speedLift = Math.abs(vehicle.speed) * 0.12;
  camGoal.y += speedLift;

  const posLerp = 1 - Math.exp(-3.2 * dt);
  camera.position.lerp(camGoal, posLerp);

  lookGoal.copy(vehicle.position);
  lookGoal.y += 1.6;
  // look slightly ahead of travel
  lookGoal.x += Math.sin(vehicle.heading) * vehicle.speed * 0.25;
  lookGoal.z += Math.cos(vehicle.heading) * vehicle.speed * 0.25;
  const lookLerp = 1 - Math.exp(-5 * dt);
  lookCurrent.lerp(lookGoal, lookLerp);
  camera.lookAt(lookCurrent);
}

/* ---------- main loop ---------- */

const clock = new THREE.Clock(false);
let elapsed = 0;

renderer.setAnimationLoop(() => {
  if (!world) return;

  // pre-start: slow establishing orbit around the piazza
  if (!started) {
    const t = performance.now() * 0.00012;
    camera.position.set(Math.sin(t) * 30, 16, Math.cos(t) * 30);
    camera.lookAt(0, 1, -6);
    world.update(performance.now() * 0.001, 1 / 60);
    renderer.render(scene, camera);
    return;
  }

  const dt = Math.min(clock.getDelta(), 1 / 20); // clamp tab-switch spikes
  elapsed += dt;

  vehicle.update(dt, controls);
  world.update(elapsed, dt);
  zones.update(elapsed, dt, vehicle.position, camera);
  ambience.setEngine(vehicle.speed);
  updateCamera(dt);
  adaptQuality(dt);

  renderer.render(scene, camera);
});
