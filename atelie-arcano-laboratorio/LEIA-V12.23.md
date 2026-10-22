# Ateliê Arcano V12.23 — Floresta painterly de fantasia

Implementada no laboratório existente, preservando a Água V12.22, a atmosfera e as 100 magias. Direção artística: imagens de floresta colorida em 3D estilizado enviadas na conversa, com folhas volumosas, vegetação variada, solo pintado, flores delicadas e rochas naturais.

## Assets 3D reais, gratuitos e incorporados ao repositório

Fonte principal: **Quaternius — Stylized Nature MegaKit Standard**, disponível em:
https://quaternius.com/packs/stylizednaturemegakit.html

Licença: **CC0 1.0 Universal**. Os modelos são gratuitos inclusive para uso comercial. As malhas e os PNGs originais foram copiados para `assets/quaternius/` usando um espelho público do pack, com modificações pontuais e documentadas em `assets/quaternius/FONTES-LICENCA.txt`.

| Modelo | Uso no cenário |
|---|---|
| `CommonTree_1.gltf` | árvores de copa larga |
| `CommonTree_2.gltf` | outra árvore de copa irregular |
| `Pine_2.gltf` | coníferas e variação vertical |
| `Bush_Common_Flowers.gltf` | arbustos com flores |
| `Flower_3_Group.gltf` | pequenas manchas floridas |
| `Grass_Common_Short.gltf` | gramíneas modeladas |
| `Fern_1.gltf` | samambaias |
| `Rock_Medium_2.gltf` | pedras de decoração |

Cada modelo foi copiado como `.gltf` **e** `.bin`, com quatro PNGs compartilhados (`Leaves_NormalTree_C.png`, `Grass.png`, `Flowers.png`, `Leaf_Pine_C.png`). Os objetos .bin são idênticos aos originais. Os mapas muito grandes de troncos/pedras foram substituídos por cor sólida pintada; `Leaves.png` foi remapeada para o PNG de folhas do pacote que conseguimos incorporar.

A distribuição ocorre por relevo (árvores mais nas bordas e morros, pouca vegetação sobre rochas ou depressões de lagoa). Os objetos são instanciados/clonados conforme o tipo, com escalas variadas, sombras limitadas em celulares e animação discreta pelo vento. Gramado extra de lâminas cruzadas: **390 tufos mobile / 920 desktop**, usando `InstancedMesh`.

A vegetação baixa reage ao índice de fertilidade e biomassa do motor de solo vivo. A chuva e a água podem passar entre as plantas; as rochas físicas originais ficam preservadas.

## Solo pintado à mão

Pack de referência: **Voxel Core Lab — Hand-Painted Seamless Terrain Textures**, CC0:
https://voxelcorelab.itch.io/watercolor-terrain-textures

**Importante:** os 16 PNG originais desse pack **NÃO foram baixados/incorporados**, pois o pacote é entregue por um fluxo de download do Itch.io indisponível para cópia automatizada neste contexto. Em vez de atribuir ao pack algo que não está no código, criei um **CanvasTexture aquarelado próprio** de 512×512 com lavagens de cor translúcidas, pinceladas finas e mosaico de cores de solo/vegetação. Isso permite testar o estilo agora sem depender de hotlink ou fingir que o pacote foi importado.

## Compatibilidade e desempenho

- Three.js 0.152.2 preservado.
- Carregador glTF com ES modules e import map apontando para a mesma versão da biblioteca.
- Modelos e texturas da floresta são servidos no mesmo diretório do laboratório, sem conexão a servidores de assets de terceiros durante o jogo. O módulo GLTFLoader e o Three.js continuam vindo do CDN já utilizado no laboratório.
- Caso o import falhe, a página continua com os modelos procedurais da V12.22, sem impedir que a física da água funcione.
- Controle **Floresta 3D Quaternius CC0** nas configurações alterna para a vegetação antiga.
- A V12.22 permanece intacta.

## Testes

- Conferir sintaxe JavaScript e os elementos de controle.
- Conferir 8 arquivos .gltf, 8 arquivos .bin e os quatro PNGs em `assets/quaternius/`.
- Verificar todas as referências `buffers[].uri` e de texturas **usadas** em cada .gltf.
- Não foi realizada inspeção visual WebGL no Android nesta sessão. Cores, densidade e escala podem exigir outra iteração após observar uma captura real.

## Arquivos

- `atelie-arcano-laboratorio/index.html` — menu do laboratório
- `atelie-arcano-laboratorio/agua.html` — interface V12.23 com carregamento glTF e seletor de visual
- `atelie-arcano-laboratorio/agua-v1223.js` — motor completo e floresta painterly
- `atelie-arcano-laboratorio/assets/quaternius/` — modelos e texturas reais com fontes e licença
- `atelie-arcano-laboratorio/agua-v1222.js` — preservação da versão anterior
