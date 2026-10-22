# Ateliê Arcano — Água V12.19 · Nuvens orgânicas em estilo anime

Versão aplicada **diretamente ao laboratório existente** em `MaroniNeves/projeto`, a partir da V12.18. Os arquivos antigos e o catálogo de 100 magias foram mantidos.

## Problema corrigido

O céu V12.18 usava um campo simples de ruído 2D com limiar de densidade, o que dava às nuvens um aspecto de manchas ou recortes aleatórios. A V12.19 substitui **o fragment shader do céu** por um modelo visual mais orgânico e contido, sem baixar fotografias ou modelos externos.

## Novo visual das nuvens

- **Cúmulos sobrepostos:** pequenos corpos arredondados com lobos secundários formam massas de nuvem mais reconhecíveis, em vez de ilhas arbitrárias do mesmo ruído.
- **Bordas suaves:** densidade contínua e gradiente gradual de opacidade deixam o céu visível nas bordas. Sem transparência cortada em um único limiar duro.
- **Deformação orgânica (domain warp):** dois campos de ruído desviam a amostragem para quebrar círculos artificiais e dar irregularidade natural.
- **Volume aparente:** iluminação varia entre miolo, topo e áreas voltadas ao sol; o interior fica ligeiramente mais sombreado.
- **Luz lateral:** um realce discreto nas bordas iluminadas aparece quando a nuvem está próxima da direção do sol, sem contorno branco espalhafatoso.
- **Camada distante:** véus muito leves e dispersos criam profundidade no céu. Em dias nublados e tempestades, uma camada mais densa complementa os cúmulos.
- **Movimento por vento:** as nuvens próximas e distantes se deslocam em direções/velocidades diferentes, alimentadas pelo vento do sistema atmosférico.
- **Noite preservada:** lua e estrelas continuam aparecendo atrás das nuvens, e céu/nuvens ficam mais escuros.
- **Reflexos preservados:** a cúpula é capturada pelas câmeras ambientais V12.17, de modo que suas nuvens mais orgânicas também participam dos reflexos da água.

## Distribuição calibrada

Uma amostragem computacional simplificada do modelo de opacidade, feita em 1.100 direções do céu, mostrou aproximadamente as seguintes proporções de amostras com opacidade de nuvem acima de 25%:

| Clima visual | Amostras com nuvens perceptíveis |
|---|---:|
| Ensolarado (13% de cobertura-alvo no sistema) | ~25% |
| Parcialmente nublado (43%) | ~33% |
| Nublado (82%) | ~53% |
| Temporal (98%) | ~86% |

Essa métrica representa **opacidade visual amostrada**, não a cobertura atmosférica física real nem uma medição de pixels renderizados. A relação crescente foi validada antes de publicar.

## Mantido da V12.18

- Ciclo completo de dia e noite com **24 minutos reais por dia**.
- Temperatura, umidade, pressão, vento, frentes frias aproximadas, transpiração, condensação e chuva regional.
- Nuvens controladas pela grade atmosférica e possibilidade de escolher clima manual.
- Água 3D com cor por profundidade, ondas, reflexo do céu, pedras e vegetação, margens encharcadas, espuma e sedimentos.
- Pedras anime que podem ficar submersas, solos com infiltração diferenciada e secagem após chuva.
- Time-lapse, controles e biblioteca de 100 magias.

## Limites e testes

- JavaScript validado quanto à sintaxe e à compatibilidade de controles.
- As características da distribuição de opacidade foram testadas numericamente, e a geometria/hidrologia existentes não foram alteradas pela V12.19.
- O novo shader foi inspecionado quanto aos uniforms, laços e funções do GLSL. **Não houve validação final de aparência nem compilação do shader em navegador WebGL/Android nesta sessão.**
- A cúpula ainda é uma representação 2.5D de nuvens com relevo simulado por shader, não nuvens volumétricas ray-marched fisicamente exatas.

## Arquivos

- `atelie-arcano-laboratorio/index.html` — laboratório completo atualizado para V12.19
- `atelie-arcano-laboratorio/agua.html` — aba Água V12.19
- `atelie-arcano-laboratorio/agua-v1219.js` — nuvens orgânicas integradas ao código completo
- `atelie-arcano-laboratorio/agua-v1218.js` — versão anterior preservada
