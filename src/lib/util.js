// Funções utilitárias determinísticas (o vídeo precisa sair igual em toda renderização)
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = (t) => Math.pow(clamp(t), 3);
export const easeInOut = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const range = (t, a, b) => clamp((t - a) / (b - a));
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
// ruído suave barato (soma de senos) para tremidas de câmera
export const wobble = (t, f = 1, seed = 0) =>
  Math.sin(t * 6.1 * f + seed) * 0.5 + Math.sin(t * 13.7 * f + seed * 2.3) * 0.3 + Math.sin(t * 27.3 * f + seed * 4.1) * 0.2;
export const lerpV = (THREE, a, b, t) => new THREE.Vector3(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t));
