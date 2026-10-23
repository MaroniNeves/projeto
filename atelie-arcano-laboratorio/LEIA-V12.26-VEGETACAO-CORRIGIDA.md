# Ateliê Arcano V12.26 — correção de folhagem (Android)

Esta ramificação preserva todo o laboratório e aplica a correção à cena de água/floresta da V12.26.

## Alterações
- Corrige a seleção equivocada que, na qualidade Alta, podia aplicar texturas de casca a materiais de folhagem.
- Reassocia PNGs locais do pacote Ultimate aos materiais de folhas com nomes conhecidos.
- Configura alphaTest, DoubleSide e depthWrite para evitar grandes superfícies de folhas opacas/brancas.
- Usa cores de reserva de folhagem quando uma textura falha, sem alterar as geometrias originais.
- Preserva os ajustes existentes de qualidade, terreno, chuva, vento e água.

## Onde testar
Abra `atelie-arcano-laboratorio/agua.html` pelo Raw.Githack (HTTPS) nesta branch.

## Escopo e limitação
Esta publicação é uma *correção do código do laboratório existente* que usa os modelos já hospedados no repositório. Não é a transferência dos 18 arquivos GLB binários contidos no pacote ZIP de demonstração preparado separadamente. A renderização em Android ainda precisa ser validada visualmente.

Arquivos modificados: `atelie-arcano-laboratorio/agua-v1226.js` e `atelie-arcano-laboratorio/agua.html`.
