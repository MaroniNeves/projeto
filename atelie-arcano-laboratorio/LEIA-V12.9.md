# Água V12.9 — ondas do solo, ondas de poças e água barrenta

Integração direta no Ateliê Arcano, preservando as magias, as demais abas e as versões anteriores.

## Impactos diferenciados

- **Terra seca/úmida:** anel pequeno com raio máximo aproximado de 0,20 unidade,
  duração de 0,16 a 0,31 segundo e cor de terra. A onda acompanha a altura do solo.
  Em terra molhada há mais respingos escuros, mas não há grandes ondas artificiais.
- **Poças/lagoas:** anel principal com raio máximo próximo de 1 unidade e segundo
  anel sucessivo, duração de 0,55 a 0,95 segundo; ambos seguem a altura real da água.
  As ondas interrompem-se nas margens secas e não atravessam pedras.
- **Gotículas:** pequenas partículas 3D coloridas pela superfície atingida, em
  arcos curtos; água turva produz gotículas barrentas, água limpa gotículas azuladas.
  A animação da chuva V12.8 (gotas delicadas e sem brilho excessivo) foi preservada.

## Terra solta e lama

Novo tipo de terreno **Terra solta (água lamacenta)**, além de franca, argilosa e
compactada. O motor agora mantém um campo de turbidez da água em cada célula. A
chuva sobre solo exposto ou solto mobiliza sedimentos ao longo do tempo, tornando
a água gradualmente mais castanha. Quando a agitação diminui, o sedimento decanta.
A coloração das poças e das ondas utiliza a mesma turbidez, evitando uma troca
instantânea de cor.

As intensidades máximas de turbidez visual dependem do solo:
terra comum 32%, terra solta 100%, argila 78%, compactada 14%.

## Verificação e limites

O modelo usa parâmetros ilustrativos, não calibrados para um solo real.
A água mantém infiltração, escoamento, retenção, evapotranspiração, time-lapse,
controle de intensidade e opção **Ver cena**.

O arquivo de entrada é `atelie-arcano-laboratorio/agua.html`, que carrega
`agua-v129.js`. É necessário ter conexão para o CDN do Three.js e suporte WebGL.
A validação de aspecto final em Android depende de testar no navegador do dispositivo.
