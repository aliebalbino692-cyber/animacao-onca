"""Monta a narração final de um episódio (falas com pausas entre elas) e o timeline.json com o tempo de cada palavra.

Uso: python3 tools/build_timeline.py ep02
Saídas: build/<ep>/narracao.wav e src/<ep>/timeline.json

Cada fala vem de uma "fonte" (arquivo de áudio + transcrição com tempos por palavra do ElevenLabs Scribe).
Assim dá para misturar vozes (ex.: narrador + outro personagem).
"""
import json, re, subprocess, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = f"{ROOT}/assets/audio"

EPISODES = {
    "ep01": {
        "sources": [(f"{A}/narracao_v2_take1.mp3", f"{A}/narracao_v2_take1_words.json")],
        # (primeiras palavras da fala, pausa ANTES da fala em segundos, índice da fonte)
        "lines": [
            ("Eu só ia pescar", 1.2), ("Mas o céu", 0.8), ("Uma onda gigante", 0.8),
            ("Eu fiquei preso", 1.4), ("Tirei o colete", 0.9), ("Nadei a noite", 0.7),
            ("Era uma ilha", 1.1), ("No alto", 0.7), ("Lá dentro", 0.8),
            ("Na parede", 0.7), ("E escreveu", 0.7), ("No dia seguinte", 1.1),
            ("Corri pela", 0.5), ("Lá de cima", 0.7), ("Um navio", 0.6),
            ("E fumaça", 0.6), ("Eu só tenho", 0.9), ("Disparo o", 0.6),
            ("O que você", 1.2),
        ],
        "tail": 3.5,
    },
    "ep02": {
        "sources": [(f"{A}/ep02/davi_take1.mp3", f"{A}/ep02/davi_take1_words.json"),
                    (f"{A}/ep02/lia_take1.mp3", f"{A}/ep02/lia_take1_words.json")],
        "lines": [
            ("Escolhi a fumaça", 1.0), ("A água já", 0.7), ("Ergui o sinalizador", 0.6),
            ("Do nada", 0.7), ("Me agarrei", 0.8), ("Cheguei na", 1.0),
            ("Do lado", 0.8), ("A maré sobe", 0.7), ("Aí uma voz", 0.9),
            ("Você também", 0.35, 1), ("Era Lia", 0.9), ("Foi ela", 0.6),
            ("A água apagou", 0.9), ("Ela tinha", 0.8), ("e apontou", 0.25),
            ("Subir na", 1.2), ("ou remar", 0.3), ("O que você", 1.0),
        ],
        "tail": 3.5,
    },
}

ep = sys.argv[1] if len(sys.argv) > 1 else "ep01"
CFG = EPISODES[ep]
os.makedirs(f"{ROOT}/build/{ep}", exist_ok=True)
os.makedirs(f"{ROOT}/src/{ep}", exist_ok=True)
clean = lambda s: re.sub(r'[^\wÀ-ú]', '', s).lower()

def load_words(path):
    out, in_tag = [], False
    for w in json.load(open(path))["words"]:
        if w["type"] != "word":
            continue
        t = w["text"]
        if t.startswith("["):
            in_tag = True
        if in_tag:
            if t.endswith("]") or t.endswith("],"):
                in_tag = False
            continue
        out.append({"text": t, "start": w["start"], "end": w["end"]})
    return out

def silences(mp3):
    out = []
    for th, d in (("-40dB", 0.1), ("-30dB", 0.08)):
        r = subprocess.run(["ffmpeg", "-hide_banner", "-i", mp3, "-af", f"silencedetect=n={th}:d={d}",
                            "-f", "null", "-"], capture_output=True, text=True).stderr
        st = [float(x) for x in re.findall(r"silence_start: ([0-9.]+)", r)]
        en = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", r)]
        out += list(zip(st, en))
    return out

def duration(f):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f],
                                capture_output=True, text=True).stdout)

