// Direção do episódio 03 — "A Árvore Gigante" (continuação: o público escolheu A, subir na árvore)
import * as THREE from 'three';
import { lerp, smooth, easeOut, easeIn, easeInOut, range } from '../lib/util.js';
import { islandHeight, LIGHTHOUSE } from '../lib/world.js';
import { V, timing, orient, makeCam, headOf, handOf, forwardOf } from '../lib/direction.js';
import { makeLia, Campfire, makeGiantTree, makeShipLights, Foam } from '../ep02/props.js';
import { trunkR, PLANK_Y, DECK_Y, makePlatform, makeBackpack, makeRadio, makePhoto, makeLoosePlank, makeBeacon, makeSilhouette, Mud } from './props.js';

export const HUD_OPTS = {
  tag: 'EP. 3 • A ÁRVORE GIGANTE',
  next: 'PARTE 4 EM BREVE!',
  title: [['PARTE 3', '#ffd23a'], ['A ÁRVORE', '#45f06a']],
  keywords: {
    arvore: '#45f06a', fogueira: '#ff8a1f', tabuas: '#ffd23a', quebrou: '#ff3b3b', pendurado: '#ff3b3b', puxou: '#45f06a',
    plataforma: '#ffd23a', mochila: '#ff8a1f', radio: '#3fe0ff', foto: '#ffd23a', homem: '#ff4fd8', pai: '#ff4fd8', vinte: '#ffd23a',
    sumido: '#3fe0ff', farol: '#ffd23a', acendeu: '#ffd23a', alguem: '#ff3b3b', navio: '#ff8a1f', virar: '#45f06a', luz: '#ffd23a',
    ranger: '#ff3b3b', raizes: '#ff3b3b', aguentar: '#45f06a', nadar: '#ff8a1f',
  },
  onlyInLine: { nao: [], confie: [] },
  lineColors: { 17: { a: '#45f06a', b: '#ff8a1f' } },
  speakers: { 1: { name: 'LIA', color: '#ff4fd8' } },
};

export const SURVIVAL = (tl) => {
  const { word, line } = timing(tl);
  return [[0, 35], [word('quebrou'), 20], [word('puxou'), 30], [word('mochila'), 40], [word('foto', 1), 45], [word('sumido'), 40],
    [word('acendeu', 1), 50], [word('virar'), 60], [word('ranger'), 20], [line(15).start + 0.2, null]];
};

const G = (x, z) => V(x, islandHeight(x, z), z);
const NIGHT = { top: '#03071a', mid: '#0f1f44', bottom: '#20386a', sunDir: [-0.87, 0.45, -0.07], sunColor: '#fff3d0', sunSize: 0.9975, stars: 1 };

