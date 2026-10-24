# Correção de cascas das árvores — 24/10/2026

Os GLTFs locais tinham materiais Bark com cor sólida, sem baseColorTexture.
Nos FBXs, o remapeamento de caminhos não garantia uma imagem no material;
o refinamento posterior ainda dependia de PNGs externos de 15 a 23 MB.

A correção associa quatro mapas locais aos materiais identificados como madeira
nas 12 espécies, antes de registrar os materiais molhados e criar as instâncias.
Usa cache por arquivo e orientação UV (GLTF flipY=false; FBX flipY=true),
cor branca para não multiplicar a casca pela antiga cor sólida e acabamento fosco.
As trocas de qualidade conservam esses mapas locais. Se o mapa local falhar,
o material usa a casca painterly de reserva já existente no projeto.

## Origem das imagens

Quaternius Ultimate Stylized Nature, CC0, mesmo pacote e espelho já referenciados
pelo laboratório em assets/ultimate/FONTES-LICENCA.txt:
https://quaternius.com/packs/ultimatestylizednature.html

Espelho, revisão d36a06461359a8e60039e17b95d50bedc96c1edc:
https://github.com/walterpalladino/godot-quaternius-ultimate-stylized-nature/tree/d36a06461359a8e60039e17b95d50bedc96c1edc/ultimate-stylized-nature/sources/Textures

BirchTree_Bark, MapleTree_Bark, NormalTree_Bark e PineTree_Bark foram reduzidas
proporcionalmente a 1024 px e convertidas de PNG para JPEG (qualidade 88).
Total: 384.980 bytes. CommonTree reutiliza NormalTree; Pine reutiliza PineTree.
As imagens de folhas, flores e grama não foram modificadas.

## Validação

- Sintaxe JavaScript e git diff --check.
- Chrome: carregamento real das 12 árvores por GLTFLoader e FBXLoader.
- Todos os 12 materiais de madeira possuem mapas locais de 1024 px,
  orientação UV correta e metalness=0.
- Econômica → Equilibrada → Alta → Econômica: os mapas de madeira e os mapas
  e recortes alpha das folhas mantiveram identidade.
- Teste com raw.githubusercontent.com bloqueado: cascas locais carregam.
- Nenhum erro JavaScript de página; inspeção visual da cena e entrada no jogo.
  Nesse teste sem acesso aos assets remotos, o personagem usou o fallback existente.
- Nenhuma alteração de densidade, posicionamento, física, clima ou lógica do jogo.

Limitação preexistente observada: Rock_3.fbx e Rock_5.fbx são rejeitados pelo
FBXLoader (não encontra a versão do arquivo). O reparo de troncos não altera pedras.

Integra a atualização concorrente V12.57 (ff56e6c), conservando a classificação
de materiais genéricos, o gerador de casca painterly e os rótulos da versão.
