// HUD 2D: barra de sobrevivência, legendas palavra a palavra, setas, cartões de escolha
import { clamp, smooth, easeOut, range, lerp } from './util.js';

const FONT = '"Lilita One", "Arial Black", sans-serif';
const norm = (w) => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

// palavra -> cor de destaque (normalizada, sem acento)
export const KEYWORDS = {
  hora: '#ffd23a', preto: '#b06bff', gigante: '#3fe0ff', preso: '#ff3b3b', ar: '#ff3b3b', escapei: '#45f06a',
  areia: '#ffd23a', ilha: '#45f06a', existia: '#ff4fd8', mapa: '#ff4fd8', farol: '#ffd23a', abandonado: '#ffd23a',
  sinalizador: '#ff8a1f', tiro: '#ff3b3b', quarenta: '#ffd23a', dois: '#ffd23a', dias: '#ffd23a',
  nao: '#ff3b3b', confie: '#ff3b3b', mare: '#3fe0ff', engoliu: '#3fe0ff', duas: '#ffd23a', navio: '#45f06a',
  fumaca: '#ff8a1f', vivo: '#45f06a', faria: '#ffd23a', comenta: '#45f06a',
};
// exceções: "na maré" só é destaque na frase do aviso; "não" só no aviso
const ONLY_IN_LINE = { nao: [11], confie: [11] };

