# Água V12.12 — margens orgânicas, solos e detritos

Nova versão da aba **💧 Água** no Ateliê Arcano. A V12.11 e as magias foram preservadas.

## Aparência

- As margens agora são recortadas pelo **nível local de água interpolado nas arestas dos triângulos** (*marching triangles*). Não se pintam mais triângulos inteiros só por terem dois cantos molhados.
- Um ruído suave de alta e baixa frequência atua somente no contorno visual; não adiciona água à simulação. A malha tem posições e cores dinâmicas, sem superfícies flutuando.
- Pequenas manchas de **espuma bege e detritos** aparecem em **alguns trechos rasos, calmos e próximos à borda**, sobretudo com sedimentos/vegetação. A opção **Espuma e detritos nas margens** permite desligá-las.
- Poças são azul-esverdeadas ou ficam barrentas com turbidez; as gotas pequenas e os respingos/ondas da V12.11 continuam presentes.

## Física da água e tipos de terra

- Intensidades de precipitação recalibradas para evitar inundação rápida na chuva comum. O modo **Lagoa** começa com chuva moderada e cresce gradualmente; **Temporal** ainda pode provocar alagamento sob chuva intensa.
- **Terra comum (franca):** boa absorção. **Terra solta:** maior permeabilidade e sedimentos. **Argila:** baixa infiltração e mais água acumulada. **Terra compactada:** infiltração ainda menor.
- As bacias/depressões têm fator local de retenção, com infiltração menor onde o material é mais fino; áreas altas seguem absorvendo mais rapidamente.
- Depois de clicar em **Parar chuva**, infiltração, percolação, evaporação e escoamento continuam, fazendo as poças diminuírem e mantendo a terra úmida por algum tempo.
- Time-lapse, modos hidrológicos, pausa, câmera, controle de chuva, pedras 3D e botão **Ver cena** continuam disponíveis.

## Testes realizados (somente simulação numérica/estrutural)

Cenários de chuva por 40 segundos simulados e depois interrupção, malha 68 × 56:

| Solo e modo | % do terreno com água visível aos 40 s | % aos 60 s (20 s sem chuva) | Manchas de detrito perto de margens aos 40 s |
|---|---:|---:|---:|
| Terra comum, Poças | ~2,8% | ~1,1% | 2 |
| Terra comum, Lagoa | ~15,5% | ~5,2% | 60 |
| Terra argilosa, Poças | ~16,3% | ~7,5% | 107 |
| Terra solta, Poças | ~1,4% | ~0,6% | 9 |

O recorte geométrico com valores de teste apresentou: **0 triângulos em terreno seco**, triângulos interpolados para uma única célula molhada e vértices finitos dentro do limite de memória. Houve formação e redução de poças sem alterar a conservação de água no modelo numérico.

**Limitações:** taxas e escalas são ilustrativas, não calibradas para hidrologia real. Os testes acima não substituem validação visual em navegador Android, que não foi executada aqui. O projeto precisa de WebGL e acesso ao CDN do Three.js.

## Arquivos

- `atelie-arcano-laboratorio/index.html` — laboratório original com aba Água V12.12
- `atelie-arcano-laboratorio/agua.html` — interface e controle de espuma
- `atelie-arcano-laboratorio/agua-v1212.js` — relevo, recorte da margem, hidrologia e detritos
- `atelie-arcano-laboratorio/agua-v1211.js` — versão anterior preservada
