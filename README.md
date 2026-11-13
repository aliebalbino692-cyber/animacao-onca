# animacao-onca

Canal de histórias de **sobrevivência** em animação 3D com personagens em blocos, no formato de short vertical (9:16).

## Episódios
| Ep. | Título | Roteiro | Vídeo |
|---|---|---|---|
| 1 | O Farol da Maré | `roteiros/ep01-o-farol-da-mare.md` | `saida/ep01-o-farol-da-mare.mp4` |
| 2 | A Fumaça na Mata (o público escolheu B) | `roteiros/ep02-a-fumaca-na-mata.md` | `saida/ep02-a-fumaca-na-mata.mp4` |

Cada vídeo tem também uma versão `-leve.mp4` (720×1280) para assistir no celular.
Análise de estilo da referência: `docs/analise-de-estilo.md`.

## Como funciona
Toda a animação é gerada por código (three.js), quadro a quadro, sem imagens paradas:

| Arquivo | O que faz |
|---|---|
| `src/lib/character.js` | Personagem em blocos com rosto 2D trocável e poses (andar, correr, nadar, se debater, rastejar...) |
| `src/lib/world.js` | Cenários: céu, mar animado, barco, onda gigante, chuva, raio, fundo do mar, ilha, farol, interior, navio, fumaça, gaivotas |
| `src/lib/hud.js` | Barra de sobrevivência fixa, legendas palavra por palavra com palavras-chave coloridas, setas, cartões de escolha |
| `src/lib/direction.js` | Utilidades de direção (tempos das falas, câmera, orientação) |
| `src/epXX/shots.js` | Direção de cada episódio: planos, ação dos personagens, câmera, barra e textos da tela |
| `src/epXX/props.js` | Objetos novos de um episódio (ex.: Lia, fogueira, canoa no EP. 2) |
| `src/epXX/timeline.json` | Tempo de cada palavra da narração (gerado) |
| `tools/build_timeline.py` | Monta a narração com pausas e calcula o tempo de cada palavra |
| `tools/build_audio.py` | Sintetiza trilha e efeitos sonoros e mixa com a narração |
| `tools/render.js` | Renderiza todos os quadros no Chromium sem interface |
| `tools/encode.sh` | Gera o MP4 final |

## Gerar o vídeo de um episódio
```bash
npm install
python3 tools/build_timeline.py ep02          # narração com pausas + tempos das palavras
python3 tools/build_audio.py ep02             # trilha + efeitos + mixagem
EP=ep02 node tools/render.js 30 3 1           # quadros (fps, processos, escala)
tools/encode.sh ep02 30                       # MP4 em saida/ (completo e leve)
```
Para ver no navegador com áudio: `node tools/serve.js` e abra `http://localhost:8123/src/index.html?ep=ep02`.
Quadros de teste: `EP=ep02 node tools/snap.js 3.5 10 22` (gera JPGs em `build/ep02/snaps`).

## Layout (seguro para TikTok, Reels e Shorts)
- Barra de sobrevivência abaixo da área do topo que o app cobre.
- Legendas acima da descrição do vídeo e longe da coluna de ícones da direita.
- Escolhas A/B no meio da tela dividida, cada metade com a cor da sua opção.

## Narração
Vozes geradas no ElevenLabs (modelo eleven_v4): Davi = "Matheus Alves", Lia = "Sofia" (PT-BR). Os tempos por palavra vêm da transcrição (Scribe).
Os arquivos originais estão em `assets/audio/`.
