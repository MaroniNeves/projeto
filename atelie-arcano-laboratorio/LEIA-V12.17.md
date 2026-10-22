# Água V12.17 — clima, nuvens, sol e reflexos do ambiente

A V12.17 foi aplicada no **mesmo laboratório Ateliê Arcano** do repositório `MaroniNeves/projeto`, sem perder o motor V12.16 nem as 100 magias.

## Resultado visual

O céu, a iluminação e a água agora respondem ao clima:

- **Ensolarado:** céu azul, sol visível, nuvens raras e brilho solar mais concentrado sobre as ondas.
- **Parcialmente nublado:** camadas de nuvens claras em movimento, reflexão misturada entre céu e objetos.
- **Nublado:** nuvens densas, céu cinza-azulado e reflexos mais difusos, menos brilho solar.
- **Tempestade:** nuvens escuras, luz solar reduzida e vento elevando as pequenas ondulações e a distorção do reflexo.

A atmosfera não é apenas uma cor de fundo. Uma **esfera 3D interna com shader procedural** apresenta um céu em gradiente, disco solar com halo e massas de nuvens orgânicas animadas. Tudo isso é capturado no ambiente refletido pela água.

## Reflexos das pedras e da vegetação

A água usa o reflexo real da cena desenhada com `THREE.CubeCamera` e `WebGLCubeRenderTarget`. Por isso, os reflexos incorporam **rochas anime, seixos, vegetação, terra, céu, sol e nuvens**. O shader mistura os cubemaps com:

- **Fresnel**: maior reflexão quando observada de lado.
- **Ondulações e vento**: distorcem a direção refletida.
- **Turbidez**: água barrenta reflete menos e conserva sua coloração.
- **Clima**: reflexo mais nítido sob sol, mais cinza/difuso em nublado e menos reflexo especular durante tempestades.
- **Dois pontos de captura no desktop** próximos às bacias para reduzir discrepância espacial da reflexão. No celular, uma única captura otimizada.

Os reflexos são **ambientais e aproximados**, não reflexos planares exatos de todos os objetos em cada poça. O acabamento continua estilizado para anime/fantasia, em vez de fotorrealismo excessivo.

## Clima automático e manual

Em **⚙️ Clima, terra, umidade e reflexos**, o seletor oferece:

1. Automático — acompanha o nível da chuva: sem chuva = sol; chuva leve/moderada = parcialmente nublado; chuva forte = nublado; temporal = tempestade.
2. Ensolarado.
3. Parcialmente nublado.
4. Nublado.
5. Tempestade.

Os modos manuais afetam apenas a atmosfera e as reflexões, **sem mudar artificialmente a quantidade de chuva ou a hidrologia**. O modo automático responde ao controle já existente de intensidade. A opção **Refletir céu, nuvens, pedras e vegetação** desativa a captura dinâmica em dispositivos lentos.

## Desempenho

- Malha da água mantida em 118 × 96 (celular) / 166 × 134 (desktop), com máscara de margem suave e profundidade turquesa/azul.
- Reflexos: 128 px, uma sonda, aproximadamente uma captura a cada 3,2 s no celular; 192 px, duas sondas alternadas a cada 1,6 s no desktop (cada sonda atualiza com menor frequência).
- O céu usa uma textura **procedural por shader**, sem baixar modelos ou imagens externos.
- Ao mudar o clima, invalida-se a captura antiga da segunda sonda.
- O código preserva as gotas, ondas de impacto, reflexos ondulados, pedras parcial ou totalmente submersas, infiltração e evaporação.

## Verificações

- Sintaxe JavaScript validada.
- Seletor de clima, painel de status e botão de reflexão conferidos contra os IDs usados no JS.
- Os quatro climas e o modo automático passaram em um teste de funções, incluindo alteração de cobertura de nuvens, vento, luz, tonalidade e necessidade de recaptura.
- Teste isolado de atualização dos cubemaps confirmou alternância entre as sondas, retorno da visibilidade dos objetos da cena e desativação correta.
- Os shaders GLSL do céu e da água foram inspecionados quanto às entradas e saídas, uniforms, cálculo solar, nuvens e cubemaps.
- O **resultado gráfico final não foi validado visualmente no Android** nesta sessão; depende de WebGL.

## Arquivos

- `atelie-arcano-laboratorio/index.html` — laboratório completo e acesso à Água V12.17
- `atelie-arcano-laboratorio/agua.html` — controles de clima e reflexos
- `atelie-arcano-laboratorio/agua-v1217.js` — nova cena de céu 3D, shaders de nuvens e reflexos ambientais
- `atelie-arcano-laboratorio/agua-v1216.js` — versão anterior preservada
