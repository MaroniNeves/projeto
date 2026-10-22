# Água V12.8 — poças mais visíveis e chuva equilibrada

Atualização integrada ao **Ateliê Arcano / laboratório**. Para abrir, entre em
`index.html` e toque na aba **💧 Água V12.8**, ou abra `agua.html`.

## Visual

- **Poças menos transparentes**: a água recebe tons azul-esverdeados definidos,
  com opacidade de aproximadamente 95% a 98,5% em superfícies formadas.
  Uma transição suave permanece apenas junto às margens rasas.
- **Ondulações da chuva**: cada gota que atinge uma poça pode produzir dois
  anéis sucessivos, suavizados nas bordas e limitados às áreas molhadas.
  Os vértices são posicionados sobre a altura interpolada da água e do terreno,
  sem discos planos flutuando no cenário.
- **Gotas menores e sem excesso de brilho**: trilhas 3D mais curtas e finas,
  halo aproximadamente metade do tamanho anterior, tonalidade mais suave e
  menor opacidade. A opção de gotas discretas continua disponível.

## O que não foi alterado

O sistema de chuva, time-lapse, bacias, infiltração, escoamento, retenção,
evapotranspiração, tipos de terra e botão **Ver cena** continuam funcionando.
As bibliotecas de magias e versões anteriores estão preservadas.

## Verificações

- Sintaxe de `agua-v128.js` verificada.
- Links, controles e IDs de `agua.html` conferidos.
- Geometria dos dois anéis testada: 198 vértices, 256 triângulos e índices válidos.
- O teste gráfico em um navegador Android ainda depende de execução no dispositivo;
  a disponibilidade do WebGL e do CDN Three.js é necessária.

A implementação é uma visualização estilizada de hidrologia, não uma simulação
científica calibrada.
