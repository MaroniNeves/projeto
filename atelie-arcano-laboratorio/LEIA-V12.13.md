# Ateliê Arcano — Água V12.13 · Pedras orgânicas em estilo anime

Versão integrada ao **mesmo laboratório existente**: `MaroniNeves/projeto`, aba **💧 Água**. Não é um projeto novo nem um ZIP separado.

## Pedras e cenário

As pedras antigas eram baseadas em `DodecahedronGeometry(1,0)`, resultando em facetas e silhuetas excessivamente duras. A V12.13 substitui o bloco por **sete modelos procedurais 3D** derivados de icosaedros subdivididos e deformados suavemente por funções contínuas, com:

- **Silhuetas mais naturais**: rochas assimétricas, achatadas na base e apoiadas no terreno.
- **Acabamento anime discreto**: `MeshToonMaterial` com gradação de cor nos vértices e outline fino, sem brilho excessivo ou cores intensas.
- **Tons envelhecidos de pedra**: cinzas, verdes e marrons pouco saturados, com sombra e iluminação da cena.
- **Musgo sutil**: pequenas manchas verde-acinzentadas, predominantemente nos planos superiores, sem cobrir todas as pedras.
- **Agrupamentos variados**: alguns conjuntos têm rocha principal e outra menor, mas sem se transformarem em cubos empilhados.
- **Seixos pequenos**: distribuídos próximo às rochas maiores em um `InstancedMesh`, reduzindo o custo em celulares.
- **Reuso de geometrias** e tamanhos fixos de grupos para limitar consumo de memória.

Os modelos são gerados no JavaScript do próprio projeto, sem dependência de baixar arquivos GLB/FBX de terceiros, licenças externas ou possíveis bloqueios de rede.

## Preservado da Água V12.12

- Água acumulada nas depressões, margens interpoladas e irregulares.
- Espuma e detritos opcionais, água barrenta, respingos e gotas menores.
- Tipos de solo, infiltração, evaporação, escoamento e secagem após a chuva.
- Time-lapse, controles recolhíveis, câmera e botão **Parar chuva**.
- Todas as magias e demais abas existentes.

## Arquivos

- `atelie-arcano-laboratorio/index.html`: menu principal atualizado para Água V12.13.
- `atelie-arcano-laboratorio/agua.html`: página Água ligada ao novo script.
- `atelie-arcano-laboratorio/agua-v1213.js`: cenário 3D com pedras orgânicas e todo o motor de água existente.
- `atelie-arcano-laboratorio/agua-v1212.js`: versão anterior preservada.

## Validação

- JavaScript completo testado quanto à sintaxe.
- Modelos 3D verificados em um harness isolado: sete formas com coordenadas e cores finitas, apoio com altura mínima consistente, e outline em cada rocha.
- Na simulação simplificada para perfil de celular, 17 grupos criaram 23 rochas grandes/secundárias e 57 seixos; 57 está abaixo do limite de 70 seixos.
- Confirmação de arquivos, links e controles na versão publicada.

**Limite:** testes de geometria e integração não são uma validação visual em navegador Android. WebGL e acesso ao CDN do Three.js continuam necessários.
