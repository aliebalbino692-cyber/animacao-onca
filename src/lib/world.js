// Cenários: céu, mar, barco, onda gigante, chuva, fundo do mar, ilha, farol, interior, navio, fumaça
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng, smooth, clamp, lerp } from './util.js';

const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
const shadow = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };
const box = (w, h, d, color, o) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof color === 'string' ? M(color, o) : color);

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}

// ---------------- CÉU ----------------
export class Sky {
  constructor() {
    this.uniforms = {
      top: { value: new THREE.Color('#3f8fe8') }, mid: { value: new THREE.Color('#9fd3ff') },
      bottom: { value: new THREE.Color('#d9f1ff') }, sunDir: { value: new THREE.Vector3(0.3, 0.35, -1).normalize() },
      sunColor: { value: new THREE.Color('#fff4c9') }, sunSize: { value: 0.9985 }, stars: { value: 0 }, flash: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, uniforms: this.uniforms,
      vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform vec3 top,mid,bottom,sunDir,sunColor; uniform float sunSize,stars,flash; varying vec3 vP;
        float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164)))*43758.5453); }
        void main(){ float y=vP.y; vec3 c = y>0.0 ? mix(mid, top, smoothstep(0.0,0.55,y)) : mix(mid,bottom,smoothstep(0.0,-0.2,y));
          c = mix(c, bottom, smoothstep(0.08,0.0,abs(y))*0.6);
          float d = dot(vP, sunDir); c += sunColor*smoothstep(sunSize,sunSize+0.0008,d) + sunColor*pow(max(d,0.),60.)*0.35;
          vec3 q = floor(vP*380.); float s = step(0.9975, h(q)) * smoothstep(0.05,0.3,y) * stars; c += vec3(s);
          c += vec3(flash);
          gl_FragColor = vec4(c,1.); }`,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1800, 32, 16), mat);
    this.mesh.renderOrder = -1;
  }
  set(p) {
    const u = this.uniforms;
    u.top.value.set(p.top); u.mid.value.set(p.mid); u.bottom.value.set(p.bottom);
    if (p.sunDir) u.sunDir.value.set(...p.sunDir).normalize();
    if (p.sunColor) u.sunColor.value.set(p.sunColor);
    u.sunSize.value = p.sunSize ?? 0.9985; u.stars.value = p.stars ?? 0;
  }
}
export const SKIES = {
  day: { top: '#2f7fe0', mid: '#8ccaff', bottom: '#d8f0ff', sunDir: [0.4, 0.45, -1], sunColor: '#fff1c0' },
  storm: { top: '#262b35', mid: '#4f5866', bottom: '#6d7784', sunDir: [0, -1, 0], sunColor: '#000000' },
  night: { top: '#03060f', mid: '#0b1630', bottom: '#14264a', sunDir: [-0.5, 0.35, -1], sunColor: '#dfe8ff', sunSize: 0.9992, stars: 1 },
  dawn: { top: '#3a4f9a', mid: '#f79a6b', bottom: '#ffd29a', sunDir: [0.9, 0.06, -0.6], sunColor: '#fff0c8', sunSize: 0.998 },
  overcast: { top: '#5f6e80', mid: '#9aa7b5', bottom: '#c3ccd6', sunDir: [0, -1, 0], sunColor: '#000000' },
};
export function mixSky(a, b, t) {
  const A = SKIES[a], B = SKIES[b], c = (x, y) => '#' + new THREE.Color(x).lerp(new THREE.Color(y), t).getHexString();
  return { top: c(A.top, B.top), mid: c(A.mid, B.mid), bottom: c(A.bottom, B.bottom),
    sunDir: t < 0.5 ? A.sunDir : B.sunDir, sunColor: c(A.sunColor, B.sunColor), sunSize: t < 0.5 ? A.sunSize : B.sunSize,
    stars: lerp(A.stars || 0, B.stars || 0, t) };
}

// ---------------- MAR ----------------
export class Ocean {
  constructor(size = 900, seg = 180) {
    this.step = size / seg;
    this.geo = new THREE.PlaneGeometry(size, size, seg, seg);
    this.geo.rotateX(-Math.PI / 2);
    this.base = this.geo.attributes.position.array.slice();
    this.mat = new THREE.MeshStandardMaterial({ color: '#1f8fb3', roughness: 0.35, metalness: 0.1, flatShading: true,
      transparent: true, opacity: 0.94, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.receiveShadow = true;
    this.amp = 0.3; this.level = 0; this.choppy = 1;
  }
  height(x, z, t) {
    const a = this.amp;
    return this.level + a * (Math.sin(x * 0.08 + t * 1.1) * 0.6 + Math.sin(z * 0.11 - t * 1.4) * 0.5 +
      Math.sin((x + z) * 0.21 + t * 2.1) * 0.25 * this.choppy + Math.sin((x - z) * 0.37 - t * 2.9) * 0.12 * this.choppy);
  }
  update(t, cx = 0, cz = 0) {
    // a malha acompanha o foco da cena (encaixada na grade para não "deslizar")
    const step = this.step;
    const ox = Math.round(cx / step) * step, oz = Math.round(cz / step) * step;
    this.mesh.position.set(ox, 0, oz);
    const p = this.geo.attributes.position.array, b = this.base;
    for (let i = 0; i < p.length; i += 3) p[i + 1] = this.height(b[i] + ox, b[i + 2] + oz, t);
    this.geo.attributes.position.needsUpdate = true;
    this.geo.computeVertexNormals();
  }
}

// ---------------- BARCO DE PESCA ----------------
export function makeBoat() {
  const g = new THREE.Group();
  const white = M('#f4f1ea'), red = M('#d23b2f'), wood = M('#a8723f'), blue = M('#2a5d9a');
  const hull = box(4.4, 1.6, 9, white); hull.position.y = 0.4; g.add(hull);
  const bottom = box(3.6, 0.7, 8.2, red); bottom.position.y = -0.6; g.add(bottom);
  const bow = box(3.1, 1.6, 3.1, white); bow.rotation.y = Math.PI / 4; bow.position.set(0, 0.4, 4.4); g.add(bow);
  const bowB = box(2.5, 0.7, 2.5, red); bowB.rotation.y = Math.PI / 4; bowB.position.set(0, -0.6, 4.1); g.add(bowB);
  const stripe = box(4.5, 0.25, 9.1, blue); stripe.position.y = 0.9; g.add(stripe);
  const deck = box(3.8, 0.15, 8.4, wood); deck.position.y = 1.0; g.add(deck);
  const cabin = new THREE.Mesh(new RoundedBoxGeometry(3.0, 2.2, 2.6, 2, 0.15), white); cabin.position.set(0, 2.2, -1.8); g.add(cabin);
  const roof = box(3.4, 0.25, 3.0, blue); roof.position.set(0, 3.4, -1.8); g.add(roof);
  const win = box(2.4, 0.8, 0.1, M('#173048', { roughness: 0.2, metalness: 0.4 })); win.position.set(0, 2.5, -0.48); g.add(win);
  const mast = box(0.2, 3, 0.2, '#666'); mast.position.set(0, 4.8, -2.4); g.add(mast);
  const flag = box(0.05, 0.6, 0.9, '#ffcc00'); flag.position.set(0, 5.9, -2.85); g.add(flag);
  const buoy = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.16, 8, 16), M('#ff6a1a')); buoy.position.set(2.25, 2.0, -1.8); buoy.rotation.y = Math.PI / 2; g.add(buoy);
  const crate = box(1.0, 0.8, 1.0, wood); crate.position.set(-1.2, 1.5, 2.2); g.add(crate);
  return shadow(g);
}

// vara de pesca (presa à mão)
export function makeRod() {
  const g = new THREE.Group();
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.09, 5, 6), M('#3a2a1a'));
  rod.position.y = 2.5; g.add(rod);
  const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.2, 10), M('#999', { metalness: 0.6 }));
  reel.rotation.z = Math.PI / 2; reel.position.y = 0.6; g.add(reel);
  g.rotation.x = Math.PI / 2 - 0.5;
  return g;
}

// ---------------- ONDA GIGANTE ----------------
export function makeGiantWave(width = 160, H = 22) {
  const R = H / 2.6, pts = [];
  for (let i = 0; i <= 24; i++) { const s = i / 24; pts.push([-60 + 60 * s, H * (s * s * (3 - 2 * s))]); }
  for (let i = 1; i <= 20; i++) { const a = (i / 20) * 3.6; pts.push([R * Math.sin(a), H - R + R * Math.cos(a)]); }
  const nx = 60, geo = new THREE.BufferGeometry(), pos = [], col = [], idx = [];
  const deep = new THREE.Color('#0d4f6e'), light = new THREE.Color('#3fc1d8'), foam = new THREE.Color('#f2fbff');
  for (let j = 0; j < pts.length; j++) {
    const k = j / (pts.length - 1);
    const c = k < 0.5 ? deep.clone().lerp(light, k / 0.5)
      : k < 0.7 ? light.clone().lerp(foam, smooth((k - 0.56) / 0.08))
      : foam.clone().lerp(light, smooth((k - 0.7) / 0.08)).lerp(deep, smooth((k - 0.8) / 0.2));
    for (let i = 0; i <= nx; i++) {
      const x = -width / 2 + (width * i) / nx;
      const wob = Math.sin(i * 0.9 + j * 0.3) * 0.6;
      pos.push(x, pts[j][1] + (j > 24 ? wob * 0.5 : 0), pts[j][0] + wob);
      col.push(c.r, c.g, c.b);
    }
  }
  for (let j = 0; j < pts.length - 1; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + nx + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  geo.setIndex(idx); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.3,
    side: THREE.DoubleSide, transparent: true, opacity: 0.97 }));
  const g = new THREE.Group(); g.add(mesh);
  // espuma
  const r = rng(7), foamMat = M('#ffffff', { roughness: 1 });
  const fg = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), foamMat, 140), d = new THREE.Object3D();
  for (let i = 0; i < 140; i++) {
    d.position.set(-width / 2 + r() * width, H - r() * 3, r() * R * 1.2 - R * 0.2);
    d.scale.setScalar(0.3 + r() * 0.8); d.rotation.set(r() * 3, r() * 3, 0); d.updateMatrix(); fg.setMatrixAt(i, d.matrix);
  }
  g.add(fg);
  return g;
}

// ---------------- CHUVA ----------------
export class Rain {
  constructor(n = 2500) {
    this.n = n; const r = rng(3);
    this.seed = Array.from({ length: n }, () => [r() * 80 - 40, r() * 60, r() * 80 - 40, 0.7 + r() * 0.6]);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 6), 3));
    this.mesh = new THREE.LineSegments(this.geo, new THREE.LineBasicMaterial({ color: '#b9c8d8', transparent: true, opacity: 0.55 }));
    this.mesh.frustumCulled = false;
  }
  update(t, cam, intensity = 1) {
    const p = this.geo.attributes.position.array, cx = cam.position.x, cy = cam.position.y, cz = cam.position.z;
    const n = Math.floor(this.n * intensity);
    for (let i = 0; i < this.n; i++) {
      const [x, y, z, s] = this.seed[i];
      let yy = ((y - t * 38 * s) % 60 + 60) % 60 - 25;
      const k = i < n ? 1 : 0;
      p.set([cx + x + t * 2, cy + yy, cz + z, cx + x + t * 2 + 0.25 * k, cy + yy + 1.6 * k, cz + z], i * 6);
    }
    this.geo.attributes.position.needsUpdate = true;
  }
}

// raio
export function makeBolt(seed = 1) {
  const r = rng(seed), pts = []; let x = 0, z = 0;
  for (let y = 120; y > 0; y -= 8) { pts.push(new THREE.Vector3(x, y, z)); x += (r() - 0.5) * 14; z += (r() - 0.5) * 6; }
  const g = new THREE.Group();
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], len = a.distanceTo(b);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, len, 0.9), new THREE.MeshBasicMaterial({ color: '#eaf4ff', fog: false }));
    m.position.copy(a).add(b).multiplyScalar(0.5); m.lookAt(b); m.rotateX(Math.PI / 2); g.add(m);
  }
  return g;
}

// ---------------- BOLHAS / PARTÍCULAS ----------------
export class Bubbles {
  constructor(n = 120, color = '#dff6ff') {
    const r = rng(11);
    this.seed = Array.from({ length: n }, () => [r() * 2 - 1, r(), r() * 2 - 1, 0.5 + r()]);
    this.mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.12, 1),
      new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.75, roughness: 0.1, emissive: '#3a7f99' }), n);
    this.mesh.frustumCulled = false; this.d = new THREE.Object3D();
  }
  update(t, origin, spread = 2, height = 10, rate = 1) {
    this.seed.forEach(([x, y, z, s], i) => {
      const k = ((y + t * 0.35 * s * rate) % 1);
      this.d.position.set(origin.x + x * spread * (0.3 + k), origin.y + k * height, origin.z + z * spread * (0.3 + k));
      this.d.scale.setScalar(s * (0.5 + k) * (k < 0.95 ? 1 : 0)); this.d.updateMatrix(); this.mesh.setMatrixAt(i, this.d.matrix);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

export function makeLightRays(n = 7, color = '#bfefff', len = 60) {
  const g = new THREE.Group(), r = rng(5);
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2 + r() * 3, len),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.08 + r() * 0.08, blending: THREE.AdditiveBlending,
        depthWrite: false, side: THREE.DoubleSide, fog: false }));
    m.position.set(r() * 30 - 15, 0, r() * 20 - 10); m.rotation.set(0, r() * 3, 0.25 + r() * 0.1);
    g.add(m);
  }
  return g;
}

// ---------------- ILHA ----------------
export function islandHeight(x, z) {
  const r = Math.hypot(x, z);
  let h = 22 * Math.pow(1 - smooth(r / 62), 1.6);
  h += (Math.sin(x * 0.17) * Math.cos(z * 0.13) + Math.sin(x * 0.07 + z * 0.11)) * 0.9 * smooth((r - 8) / 10) * (1 - smooth((r - 40) / 10));
  h -= 2.2 * smooth((r - 52) / 18);
  if (r < 9) h = lerp(22, h, smooth((r - 5) / 4));
  return h;
}
export function makeIsland() {
  const g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(180, 180, 150, 150); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position, col = [];
  const sand = new THREE.Color('#f3d99b'), wet = new THREE.Color('#c9ad6e'), grass = new THREE.Color('#5fae46'),
    grass2 = new THREE.Color('#3f8c3a'), rock = new THREE.Color('#8a8f94');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), h = islandHeight(x, z); p.setY(i, h);
    let c;
    if (h < 0.3) c = wet; else if (h < 1.8) c = sand;
    else { c = grass.clone().lerp(grass2, (Math.sin(x * 0.3) * Math.sin(z * 0.27) + 1) / 2); if (h > 3 && Math.sin(x * 0.5 + z * 0.9) > 0.85) c = rock; }
    col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }));
  ground.receiveShadow = true; g.add(ground);

  const r = rng(21), trailAngle = Math.PI / 2; // trilha vai em direção +z
  const palms = [], trees = [];
  for (let i = 0; i < 46; i++) {
    const a = r() * Math.PI * 2, rad = 36 + r() * 14;
    if (Math.abs(((a - trailAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.25) continue;
    const x = Math.cos(a) * rad, z = Math.sin(a) * rad;
    const palm = makePalm(r); palm.position.set(x, islandHeight(x, z) - 0.2, z); palm.rotation.y = r() * 6; g.add(palm); palms.push(palm);
  }
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2, rad = 11 + r() * 24;
    if (Math.abs(((a - trailAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.3) continue;
    const x = Math.cos(a) * rad, z = Math.sin(a) * rad;
    const tr = makeTree(r); tr.position.set(x, islandHeight(x, z) - 0.2, z); g.add(tr); trees.push(tr);
  }
  for (let i = 0; i < 30; i++) {
    const a = r() * Math.PI * 2, rad = 20 + r() * 40, x = Math.cos(a) * rad, z = Math.sin(a) * rad;
    const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8 + r() * 1.8, 0), M('#7d838a', { flatShading: true }));
    rk.position.set(x, islandHeight(x, z), z); rk.rotation.set(r() * 3, r() * 3, 0); g.add(rk);
  }
  // degraus de madeira da trilha
  for (let rad = 50; rad > 8; rad -= 2.2) {
    const x = Math.cos(trailAngle) * rad + Math.sin(rad * 0.15) * 2, z = Math.sin(trailAngle) * rad;
    const st = box(3.2, 0.3, 0.9, '#8b5a2b'); st.position.set(x, islandHeight(x, z) + 0.1, z); g.add(st);
  }
  g.add(shadow(makeLighthouse()));
  return { group: shadow(g), palms, trees };
}
export function trailPoint(rad) {
  const a = Math.PI / 2, x = Math.cos(a) * rad + Math.sin(rad * 0.15) * 2, z = Math.sin(a) * rad;
  return new THREE.Vector3(x, islandHeight(x, z) + 0.25, z);
}
function makePalm(r) {
  const g = new THREE.Group(), trunkM = M('#9a6b3d'), leafM = M('#3fa548', { flatShading: true });
  let y = 0, x = 0; const bend = 0.12 + r() * 0.1, n = 7;
  for (let i = 0; i < n; i++) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.45 - i * 0.03, 0.55 - i * 0.03, 1.5, 6), trunkM);
    s.position.set(x, y + 0.75, 0); s.rotation.z = -bend * i * 0.4; g.add(s); y += 1.4; x += bend * i * 0.35;
  }
  for (let i = 0; i < 7; i++) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, 1.1), leafM);
    l.geometry.translate(2.1, 0, 0); l.position.set(x, y, 0); l.rotation.set(0, (i / 7) * Math.PI * 2, -0.35); g.add(l);
  }
  for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 5), M('#5a3a1c')); c.position.set(x + Math.cos(i * 2) * 0.4, y - 0.4, Math.sin(i * 2) * 0.4); g.add(c); }
  g.scale.setScalar(0.9 + r() * 0.4);
  return g;
}
function makeTree(r) {
  const g = new THREE.Group(), h = 3 + r() * 3;
  const t = box(0.7, h, 0.7, '#6e4a2a'); t.position.y = h / 2; g.add(t);
  const greens = ['#2f7d32', '#3c9a3c', '#276b2b'];
  for (let i = 0; i < 3; i++) {
    const s = 2.2 + r() * 1.6, c = box(s, s, s, greens[i % 3], { flatShading: true });
    c.position.set((r() - 0.5) * 1.6, h + (r() - 0.2) * 1.4, (r() - 0.5) * 1.6); c.rotation.y = r() * 2; g.add(c);
  }
  return g;
}

// ---------------- FAROL ----------------
export const LIGHTHOUSE = { baseY: 22, height: 18, galleryY: 22 + 18 + 0.4 };
export function makeLighthouse() {
  const g = new THREE.Group(); g.position.y = LIGHTHOUSE.baseY - 0.5;
  const H = LIGHTHOUSE.height, white = M('#ece6da'), red = M('#c2362c');
  const base = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.6, 1.4, 16), M('#8d8a84', { flatShading: true })); base.position.y = 0.4; g.add(base);
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.4, H, 16, 1), white); tower.position.y = H / 2 + 0.5; g.add(tower);
  for (let i = 0; i < 3; i++) {
    const y0 = 3 + i * 5.4, rr = (y) => 4.4 - (1.2 * (y - 0.5)) / H;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(rr(y0 + 1.8) + 0.03, rr(y0) + 0.03, 1.8, 16), red); band.position.y = y0 + 0.9; g.add(band);
  }
  const door = box(1.6, 2.8, 0.4, '#3b2a1e'); door.position.set(0, 1.9, 4.25); g.add(door);
  const doorFrame = box(2.0, 3.2, 0.3, '#6b6259'); doorFrame.position.set(0, 2.0, 4.15); g.add(doorFrame);
  for (let i = 0; i < 3; i++) { const w = box(0.8, 1.2, 0.3, '#182a3a'); const y = 6 + i * 4.5, rr = 4.4 - (1.2 * y) / H; w.position.set(0, y, rr); g.add(w); }
  // rachaduras e trepadeiras (abandonado)
  const r = rng(9);
  for (let i = 0; i < 14; i++) {
    const a = r() * Math.PI * 2, y = 1 + r() * (H - 2), rr = 4.4 - (1.2 * y) / H + 0.02;
    const c = box(0.12, 0.8 + r() * 1.5, 0.05, i % 2 ? '#4b4b4b' : '#2f6b2a');
    c.position.set(Math.sin(a) * rr, y, Math.cos(a) * rr); c.rotation.set(0, a, (r() - 0.5) * 1.2); g.add(c);
  }
  // galeria
  const gal = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 0.5, 20), M('#3c3c3c')); gal.position.y = H + 0.65; g.add(gal);
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2, p = box(0.12, 1.5, 0.12, '#2a2a2a'); p.position.set(Math.sin(a) * 4.85, H + 1.6, Math.cos(a) * 4.85); g.add(p);
  }
  const rail = new THREE.Mesh(new THREE.TorusGeometry(4.85, 0.08, 6, 40), M('#2a2a2a')); rail.rotation.x = Math.PI / 2; rail.position.y = H + 2.35; g.add(rail);
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 3, 8, 1, true),
    new THREE.MeshStandardMaterial({ color: '#9fd7e8', transparent: true, opacity: 0.45, roughness: 0.1, metalness: 0.3, side: THREE.DoubleSide }));
  lantern.position.y = H + 2.4; g.add(lantern);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), M('#ffe9a8', { emissive: '#a07a20' })); lamp.position.y = H + 2.3; g.add(lamp);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.39, b = box(0.15, 3, 0.15, '#2a2a2a'); b.position.set(Math.sin(a) * 2.4, H + 2.4, Math.cos(a) * 2.4); g.add(b); }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.0, 2.4, 8), red); roof.position.y = H + 5.1; g.add(roof);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), M('#2a2a2a')); tip.position.y = H + 6.4; g.add(tip);
  return g;
}

// ---------------- INTERIOR DO FAROL ----------------
export function makeInterior() {
  const g = new THREE.Group(), R = 6;
  const brick = canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = '#b9aa94'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) for (let x = (y / 32) % 2 ? -32 : 0; x < w; x += 64) {
      const v = 160 + ((x * 7 + y * 13) % 40); c.fillStyle = `rgb(${v + 20},${v + 5},${v - 20})`; c.fillRect(x + 2, y + 2, 60, 28);
    }
    c.fillStyle = 'rgba(40,60,30,0.35)'; for (let i = 0; i < 30; i++) c.fillRect((i * 97) % w, (i * 61) % h, 18, 40);
  }, [6, 3]);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 26, 32, 1, true), new THREE.MeshStandardMaterial({ map: brick, side: THREE.BackSide, roughness: 0.95 }));
  wall.position.y = 13; g.add(wall);
  const planks = canvasTex(512, 512, (c, w, h) => {
    for (let i = 0; i < 8; i++) { const v = 110 + (i * 37) % 40; c.fillStyle = `rgb(${v + 40},${v},${v - 40})`; c.fillRect(0, i * 64, w, 62); }
    c.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 8; i++) c.fillRect(((i * 173) % w), i * 64, 4, 64);
  }, [2, 2]);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(R, 32), new THREE.MeshStandardMaterial({ map: planks, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; g.add(floor);
  // escada em espiral
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 26, 12), M('#8a7f70')); column.position.y = 13; g.add(column);
  const stepM = M('#6b4a2c'), steps = [];
  for (let i = 0; i < 80; i++) {
    const a = i * 0.32, y = 3.2 + i * 0.28;
    const s = box(4.4, 0.25, 1.4, stepM); s.geometry.translate(2.9, 0, 0); s.position.y = y; s.rotation.y = -a; g.add(s); steps.push(s);
  }
  // baú, caixotes, lanterna
  const chest = new THREE.Group(); chest.position.set(-2.6, 0, 2.4); chest.rotation.y = 0.9;
  const cb = box(2.2, 1.1, 1.3, '#7a4b22'); cb.position.y = 0.55; chest.add(cb);
  const band = box(2.25, 0.15, 1.35, '#c9a23a', { metalness: 0.6 }); band.position.y = 0.9; chest.add(band);
  const lid = new THREE.Group(); lid.position.set(0, 1.1, -0.65); chest.add(lid);
  const lidM = box(2.2, 0.35, 1.3, '#6a3f1b'); lidM.position.set(0, 0.17, 0.65); lid.add(lidM);
  // conteúdo: garrafas de água e latas
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.7, 8), M('#5fc1ff', { transparent: true, opacity: 0.8, roughness: 0.1 }));
    b.position.set(-0.7 + i * 0.3, 1.0, 0); chest.add(b);
  }
  for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 10), M('#c0392b', { metalness: 0.5 })); c.position.set(0.4 + i * 0.35, 0.95, 0.1); chest.add(c); }
  g.add(chest);
  const r = rng(4);
  for (let i = 0; i < 5; i++) {
    const s = 0.9 + r() * 0.6, c = box(s, s, s, '#9b6d3e'); const a = 2 + i * 0.5; c.position.set(Math.cos(a) * 4.3, s / 2 + (i === 2 ? 1.2 : 0), Math.sin(a) * 4.3); c.rotation.y = r(); g.add(c);
  }
  const lanternG = new THREE.Group(); lanternG.position.set(2.8, 1.5, 3.2);
  const lb = box(0.6, 0.9, 0.6, M('#ffcf6b', { emissive: '#ffb030', emissiveIntensity: 2 })); lanternG.add(lb);
  const lt = box(0.7, 0.15, 0.7, '#333'); lt.position.y = 0.5; lanternG.add(lt);
  const lamp = new THREE.PointLight('#ffb347', 30, 18, 1.6); lamp.position.y = 0.2; lamp.castShadow = false; lanternG.add(lamp);
  const table = box(1.4, 1.0, 1.4, '#6b4a2c'); table.position.set(2.8, 0.5, 3.2); g.add(table);
  g.add(lanternG);
  // parede com riscos (42 dias) e aviso
  const marks = canvasTex(1024, 768, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.strokeStyle = 'rgba(35,25,20,0.92)'; c.lineCap = 'round';
    let n = 0;
    for (let row = 0; row < 3 && n < 42; row++) for (let grp = 0; grp < 4 && n < 42; grp++) {
      const x0 = 70 + grp * 230, y0 = 40 + row * 150;
      for (let k = 0; k < 4 && n < 42; k++, n++) {
        c.lineWidth = 10; c.beginPath(); c.moveTo(x0 + k * 34 + Math.sin(n) * 4, y0); c.lineTo(x0 + k * 34 - Math.sin(n) * 4, y0 + 110); c.stroke();
      }
      if (n < 42) { n++; c.lineWidth = 9; c.beginPath(); c.moveTo(x0 - 16, y0 + 92); c.lineTo(x0 + 130, y0 + 18); c.stroke(); }
    }
    c.font = 'bold 74px "Lilita One", sans-serif'; c.fillStyle = 'rgba(35,25,20,0.92)'; c.fillText('= 42', 790, 440);
    c.fillStyle = '#b3160f'; c.font = '118px "Lilita One", sans-serif'; c.textAlign = 'center';
    c.save(); c.translate(w / 2 - 60, 600); c.rotate(-0.03); c.fillText('NÃO CONFIE', 0, 0); c.fillText('NA MARÉ', 0, 120);
    c.fillStyle = 'rgba(179,22,15,0.7)'; for (let i = 0; i < 7; i++) c.fillRect(-230 + i * 75, 128, 8, 20 + (i % 3) * 16); c.restore();
  });
  const markPlane = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 3.9), new THREE.MeshStandardMaterial({ map: marks, transparent: true, roughness: 1 }));
  markPlane.position.set(0, 2.9, -5.5); g.add(markPlane);
  // raios de luz entrando pela janela
  const ray = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 12), new THREE.MeshBasicMaterial({ color: '#fff2c8', transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  ray.position.set(-3, 5, -1); ray.rotation.set(0, 0.6, 0.6); g.add(ray);
  const ray2 = ray.clone(); ray2.position.set(-1.8, 5.5, 0.5); g.add(ray2);
  return { group: shadow(g), chestLid: lid, chest, lamp, lanternG, markPlane, steps, column };
}

// ---------------- SINALIZADOR ----------------
export function makeFlareGun() {
  const g = new THREE.Group(), o = M('#ff6a00', { roughness: 0.45 });
  const grip = new THREE.Mesh(new RoundedBoxGeometry(0.35, 0.8, 0.45, 2, 0.08), o); grip.rotation.x = 0.25; grip.position.set(0, -0.3, -0.05); g.add(grip);
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.45, 1.1, 2, 0.08), o); body.position.set(0, 0.1, 0.35); g.add(body);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.9, 12), o); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.12, 1.1); g.add(barrel);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.15, 12), M('#111')); hole.position.set(0, 0.12, 1.56); g.add(hole);
  const trig = box(0.08, 0.25, 0.08, '#222'); trig.position.set(0, -0.2, 0.25); g.add(trig);
  return shadow(g);
}

// ---------------- NAVIO DISTANTE ----------------
export function makeShip() {
  const g = new THREE.Group();
  const hull = box(10, 4, 46, '#2b2f3a'); hull.position.y = 1; g.add(hull);
  const redB = box(10.1, 1.2, 46.1, '#9c2b23'); redB.position.y = -0.5; g.add(redB);
  const sup = box(8, 6, 9, '#f0f0f0'); sup.position.set(0, 6, -14); g.add(sup);
  const bridge = box(9, 1.6, 5, '#e8e8e8'); bridge.position.set(0, 9.5, -14); g.add(bridge);
  const funnel = box(2.6, 5, 2.6, '#d8a21b'); funnel.position.set(0, 10, -19); g.add(funnel);
  const colors = ['#c0392b', '#2471a3', '#27ae60', '#d4ac0d'];
  for (let i = 0; i < 12; i++) { const c = box(3.8, 2.6, 5.6, colors[i % 4]); c.position.set(i % 2 ? 2.2 : -2.2, 4.3 + (i % 3 === 0 ? 2.6 : 0), -2 + Math.floor(i / 2) * 3.8); g.add(c); }
  return g;
}

// ---------------- FUMAÇA ----------------
export class Smoke {
  constructor(n = 40, color = '#c9c9c9') {
    const r = rng(13);
    this.seed = Array.from({ length: n }, () => [r(), r() * 2 - 1, r() * 2 - 1, 0.7 + r() * 0.6]);
    this.mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0),
      new THREE.MeshStandardMaterial({ color, flatShading: true, transparent: true, opacity: 0.85, roughness: 1 }), n);
    this.mesh.frustumCulled = false; this.d = new THREE.Object3D();
  }
  update(t, origin, height = 40, wind = [6, 0, 2], size = 1) {
    this.seed.forEach(([o, x, z, s], i) => {
      const k = (o + t * 0.12) % 1;
      this.d.position.set(origin.x + x * 1.5 + wind[0] * k * k * 3, origin.y + k * height, origin.z + z * 1.5 + wind[2] * k * 3);
      this.d.scale.setScalar(size * s * (1.2 + k * 5) * (k > 0.92 ? (1 - k) / 0.08 : 1));
      this.d.rotation.set(t * 0.3 + i, i, 0); this.d.updateMatrix(); this.mesh.setMatrixAt(i, this.d.matrix);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ---------------- GAIVOTAS ----------------
export class Gulls {
  constructor(n = 6) {
    this.group = new THREE.Group(); this.birds = [];
    const m = M('#ffffff');
    for (let i = 0; i < n; i++) {
      const b = new THREE.Group();
      const body = box(0.35, 0.3, 1.0, m); b.add(body);
      const wl = new THREE.Group(), wr = new THREE.Group();
      const w = box(1.4, 0.06, 0.45, m); w.position.x = 0.7; wl.add(w);
      const w2 = w.clone(); w2.position.x = -0.7; wr.add(w2);
      const tip = box(0.5, 0.07, 0.3, '#333'); tip.position.x = 1.3; wl.add(tip); const tip2 = tip.clone(); tip2.position.x = -1.3; wr.add(tip2);
      b.add(wl, wr); b.userData = { wl, wr, r: 8 + i * 3, h: i * 1.5, sp: 0.4 + (i % 3) * 0.12, ph: i * 1.7 };
      this.group.add(b); this.birds.push(b);
    }
  }
  update(t, center) {
    for (const b of this.birds) {
      const u = b.userData, a = t * u.sp + u.ph;
      b.position.set(center.x + Math.cos(a) * u.r, center.y + u.h + Math.sin(t * 0.7 + u.ph) * 1.2, center.z + Math.sin(a) * u.r);
      b.rotation.set(0, -a, 0.3);
      const f = Math.sin(t * 9 + u.ph) * 0.6; u.wl.rotation.z = f; u.wr.rotation.z = -f;
    }
  }
}
