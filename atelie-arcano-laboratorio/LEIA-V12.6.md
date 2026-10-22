# Ateliê Arcano — Água V12.6: ciclo hidrológico

Esta versão é integrada à aba **Água** do laboratório. A biblioteca original de magias
foi preservada. A implementação está em `agua-v126.js`, ligada por `agua.html`.

## Como testar

1. Abra `index.html` e escolha **💧 Água V12.6** (ou abra `agua.html`).
2. Selecione **Poças**, **Lagoa** ou **Temporal**. O cenário começa praticamente seco
   para mostrar a formação das poças e o enchimento da lagoa.
3. Use **Time-lapse** em 1×, 4×, 16× ou 64×, e **Nível da chuva** de 0 a 5.
4. Escolha o processo **Combinado**, **Infiltração**, **Escoamento superficial** ou
   **Retenção / evaporação**. Cada modo realça uma transferência, mantendo as demais
   parcelas físicas relevantes da simulação.
5. Em **Solo, infiltração e aparência das gotas**, ative/desative a infiltração,
   a cor de terra molhada e escolha gotas destacadas ou discretas.
6. Em chuva zero, a água deixa de ser adicionada: a superfície pode escoar,
   infiltrar e evaporar. O solo também perde água por evapotranspiração e percolação.
7. Arraste para girar, use pinça para zoom, toque no terreno para adicionar água.

## Componentes do modelo

- `depth`: lâmina de água superficial, representada por uma malha 3D contínua.
- `soilMoisture` e `soilCapacity`: água nos poros da camada superficial e saturação.
- `deepWater`: reserva simplificada que recebe percolação descendente.
- `canopy`: armazenamento da chuva interceptada por vegetação/palhada.
- `permeability` e `cover`: infiltração variável e cobertura vegetal local.
- `stats`: precipitação, infiltração, evaporação, transpiração e saída pela borda.
- Pedras 3D atuam como barreiras impermeáveis ao fluxo lateral na malha.
- Gotas 3D e respingos **visualizam** a precipitação calculada no solo, sem
  acrescentar o volume uma segunda vez.

## Limitações

Simulação **didática e estilizada**, não um modelo hidrológico calibrado. Taxas foram
escolhidas para que poças, evaporação, saturação e escoamento fiquem visíveis em
tempos curtos, especialmente com time-lapse. Não representa transporte de sedimentos,
erosão, lençóis freáticos tridimensionais nem dinâmica real de aquíferos.

A aba V12.4 segue acessível em `agua-v124.html`. O motor V12.5 permanece guardado
em `agua-v125.js`.

Requer WebGL e conexão para carregar Three.js r152 pelo CDN.
