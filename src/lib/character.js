// Personagem em blocos (estilo "boneco de montar"), com rosto 2D trocável
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const SKIN = '#f2c189';

function faceTexture(kind, lashes = false) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = '#1b1b1b'; g.fillStyle = '#1b1b1b';
  const eye = (x, y, w, h) => { g.beginPath(); g.ellipse(x, y, w, h, 0, 0, Math.PI * 2); g.fill(); };
  const brow = (x1, y1, x2, y2, w = 12) => { g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
  const whiteEye = (x, y, r, pr) => {
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.lineWidth = 6; g.stroke(); g.fillStyle = '#1b1b1b'; g.beginPath(); g.arc(x, y + 2, pr, 0, 7); g.fill();
  };
  switch (kind) {
    case 'happy':
      eye(88, 112, 11, 15); eye(168, 112, 11, 15);
      brow(66, 80, 106, 76); brow(150, 76, 190, 80);
      g.lineWidth = 10; g.beginPath(); g.arc(128, 150, 40, 0.2, Math.PI - 0.2); g.stroke();
      break;
    case 'worried':
      eye(88, 116, 11, 14); eye(168, 116, 11, 14);
      brow(66, 84, 108, 72); brow(148, 72, 190, 84);
      g.lineWidth = 10; g.beginPath(); g.moveTo(98, 182); g.quadraticCurveTo(128, 162, 158, 182); g.stroke();
      break;
    case 'scared':
      whiteEye(88, 114, 22, 7); whiteEye(168, 114, 22, 7);
      brow(62, 76, 108, 64); brow(148, 64, 194, 76);
      g.fillStyle = '#5a1010'; g.beginPath(); g.ellipse(128, 186, 20, 26, 0, 0, 7); g.fill();
      g.lineWidth = 8; g.stroke();
      break;
    case 'shout':
      eye(88, 108, 13, 9); eye(168, 108, 13, 9);
      brow(64, 70, 110, 88, 14); brow(146, 88, 192, 70, 14);
      g.fillStyle = '#5a1010'; g.beginPath(); g.moveTo(84, 150); g.lineTo(172, 150); g.quadraticCurveTo(128, 238, 84, 150); g.fill();
      g.lineWidth = 8; g.stroke();
      g.fillStyle = '#fff'; g.fillRect(96, 152, 64, 12);
      break;
    case 'determined':
      eye(88, 116, 11, 12); eye(168, 116, 11, 12);
      brow(64, 84, 110, 96, 14); brow(146, 96, 192, 84, 14);
      g.lineWidth = 10; g.beginPath(); g.moveTo(100, 176); g.lineTo(156, 172); g.stroke();
      break;
    case 'tired':
      g.lineWidth = 9; g.beginPath(); g.moveTo(74, 118); g.lineTo(104, 118); g.moveTo(152, 118); g.lineTo(182, 118); g.stroke();
      brow(68, 92, 106, 84); brow(150, 84, 188, 92);
      g.beginPath(); g.ellipse(128, 180, 14, 10, 0, 0, 7); g.fill();
      break;
    case 'surprised':
      whiteEye(88, 112, 20, 9); whiteEye(168, 112, 20, 9);
      brow(64, 70, 108, 66); brow(148, 66, 192, 70);
      g.beginPath(); g.ellipse(128, 182, 14, 18, 0, 0, 7); g.fill();
      break;
    default: // neutral
      eye(88, 114, 11, 15); eye(168, 114, 11, 15);
      brow(68, 82, 106, 80); brow(150, 80, 188, 82);
      g.lineWidth = 9; g.beginPath(); g.moveTo(102, 172); g.quadraticCurveTo(128, 182, 154, 172); g.stroke();
  }
  if (lashes) { // cílios (personagens femininas)
    g.lineWidth = 6; g.strokeStyle = '#1b1b1b';
    for (const [x, d] of [[74, -1], [182, 1]]) { g.beginPath(); g.moveTo(x, 104); g.lineTo(x + d * 14, 92); g.moveTo(x + d * 6, 100); g.lineTo(x + d * 20, 96); g.stroke(); }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...extra });

export class Character {
  constructor({ shirt = '#ffd23a', pants = '#24427a', cap = '#2e9e4f', vest = '#ff7a1a', skin = SKIN, lashes = false } = {}) {
    this.root = new THREE.Group();          // posição no mundo (pés no y=0)
    this.body = new THREE.Group();          // inclinação do corpo inteiro (pivô no quadril)
    this.body.position.y = 2;
    this.root.add(this.body);
    const cast = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };

