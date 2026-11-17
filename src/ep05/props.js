// Objetos novos do EP. 5: tiro do sinalizador, holofote do navio, bote salva-vidas, rachadura do farol, poeira
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng } from '../lib/util.js';

const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
const box = (w, h, d, c, o) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'string' ? M(c, o) : c);
const shadow = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };

// bola de fogo vermelha com rastro
export class FlareShot {
  constructor(n = 40) {
    this.group = new THREE.Group();
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(0.7, 14, 10), new THREE.MeshBasicMaterial({ color: '#ff3a2a', fog: false }));
    this.halo = new THREE.Mesh(new THREE.SphereGeometry(2.6, 14, 10), new THREE.MeshBasicMaterial({ color: '#ff5a3a', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.light = new THREE.PointLight('#ff4030', 0, 140, 1.2);
    this.group.add(this.ball, this.halo, this.light);
    this.trail = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.6, 0),
      new THREE.MeshBasicMaterial({ color: '#ffb0a0', transparent: true, opacity: 0.45, depthWrite: false, fog: false }), n);
    this.trail.frustumCulled = false; this.n = n; this.d = new THREE.Object3D();
  }
  // path(u) -> posição; u = progresso atual (0..1)
  update(path, u, t, glow = 1) {
    const p = path(u); this.group.position.copy(p);
    const pulse = 1 + Math.sin(t * 40) * 0.08;
    this.ball.scale.setScalar(pulse); this.halo.scale.setScalar(pulse * (0.8 + glow * 0.4));
    this.light.intensity = 260 * glow;
    for (let i = 0; i < this.n; i++) {
      const q = Math.max(0, u - i * 0.012);
      this.d.position.copy(path(q)).add(new THREE.Vector3(Math.sin(i * 1.7) * 0.2 * i * 0.05, 0, Math.cos(i * 2.1) * 0.2 * i * 0.05));
      this.d.scale.setScalar((0.4 + i * 0.05) * (q > 0 ? 1 : 0)); this.d.updateMatrix(); this.trail.setMatrixAt(i, this.d.matrix);
    }
    this.trail.instanceMatrix.needsUpdate = true;
  }
}

// holofote do navio (cone de luz branca)
export function makeSearchlight() {
  const g = new THREE.Group();
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 10), new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false }));
  g.add(lamp);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(14, 260, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: '#f4f8ff', transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  cone.geometry.translate(0, -130, 0); cone.geometry.rotateX(-Math.PI / 2); // aponta para +z local
  g.add(cone);
  g.userData = { lamp, cone };
  return g;
}

// bote salva-vidas laranja com dois tripulantes
export function makeLifeboat(Character) {
  const g = new THREE.Group(), orange = M('#ff6a1a', { roughness: 0.5 });
  const hull = new THREE.Mesh(new RoundedBoxGeometry(3.2, 1.3, 8, 2, 0.4), orange); hull.position.y = 0.3; g.add(hull);
  const top = box(2.6, 0.2, 7.2, '#f2f2f2'); top.position.y = 1.0; g.add(top);
  const stripe = box(3.25, 0.25, 8.05, '#ffffff'); stripe.position.y = 0.55; g.add(stripe);
  for (const z of [-2.2, 2.2]) {
    const crew = new Character({ shirt: '#ff7a1a', pants: '#2b3b55', cap: '#f2f2f2' });
    crew.vest.visible = true; crew.sit(0); crew.root.position.set(0, -0.7, z); crew.root.scale.setScalar(0.8);
    if (z < 0) crew.root.rotation.y = Math.PI;
    g.add(crew.root); g.userData[z < 0 ? 'crewA' : 'crewB'] = crew;
  }
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff3a0', fog: false })); lamp.position.set(0, 2.2, 3.4); g.add(lamp);
  const mast = box(0.1, 1.2, 0.1, '#333'); mast.position.set(0, 1.6, 3.4); g.add(mast);
  return shadow(g);
}

// rachadura subindo pela torre do farol (segmentos que aparecem com o progresso)
export function makeCrack(baseY = 22, height = 17, side = Math.PI) {
  const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: '#141210' }), r = rng(66);
  let y = baseY + 0.5, x = 0; const segs = [];
  while (y < baseY + height) {
    const len = 0.9 + r() * 1.2, ang = (r() - 0.5) * 1.2;
    const rad = 4.4 - (1.2 * (y - baseY)) / 18 + 0.03;
    const a = side + x / rad;
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.22, len, 0.08), m);
    s.position.set(Math.sin(a) * rad, y + len / 2, Math.cos(a) * rad); s.rotation.set(0, a, ang);
    g.add(s); segs.push(s);
    if (r() > 0.6) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, 0.06), m); b.position.copy(s.position).add(new THREE.Vector3(0.3, 0.2, 0)); b.rotation.set(0, a, ang + 1); g.add(b); segs.push(b); }
    y += len * 0.9; x += Math.sin(ang) * len * 0.8;
  }
  g.userData.segs = segs;
  g.userData.set = (k) => segs.forEach((s, i) => (s.visible = i < k * segs.length));
  return g;
}

// pedaços caindo / poeira
export class Debris {
  constructor(n = 30, color = '#cfc6b6', size = 0.35) {
    const r = rng(23);
    this.seed = Array.from({ length: n }, () => [r() * 6.28, r(), r() * 2 - 1, 0.5 + r()]);
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(size, size, size), M(color, { flatShading: true }), n);
    this.mesh.frustumCulled = false; this.d = new THREE.Object3D();
  }
  update(t, origin, spread = 3, fall = 20, speed = 1) {
    this.seed.forEach(([a, o, x, s], i) => {
      const q = (o + t * 0.6 * speed * s) % 1;
      this.d.position.set(origin.x + Math.cos(a) * spread * (0.3 + x * 0.2), origin.y - q * q * fall, origin.z + Math.sin(a) * spread * 0.4);
      this.d.rotation.set(t * 3 + i, t * 2, i); this.d.scale.setScalar(s); this.d.updateMatrix(); this.mesh.setMatrixAt(i, this.d.matrix);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
