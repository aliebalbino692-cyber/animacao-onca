// Direção do episódio 01 — "O Farol da Maré": cada plano define cenário, ação do personagem e câmera em função do tempo
import * as THREE from 'three';
import { clamp, lerp, smooth, easeOut, easeIn, easeInOut, range, wobble } from './lib/util.js';
import { mixSky, SKIES, islandHeight, trailPoint, LIGHTHOUSE } from './lib/world.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const norm = (w) => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

export function timing(tl) {
  const line = (i) => tl.lines[i - 1];
  const word = (text, n = 1) => {
    const k = norm(text); let c = 0;
    for (const w of tl.words) if (norm(w.text) === k && ++c === n) return w.start;
    throw new Error('palavra não encontrada: ' + text);
  };
  const shotStart = (i) => (i === 1 ? 0 : line(i - 1).speechEnd + 0.12);
  return { line, word, shotStart };
}

export const SURVIVAL = (tl) => {
  const { word, line } = timing(tl);
  return [[0, 100], [word('preto'), 85], [word('virou'), 65], [word('preso'), 20], [word('escapei'), 35],
    [word('inteira'), 30], [word('ilha'), 40], [word('farol'), 45], [word('agua'), 55], [word('sinalizador'), 60],
    [word('dias'), 55], [word('mare', 1), 50], [word('engoliu'), 30], [word('escada'), 25], [word('tiro', 2), 15],
    [line(18).start + 0.2, null]];
};

