# Ateliê Arcano V12.25 — bosque com MegaKit + Ultimate

Implementação sobre a V12.24 no mesmo laboratório `MaroniNeves/projeto`. Os modelos escolhidos foram incorporados à ramificação, sem alterar a hidrologia, o ciclo de 24 minutos por dia, o sistema de solos, neblina, vento e a biblioteca de 100 magias.

## Pacotes que o usuário forneceu

Os arquivos ZIP recebidos nesta conversa são:
- `Stylized Nature MegaKit.undefined-zip.zip`: 68 arquivos FBX com árvores, pedras, gramíneas, arbustos, flores, cogumelos e outros.
- `Ultimate Stylized Nature Pack-zip (1).zip`: 12 FBX de coleções de bétulas, árvores comuns, maples, pinheiros, arbustos, flores, grama e rochas.

O projeto já continha na V12.23 **8 modelos MegaKit Standard**, como glTF + .bin e PNG, em `assets/quaternius/`, extraídos de um espelho público autorizado. Eles continuam intactos.

Para o Ultimate, em vez de colocar grandes arquivos FBX que contêm várias árvores e dezenas de megabytes de texturas juntos, esta versão incorpora **11 malhas FBX individuais equivalentes, do mesmo pacote original Quaternius** a partir do espelho público `walterpalladino/godot-quaternius-ultimate-stylized-nature`. Os arquivos são hospedados no próprio repositório em `assets/ultimate/`.

### Seleção Ultimate importada

- Bétulas: `BirchTree_1.fbx`, `BirchTree_3.fbx`
- Árvore de bordo: `MapleTree_3.fbx`
- Árvore de copa: `NormalTree_2.fbx`
- Pinheiro: `PineTree_2.fbx`
- Arbustos: `Bush_Large_Flowers.fbx`
- Flores: `Flower_1_Clump.fbx`, `Plant_Flowers.fbx`
- Grama: `Grass_Large_Extruded.fbx`
- Rochas: `Rock_3.fbx`, `Rock_5.fbx`

**Sete PNGs locais** de folhas, flores e grama, e pequenas texturas procedurais de troncos/rochas. Isto evita os mapas enormes de casca presentes na distribuição original, diminuindo custo de download e memória no celular.

## Visual do laboratório

- Cena inicial: **MegaKit + Ultimate**, com árvores, flores, samambaias, arbustos, grama e rochas.
- Configurações: campo **Pacote de modelos** permite alternar entre `Combinado`, `Apenas MegaKit` ou `Apenas Ultimate` sem recarregar a simulação.
- O checkbox **Modelos 3D Quaternius** alterna para a vegetação procedural original, como fallback.
- Vegetação distribuída conforme relevo, evitando base das pedras e lagoas; árvores prioritariamente nas bordas.
- Gramado painterly procedural da V12.23 preservado.
- Folhagem continua reagindo ao vento em shader GPU, com rajadas mais fortes no temporal.
- Mudas e vegetação baixa mantêm escala/condição segundo biomassa e saúde do solo.
- Reflexos da água podem incluir árvores e flores, de acordo com as câmeras ambientais existentes.

## Renderização

- `GLTFLoader` para MegaKit Standard; `FBXLoader` para Ultimate, ambos em Three.js 0.152.2.
- Import map mantém a mesma revisão do Three.js para evitar versões diferentes nos módulos.
- FBX importados com gerenciador de texturas: folhas/flores/grama locais; cascas e rochas usam material procedural leve.
- Importação progressiva e proteção contra falhas por modelo; sem impedir abertura do ambiente aquático se um asset não carregar.
- Contagens de objetos por modelo menores no celular; não carregar todos os 68 FBX originais.
- Os arquivos da distribuição original enviados pelo usuário não foram inteiramente republicados: esta é uma **seleção equivalente dos mesmos pacotes**, otimizada para navegação.

## Testes e limitações

- Código JS e import map validados estruturalmente.
- Conferidas as referências dos **11 FBX** e **7 PNGs Ultimate** e a presença do MegaKit anterior no repositório.
- Controle de pacotes e nomes de modelo conferidos com o array da cena.
- A presença dos arquivos no GitHub não equivale à validação gráfica. **Não foi possível abrir um navegador Android/WebGL nesta sessão**, portanto a aparência definitiva, materiais FBX, movimento das folhas e desempenho ainda precisam de inspeção no dispositivo.
- Se `FBXLoader` falhar ou o navegador não renderizar algum FBX, o MegaKit continua aparecendo; se todos falharem, há fallback para a vegetação antiga.

## Créditos/licença

Os modelos MegaKit Standard e Ultimate são obra de **Quaternius** e fornecidos sob licença CC0. Fonte oficial: https://quaternius.com/ . Espelhos usados: `Julien-Turcotte/BongBongAdventure` (MegaKit) e `walterpalladino/godot-quaternius-ultimate-stylized-nature` (Ultimate). Créditos específicos em `assets/quaternius/FONTES-LICENCA.txt` e `assets/ultimate/FONTES-LICENCA.txt`.

## Arquivos principais

- `atelie-arcano-laboratorio/index.html`
- `atelie-arcano-laboratorio/agua.html`
- `atelie-arcano-laboratorio/agua-v1225.js`
- `atelie-arcano-laboratorio/assets/quaternius/`
- `atelie-arcano-laboratorio/assets/ultimate/`
- `atelie-arcano-laboratorio/agua-v1224.js` (versão anterior preservada)
