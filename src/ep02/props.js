// Objetos novos do EP. 2: Lia, fogueira, diário, cipó, canoa, galhos, árvore gigante, luzes do navio, espuma da correnteza
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng, clamp } from '../lib/util.js';

const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
const box = (w, h, d, c, o) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'string' ? M(c, o) : c);
const shadow = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };

// ---------------- LIA ----------------
export function makeLia(Character) {
  const lia = new Character({ shirt: '#2f7fd6', pants: '#7a5a36', skin: '#d9a273', lashes: true });
  lia.capGroup.visible = false; lia.vest.visible = false;
  const hairM = M('#1c120c');
  const top = new THREE.Mesh(new RoundedBoxGeometry(1.36, 0.42, 1.3, 2, 0.15), hairM); top.position.y = 1.18;
  const back = new THREE.Mesh(new RoundedBoxGeometry(1.32, 1.5, 0.34, 2, 0.12), hairM); back.position.set(0, 0.55, -0.55);
  const tail = new THREE.Mesh(new RoundedBoxGeometry(0.45, 1.3, 0.4, 2, 0.15), hairM); tail.position.set(0, -0.2, -0.75); tail.rotation.x = 0.25;
  const fringe = box(1.3, 0.22, 0.2, hairM); fringe.position.set(0, 1.05, 0.58);
  const band = box(1.4, 0.22, 1.34, '#d62f2f'); band.position.y = 1.0;
  const knot = box(0.3, 0.3, 0.3, '#d62f2f'); knot.position.set(0.25, 1.0, -0.72);
  lia.neck.add(top, back, tail, fringe, band, knot);
  // camiseta rasgada: barra irregular
  for (let i = 0; i < 5; i++) { const r = box(0.3, 0.25, 1.02, '#2f7fd6'); r.position.set(-0.8 + i * 0.4, 0.05 - (i % 2) * 0.12, 0); lia.torso.add(r); }
  // remo na mão direita
  const paddle = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.6, 8), M('#8b5a2b')); paddle.add(shaft);
  const blade = new THREE.Mesh(new RoundedBoxGeometry(0.7, 1.4, 0.12, 2, 0.05), M('#a8723f')); blade.position.y = -2.6; paddle.add(blade);
  paddle.position.set(0, 0, 0.1);
  lia.handR.add(paddle); lia.oar = paddle;
  shadow(lia.root);
  return lia;
}

// ---------------- FOGUEIRA ----------------
export class Campfire {
  constructor() {
    this.group = new THREE.Group();
    const r = rng(31);
    for (let i = 0; i < 9; i++) { // pedras
      const a = (i / 9) * Math.PI * 2, s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45 + r() * 0.2, 0), M('#6d6f72', { flatShading: true }));
      s.position.set(Math.cos(a) * 1.5, 0.2, Math.sin(a) * 1.5); s.rotation.set(r() * 3, r() * 3, 0); this.group.add(s);
    }
    for (let i = 0; i < 4; i++) { // lenha
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 2.2, 6), M('#5b3a1e'));
      l.rotation.set(Math.PI / 2 - 0.35, (i / 4) * Math.PI * 2, 0); l.position.y = 0.45; this.group.add(l);
    }
    this.flames = [];
    const cols = ['#ff5a1a', '#ff8a1f', '#ffc23a', '#fff2a0'];
    for (let i = 0; i < 9; i++) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.45 - (i % 4) * 0.07, 1.6 - (i % 4) * 0.25, 5),
        new THREE.MeshBasicMaterial({ color: cols[i % 4], transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      f.userData = { a: r() * 6.28, rad: (i % 4 === 3 ? 0 : 0.15 + r() * 0.35), ph: r() * 6.28 };
      this.group.add(f); this.flames.push(f);
    }
    this.light = new THREE.PointLight('#ff8a3a', 40, 28, 1.6); this.light.position.y = 1.6; this.group.add(this.light);
    this.sparks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: '#ffd27a', fog: false }), 40);
    this.sparkSeed = Array.from({ length: 40 }, () => [r(), r() * 2 - 1, r() * 2 - 1]);
    this.sparks.frustumCulled = false; this.group.add(this.sparks);
    this.d = new THREE.Object3D();
    shadow(this.group);
    this.flames.forEach((f) => (f.castShadow = false));
  }
  update(t, out = 0) { // out: 0 = acesa, 1 = apagada
    const k = 1 - clamp(out);
    this.flames.forEach((f, i) => {
      const u = f.userData, fl = 0.75 + 0.25 * Math.sin(t * 13 + u.ph) * Math.sin(t * 7.3 + u.ph * 2);
      f.position.set(Math.cos(u.a + t * 0.6) * u.rad, 0.9 + fl * 0.35 * k, Math.sin(u.a + t * 0.6) * u.rad);
      f.scale.set(k * (0.9 + fl * 0.2), k * fl * 1.2, k * (0.9 + fl * 0.2));
      f.rotation.y = t * 2 + i; f.visible = k > 0.02;
    });
    this.light.intensity = 40 * k * (0.8 + 0.2 * Math.sin(t * 17) * Math.sin(t * 5.1));
    this.sparkSeed.forEach(([o, x, z], i) => {
      const q = (o + t * 0.5) % 1;
      this.d.position.set(x * 0.6 * (0.3 + q) + Math.sin(t * 3 + i) * 0.2, 1 + q * 5, z * 0.6 * (0.3 + q));
      this.d.scale.setScalar(k * (1 - q)); this.d.updateMatrix(); this.sparks.setMatrixAt(i, this.d.matrix);
    });
    this.sparks.instanceMatrix.needsUpdate = true;
  }
}

