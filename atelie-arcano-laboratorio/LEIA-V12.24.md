# Ateliê Arcano V12.24 — neblina pós-chuva e vento nas folhas

Versão implementada no laboratório original, partindo da V12.23. Preserva Quaternius CC0, solos para plantas, água 3D, nuvens e reflexos, chuva regional, ciclo de 24 minutos reais por dia e biblioteca de 100 magias.

## Correção: temporal NÃO significa neblina

V12.23 reduzia artificialmente a distância da névoa do Three.js ao selecionar `storm`, colocando `scene.fog.near=13.5` e `far=31`, o que fazia tempestade parecer enevoada. A V12.24 separa os fenômenos.

**Durante temporal:** céu e nuvens escurecidos, precipitação e rajadas de vento, mas fog panorâmico desligado. Não se reduz visibilidade simplesmente por selecionar Tempestade. Existem neblinas associadas à precipitação na meteorologia, mas optou-se por não simulá-las no temporal, por direção artística.

**Depois da chuva:** a formação de uma camada de neblina depende de condições ambientais mensuradas pelo motor:
- histórico recente de precipitação (memória decrescente durante ~380 s reais);
- solo e vegetação úmidos, amostrados diretamente da grade hidrológica;
- umidade relativa alta perto do solo (aproximada a partir da umidade da atmosfera + umidade do solo);
- pequena diferença entre temperatura da superfície e ponto de orvalho, calculado pelo método Magnus;
- vento fraco: vento forte mistura ar seco e dispersa a camada;
- queda de temperatura ao entardecer/noite/amanhecer, especialmente céu parcialmente limpo;
- deposição localizada em vales/baixadas, com placas suaves transparentes de neblina 3D próximas às bacias.

O efeito aparece **somente quando a chuva para e as condições são favoráveis**, não simplesmente porque o solo está molhado. Luz diurna, secura e ventos fortes dissipam o efeito. Um checkbox no painel pode desligar completamente a neblina.

### Implementação visual

- `scene.fog.near/far` basais em **36/74** para clima normal ou tempestade, sem esconder artificialmente objetos no temporal.
- Neblina pós-chuva tem intensidade `0..0.88`, reduzindo progressivamente a visibilidade somente ao condensar. Sua cor acompanha o céu.
- Sprites procedurais suaves e sem textura externa criam faixas baixas nas depressões, com variação sutil pelo vento.
- A neblina também aparece nas capturas ambientais dos reflexos da água.
- Um painel exibe intensidade, condição/causa, umidade do solo e diferença estimada até o ponto de orvalho.

## Vento que faz as árvores mexerem

A V12.23 inclinava ligeiramente o objeto 3D inteiro, sem deformação de folhas. A V12.24 adiciona código ao **vertex shader** dos materiais de folhagem dos modelos reais do Quaternius.

- Malhas com materiais chamados Leaves, Leaf, Grass, Flowers, Fern ou Plant recebem oscilação dos vértices.
- O shader calcula movimento com direção atmosférica, rajadas, coordenada no mundo, altura relativa do vértice e ondas pequenas de frequência diferente.
- A força aumenta em climas de vento/temporal; folhas ondulam mais do que o tronco (que recebe apenas rotação leve).
- Alterações são feitas pela GPU com `onBeforeCompile`, sem atualizar todos os vértices pela CPU a cada quadro.
- Ramos pequenos/folhas e plantas são animados; modelos de pedra não são afetados.
- O painel mostra a velocidade de vento **como índice relativo do jogo**, direção e estado de rajadas.

O movimento é uma aproximação artística de flexão, não uma simulação física de tecido/elasticidade de galhos. Para uma árvore biologicamente realista, seriam necessários ossos, rig de ramificação e amortecimento específico.

## Testes feitos

- O código JS foi validado por parsing.
- Ensaio isolado do `updateGroundFog` com 4 casos (noite úmida e vento fraco):
  - solo úmido, **sem chuva anterior**: intensidade 0;
  - **depois da chuva**, umidade alta e vento fraco: intensidade ~0.847;
  - **durante temporal**: intensidade 0 e distância visual normal;
  - vento forte ou ar seco: intensidade 0.
- A função foi testada usando substitutos simples para geometria/sprites e cor; não se trata de teste de renderização WebGL.
- Verificados os materiais e o novo callback de shader, a integração com o painel e os arquivos publicados. **Ainda não houve teste visual em Android nesta sessão.**

## Fontes meteorológicas

- US National Weather Service — Radiation Fog: https://www.weather.gov/safety/fog-radiation
- US National Weather Service — Fog Forecasting: https://www.weather.gov/source/zhu/ZHU_Training_Page/fog_stuff/forecasting_fog/FORECASTING_FOG.htm
- Federal Aviation Administration — Aviation Weather, fog after soaking rainfall: https://www.faa.gov/documentlibrary/media/advisory_circular/ac_00-6b.pdf
- Australian Bureau of Meteorology, fog, clear skies and light wind: https://www.bom.gov.au/aviation/data/education/fog.pdf

## Arquivos

- `atelie-arcano-laboratorio/agua-v1224.js`: nova simulação de neblina e deformação das folhas
- `atelie-arcano-laboratorio/agua.html`: indicadores e controle da neblina
- `atelie-arcano-laboratorio/index.html`: laboratório completo apontando para V12.24
- `atelie-arcano-laboratorio/assets/quaternius/`: modelos reais CC0 preservados
- `atelie-arcano-laboratorio/agua-v1223.js`: versão anterior preservada
