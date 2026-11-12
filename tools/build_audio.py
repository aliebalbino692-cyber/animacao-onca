"""Trilha e efeitos sonoros sintetizados (sem samples externos) + mixagem com a narração.

Uso: python3 tools/build_audio.py  ->  build/trilha.wav e build/audio_final.wav
"""
import json, os, subprocess, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 44100
tl = json.load(open(f"{ROOT}/src/timeline.json"))
DUR = tl["duration"]
N = int(DUR * SR) + SR
rng = np.random.default_rng(7)
t = np.arange(N) / SR

def norm(w):
    import unicodedata, re
    w = unicodedata.normalize("NFD", w.lower())
    return re.sub(r"[^a-z0-9]", "", "".join(c for c in w if unicodedata.category(c) != "Mn"))

def word(text, n=1):
    c = 0
    for w in tl["words"]:
        if norm(w["text"]) == norm(text):
            c += 1
            if c == n:
                return w["start"]
    raise KeyError(text)

line = lambda i: tl["lines"][i - 1]
shot = lambda i: 0.0 if i == 1 else line(i - 1)["speechEnd"] + 0.12

def lowpass(x, k):  # média móvel (k amostras), aplicada 2x
    for _ in range(2):
        c = np.cumsum(np.insert(x, 0, 0.0))
        x = (c[k:] - c[:-k]) / k
        x = np.concatenate([x, np.zeros(k - 1)])
    return x

def env(a, b, fade=0.4):  # janela de a até b com fades
    e = np.clip((t - a) / fade, 0, 1) * np.clip((b - t) / fade, 0, 1)
    return e

def burst(at, dur, sig):  # coloca sinal "sig" (função do tempo local) em at
    out = np.zeros(N); i0 = int(at * SR); n = int(dur * SR)
    if i0 >= N: return out
    n = min(n, N - i0); tt = np.arange(n) / SR
    out[i0:i0 + n] = sig(tt); return out

white = rng.standard_normal(N)
brown = np.cumsum(rng.standard_normal(N)); brown -= lowpass(brown, 4000); brown /= np.abs(brown).max()
mix = np.zeros(N)

# --- ambientes ---
ocean = lowpass(white, 60) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.13 * t) ** 2)
ocean /= np.abs(ocean).max()
rain = white - lowpass(white, 8); rain /= np.abs(rain).max()
under = lowpass(brown, 200); under /= np.abs(under).max()
wind = lowpass(white, 25) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.21 * t + np.sin(2 * np.pi * 0.07 * t) * 3))
wind /= np.abs(wind).max()
room = lowpass(brown, 600); room /= np.abs(room).max()

tEsc, tVir, tPreto = word("escapei"), word("virou"), word("preto")
mix += ocean * 0.10 * env(0, shot(4), 0.5)
mix += rain * 0.07 * env(tPreto - 0.8, shot(4), 0.3)
mix += under * 0.35 * env(shot(4), tEsc - 0.25, 0.15)
mix += ocean * 0.12 * env(tEsc - 0.25, shot(7), 0.3) + rain * 0.04 * env(tEsc - 0.25, shot(6), 0.3)
mix += ocean * 0.08 * env(shot(7), shot(9), 0.4)
mix += room * 0.10 * env(shot(9), shot(12), 0.2)
mix += ocean * 0.16 * env(shot(12), shot(13), 0.2)
mix += room * 0.10 * env(shot(13), shot(14), 0.2)
mix += wind * 0.10 * env(shot(14), DUR, 0.4) + ocean * 0.05 * env(shot(14), DUR, 0.4)

# --- efeitos pontuais ---
thunder = lambda tt: brown[:len(tt)] * np.exp(-tt * 1.6) * (1 - np.exp(-tt * 40))
mix += burst(tPreto, 3.5, thunder) * 0.9
crash = lambda tt: (lowpass(white[:len(tt)], 30) * 3) * np.exp(-tt * 1.3) * (1 - np.exp(-tt * 25))
mix += burst(tVir + 0.1, 3.0, crash) * 0.8
splash = lambda tt: (white[:len(tt)] - lowpass(white[:len(tt)], 20)) * np.exp(-tt * 5)
mix += burst(tEsc - 0.2, 1.2, splash) * 0.35
for k in range(14):  # bolhas
    at = shot(4) + 0.3 + k * 0.33 + (k % 3) * 0.07
    f0 = 500 + (k * 137) % 600
    mix += burst(at, 0.12, lambda tt, f0=f0: np.sin(2 * np.pi * (f0 + 3000 * tt) * tt) * np.exp(-tt * 30)) * 0.12
