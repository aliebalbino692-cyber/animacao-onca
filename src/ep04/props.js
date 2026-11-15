// Objetos novos do EP. 4: pai da Lia, tronco boiando, recifes
import * as THREE from 'three';
import { rng } from '../lib/util.js';

const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
const box = (w, h, d, c, o) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'string' ? M(c, o) : c);
const shadow = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };

export function makeFather(Character) {
  const f = new Character({ shirt: '#e3dccb', pants: '#4a5566', skin: '#c98d5e' });
  f.vest.visible = false; f.capGroup.visible = false;
  const hatM = M('#6b4a2a');
  const brim = box(1.9, 0.12, 1.9, hatM); brim.position.y = 1.2; f.neck.add(brim);
  const crown = box(1.25, 0.55, 1.25, hatM); crown.position.y = 1.5; f.neck.add(crown);
  const band = box(1.28, 0.14, 1.28, '#2b1a0e'); band.position.y = 1.32; f.neck.add(band);
  const beard = box(1.1, 0.42, 0.14, '#4a3020'); beard.position.set(0, 0.22, 0.64); f.neck.add(beard);
  const stache = box(0.5, 0.1, 0.1, '#4a3020'); stache.position.set(0, 0.46, 0.66); f.neck.add(stache);
  const bandage = box(1.05, 0.6, 1.05, '#f2efe6'); bandage.position.y = -1.0; f.legR.add(bandage);
  const stain = box(0.3, 0.2, 0.05, '#9c2b23'); stain.position.set(0.15, -0.95, 0.53); f.legR.add(stain);
  shadow(f.root);
  return f;
}

export function makeLog() {
  const g = new THREE.Group(), bark = M('#5b3a1e', { flatShading: true });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, 12, 9), bark); trunk.rotation.z = Math.PI / 2; g.add(trunk);
  for (const x of [-3, 2.5]) { const br = box(0.4, 0.4, 2.6, bark); br.position.set(x, 0.6, 0.8); br.rotation.x = 0.6; g.add(br); }
  const end = new THREE.Mesh(new THREE.CircleGeometry(1.15, 9), M('#c9a06a')); end.position.x = 6.01; end.rotation.y = Math.PI / 2; g.add(end);
  return shadow(g);
}

export function makeReefs() {
  const g = new THREE.Group(), r = rng(12), rock = M('#2a2e33', { flatShading: true, roughness: 1 });
  for (let i = 0; i < 26; i++) {
    const h = 2 + r() * 7, c = new THREE.Mesh(new THREE.ConeGeometry(1 + r() * 2.2, h, 5), rock);
    c.position.set((r() - 0.5) * 60, h / 2 - 2.5, (r() - 0.5) * 16); c.rotation.set((r() - 0.5) * 0.5, r() * 3, (r() - 0.5) * 0.5); g.add(c);
  }
  const foamM = new THREE.MeshBasicMaterial({ color: '#e8f4ff', transparent: true, opacity: 0.6 });
  for (let i = 0; i < 40; i++) { const f = box(1.5 + r() * 2, 0.06, 0.6, foamM); f.position.set((r() - 0.5) * 62, 0.05, (r() - 0.5) * 18); f.rotation.y = r() * 3; g.add(f); }
  return shadow(g);
}
