# Ateliê Arcano — Água V12.18: atmosfera viva e dia de 24 minutos

Implementação diretamente no laboratório já existente (`MaroniNeves/projeto`). Parte da V12.17: as rochas, a água 3D, a evaporação, a infiltração, os reflexos ambientais, a vegetação e a biblioteca de 100 magias foram preservados.

## Referência em vídeo

Vídeo enviado na conversa: `giroka_dev_20261022_091552346.mp4`, duração aproximada de **2 min 27 s**. Pela explicação visual/legendas, o autor apresenta:

- Calor, umidade e movimento do ar ("empurrão"/vento) como ingredientes da chuva.
- Mapa dividido em zonas com atualização de temperatura, umidade e vento; formação de nuvens conforme as condições.
- Sol com trajetória e energia associada às estações.
- Vegetação que transpira, terra que alterna entre seca e úmida e floresta influenciando a atmosfera.
- Frentes frias que mudam o comportamento climático.
- Reconhecimento explícito de imperfeições: parte dos efeitos ainda é um artifício, não uma simulação atmosférica rigorosa.

A V12.18 implementa os mesmos *princípios causais*, mas utiliza modelos e materiais próprios em Three.js. Não reutiliza assets nem código do criador do vídeo.

## Dia e noite

- Um **dia completo = 1.440 segundos reais = 24 minutos** (independente do time-lapse hidrológico).
- Acompanhamento da hora do jogo em relógio 24 h e barra de progresso solar.
- Nascer do sol, meio-dia, pôr do sol, crepúsculo e noite; sol móvel, céu com alteração gradual da iluminação, lua e pequenas estrelas quando as nuvens deixam.
- Estaçōes simplificadas em 24 dias de jogo: variação progressiva da altura solar, duração da luz e temperatura. **Um ano simulado não é realista**, é apenas um ciclo visual de jogo.
- Pausar a simulação pausa também o relógio do dia.

## Atmosfera regional

A simulação atmosférica tem sua própria grade de **7 × 6 zonas no celular**, **9 × 8 no desktop**. A cada aproximadamente 0,55 segundos reais:

1. **Energia solar:** aquece o ar conforme hora, estação, relevo e vegetação. Noite e frente fria diminuem a temperatura.
2. **Pressão:** varia espacialmente e ao longo do dia; diferenças de pressão conduzem o vento. Uma frente fria atravessa a área periodicamente.
3. **Umidade:** recebe contribuição da evapotranspiração computada no motor hidrológico e da cobertura vegetal, sendo transportada pelo vento.
4. **Condensação:** resfriamento, umidade, ar ascendente no relevo e frentes favorecem formação de nuvens.
5. **Precipitação:** em zonas com suficiente nuvem e umidade, a atmosfera produz chuva. Uma parcela da umidade e das nuvens é removida quando chove, permitindo dissipação e ciclos.
6. **Acoplamento ao solo:** a intensidade regional é interpolada para cada célula hidrológica, onde pode ser interceptada pela vegetação, absorvida, escoar até uma bacia ou evaporar depois.
7. **Visual:** as gotas aparecem preferencialmente nas zonas onde de fato está chovendo e derivam levemente com o vento. Clima, nuvens, sol e reflexo sobre a água respondem ao estado atmosférico.

Os tipos de solo, as pedras parcialmente submersas, a cor por profundidade, ondulações, reflexos de objetos, espuma e os controles antigos continuam existindo.

## Controles

- **Chuva gerada por temperatura, umidade, pressão e vento** — ligada por padrão.
- O seletor **Intensidade** funciona como limite de chuva na física regional (e permite nível zero/Parar chuva). Se o clima físico for desligado, retorna à chuva manual da V12.17.
- **Clima automático** lê os campos de nuvem e chuva. Clima manual (sol/nublado/tempestade) muda apenas a aparência da atmosfera, não cria água do nada.
- **Time-lapse** acelera os processos de água do solo e a animação correspondente, mas **não acelera** o dia de 24 minutos.
- O painel mostra hora, dia, estação, temperatura média (°C), umidade (%), pressão (hPa), vento, cobertura de nuvens e índice relativo de chuva.

## Verificações

- Uma execução isolada da atmosfera durante **1.440 segundos** confirmou alternância de dia/noite e chuva regional, períodos secos e chuvosos, formação e dissipação de nuvens, valores finitos e limites de precipitação.
- Na configuração de poças, ao longo do dia houve regiões chuvosas e outras secas, com diferenças entre manhã, tarde e noite. O modo temporal inicializou com maior umidade e nuvens.
- Teste hidrológico acoplado por 240 segundos reais e física em 4× confirmou escoamento, infiltração e quase conservação do balanço de água (erro numérico de ordem 0,00001 em volumes do simulador), sem estados negativos.
- Sintaxe do motor JavaScript, arquivos e IDs do HTML são conferidos antes da publicação.

### Limitações importantes

Este modelo é uma **simulação física simplificada voltada para jogos**, não um simulador meteorológico calibrado. A grade é pequena, as variáveis de água e vento usam escalas ilustrativas, as frentes são aproximadas, e **o transporte de massa/energia da atmosfera não é conservativo no sentido científico rigoroso**. A conservação foi verificada somente para o subsistema de água terrestre. As temperaturas em °C e pressão em hPa são referências ilustrativas, não previsões climáticas reais. A reprodução visual final no Android requer validação em WebGL.

## Arquivos

- `atelie-arcano-laboratorio/index.html` — menu do laboratório com Atmosfera + Água V12.18
- `atelie-arcano-laboratorio/agua.html` — painel de clima físico e relógio de dia/noite
- `atelie-arcano-laboratorio/agua-v1218.js` — motor atmosférico e hidrológico completo
- `atelie-arcano-laboratorio/agua-v1217.js` — versão anterior preservada