creak = lambda tt: np.sin(2 * np.pi * (90 + 40 * np.sin(tt * 9)) * tt) * np.sign(np.sin(2 * np.pi * 23 * tt)) * np.exp(-tt * 2.2) * 0.5
mix += burst(shot(9) + 0.2, 1.0, creak) * 0.25
def hit(tt, base=55):  # impacto cinematográfico
    return (np.sin(2 * np.pi * base * tt * (1 - 0.3 * tt)) * np.exp(-tt * 2.5) + brown[:len(tt)] * np.exp(-tt * 6) * 0.6)
for at in (word("nao", 2), line(18)["start"] - 0.2, word("faria") ):
    mix += burst(at, 2.5, hit) * 0.55
# whooshes nos cortes
cuts = [shot(i) for i in range(2, 20)] + [word("mergulhei") - 0.1, word("ate", 1) - 0.08, word("e", 2) - 0.05, word("alguem", 2) - 0.08]
for at in cuts:
    mix += burst(at - 0.18, 0.4, lambda tt: lowpass(white[:len(tt)], 12) * np.sin(np.pi * tt / 0.4) ** 2) * 0.22
# batimentos cardíacos (preso e um tiro)
def heart(a, b, bpm):
    out = np.zeros(N); p = 60 / bpm; x = a
    while x < b:
        for d, g in ((0, 1.0), (0.22, 0.7)):
            out += burst(x + d, 0.25, lambda tt: np.sin(2 * np.pi * 48 * tt) * np.exp(-tt * 18)) * g
        x += p
    return out
mix += heart(shot(4), tEsc - 0.3, 130) * 0.5 + heart(shot(17), line(18)["start"], 110) * 0.6

# --- música: drone tenso + pulso ---
def pad(freqs, a, b, gain):
    s = sum(np.sin(2 * np.pi * f * t + i) for i, f in enumerate(freqs)) / len(freqs)
    s *= 0.75 + 0.25 * np.sin(2 * np.pi * 0.5 * t)
    return s * env(a, b, 1.0) * gain
music = np.zeros(N)
music += pad([110, 164.81, 220, 261.63], 0, shot(2), 0.07)                        # calmo (Lá menor)
music += pad([55, 82.4, 110, 116.54], shot(2), shot(6), 0.10)                    # tensão (cluster)
music += pad([73.4, 110, 146.8, 174.6], shot(6), shot(9), 0.07)                  # noite / mistério
music += pad([65.4, 98, 130.8, 138.6], shot(9), shot(14), 0.08)                  # farol
music += pad([55, 82.4, 110, 130.8, 164.8], shot(14), DUR, 0.10)                 # clímax
beat = 60 / 100
for k in range(int(DUR / beat)):
    at = k * beat
    if shot(2) < at < shot(6) or shot(12) < at < DUR - 1:
        music += burst(at, 0.15, lambda tt: (white[:len(tt)] - lowpass(white[:len(tt)], 6)) * np.exp(-tt * 40)) * 0.08
        if k % 2 == 0:
            music += burst(at, 0.3, lambda tt: np.sin(2 * np.pi * 45 * tt) * np.exp(-tt * 12)) * 0.25
mix += music

def write(path, x):
    x = np.clip(x, -1, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype("<i2").tobytes())

mix = mix / max(1e-9, np.abs(mix).max()) * 0.8
write(f"{ROOT}/build/trilha.wav", mix)
# mixagem final: narração em destaque, trilha abaixando quando há fala (ducking)
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", f"{ROOT}/build/narracao.wav", "-i", f"{ROOT}/build/trilha.wav",
    "-filter_complex",
    "[0:a]aformat=channel_layouts=mono,volume=1.6,asplit=2[v][sc];"
    "[1:a]volume=0.55[m];[m][sc]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[md];"
    "[v][md]amix=inputs=2:duration=longest:normalize=0,loudnorm=I=-14:TP=-1.0:LRA=11[out]",
    "-map", "[out]", "-ar", "48000", "-ac", "2", f"{ROOT}/build/audio_final.wav"], check=True)
print("ok", DUR)