// orienta um objeto: "up" = para onde aponta a cabeça, "face" = para onde olha o rosto
function orient(obj, up, face) {
  const y = up.clone().normalize(), z = face.clone().normalize();
  const x = new THREE.Vector3().crossVectors(y, z).normalize(); z.crossVectors(x, y);
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

export function buildShots(w, tl) {
  const { line, word, shotStart } = timing(tl);
  const { camera, hero, boat, ocean, sky, scene, hemi, sun, interior, island } = w;
  const GAL = LIGHTHOUSE.galleryY;
  const SHIP = V(-60, 0, -360), SMOKE = V(26, islandHeight(26, -12), -12);
  const tmp = new THREE.Vector3();

  const cam = (pos, look, fov = 50, shake = 0, t = 0) => {
    camera.position.copy(pos);
    if (shake) camera.position.add(V(wobble(t, 1, 1) * shake, wobble(t, 1.1, 2) * shake, wobble(t, 0.9, 3) * shake * 0.5));
    camera.fov = fov; camera.lookAt(look);
  };
  const env = (name, extra = {}) => {
    const p = typeof name === 'string' ? SKIES[name] : name; sky.set(p);
    scene.fog.color.set(extra.fog || p.bottom); scene.fog.near = extra.near ?? 80; scene.fog.far = extra.far ?? 900;
  };
  const head = () => { hero.root.updateMatrixWorld(true); return hero.neck.getWorldPosition(new THREE.Vector3()).add(V(0, 0.6, 0)); };
  const handPos = () => { hero.root.updateMatrixWorld(true); return hero.handR.getWorldPosition(new THREE.Vector3()); };

  // ---- barco balançando no mar ----
  const boatOnSea = (t, extraRoll = 0, lift = 0) => {
    const h = ocean.height(0, 0, t), hx = ocean.height(2, 0, t) - ocean.height(-2, 0, t), hz = ocean.height(0, 4, t) - ocean.height(0, -4, t);
    boat.position.set(0, h + 0.1 + lift, 0);
    boat.rotation.set(-Math.atan2(hz, 8) * 0.8, 0, Math.atan2(hx, 4) * 0.8 + extraRoll);
    boat.updateMatrixWorld(true);
  };
  const heroOnBoat = (local, rotY) => {
    hero.root.position.copy(local).applyMatrix4(boat.matrixWorld);
    hero.root.quaternion.copy(boat.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), rotY));
  };
  const HERO_ON_BOAT = V(1.0, 1.1, 2.0);
  const storm = (k) => {
    env(mixSky('day', 'storm', k), { near: lerp(80, 20, k), far: lerp(900, 260, k) });
    ocean.amp = lerp(0.35, 1.5, k); ocean.choppy = lerp(1, 1.8, k);
    ocean.mat.color.set('#' + new THREE.Color('#1f8fb3').lerp(new THREE.Color('#1c3b4a'), k).getHexString());
    hemi.intensity = lerp(1.4, 1.25, k); hemi.color.set('#' + new THREE.Color('#cfe9ff').lerp(new THREE.Color('#8d9aaa'), k).getHexString());
    sun.intensity = lerp(2.6, 1.1, k); sun.color.set('#dfe8f5');
  };
  const underwater = () => {
    sky.set({ top: '#58c3de', mid: '#127392', bottom: '#052434', sunDir: [0, -1, 0], sunColor: '#000000' });
    scene.fog.color.set('#0d5d78'); scene.fog.near = 8; scene.fog.far = 75;
    hemi.color.set('#7fdcff'); hemi.groundColor.set('#06303f'); hemi.intensity = 1.3; sun.intensity = 1.2; sun.color.set('#9fe9ff');
    ocean.amp = 0.9; ocean.mat.color.set('#7fd6ea'); ocean.mat.opacity = 0.7;
  };
  const night = () => {
    env('night', { near: 30, far: 420 });
    ocean.amp = 0.55; ocean.mat.color.set('#1a4a70');
    hemi.color.set('#8ea6e0'); hemi.groundColor.set('#1a2440'); hemi.intensity = 1.3; sun.color.set('#c8d6ff'); sun.intensity = 1.8;
  };
  const interiorLight = (flicker = 0, t = 0) => {
    sky.set({ top: '#000', mid: '#000', bottom: '#000', sunDir: [0, -1, 0], sunColor: '#000' });
    scene.fog.color.set('#1a120b'); scene.fog.near = 6; scene.fog.far = 40;
    hemi.color.set('#ffd9a0'); hemi.groundColor.set('#2a1a0e'); hemi.intensity = 0.55 * (1 - flicker * 0.6 * (0.5 + 0.5 * Math.sin(t * 43) * Math.sin(t * 17)));
    sun.intensity = 0.8; sun.color.set('#ffe6b0');
    interior.lamp.intensity = 30 * (1 - flicker * (0.5 + 0.5 * Math.sin(t * 37) * Math.sin(t * 11)));
  };
  const lighthouseOutside = (seaLevel, k = 0) => {
    env(mixSky('day', 'overcast', k), { near: 150, far: 1100 });
    ocean.level = seaLevel; ocean.amp = lerp(0.5, 0.9, k); ocean.mat.color.set('#2a86a8');
    hemi.intensity = 1.2; sun.intensity = lerp(2.4, 1.3, k);
  };

  const S = [];
  const add = (name, start, run) => S.push({ name, start, run });

  // 1 — "Eu só ia pescar por uma hora."
  add('1-pescando', 0, (c) => {
    c.show('ocean', 'boat', 'hero', 'rod', 'gulls');
    env('day'); ocean.amp = 0.35;
    boatOnSea(c.t);
    const k = range(c.local, 0.6, 1.6);
    k > 0 && k < 1 ? hero.cast(c.t, k) : hero.hold(c.t);
    hero.face(c.local < 1.8 ? 'neutral' : 'happy');
    heroOnBoat(HERO_ON_BOAT, Math.PI / 2);
    w.gulls.update(c.t, V(0, 14, 0));
    const e = easeInOut(range(c.local, 0, c.dur));
    cam(V(lerp(36, 9, e), lerp(34, 4.6, e), lerp(46, 9, e)), V(lerp(0, 1, e), lerp(1, 4.2, e), lerp(0, 2, e)), 50);
    c.fx.title = c.local < 2.2 ? 1 - range(c.local, 1.8, 2.2) : 0;
    c.fx.black = 1 - range(c.local, 0, 0.35);
    c.focus = boat.position;
  });

  // 2 — "Mas o céu ficou preto em minutos."
  add('2-tempestade', shotStart(2), (c) => {
    c.show('ocean', 'boat', 'hero', 'rod', 'rain', 'bolt');
    const tP = word('preto'), k = smooth(range(c.t, c.start, tP + 0.3));
    storm(k);
    boatOnSea(c.t);
    hero.lookUp(c.t, smooth(range(c.local, 0.2, 1.0)));
    hero.armR.rotation.x = -0.9;
    hero.face(c.t < tP ? 'worried' : 'scared');
    heroOnBoat(HERO_ON_BOAT, Math.PI / 2);
    const hp = head();
    const flash = c.t > tP ? Math.max(0, 1 - (c.t - tP) / 0.35) * (Math.sin((c.t - tP) * 60) > -0.3 ? 1 : 0.3) : 0;
    w.bolt.visible = flash > 0.2; w.bolt.position.set(-30, -10, 90);
    sky.uniforms.flash.value = flash * 0.6; hemi.intensity += flash * 3;
    c.fx.flash = flash * 0.45;
    w.rain.update(c.t, camera, smooth(range(c.t, tP - 0.8, tP + 0.4)));
    const e = easeInOut(c.u);
    cam(hp.clone().add(V(lerp(8, 5.5, e), lerp(-0.6, -1.4, e), lerp(3, 1.5, e))), hp.clone().add(V(0, lerp(-0.4, 0.6, e), 0)), 55, 0.08 + flash * 0.4, c.t);
    c.focus = boat.position;
  });

  // 3 — "Uma onda gigante virou meu barco."
  add('3-onda', shotStart(3), (c) => {
    c.show('ocean', 'boat', 'hero', 'rain', 'wave');
    storm(1);
    const tHit = word('virou') + 0.15, before = c.t < tHit, kh = range(c.t, tHit, tHit + 1.4);
    // onda vem por trás (de -x) e passa por cima do barco
    const approach = smooth(range(c.t, c.start, tHit)) * 0.6 + range(c.t, c.start, tHit) * 0.4;
    w.wave.rotation.y = Math.PI / 2;
    w.wave.position.set(lerp(-75, -12, approach) + kh * 30, -2, 0);
    w.wave.scale.setScalar(lerp(1.1, 1.5, approach));
    const roll = easeInOut(kh) * Math.PI * 1.05;
    boatOnSea(c.t, roll, Math.sin(Math.min(1, kh * 1.3) * Math.PI) * 6);
    if (before) {
      hero.idle(c.t); hero.neck.rotation.y = lerp(0, 0.8, smooth(range(c.local, 0.5, 1.0))); hero.neck.rotation.x = -0.2;
      hero.armL.rotation.x = -0.4; hero.armR.rotation.x = -0.4;
      hero.face(c.local < 0.9 ? 'scared' : 'shout');
      heroOnBoat(HERO_ON_BOAT, Math.PI / 2);
      w.rod.visible = true;
    } else {
      // arremessado para fora do barco
      hero.struggle(c.t, 1.2); hero.face('shout');
      const start = HERO_ON_BOAT.clone().applyMatrix4(boat.matrixWorld);
      const k = easeOut(range(c.t, tHit, tHit + 1.3));
      hero.root.position.set(start.x + k * 9, start.y + Math.sin(k * Math.PI) * 6 - k * 6, start.z + k * 2);
      hero.root.rotation.set(k * 2.5, 0, -k * 3.2);
    }
    w.rain.update(c.t, camera, 1);
    const shake = before ? 0.1 + approach * 0.5 : 0.9 * (1 - kh * 0.6);
    const pull = easeOut(range(c.t, tHit - 0.2, tHit + 0.5));
    cam(V(lerp(15, 11, approach) + pull * 4, lerp(1.8, 1.2, approach) + pull * 2, lerp(7, 5, approach)), V(lerp(-6, 0, approach), lerp(8, 11, approach), 1), lerp(62, 70, approach), shake, c.t);
    c.fx.flash = c.t > c.start + c.dur - 0.25 ? range(c.t, c.start + c.dur - 0.25, c.start + c.dur) * 0.9 : 0;
    c.focus = boat.position;
  });

  // 4 — "Eu fiquei preso embaixo dele, sem ar."
  const boatUpside = (t) => {
    boat.position.set(0, ocean.height(0, 0, t) * 0.3 + 0.5, 0); boat.rotation.set(0, 0, Math.PI + Math.sin(t * 1.3) * 0.04);
    boat.updateMatrixWorld(true);
  };
  const TRAP = V(0.6, -6.55, 2.2);
  add('4-preso', shotStart(4), (c) => {
    c.show('ocean', 'boat', 'hero', 'bubbles', 'rays', 'seabed');
    underwater(); boatUpside(c.t);
    hero.struggle(c.t, 1); hero.face(Math.sin(c.t * 3) > 0 ? 'shout' : 'scared');
    hero.root.position.copy(TRAP).add(V(Math.sin(c.t * 9) * 0.08, Math.sin(c.t * 13) * 0.05, 0)); hero.root.rotation.set(0, 0.5, 0);
    w.bubbles.update(c.t, head(), 1.2, 5, 1.6);
    w.rays.position.set(0, -10, 0);
    const e = easeOut(c.u);
    cam(V(lerp(9, 5.5, e), lerp(-11, -8.5, e), lerp(10, 7.5, e)), V(0.6, lerp(-4.5, -3.6, e), 2.2), 58, 0.12, c.t);
    c.fx.arrows = smooth(range(c.local, 0.25, 0.6)); c.fx.redPulse = 0.16 + Math.sin(c.t * 8) * 0.08;
    c.focus = V(0, -3, 0);
  });

  // 5a — "Tirei o colete,"
  const tDive = word('mergulhei'), tEsc = word('escapei');
  add('5-colete', shotStart(5), (c) => {
    c.show('ocean', 'boat', 'hero', 'bubbles', 'rays', 'seabed', 'looseVest');
    underwater(); boatUpside(c.t);
    const k = smooth(range(c.local, 0.25, 1.0));
    hero.idle(c.t); hero.face('determined');
    hero.armL.rotation.set(-1.4 + k * 0.6, 0, -0.6 + k * 1.6); hero.armR.rotation.set(-1.4 + k * 0.6, 0, 0.6 - k * 1.6);
    hero.legL.rotation.x = Math.sin(c.t * 6) * 0.3; hero.legR.rotation.x = -Math.sin(c.t * 6) * 0.3;
    hero.root.position.copy(TRAP).add(V(0, -k * 0.6, 0)); hero.root.rotation.set(0, 0.5, 0);
    hero.vest.visible = false;
    hero.root.updateMatrixWorld(true);
    hero.torso.getWorldPosition(tmp);
    w.looseVest.position.copy(tmp).add(V(0, k * 1.6 + 0.0, k * 0.4)); w.looseVest.rotation.set(k * 0.6, 0.5 + k, k * 0.3);
    w.bubbles.update(c.t, head(), 1, 5, 1);
    w.rays.position.set(0, -10, 0);
    cam(V(lerp(7, 5.5, c.u), -3.0, lerp(11, 9, c.u)), V(0.6, -3.2, 2.2), 45, 0.06, c.t);
    c.focus = V(0, -3, 0);
  });
  // 5b — "mergulhei fundo... e escapei."
  add('5-mergulho', tDive - 0.1, (c) => {
    c.show('ocean', 'boat', 'hero', 'bubbles', 'rays', 'seabed', 'looseVest');
    underwater(); boatUpside(c.t);
    hero.vest.visible = false; hero.face('determined');
    w.looseVest.position.set(0.6, -1.6, 3); w.looseVest.rotation.set(0.6, 1.5, 0.3);
    const T = tEsc - 0.25 - c.start, s = c.local;
    const p1 = range(s, 0, T * 0.35), p2 = range(s, T * 0.35, T * 0.7), p3 = range(s, T * 0.7, T);
    let pos, up, face;
    if (s < T * 0.35) { pos = V(0.6, lerp(-4.5, -13, easeInOut(p1)), 2.2); up = V(Math.sin(p1 * 3), lerp(1, -1, smooth(p1 * 1.5)), 0); face = V(1, 0, 0.4); }
    else if (s < T * 0.7) { pos = V(lerp(0.6, 10, p2), -13 + Math.sin(p2 * 3) * 0.4, 2.2); up = V(1, -0.2, 0); face = V(0, -1, 0); }
    else { pos = V(10 + p3 * 3, lerp(-13, -3, easeIn(p3)), 2.2); up = V(0.3, 1, 0); face = V(1, 0, 0.3); }
    hero.swim(c.t, 1.3); orient(hero.root, up, face); hero.root.position.copy(pos);
    // ao subir, centraliza o corpo
    w.bubbles.update(c.t, pos.clone().add(V(0, 2, 0)), 1.5, 6, 1.4);
    w.rays.position.set(6, -10, 0);
    const hp = head();
    cam(hp.clone().add(V(-2.5, lerp(3, -1.5, smooth(s / T)), 9)), hp, 55, 0.08, c.t);
    c.focus = V(5, -5, 0);
    if (c.t > tEsc - 0.25) {
      // emergindo na superfície
      w.boat.visible = false; w.seabed.visible = false; w.rays.visible = false; w.looseVest.visible = false;
      storm(0.85); ocean.mat.opacity = 0.94; c.show('rain'); w.rain.update(c.t, camera, 0.8);
      const k = range(c.t, tEsc - 0.25, tEsc + 0.5);
      const h = ocean.height(30, 0, c.t);
      hero.tread(c.t); hero.root.rotation.set(0, -0.4, 0);
      hero.root.position.set(30, h - 3.1 - 2.5 * (1 - easeOut(k)) + Math.sin(k * Math.PI) * 0.6, 0);
      hero.face(k < 0.6 ? 'shout' : 'tired');
      w.bubbles.update(c.t, V(30, h - 1.2, 0), 2.0, 1.2, 3);
      const hp2 = head();
      cam(V(32, h + 1.6, 7.5), hp2, 50, 0.15, c.t);
      c.fx.flash = Math.max(0, 0.6 - k * 2);
      c.focus = hero.root.position;
    }
  });

  // 6a — "Nadei a noite inteira,"
  const tAte = word('ate', 1);
  add('6-nado-noite', shotStart(6), (c) => {
    c.show('ocean', 'hero');
    night(); hero.vest.visible = false;
    const x = 60 + c.local * 3.2;
    hero.swim(c.t, 1); orient(hero.root, V(1, 0, 0), V(0, -1, 0));
    hero.root.position.set(x - 2.4, ocean.height(x, 0, c.t) - 0.25, 0);
    hero.face('tired');
    cam(V(x + 4, ocean.height(x, 0, c.t) + 2.2, 7), V(x + 1.2, 0.3, 0), 50, 0.1, c.t);
    c.focus = hero.root.position;
  });
  // 6b — "até sentir areia."
  add('6-areia', tAte - 0.08, (c) => {
    c.show('ocean', 'hero', 'island');
    env(mixSky('night', 'dawn', 0.25), { near: 30, far: 500 });
    ocean.amp = 0.25; ocean.mat.color.set('#1a4d6a');
    hemi.color.set('#9fb5e8'); hemi.intensity = 0.8; sun.intensity = 0.8; sun.color.set('#c9d6ff');
    hero.vest.visible = false;
    const r = lerp(60, 54, easeOut(c.u));
    const p = trailPoint(r); p.y = Math.max(islandHeight(p.x, p.z), ocean.height(p.x, p.z, c.t) - 0.5) + 0.5;
    hero.crawl(c.t); orient(hero.root, V(0, 0.15, -1), V(0, -1, -0.1)); hero.root.position.copy(p);
    hero.face('tired');
    const hp = head();
    cam(hp.clone().add(V(lerp(5.5, 6.5, c.u), lerp(1.0, 1.6, c.u), lerp(-2.0, -3.0, c.u))), hp.clone().add(V(0, -0.4, 1.0)), 50, 0.05, c.t);
    c.focus = p;
  });

  // 7 — "Era uma ilha que não existia em nenhum mapa."
  add('7-ilha', shotStart(7), (c) => {
    c.show('ocean', 'hero', 'island', 'gulls');
    env('dawn', { near: 120, far: 1100 });
    ocean.amp = 0.3; ocean.mat.color.set('#2c7fa0');
    hemi.color.set('#ffd0b0'); hemi.intensity = 1.1; sun.color.set('#ffc28a'); sun.intensity = 2.2;
    hero.vest.visible = false;
    const p = trailPoint(53);
    const k = smooth(range(c.local, 0.1, 0.9));
    const qLie = new THREE.Quaternion(), qUp = new THREE.Quaternion();
    orient(hero.root, V(0, 0.15, -1), V(0, -1, -0.1)); qLie.copy(hero.root.quaternion);
    orient(hero.root, V(0, 1, 0), V(0, 0, -1)); qUp.copy(hero.root.quaternion);
    hero.root.quaternion.slerpQuaternions(qLie, qUp, k);
    hero.idle(c.t); hero.neck.rotation.y = Math.sin(c.local * 1.6) * 0.5 * k; hero.neck.rotation.x = -0.25 * k;
    hero.root.position.copy(p).add(V(0, (1 - k) * 0.5, 0));
    hero.face(c.local < 1 ? 'tired' : 'surprised');
    w.gulls.update(c.t, V(0, 45, 0));
    const e = easeInOut(range(c.local, 0.3, c.dur));
    const hp = head();
    cam(V(lerp(hp.x + 3, 70, e), lerp(hp.y + 1.5, 62, e), lerp(hp.z + 7, 130, e)), V(lerp(hp.x, 0, e), lerp(hp.y, 16, e), lerp(hp.z - 3, 0, e)), lerp(50, 45, e));
    c.focus = V(0, 10, 20);
  });

  // 8 — "No alto, um farol abandonado."
  add('8-trilha', shotStart(8), (c) => {
    c.show('ocean', 'hero', 'island', 'gulls');
    env(mixSky('dawn', 'day', 0.55), { near: 120, far: 1100 });
    ocean.amp = 0.3; hemi.intensity = 1.25; sun.intensity = 2.4; sun.color.set('#ffe0b0');
    hero.vest.visible = false;
    const r = lerp(40, 31, c.u), p = trailPoint(r), p2 = trailPoint(r - 0.5);
    hero.walk(c.t, 1.1); hero.root.position.copy(p);
    hero.root.rotation.set(0, Math.atan2(p2.x - p.x, p2.z - p.z), 0);
    hero.neck.rotation.x = -0.35; hero.face('worried');
    w.gulls.update(c.t, V(0, 44, 0));
    const hp = head();
    cam(hp.clone().add(V(3.5, lerp(0.2, -0.8, c.u), 10)), V(0, lerp(28, 36, c.u), 0), 55, 0.04, c.t);
    c.focus = p;
  });

  // 9a — "Lá dentro: água, comida..."
  const t9b = word('e', 2) - 0.05; // "e um sinalizador"
  const INSIDE = V(-0.8, 0, 4.2);
  add('9-bau', shotStart(9), (c) => {
    c.show('interior', 'hero');
    interiorLight(); hero.vest.visible = false;
    const lidK = easeOut(range(c.local, 0.2, 0.9));
    interior.chestLid.rotation.x = -1.9 * lidK;
    hero.idle(c.t); hero.armL.rotation.x = -1.3 + lidK * -0.5; hero.armR.rotation.x = -1.3 + lidK * -0.5;
    hero.torso.rotation.x = 0.35; hero.face(c.local < 0.8 ? 'worried' : 'happy');
    hero.root.position.copy(INSIDE); hero.root.rotation.set(0, Math.atan2(-2.6 - INSIDE.x, 2.4 - INSIDE.z), 0);
    const e = easeInOut(c.u);
    cam(V(-4.4, lerp(6.0, 5.4, e), lerp(-0.6, 0.8, e)), V(-2.3, 0.8, 2.7), 60);
    c.focus = V(0, 0, 0);
  });
  // 9b — "e um sinalizador com um tiro."
  add('9-sinalizador', t9b, (c) => {
    c.show('interior', 'hero', 'flare');
    interiorLight(); hero.vest.visible = false;
    interior.chestLid.rotation.x = -1.9;
    const k = easeOut(range(c.local, 0, 0.8));
    hero.aim(c.t, -0.6 + k * 0.6); hero.armL.rotation.x = -0.4; hero.armL.rotation.z = 0.1;
    hero.torso.rotation.y = 0.3; hero.face(c.local < 1 ? 'surprised' : 'determined');
    hero.root.position.copy(INSIDE); hero.root.rotation.set(0, 2.95, 0);
    const hp = handPos(), hd = head();
    const look = hp.clone().lerp(hd, 0.25);
    const ry = hero.root.rotation.y, f = V(Math.sin(ry), 0, Math.cos(ry)), sd = V(f.z, 0, -f.x);
    cam(look.clone().add(f.multiplyScalar(lerp(5.0, 3.8, easeOut(c.u)))).add(sd.multiplyScalar(-0.9)).add(V(0, 0.4, 0)), look, 45, 0.03, c.t);
    const tT = word('tiro', 1);
    c.fx.badge = c.t > tT - 0.1 ? { label: 'SINALIZADOR', value: '1 TIRO', k: easeOut(range(c.t, tT - 0.1, tT + 0.25)) } : null;
    c.focus = V(0, 0, 0);
  });

  // 10 — "Na parede, alguém riscou quarenta e dois dias."
  add('10-riscos', shotStart(10), (c) => {
    c.show('interior', 'hero');
    interiorLight(); hero.vest.visible = false;
    interior.column.visible = false;
    hero.idle(c.t); hero.face('worried'); hero.root.position.set(1.6, 0, -2.0); hero.root.rotation.set(0, Math.PI + 0.3, 0);
    const e = easeInOut(c.u);
    const tq = word('quarenta');
    const z = easeInOut(range(c.t, tq - 0.2, tq + 1.2));
    const pos = V(lerp(-2.0, 1.0, e), lerp(3.9, 3.3, e), lerp(-1.6, -2.2, e)).lerp(V(1.75, 2.85, -3.1), z);
    const look = V(lerp(-1.4, 0.8, e), lerp(3.9, 3.4, e), -5.5).lerp(V(1.75, 2.85, -5.5), z);
    cam(pos, look, lerp(50, 40, z), 0.03, c.t);
    c.focus = V(0, 0, 0);
  });

  // 11 — 'E escreveu: "Não confie na maré."'
  add('11-aviso', shotStart(11), (c) => {
    c.show('interior', 'hero');
    const tN = word('nao', 2); interior.column.visible = false;
    interiorLight(c.t > tN ? 1 : 0.2, c.t); hero.vest.visible = false;
    hero.idle(c.t); hero.root.position.set(1.6, 0, -2.0); hero.root.rotation.set(0, Math.PI + 0.3, 0);
    const tEnd = c.start + c.dur;
    if (c.t < tEnd - 0.9) {
      const z = easeInOut(range(c.t, c.start, tEnd - 0.9));
      hero.root.visible = false;
      cam(V(lerp(-0.6, -0.3, z), lerp(2.2, 1.75, z), lerp(1.4, -1.2, z)), V(-0.3, lerp(2.2, 1.75, z), -5.5), 55, 0.03 + z * 0.05, c.t);
      hero.face('worried');
    } else {
      hero.face('scared'); hero.neck.rotation.y = -0.3;
      const hp = head();
      const f = V(Math.sin(hero.root.rotation.y - 0.3), 0, Math.cos(hero.root.rotation.y - 0.3));
      cam(hp.clone().add(f.multiplyScalar(2.8)).add(V(0, 0.1, 0)), hp, 45, 0.1, c.t);
      c.fx.flash = Math.max(0, 0.3 - (c.t - (tEnd - 0.9)));
    }
    c.fx.redPulse = c.t > tN ? 0.25 : 0;
    c.focus = V(0, 0, 0);
  });

  // 12 — "No dia seguinte, a maré engoliu a praia."
  add('12-mare', shotStart(12), (c) => {
    c.show('ocean', 'hero', 'island');
    const tE = word('engoliu');
    lighthouseOutside(lerp(-0.6, 3.6, easeIn(range(c.t, c.start, tE + 1.0))), 0.8);
    ocean.amp = 0.8;
    hero.vest.visible = false;
    const r = lerp(47, 38, c.u), p = trailPoint(r), p2 = trailPoint(r - 0.5);
    hero.run(c.t, 1.6); hero.root.position.copy(p); hero.root.rotation.set(0, Math.atan2(p2.x - p.x, p2.z - p.z), 0);
    hero.face('scared');
    const cp = trailPoint(lerp(30, 27, c.u));
    cam(cp.clone().add(V(-6, 6, 0)), V(p.x, p.y + 1, p.z + 6), 55, 0.12, c.t);
    c.focus = p;
  });

  // 13 — "Corri pela escada do farol."
  add('13-escada', shotStart(13), (c) => {
    c.show('interior', 'hero');
    interiorLight(); hero.vest.visible = false;
    const i = lerp(4, 46, c.u), a = i * 0.32, y = 3.2 + i * 0.28;
    interior.steps.forEach((s, j) => (s.visible = j < i + 1.5));
    hero.run(c.t, 1.8); hero.face('determined');
    hero.root.position.set(Math.cos(a) * 3.2, y + 0.15, Math.sin(a) * 3.2);
    hero.root.rotation.set(0, -a, 0);
    camera.up.set(Math.cos(a + 1), 0, Math.sin(a + 1));
    cam(V(0.01, y + 13, 0), V(Math.cos(a) * 1.2, y, Math.sin(a) * 1.2), 70);
    c.focus = V(0, y, 0);
  });

  // 14 — "Lá de cima, eu vi duas coisas."
  add('14-topo', shotStart(14), (c) => {
    c.show('ocean', 'hero', 'island', 'gulls', 'ship', 'smoke', 'shipSmoke');
    lighthouseOutside(3.6, 0.5); hero.vest.visible = false;
    const k = easeOut(range(c.local, 0, 1.0)), ang = lerp(0.9, 0, k) + Math.PI; // ângulo na galeria (frente para -z)
    hero.root.position.set(Math.sin(ang) * 3.7, GAL, Math.cos(ang) * 3.7);
    if (k < 1) { hero.walk(c.t, 1.2); hero.root.rotation.set(0, ang - Math.PI / 2, 0); }
    else hero.idle(c.t);
    if (k >= 1) hero.root.rotation.set(0, Math.PI, 0);
    hero.face('surprised');
    w.gulls.update(c.t, V(0, GAL - 2, 0)); w.smoke.update(c.t, SMOKE); w.shipSmoke.update(c.t, SHIP.clone().add(V(0, 12, -19)), 20);
    w.ship.position.copy(SHIP); w.ship.rotation.y = Math.PI / 2;
    const a = lerp(-0.6, 2.2, easeInOut(c.u));
    cam(V(Math.sin(a) * 13, GAL + 5, -Math.cos(a) * 13), V(0, GAL + 2.5, -2), 55, 0.05, c.t);
    c.focus = V(0, GAL, 0);
  });

  // 15 — "Um navio, muito longe."
  add('15-navio', shotStart(15), (c) => {
    c.show('ocean', 'island', 'ship', 'shipSmoke', 'smoke');
    lighthouseOutside(3.6, 0.5);
    w.ship.position.copy(SHIP); w.ship.position.y = ocean.height(SHIP.x, SHIP.z, c.t) * 0.3; w.ship.rotation.y = Math.PI / 2;
    w.shipSmoke.update(c.t, SHIP.clone().add(V(19, 12, 0)), 22); w.smoke.update(c.t, SMOKE);
    const z = easeOut(range(c.local, 0.1, 1.2));
    cam(V(0, GAL + 4.6, -4.2), SHIP.clone().add(V(0, 6, 0)), lerp(40, 7, z), 0.05 + z * 0.08, c.t);
    c.fx.vignette = 0.85;
    c.focus = V(0, GAL, 0);
  });

  // 16a — "E fumaça na mata."
  const t16b = word('alguem', 2) - 0.08;
  add('16-fumaca', shotStart(16), (c) => {
    c.show('ocean', 'island', 'ship', 'shipSmoke', 'smoke', 'hero');
    lighthouseOutside(3.6, 0.5); hero.vest.visible = false;
    w.ship.position.copy(SHIP); w.ship.rotation.y = Math.PI / 2;
    w.shipSmoke.update(c.t, SHIP.clone().add(V(19, 12, 0)), 22); w.smoke.update(c.t, SMOKE);
    hero.idle(c.t); hero.root.position.set(0, GAL, -3.7);
    const turn = easeInOut(range(c.local, 0, 0.45));
    hero.root.rotation.set(0, lerp(Math.PI, Math.PI / 2 + 0.6, turn), 0);
    const eye = V(-1.2, GAL + 6, -6.5);
    const look = SHIP.clone().add(V(0, 6, 0)).lerp(SMOKE.clone().add(V(0, 8, 0)), turn);
    cam(eye, look, lerp(30, 40, turn), 0.05, c.t);
    c.focus = V(0, GAL, 0);
  });
  // 16b — "Alguém mais estava vivo."
  add('16-vivo', t16b, (c) => {
    c.show('ocean', 'island', 'smoke', 'hero');
    lighthouseOutside(3.6, 0.5); hero.vest.visible = false;
    w.smoke.update(c.t, SMOKE);
    hero.idle(c.t); hero.root.position.set(0, GAL, -3.7);
    const ry = Math.atan2(SMOKE.x, SMOKE.z + 3.7);
    hero.root.rotation.set(0, ry, 0); hero.neck.rotation.x = 0.15;
    hero.face(c.u < 0.45 ? 'surprised' : 'determined');
    const hp = head(), f = V(Math.sin(ry), 0, Math.cos(ry));
    const side = V(f.z, 0, -f.x);
    cam(hp.clone().add(f.clone().multiplyScalar(lerp(3.6, 2.6, c.u))).add(side.multiplyScalar(0.9)).add(V(0, 0.2, 0)), hp, 45, 0.04, c.t);
    c.focus = V(0, GAL, 0);
  });

  // 17 — "Eu só tenho um tiro."
  add('17-um-tiro', shotStart(17), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', 'smoke');
    lighthouseOutside(3.6, 0.7); hero.vest.visible = false;
    w.smoke.update(c.t, SMOKE);
    hero.root.position.set(0, GAL, -3.7); hero.root.rotation.set(0, Math.PI, 0);
    hero.aim(c.t, -0.1); hero.armR.rotation.z = 0.5; hero.armL.rotation.x = -0.3; hero.face('determined');
    hero.root.updateMatrixWorld(true);
    const hp = handPos(), hd = head();
    const look = hp.clone().lerp(hd, 0.35);
    cam(look.clone().add(V(lerp(-3.2, -2.2, c.u), 0.4, lerp(-2.2, -1.6, c.u))), look, 45, 0.04, c.t);
    c.fx.redPulse = 0.18 + Math.max(0, Math.sin(c.t * 7.5)) * 0.25;
    c.focus = V(0, GAL, 0);
  });

  // 18 — "Atiro pro navio... ou corro até a fumaça?" (tela dividida)
  add('18-escolha', shotStart(18), (c) => {
    c.show('ocean', 'island', 'ship', 'shipSmoke', 'smoke', 'hero', 'flare');
    lighthouseOutside(3.6, 0.6); hero.vest.visible = false;
    w.ship.position.copy(SHIP); w.ship.rotation.y = Math.PI / 2;
    w.shipSmoke.update(c.t, SHIP.clone().add(V(19, 12, 0)), 22); w.smoke.update(c.t, SMOKE);
    hero.root.position.set(0, GAL, -3.7); hero.root.rotation.set(0, Math.PI, 0); hero.aim(c.t, 0.4); hero.face('determined');
    const z = easeOut(c.u);
    c.split = {
      left: () => cam(V(0, GAL + 4.6, -4.2), SHIP.clone().add(V(0, 6, 0)), lerp(14, 9, z), 0.04, c.t),
      right: () => cam(V(3, GAL + 3, -2), SMOKE.clone().add(V(0, 7, 0)), lerp(40, 28, z), 0.04, c.t + 3),
    };
    c.fx.split = { k: easeOut(range(c.local, 0, 0.3)) };
    c.fx.captionY = 1280;
    c.focus = V(0, GAL, 0);
  });

  // 19 — "O que você faria? Comenta aí!"
  add('19-final', shotStart(19), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', 'smoke', 'gulls');
    lighthouseOutside(3.6, 0.6); hero.vest.visible = false;
    w.smoke.update(c.t, SMOKE); w.gulls.update(c.t, V(0, GAL + 2, 0));
    hero.root.position.set(0, GAL, -3.7); hero.root.rotation.set(0, Math.PI, 0);
    hero.idle(c.t); hero.armR.rotation.x = -1.3; hero.armR.rotation.z = 0.7; hero.armL.rotation.x = -0.2;
    hero.neck.rotation.x = Math.sin(range(c.local, 1.0, 1.6) * Math.PI) * 0.25; // aceno com a cabeça
    hero.face(c.local < 1.2 ? 'determined' : 'happy');
    const hp = head();
    cam(V(hp.x + lerp(1.5, 0.6, c.u), hp.y + 0.2, hp.z - lerp(9, 6, easeOut(c.u))), hp.clone().add(V(0, -1.2, 0)), 50, 0.03, c.t);
    c.fx.cta = { k: easeOut(range(c.local, 0.3, 0.7)), part2: c.t > tl.duration - 2.2 };
    c.fx.black = range(c.t, tl.duration - 0.35, tl.duration);
    c.focus = V(0, GAL, 0);
  });

  S.sort((a, b) => a.start - b.start);
  S.forEach((s, i) => (s.end = i + 1 < S.length ? S[i + 1].start : tl.duration + 1));
  return S;
}