// ---------------- DIÁRIO ----------------
function pageTex(lines) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 640;
  const g = c.getContext('2d');
  g.fillStyle = '#efe2c2'; g.fillRect(0, 0, 512, 640);
  g.strokeStyle = 'rgba(80,110,160,0.35)'; g.lineWidth = 2;
  for (let y = 90; y < 640; y += 44) { g.beginPath(); g.moveTo(20, y); g.lineTo(492, y); g.stroke(); }
  g.fillStyle = 'rgba(120,80,40,0.15)'; for (let i = 0; i < 12; i++) g.fillRect((i * 97) % 480, (i * 151) % 600, 30, 18);
  g.textAlign = 'center';
  for (const [txt, y, size, col] of lines) { g.font = `${size}px "Lilita One", sans-serif`; g.fillStyle = col; g.fillText(txt, 256, y); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
export function makeDiary() {
  const g = new THREE.Group();
  const cover = box(2.3, 0.08, 1.5, '#7a2a1d'); cover.position.y = -0.05; g.add(cover);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.4), new THREE.MeshStandardMaterial({
    map: pageTex([['DIA 42', 150, 120, '#1d2a44'], ['ainda sozinha.', 260, 56, '#33405e'], ['o farol ta', 350, 56, '#33405e'], ['seguro... por', 420, 56, '#33405e'], ['enquanto', 490, 56, '#33405e']]), roughness: 1 }));
  left.rotation.set(-Math.PI / 2, 0, 0); left.position.set(-0.57, 0.01, 0); left.rotation.y = 0.04;
  const right = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.4), new THREE.MeshStandardMaterial({
    map: pageTex([['A MARÉ', 140, 92, '#1d2a44'], ['SOBE TODA', 240, 92, '#1d2a44'], ['LUA CHEIA.', 340, 92, '#b3160f'], ['e hoje...', 470, 62, '#33405e'], ['é lua cheia.', 540, 62, '#b3160f']]), roughness: 1 }));
  right.rotation.set(-Math.PI / 2, 0, 0); right.position.set(0.57, 0.01, 0);
  g.add(left, right);
  const spine = box(0.08, 0.1, 1.5, '#4a1a12'); g.add(spine);
  return shadow(g);
}

// ---------------- CIPÓ ----------------
export function makeVine(len = 14) {
  const g = new THREE.Group();
  const m = M('#3f7a2a');
  const segs = 10;
  for (let i = 0; i < segs; i++) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, len / segs + 0.05, 6), m);
    s.position.y = -(i + 0.5) * (len / segs); s.rotation.z = Math.sin(i * 1.7) * 0.05; g.add(s);
    if (i % 2) { const l = box(0.6, 0.05, 0.35, '#4f9a33'); l.position.set(0.25, s.position.y, 0); l.rotation.z = 0.5; g.add(l); }
  }
  return shadow(g);
}

// ---------------- CANOA E GALHOS ----------------
export function makeCanoe() {
  const g = new THREE.Group(), wood = M('#8a5a30'), dark = M('#4a2f18');
  const hull = new THREE.Mesh(new RoundedBoxGeometry(1.8, 0.9, 6.4, 2, 0.3), wood); g.add(hull);
  for (const z of [3.4, -3.4]) {
    const tip = box(1.3, 0.9, 1.3, wood); tip.rotation.y = Math.PI / 4; tip.position.z = z; tip.scale.set(1, 1, 1); g.add(tip);
  }
  const inner = box(1.4, 0.1, 6.2, dark); inner.position.y = 0.42; g.add(inner);
  const rim = box(1.9, 0.12, 6.6, '#a8723f'); rim.position.y = 0.48; g.add(rim);
  for (const z of [-1.4, 1.4]) { const seat = box(1.5, 0.12, 0.4, '#a8723f'); seat.position.set(0, 0.35, z); g.add(seat); }
  return shadow(g);
}
export function makeBranches() {
  const g = new THREE.Group(), r = rng(77), greens = ['#2f7d32', '#3c9a3c', '#276b2b', '#4caf50'];
  for (let i = 0; i < 9; i++) {
    const b = box(2.4 + r() * 2, 0.35, 1.4 + r(), greens[i % 4], { flatShading: true });
    b.position.set((r() - 0.5) * 2.2, 0.6 + r() * 0.8, (r() - 0.5) * 6.5); b.rotation.set(r() * 0.4, r() * 3, r() * 0.4); g.add(b);
  }
  return shadow(g);
}

