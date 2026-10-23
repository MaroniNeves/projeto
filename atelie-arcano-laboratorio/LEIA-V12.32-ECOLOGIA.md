# Ateliê Arcano V12.32 — faixa de rio, estrada, gramas e biota

## Importação dos arquivos enviados
- `Rocks.fbx`: cinco malhas, com textura incorporada reduzida para a web.
- `Grass_Common_Tall.fbx`, `Grass_Common_Short.fbx`, `Grass.fbx`: quatro malhas derivadas de três arquivos, com imagens incorporadas e UVs mantidas.
- Seis OBJ de formigas e três OBJ de minhocas dos ZIPs Poly by Google enviados pelo usuário. Para economia de memória em Android, todos os vértices e índices são compactados em `arcano-assets-v1232.js`; `ecossistema-v1232.js` os recupera usando `DecompressionStream('deflate')`.

## Experimento
A cena inclui um rio de teste com fonte a montante, estrada com uma passagem simples de madeira, touceiras das gramas enviadas, cobertura vegetal que colore o substrato e uma máscara de tráfego que compacta e degrada a grama. O botão de passadas simula tráfego na estrada; marcar Modo pisoteio permite tocar em pontos do terreno para aplicar pisoteio. A recomposição depende de tempo e condições do solo.

## Formigas
Cada colônia tem uma rainha fundadora fértil (assumida já acasalada), operárias com tarefas de forrageio, cuidados da prole, construção, patrulha e exploração, estoque alimentar e coortes de ovos, larvas e pupas. A fundação excepcional de outra colônia exige uma população madura, recursos e condições meteorológicas adequadas, representando de maneira simplificada voos nupciais bem-sucedidos. A distribuição das tarefas não é uma espécie/casta universal; é uma abstração didática.

## Minhocas
Indivíduos adultos hermafroditas reproduzem-se em pares, formando casulos que podem eclodir em juvenis, os quais amadurecem. Umidade intermediária, temperatura favorável, matéria orgânica e oxigênio favorecem atividade e reprodução. Encharcamento e seca prolongada reduzem a adequação do solo. Vermicomposto, excrementos, buracos e restos dos mortos entram no ciclo simplificado de matéria orgânica, nutrientes e permeabilidade.

## Performance e fidelidade
Os animais mantêm tamanho muito pequeno em relação às árvores. Nem toda a população é renderizada; desenham-se amostras por instancing para reduzir custo da GPU. A lupa do painel multiplica o tamanho **apenas visual**, não o tamanho populacional/biológico. Três níveis de qualidade do laboratório são preservados. O motor é uma aproximação educativa; não representa uma espécie exata de formiga ou minhoca nem simula tempos e taxas reais para todas as espécies.

## Conexões técnicas
- `agua-v1226.js` — motor preexistente de chuva, rio, terreno e fertilidade; tonalização de cobertura e pisoteio
- `arcano-assets-v1232.js` — malhas compactadas e imagens incluídas dos ZIPs do usuário
- `ecossistema-v1232.js` — gramado, pedras, estrada, rio, pisoteio, formigas, minhocas e inspeção
- `agua.html` — painel de ecologia e controles; **não substitui** a bancada de testes das árvores

Fontes biológicas de consulta: UC ANR sobre fundação de colônias; University of Minnesota Extension sobre castas de formigas; University of Florida IFAS sobre minhocas; USDA NRCS sobre porosidade, matéria orgânica e galerias das minhocas; Embrapa Agrobiologia sobre umidade e vermicompostagem.

**Direitos dos modelos:** os arquivos Poly by Google foram fornecidos pelo usuário. Revisar os termos de licença e atribuição próprios de cada modelo antes de redistribuir publicamente, pois o nome da coleção por si só não garante licença CC0.

**Estado da validação:** código integrado e verificado estruturalmente. Ainda é necessário testar o WebGL e o carregamento do arquivo compactado no Chrome Android; resultados visuais e taxas biológicas não foram calibrados experimentalmente.
