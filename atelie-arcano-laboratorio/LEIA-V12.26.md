# Ateliê Arcano — Bosque V12.26: modelos ancorados e gráficos configuráveis

Alteração aplicada ao laboratório **existente**, a partir da V12.25 (MegaKit + Ultimate), sem alterar o subsistema da água, ciclo de 24 minutos reais, 11 solos, nuvens, chuva, neblina pós-chuva, vento nas folhas e as 100 magias.

## 1. Correção de modelos que flutuavam

Problemas diagnosticados:

1. Os modelos FBX e glTF usam pivôs diferentes; na V12.25 sua base era calculada a partir do mínimo vertical de uma caixa delimitadora, mas a posição horizontal do conteúdo nem sempre coincidia com a origem.
2. Gramíneas, arbustos e flores tinham o tamanho alterado pela biomassa do solo, mas sua coordenada Y **não** era reajustada. Isso causava flutuação ou enterramento conforme cresciam.
3. A oscilação aplicava rotação ao objeto inteiro, inclusive às raízes e bases das pedras/árvores em certos casos, deslocando o apoio.

Correções da V12.26:

- Raycast vertical **na geometria real do terreno** em cada ponto de colocação. A função `elevation()` é preservada apenas como fallback.
- O modelo é primeiro escalado e rotacionado; depois, a caixa real de todo o conteúdo determina centro horizontal e a altura do vértice inferior. Assim, a origem deslocada de um FBX não desloca o modelo visual do ponto escolhido.
- Rochas, árvores e plantas recebem um afundamento discreto de base no solo (aprox. 0,11, 0,065 e 0,028 unidades de jogo).
- Cada instância guarda `bottomOffset`, `groundY` e `bury`. Ao mudar a escala vegetal: `position.y=groundY-bottomOffset*growthFactor-bury`. Não existe mais a escala independente do ponto de apoio.
- Atualização da ancoragem quando a erosão altera a superfície.
- O vento continua animando as **folhas no shader**; removi rotação de toda a raiz da árvore, que fazia o tronco parecer flutuar.

## 2. Seletor de qualidade gráfica

Controle diretamente visível na barra de opções, com **troca em tempo real sem reiniciar a água**:

| Modo | Resolução limite (DPR) | Sombras | Quantidade de objetos decorativos | Gramado extra | Reflexos |
|---|---|---|---|---|---|
| **Alta — original** (padrão, inclusive celular) | celular 2.0; PC 2.4 | celular 1024, PC 2048 | 100% | 100% | Sim |
| **Equilibrada** | celular 1.35; PC 1.65 | celular 512, PC 1024 | 78% | 70% | Sim |
| **Econômica** | celular 0.95; PC 1.1 | Desligadas | 40% | 32% | Não |

Os percentuais representam amostragem de densidade de **cópias decorativas**, não redução de polígonos, contorno ou número de detalhes das malhas originais: quem escolher Alta vê todas as instâncias. Outros objetos e a física permanecem iguais.

- Na qualidade **Alta**, MSAA fica habilitado no renderizador, usa-se resolução elevada, sombras de boa resolução e mapas difusos originais do Quaternius para troncos/rochas, onde disponíveis.
- **Folhas e flores já usam os PNG originais locais** e foram preservadas, inclusive nos modos reduzidos; anisotropia é adaptada ao aparelho.
- Os grandes mapas de casca do Ultimate (15–23 MB cada) e o mapa de casca/rocha do MegaKit são **carregados sob demanda dos espelhos públicos dos pacotes somente em Alta**. O projeto tem textura de fallback procedural local de 512 px caso falhem.
- Equilibrada/Econômica usam pinturas procedurais de 512/128 px para troncos e pedras, preservando geometria original.
- Sombras, pixel ratio, densidade do gramado, visibilidade dos modelos e reflexos se ajustam imediatamente sem reiniciar o motor da água ou das plantas.
- A pessoa pode observar um **indicador de FPS aproximado** e mudar conforme o desempenho; nenhuma redução automática é imposta à opção Alta.
- Para economizar memória, mapas difusos originais remotos não estão duplicados dentro do repositório. Uma conexão à internet é necessária em Alta para esses mapas grandes; se não forem carregados, o fallback mantém o jogo.

**Importante:** a opção Alta pode consumir memória e largura de banda significativamente maiores que o nível anterior, especialmente em celulares. Isso foi deixado sob controle do usuário, como solicitado.

## 3. Testes realizados

- V12.26 validada sintaticamente com parser de JavaScript.
- Ensaio de posicionamento isolado com terreno inclinado e modelo de origem deslocada: 4 árvores foram posicionadas com a base exatamente em `groundY-bury`; após fator de crescimento 0,63, **4/4** permaneceram apoiadas no mesmo ponto.
- A opção Econômica não remove texturas originais das folhas e não altera a simulação física.
- Análise dos IDs no HTML, arquivos referenciados, conservação da V12.25 e catálogo de magias.
- **Não foi executado um renderizador WebGL real no Android nesta sessão**; os resultados gráficos de cada aparelho precisam ser confirmados visualmente.

## Arquivos

- `atelie-arcano-laboratorio/index.html` — acesso V12.26
- `atelie-arcano-laboratorio/agua.html` — seletor Alta/Equilibrada/Econômica
- `atelie-arcano-laboratorio/agua-v1226.js` — correções de base, materiais e qualidades
- `atelie-arcano-laboratorio/agua-v1225.js` — versão anterior preservada
- `atelie-arcano-laboratorio/assets/ultimate/` e `assets/quaternius/` — modelos originais incorporados na etapa anterior

## Referências de materiais

- MegaKit Standard: https://quaternius.com/packs/stylizednaturemegakit.html
- Espelho MegaKit: https://github.com/Julien-Turcotte/BongBongAdventure
- Espelho Ultimate: https://github.com/walterpalladino/godot-quaternius-ultimate-stylized-nature

Licença dos assets Quaternius: CC0, conforme avisos já incorporados na V12.25.
