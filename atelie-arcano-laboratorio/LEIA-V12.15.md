# Água V12.15 — superfície 3D refinada, ondas e reflexos do cenário

Esta versão foi **aplicada diretamente à aba Água do Ateliê Arcano** no repositório `MaroniNeves/projeto`, partindo da V12.14. O motor V12.14, as pedras anime V12.13 e as magias permanecem preservados.

## Mudança central: visual separado da física

A simulação de chuva, hidrologia, tipos de solo, bacias, infiltração, secagem e escoamento permanece na grade original (`NX × NZ`). A água **não usa mais a malha recortada de triângulos da grade baixa**. Sua renderização é feita por outra malha com:

- **118 × 96 vértices no celular**; **166 × 134 no desktop**.
- Altura do terreno, profundidade, sedimento e fluxo amostrados por **interpolação bilinear** da grade hidrológica.
- Máscara de margem por fragmento `smoothstep` com irregularidade contínua; água não aparece como blocos quadrados nem cobre as áreas secas.
- `ShaderMaterial` com cores turquesa em água rasa, ciano intermediário, azul profundo em bacias, escurecimento por turbidez e beira clara.

## Ondulações e reflexos

- Ondas 3D animadas no shader de vértices; pouca movimentação em água parada, maior amplitude onde o escoamento é mais forte.
- Micro-ondulações modificam as normais da superfície e distorcem o reflexo.
- Reflexo aproximado de **pedras, vegetação, solo e céu da própria cena**, capturado com `THREE.CubeCamera` e `WebGLCubeRenderTarget`; misturado à cor da água pelo efeito **Fresnel**. Não é um espelho planar perfeito: é uma reflexão ambiental local apropriada para o cenário estilizado.
- Reflexos solares especulares suaves e pequenas faixas de brilho baseadas nas ondas, substituindo a antiga textura de caústicas que lembrava quadrados no chão.
- No celular, a captura usa cubemap de **64 px** a cada aproximadamente **5 s**; no desktop **128 px** a cada **2 s**. Há opção **Reflexos 3D do cenário** nas configurações para desligar as capturas e reduzir o custo de GPU.
- Não há dependência de downloads de modelos ou texturas externos adicionais. A página ainda carrega o Three.js pelo CDN já usado no laboratório.

## Conservado

- Pedras e seixos 3D estilizados com musgo, água barrenta, espuma discreta e efeitos de impacto.
- Solo seco → úmido → encharcado junto às margens.
- Poças pequenas na chuva moderada e lagoas nas depressões; as poças continuam secando após **Parar chuva**.
- Modos Chuva, Poças, Lagoa, Temporal, time-lapse, controles recolhíveis e catálogo original de **100 magias**.

## Verificação

- JavaScript da V12.15 validado quanto à sintaxe.
- Os controles de HTML e o link ao script foram checados.
- Num teste isolado de interpolação, uma cena seca gerou profundidade de água igual a zero em toda a malha visual. Após preencher nove células da grade física, **93 amostras da malha mais fina** detectaram profundidade visível, incluindo **35 amostras de transição**; valores de posição, lama e escoamento permaneceram finitos.
- O shader contém máscaras suaves, cálculo Fresnel, normais onduladas, reflexão cúbica e brilho solar. Foi verificada a estrutura do shader, **mas ele não foi compilado/testado num navegador WebGL real**.
- A captura dinâmica pode custar desempenho em celulares fracos: desligue a opção **Reflexos 3D do cenário** caso haja lentidão.

## Arquivos

- `atelie-arcano-laboratorio/index.html` — laboratório completo com botão Água V12.15
- `atelie-arcano-laboratorio/agua.html` — interface e controle de reflexos
- `atelie-arcano-laboratorio/agua-v1215.js` — motor 3D completo da V12.15
- `atelie-arcano-laboratorio/agua-v1214.js` — versão anterior intacta
