// Motor: monta a cena, avalia o plano do tempo t e compõe 3D + HUD num canvas 1080x1920
import * as THREE from 'three';
import { Character } from './lib/character.js';
import * as W from './lib/world.js';
import { HUD } from './lib/hud.js';
import { buildShots, SURVIVAL } from './shots.js';

const params = new URLSearchParams(location.search);
const SCALE = parseFloat(params.get('scale') || '1');
const OUT_W = Math.round(1080 * SCALE), OUT_H = Math.round(1920 * SCALE);

const timeline = await (await fetch('./timeline.json')).json();
await document.fonts.load('100px "Lilita One"', 'SOBREVIVÊNCIA ÃÉÇ');

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(OUT_W, OUT_H, false);
renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.autoClear = false;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#bfe3ff', 60, 900);
const camera = new THREE.PerspectiveCamera(50, 9 / 16, 0.1, 4000);
const camera2 = new THREE.PerspectiveCamera(50, 4.5 / 16, 0.1, 4000);

// luzes
const hemi = new THREE.HemisphereLight('#cfe9ff', '#5c4a32', 1.4);
const sun = new THREE.DirectionalLight('#fff3d6', 2.6);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 200 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(hemi, sun, sun.target);
const fillLight = new THREE.PointLight('#ffffff', 0, 40, 1.5); scene.add(fillLight);

// objetos
const sky = new W.Sky(); scene.add(sky.mesh);
const ocean = new W.Ocean(1400, 220); scene.add(ocean.mesh);
const boat = W.makeBoat(); scene.add(boat);
const wave = W.makeGiantWave(); scene.add(wave);
const rain = new W.Rain(); scene.add(rain.mesh);
const bolt = W.makeBolt(3); scene.add(bolt);
const bubbles = new W.Bubbles(140); scene.add(bubbles.mesh);
const rays = W.makeLightRays(9); scene.add(rays);
const island = W.makeIsland(); scene.add(island.group);
const interior = W.makeInterior(); scene.add(interior.group);
const ship = W.makeShip(); scene.add(ship);
const shipSmoke = new W.Smoke(18, '#555a60'); scene.add(shipSmoke.mesh);
const smoke = new W.Smoke(46, '#d0d0d0'); scene.add(smoke.mesh);
const gulls = new W.Gulls(6); scene.add(gulls.group);
const seabed = new THREE.Mesh(new THREE.PlaneGeometry(400, 400, 40, 40).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: '#2d5a5f', flatShading: true, roughness: 1 }));
{ const p = seabed.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, Math.sin(p.getX(i) * 0.1) * 2 + Math.cos(p.getZ(i) * 0.13) * 2); seabed.geometry.computeVertexNormals(); }
seabed.position.y = -40; scene.add(seabed);
const hero = new Character(); scene.add(hero.root);
const rod = W.makeRod(); hero.handR.add(rod);
const flare = W.makeFlareGun(); flare.rotation.x = Math.PI / 2; flare.position.set(0, 0.1, 0.1); hero.handR.add(flare);
const looseVest = hero.vest.clone(); scene.add(looseVest);
const flareShot = new THREE.Group(); scene.add(flareShot);

const world = { THREE, scene, camera, camera2, renderer, hemi, sun, fillLight, sky, ocean, boat, wave, rain, bolt, bubbles, rays,
  island, interior, ship, shipSmoke, smoke, gulls, seabed, hero, rod, flare, looseVest, W };
const toggles = ['boat', 'wave', 'rain', 'bolt', 'bubbles', 'rays', 'ship', 'seabed', 'looseVest'];
const groupOf = { island: island.group, interior: interior.group, shipSmoke: shipSmoke.mesh, smoke: smoke.mesh, gulls: gulls.group,
  ocean: ocean.mesh, rain: rain.mesh, bubbles: bubbles.mesh, hero: hero.root, rod, flare };

const shots = buildShots(world, timeline);
const hud = new HUD(timeline, SURVIVAL(timeline));
const out = document.getElementById('out');
out.width = OUT_W; out.height = OUT_H;
const g = out.getContext('2d');