export function buildShots(w, tl) {
  const { line, word, shotStart } = timing(tl);
  const { camera, hero, ocean, sky, scene, hemi, sun, island } = w;
  const cam = makeCam(camera);
  const SHIP = V(-60, 0, -360);
  const FIRE = G(26, -12);
  const GT = G(-18, -14);
  const LAMP = V(0, LIGHTHOUSE.baseY - 0.5 + LIGHTHOUSE.height + 2.3, 0);
  const GAL = LIGHTHOUSE.galleryY;
  const L0 = FIRE.y + 1.2;   // nível da água no início
  const L1 = 15.5;           // nível da água quando "a ilha sumiu"
  const LAMP_A = Math.atan2(LAMP.x - GT.x, LAMP.z - GT.z); // lado da plataforma virado para o farol
  const SHIP_A = Math.atan2(SHIP.x - GT.x, SHIP.z - GT.z);

  // ---- objetos ----
  const lia = makeLia(w.Character); w.extra(lia.root);
  const fire = new Campfire(); fire.group.position.copy(FIRE); w.extra(fire.group);
  const giant = makeGiantTree(); w.extra(giant);
  const platform = makePlatform(); platform.position.y = DECK_Y; giant.add(platform);
  const pack = makeBackpack(); pack.position.set(2.6, DECK_Y, 2.3); pack.rotation.y = -0.6; giant.add(pack);
  const radio = makeRadio(); w.extra(radio);
  const photo = makePhoto(); w.extra(photo);
  const loose = makeLoosePlank(); w.extra(loose);
  const beacon = makeBeacon(); beacon.position.copy(LAMP); w.extra(beacon);
  const shadowMan = makeSilhouette(w.Character); w.extra(shadowMan.root);
  const shipLights = makeShipLights(); w.ship.add(shipLights);
  const mud = new Mud(); w.extra(mud.mesh);
  const foam = new Foam(70); w.extra(foam.mesh);
  // tábua nº 6 do tronco (a que quebra)
  const plank6 = giant.children.find((m) => m.geometry?.parameters?.width === 1.4 && Math.abs(m.position.y - PLANK_Y(6)) < 0.01);
  // árvores/palmeiras perto da clareira, do caminho e da árvore gigante ficam escondidas
  for (const tr of [...island.trees, ...island.palms]) {
    if (Math.hypot(tr.position.x - FIRE.x, tr.position.z - FIRE.z) < 13) tr.visible = false;
    if (Math.hypot(tr.position.x - GT.x, tr.position.z - GT.z) < 18) tr.visible = false;
  }

  // posição no mundo de um ponto local da árvore (considerando a inclinação)
  const onTree = (x, y, z) => { giant.updateMatrixWorld(true); return giant.localToWorld(V(x, y, z)); };
  const placeTree = (tilt = 0) => { giant.position.copy(GT); giant.rotation.set(tilt * 0.35, 0, -tilt); giant.updateMatrixWorld(true); };
  // personagem escalando de frente para o tronco (lado +z), na altura local y
  const climbAt = (ch, y, side = 0) => {
    const p = onTree(side, y - 0.4, trunkR(y + 2.5) + 0.75);
    ch.root.position.copy(p); ch.root.quaternion.copy(giant.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), Math.PI));
  };
  const onDeck = (ch, a, r, faceTo) => { // em pé na plataforma, ângulo a em volta do tronco
    const p = onTree(Math.sin(a) * r, DECK_Y + 0.05, Math.cos(a) * r); ch.root.position.copy(p);
    if (faceTo) { const d = faceTo.clone().sub(p); ch.root.rotation.set(0, Math.atan2(d.x, d.z), 0); }
  };

  // ---- iluminação ----
  const fillAt = (p, i) => { w.fillLight.position.copy(p); w.fillLight.intensity = i; w.fillLight.color.set('#c8d6ff'); w.fillLight.distance = 40; };
  const night = (level = L0) => {
    sky.set(NIGHT); scene.fog.color.set('#1d3462'); scene.fog.near = 40; scene.fog.far = 700;
    hemi.color.set('#8aa2e6'); hemi.groundColor.set('#0d1428'); hemi.intensity = 1.15;
    sun.color.set('#c4d4ff'); sun.intensity = 1.7;
    ocean.mat.color.set('#1b4268'); ocean.amp = 0.3; ocean.choppy = 0.9; ocean.level = level;
  };
  const beaconOn = (t, k, rotSpeed = 0.9) => { // k: 0 apagado .. 1 aceso
    beacon.visible = k > 0;
    const u = beacon.userData; u.beam.rotation.y = t * rotSpeed; u.beam.visible = k > 0.3;
    u.glow.scale.setScalar(0.3 + 0.7 * k); u.halo.scale.setScalar(k); u.light.intensity = 120 * k;
    u.beam.children.forEach((c) => (c.material.opacity = u.opacity * k));
  };
  const S = [];
  const add = (name, start, run) => S.push({ name, start, run });
  const DP = (x, z) => G(x, z);

  // 1 — "Vocês escolheram a árvore." (recapitulação da escolha)
  add('1-recap', 0, (c) => {
    c.show('ocean', 'island', giant, w.ship); night(L0); placeTree(0);
    w.ship.position.copy(SHIP); w.ship.rotation.y = Math.PI / 2; shipLights.visible = true;
    c.split = {
      left: () => cam(GT.clone().add(V(-28, 28, -22)), GT.clone().add(V(0, 28, 0)), 66, 0.02, c.t),
      right: () => cam(V(40, L0 + 6, -40), SHIP.clone().add(V(0, 4, 0)), 30, 0.03, c.t + 2),
    };
    c.fx.split = { k: 1, pick: 'A', a: { l1: 'SUBIR NA', l2: 'ÁRVORE', color: '#45f06a' }, b: { l1: 'REMAR ATRÁS', l2: 'DO NAVIO', color: '#ff8a1f' } };
    c.fx.black = 1 - range(c.local, 0, 0.3);
    c.focus = GT;
  });

  // 2 — "A água já cobria a fogueira."
  add('2-fogueira', shotStart(2), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', lia.root, fire.group); night(L0); hero.vest.visible = false;
    fire.update(c.t, 1); fire.group.position.copy(FIRE).add(V(0, Math.sin(c.t * 1.5) * 0.05, 0));
    const k = easeInOut(c.u);
    hero.root.position.copy(DP(lerp(27.5, 25, k), lerp(-10.8, -11.8, k))); hero.root.rotation.set(0, -Math.PI / 2 - 0.15, 0); hero.wade(c.t, 0.8);
    hero.armR.rotation.x = -2.9; hero.face('worried');
    lia.root.position.copy(DP(lerp(25.5, 23, k), lerp(-13.2, -13.9, k))); lia.root.rotation.set(0, -Math.PI / 2 - 0.1, 0); lia.wade(c.t + 0.4, 0.8); lia.face('determined');
    fillAt(FIRE.clone().add(V(6, 5, 2)), 10);
    cam(FIRE.clone().add(V(lerp(-17, -15, k), L0 - FIRE.y + 3.2, -3)), FIRE.clone().add(V(0, 2.2, -1)), 50, 0.03, c.t);
    c.focus = FIRE;
  });

  // 3 — "A Lia subiu primeiro, pelas tábuas pregadas no tronco."
  add('3-lia-sobe', shotStart(3), (c) => {
    c.show('ocean', 'island', 'hero', lia.root, giant); night(L0 + 1); placeTree(0); hero.vest.visible = false;
    const yL = lerp(PLANK_Y(1), PLANK_Y(8), easeInOut(c.u));
    lia.climb(c.t); lia.oar.visible = false; climbAt(lia, yL); lia.face('determined');
    hero.climb(c.t * 0.4); climbAt(hero, PLANK_Y(0) - 1.5 + c.u * 1.2); hero.face('worried');
    const top = onTree(0, yL + 2, 3);
    fillAt(onTree(4, yL + 3, 10), 25);
    cam(onTree(lerp(5, 3, c.u), lerp(1, 6, c.u), 12), top.clone().add(V(0, 3, 0)), 58, 0.02, c.t);
    lia.oar.visible = true;
    c.focus = top;
  });

  // 4 — "No meio do caminho... uma tábua quebrou!"
  const tQ = word('quebrou');
  add('4-tabua', shotStart(4), (c) => {
    c.show('ocean', 'island', 'hero', lia.root, giant, loose); night(L0 + 1); placeTree(0); hero.vest.visible = false;
    const yD = lerp(PLANK_Y(4), PLANK_Y(6) + 0.3, easeOut(range(c.t, c.start, tQ - 0.1)));
    const broke = c.t > tQ - 0.05, fall = range(c.t, tQ - 0.05, tQ + 1.6);
    plank6.visible = !broke;
    const pp = onTree(0, PLANK_Y(6), 3.0 - 6 * 0.035);
    loose.visible = broke; loose.position.copy(pp).add(V(Math.sin(fall * 3) * 0.6, -fall * fall * 16, fall * 2.5)); loose.rotation.set(fall * 6, fall * 2, fall * 4);
    lia.climb(c.t * 0.3); climbAt(lia, PLANK_Y(10)); lia.face(broke ? 'scared' : 'determined');
    const drop = broke ? Math.min(1.4, (c.t - tQ) * 6) : 0;
    hero.climb(broke ? c.t * 3 : c.t); climbAt(hero, yD - drop); hero.face(broke ? 'shout' : 'determined');
    if (broke) { hero.legL.rotation.x = 0.3; hero.legR.rotation.x = -0.2; hero.armR.rotation.x = -0.2; }
    const hd = headOf(hero);
    fillAt(hd.clone().add(V(3, 2, 6)), 25);
    cam(hd.clone().add(V(lerp(4.5, 3.2, c.u), -2.4, 6.5)), hd.clone().add(V(0, -1.6, 0)), 55, broke ? 0.35 * (1 - range(c.t, tQ, tQ + 1.2)) + 0.03 : 0.03, c.t);
    c.fx.flash = broke ? Math.max(0, 0.35 - (c.t - tQ)) : 0;
    c.focus = hd;
  });

  // 5 — "Fiquei pendurado por uma mão... e ela me puxou."
  const tPux = word('puxou');
  add('5-pendurado', shotStart(5), (c) => {
    c.show('ocean', 'island', 'hero', lia.root, giant); night(L0 + 1); placeTree(0); hero.vest.visible = false;
    plank6.visible = false;
    const pull = easeInOut(range(c.t, tPux - 0.5, tPux + 0.7));
    const grip = onTree(0.3, PLANK_Y(7) + 0.2, trunkR(PLANK_Y(7)) + 0.6);
    // Lia agachada na tábua 8 estendendo o braço
    climbAt(lia, PLANK_Y(8) + 0.4 + pull * 1.0); lia.idle(c.t); lia.armL.rotation.x = -2.8; lia.armR.rotation.x = lerp(-1.2, -2.2, pull); lia.torso.rotation.x = 0.4; lia.face('determined');
    hero.reset(); hero.face(pull < 0.4 ? 'shout' : 'tired');
    hero.armL.rotation.x = -Math.PI; hero.armR.rotation.x = lerp(-0.3, -2.8, pull);
    hero.legL.rotation.x = Math.sin(c.t * 6) * 0.5 * (1 - pull); hero.legR.rotation.x = -Math.sin(c.t * 6) * 0.5 * (1 - pull);
    const swing = Math.sin(c.t * 2.2) * 0.18 * (1 - pull);
    climbAt(hero, PLANK_Y(7) - 5.4 + pull * 3.2);
    hero.root.position.add(V(swing * 2, 0, 0.3)); hero.root.rotateZ(swing);
    const mid = grip.clone();
    fillAt(mid.clone().add(V(3, 1, 7)), 30);
    cam(mid.clone().add(V(lerp(6.5, 5, c.u), lerp(-4.5, -2.5, c.u), 7.5)), mid.clone().add(V(0, -1.4, 0)), 58, 0.06 * (1 - pull), c.t);
    c.focus = mid;
  });

  // 6 — "Lá em cima tinha uma plataforma velha... e uma mochila."
  add('6-plataforma', shotStart(6), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', lia.root, giant); night(L0 + 1.5); placeTree(0); hero.vest.visible = false;
    const center = onTree(0, DECK_Y, 0), packW = onTree(2.6, DECK_Y + 0.6, 2.3);
    const k = easeOut(range(c.local, 0, 1.2));
    onDeck(hero, lerp(0.15, 0.55, k), 3.8, packW); k < 1 ? hero.walk(c.t, 0.9) : hero.idle(c.t); hero.face(c.t > word('mochila') ? 'surprised' : 'tired');
    onDeck(lia, -0.5, 3.9, packW); lia.idle(c.t); lia.face('neutral');
    const a = lerp(1.9, 1.5, easeInOut(c.u));
    fillAt(center.clone().add(V(Math.sin(a) * 8, 4, Math.cos(a) * 8)), 30);
    cam(center.clone().add(V(Math.sin(a) * 15, 6, Math.cos(a) * 15)), center.clone().add(V(1.2, 2.2, 2.5)), 55, 0.02, c.t);
    c.focus = center;
  });

  // 7 — "Dentro: um rádio quebrado... e uma foto."  /  8 — "Na foto, a Lia... e um homem."
  const tFoto = word('foto', 1);
  const holding = (c, item, t0) => {
    c.show('ocean', 'island', 'hero', lia.root, giant, item); night(L0 + 1.5); placeTree(0); hero.vest.visible = false;
    const packW = onTree(2.6, DECK_Y + 0.6, 2.3);
    onDeck(hero, 0.55, 3.8, packW); hero.idle(c.t); hero.armL.rotation.x = -1.3; hero.armR.rotation.x = -1.3; hero.neck.rotation.x = 0.35;
    onDeck(lia, 0.05, 3.9, packW); lia.idle(c.t);
    const hd = headOf(hero), f = forwardOf(hero);
    const pos = hd.clone().add(f.clone().multiplyScalar(1.8)).add(V(0, -1.6, 0));
    const lift = easeOut(range(c.t, t0, t0 + 0.5));
    item.position.copy(pos).add(V(0, (lift - 1) * 0.8, 0));
    const camPos = hd.clone().add(f.clone().multiplyScalar(0.2)).add(V(f.z * 0.6, 0.5, -f.x * 0.6));
    return { pos, camPos, hd, f };
  };
  add('7-radio', shotStart(7), (c) => {
    const { pos, camPos, f } = holding(c, radio, c.start);
    radio.lookAt(camPos); hero.face('worried'); lia.face('worried');
    fillAt(pos.clone().add(V(0, 2, 0)).add(f.clone().multiplyScalar(-2)), 20);
    cam(camPos.clone().lerp(pos, 0.25), pos, 50, 0.015, c.t);
    c.focus = pos;
  });
  add('7-foto', tFoto - 0.15, (c) => {
    const { pos, camPos, f } = holding(c, photo, c.start);
    photo.position.add(V(0, 0.3, 0)); photo.lookAt(camPos); hero.face('surprised'); lia.face('surprised');
    const z = easeInOut(range(c.local, 0.2, 1.4));
    fillAt(pos.clone().add(V(0, 2, 0)).add(f.clone().multiplyScalar(-2)), 22);
    cam(camPos.clone().lerp(photo.position.clone().add(camPos.clone().sub(photo.position).normalize().multiplyScalar(1.6)), z), photo.position, 50, 0.015, c.t);
    c.fx.vignette = 0.75;
    c.focus = pos;
  });

  // 9 — Lia: "É meu pai. Ele sumiu no dia vinte."
  add('9-lia-pai', shotStart(9), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', lia.root, giant); night(L0 + 1.5); placeTree(0); hero.vest.visible = false;
    const center = onTree(0, DECK_Y, 0);
    onDeck(lia, 0.05, 3.9); onDeck(hero, 0.75, 3.8);
    const lp = lia.root.position.clone(), hp = hero.root.position.clone();
    lia.root.rotation.set(0, 0.25, 0); lia.idle(c.t); lia.face('sad'); lia.neck.rotation.x = 0.25;
    hero.root.rotation.set(0, Math.atan2(lp.x - hp.x, lp.z - hp.z), 0); hero.idle(c.t); hero.face('worried');
    const lh = headOf(lia), f = forwardOf(lia);
    fillAt(lh.clone().add(f.clone().multiplyScalar(4)).add(V(0, 1, 0)), 30);
    cam(lh.clone().add(f.clone().multiplyScalar(lerp(5.2, 4.2, c.u))).add(V(0.4, 0.1, 0)), lh.clone().add(V(0, -0.2, 0)), 45, 0.015, c.t);
    c.focus = center;
  });

  // 10 — "Lá de cima, a ilha tinha sumido. Só a árvore... e o farol."
  add('10-ilha-sumiu', shotStart(10), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', lia.root, giant); night(L1); placeTree(0); hero.vest.visible = false;
    onDeck(hero, 2.4, 3.8, V(0, 30, 0)); hero.idle(c.t); hero.face('scared');
    onDeck(lia, 2.0, 3.9, V(0, 30, 0)); lia.idle(c.t); lia.face('worried');
    const mid = GT.clone().lerp(V(0, 0, 0), 0.5).setY(20);
    const a = lerp(-2.2, -1.1, easeInOut(c.u));
    cam(mid.clone().add(V(Math.cos(a) * 75, 52 - c.u * 8, Math.sin(a) * 75)), mid.clone().add(V(0, 8, 0)), 50, 0.01, c.t);
    c.focus = mid;
  });

  // 11 — "De repente, a luz do farol acendeu sozinha!"
  const tAc = word('acendeu', 1);
  const deckView = (c, k) => {
    c.show('ocean', 'island', 'hero', 'flare', lia.root, giant); night(L1); placeTree(0); hero.vest.visible = false;
    beaconOn(c.t, k);
    onDeck(hero, LAMP_A + 0.25, 4.2, LAMP); hero.idle(c.t); onDeck(lia, LAMP_A - 0.15, 4.3, LAMP); lia.idle(c.t);
  };
  add('11-farol-acende', shotStart(11), (c) => {
    const k = c.t < tAc ? 0 : easeOut(range(c.t, tAc, tAc + 0.4)) * (c.t < tAc + 0.25 ? (Math.sin((c.t - tAc) * 60) > 0 ? 1 : 0.2) : 1);
    deckView(c, k);
    hero.face(c.t > tAc ? 'surprised' : 'worried'); lia.face(c.t > tAc ? 'surprised' : 'worried');
    const hd = headOf(hero), dir = LAMP.clone().sub(hd).setY(0).normalize(), side = V(dir.z, 0, -dir.x);
    cam(hd.clone().add(side.multiplyScalar(5.5)).add(dir.clone().multiplyScalar(-1.5)).add(V(0, 0.8, 0)), hd.clone().lerp(LAMP, 0.55), lerp(55, 48, c.u), 0.02, c.t);
    c.fx.flash = c.t > tAc ? Math.max(0, 0.35 - (c.t - tAc) * 0.8) : 0;
    c.focus = hd;
  });

  // 12 — "Alguém tava lá dentro."
  add('12-alguem', shotStart(12), (c) => {
    deckView(c, 1);
    shadowMan.root.visible = true; shadowMan.idle(c.t);
    const a = lerp(-1.0, 0.8, easeInOut(c.u));
    shadowMan.root.position.set(Math.sin(a) * 1.1 - 0.3, GAL + 0.2, Math.cos(a) * 1.1 - 1.2); shadowMan.root.rotation.set(0, a + Math.PI / 2, 0);
    shadowMan.walk(c.t, 0.6, 0.3);
    const eye = onTree(Math.sin(LAMP_A) * 6.5, DECK_Y + 5.5, Math.cos(LAMP_A) * 6.5);
    cam(eye, LAMP.clone().add(V(0, 0.6, 0)), lerp(26, 18, easeOut(c.u)), 0.05, c.t);
    c.fx.vignette = 0.9;
    c.focus = LAMP;
  });

  // 13 — "E o navio... começou a virar na direção da luz."
  add('13-navio', shotStart(13), (c) => {
    deckView(c, 1); c.show(w.ship); shipLights.visible = true;
    const turn = easeInOut(range(c.local, 0.6, c.dur));
    w.ship.position.copy(SHIP).add(V(0, 0, turn * 12)); w.ship.position.y = L1 - 9.4;
    w.ship.rotation.y = lerp(Math.PI / 2, Math.atan2(-SHIP.x, -SHIP.z), turn);
    hero.face('happy'); lia.face('happy');
    const eye = onTree(Math.sin(SHIP_A) * 6.5, DECK_Y + 5.5, Math.cos(SHIP_A) * 6.5);
    cam(eye, SHIP.clone().add(V(0, 6, 0)), lerp(12, 9, c.u), 0.02, c.t);
    c.focus = V(-30, 10, -150);
  });

  // 14 — "Mas a árvore começou a ranger. A água tava levando a terra das raízes."
  const tAgua = word('agua', 2);
  const tilt = (t) => easeIn(range(t, word('ranger') - 0.3, line(14).speechEnd)) * 0.12 + Math.sin(t * 11) * 0.004 * range(t, word('ranger') - 0.3, word('ranger'));
  add('14-ranger', shotStart(14), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', lia.root, giant); night(L1); beaconOn(c.t, 1); placeTree(tilt(c.t)); hero.vest.visible = false;
    onDeck(hero, 0.5, 3.6); onDeck(lia, 0.0, 3.7);
    const tq = giant.quaternion;
    for (const ch of [hero, lia]) { ch.root.quaternion.copy(tq); ch.idle(c.t); ch.armL.rotation.x = -1.6; ch.armR.rotation.x = -1.6; ch.armL.rotation.z = 0.6; ch.armR.rotation.z = -0.6; }
    hero.face('scared'); lia.face('scared');
    const center = onTree(0, DECK_Y + 2, 0);
    fillAt(center.clone().add(V(0, 3, 9)), 30);
    cam(center.clone().add(V(2, 1.5, 13)), center, 55, 0.12 + tilt(c.t) * 2, c.t);
    c.focus = center;
  });
  add('14-raizes', tAgua - 0.1, (c) => {
    c.show('ocean', 'island', giant, mud.mesh, foam.mesh); night(L1); beaconOn(c.t, 1); placeTree(tilt(c.t));
    ocean.amp = 0.5; ocean.choppy = 1.5;
    mud.update(c.t, GT, L1, 3.5, 1); foam.update(c.t, GT, L1, [0.6, 0.8], 10, 9);
    cam(GT.clone().add(V(9, L1 - GT.y + 1.2, 8)), GT.clone().add(V(0, L1 - GT.y + 2.5, 0)), 55, 0.2, c.t);
    c.focus = GT;
  });

  // 15/16 — escolha (tela dividida). A: ficar na árvore / B: nadar até o farol
  const SPLIT_A = { l1: 'FICAR NA', l2: 'ÁRVORE', color: '#45f06a' }, SPLIT_B = { l1: 'NADAR ATÉ', l2: 'O FAROL', color: '#ff8a1f' };
  const choice = (focus) => (c) => {
    c.show('ocean', 'island', 'hero', 'flare', lia.root, giant); night(L1); beaconOn(c.t, 1); placeTree(0.12 + Math.sin(c.t * 2) * 0.004); hero.vest.visible = false;
    onDeck(hero, 0.5, 3.6); onDeck(lia, 0.0, 3.7);
    for (const ch of [hero, lia]) { ch.root.quaternion.copy(giant.quaternion); ch.idle(c.t); ch.armL.rotation.x = -1.6; ch.armR.rotation.x = -1.6; }
    hero.face('worried'); lia.face('worried');
    const center = onTree(0, DECK_Y + 2, 0), z = easeOut(c.u);
    fillAt(center.clone().add(V(0, 3, 9)), 30);
    c.split = {
      left: () => cam(center.clone().add(V(4, lerp(-4, -2, z), 22)), center.clone().add(V(0, -3, 0)), 70, 0.03, c.t),
      right: () => cam(GT.clone().lerp(V(0, 0, 0), 0.35).setY(L1 + 1.2), LAMP.clone().add(V(0, -6, 0)), lerp(60, 50, z), 0.04, c.t + 2),
    };
    c.fx.split = { k: easeOut(range(c.local, 0, 0.3)), focus, a: SPLIT_A, b: SPLIT_B };
    c.fx.captionY = 1330;
    c.focus = center;
  };
  add('15-escolha-A', shotStart(15), choice('A'));
  add('16-escolha-B', shotStart(16), choice('B'));

  // 17 — "O que você faria? Comenta A ou B!"
  add('17-final', shotStart(17), (c) => {
    c.show('ocean', 'island', 'hero', 'flare', lia.root, giant); night(L1); beaconOn(c.t, 1); placeTree(0.12); hero.vest.visible = false;
    // os dois de frente para a câmera, com o farol girando atrás
    const center = onTree(0, DECK_Y, 0);
    const toCam = V(Math.sin(-0.9), 0, Math.cos(-0.9));
    onDeck(hero, -0.75, 3.8); onDeck(lia, -1.15, 3.9);
    for (const ch of [hero, lia]) { ch.root.rotation.set(0, Math.atan2(toCam.x, toCam.z), 0); ch.idle(c.t); }
    hero.armR.rotation.x = -1.3; hero.armR.rotation.z = 0.6;
    hero.face(c.local < 1.2 ? 'determined' : 'happy'); lia.face(c.local < 1.5 ? 'determined' : 'happy');
    lia.neck.rotation.x = Math.sin(range(c.local, 1.2, 1.8) * Math.PI) * 0.2;
    const mid = hero.root.position.clone().lerp(lia.root.position, 0.5);
    fillAt(mid.clone().add(toCam.clone().multiplyScalar(6)).add(V(0, 5, 0)), 18);
    cam(mid.clone().add(toCam.clone().multiplyScalar(lerp(13, 11, easeOut(c.u)))).add(V(0, 5.0, 0)), mid.clone().add(V(0, 3.4, 0)), 50, 0.02, c.t);
    c.fx.cta = { k: easeOut(range(c.local, 0.3, 0.7)), part2: c.t > tl.duration - 2.2, y: 1080 };
    c.fx.black = range(c.t, tl.duration - 0.35, tl.duration);
    c.focus = center;
  });

  S.sort((a, b) => a.start - b.start);
  S.forEach((s, i) => (s.end = i + 1 < S.length ? S[i + 1].start : tl.duration + 1));
  return S;
}
