// Direção do episódio 04 — "O Farol Aceso" (continuação: o público escolheu B, nadar até o farol)
import * as THREE from 'three';
import { lerp, smooth, easeOut, easeIn, easeInOut, range } from '../lib/util.js';
import { islandHeight, LIGHTHOUSE } from '../lib/world.js';
import { V, timing, orient, makeCam, headOf, handOf, forwardOf } from '../lib/direction.js';
import { makeLia, makeGiantTree, makeShipLights, Foam } from '../ep02/props.js';
import { DECK_Y, makePlatform, makeBeacon } from '../ep03/props.js';
import { makeFather, makeLog, makeReefs } from './props.js';

export const HUD_OPTS = {
  tag: 'EP. 4 • O FAROL ACESO',
  next: 'PARTE 5 EM BREVE!',
  title: [['PARTE 4', '#ffd23a'], ['O FAROL', '#ff8a1f']],
  keywords: {
    farol: '#ffd23a', escura: '#3fe0ff', correnteza: '#3fe0ff', longe: '#3fe0ff', sinalizador: '#ff8a1f', tronco: '#ff3b3b',
    gente: '#ff3b3b', mergulhou: '#3fe0ff', raspando: '#45f06a', folego: '#45f06a', homem: '#ff4fd8', chapeu: '#ff4fd8',
    devagar: '#ff4fd8', pai: '#ff4fd8', caverna: '#ffd23a', navio: '#ff8a1f', pedras: '#ff3b3b', recifes: '#ff3b3b',
    tiro: '#ff3b3b', desviar: '#45f06a', perto: '#ff8a1f',
  },
  onlyInLine: { nao: [], confie: [] },
  lineColors: { 13: { um: '#ff3b3b' }, 16: { a: '#45f06a', b: '#ff8a1f' } },
  speakers: { 1: { name: 'LIA', color: '#ff4fd8' } },
};

export const SURVIVAL = (tl) => {
  const { word, line } = timing(tl);
  return [[0, 20], [word('correnteza'), 15], [word('tronco'), 5], [word('raspando'), 20], [word('folego'), 35], [word('homem'), 40],
    [word('pai'), 60], [word('caverna'), 65], [word('pedras'), 40], [word('recifes'), 30], [word('tiro'), 20], [line(14).start + 0.2, null]];
};

const G = (x, z) => V(x, islandHeight(x, z), z);
const NIGHT = { top: '#03071a', mid: '#0f1f44', bottom: '#20386a', sunDir: [-0.87, 0.45, -0.07], sunColor: '#fff3d0', sunSize: 0.9975, stars: 1 };