function resetWorld() {
  for (const k of toggles) (world[k].mesh || world[k]).visible = false;
  for (const k of Object.values(groupOf)) k.visible = false;
  sky.mesh.visible = true; sky.uniforms.flash.value = 0;
  scene.fog.color.set('#bfe3ff'); scene.fog.near = 80; scene.fog.far = 1200;
  hemi.intensity = 1.4; hemi.color.set('#cfe9ff'); hemi.groundColor.set('#5c4a32');
  sun.intensity = 2.6; sun.color.set('#fff3d6'); fillLight.intensity = 0;
  ocean.amp = 0.3; ocean.level = 0; ocean.choppy = 1; ocean.mat.color.set('#1f8fb3'); ocean.mat.opacity = 0.94;
  hero.reset(); hero.face('neutral'); hero.vest.visible = true; hero.root.position.set(0, 0, 0); hero.root.rotation.set(0, 0, 0);
  hero.root.scale.setScalar(1);
  camera.fov = 50; camera.up.set(0, 1, 0); camera.rotation.set(0, 0, 0);
  renderer.toneMappingExposure = 1.05;
  interior.lamp.intensity = 30;
  interior.steps.forEach((st) => (st.visible = false)); interior.column.visible = true;
}

function setSunFor(focus) {
  sun.target.position.copy(focus);
  sun.position.copy(focus).add(new THREE.Vector3(30, 60, 25));
}

export function renderFrame(t) {
  resetWorld();
  const shot = shots.find((s) => t >= s.start && t < s.end) || shots[shots.length - 1];
  const local = t - shot.start, u = Math.min(1, local / (shot.end - shot.start));
  const fx = {};
  const ctx = { t, local, u, fx, start: shot.start, dur: shot.end - shot.start, show: (...names) => names.forEach((n) => ((groupOf[n] || world[n].mesh || world[n]).visible = true)) };
  shot.run(ctx);
  camera.aspect = 9 / 16; camera.updateProjectionMatrix();
  const focus = ctx.focus || hero.root.position;
  setSunFor(focus);
  if (ocean.mesh.visible) ocean.update(t, camera.position.x, camera.position.z);
  sky.mesh.position.copy(camera.position);
  renderer.setScissorTest(false); renderer.setViewport(0, 0, OUT_W, OUT_H); renderer.clear();
  if (ctx.split) {
    // tela dividida: duas câmeras
    renderer.setScissorTest(true);
    const halfW = OUT_W / 2;
    ctx.split.left(); camera.aspect = halfW / OUT_H; camera.updateProjectionMatrix(); sky.mesh.position.copy(camera.position);
    if (ocean.mesh.visible) ocean.update(t, camera.position.x, camera.position.z);
    renderer.setViewport(0, 0, halfW, OUT_H); renderer.setScissor(0, 0, halfW, OUT_H); renderer.render(scene, camera);
    ctx.split.right(); camera.aspect = halfW / OUT_H; camera.updateProjectionMatrix(); sky.mesh.position.copy(camera.position);
    if (ocean.mesh.visible) ocean.update(t, camera.position.x, camera.position.z);
    renderer.setViewport(halfW, 0, halfW, OUT_H); renderer.setScissor(halfW, 0, halfW, OUT_H); renderer.render(scene, camera);
    renderer.setScissorTest(false);
  } else {
    renderer.render(scene, camera);
  }
  g.drawImage(renderer.domElement, 0, 0);
  hud.draw(g, t, fx);
  return shot.name;
}

window.DURATION = timeline.duration;
window.renderFrame = renderFrame;
window.grab = (q = 0.9) => out.toDataURL('image/jpeg', q);
window.READY = true;

// pré-visualização interativa (quando aberto no navegador)
if (!params.has('headless')) {
  const aud = document.getElementById('aud'), seek = document.getElementById('seek'), tm = document.getElementById('time');
  seek.max = timeline.duration;
  let playing = false;
  document.getElementById('play').onclick = () => { playing = !playing; playing ? aud.play() : aud.pause(); };
  seek.oninput = () => { aud.currentTime = +seek.value; renderFrame(+seek.value); };
  const loop = () => { if (playing) { const t = aud.currentTime; seek.value = t; tm.textContent = t.toFixed(2) + 's ' + renderFrame(t); } requestAnimationFrame(loop); };
  renderFrame(+(params.get('t') || 0)); loop();
}
