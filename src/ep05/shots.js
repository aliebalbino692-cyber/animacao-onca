// Direção do episódio 05 — "O Último Tiro" (continuação: o público escolheu A, atirar agora)
import * as THREE from 'three';
import { lerp, smooth, easeOut, easeIn, easeInOut, range } from '../lib/util.js';
import { islandHeight, LIGHTHOUSE } from '../lib/world.js';
import { V, timing, orient, makeCam, headOf, handOf, forwardOf } from '../lib/direction.js';
import { makeLia, makeShipLights, Foam } from '../ep02/props.js';
import { makeBeacon } from '../ep03/props.js';
import { makeFather, makeReefs } from '../ep04/props.js';
import { FlareShot, makeSearchlight, makeLifeboat, makeCrack, Debris } from './props.js';

export const HUD_OPTS = {
  tag: 'EP. 5 • O ÚLTIMO TIRO',
  next: 'PARTE 6 EM BREVE!',
  title: [['PARTE 5', '#ffd23a'], ['O ÚLTIMO TIRO', '#ff3b3b']],
  keywords: {
    atirar: '#45f06a', gatilho: '#ff3b3b', vermelha: '#ff3b3b', noite: '#3fe0ff', nada: '#ff3b3b', holofote: '#ffd23a',
    gente: '#45f06a', buzinou: '#ffd23a', virou: '#45f06a', pedras: '#ff3b3b', recifes: '#ff3b3b', bote: '#ff8a1f',
    tremeu: '#ff3b3b', rachadura: '#ff3b3b', base: '#ff3b3b', andar: '#ff3b3b', escada: '#45f06a', pular: '#ff8a1f', mar: '#ff8a1f',
  },
  onlyInLine: { nao: [], confie: [] },
  lineColors: { 14: { a: '#45f06a', b: '#ff8a1f' } },
  speakers: { 1: { name: 'LIA', color: '#ff4fd8' } },
};

export const SURVIVAL = (tl) => {
  const { word, line } = timing(tl);
  return [[0, 20], [word('vermelha'), 25], [word('nada'), 20], [word('holofote'), 45], [word('buzinou'), 55], [word('gente', 2), 65],
    [word('virou'), 60], [word('bote', 1), 75], [word('tremeu'), 50], [word('rachadura'), 30], [word('andar'), 25], [line(12).start + 0.2, null]];
};

const NIGHT = { top: '#03071a', mid: '#0f1f44', bottom: '#20386a', sunDir: [-0.87, 0.45, -0.07], sunColor: '#fff3d0', sunSize: 0.9975, stars: 1 };

