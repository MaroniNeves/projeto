# Água V12.14 — turquesa, profundidade e margens encharcadas

Atualização feita **dentro do laboratório existente** `MaroniNeves/projeto`, partindo da V12.13. A referência visual fornecida pelo usuário é um cenário de fantasia estilo pixel-art: água turquesa intensa, desenho claro de luz na superfície, centros azul-profundo e margens com uma transição gradual do encharcado para o seco. A adaptação é renderizada em **3D**.

## O que mudou

1. **Cor por profundidade real** (`depth[k]`): azul-turquesa claro `#6deee2` perto da borda, ciano `#25c4d1` na água intermediária, azul `#0873a2` nas partes profundas e sombra azul-marinho `#073e70` nas bacias mais fundas. As cores são interpoladas para transições suaves; a turbidez dos solos soltos continua transformando o tom em marrom, sem mudar a hidrologia.
2. **Reflexos caústicos animados**: malha 3D extra que acompanha exatamente a superfície da poça/lagoa; uma textura procedural periódica do tipo Voronoi, produzida localmente no Canvas, desenha veios irregulares claros com intervalos transparentes. Ela se movimenta suavemente pela água via coordenadas UV; não há brilho excessivo, clarões nem textura externa.
3. **Borda clara com sensação de profundidade**: o recorte geométrico interpolado da V12.13 foi mantido. Os vértices cortados na margem recebem um realce turquesa esbranquiçado, enfraquecido em água barrenta; a altura de cada vértice segue o nível 3D do solo + água.
4. **Faixa de terra encharcada**: até cerca de 0,8 unidade para fora do contorno, a terra seca recebe escurecimento gradual de acordo com a distância da água e com a umidade. O interior continua com a variação normal do solo. O resultado deve parecer: terra seca → terra úmida → margem encharcada escura → lâmina rasa turquesa → água azul profunda.
5. **Espuma conforme a água**: espuma azul-pálida nas partes limpas e detritos bege nas barrentas, ainda apenas em trechos rasos e calmos com opção para ocultar.

## Mantido da V12.13

- Pedras 3D anime mais orgânicas, seixos e musgo discreto.
- Solos comum, solto, argiloso e compactado, com infiltração diferenciada.
- Poças e lagoas localizadas, secagem após a chuva, evaporação, escoamento, turbidez e time-lapse.
- Gotas 3D e ondas de impacto menores na terra e maiores na água.
- Menu do laboratório, botão **Ver cena** e biblioteca original de 100 magias.

## Validação técnica

- O JavaScript passou na verificação de sintaxe.
- O recorte de triângulos testado produziu zero vértices no terreno seco, 18 vértices em uma poça isolada, 96 numa área inteiramente alagada (malha artificial 5×5), todos dentro do limite e sem coordenadas inválidas.
- O padrão de caústicas num teste de Canvas 192×192 teve cerca de 37% dos pixels com alguma transparência de luz e cerca de 6,5% com luz mais forte, deixando o restante do lago sem uma camada branca contínua.
- O cálculo de cor sintético diferenciou explicitamente água rasa, intermediária e profunda; o escurecimento da terra atua somente junto à água e depende da umidade.

**Limites:** a referência visual é 2D/pixel-art, e esta é uma adaptação estilizada em Three.js 3D, não uma cópia pixel a pixel. Não foi possível validar a aparência final diretamente em um Android real nesta sessão. É preciso ter WebGL e conexão com o CDN do Three.js para abrir o laboratório.

## Arquivos

- `atelie-arcano-laboratorio/index.html` — laboratório completo com acesso à Água V12.14
- `atelie-arcano-laboratorio/agua.html` — interface Água V12.14
- `atelie-arcano-laboratorio/agua-v1214.js` — visual turquesa, caústicas, margem encharcada
- `atelie-arcano-laboratorio/agua-v1213.js` — versão anterior preservada
