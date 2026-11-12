"""Monta a narração final (com pausas entre as falas) e o timeline.json com o tempo de cada palavra.

Uso: python3 tools/build_timeline.py
Entradas: assets/audio/narracao_v2_take1.mp3 e assets/audio/narracao_v2_take1_words.json
Saídas:   build/narracao.wav e src/timeline.json
"""
import json, re, subprocess, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_MP3 = f"{ROOT}/assets/audio/narracao_v2_take1.mp3"
WORDS = f"{ROOT}/assets/audio/narracao_v2_take1_words.json"
os.makedirs(f"{ROOT}/build", exist_ok=True)

# Cada fala: (primeira palavra, pausa ANTES da fala em segundos)
LINES = [
    ("Eu só ia pescar", 1.2), ("Mas o céu", 0.8), ("Uma onda gigante", 0.8),
    ("Eu fiquei preso", 1.4), ("Tirei o colete", 0.9), ("Nadei a noite", 0.7),
    ("Era uma ilha", 1.1), ("No alto", 0.7), ("Lá dentro", 0.8),
    ("Na parede", 0.7), ("E escreveu", 0.7), ("No dia seguinte", 1.1),
    ("Corri pela", 0.5), ("Lá de cima", 0.7), ("Um navio", 0.6),
    ("E fumaça", 0.6), ("Eu só tenho", 0.9), ("Disparo o", 0.6),
    ("O que você", 1.2),
]
TAIL = 3.5  # tempo final com a tela de escolha

def silences():
    out = []
    for th, d in (("-40dB", 0.1), ("-30dB", 0.08)):
        r = subprocess.run(["ffmpeg", "-hide_banner", "-i", SRC_MP3, "-af", f"silencedetect=n={th}:d={d}",
                            "-f", "null", "-"], capture_output=True, text=True).stderr
        st = [float(x) for x in re.findall(r"silence_start: ([0-9.]+)", r)]
        en = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", r)]
        out += list(zip(st, en))
    return out

raw = json.load(open(WORDS))["words"]
words, in_tag = [], False
for w in raw:
    if w["type"] != "word":
        continue
    t = w["text"]
    if t.startswith("["):
        in_tag = True
    if in_tag:
        if t.endswith("]") or t.endswith("],"):
            in_tag = False
        continue
    words.append({"text": t, "start": w["start"], "end": w["end"]})

# Localiza o índice da primeira palavra de cada fala
starts, k = [], 0
for phrase, _ in LINES:
    first = phrase.split()
    while True:
        cand = [re.sub(r'[^\wÀ-ú]', '', words[k + i]["text"]).lower() for i in range(len(first))]
        if cand == [re.sub(r'[^\wÀ-ú]', '', f).lower() for f in first]:
            break
        k += 1
    starts.append(k)
    k += 1

sil = silences()
dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", SRC_MP3],
                           capture_output=True, text=True).stdout)

def cut_before(idx):
    """Ponto de corte antes da palavra idx: meio do silêncio mais próximo."""
    if idx == 0:
        return 0.0
    t = words[idx]["start"]
    best = None
    for s, e in sil:
        if s - 0.45 <= t <= e + 0.25:
            m = (s + e) / 2
            if best is None or abs(m - t) < abs(best - t):
                best = m
    return best if best is not None else t - 0.03

cuts = [cut_before(i) for i in starts] + [dur]
segments, new_t, timeline_lines = [], 0.0, []
words_out = []
for li, (phrase, gap) in enumerate(LINES):
    a, b = cuts[li], cuts[li + 1]
    new_t += gap
    seg_new_start = new_t
    segments.append((a, b, gap))
    i0, i1 = starts[li], (starts[li + 1] if li + 1 < len(starts) else len(words))
    lw = []
    for w in words[i0:i1]:
        s = max(0.0, w["start"] - a - 0.04) + seg_new_start
        e = min(w["end"], b) - a + seg_new_start
        lw.append({"text": w["text"], "start": round(s, 3), "end": round(max(e, s + 0.08), 3)})
    words_out += lw
    timeline_lines.append({"index": li + 1, "text": " ".join(w["text"] for w in lw),
                           "start": round(seg_new_start, 3), "speechEnd": round(seg_new_start + (b - a), 3)})
    new_t += b - a
total = new_t + TAIL
for i, l in enumerate(timeline_lines):
    l["end"] = timeline_lines[i + 1]["start"] if i + 1 < len(timeline_lines) else round(total, 3)

# Áudio: corta cada fala da narração original e coloca a pausa antes dela
concat_inputs = "".join(f"[s{i}][a{i}]" for i in range(len(segments)))
# divide a fonte em N cópias
split = f"[0:a]aresample=44100,aformat=channel_layouts=mono,asplit={len(segments)}" + "".join(f"[c{i}]" for i in range(len(segments)))
parts = [split]
for i, (a, b, gap) in enumerate(segments):
    parts.append(f"aevalsrc=0:d={gap}:s=44100[s{i}]")
    parts.append(f"[c{i}]atrim={a}:{b},asetpts=PTS-STARTPTS,afade=t=in:d=0.015,"
                 f"afade=t=out:st={max(0, b - a - 0.03):.3f}:d=0.03[a{i}]")
parts.append(f"aevalsrc=0:d={TAIL}:s=44100[tail]")
parts.append(concat_inputs + f"[tail]concat=n={2 * len(segments) + 1}:v=0:a=1[out]")
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", SRC_MP3, "-filter_complex", ";".join(parts),
                "-map", "[out]", "-ar", "44100", f"{ROOT}/build/narracao.wav"], check=True)

json.dump({"duration": round(total, 3), "lines": timeline_lines, "words": words_out},
          open(f"{ROOT}/src/timeline.json", "w"), ensure_ascii=False, indent=1)
print("duração total", round(total, 2))
for l in timeline_lines:
    print(f'{l["index"]:2d} {l["start"]:6.2f}-{l["end"]:6.2f}  {l["text"]}')
