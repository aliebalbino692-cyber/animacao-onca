"""Trilha e efeitos sonoros sintetizados (sem samples externos) + mixagem com a narração.

Uso: python3 tools/build_audio.py ep02   ->  build/<ep>/trilha.wav e build/<ep>/audio_final.wav
"""
import json, os, re, subprocess, sys, unicodedata, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EP = sys.argv[1] if len(sys.argv) > 1 else "ep01"
SR = 44100
tl = json.load(open(f"{ROOT}/src/{EP}/timeline.json"))
DUR = tl["duration"]
N = int(DUR * SR) + SR
rng = np.random.default_rng(7)
t = np.arange(N) / SR

def norm(w):
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

def env(a, b, fade=0.4):
    return np.clip((t - a) / fade, 0, 1) * np.clip((b - t) / fade, 0, 1)

def burst(at, dur, sig):
    out = np.zeros(N); i0 = int(at * SR); n = int(dur * SR)
    if i0 >= N or i0 < 0: return out
    n = min(n, N - i0); tt = np.arange(n) / SR
    out[i0:i0 + n] = sig(tt); return out

white = rng.standard_normal(N)
brown = np.cumsum(rng.standard_normal(N)); brown -= lowpass(brown, 4000); brown /= np.abs(brown).max()
def normed(x): return x / np.abs(x).max()
ocean = normed(lowpass(white, 60) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.13 * t) ** 2))
rain = normed(white - lowpass(white, 8))
under = normed(lowpass(brown, 200))
wind = normed(lowpass(white, 25) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.21 * t + np.sin(2 * np.pi * 0.07 * t) * 3)))
room = normed(lowpass(brown, 600))
rush = normed(lowpass(white, 14) * (0.7 + 0.3 * np.sin(2 * np.pi * 3.1 * t)))

thunder = lambda tt: brown[:len(tt)] * np.exp(-tt * 1.6) * (1 - np.exp(-tt * 40))
crash = lambda tt: (lowpass(white[:len(tt)], 30) * 3) * np.exp(-tt * 1.3) * (1 - np.exp(-tt * 25))
splash = lambda tt: (white[:len(tt)] - lowpass(white[:len(tt)], 20)) * np.exp(-tt * 5)
hiss = lambda tt: (white[:len(tt)] - lowpass(white[:len(tt)], 4)) * np.exp(-tt * 1.8) * (1 - np.exp(-tt * 30))
creak = lambda tt: np.sin(2 * np.pi * (90 + 40 * np.sin(tt * 9)) * tt) * np.sign(np.sin(2 * np.pi * 23 * tt)) * np.exp(-tt * 2.2) * 0.5
def hit(tt, base=55):
    return np.sin(2 * np.pi * base * tt * (1 - 0.3 * tt)) * np.exp(-tt * 2.5) + brown[:len(tt)] * np.exp(-tt * 6) * 0.6
whoosh = lambda tt: lowpass(white[:len(tt)], 12) * np.sin(np.pi * tt / 0.4) ** 2
def heart(a, b, bpm):
    out = np.zeros(N); p = 60 / bpm; x = a
    while x < b:
        for d, g in ((0, 1.0), (0.22, 0.7)):
            out += burst(x + d, 0.25, lambda tt: np.sin(2 * np.pi * 48 * tt) * np.exp(-tt * 18)) * g
        x += p
    return out
def bubbles(a, n, gain=0.12):
    out = np.zeros(N)
    for k in range(n):
        at = a + k * 0.33 + (k % 3) * 0.07; f0 = 500 + (k * 137) % 600
        out += burst(at, 0.12, lambda tt, f0=f0: np.sin(2 * np.pi * (f0 + 3000 * tt) * tt) * np.exp(-tt * 30)) * gain
    return out
def insects(a, b, gain):  # grilos/cigarras: pulsos agudos
    s = np.sin(2 * np.pi * 4300 * t) * (np.sin(2 * np.pi * 28 * t) > 0.6) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.4 * t))
    s += np.sin(2 * np.pi * 5200 * t + 1) * (np.sin(2 * np.pi * 21 * t + 2) > 0.7) * 0.6
    return s * env(a, b, 1.0) * gain
def crackle(a, b, gain):  # estalos da fogueira
    out = np.zeros(N); r = np.random.default_rng(3); x = a
    while x < b:
        out += burst(x, 0.03, lambda tt: white[:len(tt)] * np.exp(-tt * 200)) * (0.4 + r.random())
        x += 0.04 + r.random() * 0.18
    return normed(lowpass(white, 300)) * env(a, b, 0.5) * gain * 0.4 + out * gain
def pad(freqs, a, b, gain):
    s = sum(np.sin(2 * np.pi * f * t + i) for i, f in enumerate(freqs)) / len(freqs)
    return s * (0.75 + 0.25 * np.sin(2 * np.pi * 0.5 * t)) * env(a, b, 1.0) * gain
def pulse(ranges, bpm=100, gain=1.0):
    out = np.zeros(N); beat = 60 / bpm
    for k in range(int(DUR / beat)):
        at = k * beat
        if any(a < at < b for a, b in ranges):
            out += burst(at, 0.15, lambda tt: (white[:len(tt)] - lowpass(white[:len(tt)], 6)) * np.exp(-tt * 40)) * 0.08 * gain
            if k % 2 == 0:
                out += burst(at, 0.3, lambda tt: np.sin(2 * np.pi * 45 * tt) * np.exp(-tt * 12)) * 0.25 * gain
    return out