export function buildShots(w, tl) {
  const { line, word, shotStart } = timing(tl);
  const { camera, hero, ocean, sky, scene, hemi, sun, interior } = w;
  const cam = makeCam(camera);
  const LAMP = V(0, LIGHTHOUSE.baseY - 0.5 + LIGHTHOUSE.height + 2.3, 0);
  const GAL = LIGHTHOUSE.galleryY;
  const L1 = 15.5;
  const REEF = V(-18, 0, -105);
  const P0 = V(-34, 0, -198), PC = V(-40, 0, -150), STOP = V(-78, 0, -118);   // rota do navio desviando
  const SHORE = V(-3, 0, -12.5);                                               // onde o bote chega

  // ---- objetos ----
  const lia = makeLia(w.Character); w.extra(lia.root);
  const dad = makeFather(w.Character); w.extra(dad.root);
  const beacon = makeBeacon(0.24, 6); beacon.position.copy(LAMP); w.extra(beacon);
  const shipLights = makeShipLights(); w.ship.add(shipLights);
  const reefs = makeReefs(); w.extra(reefs);
  const foam = new Foam(70); w.extra(foam.mesh);
  const flare = new FlareShot(); w.extra(flare.group); w.extra(flare.trail);
  const search = makeSearchlight(); w.extra(search);
  const boat = makeLifeboat(w.Character); w.extra(boat);
  const crack = makeCrack(LIGHTHOUSE.baseY, LIGHTHOUSE.height - 1, Math.PI); w.extra(crack);
  const dust = new Debris(40, '#d8d0c0', 0.18); w.extra(dust.mesh);
  const chunks = new Debris(18, '#bdb3a2', 0.7); w.extra(chunks.mesh);

  // ---- ajudantes ----
  const fillAt = (p, i, col = '#c8d6ff') => { w.fillLight.position.copy(p); w.fillLight.intensity = i; w.fillLight.color.set(col); w.fillLight.distance = 45; };
  const night = () => {
    sky.set(NIGHT); scene.fog.color.set('#1d3462'); scene.fog.near = 40; scene.fog.far = 700;
    hemi.color.set('#8aa2e6'); hemi.groundColor.set('#0d1428'); hemi.intensity = 1.15;
    sun.color.set('#c4d4ff'); sun.intensity = 1.7;
    ocean.mat.color.set('#1b4268'); ocean.amp = 0.45; ocean.choppy = 1.2; ocean.level = L1;
  };
  const beaconOn = (t) => { const u = beacon.userData; beacon.visible = true; u.beam.rotation.y = t * 0.9; u.light.intensity = 120; };
  const atGallery = (ch, a, r = 3.7) => ch.root.position.set(Math.sin(a) * r, GAL, Math.cos(a) * r);
  const faceTo = (ch, target) => { const p = ch.root.position; ch.root.rotation.set(0, Math.atan2(target.x - p.x, target.z - p.z), 0); };
  const dressHero = () => { hero.vest.visible = false; };
  // rota do navio (Bézier) e posição/rumo
  const shipPath = (k) => { const a = P0.clone().lerp(PC, k), b = PC.clone().lerp(STOP, k); return a.lerp(b, k); };
  const shipAt = (k, t) => {
    w.ship.visible = true; shipLights.visible = true;
    const p = shipPath(k), q = shipPath(Math.min(1, k + 0.02)), dir = q.clone().sub(p);
    w.ship.position.copy(p).setY(L1 - 9.4 + Math.sin(t * 0.8) * 0.3);
    if (dir.lengthSq() > 1e-6) w.ship.rotation.set(0, Math.atan2(dir.x, dir.z), Math.sin(t * 0.6) * 0.02 - (k > 0.1 && k < 0.8 ? 0.06 : 0));
    reefs.visible = true; reefs.position.copy(REEF).setY(L1);
    w.ship.updateMatrixWorld(true);
  };
  const searchOn = (k, target) => { // holofote no passadiço do navio
    search.visible = k > 0; search.position.copy(w.ship.localToWorld(V(0, 11.5, 2)));
    search.lookAt(target); search.userData.cone.material.opacity = 0.3 * k; search.userData.lamp.scale.setScalar((0.3 + 0.7 * k) * 2.2);
  };
  // trajetória do sinalizador: da mão do Davi para o alto, na direção do navio
  const FL0 = V(0.4, GAL + 6.5, -4.6), FLC = V(-6, GAL + 50, -40), FL1 = V(-10, GAL + 62, -70);
  const flarePath = (u) => { u = Math.min(u, 1.4); const a = FL0.clone().lerp(FLC, Math.min(u, 1)), b = FLC.clone().lerp(FL1, Math.min(u, 1)); const p = a.lerp(b, Math.min(u, 1)); if (u > 1) p.add(V(-(u - 1) * 6, -(u - 1) * (u - 1) * 20, -(u - 1) * 8)); return p; };
  const tTiro = word('gatilho') + 0.35;
  const flareU = (t) => (t < tTiro ? 0 : (t - tTiro) / 3.2);
  const showFlare = (c) => { const u = flareU(c.t); if (u <= 0) return; c.show(flare.group, flare.trail); flare.update(flarePath, u, c.t, Math.max(0.2, 1 - (u - 1) * 0.6)); };
  // pose padrão dos três na galeria olhando para o navio
  const trio = (c, look) => {
    atGallery(hero, Math.PI + 0.1); atGallery(lia, Math.PI + 0.55); atGallery(dad, Math.PI - 0.4);
    for (const ch of [hero, lia, dad]) { faceTo(ch, look); ch.idle(c.t); }
  };
  const boatPath = (k) => STOP.clone().add(V(10, 0, 8)).lerp(SHORE, k);
  const boatAt = (k, t, lower = 1) => { // lower: 0 ainda no navio, 1 na água
    boat.visible = true; const p = boatPath(k);
    boat.position.copy(p).setY(lerp(L1 + 6, L1 - 0.2, lower) + Math.sin(t * 1.6) * 0.15);
    const d = SHORE.clone().sub(boatPath(0)); boat.rotation.set(0, Math.atan2(d.x, d.z), Math.sin(t * 1.3) * 0.04);
  };

  const S = [];
  const add = (name, start, run) => S.push({ name, start, run });

  // 1a — recapitulação
  const tEu = word('eu', 1);
  add('1-recap', 0, (c) => {
    c.show('ocean', 'island'); night(); beaconOn(c.t);
    c.split = {
      left: () => { shipAt(0, c.t); cam(V(4, GAL + 3, -6), w.ship.position.clone().add(V(0, 4, 0)).lerp(REEF.clone().setY(L1), 0.4), 30, 0.03, c.t); },
      right: () => { shipAt(0.25, c.t); cam(REEF.clone().add(V(10, L1 + 3, 18)), w.ship.position.clone().add(V(0, 4, 0)).lerp(REEF.clone().setY(L1), 0.5), 50, 0.04, c.t + 2); },
    };
    c.fx.split = { k: 1, pick: 'A', a: { l1: 'ATIRAR', l2: 'AGORA', color: '#45f06a' }, b: { l1: 'ESPERAR', l2: 'MAIS PERTO', color: '#ff8a1f' } };
    c.fx.black = 1 - range(c.local, 0, 0.3);
    c.focus = V(-10, 10, -60);
  });
  // 1b — "Eu mirei pro céu... e puxei o gatilho."
  add('1-mira', tEu - 0.1, (c) => {
    c.show('ocean', 'island', 'hero', 'flare', lia.root, dad.root); night(); beaconOn(c.t); dressHero(); shipAt(0, c.t);
    trio(c, V(-20, GAL, -100));
    const up = easeInOut(range(c.local, 0.1, 1.2));
    hero.armR.rotation.set(lerp(-1.3, -2.75, up), 0, 0.25); hero.armL.rotation.x = -0.4; hero.neck.rotation.x = -0.4 * up; hero.face('determined');
    lia.face('worried'); dad.face('worried');
    const hp = handOf(hero), hd = headOf(hero);
    const fire = c.t > tTiro - 0.05;
    fillAt(hp.clone().add(V(-2, 0, -3)), fire ? 200 * Math.max(0, 1 - (c.t - tTiro) * 3) + 25 : 25, fire ? '#ff6040' : '#c8d6ff');
    cam(hd.clone().add(V(-3.5, -0.4, -2.6)), hp.clone().lerp(hd, 0.3).add(V(0, 0.8, 0)), lerp(52, 44, c.u), 0.02 + (fire ? 0.2 * Math.max(0, 1 - (c.t - tTiro) * 2) : 0), c.t);
    showFlare(c);
    c.fx.flash = fire ? Math.max(0, 0.5 - (c.t - tTiro) * 2) : 0;
    c.focus = V(0, GAL, 0);
  });

  // 2 — "A luz vermelha subiu, rasgando a noite."
  add('2-luz-vermelha', shotStart(2), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', lia.root, dad.root); night(); beaconOn(c.t); dressHero(); shipAt(0.02, c.t);
    trio(c, flarePath(flareU(c.t))); hero.armR.rotation.x = -2.75; for (const ch of [hero, lia, dad]) ch.neck.rotation.x = -0.6;
    hero.face('surprised'); lia.face('surprised'); dad.face('surprised');
    showFlare(c);
    hemi.color.set('#ff9a8a'); hemi.intensity = 1.3; ocean.mat.color.set('#4a2a40');
    const fp = flarePath(flareU(c.t));
    beacon.userData.beam.visible = false;
    cam(V(5.5, GAL + 2.2, -7.5), fp.clone().lerp(V(0, GAL + 4, -4), 0.3), 62, 0.03, c.t);
    c.focus = V(0, GAL, -20);
  });

  // 3 — "Por um segundo... nada."
  add('3-nada', shotStart(3), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', lia.root, dad.root); night(); beaconOn(c.t); dressHero(); shipAt(0.04, c.t);
    trio(c, w.ship.position); hero.face('worried'); lia.face('worried'); dad.face('tired');
    showFlare(c); hemi.color.set('#d4a0b0');
    const a = lerp(Math.PI - 0.55, Math.PI + 0.75, easeInOut(c.u));
    cam(V(Math.sin(a) * 9.5, GAL + 4.4, Math.cos(a) * 9.5), V(Math.sin(a) * 3.7, GAL + 4.2, Math.cos(a) * 3.7), 40, 0.01, c.t);
    fillAt(V(Math.sin(a) * 8, GAL + 5, Math.cos(a) * 8), 18);
    c.fx.vignette = 0.85;
    c.focus = V(0, GAL, 0);
  });

  // 4 — "Então o navio acendeu um holofote. Direto na gente!"
  const tHolo = word('holofote'), tDir = word('direto');
  add('4-holofote', shotStart(4), (c) => {
    c.show('ocean', 'island'); night(); beaconOn(c.t); shipAt(0.06, c.t);
    const k = easeOut(range(c.t, tHolo - 0.3, tHolo + 0.2));
    const sweep = easeInOut(range(c.t, tHolo, tDir));
    searchOn(k, V(-60, 0, -40).lerp(V(0, GAL + 3, 0), sweep));
    showFlare(c);
    cam(V(0.5, GAL + 4.6, -4.5), w.ship.position.clone().add(V(0, 8, 0)), lerp(28, 22, c.u), 0.03, c.t);
    c.fx.flash = sweep > 0.9 ? 0.35 : 0;
    c.focus = V(-20, 10, -100);
  });
  add('4-luz-neles', tDir - 0.1, (c) => {
    c.show('ocean', 'island', 'hero', 'flare', lia.root, dad.root); night(); beaconOn(c.t); dressHero(); shipAt(0.07, c.t);
    searchOn(1, V(0, GAL + 3, 0));
    trio(c, w.ship.position); for (const ch of [hero, lia, dad]) { ch.armL.rotation.x = -1.9; ch.armL.rotation.z = -0.4; }
    hero.face('surprised'); lia.face('surprised'); dad.face('surprised');
    fillAt(V(-3, GAL + 6, -10), 140, '#ffffff');
    cam(V(0.5, GAL + 4.5, -11), V(0, GAL + 3.6, -3), 50, 0.03, c.t);
    c.fx.flash = Math.max(0, 0.45 - c.local * 0.8);
    c.focus = V(0, GAL, 0);
  });

  // 5 — "Ele buzinou três vezes."
  add('5-buzina', shotStart(5), (c) => {
    c.show('ocean', 'island', 'shipSmoke'); night(); beaconOn(c.t); shipAt(0.1, c.t); searchOn(1, V(0, GAL + 3, 0));
    w.shipSmoke.update(c.t, w.ship.localToWorld(V(0, 12.5, -19)), 22);
    cam(V(1.5, GAL + 4, -6), w.ship.position.clone().add(V(0, 7, 0)), 24, 0.03, c.t);
    camera.updateMatrixWorld(true); camera.updateProjectionMatrix();
    const sp = w.ship.localToWorld(V(0, 12, -19)).project(camera);
    const honk = [word('buzinou'), word('tres'), word('vezes')].filter((x) => c.t > x - 0.1);
    if (honk.length) c.fx.rings = { x: (sp.x + 1) * 540, y: (1 - sp.y) * 960, t0: honk[honk.length - 1] - 0.1, k: 1 };
    c.focus = V(-20, 10, -100);
  });

  // 6 — Lia: "Eles viram a gente!"
  add('6-lia', shotStart(6), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', lia.root, dad.root); night(); beaconOn(c.t); dressHero(); shipAt(0.12, c.t); searchOn(1, V(0, GAL + 3, 0));
    trio(c, V(0, GAL, -40));
    const jump = Math.abs(Math.sin(c.t * 6.5)) * 0.8;
    lia.root.position.y += jump; lia.armL.rotation.set(-2.9, 0, -0.3); lia.armR.rotation.set(-2.9, 0, 0.3); lia.face('happy');
    hero.face('happy'); dad.face('happy');
    const lh = headOf(lia), f = forwardOf(lia);
    fillAt(lh.clone().add(f.clone().multiplyScalar(5)), 60, '#ffffff');
    cam(lh.clone().add(f.clone().multiplyScalar(6)).add(V(0.6, -0.4 - jump * 0.5, 0)), lh.clone().add(V(0, -0.8 - jump * 0.6, 0)), 48, 0.02, c.t);
    c.focus = V(0, GAL, 0);
  });

  // 7 — "O navio virou com tudo... e passou raspando pelas pedras."
  add('7-desvio', shotStart(7), (c) => {
    c.show('ocean', 'island', foam.mesh); night(); beaconOn(c.t); ocean.amp = 0.6;
    const k = lerp(0.15, 0.85, easeInOut(c.u)); shipAt(k, c.t); searchOn(0.6, V(0, GAL, 0));
    foam.update(c.t, w.ship.position.clone(), L1, [Math.sin(w.ship.rotation.y), Math.cos(w.ship.rotation.y)], 12, 20);
    const mid = REEF.clone().lerp(w.ship.position, 0.5);
    cam(mid.clone().add(V(45, 70, 40)), mid.clone().setY(L1), 50, 0.02, c.t);
    c.focus = mid;
  });

  // 8 — "Ele parou longe dos recifes e desceu um bote salva-vidas."
  const tBote = word('bote', 1);
  add('8-bote', shotStart(8), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', lia.root, dad.root); night(); beaconOn(c.t); dressHero(); shipAt(1, c.t); searchOn(0.8, V(0, GAL, 0));
    const low = easeInOut(range(c.t, tBote - 0.6, tBote + 0.8)), go = easeInOut(range(c.t, tBote + 0.6, c.start + c.dur));
    boatAt(go * 0.25, c.t, low);
    trio(c, boat.position); hero.face('happy'); lia.face('happy'); dad.face('happy');
    cam(V(-2.5, GAL + 5.5, -6), boat.position.clone().lerp(w.ship.position, 0.3).add(V(0, 3, 0)), 30, 0.02, c.t);
    c.focus = V(-40, 10, -80);
  });

  // 9 — "Mas aí... o farol tremeu."
  const tTrem = word('tremeu');
  add('9-tremeu', shotStart(9), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', lia.root, dad.root, dust.mesh); night(); beaconOn(c.t); dressHero(); shipAt(1, c.t); boatAt(0.4, c.t);
    trio(c, V(0, GAL, -40));
    const q = easeOut(range(c.t, tTrem - 0.5, tTrem));
    for (const ch of [hero, lia, dad]) { ch.armL.rotation.x = -1.4 * q; ch.armR.rotation.x = -1.4 * q; ch.torso.rotation.z = Math.sin(c.t * 25) * 0.05 * q; }
    hero.face(q > 0.3 ? 'scared' : 'happy'); lia.face(q > 0.3 ? 'scared' : 'happy'); dad.face(q > 0.3 ? 'scared' : 'tired');
    dust.update(c.t, V(0, GAL + 7, -3), 4, 8, 1.4); dust.mesh.visible = q > 0;
    fillAt(V(0, GAL + 6, -9), 25);
    cam(V(0.5, GAL + 4.4, -11.5), V(0, GAL + 3.4, -3.5), 50, 0.03 + q * 0.35, c.t);
    c.focus = V(0, GAL, 0);
  });

  // 10 — "Uma rachadura subiu pela parede. A água tinha comido a base."
  add('10-rachadura', shotStart(10), (c) => {
    c.show('ocean', 'island', crack, chunks.mesh); night(); beaconOn(c.t); shipAt(1, c.t); boatAt(0.55, c.t);
    crack.userData.set(easeOut(range(c.t, word('rachadura') - 0.2, word('parede'))));
    chunks.update(c.t, V(0, LIGHTHOUSE.baseY + 6, -4.2), 2.5, 12, 0.8);
    const base = word('agua', 1) - 0.1, low = easeInOut(range(c.t, base, base + 0.8));
    fillAt(V(0, LIGHTHOUSE.baseY + 8, -12), 70);
    cam(V(lerp(5, 3, c.u), lerp(LIGHTHOUSE.baseY + 13, LIGHTHOUSE.baseY + 4, low), lerp(-17, -15, c.u)), V(0, lerp(LIGHTHOUSE.baseY + 10, LIGHTHOUSE.baseY + 1.5, low), -3), 55, 0.12, c.t);
    c.focus = V(0, LIGHTHOUSE.baseY, -5);
  });

  // 11 — "O bote tava chegando... mas o pai da Lia mal conseguia andar."
  add('11-pai', shotStart(11), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', lia.root, dad.root, crack); night(); beaconOn(c.t); dressHero(); shipAt(1, c.t);
    crack.userData.set(1); boatAt(lerp(0.6, 0.85, c.u), c.t);
    const k = easeOut(range(c.local, 0, c.dur));
    atGallery(dad, Math.PI - 0.6 + k * 0.4); dad.walk(c.t, 0.4, 0.3); dad.legR.rotation.x *= 0.2; dad.torso.rotation.z = 0.15; dad.face('tired');
    dad.root.rotation.set(0, Math.PI - 0.6 + k * 0.4 - Math.PI / 2, 0);
    atGallery(lia, Math.PI - 0.6 + k * 0.4 + 0.3); lia.root.rotation.copy(dad.root.rotation); lia.walk(c.t, 0.4, 0.3); lia.armR.rotation.set(-0.6, 0, -1.2); lia.face('worried');
    atGallery(hero, Math.PI + 0.55); faceTo(hero, dad.root.position); hero.idle(c.t); hero.armR.rotation.x = -1.2; hero.face('worried');
    fillAt(V(0, GAL + 6, -10), 25);
    cam(V(5, GAL + 4.2, -11.5), V(-0.6, GAL + 2.8, -3), 55, 0.03, c.t);
    c.focus = V(0, GAL, 0);
  });

  // 12/13 — escolha: A descer pela escada / B pular no mar
  const SPLIT_A = { l1: 'DESCER PELA', l2: 'ESCADA', color: '#45f06a' }, SPLIT_B = { l1: 'PULAR', l2: 'NO MAR', color: '#ff8a1f' };
  const choice = (focus) => (c) => {
    night(); beaconOn(c.t); shipAt(1, c.t); boatAt(0.9, c.t);
    const z = easeOut(c.u);
    c.split = {
      left: () => { // escada rachando por dentro
        c.show('interior', dust.mesh); w.ocean.mesh.visible = false; w.island.group.visible = false;
        sky.set({ top: '#000', mid: '#000', bottom: '#000', sunDir: [0, -1, 0], sunColor: '#000' });
        scene.fog.color.set('#1a120b'); scene.fog.near = 6; scene.fog.far = 40; hemi.color.set('#ffd9a0'); hemi.intensity = 0.6;
        interior.steps.forEach((s) => (s.visible = true));
        dust.update(c.t, V(0, 24, 0), 3, 20, 1.2);
        cam(V(0.01, 6, 0), V(Math.cos(c.t * 0.3) * 2, 26, Math.sin(c.t * 0.3) * 2), 80, 0.08, c.t);
      },
      right: () => { // do alto da galeria olhando a água e o bote lá embaixo
        night(); c.show('ocean', 'island', crack); w.interior.group.visible = false; dust.mesh.visible = false; crack.userData.set(1);
        cam(V(0.2, GAL + 3.5, -5.2), boat.position.clone().add(V(0, 0, 0)), lerp(60, 45, z), 0.04, c.t + 2);
      },
    };
    c.fx.split = { k: easeOut(range(c.local, 0, 0.3)), focus, a: SPLIT_A, b: SPLIT_B };
    c.fx.captionY = 1330;
    c.focus = V(0, GAL, 0);
  };
  add('12-escolha-A', shotStart(12), choice('A'));
  add('13-escolha-B', shotStart(13), choice('B'));

  // 14 — "O que você faria? Comenta A ou B!"
  add('14-final', shotStart(14), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', lia.root, dad.root, crack); night(); beaconOn(c.t); dressHero(); shipAt(1, c.t); boatAt(0.95, c.t);
    crack.userData.set(1);
    const camP = V(0, GAL + 4.6, -14);
    atGallery(hero, Math.PI); atGallery(lia, Math.PI - 0.45); atGallery(dad, Math.PI + 0.45);
    for (const ch of [hero, lia, dad]) { faceTo(ch, camP); ch.idle(c.t); }
    hero.armR.rotation.x = -1.3; hero.armR.rotation.z = 0.6;
    hero.face(c.local < 1.2 ? 'determined' : 'happy'); lia.face(c.local < 1.5 ? 'worried' : 'determined'); dad.face('tired');
    fillAt(V(0, GAL + 6, -9), 22);
    cam(V(0, GAL + 5.0, lerp(-15, -13, easeOut(c.u))), V(0, GAL + 3.4, -3.7), 50, 0.02 + Math.max(0, Math.sin(c.t * 2)) * 0.02, c.t);
    c.fx.cta = { k: easeOut(range(c.local, 0.3, 0.7)), part2: c.t > tl.duration - 2.2, y: 1080 };
    c.fx.black = range(c.t, tl.duration - 0.35, tl.duration);
    c.focus = V(0, GAL, 0);
  });

  S.sort((a, b) => a.start - b.start);
  S.forEach((s, i) => (s.end = i + 1 < S.length ? S[i + 1].start : tl.duration + 1));
  return S;
}
