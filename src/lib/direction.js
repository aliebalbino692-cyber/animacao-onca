// Utilidades de direção compartilhadas entre episódios
import * as THREE from 'three';
import { wobble } from './util.js';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const norm = (w) => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

// tempos a partir do timeline: fala i, palavra (n-ésima ocorrência) e início de plano
export function timing(tl) {
  const line = (i) => tl.lines[i - 1];
  const word = (text, n = 1) => {
    const k = norm(text); let c = 0;
    for (const w of tl.words) if (norm(w.text) === k && ++c === n) return w.start;
    throw new Error('palavra não encontrada: ' + text);
  };
  const shotStart = (i) => (i === 1 ? 0 : line(i - 1).speechEnd + 0.12);
  return { line, word, shotStart };
}

// orienta um objeto: "up" = para onde aponta a cabeça, "face" = para onde olha o rosto
export function orient(obj, up, face) {
  const y = up.clone().normalize(), z = face.clone().normalize();
  const x = new THREE.Vector3().crossVectors(y, z).normalize(); z.crossVectors(x, y);
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

// câmera com tremida opcional
export function makeCam(camera) {
  return (pos, look, fov = 50, shake = 0, t = 0) => {
    camera.position.copy(pos);
    if (shake) camera.position.add(V(wobble(t, 1, 1) * shake, wobble(t, 1.1, 2) * shake, wobble(t, 0.9, 3) * shake * 0.5));
    camera.fov = fov; camera.lookAt(look);
  };
}

// posição da cabeça / mão de um personagem no mundo
export const headOf = (ch) => { ch.root.updateMatrixWorld(true); return ch.neck.getWorldPosition(new THREE.Vector3()).add(V(0, 0.6, 0)); };
export const handOf = (ch, side = 'R') => { ch.root.updateMatrixWorld(true); return (side === 'R' ? ch.handR : ch.handL).getWorldPosition(new THREE.Vector3()); };
// vetor "frente" de um personagem com rotação só em Y
export const forwardOf = (ch) => V(Math.sin(ch.root.rotation.y), 0, Math.cos(ch.root.rotation.y));