mix = np.zeros(N)
if EP == "ep01":
    tEsc, tVir, tPreto = word("escapei"), word("virou"), word("preto")
    mix += ocean * 0.10 * env(0, shot(4), 0.5) + rain * 0.07 * env(tPreto - 0.8, shot(4), 0.3)
    mix += under * 0.35 * env(shot(4), tEsc - 0.25, 0.15)
    mix += ocean * 0.12 * env(tEsc - 0.25, shot(7), 0.3) + rain * 0.04 * env(tEsc - 0.25, shot(6), 0.3)
    mix += ocean * 0.08 * env(shot(7), shot(9), 0.4) + room * 0.10 * env(shot(9), shot(12), 0.2)
    mix += ocean * 0.16 * env(shot(12), shot(13), 0.2) + room * 0.10 * env(shot(13), shot(14), 0.2)
    mix += wind * 0.10 * env(shot(14), DUR, 0.4) + ocean * 0.05 * env(shot(14), DUR, 0.4)
    mix += burst(tPreto, 3.5, thunder) * 0.9 + burst(tVir + 0.1, 3.0, crash) * 0.8 + burst(tEsc - 0.2, 1.2, splash) * 0.35
    mix += bubbles(shot(4) + 0.3, 14) + burst(shot(9) + 0.2, 1.0, creak) * 0.25
    for at in (word("nao", 2), line(18)["start"] - 0.2, word("faria")):
        mix += burst(at, 2.5, hit) * 0.55
    cuts = [shot(i) for i in range(2, 20)] + [word("mergulhei") - 0.1, word("ate", 1) - 0.08, word("e", 2) - 0.05, word("alguem", 2) - 0.08]
    mix += heart(shot(4), tEsc - 0.3, 130) * 0.5 + heart(shot(17), line(18)["start"], 110) * 0.6
    mix += pad([110, 164.81, 220, 261.63], 0, shot(2), 0.07) + pad([55, 82.4, 110, 116.54], shot(2), shot(6), 0.10)
    mix += pad([73.4, 110, 146.8, 174.6], shot(6), shot(9), 0.07) + pad([65.4, 98, 130.8, 138.6], shot(9), shot(14), 0.08)
    mix += pad([55, 82.4, 110, 130.8, 164.8], shot(14), DUR, 0.10)
    mix += pulse([(shot(2), shot(6)), (shot(12), DUR - 1)])
elif EP == "ep02":
    tCor, tCipo, tApag, tEscr = word("correnteza"), word("cipo"), word("apagou"), word("escreveu")
    mix += wind * 0.08 * env(0, word("desci") - 0.1, 0.3) + room * 0.10 * env(word("desci") - 0.1, shot(2), 0.2)
    mix += ocean * 0.12 * env(shot(2), shot(6), 0.4)
    mix += rush * 0.32 * env(tCor - 0.3, shot(5) + 2.2, 0.3) + burst(tCor - 0.2, 1.2, splash) * 0.45
    mix += insects(shot(3), shot(13), 0.012) + insects(shot(13), DUR, 0.03)
    mix += crackle(shot(6), tApag + 0.1, 0.10)
    mix += burst(tApag, 2.2, hiss) * 0.35
    mix += ocean * 0.07 * env(shot(13), DUR, 0.6) + wind * 0.05 * env(shot(15), DUR, 0.6)
    mix += burst(shot(14) + 0.3, 1.0, creak) * 0.2  # galhos / canoa
    mix += burst(tEscr - 0.3, 0.6, lambda tt: whoosh(tt[::-1].copy()) if len(tt) else tt) * 0.5  # lembrança
    for at in (line(9)["start"] - 0.1, line(10)["start"] - 0.15, line(16)["start"] - 0.2, word("faria")):
        mix += burst(at, 2.5, hit) * 0.55
    cuts = [shot(i) for i in range(2, 19)] + [word("desci") - 0.1, word("hoje") - 0.12]
    mix += heart(tCor - 0.2, shot(6), 135) * 0.45 + heart(line(9)["start"], line(11)["start"], 115) * 0.5
    mix += pad([65.4, 98, 130.8, 155.6], 0, shot(4), 0.08)            # tensão contida
    mix += pad([55, 82.4, 110, 116.54], shot(4), shot(6), 0.10)       # perigo
    mix += pad([73.4, 110, 146.8, 174.6], shot(6), shot(11), 0.07)    # mistério
    mix += pad([87.3, 130.8, 174.6, 220], shot(11), shot(13), 0.07)   # alívio (Lia)
    mix += pad([55, 82.4, 110, 130.8, 164.8], shot(13), DUR, 0.10)    # clímax
    mix += pulse([(tCor - 0.3, shot(6)), (shot(13), DUR - 1)])
else:
    raise SystemExit("episódio sem trilha definida: " + EP)
for at in cuts:
    mix += burst(at - 0.18, 0.4, whoosh) * 0.22

def write(path, x):
    x = np.clip(x, -1, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype("<i2").tobytes())

os.makedirs(f"{ROOT}/build/{EP}", exist_ok=True)
mix = mix / max(1e-9, np.abs(mix).max()) * 0.8
write(f"{ROOT}/build/{EP}/trilha.wav", mix)
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", f"{ROOT}/build/{EP}/narracao.wav", "-i", f"{ROOT}/build/{EP}/trilha.wav",
    "-filter_complex",
    "[0:a]aformat=channel_layouts=mono,volume=1.6,asplit=2[v][sc];"
    "[1:a]volume=0.55[m];[m][sc]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[md];"
    "[v][md]amix=inputs=2:duration=longest:normalize=0,loudnorm=I=-14:TP=-1.0:LRA=11[out]",
    "-map", "[out]", "-ar", "48000", "-ac", "2", f"{ROOT}/build/{EP}/audio_final.wav"], check=True)
print("ok", EP, DUR)