export class HUD {
  constructor(timeline, survivalKeys) {
    this.tl = timeline;
    this.keys = survivalKeys; // [[t, valor], ...]
    this.chunks = this.buildChunks();
  }
  buildChunks() {
    const chunks = [];
    for (const line of this.tl.lines) {
      const ws = this.tl.words.filter((w) => w.start >= line.start - 0.01 && w.start < line.end - 0.01);
      let cur = [];
      ws.forEach((w, i) => {
        cur.push(w);
        const punct = /[,.:?!…]["”]?$/.test(w.text) || w.text.endsWith('...');
        if (cur.length >= 3 || punct || i === ws.length - 1) { chunks.push({ line: line.index, words: cur }); cur = []; }
      });
    }
    chunks.forEach((c, i) => {
      c.start = c.words[0].start;
      const next = chunks[i + 1];
      c.end = next ? Math.min(next.words[0].start, c.words[c.words.length - 1].end + 0.6) : c.words[c.words.length - 1].end + 1.2;
    });
    return chunks;
  }
  // keys: [[tempo, valor], ...] — a partir do "tempo" a barra anima (0,6 s) até o novo valor; null = "??"
  survival(t) {
    let v = this.keys[0][1];
    for (let i = 1; i < this.keys.length; i++) {
      const [T, V] = this.keys[i];
      if (t < T) break;
      v = V === null || v === null ? V : lerp(v, V, easeOut(range(t, T, T + 0.6)));
    }
    return v;
  }
  drop(t) { // última queda: {at, delta}
    let r = { at: -10, delta: 0 };
    for (let i = 1; i < this.keys.length; i++) {
      const [T, V] = this.keys[i], P = this.keys[i - 1][1];
      if (T <= t && V !== null && P !== null && V < P) r = { at: T, delta: Math.round(V - P) };
    }
    return r;
  }
  draw(g, t, fx = {}) {
    const W = g.canvas.width, H = g.canvas.height, S = W / 1080;
    g.save(); g.scale(S, S);
    this.vignette(g, fx);
    if (fx.flash) { g.fillStyle = `rgba(255,255,255,${fx.flash})`; g.fillRect(0, 0, 1080, 1920); }
    if (fx.black) { g.fillStyle = `rgba(0,0,0,${fx.black})`; g.fillRect(0, 0, 1080, 1920); }
    if (fx.redPulse) { const a = fx.redPulse; const gr = g.createRadialGradient(540, 960, 400, 540, 960, 1150); gr.addColorStop(0, 'rgba(255,0,0,0)'); gr.addColorStop(1, `rgba(220,0,0,${a})`); g.fillStyle = gr; g.fillRect(0, 0, 1080, 1920); }
    if (fx.arrows) this.arrows(g, t, fx.arrows);
    if (fx.badge) this.badge(g, t, fx.badge);
    if (fx.split) this.split(g, t, fx.split);
    if (fx.title) this.title(g, fx.title);
    this.bar(g, t, fx);
    this.captions(g, t, fx);
    if (fx.cta) this.cta(g, t, fx.cta);
    g.restore();
  }
  vignette(g, fx) {
    const gr = g.createRadialGradient(540, 980, 520, 540, 980, 1250);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${fx.vignette ?? 0.55})`);
    g.fillStyle = gr; g.fillRect(0, 0, 1080, 1920);
  }
  rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
  bar(g, t, fx) {
    const v = this.survival(t), unknown = v === null;
    const dr = this.drop(t), sinceDrop = t - dr.at;
    const shake = sinceDrop < 0.5 ? Math.sin(sinceDrop * 70) * 10 * (1 - sinceDrop / 0.5) : 0;
    const x = 70 + shake, y = 92, w = 940, h = 112;
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 18;
    this.rr(g, x, y, w, h, 30); g.fillStyle = 'rgba(12,16,24,0.78)'; g.fill(); g.shadowBlur = 0;
    g.lineWidth = 5; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.stroke();
    // ícone de coração
    const col = unknown ? '#ffffff' : v > 60 ? '#3ddc5a' : v > 30 ? '#ffc93c' : '#ff3b3b';
    const beat = 1 + (v !== null && v <= 30 ? Math.max(0, Math.sin(t * 9)) * 0.18 : Math.max(0, Math.sin(t * 5)) * 0.06);
    g.save(); g.translate(x + 62, y + 58); g.scale(beat, beat);
    g.fillStyle = col; g.beginPath(); g.moveTo(0, 26); g.bezierCurveTo(-46, -4, -30, -40, 0, -18); g.bezierCurveTo(30, -40, 46, -4, 0, 26); g.fill();
    g.lineWidth = 4; g.strokeStyle = '#111'; g.stroke(); g.restore();
    // título
    g.font = `40px ${FONT}`; g.fillStyle = '#fff'; g.textBaseline = 'middle';
    g.fillText('SOBREVIVÊNCIA', x + 118, y + 32);
    // barra
    const bx = x + 118, by = y + 60, bw = 640, bh = 34;
    this.rr(g, bx, by, bw, bh, 17); g.fillStyle = '#2a2f3a'; g.fill();
    if (!unknown) {
      const fw = Math.max(bh, bw * clamp(v / 100));
      this.rr(g, bx, by, fw, bh, 17);
      const gr = g.createLinearGradient(0, by, 0, by + bh); gr.addColorStop(0, col); gr.addColorStop(1, shade(col));
      g.fillStyle = gr; g.fill();
      g.fillStyle = 'rgba(255,255,255,0.35)'; this.rr(g, bx + 8, by + 5, fw - 16, 8, 4); g.fill();
      if (sinceDrop < 0.4) { this.rr(g, bx, by, bw, bh, 17); g.fillStyle = `rgba(255,255,255,${0.6 * (1 - sinceDrop / 0.4)})`; g.fill(); }
    } else {
      for (let i = 0; i < 8; i++) { g.fillStyle = (Math.floor(t * 6) + i) % 2 ? '#ff3b3b' : '#ffd23a'; this.rr(g, bx + 4 + i * 79.5, by + 4, 72, bh - 8, 10); g.fill(); }
    }
    g.lineWidth = 4; g.strokeStyle = '#0b0b0b'; this.rr(g, bx, by, bw, bh, 17); g.stroke();
    // porcentagem
    g.font = `64px ${FONT}`; g.textAlign = 'right';
    const txt = unknown ? '??' : `${Math.round(v)}%`;
    g.lineWidth = 10; g.strokeStyle = '#000'; g.strokeText(txt, x + w - 28, y + 62); g.fillStyle = col; g.fillText(txt, x + w - 28, y + 62);
    g.restore();
    // queda: texto "-XX" flutuando
    if (sinceDrop < 1.0 && !unknown) {
      const d = dr.delta, a = 1 - sinceDrop;
      g.save(); g.globalAlpha = a; g.font = `72px ${FONT}`; g.textAlign = 'center';
      g.lineWidth = 12; g.strokeStyle = '#000'; g.strokeText(`${d}%`, 860, 280 + sinceDrop * 60); g.fillStyle = '#ff3b3b'; g.fillText(`${d}%`, 860, 280 + sinceDrop * 60);
      g.restore();
    }
    // tag do episódio
    g.save(); g.font = `34px ${FONT}`; g.textAlign = 'left'; g.globalAlpha = 0.9;
    g.lineWidth = 8; g.strokeStyle = 'rgba(0,0,0,0.8)'; g.strokeText('EP. 1 • O FAROL DA MARÉ', 84, 244); g.fillStyle = '#fff'; g.fillText('EP. 1 • O FAROL DA MARÉ', 84, 244);
    g.restore();
  }
  captions(g, t, fx) {
    const c = this.chunks.find((ch) => t >= ch.start - 0.02 && t < ch.end);
    if (!c) return;
    const size = 100, y0 = fx.captionY ?? 1390;
    g.save(); g.font = `${size}px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle';
    const items = c.words.map((w) => {
      const n = norm(w.text);
      let color = KEYWORDS[n];
      if (ONLY_IN_LINE[n] && !ONLY_IN_LINE[n].includes(c.line)) color = undefined;
      if (c.line === 11 && (n === 'na' || n === 'mare')) color = '#ff3b3b';
      if (c.line === 17 && n === 'um') color = '#ff3b3b';
      const text = color ? w.text.toUpperCase() : w.text;
      return { w, text, color, width: g.measureText(text).width * (color ? 1.12 : 1) + 28 };
    });
    // quebra em linhas de no máximo 920px
    const rows = [[]]; let rw = 0;
    for (const it of items) { if (rw + it.width > 940 && rows[rows.length - 1].length) { rows.push([]); rw = 0; } rows[rows.length - 1].push(it); rw += it.width; }
    const pop = easeOut(range(t, c.start - 0.02, c.start + 0.12));
    rows.forEach((row, ri) => {
      const total = row.reduce((s, it) => s + it.width, 0) - 28;
      let x = 540 - total / 2; const y = y0 + ri * 112 - (rows.length - 1) * 56;
      for (const it of row) {
        const active = t >= it.w.start - 0.03;
        const wp = easeOut(range(t, it.w.start - 0.03, it.w.start + 0.1));
        const sc = (it.color ? 1.12 : 1) * (0.85 + 0.15 * pop) * (active ? 1 + 0.12 * Math.sin(Math.PI * wp) : 1);
        const ww = g.measureText(it.text).width, slot = it.width - 28;
        g.save(); g.translate(x + slot / 2, y); g.scale(sc, sc); g.globalAlpha = active ? 1 : 0.0;
        g.lineJoin = 'round'; g.lineWidth = 20; g.strokeStyle = '#000'; g.strokeText(it.text, -ww / 2, 4);
        g.fillStyle = it.color || '#ffffff'; g.fillText(it.text, -ww / 2, 0);
        g.restore();
        x += it.width;
      }
    });
    g.restore();
  }
  arrows(g, t, k) {
    const p = Math.sin(t * 10) * 18;
    const arrow = (x, y, dir) => {
      g.save(); g.translate(x, y + dir * p); g.rotate(dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      g.fillStyle = '#ff3b2f'; g.strokeStyle = '#000'; g.lineWidth = 8;
      g.beginPath(); g.moveTo(-70, -24); g.lineTo(10, -24); g.lineTo(10, -56); g.lineTo(70, 0); g.lineTo(10, 56); g.lineTo(10, 24); g.lineTo(-70, 24); g.closePath(); g.stroke(); g.fill();
      g.restore();
    };
    g.save(); g.globalAlpha = k;
    for (const x of [300, 540, 780]) { arrow(x, 520, 1); arrow(x, 1120, -1); }
    g.restore();
  }
  badge(g, t, b) {
    const a = b.k;
    g.save(); g.globalAlpha = a; g.translate(540, 1080); g.scale(0.7 + 0.3 * easeOut(a), 0.7 + 0.3 * easeOut(a));
    this.rr(g, -250, -70, 500, 140, 36); g.fillStyle = 'rgba(15,15,20,0.85)'; g.fill(); g.lineWidth = 6; g.strokeStyle = '#ff8a1f'; g.stroke();
    g.font = `52px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(b.label, 0, -18);
    g.font = `60px ${FONT}`; g.fillStyle = '#ff8a1f'; g.fillText(b.value, 0, 36);
    g.restore();
  }
  title(g, k) {
    g.save(); g.globalAlpha = k; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `120px ${FONT}`; g.lineJoin = 'round';
    g.lineWidth = 24; g.strokeStyle = '#000'; g.strokeText('O FAROL', 540, 470); g.strokeText('DA MARÉ', 540, 600);
    g.fillStyle = '#ffd23a'; g.fillText('O FAROL', 540, 470); g.fillStyle = '#3fe0ff'; g.fillText('DA MARÉ', 540, 600);
    g.restore();
  }
  split(g, t, s) {
    // divisória e rótulos A/B (as duas câmeras já foram desenhadas na tela)
    g.save(); g.globalAlpha = s.k;
    g.fillStyle = '#000'; g.fillRect(534, 0, 12, 1920);
    const card = (x, letter, l1, l2, color) => {
      this.rr(g, x - 240, 1560, 480, 230, 34); g.fillStyle = 'rgba(10,12,18,0.85)'; g.fill(); g.lineWidth = 7; g.strokeStyle = color; g.stroke();
      g.beginPath(); g.arc(x, 1560, 62, 0, 7); g.fillStyle = color; g.fill(); g.lineWidth = 7; g.strokeStyle = '#000'; g.stroke();
      g.font = `86px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#000'; g.fillText(letter, x, 1566);
      g.font = `56px ${FONT}`; g.fillStyle = '#fff'; g.fillText(l1, x, 1672); g.fillStyle = color; g.fillText(l2, x, 1736);
    };
    card(270, 'A', 'ATIRAR NO', 'NAVIO', '#45f06a');
    card(810, 'B', 'CORRER ATÉ', 'A FUMAÇA', '#ff8a1f');
    g.restore();
  }
  cta(g, t, c) {
    g.save(); g.globalAlpha = c.k; g.textAlign = 'center'; g.textBaseline = 'middle';
    const pulse = 1 + Math.sin(t * 6) * 0.04;
    g.translate(540, 1650); g.scale(pulse, pulse);
    this.rr(g, -430, -110, 860, 220, 40); g.fillStyle = 'rgba(10,12,18,0.88)'; g.fill(); g.lineWidth = 7; g.strokeStyle = '#ffd23a'; g.stroke();
    g.font = `66px ${FONT}`; g.fillStyle = '#fff'; g.fillText('COMENTE', -190, -42);
    g.fillStyle = '#45f06a'; g.fillText('A', 30, -42); g.fillStyle = '#fff'; g.fillText('OU', 130, -42); g.fillStyle = '#ff8a1f'; g.fillText('B', 230, -42);
    g.font = `46px ${FONT}`; g.fillStyle = '#ffd23a'; g.fillText(c.part2 ? 'PARTE 2 EM BREVE!' : 'O QUE VOCÊ FARIA?', 0, 50);
    g.restore();
  }
}
function shade(hex) {
  const n = parseInt(hex.slice(1), 16), f = 0.65;
  return `rgb(${((n >> 16) & 255) * f | 0},${((n >> 8) & 255) * f | 0},${(n & 255) * f | 0})`;
}
