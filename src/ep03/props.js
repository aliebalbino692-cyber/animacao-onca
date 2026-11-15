// Objetos novos do EP. 3: plataforma na árvore, mochila, rádio, foto, tábua que cai, luz do farol, silhueta, lama das raízes
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng } from '../lib/util.js';

const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
const box = (w, h, d, c, o) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'string' ? M(c, o) : c);
const shadow = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };

// raio do tronco da árvore gigante numa altura local y (cilindro 3.2 -> 1.8 em 36)
export const trunkR = (y) => 3.2 - (1.4 * y) / 36;
export const PLANK_Y = (i) => 2 + i * 1.8;  // tábuas pregadas no tronco (lado +z)
export const DECK_Y = 21;                    // plataforma (altura local na árvore, abaixo da copa)

// ---------------- PLATAFORMA ----------------
export function makePlatform() {
  const g = new THREE.Group(), wood = M('#8b5a2b'), dark = M('#5e3d22'), r = rng(8);
  for (let i = 0; i < 12; i++) { // tábuas em volta do tronco
    const a = (i / 12) * Math.PI * 2, p = box(1.5, 0.25, 5.2, i % 2 ? wood : M('#9b6a38'));
    p.geometry.translate(0, 0, 3.6); p.rotation.y = a + (r() - 0.5) * 0.05; p.position.y = -0.12; g.add(p);
  }
  for (let i = 0; i < 10; i++) { // postes e corda
    const a = (i / 10) * Math.PI * 2 + 0.3, post = box(0.25, 1.6, 0.25, dark);
    post.position.set(Math.sin(a) * 5.9, 0.8, Math.cos(a) * 5.9); g.add(post);
  }
  const rope = new THREE.Mesh(new THREE.TorusGeometry(5.9, 0.07, 6, 40), M('#c9b07a')); rope.rotation.x = Math.PI / 2; rope.position.y = 1.4; g.add(rope);
  const tarp = new THREE.Mesh(new THREE.PlaneGeometry(5, 4, 4, 4), M('#2f6fb3', { side: THREE.DoubleSide, flatShading: true }));
  { const p = tarp.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 0.8) * 0.3); tarp.geometry.computeVertexNormals(); }
  tarp.rotation.set(-1.2, 0.6, 0); tarp.position.set(-2.6, 3.2, -2.6); g.add(tarp);
  const crate = box(1.1, 0.8, 0.9, wood); crate.position.set(-3.4, 0.4, 1.2); crate.rotation.y = 0.5; g.add(crate);
  return shadow(g);
}

// ---------------- MOCHILA, RÁDIO, FOTO ----------------
export function makeBackpack() {
  const g = new THREE.Group(), red = M('#2b5d3a');
  const body = new THREE.Mesh(new RoundedBoxGeometry(1.2, 1.3, 0.7, 2, 0.15), red); body.position.y = 0.65; g.add(body);
  const flap = new THREE.Mesh(new RoundedBoxGeometry(1.25, 0.15, 0.8, 2, 0.05), M('#21482d')); flap.position.set(0, 1.32, -0.2); flap.rotation.x = -0.9; g.add(flap);
  const pocket = box(0.8, 0.5, 0.15, '#21482d'); pocket.position.set(0, 0.45, 0.4); g.add(pocket);
  return shadow(g);
}
export function makeRadio() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.65, 0.35, 2, 0.06), M('#3a3d42', { roughness: 0.5 })); g.add(body);
  const grill = box(0.45, 0.45, 0.02, '#1c1d20'); grill.position.set(-0.22, 0, 0.18); g.add(grill);
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 12), M('#c9a23a', { metalness: 0.6 })); dial.rotation.x = Math.PI / 2; dial.position.set(0.28, 0.1, 0.19); g.add(dial);
  const screen = box(0.32, 0.14, 0.02, new THREE.MeshBasicMaterial({ color: '#2a3320' })); screen.position.set(0.28, -0.15, 0.18); g.add(screen);
  const crack = box(0.03, 0.4, 0.03, '#0b0b0b'); crack.position.set(-0.1, 0.05, 0.19); crack.rotation.z = 0.6; g.add(crack);
  const ant = new THREE.Group(); ant.position.set(0.4, 0.32, 0); g.add(ant);
  const a1 = box(0.04, 0.6, 0.04, '#999'); a1.position.y = 0.3; a1.rotation.z = -0.3; ant.add(a1);
  const a2 = box(0.04, 0.45, 0.04, '#999'); a2.position.set(0.25, 0.65, 0); a2.rotation.z = -1.4; ant.add(a2); // antena torta
  return shadow(g);
}
function photoTex() {
  const c = document.createElement('canvas'); c.width = 640; c.height = 480; const g = c.getContext('2d');
  g.fillStyle = '#f4efe2'; g.fillRect(0, 0, 640, 480);
  const x0 = 30, y0 = 30, W = 580, H = 380;
  const sky = g.createLinearGradient(0, y0, 0, y0 + H * 0.55); sky.addColorStop(0, '#7fb6d9'); sky.addColorStop(1, '#cfe4ee');
  g.fillStyle = sky; g.fillRect(x0, y0, W, H * 0.55);
  g.fillStyle = '#3a7ea1'; g.fillRect(x0, y0 + H * 0.55, W, H * 0.45);
  g.fillStyle = '#b8743f'; g.fillRect(x0 + 60, y0 + H * 0.62, W - 120, 60); // barco
  g.fillStyle = '#f3f0e8'; g.fillRect(x0 + 60, y0 + H * 0.62 - 6, W - 120, 10);
  const person = (cx, shirt, skin, hair, extra) => { // boneco em blocos
    g.fillStyle = shirt; g.fillRect(cx - 45, y0 + 150, 90, 95);
    g.fillStyle = skin; g.fillRect(cx - 38, y0 + 78, 76, 72);
    g.fillStyle = '#1b1b1b'; g.fillRect(cx - 20, y0 + 104, 9, 13); g.fillRect(cx + 11, y0 + 104, 9, 13);
    g.lineWidth = 5; g.strokeStyle = '#1b1b1b'; g.beginPath(); g.arc(cx, y0 + 124, 14, 0.2, Math.PI - 0.2); g.stroke();
    g.fillStyle = hair; extra(cx);
  };
  person(x0 + 220, '#2f7fd6', '#d9a273', '#1c120c', (cx) => { g.fillRect(cx - 40, y0 + 66, 80, 20); g.fillStyle = '#d62f2f'; g.fillRect(cx - 40, y0 + 84, 80, 10); });
  person(x0 + 360, '#e8e2d0', '#c98d5e', '#5a3a1c', (cx) => {
    g.fillRect(cx - 55, y0 + 70, 110, 12); g.fillRect(cx - 36, y0 + 40, 72, 34); // chapéu
    g.fillStyle = '#4a3020'; g.fillRect(cx - 30, y0 + 130, 60, 18); // barba
  });
  g.fillStyle = 'rgba(120,80,30,0.25)'; g.fillRect(x0, y0, W, H); // tom envelhecido
  g.fillStyle = '#5a4630'; g.font = '30px "Lilita One", sans-serif'; g.textAlign = 'center'; g.fillText('EU E O PAI ♥', 320, 452);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
export function makePhoto() {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.9), new THREE.MeshStandardMaterial({ map: photoTex(), roughness: 0.9, side: THREE.DoubleSide }));
  const g = new THREE.Group(); g.add(m); return g;
}
export function makeLoosePlank() { return shadow(box(1.4, 0.18, 0.5, '#a8723f')); }

