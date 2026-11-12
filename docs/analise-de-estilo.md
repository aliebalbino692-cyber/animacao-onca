# Análise de estilo: vídeo de referência (@onca_yt)

Referência: short vertical de cerca de 20 s, em 384×848 (9:16), 59 fps, com narração.
Esta análise serve só como guia de **linguagem visual**. A animação do projeto será original,
com personagens, cenários e história próprios (o nosso roteiro). Não copiamos personagens,
logotipos, cartazes nem a história do vídeo de referência.

## 1. Modelagem
- **Personagens em blocos (estilo "boneco de montar")**: cabeça cilíndrica/quadrada, tronco retangular,
  braços e pernas como prismas retos, mãos simples em forma de "C". Sem dedos, sem articulação visível.
- **Rosto 2D desenhado em textura**: olhos de traço, sobrancelhas grossas, boca expressiva trocada por
  "decal" (raiva, grito com a boca aberta, susto). A emoção vem quase toda da troca de textura do rosto.
- **Cabelo em uma peça rígida** (capacete de cabelo), sem física.
- **Roupa por cor chapada**: camiseta de uniforme numa cor forte, calça escura, crachá/logo pequeno no peito.
- **Proporções**: cabeça grande (~1/4 da altura), membros grossos. Isso lê bem em tela pequena de celular.

## 2. Movimentos
- **Animação posada e rígida**: poses-chave fortes (escorregar, cair de cabeça, ficar entalado),
  com pouco "in-between". O corpo gira como peça única.
- **Quedas e escorregões rápidos**: 3 a 6 frames de ação e depois a pose final segurada.
- **Vibração e tremor** para luta e esforço: pequenos deslocamentos laterais em loop.
- **Câmera é o principal "animador"**: dolly-in rápido, câmera de cima (top-down) olhando o personagem
  entalado, giro de 90° para mostrar o espaço apertado, travelling lateral pelas prateleiras.
- **Motion blur e speed-ramp** nos cortes; cortes a cada ~1 s (ritmo de short).

## 3. Cenários
- **Interiores comerciais estilizados**: corredores com prateleiras cheias de produtos low-poly
  e coloridos, balcões, geladeiras/expositores com grade metálica, chão de madeira/cerâmica, teto modular.
- **Paleta forte**: azul-ciano dominante nas paredes, faixa laranja de contraste, branco frio nos balcões.
- **Exterior noturno minimalista**: fachada de loja isolada, céu azul-escuro liso, estacionamento com faixas.
- **Iluminação**: luz ambiente forte e uniforme nos interiores, vinheta escura nas bordas, leve
  "bloom" e aberração cromática para clima de mistério.

## 4. Estilo visual e edição (formato de short)
- **Legenda palavra por palavra**, centralizada no terço inferior, fonte sans-serif pesada branca
  com contorno preto. **Palavra-chave em cor diferente** (verde, magenta, amarelo, vermelho, ciano, laranja),
  muitas vezes maior e em CAIXA ALTA.
- **Grafismos por cima da cena**: setas vermelhas indicando pressão/aperto, anéis de onda sonora
  para "barulho", textura de "raio-X/holograma" (grade azul) para mostrar o personagem escondido.
- **Inserts de objeto**: calendário com dias riscados para passagem de tempo, cartaz preso na parede
  com zoom-in progressivo.
- **Narração em off** contínua e rápida, com a legenda sincronizada a cada palavra.
- **Gancho nos primeiros 2 s** e final em suspense (corte seco num quadro forte).

## 5. Como aplicar no nosso projeto (sem copiar)
| Elemento | Referência | Nosso projeto (proposta) |
|---|---|---|
| Personagem | boneco em blocos com rosto 2D | mesmo princípio de construção, com design próprio (cores, cabelo, roupa, rostos) |
| Paleta | ciano + laranja | definir paleta própria ligada ao tema "onça" (ex.: âmbar/ocre + verde-floresta) |
| Cenário | supermercado | cenários do nosso roteiro |
| Legendas | palavra por palavra + cor na palavra-chave | adotar o formato, com nossa fonte e cores |
| Grafismos | setas, ondas, raio-X | biblioteca própria de efeitos |
| Formato | 9:16, ~20–60 s | 9:16, 1080×1920, 30 ou 60 fps |

## Próximo passo
Receber o roteiro do projeto e dividir em planos (shot list): cada frase da narração vira 1 a 2 planos
de ~1 s, com câmera, pose do personagem, cenário e palavra-chave colorida definidos por plano.
