# Ateliê Arcano V12.26 — Modelos apoiados no solo e qualidade gráfica ajustável

Implementação diretamente no laboratório existente `MaroniNeves/projeto`, partindo da V12.25 e preservando os dois pacotes Quaternius escolhidos, a água 3D, reflexos, solos, plantas, ciclo de 24 minutos, neblina pós-chuva e as 100 magias.

## 1. Correção dos objetos flutuando

### Problema identificado

A V12.25 posicionava os modelos usando `elevation(x,z) - bbox.min.y * scale`, calculando `bbox` antes de aplicar a rotação final e sem consultar a malha real do terreno. Além disso, ao variar a biomassa das flores/arbustos, o código mudava a escala 3D mas **não recalculava a altura vertical da base**, criando separação visível do chão.

Os arquivos FBX também podem ter **escala de importação 0.01 e rotação própria de conversão de coordenadas**, substituídas pela rotina antiga com `obj.scale.setScalar(...)` e `obj.rotation.set(...)`.

### Correção V12.26

- A altura de apoio passa a ser `sample(soil,x,z)`, amostragem bilinear da malha real do terreno, em vez de usar apenas a função analítica original.
- O `Box3` da malha é medido **depois de posicionar, redimensionar e girar cada instância**, então a coordenada inferior reflete a transformação real.
- A escala e rotação de importação dos FBX/glTF são preservadas; o ajuste de altura multiplica a escala original, sem substituí-la.
- Troncos/arbustos/flores/samambaias são apoiados no solo com encaixe pequeno; pedras usam amostras de área e uma imersão discreta para não parecer que pairam sobre encostas.
- Cada objeto guarda sua altura de contato e a posição do vértice inferior normalizada (`localBottom`). Quando o crescimento vegetal muda a escala, `snapForestToGround` recalcula o posicionamento vertical.
- Oscilação pelo vento respeita as rotações originais dos arquivos.

O deslocamento horizontal não foi alterado e a física do relevo também não foi modificada.

## 2. Qualidade gráfica configurável em tempo real

Um seletor **🎨 Qualidade gráfica** aparece na área principal dos controles, com três níveis:

| Configuração | Alta | Equilibrada | Econômica |
|---|---|---|---|
| Geometria FBX/glTF | Original integral | Original integral | Original integral |
| Objetos grandes | 100% | 88% | 65% |
| Plantas/objetos pequenos | 100% | 73% | 36% |
| Tufos do gramado | 100% | 69% | 29% |
| Resolução relativa, celular | Até 1.9× | Até 1.26× | Até 0.87× |
| Resolução relativa, computador | Até 2.35× | Até 1.65× | Até 1.05× |
| Sombras, celular | 1024 px | 512 px | Desligadas |
| Sombras, computador | 2048 px | 1024 px | Desligadas |
| Reflexo ambiental, celular | ~2.5 s | ~3.5 s | ~6 s |
| Reflexo ambiental, computador | ~1.35 s | ~2.15 s | ~4 s |

Os valores de resolução são limites multiplicados pelo DPR real do dispositivo; se o DPR for menor, a escala efetiva também será. A grade da física, as malhas originais e o ciclo de 24 minutos não são simplificados.

- **Alta:** conserva a geometria e os PNGs originais das folhas/flores e tenta carregar texturas **originais de casca e pedra do Ultimate** do repositório público do pacote. Esses mapas são grandes (aprox. 15–23 MB por casca) e podem demorar ou consumir bastante memória. Caso o download falhe, permanece a textura local sem interromper a cena.
- **Equilibrada:** mantém a geometria original, com árvores bem detalhadas e texturas de folhas/flores originais, usando cascas e rochas painterly procedurais locais de **512×512** (antes 128×128), menos sombras e parte da vegetação oculta.
- **Econômica:** mantém a malha original nos objetos que aparecem; reduz muito mais a densidade de objetos, o tamanho do framebuffer, a resolução de sombras (desligadas) e a frequência de captura dos reflexos.

As imagens originais de casca são hospedadas por `walterpalladino/godot-quaternius-ultimate-stylized-nature`, no diretório `ultimate-stylized-nature/sources/Textures/`. Elas **não foram copiadas para este repositório**; o carregamento de alta fidelidade depende de acesso à internet e pode falhar por indisponibilidade/CORS. Os modelos FBX, folhas e flores permanecem armazenados localmente no laboratório. Os modelos do MegaKit mantêm as cores/texturas da versão anterior.

O programa inicia em **Equilibrada no celular** e **Alta no computador**, salvo quando o usuário já tem uma preferência gravada no navegador via `localStorage`. A configuração pode ser trocada durante o jogo sem reiniciar a chuva, as plantas ou o ciclo do dia.

## 3. Testes e limites

- Parsing JavaScript da nova versão.
- Verificação dos IDs HTML de seletor e indicadores e das dependências dos arquivos.
- Validação algébrica de posicionamento: após mudar escala, a base permanece na altura de contato do terreno menos a pequena penetração intencional.
- Verificação dos três perfis de resolução, densidade, sombras e intervalo de reflexos.
- Validação de que `hydrologyStep`, `ecologyStep`, modelos e catálogo de 100 magias foram preservados.
- **Não foi feita inspeção visual real no Android nem benchmark de FPS nesta sessão**; a qualidade/performance efetiva pode variar muito entre aparelhos.

## Arquivos

- `atelie-arcano-laboratorio/index.html`: laboratório com link à V12.26
- `atelie-arcano-laboratorio/agua.html`: menu de qualidade e status
- `atelie-arcano-laboratorio/agua-v1226.js`: posicionamento, qualidade e animação completos
- `atelie-arcano-laboratorio/agua-v1225.js`: versão anterior preservada
- `atelie-arcano-laboratorio/assets/quaternius/` e `assets/ultimate/`: modelos e texturas anteriormente importados
