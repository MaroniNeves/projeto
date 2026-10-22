# Ateliê Arcano V12 — Água 3D melhorada

Quatro modos: chuva com gotas suaves, poças refletivas que surgem, lagoa estilizada com bordas de espuma, temporal na lagoa.

O movimento ocorre em posições tridimensionais reais. As sprites **apenas enriquecem gotas, respingos, espuma e ondulações**, não substituem os modelos ou superfície 3D.

Tudo criado para este laboratório; cinco sprites PNG originais geradas por `scripts/make_textures.py` (NumPy + Pillow). A textura de terreno também é procedural.

Shader aquático original inspirado em técnicas de água estilizada MIT encontradas na pesquisa: https://github.com/boona13/threejs-grass-water-shaders (Copyright (c) 2026 boona13; não incluímos código desse repo).
Referência alternativa MIT: https://github.com/thaslle/stylized-water.

# Teste
`npm install && npm run dev` ou `npm install && npm run build && npm run preview`

A preview compilada em `dist/` deve ser servida por HTTP, não `file://`.
Na versão publicada, a V8 e o Rollshade ficam em páginas separadas, sem duas cenas WebGL simultâneas.

Código original da adaptação e sprites criado para Ateliê Arcano. Dependências third-party Three.js (MIT) e Vite (MIT) — licenças via npm.
Não contém DELUGE, MAELSTROM ou outros sprites comerciais.
