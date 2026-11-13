// Direção do episódio 02 — "A Fumaça na Mata" (continuação: o público escolheu B, correr até a fumaça)
import * as THREE from 'three';
import { clamp, lerp, smooth, easeOut, easeIn, easeInOut, range, wobble } from '../lib/util.js';
import { islandHeight, LIGHTHOUSE } from '../lib/world.js';
import { V, timing, orient, makeCam, headOf, handOf, forwardOf } from '../lib/direction.js';
import { makeLia, Campfire, makeDiary, makeVine, makeCanoe, makeBranches, makeGiantTree, makeShipLights, Foam } from './props.js';

export const HUD_OPTS = {
  tag: 'EP. 2 • A FUMAÇA NA MATA',
  next: 'PARTE 3 EM BREVE!',
  title: [['PARTE 2', '#ffd23a'], ['A FUMAÇA', '#ff8a1f']],
  keywords: {
    fumaca: '#ff8a1f', cintura: '#ff3b3b', sinalizador: '#ff8a1f', correnteza: '#3fe0ff', puxou: '#3fe0ff', cipo: '#45f06a',
    forca: '#45f06a', fogueira: '#ff8a1f', ninguem: '#ff3b3b', diario: '#ffd23a', lua: '#ffd23a', cheia: '#ffd23a',
    naufragou: '#3fe0ff', lia: '#ff4fd8', aviso: '#ff3b3b', apagou: '#3fe0ff', pondo: '#ff8a1f', canoa: '#ff8a1f',
    arvore: '#45f06a', gigante: '#45f06a', baixar: '#45f06a', remar: '#ff8a1f', navio: '#ff8a1f',
  },
  onlyInLine: { nao: [], confie: [] },
  lineColors: { 18: { a: '#45f06a', b: '#ff8a1f' } },
  speakers: { 1: { name: 'LIA', color: '#ff4fd8' } },
};

export const SURVIVAL = (tl) => {
  const { word, line } = timing(tl);
  return [[0, 15], [word('cintura'), 10], [word('correnteza'), 5], [word('cipo'), 20], [word('fogueira', 1), 30],
    [word('lua', 1), 25], [word('lia'), 45], [word('aviso'), 50], [word('apagou'), 35], [line(16).start + 0.2, null]];
};

const G = (x, z) => V(x, islandHeight(x, z), z); // ponto no chão da ilha
const SKY = {
  golden: { top: '#3d5f9e', mid: '#f0a870', bottom: '#ffd6a0', sunDir: [1, 0.12, 0.4], sunColor: '#ffe0a0', sunSize: 0.9985 },
  dusk: { top: '#141c46', mid: '#7c3f6a', bottom: '#e57a50', sunDir: [1, 0.03, 0.4], sunColor: '#ff9a50', sunSize: 0.998, stars: 0.3 },
  night: { top: '#03071a', mid: '#0f1f44', bottom: '#20386a', sunDir: [-0.87, 0.45, -0.07], sunColor: '#fff3d0', sunSize: 0.9975, stars: 1 },
  overcast: { top: '#5f6e80', mid: '#9aa7b5', bottom: '#c3ccd6', sunDir: [0, -1, 0], sunColor: '#000000' },
};
const mixSky = (a, b, t) => {
  const A = SKY[a], B = SKY[b], c = (x, y) => '#' + new THREE.Color(x).lerp(new THREE.Color(y), t).getHexString();
  const T = t < 0.5 ? A : B;
  return { top: c(A.top, B.top), mid: c(A.mid, B.mid), bottom: c(A.bottom, B.bottom), sunDir: T.sunDir, sunColor: c(A.sunColor, B.sunColor),
    sunSize: T.sunSize, stars: lerp(A.stars || 0, B.stars || 0, t) };
};

