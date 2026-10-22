# Ateliê Arcano — Água V12.10

Esta atualização foi aplicada à aba Água do laboratório original. A V12.9, as demais abas e a biblioteca de magias foram preservadas na ramificação de origem.

## Problemas corrigidos

**1. Chuva batendo num escudo invisível**

Antes, o código comparava a altura das gotas com `soil + depth` mesmo para a água rasa que não era desenhada. Agora `impactHeightAt(x,z)` usa a altura do solo enquanto a lâmina for inferior a `SURFACE_RIPPLE = 0.012`. Somente com água suficiente a gota colide com a altura da poça. A função de respingos utiliza o mesmo limiar para decidir entre terra e água.

**2. Poças e lagoas invisíveis**

A renderização anterior usava um shader semitransparente com triângulos cobrindo todo o terreno. A V12.10 usa `MeshBasicMaterial` opaco, cores por vértice e um índice de triângulos reconstruído conforme a água acumula. O renderizador desenha apenas triângulos molhados e não depende da compilação do antigo shader personalizado, aumentando a compatibilidade com WebGL de celular. A cor se mistura progressivamente do azul-esverdeado para o marrom conforme a turbidez do solo.

**3. Ondas no solo com tamanho errado**

Impactos no solo agora criam pequenas marcas que se extinguem rápido; nas poças, continuam os anéis maiores. As ondas acompanham a altura interpolada da superfície correspondente, com margens secas e pedras bloqueando segmentos dos anéis.

**4. Cena inicial**

A aba Água abre no modo *Poças*, para facilitar a observação da formação. O terreno começa seco, com chuva moderada e time-lapse inicial de 4×; as demais opções continuam acessíveis. A base sólida do terreno foi deslocada para não interferir visualmente nas partes baixas.

## Verificações realizadas

- Sintaxe JavaScript válida e todos os controles HTML encontrados.
- Teste sintético de malha: 0 triângulos molhados sem chuva; surgimento de triângulos com 0,008 de profundidade; índices válidos.
- Teste de colisão: profundidade 0,008 → gota atinge o solo; profundidade 0,022 → gota atinge a água.
- Teste de formação (malha móvel 68 × 56, modo Poças): água visível em aproximadamente **5,8 m² após 5 segundos simulados** e **77,3 m² após 20 segundos simulados**.

Os resultados acima são **testes lógicos e numéricos**, não teste de imagem real em Android. Os valores são ilustrativos e não correspondem à calibração de um modelo hidrológico real.

## Arquivos

- `atelie-arcano-laboratorio/index.html`: menu da biblioteca e acesso à aba Água V12.10
- `atelie-arcano-laboratorio/agua.html`: interface da água
- `atelie-arcano-laboratorio/agua-v1210.js`: nova malha e colisões
- `atelie-arcano-laboratorio/agua-v129.js`: motor anterior mantido

Requer suporte a WebGL e uma conexão para carregar Three.js pelo CDN.