// ---------------- LUZ DO FAROL ----------------
export function makeBeacon(opacity = 0.13, radius = 9) {
  const g = new THREE.Group();
  const glow = new THREE.Mesh(new THREE.SphereGeometry(1.3, 16, 12), new THREE.MeshBasicMaterial({ color: '#fff6c8', fog: false }));
  const halo = new THREE.Mesh(new THREE.SphereGeometry(3.2, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffd76a', transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  g.add(glow, halo);
  const beam = new THREE.Group(); g.add(beam);
  for (const dir of [1, -1]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(radius, 160, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: '#fff0b0', transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    cone.geometry.translate(0, -80, 0); cone.rotation.z = dir * Math.PI / 2; beam.add(cone);
  }
  const light = new THREE.PointLight('#ffe9a0', 120, 90, 1.4); g.add(light);
  g.userData = { glow, halo, beam, light, opacity };
  return g;
}

// silhueta escura (alguém dentro do farol)
export function makeSilhouette(Character) {
  const s = new Character({ shirt: '#0c0c10', pants: '#0c0c10', cap: '#0c0c10', skin: '#0c0c10' });
  s.vest.visible = false; s.faceMat.visible = false;
  const hat = box(1.8, 0.15, 1.8, '#0c0c10'); hat.position.y = 1.25; s.neck.add(hat);
  const hatTop = box(1.2, 0.5, 1.2, '#0c0c10'); hatTop.position.y = 1.5; s.neck.add(hatTop);
  s.capGroup.visible = false;
  return s;
}

// lama/raízes: partículas marrons na água
export class Mud {
  constructor(n = 70) {
    const r = rng(41);
    this.seed = Array.from({ length: n }, () => [r() * 6.28, r(), 0.5 + r()]);
    this.mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.5, 0), new THREE.MeshStandardMaterial({ color: '#6b4a2a', flatShading: true, roughness: 1 }), n);
    this.mesh.frustumCulled = false; this.d = new THREE.Object3D();
  }
  update(t, center, y, radius = 4, k = 1) {
    this.seed.forEach(([a, o, s], i) => {
      const q = (o + t * 0.4 * s) % 1, rr = radius + q * 6;
      this.d.position.set(center.x + Math.cos(a + t * 0.3) * rr, y + Math.sin(q * Math.PI) * 0.4 - 0.2, center.z + Math.sin(a + t * 0.3) * rr);
      this.d.scale.setScalar(k * s * (1 - q) * 1.2); this.d.rotation.set(t + i, i, 0); this.d.updateMatrix(); this.mesh.setMatrixAt(i, this.d.matrix);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
