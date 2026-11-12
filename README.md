# animacao-onca

Canal de histórias de **sobrevivência** em animação 3D com personagens em blocos, no formato de short vertical (9:16).

## Episódio 01: O Farol da Maré
- Roteiro e plano de cenas: `roteiros/ep01-o-farol-da-mare.md`
- Análise de estilo da referência: `docs/analise-de-estilo.md`
- Vídeo final: `saida/ep01-o-farol-da-mare.mp4` (1080×1920, 30 fps, cerca de 62 s)

## Como funciona
Toda a animação é gerada por código (three.js), quadro a quadro, sem imagens paradas:

| Arquivo | O que faz |
|---|---|
| `src/lib/character.js` | Personagem em blocos com rosto 2D trocável e poses (andar, correr, nadar, se debater, rastejar...) |
| `src/lib/world.js` | Cenários: céu, mar animado, barco, onda gigante, chuva, raio, fundo do mar, ilha, farol, interior, navio, fumaça, gaivotas |
| `src/lib/hud.js` | Barra de sobrevivência fixa, legendas palavra por palavra com palavras-chave coloridas, setas, cartões de escolha |
| `src/shots.js` | Direção do episódio: os 19 planos (ação do personagem e câmera em função do tempo) |
| `src/timeline.json` | Tempo de cada palavra da narração (gerado) |
| `tools/build_timeline.py` | Monta a narração com pausas e calcula o tempo de cada palavra |
| `tools/build_audio.py` | Sintetiza trilha e efeitos sonoros e mixa com a narração |
| `tools/render.js` | Renderiza todos os quadros no Chromium sem interface |
| `tools/encode.sh` | Gera o MP4 final |

## Gerar o vídeo
```bash
npm install
python3 tools/build_timeline.py      # narração + timeline
python3 tools/build_audio.py         # trilha + mixagem
node tools/render.js 30 3 1          # quadros (fps, processos, escala)
tools/encode.sh 30                   # MP4 em saida/
```
Para ver no navegador com áudio: `node tools/serve.js` e abra `http://localhost:8123/src/index.html`.
Quadros de teste: `node tools/snap.js 3.5 10 22` (gera JPGs em `build/snaps`).

## Narração
A voz foi gerada no ElevenLabs (voz "Matheus Alves", PT-BR, modelo eleven_v4). Os tempos por palavra vêm da transcrição (Scribe).
Os arquivos originais estão em `assets/audio/`.