    // tronco
    this.torso = new THREE.Group();
    this.body.add(this.torso);
    cast(this.torsoMesh = new THREE.Mesh(new RoundedBoxGeometry(2, 2, 1, 2, 0.12), mat(shirt)));
    this.torsoMesh.position.y = 1;
    this.torso.add(this.torsoMesh);
    // colete salva-vidas
    this.vest = new THREE.Group();
    const vestMat = mat(vest, { roughness: 0.6 });
    const vL = cast(new THREE.Mesh(new RoundedBoxGeometry(0.85, 1.75, 1.2, 2, 0.15), vestMat));
    vL.position.set(-0.6, 1.05, 0); const vR = vL.clone(); vR.position.x = 0.6;
    const vB = cast(new THREE.Mesh(new RoundedBoxGeometry(2.08, 1.75, 0.3, 2, 0.1), vestMat));
    vB.position.set(0, 1.05, -0.5);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.14, 1.24), mat('#e8e8e8', { emissive: '#333' }));
    stripe.position.y = 0.75;
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), mat('#222'));
    buckle.position.set(0, 1.2, 0.6);
    this.vest.add(vL, vR, vB, stripe, buckle);
    this.torso.add(this.vest);

    // cabeça
    this.neck = new THREE.Group();
    this.neck.position.y = 2;
    this.torso.add(this.neck);
    const head = cast(new THREE.Mesh(new RoundedBoxGeometry(1.25, 1.2, 1.2, 3, 0.3), mat(skin)));
    head.position.y = 0.62;
    this.neck.add(head);
    this.faces = {};
    for (const k of ['neutral', 'happy', 'worried', 'scared', 'shout', 'determined', 'tired', 'surprised'])
      this.faces[k] = faceTexture(k, lashes);
    this.faceMat = new THREE.MeshBasicMaterial({ map: this.faces.neutral, transparent: true, toneMapped: false });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), this.faceMat);
    face.position.set(0, 0.6, 0.605);
    this.neck.add(face);
    // boné
    this.capGroup = new THREE.Group();
    const capMat = mat(cap);
    const capTop = cast(new THREE.Mesh(new RoundedBoxGeometry(1.34, 0.45, 1.3, 2, 0.15), capMat));
    capTop.position.y = 1.25;
    const brim = cast(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.7), capMat));
    brim.position.set(0, 1.08, 0.85);
    const hair = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.35, 0.3), mat('#3b2414'));
    hair.position.set(0, 0.95, -0.5);
    this.capGroup.add(capTop, brim, hair);
    this.neck.add(this.capGroup);

    // braços (pivô no ombro)
    const arm = (side) => {
      const p = new THREE.Group();
      p.position.set(side * 1.5, 1.8, 0);
      const sleeve = cast(new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.8, 0.95, 2, 0.1), mat(shirt)));
      sleeve.position.y = -0.3;
      const fore = cast(new THREE.Mesh(new RoundedBoxGeometry(0.88, 1.3, 0.88, 2, 0.12), mat(skin)));
      fore.position.y = -1.25;
      p.add(sleeve, fore);
      const hand = new THREE.Group(); // ponto para segurar objetos
      hand.position.y = -1.9;
      p.add(hand);
      p.userData.hand = hand;
      this.torso.add(p);
      return p;
    };
    this.armL = arm(1); this.armR = arm(-1);
    // pernas (pivô no quadril)
    const leg = (side) => {
      const p = new THREE.Group();
      p.position.set(side * 0.5, 0, 0);
      const l = cast(new THREE.Mesh(new RoundedBoxGeometry(0.97, 1.75, 0.97, 2, 0.1), mat(pants)));
      l.position.y = -0.85;
      const shoe = cast(new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.32, 1.15, 2, 0.1), mat('#2b2b2b')));
      shoe.position.set(0, -1.84, 0.08);
      p.add(l, shoe);
      this.body.add(p);
      return p;
    };
    this.legL = leg(1); this.legR = leg(-1);
    this.handR = this.armR.userData.hand;
    this.handL = this.armL.userData.hand;
  }
  face(kind) { this.faceMat.map = this.faces[kind] || this.faces.neutral; }
  reset() {
    for (const p of [this.armL, this.armR, this.legL, this.legR, this.neck, this.torso, this.body]) p.rotation.set(0, 0, 0);
    this.body.position.set(0, 2, 0);
  }
  // ---- poses (t em segundos) ----
  idle(t) {
    this.reset();
    const b = Math.sin(t * 2) * 0.03;
    this.torso.rotation.x = b; this.armL.rotation.z = 0.08; this.armR.rotation.z = -0.08;
    this.neck.rotation.x = -b;
  }
  walk(t, speed = 1, amp = 0.6) {
    this.reset();
    const s = Math.sin(t * 7 * speed) * amp;
    this.legL.rotation.x = s; this.legR.rotation.x = -s;
    this.armL.rotation.x = -s * 0.9; this.armR.rotation.x = s * 0.9;
    this.body.position.y = 2 + Math.abs(Math.cos(t * 7 * speed)) * 0.15 * amp;
    this.torso.rotation.x = 0.06 * amp;
  }
  run(t, speed = 1.6) {
    this.walk(t, speed, 0.95);
    this.torso.rotation.x = 0.25;
    this.armL.rotation.x -= 0.2; this.armR.rotation.x -= 0.2;
  }
  swim(t, speed = 1) { // nado crawl: corpo deitado (o root deve ser girado por quem chama)
    this.reset();
    const a = t * 5 * speed;
    this.armL.rotation.x = -a % (Math.PI * 2);
    this.armR.rotation.x = -(a + Math.PI) % (Math.PI * 2);
    this.legL.rotation.x = Math.sin(a * 2) * 0.35; this.legR.rotation.x = -Math.sin(a * 2) * 0.35;
    this.neck.rotation.x = -0.6; this.neck.rotation.y = Math.sin(a) * 0.3;
  }
  tread(t) { // boiando, braços abertos
    this.reset();
    this.armL.rotation.z = 1.2 + Math.sin(t * 4) * 0.35; this.armR.rotation.z = -1.2 - Math.sin(t * 4) * 0.35;
    this.armL.rotation.x = Math.cos(t * 4) * 0.3; this.armR.rotation.x = -Math.cos(t * 4) * 0.3;
    this.legL.rotation.x = Math.sin(t * 5) * 0.4; this.legR.rotation.x = -Math.sin(t * 5) * 0.4;
  }
  struggle(t, k = 1) { // se debatendo
    this.reset();
    const j = (f, o) => Math.sin(t * f + o) * k;
    this.armL.rotation.x = -2.6 + j(17, 0) * 0.5; this.armR.rotation.x = -2.6 + j(19, 1) * 0.5;
    this.armL.rotation.z = 0.4 + j(23, 2) * 0.3; this.armR.rotation.z = -0.4 - j(21, 3) * 0.3;
    this.legL.rotation.x = j(15, 4) * 0.7; this.legR.rotation.x = -j(15, 4) * 0.7;
    this.torso.rotation.z = j(11, 5) * 0.12; this.neck.rotation.y = j(9, 6) * 0.4;
  }
  crawl(t) {
    this.reset();
    const s = Math.sin(t * 4);
    this.armL.rotation.x = -2.2 + s * 0.5; this.armR.rotation.x = -2.2 - s * 0.5;
    this.legL.rotation.x = 0.3 - s * 0.4; this.legR.rotation.x = 0.3 + s * 0.4;
    this.neck.rotation.x = -0.9;
  }
  cast(t, k) { // lançar a vara: k 0..1
    this.idle(t);
    const back = Math.sin(Math.min(k, 1) * Math.PI);
    this.armR.rotation.x = -1.2 - back * 1.4 + (k > 0.5 ? (k - 0.5) * 1.0 : 0);
    this.armL.rotation.x = -0.9 - back * 0.6;
    this.armL.rotation.z = -0.4;
    this.torso.rotation.y = -0.2 + back * 0.4;
  }
  hold(t) { // segurando a vara à frente
    this.idle(t);
    this.armR.rotation.x = -1.0 + Math.sin(t * 1.5) * 0.05; this.armL.rotation.x = -0.9; this.armL.rotation.z = -0.45;
  }
  lookUp(t, k = 1) { this.idle(t); this.neck.rotation.x = -0.6 * k; this.torso.rotation.x = -0.12 * k; }
  sit(t) { // sentado (pernas para frente); quem chama abaixa o root ~2 unidades
    this.idle(t);
    this.legL.rotation.x = -1.45; this.legR.rotation.x = -1.45;
    this.armL.rotation.x = -0.5; this.armR.rotation.x = -0.5;
  }
  paddle(t, speed = 1) { // remando sentado
    this.sit(t);
    const s = Math.sin(t * 3.2 * speed);
    this.armR.rotation.x = -1.1 + s * 0.55; this.armL.rotation.x = -1.1 - s * 0.55;
    this.armL.rotation.z = -0.3; this.armR.rotation.z = 0.3;
    this.torso.rotation.y = s * 0.25; this.torso.rotation.x = 0.15;
  }
  point(t, k = 1, side = 'L') { // aponta para frente
    this.idle(t);
    const arm = side === 'L' ? this.armL : this.armR;
    arm.rotation.x = -1.55 * k; arm.rotation.z = (side === 'L' ? -0.12 : 0.12) * k;
  }
  wade(t, speed = 0.8) { // andando com água na cintura: passos lentos, braços abertos
    this.walk(t, speed, 0.4);
    this.armL.rotation.z = 0.55; this.armR.rotation.z = -0.55;
  }
  aim(t, up = 0.3) { // segura o sinalizador com o braço direito à frente
    this.idle(t);
    this.armR.rotation.x = -1.5 - up; this.armL.rotation.x = -1.3 - up; this.armL.rotation.z = -0.35;
  }
}