// ---------------- ÁRVORE GIGANTE ----------------
export function makeGiantTree() {
  const g = new THREE.Group(), bark = M('#5e3d22', { flatShading: true }), r = rng(5);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 3.2, 36, 10, 6), bark); trunk.position.y = 18; g.add(trunk);
  for (let i = 0; i < 7; i++) { // raízes
    const a = (i / 7) * Math.PI * 2, root = box(1.2, 1.4, 5, bark); root.position.set(Math.cos(a) * 3.2, 0.5, Math.sin(a) * 3.2); root.rotation.y = -a + Math.PI / 2; root.rotation.x = 0.25; g.add(root);
  }
  for (let i = 0; i < 6; i++) { // galhos
    const a = (i / 6) * Math.PI * 2 + 0.3, br = box(0.9, 0.9, 10, bark); br.position.set(Math.cos(a) * 4.5, 26 + (i % 3) * 3.5, Math.sin(a) * 4.5); br.rotation.y = -a + Math.PI / 2; br.rotation.x = -0.35; g.add(br);
  }
  const greens = ['#2c6e2f', '#357f34', '#22582a', '#3f8f3a'];
  for (let i = 0; i < 16; i++) { // copa
    const s = 6 + r() * 6, c = box(s, s * 0.7, s, greens[i % 4], { flatShading: true });
    const a = r() * Math.PI * 2, d = r() * 9;
    c.position.set(Math.cos(a) * d, 33 + r() * 9, Math.sin(a) * d); c.rotation.y = r() * 2; g.add(c);
  }
  for (let i = 0; i < 6; i++) { // cipós pendurados
    const v = makeVine(10 + r() * 8); const a = r() * 6.28; v.position.set(Math.cos(a) * 7, 32, Math.sin(a) * 7); g.add(v);
  }
  // escada de cordas/tábuas pregadas no tronco (caminho para subir)
  for (let i = 0; i < 14; i++) { const st = box(1.4, 0.18, 0.5, '#a8723f'); st.position.set(0, 2 + i * 1.8, 3.0 - i * 0.035); g.add(st); }
  return shadow(g);
}

// ---------------- LUZES DO NAVIO (noite) ----------------
export function makeShipLights() {
  const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: '#ffe9a0', fog: false });
  for (let i = 0; i < 18; i++) { const l = box(2.2, 1.6, 2.2, m); l.position.set(i % 2 ? 4.1 : -4.1, 6 + (i % 3), -18 + Math.floor(i / 2) * 1.2); g.add(l); }
  const mast = box(2.5, 2.5, 2.5, new THREE.MeshBasicMaterial({ color: '#ff4040', fog: false })); mast.position.set(0, 14, -14); g.add(mast);
  const mast2 = mast.clone(); mast2.material = new THREE.MeshBasicMaterial({ color: '#40ff70', fog: false }); mast2.position.set(0, 9, 22); g.add(mast2);
  return g;
}

// ---------------- ESPUMA DA CORRENTEZA ----------------
export class Foam {
  constructor(n = 90) {
    const r = rng(19);
    this.seed = Array.from({ length: n }, () => [r() * 2 - 1, r() * 2 - 1, r(), 0.6 + r() * 0.8]);
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.2, 0.08, 0.25), new THREE.MeshBasicMaterial({ color: '#f4fbff', transparent: true, opacity: 0.8 }), n);
    this.mesh.frustumCulled = false; this.d = new THREE.Object3D();
  }
  update(t, center, y, dir = [1, 0], speed = 8, spread = 12) {
    this.seed.forEach(([x, z, o, s], i) => {
      const k = ((o + t * speed * 0.05 * s) % 1) * 2 - 1; // -1..1 ao longo da correnteza
      const px = center.x + dir[0] * k * spread + -dir[1] * z * spread * 0.6, pz = center.z + dir[1] * k * spread + dir[0] * z * spread * 0.6;
      this.d.position.set(px + x * 0.5, y + 0.08, pz);
      this.d.rotation.set(0, -Math.atan2(dir[1], dir[0]), 0);
      this.d.scale.set(s * 1.5, 1, s); this.d.updateMatrix(); this.mesh.setMatrixAt(i, this.d.matrix);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