export function buildShots(w, tl) {
  const { line, word, shotStart } = timing(tl);
  const { camera, hero, ocean, sky, scene, hemi, sun, interior, island } = w;
  const cam = makeCam(camera);
  const GAL = LIGHTHOUSE.galleryY;
  const SHIP = V(-60, 0, -360);
  const FIRE = G(26, -12);
  const GT = G(-18, -14);
  const CANOE = V(31, 0, -17);
  const SEA = V(70, 0, -110);

  // ---- objetos do episódio ----
  const lia = makeLia(w.Character); w.extra(lia.root);
  const fire = new Campfire(); fire.group.position.copy(FIRE); w.extra(fire.group);
  const steam = new w.W.Smoke(26, '#eef2f5'); w.extra(steam.mesh);
  const diary = makeDiary(); w.extra(diary);
  const log = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 3.2, 8), new THREE.MeshStandardMaterial({ color: '#6b4426' }));
  log.rotation.z = Math.PI / 2; log.position.copy(FIRE).add(V(0.5, 0.45, 2.6)); log.castShadow = log.receiveShadow = true; w.extra(log);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.2, 0.6), new THREE.MeshStandardMaterial({ color: '#c0452a' }));
  pack.position.copy(FIRE).add(V(-1.6, 0.6, 2.5)); pack.rotation.y = 0.4; pack.castShadow = true; w.extra(pack);
  const canoe = makeCanoe(); w.extra(canoe);
  const branches = makeBranches(); w.extra(branches);
  const giant = makeGiantTree(); giant.position.copy(GT); w.extra(giant);
  const shipLights = makeShipLights(); w.ship.add(shipLights);
  const foam = new Foam(); w.extra(foam.mesh);
  // árvore com o galho de onde pende o cipó
  const L45 = islandHeight(35, -10) + 2.6;           // nível da água na correnteza
  const VINE = V(41, L45 + 10.5, -10.5);              // topo do cipó
  const vineTree = new THREE.Group(); w.extra(vineTree);
  {
    const base = G(44.5, -13.5), bark = new THREE.MeshStandardMaterial({ color: '#5e3d22', flatShading: true });
    const h = VINE.y - base.y + 2;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, h, 8), bark); trunk.position.copy(base).add(V(0, h / 2, 0)); vineTree.add(trunk);
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 6), bark);
    br.position.copy(base.clone().add(V(0, h - 1.2, 0)).lerp(VINE, 0.5)); br.lookAt(VINE); vineTree.add(br);
    const crown = new THREE.Mesh(new THREE.BoxGeometry(7, 4, 7), new THREE.MeshStandardMaterial({ color: '#2f7d32', flatShading: true }));
    crown.position.copy(base).add(V(0, h + 1, 0)); vineTree.add(crown);
    vineTree.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  }
  const vine = makeVine(12); vine.position.copy(VINE); w.extra(vine);
  // abre espaço na mata: esconde árvores/palmeiras na clareira e nos caminhos
  const clear = [FIRE, G(36, -2), G(35, -6), G(38, -10), G(41, -10.5), G(31, -9), CANOE, G(24, -13), G(22, -14)];
  for (const tr of [...island.trees, ...island.palms]) {
    if (clear.some((p) => Math.hypot(tr.position.x - p.x, tr.position.z - p.z) < 5)) tr.visible = false;
    if (Math.hypot(tr.position.x - FIRE.x, tr.position.z - FIRE.z) < 13) tr.visible = false; // clareira
  }

  // ---- iluminação ----
  const env = (p, fog, near, far) => { sky.set(p); scene.fog.color.set(fog || p.bottom); scene.fog.near = near; scene.fog.far = far; };
  const golden = (k = 0) => { // k: 0 = fim de tarde, 1 = pôr do sol
    env(mixSky('golden', 'dusk', k), null, 60, 700);
    hemi.color.set('#ffd2a8'); hemi.groundColor.set('#3a2a1a'); hemi.intensity = lerp(1.15, 0.8, k);
    sun.color.set('#ffb070'); sun.intensity = lerp(2.2, 1.0, k);
    ocean.mat.color.set('#4a7a6a'); ocean.amp = 0.15; ocean.choppy = 0.6;
  };
  const night = () => {
    env(SKY.night, '#1d3462', 40, 650);
    hemi.color.set('#7890d8'); hemi.groundColor.set('#0a0f20'); hemi.intensity = 0.95;
    sun.color.set('#bcd0ff'); sun.intensity = 1.4;
    ocean.mat.color.set('#173a5e'); ocean.amp = 0.25; ocean.choppy = 0.8;
  };
  const interiorLight = () => {
    sky.set({ top: '#000', mid: '#000', bottom: '#000', sunDir: [0, -1, 0], sunColor: '#000' });
    scene.fog.color.set('#1a120b'); scene.fog.near = 6; scene.fog.far = 40;
    hemi.color.set('#ffd9a0'); hemi.groundColor.set('#2a1a0e'); hemi.intensity = 0.55; sun.intensity = 0.8; sun.color.set('#ffe6b0');
  };
  const dressHero = () => { hero.vest.visible = false; };
  const fillAt = (p, i) => { w.fillLight.position.copy(p); w.fillLight.intensity = i; w.fillLight.color.set('#bcd0ff'); w.fillLight.distance = 40; };
  const faceTo = (ch, target) => { const p = ch.root.position; ch.root.rotation.set(0, Math.atan2(target.x - p.x, target.z - p.z), 0); };
  const holdFlareUp = () => { hero.armR.rotation.x = -2.9; hero.armR.rotation.z = 0.1; };

  const S = [];
  const add = (name, start, run) => S.push({ name, start, run });

  // 1a — recapitulação: a escolha do público
  const tDesci = word('desci');
  add('1-recap', 0, (c) => {
    c.show('ocean', 'island', 'ship', 'shipSmoke', 'smoke');
    env(SKY.overcast, '#c3ccd6', 150, 1100); ocean.level = 3.6; ocean.amp = 0.6; ocean.mat.color.set('#2a86a8');
    w.ship.position.copy(SHIP); w.ship.rotation.y = Math.PI / 2; shipLights.visible = false;
    w.shipSmoke.update(c.t, SHIP.clone().add(V(19, 12, 0)), 22); w.smoke.update(c.t, FIRE);
    c.split = {
      left: () => cam(V(0, GAL + 4.6, -4.2), SHIP.clone().add(V(0, 6, 0)), 10, 0.03, c.t),
      right: () => cam(V(3, GAL + 3, -2), FIRE.clone().add(V(0, 7, 0)), lerp(32, 24, c.u), 0.03, c.t + 3),
    };
    c.fx.split = { k: 1, pick: 'B', a: { l1: 'DISPARAR O', l2: 'SINALIZADOR', color: '#45f06a' }, b: { l1: 'CORRER ATÉ', l2: 'A FUMAÇA', color: '#ff8a1f' } };
    c.fx.black = 1 - range(c.local, 0, 0.3);
    c.focus = V(0, GAL, 0);
  });
  // 1b — descendo a escada do farol
  add('1-escada', tDesci - 0.1, (c) => {
    c.show('interior', 'hero', 'flare'); interiorLight(); dressHero();
    const i = lerp(46, 6, c.u), a = i * 0.32, y = 3.2 + i * 0.28;
    interior.steps.forEach((s, j) => (s.visible = j < i + 1.5));
    hero.run(c.t, 1.8); hero.face('determined');
    hero.root.position.set(Math.cos(a) * 3.2, y + 0.15, Math.sin(a) * 3.2);
    hero.root.rotation.set(0, -a + Math.PI, 0);
    camera.up.set(Math.cos(a + 1), 0, Math.sin(a + 1));
    cam(V(0.01, y + 13, 0), V(Math.cos(a) * 1.2, y, Math.sin(a) * 1.2), 70);
    c.fx.title = c.local < 1.5 ? 1 - range(c.local, 1.2, 1.5) : 0;
    c.focus = V(0, y, 0);
  });

  // 2 — "A água já batia na minha cintura."
  add('2-cintura', shotStart(2), (c) => {
    c.show('ocean', 'island', 'hero', 'flare'); golden(); dressHero();
    const p = G(lerp(37.5, 35.8, c.u), lerp(-0.5, -2.2, c.u));
    ocean.level = islandHeight(35.8, -2.2) + 2.5;
    hero.wade(c.t); holdFlareUp(); hero.face(c.u < 0.4 ? 'worried' : 'scared');
    hero.root.position.copy(p); faceTo(hero, FIRE);
    const f = forwardOf(hero), hd = headOf(hero);
    cam(p.clone().add(f.clone().multiplyScalar(lerp(9, 7, c.u))).setY(ocean.level + 0.7).add(V(f.z * 2, 0, -f.x * 2)), hd.clone().add(V(0, -0.8, 0)), 55, 0.05, c.t);
    c.focus = p;
  });

  // 3 — "Ergui o sinalizador pra não molhar... e entrei na mata."
  add('3-mata', shotStart(3), (c) => {
    c.show('ocean', 'island', 'hero', 'flare'); golden(0.1); dressHero();
    const p = G(lerp(37, 34.5, c.u), lerp(-5, -8.5, c.u));
    ocean.level = islandHeight(34.5, -8.5) + 2.4;
    hero.wade(c.t, 0.9); holdFlareUp(); hero.face('determined');
    hero.root.position.copy(p); faceTo(hero, G(30, -12));
    const f = forwardOf(hero), side = V(f.z, 0, -f.x);
    cam(p.clone().add(side.multiplyScalar(-13)).add(f.clone().multiplyScalar(2)).setY(ocean.level + 2.0), p.clone().add(V(0, 3.4, 0)), 50, 0.04, c.t);
    c.focus = p;
  });

  // 4 — "Do nada, a correnteza me puxou!"
  add('4-correnteza', shotStart(4), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', foam.mesh, vineTree, vine); golden(0.15); dressHero();
    ocean.level = L45; ocean.amp = 0.4; ocean.choppy = 1.6;
    const tC = word('correnteza') - 0.2, k = easeIn(range(c.t, tC, c.start + c.dur));
    const x = lerp(35, 40, k) + (c.t < tC ? 0 : Math.sin(c.t * 9) * 0.15);
    const p = V(x, L45 - 3.4 + Math.sin(c.t * 7) * 0.15, -10.5);
    if (c.t < tC) { hero.wade(c.t); holdFlareUp(); hero.face('determined'); hero.root.position.copy(G(35, -10)); hero.root.rotation.set(0, -Math.PI / 2 + 0.3, 0); }
    else { hero.struggle(c.t, 1.1); holdFlareUp(); hero.face('shout'); hero.root.position.copy(p); orient(hero.root, V(-0.55, 1, 0.1), V(0.2, 0, 1)); }
    foam.update(c.t, V(38, 0, -10.5), ocean.level, [1, 0], c.t < tC ? 3 : 14, 14);
    const hp = headOf(hero);
    cam(hp.clone().add(V(lerp(3, 4.5, k), 1.2, 8)), hp.clone().add(V(1, -0.6, 0)), 55, c.t < tC ? 0.05 : 0.35, c.t);
    c.fx.flow = smooth(range(c.t, tC, tC + 0.3)) * 0.9;
    c.focus = p;
  });

  // 5 — "Me agarrei num cipó com toda a força."
  add('5-cipo', shotStart(5), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', foam.mesh, vineTree, vine); golden(0.2); dressHero();
    ocean.level = L45; ocean.amp = 0.4; ocean.choppy = 1.6;
    const grip = V(VINE.x, L45 + 0.4, VINE.z);
    const pull = easeInOut(range(c.local, c.dur * 0.55, c.dur));
    const up = V(-1, 0.15, 0.05).lerp(V(0, 1, 0), pull), face = V(0, 0.2, 1);
    hero.reset();
    const shake = Math.sin(c.t * 22) * 0.06 * (1 - pull);
    hero.armL.rotation.x = -Math.PI + shake; hero.armR.rotation.x = -Math.PI - shake;
    hero.armR.rotation.x = lerp(-Math.PI, -2.9, pull); // ao subir, volta a erguer o sinalizador
    hero.legL.rotation.x = Math.sin(c.t * 9) * 0.4 * (1 - pull); hero.legR.rotation.x = -Math.sin(c.t * 9) * 0.4 * (1 - pull);
    hero.face(pull < 0.5 ? 'shout' : 'determined');
    orient(hero.root, up, face);
    const reach = 5.7; // dos pés até as mãos erguidas
    const hangRoot = grip.clone().sub(up.clone().normalize().multiplyScalar(reach));
    const standRoot = V(VINE.x - 0.4, L45 - 3.5, VINE.z + 0.2);
    hero.root.position.copy(pull > 0 ? hangRoot.lerp(standRoot, pull) : hangRoot);
    foam.update(c.t, V(42, 0, -10.5), ocean.level, [1, 0], 14 * (1 - pull * 0.7), 14);
    const e = easeInOut(c.u);
    cam(grip.clone().add(V(lerp(1.6, 4, e), lerp(0.6, 1.8, e), lerp(3.2, 10, e))), grip.clone().add(V(lerp(0.2, 1.5, e), lerp(0, -1, e), 0)), 50, 0.2 * (1 - pull), c.t);
    c.fx.flow = (1 - smooth(range(c.local, 0, c.dur * 0.5))) * 0.8;
    c.focus = grip;
  });

  // 6 — "Cheguei na fumaça: uma fogueira... e ninguém."
  add('6-fogueira', shotStart(6), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', fire.group, w.smoke, log, pack, diary); golden(0.3); dressHero();
    ocean.level = FIRE.y - 0.75;
    fire.update(c.t); w.smoke.update(c.t, FIRE.clone().add(V(0, 1.5, 0)), 24, [6, 0, -2], 0.3);
    diary.position.copy(log.position).add(V(-0.6, 0.55, 0)); diary.rotation.set(0, 0.3, 0);
    const k = easeOut(range(c.local, 0, c.dur * 0.6));
    const p = G(lerp(31.5, 28.6, k), lerp(-8.5, -10.4, k));
    k < 1 ? hero.walk(c.t, 0.9) : hero.idle(c.t);
    hero.root.position.copy(p); faceTo(hero, FIRE);
    hero.neck.rotation.y = Math.sin(c.local * 2.2) * 0.6 * range(c.local, c.dur * 0.5, c.dur);
    hero.face(c.t > word('ninguem') - 0.2 ? 'surprised' : 'worried');
    const a = lerp(Math.PI + 0.5, Math.PI - 0.2, easeInOut(c.u));
    cam(FIRE.clone().add(V(Math.cos(a) * 11, 4.0, Math.sin(a) * 11)), FIRE.clone().add(V(2, 2.0, 0.5)), 50, 0.03, c.t);
    c.focus = FIRE;
  });

  // 7 — "Do lado, um diário. Dia quarenta e dois."
  const DAVI_AT_FIRE = G(27.4, -9.6);
  const diaryHeld = (c) => {
    hero.root.updateMatrixWorld(true);
    const hd = headOf(hero), f = forwardOf(hero);
    const pos = hd.clone().add(f.clone().multiplyScalar(1.9)).add(V(0, -1.9, 0));
    return { pos, hd, f };
  };
  add('7-diario', shotStart(7), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', fire.group, log, pack, diary); golden(0.35); dressHero();
    ocean.level = FIRE.y - 0.75; fire.update(c.t); w.smoke.update(c.t, FIRE.clone().add(V(0, 1.5, 0)), 30);
    hero.root.position.copy(DAVI_AT_FIRE); faceTo(hero, log.position);
    const pick = range(c.local, 0, 0.9);
    hero.idle(c.t);
    if (pick < 1) { // abaixa e pega
      hero.torso.rotation.x = Math.sin(pick * Math.PI) * 0.7; hero.armL.rotation.x = -Math.sin(pick * Math.PI) * 1.4;
      diary.position.copy(log.position).add(V(-0.6, 0.55 + easeIn(pick) * 1.2, 0)); diary.rotation.set(0, 0.3, 0);
      const hd = headOf(hero);
      cam(hd.clone().add(V(3.5, 1.2, 4.5)), log.position.clone().add(V(-0.6, 0.8, 0)), 48, 0.02, c.t);
    } else { // lendo: câmera sobre o ombro, foco na página "DIA 42"
      hero.armL.rotation.x = -1.25; hero.armR.rotation.x = -0.5; hero.neck.rotation.x = 0.45; hero.face('worried');
      const { pos, hd, f } = diaryHeld(c);
      const side = V(f.z, 0, -f.x);
      const camPos = hd.clone().add(V(0, 0.6, 0)).add(side.clone().multiplyScalar(-0.5)).add(f.clone().multiplyScalar(-0.2));
      diary.position.copy(pos);
      orient(diary, camPos.clone().sub(pos), f.clone().multiplyScalar(-1));
      const leftPage = diary.localToWorld(V(-0.57, 0, 0));
      const z = easeOut(range(c.local, 0.9, 2.2));
      cam(camPos.clone().lerp(leftPage.clone().add(camPos.clone().sub(leftPage).normalize().multiplyScalar(2.6)), z), leftPage, 45, 0.015, c.t);
    }
    c.focus = FIRE;
  });

  // 8a — '"A maré sobe toda lua cheia...'
  const tHoje = word('hoje');
  add('8-pagina', shotStart(8), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', fire.group, log, pack, diary); golden(0.4); dressHero();
    ocean.level = FIRE.y - 0.75; fire.update(c.t); w.smoke.update(c.t, FIRE.clone().add(V(0, 1.5, 0)), 30);
    hero.root.position.copy(DAVI_AT_FIRE); faceTo(hero, log.position); hero.idle(c.t);
    hero.armL.rotation.x = -1.25; hero.armR.rotation.x = -0.5; hero.neck.rotation.x = 0.45;
    const { pos, hd, f } = diaryHeld(c);
    const side = V(f.z, 0, -f.x);
    const camPos = hd.clone().add(V(0, 0.6, 0)).add(side.clone().multiplyScalar(-0.5)).add(f.clone().multiplyScalar(-0.2));
    diary.position.copy(pos);
    orient(diary, camPos.clone().sub(pos), f.clone().multiplyScalar(-1));
    const rightPage = diary.localToWorld(V(0.57, 0, 0));
    const z = easeInOut(range(c.local, 0, 1.6));
    cam(rightPage.clone().add(camPos.clone().sub(rightPage).normalize().multiplyScalar(lerp(2.8, 2.1, z))), rightPage, 45, 0.015, c.t);
    c.fx.vignette = 0.75;
    c.focus = FIRE;
  });
  // 8b — '...E hoje... é lua cheia."' (a lua aparece)
  add('8-lua', tHoje - 0.12, (c) => {
    c.show('ocean', 'island', fire.group, giant); dressHero();
    const k = smooth(range(c.local, 0, 1.5));
    env(mixSky('dusk', 'night', 0.35 + k * 0.4), null, 60, 700); sky.uniforms.sunDir.value.set(-0.87, 0.45, -0.07).normalize();
    sky.uniforms.sunColor.value.set('#fff3d0'); sky.uniforms.sunSize.value = 0.9975;
    hemi.intensity = 0.8; sun.intensity = 1.0; ocean.level = FIRE.y - 0.75; ocean.mat.color.set('#2a4a5a');
    fire.update(c.t);
    const from = FIRE.clone().add(V(6, 2.5, 1));
    const lookA = FIRE.clone().add(V(-12, 3, -1)), lookB = from.clone().add(V(-0.87, 0.45, -0.07).multiplyScalar(100));
    cam(from, lookA.lerp(lookB, easeInOut(range(c.local, 0.1, 1.4))), lerp(55, 38, k), 0.02, c.t);
    c.fx.vignette = 0.8;
    c.focus = FIRE;
  });

  // 9 — "Aí, uma voz atrás de mim..."
  const LIA_HIDE = G(21.2, -13.4);
  add('9-voz', shotStart(9), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', fire.group, log, pack, lia.root); golden(0.6); dressHero();
    ocean.level = FIRE.y - 0.75; fire.update(c.t); w.smoke.update(c.t, FIRE.clone().add(V(0, 1.5, 0)), 30);
    hero.root.position.copy(G(28.2, -11.4)); hero.root.rotation.set(0, Math.PI / 2, 0); hero.idle(c.t);
    hero.face(c.local < 0.5 ? 'worried' : 'scared'); hero.neck.rotation.y = -0.5 * smooth(range(c.local, 1.0, 1.8));
    lia.root.position.copy(LIA_HIDE); faceTo(lia, hero.root.position); lia.idle(c.t); lia.face('determined');
    const hp = headOf(hero), lh = headOf(lia), e = easeOut(c.u);
    cam(hp.clone().add(V(lerp(9, 7, e), lerp(-0.8, -0.5, e), lerp(3.4, 2.8, e))), hp.clone().lerp(lh, 0.35).add(V(0, -0.6, 0)), 50, 0.02, c.t);
    c.focus = FIRE;
  });

  // 10 — Lia: "Você também naufragou?"
  add('10-lia-fala', shotStart(10), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', fire.group, log, pack, lia.root); golden(0.62); dressHero();
    ocean.level = FIRE.y - 0.75; fire.update(c.t); w.smoke.update(c.t, FIRE.clone().add(V(0, 1.5, 0)), 30);
    hero.root.position.copy(G(28.2, -11.4)); hero.root.rotation.set(0, -Math.PI / 2, 0); hero.idle(c.t); hero.face('scared');
    const k = easeOut(range(c.local, 0, 0.8));
    lia.root.position.copy(LIA_HIDE.clone().lerp(G(23, -12.9), k)); faceTo(lia, hero.root.position);
    k < 1 ? lia.walk(c.t, 0.8, 0.4) : lia.idle(c.t);
    lia.armR.rotation.x = -0.3; lia.face('determined'); lia.neck.rotation.z = Math.sin(c.local * 2) * 0.05;
    const lh = headOf(lia), f = forwardOf(lia), side = V(f.z, 0, -f.x);
    cam(lh.clone().add(f.clone().multiplyScalar(lerp(6.0, 4.8, c.u))).add(side.multiplyScalar(0.9)).add(V(0, 0.1, 0)), lh.clone().add(V(0, -0.1, 0)), 45, 0.02, c.t);
    c.focus = FIRE;
  });

  // 11 — "Era Lia. Ela tava ali há quarenta e dois dias."
  const LIA_FIRE = G(24.6, -12.4), DAVI_FACE = G(28.0, -11.2);
  add('11-era-lia', shotStart(11), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', fire.group, log, pack, lia.root); golden(0.65); dressHero();
    ocean.level = FIRE.y - 0.75; fire.update(c.t); w.smoke.update(c.t, FIRE.clone().add(V(0, 1.5, 0)), 30);
    const k = easeOut(range(c.local, 0, 1.0));
    lia.root.position.copy(G(23, -12.9).lerp(LIA_FIRE, k)); faceTo(lia, DAVI_FACE);
    k < 1 ? lia.walk(c.t, 0.8, 0.4) : lia.idle(c.t); lia.face(c.local < 1.6 ? 'neutral' : 'happy');
    hero.root.position.copy(DAVI_FACE); faceTo(hero, LIA_FIRE); hero.idle(c.t); hero.face(c.local < 1.0 ? 'surprised' : 'happy');
    const mid = LIA_FIRE.clone().lerp(DAVI_FACE, 0.5);
    const a = lerp(1.35, 1.65, c.u);
    cam(mid.clone().add(V(Math.cos(a) * 10, 4.2, Math.sin(a) * 10)), mid.clone().add(V(0, 3.3, 0)), 50, 0.02, c.t);
    c.focus = FIRE;
  });

  // 12a — "Foi ela que..." / 12b — "...escreveu o aviso no farol." (lembrança do EP. 1)
  const tEscr = word('escreveu');
  add('12-ela', shotStart(12), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', fire.group, log, pack, lia.root); golden(0.7); dressHero();
    ocean.level = FIRE.y - 0.7; fire.update(c.t); w.smoke.update(c.t, FIRE.clone().add(V(0, 1.5, 0)), 30);
    lia.root.position.copy(LIA_FIRE); faceTo(lia, DAVI_FACE); lia.idle(c.t); lia.face('determined');
    lia.neck.rotation.x = Math.sin(range(c.local, 0.1, 0.9) * Math.PI * 2) * 0.22;
    hero.root.position.copy(DAVI_FACE); faceTo(hero, LIA_FIRE); hero.idle(c.t);
    const lh = headOf(lia), f = forwardOf(lia);
    cam(lh.clone().add(f.multiplyScalar(5.0)).add(V(0.5, -0.2, 0.6)), lh.clone().add(V(0, -0.7, 0)), 45, 0.02, c.t);
    c.focus = FIRE;
  });
  add('12-flashback', tEscr - 0.08, (c) => {
    c.show('interior'); interiorLight(); interior.column.visible = false;
    const z = easeInOut(c.u);
    cam(V(lerp(-0.6, -0.3, z), lerp(2.4, 1.85, z), lerp(1.2, -0.6, z)), V(-0.3, lerp(2.1, 1.75, z), -5.5), 55, 0.02, c.t);
    c.fx.sepia = 1; c.fx.vignette = 0.9;
    c.focus = V(0, 0, 0);
  });

  // 13 — "A água apagou a fogueira. O sol tava se pondo."
  const tApag = word('apagou');
  add('13-apagou', shotStart(13), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', fire.group, log, pack, lia.root, steam.mesh); dressHero();
    golden(0.6 + 0.4 * smooth(c.u));
    ocean.level = lerp(FIRE.y - 0.7, FIRE.y + 0.85, easeInOut(range(c.t, c.start, tApag + 0.5))); ocean.amp = 0.12;
    const out = easeOut(range(c.t, tApag - 0.05, tApag + 0.45));
    fire.update(c.t, out);
    steam.update(c.t - tApag + 10, FIRE.clone().add(V(0, 0.4, 0)), 4 * out, [1.0, 0, -0.5], 0.16); steam.mesh.visible = c.t > tApag - 0.05;
    lia.root.position.copy(LIA_FIRE); faceTo(lia, FIRE); lia.idle(c.t); lia.face('worried');
    hero.root.position.copy(DAVI_FACE); faceTo(hero, FIRE); hero.idle(c.t); hero.face('worried');
    cam(FIRE.clone().add(V(1.2, ocean.level - FIRE.y + 3.2, 13)), FIRE.clone().add(V(0.6, 2.4, 0)), 55, 0.03, c.t);
    c.focus = FIRE;
  });

  // 14 — "Ela tinha uma canoa escondida..."
  add('14-canoa', shotStart(14), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', log, pack, lia.root, canoe, branches); dressHero();
    golden(1); env(mixSky('dusk', 'night', 0.3 + 0.3 * c.u), null, 50, 650); hemi.intensity = 0.85;
    ocean.level = FIRE.y + 0.85; ocean.amp = 0.12;
    const by = Math.sin(c.t * 1.8) * 0.08;
    canoe.position.set(CANOE.x, ocean.level - 0.15 + by, CANOE.z); canoe.rotation.set(0, Math.PI / 2 + 0.2, Math.sin(c.t * 1.3) * 0.03);
    const k = easeInOut(range(c.local, 0.3, 1.3));
    branches.position.copy(canoe.position).add(V(k * 4.5, 0.2 + k * 1.0, k * 1.5)); branches.rotation.set(0, Math.PI / 2 + 0.2 + k * 0.6, -k * 0.5);
    lia.root.position.copy(G(28.8, -13.8)); faceTo(lia, canoe.position); lia.idle(c.t);
    lia.armL.rotation.x = -1.4 + k * 0.5; lia.armR.rotation.x = -1.2 + k * 0.4; lia.torso.rotation.x = -k * 0.25; lia.face('determined');
    hero.root.position.copy(G(28.0, -12.6)); faceTo(hero, canoe.position); hero.idle(c.t); hero.face(k > 0.7 ? 'surprised' : 'neutral');
    fillAt(canoe.position.clone().add(V(2, 5, -9)), 25);
    cam(canoe.position.clone().add(V(2.5, 4.5, -12)), canoe.position.clone().add(V(-0.8, 1.8, 2.5)), 50, 0.02, c.t);
    c.focus = canoe.position;
  });

  // 15 — "...e apontou pra uma árvore gigante no meio da ilha."
  add('15-arvore', shotStart(15), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', lia.root, canoe, giant); dressHero(); night();
    ocean.level = FIRE.y + 0.85;
    canoe.position.set(CANOE.x, ocean.level - 0.15, CANOE.z); canoe.rotation.set(0, Math.PI / 2 + 0.2, 0);
    const LP = G(28.4, -13.6), DP = G(29.6, -11.8);
    lia.root.position.copy(LP); faceTo(lia, GT); lia.point(c.t, smooth(range(c.local, 0.1, 0.6)), 'L'); lia.face('determined');
    hero.root.position.copy(DP); faceTo(hero, GT); hero.idle(c.t); hero.neck.rotation.x = -0.35; hero.face('surprised');
    const e = easeInOut(range(c.local, 0.3, c.dur));
    const back = V(GT.x - LP.x, 0, GT.z - LP.z).normalize();
    const start = LP.clone().add(back.clone().multiplyScalar(-6)).add(V(1.5, 4.6, 2.5));
    const end = LP.clone().add(back.clone().multiplyScalar(-14)).add(V(0, 26, 4));
    cam(start.lerp(end, e), LP.clone().add(V(0, 4, 0)).lerp(GT.clone().add(V(0, 34, 0)), e), lerp(55, 50, e), 0.02, c.t);
    c.focus = V(10, 10, -12);
  });

  // 16/17 — escolha (tela dividida). A: subir na árvore / B: remar atrás do navio
  const SPLIT_A = { l1: 'SUBIR NA', l2: 'ÁRVORE', color: '#45f06a' }, SPLIT_B = { l1: 'REMAR ATRÁS', l2: 'DO NAVIO', color: '#ff8a1f' };
  const choice = (focus) => (c) => {
    c.show('ocean', 'island', 'hero', 'flare', lia.root, canoe, giant, w.ship); dressHero(); night();
    ocean.level = FIRE.y + 0.85; ocean.amp = 0.5; ocean.choppy = 1.2;
    w.ship.position.copy(SHIP); w.ship.rotation.y = Math.PI / 2; shipLights.visible = true;
    const by = Math.sin(c.t * 1.7) * 0.25;
    canoe.position.set(SEA.x, ocean.level - 0.1 + by, SEA.z); canoe.rotation.set(Math.sin(c.t * 1.2) * 0.05, Math.atan2(SHIP.x - SEA.x, SHIP.z - SEA.z), Math.sin(c.t * 1.5) * 0.06);
    canoe.updateMatrixWorld(true);
    const seat = (ch, z) => { ch.root.position.copy(canoe.localToWorld(V(0, -1.55, z))); ch.root.quaternion.copy(canoe.quaternion); };
    hero.paddle(c.t); hero.face('determined'); seat(hero, -1.4);
    lia.paddle(c.t + 0.6); lia.face('determined'); seat(lia, 1.4);
    const z = easeOut(c.u);
    const fwd = V(SHIP.x - SEA.x, 0, SHIP.z - SEA.z).normalize();
    c.split = {
      left: () => cam(GT.clone().add(V(-28, lerp(26, 30, z), -22)), GT.clone().add(V(0, 28, 0)), 66, 0.02, c.t),
      right: () => cam(canoe.position.clone().add(fwd.clone().multiplyScalar(-18)).add(V(3, 6, 0)), canoe.position.clone().add(fwd.clone().multiplyScalar(22)).add(V(0, 1, 0)), 62, 0.04, c.t + 2),
    };
    c.fx.split = { k: easeOut(range(c.local, 0, 0.3)), focus, a: SPLIT_A, b: SPLIT_B };
    c.fx.captionY = 1330;
    c.focus = canoe.position;
  };
  add('16-escolha-A', shotStart(16), choice('A'));
  add('17-escolha-B', shotStart(17), choice('B'));

  // 18 — "O que você faria? Comenta A ou B!"
  add('18-final', shotStart(18), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', lia.root, canoe, giant, log, pack); dressHero(); night();
    ocean.level = FIRE.y + 0.85;
    canoe.position.set(CANOE.x, ocean.level - 0.15, CANOE.z); canoe.rotation.set(0, Math.PI / 2 + 0.2, 0);
    const DP = G(28.6, -11.0), LP = G(28.6, -14.0), camP = V(36.5, 0, -12.6);
    hero.root.position.copy(DP); faceTo(hero, camP); hero.idle(c.t); hero.armR.rotation.x = -1.3; hero.armR.rotation.z = 0.6;
    hero.face(c.local < 1.2 ? 'determined' : 'happy');
    lia.root.position.copy(LP); faceTo(lia, camP); lia.idle(c.t); lia.face(c.local < 1.5 ? 'determined' : 'happy');
    lia.neck.rotation.x = Math.sin(range(c.local, 1.2, 1.8) * Math.PI) * 0.2;
    const mid = DP.clone().lerp(LP, 0.5);
    fillAt(V(37, mid.y + 6, -12.6), 5);
    cam(V(lerp(39.5, 38, easeOut(c.u)), mid.y + 4.8, -12.6), mid.clone().add(V(0, 4.2, 0)), 50, 0.02, c.t);
    c.fx.cta = { k: easeOut(range(c.local, 0.3, 0.7)), part2: c.t > tl.duration - 2.2, y: 1080 };
    c.fx.black = range(c.t, tl.duration - 0.35, tl.duration);
    c.focus = mid;
  });

  S.sort((a, b) => a.start - b.start);
  S.forEach((s, i) => (s.end = i + 1 < S.length ? S[i + 1].start : tl.duration + 1));
  return S;
}
