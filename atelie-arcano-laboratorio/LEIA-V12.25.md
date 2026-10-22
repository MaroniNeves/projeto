# Ateliê Arcano V12.25 — biblioteca de natureza dos dois pacotes

Versão feita no laboratório existente em `MaroniNeves/projeto`, partindo da V12.24. Preserva: água 3D turquesa com reflexos, neblina pós-chuva, nuvens, gotas, 24 minutos por dia, solos, nutrientes, plantas e as 100 magias.

## O que chegou do usuário

- `Stylized Nature MegaKit.undefined-zip.zip` — **68 FBX distintos** (aprox. 88 MB compactados), com árvores, pinheiros, arbustos, flores, cogumelos, gramíneas, pedras, caminhos, folhas e raízes.
- `Ultimate Stylized Nature Pack-zip (1).zip` — **12 FBX** (aprox. 25 MB compactados), com conjuntos de bétulas, árvores comuns, áceres, pinheiros, palmeiras, pedras, flores, arbustos e grama.

Ambos são pacotes Quaternius. Os modelos não foram confundidos com objetos feitos apenas com primitivas geométricas.

## Parte disponível imediatamente no navegador (Github / RawGitHack)

A biblioteca visual passou de 8 para **23 modelos diferentes do MegaKit**. Os 15 modelos extras foram importados como `.gltf` + `.bin` equivalentes aos FBX enviados, provenientes de uma versão pública do mesmo MegaKit; o repositório já contém as quatro imagens de material necessárias.

**Árvores e pinheiros (9 variantes):** `CommonTree_1`, `CommonTree_2`, `CommonTree_3`, `CommonTree_4`, `CommonTree_5`, `Pine_1`, `Pine_2`, `Pine_3`, `Pine_4`.

**Arbustos e flores (4 variantes):** `Bush_Common`, `Bush_Common_Flowers`, `Flower_3_Group`, `Flower_4_Group`.

**Capim, ervas e folhas baixas (7 variantes):** `Grass_Common_Short`, `Grass_Common_Tall`, `Grass_Wispy_Short`, `Grass_Wispy_Tall`, `Fern_1`, `Clover_1`, `Plant_1`.

**Pedras (3 variantes):** `Rock_Medium_1`, `Rock_Medium_2`, `Rock_Medium_3`.

A distribuição considera terreno, depressões e perfis de solo, com uma densidade menor no celular. A água e as pedras de colisão originais seguem intactas. A deformação de folhas pelo vento introduzida na V12.24 é aplicada aos novos materiais foliares. O carregamento usa grupos paralelos limitados a 3 no celular / 5 no desktop.

## Parte opcional — Ultimate Stylized Nature Pack enviado pelo usuário

Os **12 FBX originais, sem alterações nas malhas**, foram empacotados separadamente em `atelie_arcano_v1225_modelos_ultimate.zip` para uso na versão local; o arquivo ZIP é entregue na conversa com a resposta. O ZIP possui `assets/ultimate/manifest.json`, reconhecido automaticamente pelo código V12.25.

**Atenção:** o serviço de escrita do GitHub nesta sessão aceita texto e base64, mas não recebe diretamente arquivos do container do usuário. Portanto, **os 12 FBX Ultimate não estão publicados no GitHub**. Não afirmar que o segundo pacote aparece no link público antes de instalá-lo. A versão online funciona com os 23 modelos do MegaKit; quando a pasta Ultimate é instalada, o carregamento FBX do jogo é ativado. Este complemento é opcional e nunca impede a água de funcionar.

**Instalação do Ultimate na cópia local:**
1. Baixar o branch `arcano-v12-25-biblioteca-natureza-dupla` do repositório.
2. Extrair o ZIP complementar na raiz do projeto. Deve criar `atelie-arcano-laboratorio/assets/ultimate/manifest.json` e 12 FBX.
3. Servir os arquivos por HTTP (não usar URLs file://). Exemplo: `python -m http.server 8000` executado na pasta da raiz.
4. Abrir `http://localhost:8000/atelie-arcano-laboratorio/agua.html` e manter selecionado **Ultimate Stylized Nature original**.
5. O jogo carrega até 8 conjuntos desktop / 4 mobile por segurança, priorizando árvores comuns, bétulas, áceres, flores, pinheiros, grama e rochas. Pode ser ampliado depois.
6. Como os ZIPs enviados contêm FBX sem PNG externo, o carregador usa cores estilizadas de fallback para materiais de folhas, flores, casca e pedra quando faltarem texturas. Caso o FBX não seja compatível com o navegador, o MegaKit permanece como fallback.

## Controles

- **Floresta 3D Quaternius — MegaKit:** alterna entre o novo cenário e a vegetação procedural antiga.
- **Ultimate Stylized Nature original:** alterna os modelos extras quando os FBX e seu manifesto estiverem presentes.
- O painel informa os modelos MegaKit carregados e o estado do Ultimate.
- Solos, adubação, vento, chuva, neblina e água continuam com os mesmos controles.

## Direitos de uso

Fontes:
- https://quaternius.com/packs/stylizednaturemegakit.html — página de pack indica CC0.
- https://quaternius.com/packs/ultimatestylizednature.html — página do Ultimate indica CC0.
- https://quaternius.com/license.html — licença geral Quaternius Asset License (QAL) v1.0, revisada em 28 de agosto de 2026. Permite usar os modelos em jogos, mas restringe redistribuição de arquivos isolados; a seção de não retroatividade deve ser considerada para aquisições anteriores.

Por prudência, **não publique, revenda ou compartilhe como asset pack independente** o ZIP complementar, e mantenha os modelos como elementos do próprio jogo.

## Testes e limitações

- Sintaxe JS e IDs de controles conferidos no branch após alterações.
- Os 15 glTF novos referenciam apenas quatro PNGs existentes (todos verificados) ou materiais sem imagem; os `.bin` foram copiados do espelho do MegaKit e tiveram o SHA validado.
- A lista de 23 modelos confere com o diretório incorporado ao projeto.
- O pacote ZIP Ultimate tem integridade verificada e contém os 12 FBX originais mais manifesto.
- **A renderização final no Android e a importação FBX completa no navegador ainda não foram testadas graficamente nesta sessão.** Valores de escala e cores podem demandar pequenos ajustes.

## Arquivos

- `atelie-arcano-laboratorio/index.html` — laboratório completo V12.25
- `atelie-arcano-laboratorio/agua.html` — demonstração de floresta + água V12.25
- `atelie-arcano-laboratorio/agua-v1225.js` — motor de jogo completo
- `atelie-arcano-laboratorio/assets/quaternius/` — 23 modelos MegaKit online
- `atelie_arcano_v1225_modelos_ultimate.zip` — complemento local com FBX Ultimate enviado na conversa