srcs = [{"mp3": m, "words": load_words(w), "sil": silences(m), "dur": duration(m)} for m, w in CFG["sources"]]
lines = [(l[0], l[1], l[2] if len(l) > 2 else 0) for l in CFG["lines"]]

# índice da primeira palavra de cada fala, dentro da sua fonte
cursor = [0] * len(srcs)
starts = []
for phrase, _, si in lines:
    words, first, k = srcs[si]["words"], [clean(f) for f in phrase.split()], cursor[si]
    while [clean(words[k + i]["text"]) for i in range(len(first))] != first:
        k += 1
    starts.append(k); cursor[si] = k + 1

def cut_before(si, idx):
    if idx == 0:
        return 0.0
    s = srcs[si]; t = s["words"][idx]["start"]; best = None
    for a, b in s["sil"]:
        if a - 0.45 <= t <= b + 0.25:
            m = (a + b) / 2
            if best is None or abs(m - t) < abs(best - t):
                best = m
    return best if best is not None else t - 0.03

segments, new_t, tl_lines, words_out = [], 0.0, [], []
for li, (phrase, gap, si) in enumerate(lines):
    a = cut_before(si, starts[li])
    nxt = next((j for j in range(li + 1, len(lines)) if lines[j][2] == si), None)
    b = cut_before(si, starts[nxt]) if nxt is not None else srcs[si]["dur"]
    i1 = starts[nxt] if nxt is not None else len(srcs[si]["words"])
    new_t += gap
    seg0 = new_t
    segments.append((si, a, b, gap))
    lw = []
    for w in srcs[si]["words"][starts[li]:i1]:
        s = max(0.0, w["start"] - a - 0.04) + seg0
        e = min(w["end"], b) - a + seg0
        lw.append({"text": w["text"], "start": round(s, 3), "end": round(max(e, s + 0.08), 3), "voice": si})
    words_out += lw
    tl_lines.append({"index": li + 1, "text": " ".join(w["text"] for w in lw), "voice": si,
                     "start": round(seg0, 3), "speechEnd": round(seg0 + (b - a), 3)})
    new_t += b - a
total = new_t + CFG["tail"]
for i, l in enumerate(tl_lines):
    l["end"] = tl_lines[i + 1]["start"] if i + 1 < len(tl_lines) else round(total, 3)

# áudio: corta cada fala da sua fonte e coloca a pausa antes dela
inputs, parts = [], []
for i, s in enumerate(srcs):
    inputs += ["-i", s["mp3"]]
    n = sum(1 for seg in segments if seg[0] == i)
    parts.append(f"[{i}:a]aresample=44100,aformat=channel_layouts=mono,asplit={n}" + "".join(f"[c{i}_{k}]" for k in range(n)))
used = [0] * len(srcs)
for j, (si, a, b, gap) in enumerate(segments):
    parts.append(f"aevalsrc=0:d={gap}:s=44100[s{j}]")
    parts.append(f"[c{si}_{used[si]}]atrim={a}:{b},asetpts=PTS-STARTPTS,afade=t=in:d=0.015,"
                 f"afade=t=out:st={max(0, b - a - 0.03):.3f}:d=0.03[a{j}]")
    used[si] += 1
parts.append(f"aevalsrc=0:d={CFG['tail']}:s=44100[tail]")
parts.append("".join(f"[s{j}][a{j}]" for j in range(len(segments))) + f"[tail]concat=n={2 * len(segments) + 1}:v=0:a=1[out]")
subprocess.run(["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex", ";".join(parts),
                "-map", "[out]", "-ar", "44100", f"{ROOT}/build/{ep}/narracao.wav"], check=True)

json.dump({"duration": round(total, 3), "lines": tl_lines, "words": words_out},
          open(f"{ROOT}/src/{ep}/timeline.json", "w"), ensure_ascii=False, indent=1)
print(ep, "duração total", round(total, 2))
for l in tl_lines:
    print(f'{l["index"]:2d} {l["start"]:6.2f}-{l["end"]:6.2f} v{l["voice"]} {l["text"]}')