export function buildShots(w, tl) {
  const { line, word, shotStart } = timing(tl);
  const { camera, hero, ocean, sky, scene, hemi, sun, island, interior } = w;
  const cam = makeCam(camera);
  const GT = G(-18, -14);
  const LAMP = V(0, LIGHTHOUSE.baseY - 0.5 + LIGHTHOUSE.height + 2.3, 0);
  const GAL = LIGHTHOUSE.galleryY;
  const L1 = 15.5;
  const SHIP0 = V(-40, 0, -230), SHIP1 = V(-24, 0, -140);   // navio longe -> perto das pedras
  const REEF = V(-18, 0, -105);

  // ---- objetos ----
  const lia = makeLia(w.Character); w.extra(lia.root);
  const dad = makeFather(w.Character); w.extra(dad.root);
  const giant = makeGiantTree(); w.extra(giant);
  const platform = makePlatform(); platform.position.y = DECK_Y; giant.add(platform);
  const beacon = makeBeacon(0.24, 6); beacon.position.copy(LAMP); w.extra(beacon);
  const shipLights = makeShipLights(); w.ship.add(shipLights);
  const log = makeLog(); w.extra(log);
  const reefs = makeReefs(); w.extra(reefs);
  const foam = new Foam(70); w.extra(foam.mesh);
  for (const tr of [...island.trees, ...island.palms]) if (Math.hypot(tr.position.x - GT.x, tr.position.z - GT.z) < 18) tr.visible = false;

  const placeTree = () => { giant.position.copy(GT); giant.rotation.set(0.12 * 0.35, 0, -0.12); giant.updateMatrixWorld(true); };
  const onTree = (x, y, z) => { giant.updateMatrixWorld(true); return giant.localToWorld(V(x, y, z)); };
  const fillAt = (p, i) => { w.fillLight.position.copy(p); w.fillLight.intensity = i; w.fillLight.color.set('#c8d6ff'); w.fillLight.distance = 40; };
  const night = () => {
    sky.set(NIGHT); scene.fog.color.set('#1d3462'); scene.fog.near = 40; scene.fog.far = 700;
    hemi.color.set('#8aa2e6'); hemi.groundColor.set('#0d1428'); hemi.intensity = 1.15;
    sun.color.set('#c4d4ff'); sun.intensity = 1.7;
    ocean.mat.color.set('#1b4268'); ocean.amp = 0.45; ocean.choppy = 1.2; ocean.level = L1;
  };
  const beaconOn = (t) => { const u = beacon.userData; beacon.visible = true; u.beam.rotation.y = t * 0.9; u.light.intensity = 120; };
  const interiorLight = () => {
    sky.set({ top: '#000', mid: '#000', bottom: '#000', sunDir: [0, -1, 0], sunColor: '#000' });
    scene.fog.color.set('#1a120b'); scene.fog.near = 6; scene.fog.far = 40;
    hemi.color.set('#ffd9a0'); hemi.groundColor.set('#2a1a0e'); hemi.intensity = 0.55; sun.intensity = 0.8; sun.color.set('#ffe6b0');
  };
  const swimAt = (ch, p, dir, t, ph = 0) => { // nadando na superfície na direção dir
    ch.swim(t + ph, 1.1); orient(ch.root, dir.clone().setY(0).normalize(), V(0, -1, 0));
    ch.root.position.copy(p).setY(ocean.height(p.x, p.z, t) - 0.35);
  };
  const atGallery = (ch, a, r = 3.7) => { ch.root.position.set(Math.sin(a) * r, GAL, Math.cos(a) * r); };
  const faceTo = (ch, target) => { const p = ch.root.position; ch.root.rotation.set(0, Math.atan2(target.x - p.x, target.z - p.z), 0); };
  const dressHero = () => { hero.vest.visible = false; };
  // caminho do nado: da árvore até a encosta do farol
  const SW0 = V(-24, 0, -19), SW1 = V(-10, 0, -8);
  const toLH = V(0, 0, 0).sub(SW0).setY(0).normalize();

  const S = [];
  const add = (name, start, run) => S.push({ name, start, run });

  // 1a — recapitulação da escolha / 1b — o pulo
  const tGente = word('gente', 1);
  add('1-recap', 0, (c) => {
    c.show('ocean', 'island', giant); night(); placeTree(); beaconOn(c.t);
    const center = onTree(0, DECK_Y + 2, 0);
    c.split = {
      left: () => cam(center.clone().add(V(4, -2, 22)), center.clone().add(V(0, -3, 0)), 70, 0.03, c.t),
      right: () => cam(GT.clone().lerp(V(0, 0, 0), 0.35).setY(L1 + 1.2), LAMP.clone().add(V(0, -6, 0)), 55, 0.04, c.t + 2),
    };
    c.fx.split = { k: 1, pick: 'B', a: { l1: 'FICAR NA', l2: 'ÁRVORE', color: '#45f06a' }, b: { l1: 'NADAR ATÉ', l2: 'O FAROL', color: '#ff8a1f' } };
    c.fx.black = 1 - range(c.local, 0, 0.3);
    c.focus = GT;
  });
  add('1-pulo', tGente - 0.15, (c) => {
    c.show('ocean', 'island', 'hero', 'flare', lia.root, giant); night(); placeTree(); beaconOn(c.t); dressHero();
    const k = easeIn(range(c.local, 0.2, 1.3));
    const from = onTree(0.5, DECK_Y + 0.1, 5.2), to = V(from.x + 3, L1 - 2, from.z + 5);
    for (const [ch, off, ph] of [[hero, 0, 0], [lia, 1.6, 0.15]]) {
      const kk = easeIn(range(c.local, 0.2 + ph, 1.3 + ph));
      const p = from.clone().lerp(to, kk).add(V(off, Math.sin(kk * Math.PI) * 2, 0));
      ch.root.position.copy(p); ch.root.rotation.set(kk * 0.6, 0.5, 0); ch.struggle(c.t, 0.6);
    }
    hero.face('shout'); lia.face('scared'); hero.armR.rotation.x = -2.9;
    w.bubbles.visible = k > 0.95; w.bubbles.update(c.t, to.clone().setY(L1 - 0.6), 3, 1.5, 3);
    fillAt(from.clone().add(V(6, 0, 10)), 25);
    cam(from.clone().add(V(9, lerp(2, -10, k), 12)), from.clone().lerp(to, k * 0.8).add(V(1, 1, 0)), 60, 0.05, c.t);
    c.fx.flash = k > 0.97 ? 0.4 : 0;
    c.focus = from;
  });

  // 2 — "A correnteza puxava pro lado... e o farol parecia cada vez mais longe."
  add('2-correnteza', shotStart(2), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', lia.root, foam.mesh); night(); beaconOn(c.t); dressHero();
    const drift = V(0, 0, 1).multiplyScalar(c.u * 2.5);
    const p = SW0.clone().lerp(SW1, c.u * 0.35).add(drift).setY(L1);
    swimAt(hero, p, toLH, c.t); swimAt(lia, p.clone().add(V(-1.2, 0, 2.2)), toLH, c.t, 0.7);
    hero.face('tired'); lia.face('determined');
    foam.update(c.t, p, L1, [0, 1], 10, 12);
    fillAt(p.clone().add(V(0, 4, 6)), 30);
    cam(p.clone().add(toLH.clone().multiplyScalar(-8)).add(V(3, 2.4, 2.5)), p.clone().add(V(0, 2.6, 0)).add(toLH.clone().multiplyScalar(4)), 55, 0.08, c.t);
    c.fx.flow = smooth(range(c.local, 0.2, 0.6)) * 0.8;
    c.focus = p;
  });

  // 3 — "Eu nadava com o sinalizador erguido, pra não molhar."
  add('3-braco', shotStart(3), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', lia.root); night(); beaconOn(c.t); dressHero();
    const p = SW0.clone().lerp(SW1, 0.35 + c.u * 0.2);
    hero.tread(c.t); hero.armR.rotation.set(-2.95, 0, 0.1); hero.face('determined');
    hero.root.position.copy(p).setY(ocean.height(p.x, p.z, c.t) - 3.6); hero.root.rotation.set(0, Math.atan2(toLH.x, toLH.z), 0);
    swimAt(lia, p.clone().add(toLH.clone().multiplyScalar(4)).add(V(-2, 0, 1)), toLH, c.t, 0.7); lia.face('determined');
    const hand = handOf(hero);
    fillAt(hand.clone().add(V(2, 1, 3)), 30);
    cam(hand.clone().add(V(lerp(3.5, 2.4, c.u), -1.2, lerp(3.5, 2.6, c.u))), hand.clone().add(V(0, -1.4, 0)), 55, 0.05, c.t);
    c.focus = p;
  });

  // 4 — "De repente, um tronco veio boiando... direto na gente!"
  const tTr = word('tronco');
  const P4 = SW0.clone().lerp(SW1, 0.6);
  add('4-tronco', shotStart(4), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', lia.root, log); night(); beaconOn(c.t); dressHero();
    swimAt(hero, P4, toLH, c.t); swimAt(lia, P4.clone().add(V(-1.4, 0, 2)), toLH, c.t, 0.7);
    hero.face(c.t > tTr ? 'scared' : 'tired'); lia.face(c.t > tTr ? 'scared' : 'determined');
    const k = easeIn(range(c.t, tTr - 0.6, c.start + c.dur));
    const from = P4.clone().add(V(-24, 0, 16)), lp = from.lerp(P4.clone().add(V(-4.5, 0, 4.5)), k);
    log.position.copy(lp).setY(ocean.height(lp.x, lp.z, c.t) - 0.2); log.rotation.set(Math.sin(c.t * 1.3) * 0.1, 0.7 + c.t * 0.15, Math.sin(c.t) * 0.05);
    const behind = P4.clone().add(toLH.clone().multiplyScalar(7)).setY(L1 + 3.2);
    fillAt(lp.clone().add(V(0, 4, 0)), 50);
    cam(behind, lp.clone().lerp(P4, 0.3).setY(L1 + 0.6), 60, 0.05 + k * 0.25, c.t);
    c.focus = P4;
  });

  // 5 — "A Lia mergulhou. Eu também. Passou raspando."
  add('5-mergulho', shotStart(5), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', lia.root, log, 'bubbles'); dressHero();
    sky.set({ top: '#1d4a66', mid: '#0a2a40', bottom: '#020c16', sunDir: [0, -1, 0], sunColor: '#000' });
    scene.fog.color.set('#06243a'); scene.fog.near = 4; scene.fog.far = 45;
    hemi.color.set('#6fb8e0'); hemi.groundColor.set('#031522'); hemi.intensity = 1.1; sun.intensity = 0.8; sun.color.set('#8fd0ff');
    ocean.level = L1; ocean.amp = 0.45; ocean.mat.color.set('#3a7aa0'); ocean.mat.opacity = 0.75;
    const dl = easeOut(range(c.local, 0, 0.8)), dh = easeOut(range(c.local, 0.5, 1.3));
    const base = P4.clone().setY(L1);
    for (const [ch, k, off] of [[lia, dl, V(-1.4, 0, 2)], [hero, dh, V(0, 0, 0)]]) {
      ch.swim(c.t, 1.2); const pos = base.clone().add(off).add(V(0, -0.5 - k * 5, 0));
      orient(ch.root, V(toLH.x, -0.6 * (1 - range(c.local, 1.6, 2.6)), toLH.z), V(0, -1, 0)); ch.root.position.copy(pos);
    }
    hero.face('shout'); lia.face('determined');
    const pass = range(c.local, 0.6, 2.6);
    log.position.copy(base.clone().add(V(-12 + pass * 24, -0.3, 8 - pass * 16))); log.rotation.set(0, 0.7, 0);
    w.bubbles.update(c.t, base.clone().add(V(0, -5, 0)), 2.5, 5, 2);
    fillAt(base.clone().add(V(4, -3, 6)), 40);
    cam(base.clone().add(V(6, -7.5, 7)), base.clone().add(V(0, -3, 0)), 62, 0.06, c.t);
    c.focus = base;
  });

  // 6 — "Chegamos na porta do farol, sem fôlego."
  add('6-chegada', shotStart(6), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', lia.root); night(); beaconOn(c.t); dressHero();
    const k = easeOut(range(c.local, 0, 1.6));
    const shore = (x, z) => { const g = G(x, z); return g.y < L1 - 0.3 ? g.setY(L1 - 3.2) : g; };
    hero.root.position.copy(shore(lerp(-9.6, -8.4, k), lerp(-7.4, -6.4, k))); faceTo(hero, V(0, 0, 0)); k < 1 ? hero.crawl(c.t) : hero.idle(c.t);
    if (k < 1) { orient(hero.root, V(1, 0.4, 0.8), V(0, -1, 0)); hero.root.position.y = Math.max(hero.root.position.y, L1 - 0.6); }
    hero.face('tired'); hero.torso.rotation.x = 0.4 + Math.sin(c.t * 6) * 0.06;
    lia.root.position.copy(shore(-10.4, -5.4)); faceTo(lia, V(0, 0, 0)); lia.idle(c.t); lia.torso.rotation.x = 0.5 + Math.sin(c.t * 6 + 1) * 0.06; lia.face('tired');
    const p = hero.root.position.clone();
    fillAt(p.clone().add(V(-4, 4, -4)), 30);
    cam(p.clone().add(V(-7, 2.5, -6)), V(0, lerp(26, 34, c.u), 0), 55, 0.03, c.t);
    c.focus = p;
  });

  // 7a — escada / 7b — o homem de chapéu, de costas
  const tLa = word('la', 1);
  add('7-escada', shotStart(7), (c) => {
    c.show('interior', 'hero', 'flare', lia.root); interiorLight(); dressHero();
    const i = lerp(4, 46, c.u), a = i * 0.32, y = 3.2 + i * 0.28;
    interior.steps.forEach((s, j) => (s.visible = j < i + 1.5));
    hero.run(c.t, 1.8); hero.face('determined');
    hero.root.position.set(Math.cos(a) * 3.2, y + 0.15, Math.sin(a) * 3.2); hero.root.rotation.set(0, -a, 0);
    const a2 = (i - 3) * 0.32, y2 = 3.2 + (i - 3) * 0.28;
    lia.run(c.t + 0.3, 1.8); lia.root.position.set(Math.cos(a2) * 3.2, y2 + 0.15, Math.sin(a2) * 3.2); lia.root.rotation.set(0, -a2, 0); lia.face('determined');
    camera.up.set(Math.cos(a + 1), 0, Math.sin(a + 1));
    cam(V(0.01, y + 13, 0), V(Math.cos(a) * 1.2, y, Math.sin(a) * 1.2), 70);
    c.focus = V(0, y, 0);
  });
  const DAD_A = Math.PI;              // o pai fica do lado do mar aberto (-z)
  add('7-homem', tLa - 0.1, (c) => {
    c.show('ocean', 'island', 'hero', 'flare', lia.root, dad.root); night(); beaconOn(c.t); dressHero();
    atGallery(dad, DAD_A); dad.root.rotation.set(0, Math.PI, 0); dad.idle(c.t); dad.face('tired');
    atGallery(hero, DAD_A + 1.0); faceTo(hero, dad.root.position); hero.idle(c.t); hero.face('scared');
    atGallery(lia, DAD_A + 1.35); faceTo(lia, dad.root.position); lia.idle(c.t); lia.face('scared');
    const dp = headOf(dad);
    fillAt(dp.clone().add(V(4, 1, 3)), 18);
    const mid = headOf(hero).lerp(headOf(lia), 0.5), back = mid.clone().sub(dp).setY(0).normalize(), side = V(back.z, 0, -back.x);
    cam(mid.clone().add(back.multiplyScalar(5)).add(side.multiplyScalar(3.5)).add(V(0, 1.6, 0)), dp.clone().add(V(0, -1.2, 0)), lerp(52, 44, easeOut(c.u)), 0.03, c.t);
    c.focus = V(0, GAL, 0);
  });

  // 8 — "Ele virou devagar."
  add('8-virou', shotStart(8), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', lia.root, dad.root); night(); beaconOn(c.t); dressHero();
    atGallery(dad, DAD_A); dad.idle(c.t);
    const k = easeInOut(range(c.local, 0.2, 1.6));
    const target = V(Math.sin(DAD_A + 1.15) * 3.7, 0, Math.cos(DAD_A + 1.15) * 3.7);
    const ry = Math.atan2(target.x - dad.root.position.x, target.z - dad.root.position.z);
    dad.root.rotation.set(0, lerp(Math.PI, ry, k), 0); dad.face(k > 0.6 ? 'surprised' : 'tired');
    atGallery(hero, DAD_A + 1.0); faceTo(hero, dad.root.position); hero.idle(c.t);
    atGallery(lia, DAD_A + 1.35); faceTo(lia, dad.root.position); lia.idle(c.t);
    const dh = headOf(dad);
    const f = V(Math.sin(ry), 0, Math.cos(ry));
    fillAt(dh.clone().add(f.clone().multiplyScalar(4)), 25);
    cam(dh.clone().add(f.clone().multiplyScalar(lerp(5.2, 4.2, c.u))).add(V(0.3, 0, 0)), dh.clone().add(V(0, -0.2, 0)), 45, 0.015, c.t);
    c.focus = V(0, GAL, 0);
  });

  // 9 — Lia: "Pai?!"
  add('9-pai', shotStart(9), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', lia.root, dad.root); night(); beaconOn(c.t); dressHero();
    atGallery(dad, DAD_A); dad.idle(c.t); dad.face('happy');
    const run = easeInOut(range(c.local, 0.9, 1.9));
    const a = lerp(DAD_A + 1.35, DAD_A + 0.35, run);
    atGallery(lia, a); faceTo(lia, dad.root.position); run > 0 && run < 1 ? lia.run(c.t, 1.4) : lia.idle(c.t);
    lia.face(run < 0.5 ? 'surprised' : 'happy');
    faceTo(dad, lia.root.position);
    if (run >= 1) { for (const ch of [lia, dad]) { ch.armL.rotation.set(-1.3, 0, -0.7); ch.armR.rotation.set(-1.3, 0, 0.7); } }
    atGallery(hero, DAD_A + 1.0); faceTo(hero, dad.root.position); hero.idle(c.t); hero.face('happy');
    const lh = headOf(lia), f = forwardOf(lia);
    fillAt(lh.clone().add(f.clone().multiplyScalar(4)), 25);
    if (run < 0.05) cam(lh.clone().add(f.clone().multiplyScalar(4.2)).add(V(0, 0.1, 0)), lh.clone().add(V(0, -0.2, 0)), 45, 0.02, c.t);
    else { const mid = lia.root.position.clone().lerp(dad.root.position, 0.5); cam(mid.clone().add(V(0, 0, 0)).multiplyScalar(1).add(mid.clone().setY(0).normalize().multiplyScalar(8)).add(V(0, 4.2, 0)), mid.clone().add(V(0, 3.4, 0)), 50, 0.02, c.t); }
    c.focus = V(0, GAL, 0);
  });

  // 10 — "Ele tinha sobrevivido numa caverna, do outro lado da ilha."
  add('10-caverna', shotStart(10), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', lia.root, dad.root); night(); beaconOn(c.t); dressHero();
    const k = easeOut(range(c.local, 0, 2.5));
    atGallery(dad, DAD_A + k * 0.5); dad.walk(c.t, 0.5, 0.35 * (1 - k)); dad.legR.rotation.x *= 0.3; dad.face('tired');
    dad.root.rotation.set(0, DAD_A + k * 0.5 + Math.PI / 2, 0);
    atGallery(lia, DAD_A + k * 0.5 + 0.35); lia.idle(c.t); faceTo(lia, dad.root.position); lia.face('happy');
    atGallery(hero, DAD_A + 1.0); faceTo(hero, dad.root.position); hero.idle(c.t); hero.face('neutral');
    const a = lerp(DAD_A + 0.2, DAD_A + 0.9, easeInOut(c.u));
    fillAt(V(Math.sin(a) * 8, GAL + 5, Math.cos(a) * 8), 25);
    cam(V(Math.sin(a) * 13, GAL + 5.5, Math.cos(a) * 13), V(0, GAL + 2.8, 0).add(V(Math.sin(DAD_A + 0.5) * 2.5, 0, Math.cos(DAD_A + 0.5) * 2.5)), 55, 0.02, c.t);
    c.focus = V(0, GAL, 0);
  });

  // navio aproximando das pedras (11–15)
  const shipAt = (k, t) => {
    w.ship.visible = true; shipLights.visible = true;
    const p = SHIP0.clone().lerp(SHIP1, k); w.ship.position.copy(p).setY(L1 - 9.4 + Math.sin(t * 0.8) * 0.3);
    w.ship.rotation.set(0, Math.atan2(-p.x, -p.z), Math.sin(t * 0.6) * 0.02);
    reefs.visible = true; reefs.position.copy(REEF).setY(L1);
  };
  const tPed = word('pedras');
  // 11 — "Mas aí eu vi o navio... indo direto pras pedras."
  add('11-navio', shotStart(11), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', lia.root, dad.root); night(); beaconOn(c.t); dressHero();
    shipAt(lerp(0.2, 0.45, c.u), c.t);
    atGallery(hero, Math.PI + 0.15); hero.root.rotation.set(0, Math.PI, 0); hero.idle(c.t); hero.face('scared');
    const eye = V(0.6, GAL + 4.6, -4.4);
    const z = easeInOut(range(c.t, tPed - 0.6, tPed + 0.4));
    cam(eye, w.ship.position.clone().add(V(0, 6, 0)).lerp(REEF.clone().setY(L1 + 2), z), lerp(24, 30, z), 0.04, c.t);
    fillAt(w.ship.position.clone().add(V(10, 20, 30)), 0);
    c.focus = V(-10, 10, -60);
  });
  // 12 — "No escuro, eles não viam os recifes."
  add('12-recifes', shotStart(12), (c) => {
    c.show('ocean', 'island', foam.mesh); night(); beaconOn(c.t); ocean.amp = 0.6;
    shipAt(lerp(0.45, 0.65, c.u), c.t);
    foam.update(c.t, REEF.clone(), L1, [0.3, 1], 4, 26);
    const eye = REEF.clone().add(V(14, L1 + 3.5, 22));
    fillAt(REEF.clone().add(V(0, L1 + 8, 6)), 60);
    cam(eye, REEF.clone().setY(L1 + 1).lerp(w.ship.position.clone().setY(L1 + 4), 0.25), lerp(55, 45, c.u), 0.05, c.t);
    c.focus = REEF;
  });
  // 13 — "E eu só tenho um tiro."
  add('13-um-tiro', shotStart(13), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', lia.root, dad.root); night(); beaconOn(c.t); dressHero();
    shipAt(0.7, c.t);
    atGallery(hero, Math.PI + 0.15); hero.root.rotation.set(0, Math.PI, 0); hero.aim(c.t, -0.1); hero.armR.rotation.z = 0.5; hero.armL.rotation.x = -0.3; hero.face('determined');
    atGallery(lia, Math.PI + 0.65); faceTo(lia, hero.root.position); lia.idle(c.t); lia.face('worried');
    atGallery(dad, Math.PI + 1.1); faceTo(dad, hero.root.position); dad.idle(c.t); dad.face('worried');
    const hp = handOf(hero), hd = headOf(hero), look = hp.clone().lerp(hd, 0.35);
    fillAt(look.clone().add(V(-3, 1, -3)), 25);
    cam(look.clone().add(V(lerp(-3.2, -2.2, c.u), 0.4, lerp(-2.2, -1.6, c.u))), look, 45, 0.04, c.t);
    c.fx.redPulse = 0.18 + Math.max(0, Math.sin(c.t * 7.5)) * 0.25;
    c.focus = V(0, GAL, 0);
  });

  // 14/15 — escolha: A atirar agora (navio ainda longe) / B esperar mais perto (navio quase nas pedras)
  const SPLIT_A = { l1: 'ATIRAR', l2: 'AGORA', color: '#45f06a' }, SPLIT_B = { l1: 'ESPERAR', l2: 'MAIS PERTO', color: '#ff8a1f' };
  const choice = (focus) => (c) => {
    c.show('ocean', 'island'); night(); beaconOn(c.t);
    const z = easeOut(c.u);
    c.split = {
      left: () => { shipAt(0.35, c.t); cam(V(4, GAL + 3, -6), w.ship.position.clone().add(V(0, 4, 0)).lerp(REEF.clone().setY(L1), 0.4), 30, 0.03, c.t); },
      right: () => { shipAt(0.97, c.t); cam(REEF.clone().add(V(10, L1 + 3, 18)), w.ship.position.clone().add(V(0, 4, 0)).lerp(REEF.clone().setY(L1), 0.5), lerp(55, 48, z), 0.04, c.t + 2); },
    };
    c.fx.split = { k: easeOut(range(c.local, 0, 0.3)), focus, a: SPLIT_A, b: SPLIT_B };
    c.fx.captionY = 1330;
    c.focus = V(-10, 10, -60);
  };
  add('14-escolha-A', shotStart(14), choice('A'));
  add('15-escolha-B', shotStart(15), choice('B'));

  // 16 — "O que você faria? Comenta A ou B!"
  add('16-final', shotStart(16), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', lia.root, dad.root); night(); beaconOn(c.t); dressHero();
    shipAt(0.75, c.t);
    const camP = V(0, GAL + 4.6, 12);
    atGallery(hero, -0.05); atGallery(lia, 0.42); atGallery(dad, -0.5);
    for (const ch of [hero, lia, dad]) { faceTo(ch, camP); ch.idle(c.t); }
    hero.armR.rotation.x = -1.3; hero.armR.rotation.z = 0.6;
    hero.face(c.local < 1.2 ? 'determined' : 'happy'); lia.face(c.local < 1.5 ? 'determined' : 'happy'); dad.face('tired');
    fillAt(V(0, GAL + 6, 8), 22);
    cam(V(0, GAL + 5.0, lerp(15, 13, easeOut(c.u))), V(0, GAL + 3.4, 3.7), 50, 0.02, c.t);
    c.fx.cta = { k: easeOut(range(c.local, 0.3, 0.7)), part2: c.t > tl.duration - 2.2, y: 1080 };
    c.fx.black = range(c.t, tl.duration - 0.35, tl.duration);
    c.focus = V(0, GAL, 0);
  });

  S.sort((a, b) => a.start - b.start);
  S.forEach((s, i) => (s.end = i + 1 < S.length ? S[i + 1].start : tl.duration + 1));
  return S;
}
